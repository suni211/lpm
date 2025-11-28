import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pvpAPI, beatmapsAPI } from '../api/client';
import { io, Socket } from 'socket.io-client';
import type { Beatmap, Judgments } from '../types';
import { GameEngine } from '../game/GameEngine';

interface Match {
  id: string;
  player1_id: string;
  player2_id: string;
  player1_username: string;
  player2_username: string;
  player1_display: string;
  player2_display: string;
  status: string;
  player1_score: number;
  player2_score: number;
  current_round: number;
}

interface SongPool {
  id: string;
  song_id: string;
  beatmap_id: string;
  is_banned: boolean;
  title: string;
  artist: string;
}

interface OpponentProgress {
  score: number;
  combo: number;
  judgments: Judgments;
}

export default function PvPGamePage() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();

  const [match, setMatch] = useState<Match | null>(null);
  const [beatmap, setBeatmap] = useState<Beatmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'finished'>('ready');

  // Game state
  const [myScore, setMyScore] = useState(0);
  const [myCombo, setMyCombo] = useState(0);
  const [myJudgments, setMyJudgments] = useState<Judgments>({
    perfect: 0,
    great: 0,
    good: 0,
    bad: 0,
    miss: 0
  });
  const [myMaxCombo, setMyMaxCombo] = useState(0);

  const [opponentProgress, setOpponentProgress] = useState<OpponentProgress>({
    score: 0,
    combo: 0,
    judgments: { perfect: 0, great: 0, good: 0, bad: 0, miss: 0 }
  });

  const [roundResult, setRoundResult] = useState<any>(null);
  const [isOpponentFinished, setIsOpponentFinished] = useState(false);
  const [myFinalScore, setMyFinalScore] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (matchId) {
      loadMatchData();

      // WebSocket 연결
      const socket = io('http://localhost:3003', {
        withCredentials: true
      });

      socket.on('connect', () => {
        console.log('PvP game WebSocket connected');
        socket.emit('join-match', matchId);
      });

      socket.on('opponent-progress', (data: OpponentProgress) => {
        setOpponentProgress(data);
      });

      socket.on('opponent-round-complete', (data: any) => {
        console.log('Opponent finished round:', data);
        setIsOpponentFinished(true);
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    }
  }, [matchId]);

  const loadMatchData = async () => {
    try {
      const response = await pvpAPI.getMatch(matchId!);
      const matchData = response.data.match;
      const songPool = response.data.songPool;

      setMatch(matchData);

      // 밴되지 않은 곡 찾기
      const playableSong = songPool.find((s: SongPool) => !s.is_banned);
      if (!playableSong) {
        alert('플레이 가능한 곡이 없습니다');
        navigate('/ladder');
        return;
      }

      // 비트맵 데이터 로드
      const beatmapResponse = await beatmapsAPI.getById(playableSong.beatmap_id);
      setBeatmap(beatmapResponse.data);

      setLoading(false);
    } catch (error) {
      console.error('Load match data error:', error);
      setLoading(false);
    }
  };

  const handleStartGame = () => {
    if (!beatmap || !canvasRef.current || !audioRef.current) {
      alert('게임을 시작할 수 없습니다');
      return;
    }

    setGameState('playing');

    // 전체화면 진입
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('전체화면 진입 실패:', err);
      });
    }

    // notes_data 파싱
    let notesData = beatmap.notes_data;
    if (typeof notesData === 'string') {
      try {
        notesData = JSON.parse(notesData);
      } catch (err) {
        console.error('노트 데이터 파싱 실패:', err);
        alert('비트맵 데이터가 올바르지 않습니다');
        setGameState('ready');
        return;
      }
    }

    if (!Array.isArray(notesData) || notesData.length === 0) {
      alert('비트맵에 노트가 없습니다');
      setGameState('ready');
      return;
    }

    const engine = new GameEngine(
      canvasRef.current,
      notesData,
      4, // 4K only for ranked
      audioRef.current,
      5 // Default speed
    );

    engine.setOnScoreUpdate((score, combo, judgments) => {
      setMyScore(score);
      setMyCombo(combo);
      setMyJudgments(judgments);

      // 상대에게 실시간 점수 전송
      socketRef.current?.emit('game-progress', {
        matchId,
        score,
        combo,
        judgments
      });
    });

    engine.setOnGameEnd((finalScore, judgments, maxCombo) => {
      setMyFinalScore(finalScore);
      setMyJudgments(judgments);
      setMyMaxCombo(maxCombo);
      setGameState('finished');

      // 전체화면 종료
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn('전체화면 종료 실패:', err);
        });
      }

      // 상대에게 완료 알림
      socketRef.current?.emit('round-complete', {
        matchId,
        score: finalScore,
        judgments,
        maxCombo
      });

      // 서버에 라운드 완료 제출
      submitRoundResult(finalScore, judgments, maxCombo);
    });

    gameEngineRef.current = engine;
    engine.start();
  };

  const submitRoundResult = async (score: number, judgments: Judgments, maxCombo: number) => {
    if (!match || !beatmap) return;

    try {
      // 라운드 완료 알림
      await pvpAPI.submitRoundComplete(matchId!, {
        score,
        judgments,
        maxCombo
      });

      // 상대도 완료될 때까지 대기
      // (실제로는 두 플레이어가 모두 완료되면 finalize-round를 호출해야 함)
    } catch (error) {
      console.error('Submit round result error:', error);
    }
  };

  const handleFinalizeRound = async () => {
    if (!match || !beatmap) return;

    // TODO: 상대 점수도 받아야 함 (실제로는 서버에서 처리)
    try {
      const response = await pvpAPI.finalizeRound(matchId!, {
        player1Score: myFinalScore,
        player2Score: opponentProgress.score,
        player1Judgments: myJudgments,
        player2Judgments: opponentProgress.judgments,
        player1MaxCombo: myMaxCombo,
        player2MaxCombo: 0, // TODO: 상대 maxCombo
        songId: beatmap.song_id,
        beatmapId: beatmap.id
      });

      setRoundResult(response.data);

      if (response.data.matchCompleted) {
        // 매치 완료
        setTimeout(() => {
          navigate(`/pvp/match/${matchId}`);
        }, 5000);
      } else {
        // 다음 라운드
        setTimeout(() => {
          navigate(`/pvp/match/${matchId}`);
        }, 3000);
      }
    } catch (error) {
      console.error('Finalize round error:', error);
    }
  };

  if (loading) {
    return <div className="card"><h2>로딩 중...</h2></div>;
  }

  if (!match || !beatmap) {
    return <div className="card"><h2>매치 정보를 불러올 수 없습니다</h2></div>;
  }

  // 게임 준비 화면
  if (gameState === 'ready') {
    return (
      <div className="pvp-game-page">
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>
          ⚔️ 라운드 {match.current_round}
        </h1>

        <div className="card" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '1rem' }}>게임 준비</h2>

          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: '#ffd700' }}>{beatmap.difficulty_name}</h3>
            <p style={{ marginTop: '0.5rem', opacity: 0.8 }}>
              난이도: {beatmap.difficulty_level} | 4K
            </p>
            <p style={{ marginTop: '0.5rem', opacity: 0.7 }}>
              노트: {beatmap.note_count} | 최대 콤보: {beatmap.max_combo}
            </p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ color: '#4a9eff' }}>{match.player1_display}</h3>
              <p style={{ marginTop: '0.5rem' }}>점수: {match.player1_score}</p>
            </div>
            <div style={{ fontSize: '2rem', opacity: 0.5 }}>VS</div>
            <div>
              <h3 style={{ color: '#ff4a4a' }}>{match.player2_display}</h3>
              <p style={{ marginTop: '0.5rem' }}>점수: {match.player2_score}</p>
            </div>
          </div>

          <button
            className="btn"
            onClick={handleStartGame}
            style={{ fontSize: '1.2rem', padding: '1rem 3rem' }}
          >
            게임 시작
          </button>
        </div>

        {/* Hidden audio */}
        <audio ref={audioRef} src={`/uploads/${beatmap.song_id}.mp3`} />
      </div>
    );
  }

  // 게임 플레이 화면 (분할 화면)
  if (gameState === 'playing') {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'row',
        zIndex: 9999
      }}>
        {/* 왼쪽: 내 게임 화면 */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '2px solid #333',
          position: 'relative'
        }}>
          <canvas
            ref={canvasRef}
            width={640}
            height={720}
            style={{
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />

          {/* 내 이름 표시 */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(74, 158, 255, 0.7)',
            padding: '0.5rem 1rem',
            borderRadius: '5px',
            fontWeight: 'bold'
          }}>
            {match.player1_display}
          </div>
        </div>

        {/* 중앙: 점수 비교 */}
        <div style={{
          width: '280px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(180deg, #1a0a2a, #0a0a1a)',
          padding: '2rem',
          gap: '2rem'
        }}>
          {/* 라운드 정보 */}
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              ROUND {match.current_round}
            </h2>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
              {match.player1_score} - {match.player2_score}
            </div>
          </div>

          {/* 점수 비교 */}
          <div style={{ width: '100%', textAlign: 'center' }}>
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.3rem' }}>SCORE</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 'bold' }}>
                <span style={{ color: '#4a9eff' }}>{myScore.toLocaleString()}</span>
                <span style={{ color: '#ff4a4a' }}>{opponentProgress.score.toLocaleString()}</span>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.3rem' }}>COMBO</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem' }}>
                <span style={{ color: '#4a9eff' }}>{myCombo}</span>
                <span style={{ color: '#ff4a4a' }}>{opponentProgress.combo}</span>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.9rem', opacity: 0.7, marginBottom: '0.3rem' }}>PERFECT</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                <span style={{ color: '#00ff00' }}>{myJudgments.perfect}</span>
                <span style={{ color: '#00ff00' }}>{opponentProgress.judgments.perfect}</span>
              </div>
            </div>
          </div>

          {/* 진행 바 */}
          <div style={{ width: '100%' }}>
            <div style={{
              width: '100%',
              height: '10px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '5px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(audioRef.current?.currentTime || 0) / (audioRef.current?.duration || 1) * 100}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #667eea, #764ba2)',
                transition: 'width 0.1s linear'
              }} />
            </div>
          </div>
        </div>

        {/* 오른쪽: 상대 화면 (미러) */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderLeft: '2px solid #333',
          position: 'relative',
          background: 'linear-gradient(180deg, #1a0a2a, #0a0a1a)'
        }}>
          {/* 상대 정보 표시 */}
          <div style={{
            textAlign: 'center',
            padding: '2rem'
          }}>
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255, 74, 74, 0.7)',
              padding: '0.5rem 1rem',
              borderRadius: '5px',
              fontWeight: 'bold'
            }}>
              {match.player2_display}
            </div>

            {/* 상대 게임 시각화 (간단한 버전) */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '2rem',
              alignItems: 'center',
              marginTop: '100px'
            }}>
              <div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>SCORE</div>
                <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#ff4a4a' }}>
                  {opponentProgress.score.toLocaleString()}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.9rem', opacity: 0.7 }}>COMBO</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ffd700' }}>
                  {opponentProgress.combo}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '2rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>PERFECT</div>
                  <div style={{ fontSize: '1.5rem', color: '#00ff00' }}>{opponentProgress.judgments.perfect}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>GREAT</div>
                  <div style={{ fontSize: '1.5rem', color: '#ffff00' }}>{opponentProgress.judgments.great}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>GOOD</div>
                  <div style={{ fontSize: '1.5rem', color: '#ff9900' }}>{opponentProgress.judgments.good}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>MISS</div>
                  <div style={{ fontSize: '1.5rem', color: '#ff0000' }}>{opponentProgress.judgments.miss}</div>
                </div>
              </div>

              {isOpponentFinished && (
                <div style={{
                  marginTop: '2rem',
                  padding: '1rem 2rem',
                  background: 'rgba(255,215,0,0.2)',
                  borderRadius: '10px',
                  fontSize: '1.2rem',
                  fontWeight: 'bold'
                }}>
                  상대 완료!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ESC 안내 */}
        <p style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          color: '#aaa',
          fontSize: '14px'
        }}>
          ESC: 종료
        </p>

        <audio ref={audioRef} src={`/uploads/${beatmap.song_id}.mp3`} />
      </div>
    );
  }

  // 결과 대기 화면
  if (gameState === 'finished') {
    const myAccuracy = ((myJudgments.perfect * 100 + myJudgments.great * 70 + myJudgments.good * 40 + myJudgments.bad * 10) /
      ((myJudgments.perfect + myJudgments.great + myJudgments.good + myJudgments.bad + myJudgments.miss) * 100) * 100);

    return (
      <div className="pvp-game-page">
        <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>라운드 완료!</h1>

        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>결과</h2>

          <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
            {/* 내 결과 */}
            <div style={{ flex: 1, textAlign: 'center', padding: '1.5rem', background: 'rgba(74,158,255,0.1)', borderRadius: '10px' }}>
              <h3 style={{ color: '#4a9eff', marginBottom: '1rem' }}>{match.player1_display}</h3>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                {myFinalScore.toLocaleString()}
              </div>
              <div style={{ fontSize: '1.2rem', opacity: 0.8, marginBottom: '1rem' }}>
                MAX COMBO: {myMaxCombo}
              </div>
              <div style={{ opacity: 0.7 }}>
                정확도: {myAccuracy.toFixed(2)}%
              </div>
            </div>

            {/* 상대 결과 (대기 중) */}
            <div style={{ flex: 1, textAlign: 'center', padding: '1.5rem', background: 'rgba(255,74,74,0.1)', borderRadius: '10px' }}>
              <h3 style={{ color: '#ff4a4a', marginBottom: '1rem' }}>{match.player2_display}</h3>
              {isOpponentFinished ? (
                <>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                    {opponentProgress.score.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '1.2rem', opacity: 0.8 }}>
                    완료
                  </div>
                </>
              ) : (
                <div style={{ padding: '2rem 0' }}>
                  <div style={{ fontSize: '1.2rem', opacity: 0.7 }}>
                    플레이 중...
                  </div>
                </div>
              )}
            </div>
          </div>

          {isOpponentFinished ? (
            <button
              className="btn"
              onClick={handleFinalizeRound}
              style={{ width: '100%', fontSize: '1.2rem', padding: '1rem' }}
            >
              결과 확인
            </button>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', opacity: 0.7 }}>
              상대 플레이어를 기다리는 중...
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
