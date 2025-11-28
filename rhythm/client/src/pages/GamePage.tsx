import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { songsAPI, beatmapsAPI, gameAPI } from '../api/client';
import type { Song, Beatmap, Judgments } from '../types';
import { GameEngine } from '../game/GameEngine';

export default function GamePage() {
  const { songId } = useParams<{ songId: string }>();
  const navigate = useNavigate();

  const [song, setSong] = useState<Song | null>(null);
  const [beatmaps, setBeatmaps] = useState<Beatmap[]>([]);
  const [selectedBeatmap, setSelectedBeatmap] = useState<Beatmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Game state
  const [gameState, setGameState] = useState<'select' | 'playing' | 'result'>('select');
  const [finalScore, setFinalScore] = useState(0);
  const [finalJudgments, setFinalJudgments] = useState<Judgments | null>(null);
  const [finalMaxCombo, setFinalMaxCombo] = useState(0);
  const [customNoteSpeed, setCustomNoteSpeed] = useState<number>(5);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);

  useEffect(() => {
    if (songId) {
      loadSongAndBeatmaps();
    }
  }, [songId]);

  const loadSongAndBeatmaps = async () => {
    try {
      const songResponse = await songsAPI.getById(songId!);
      const beatmapsResponse = await beatmapsAPI.getBySongId(songId!);

      setSong(songResponse.data);
      setBeatmaps(beatmapsResponse.data);

      if (beatmapsResponse.data.length > 0) {
        setSelectedBeatmap(beatmapsResponse.data[0]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '곡 정보를 불러올 수 없습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!selectedBeatmap || !song) {
      alert('비트맵을 선택해주세요.');
      return;
    }

    try {
      // 비트맵 전체 데이터 가져오기 (notes_data 포함)
      const fullBeatmapResponse = await beatmapsAPI.getById(selectedBeatmap.id);
      setSelectedBeatmap(fullBeatmapResponse.data);

      // 게임 상태를 playing으로 변경 (이후 useEffect에서 게임 초기화)
      setGameState('playing');
    } catch (err) {
      alert('비트맵 데이터를 불러올 수 없습니다.');
      console.error('비트맵 로드 실패:', err);
    }
  };

  // 게임 시작 시 GameEngine 초기화 및 전체화면
  useEffect(() => {
    if (gameState === 'playing' && selectedBeatmap && song && canvasRef.current && audioRef.current) {
      // 전체화면 진입
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.warn('전체화면 진입 실패:', err);
        });
      }

      // notes_data가 문자열이면 파싱
      let notesData = selectedBeatmap.notes_data;
      if (typeof notesData === 'string') {
        try {
          notesData = JSON.parse(notesData);
        } catch (err) {
          console.error('노트 데이터 파싱 실패:', err);
          alert('비트맵 데이터가 올바르지 않습니다.');
          setGameState('select');
          return;
        }
      }

      if (!Array.isArray(notesData) || notesData.length === 0) {
        alert('비트맵에 노트가 없습니다.');
        setGameState('select');
        return;
      }

      const engine = new GameEngine(
        canvasRef.current,
        notesData,
        parseInt(selectedBeatmap.key_count),
        audioRef.current,
        customNoteSpeed  // 사용자가 선택한 속도 사용
      );

      engine.setOnScoreUpdate(() => {
        // Real-time score updates can be displayed here if needed
      });

      engine.setOnGameEnd((score, judgments, maxCombo) => {
        setFinalScore(score);
        setFinalJudgments(judgments);
        setFinalMaxCombo(maxCombo);
        setGameState('result');

        // 전체화면 종료
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(err => {
            console.warn('전체화면 종료 실패:', err);
          });
        }

        // 서버에 결과 제출
        submitGameResult(score, judgments, maxCombo);
      });

      gameEngineRef.current = engine;
      engine.start();
    }

    // Cleanup 함수
    return () => {
      if (gameEngineRef.current) {
        gameEngineRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      // 전체화면 종료
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.warn('전체화면 종료 실패:', err);
        });
      }
    };
  }, [gameState, selectedBeatmap, song, customNoteSpeed]);

  const submitGameResult = async (_score: number, judgments: Judgments, maxCombo: number) => {
    if (!selectedBeatmap) return;

    try {
      await gameAPI.submitPlay({
        beatmapId: selectedBeatmap.id,
        judgments,
        maxCombo,
        noteSpeed: customNoteSpeed  // 사용자가 선택한 속도로 제출
      });
    } catch (err) {
      console.error('결과 제출 실패:', err);
    }
  };

  const handleRetry = () => {
    setGameState('select');
  };

  const handleBackToSongs = () => {
    navigate('/songs');
  };

  // ESC 키로 게임 종료
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && gameState === 'playing') {
        if (confirm('게임을 종료하시겠습니까?')) {
          setGameState('select');
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [gameState]);

  if (loading) {
    return <div className="card"><h2>로딩 중...</h2></div>;
  }

  if (error || !song) {
    return (
      <div className="card">
        <h2 style={{ color: '#ff6b6b' }}>오류: {error || '곡을 찾을 수 없습니다'}</h2>
        <button className="btn" onClick={handleBackToSongs} style={{ marginTop: '1rem' }}>
          곡 목록으로 돌아가기
        </button>
      </div>
    );
  }

  if (beatmaps.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center' }}>
        <h2>사용 가능한 비트맵이 없습니다</h2>
        <p style={{ marginTop: '1rem', opacity: 0.8 }}>
          이 곡에는 아직 비트맵이 등록되지 않았습니다.
        </p>
        <button className="btn" onClick={handleBackToSongs} style={{ marginTop: '1rem' }}>
          곡 목록으로 돌아가기
        </button>
      </div>
    );
  }

  // 비트맵 선택 화면
  if (gameState === 'select') {
    return (
      <div className="game-page">
        <h1 style={{ marginBottom: '2rem' }}>{song.title}</h1>
        <p style={{ opacity: 0.8, marginBottom: '2rem' }}>아티스트: {song.artist}</p>

        <div className="card">
          <h2 style={{ marginBottom: '1rem' }}>비트맵 선택</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {beatmaps.map((beatmap) => (
              <div
                key={beatmap.id}
                className="card"
                style={{
                  cursor: 'pointer',
                  border: selectedBeatmap?.id === beatmap.id ? '3px solid #ffd700' : '1px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.2s'
                }}
                onClick={() => setSelectedBeatmap(beatmap)}
              >
                <h3 style={{ color: '#ffd700' }}>{beatmap.difficulty_name}</h3>
                <p style={{ opacity: 0.9, marginTop: '0.5rem' }}>레벨: {beatmap.difficulty_level}</p>
                <p style={{ opacity: 0.8, marginTop: '0.5rem' }}>{beatmap.key_count}K</p>
                <p style={{ opacity: 0.7, marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  노트: {beatmap.note_count} | 콤보: {beatmap.max_combo}
                </p>
                <p style={{ opacity: 0.6, marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  속도: {beatmap.note_speed}x
                </p>
              </div>
            ))}
          </div>

          {/* 노트 속도 조정 */}
          <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>노트 속도 설정</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={customNoteSpeed}
                onChange={(e) => setCustomNoteSpeed(parseInt(e.target.value))}
                style={{ flex: 1, cursor: 'pointer' }}
              />
              <span style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#ffd700',
                minWidth: '80px',
                textAlign: 'center'
              }}>
                {customNoteSpeed}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: '0.5rem',
              fontSize: '0.85rem',
              opacity: 0.6
            }}>
              <span>느림 (1)</span>
              <span>보통 (5)</span>
              <span>빠름 (10)</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={handleBackToSongs} style={{ flex: 1 }}>
              취소
            </button>
            <button
              className="btn"
              onClick={handleStartGame}
              disabled={!selectedBeatmap}
              style={{ flex: 2 }}
            >
              게임 시작
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 게임 플레이 화면
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
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        {/* 오디오 */}
        <audio ref={audioRef} src={song.audio_file_path} />

        {/* 게임 캔버스 */}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            border: '2px solid #333'
          }}
        />

        {/* ESC 안내 */}
        <p style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          color: '#aaa',
          fontSize: '14px'
        }}>
          ESC: 종료
        </p>
      </div>
    );
  }

  // 결과 화면
  if (gameState === 'result' && finalJudgments) {
    const accuracy = finalJudgments ? (
      ((finalJudgments.perfect * 100 + finalJudgments.great * 70 + finalJudgments.good * 40 + finalJudgments.bad * 10) /
        ((finalJudgments.perfect + finalJudgments.great + finalJudgments.good + finalJudgments.bad + finalJudgments.miss) * 100) * 100)
    ) : 0;

    return (
      <div className="game-page">
        <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>플레이 결과</h1>

        <div className="card" style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2 style={{ textAlign: 'center', marginBottom: '2rem' }}>{song.title}</h2>
          <h3 style={{ textAlign: 'center', color: '#ffd700', marginBottom: '2rem' }}>
            {selectedBeatmap?.difficulty_name} ({selectedBeatmap?.key_count}K)
          </h3>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '3rem', margin: '1rem 0' }}>{finalScore.toLocaleString()}</h1>
            <p style={{ fontSize: '1.5rem', opacity: 0.8 }}>MAX COMBO: {finalMaxCombo}</p>
            <p style={{ fontSize: '1.2rem', opacity: 0.7 }}>{accuracy.toFixed(2)}%</p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#00ff00', fontWeight: 'bold' }}>PERFECT</p>
              <p style={{ fontSize: '1.5rem' }}>{finalJudgments.perfect}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#ffff00', fontWeight: 'bold' }}>GREAT</p>
              <p style={{ fontSize: '1.5rem' }}>{finalJudgments.great}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#ff9900', fontWeight: 'bold' }}>GOOD</p>
              <p style={{ fontSize: '1.5rem' }}>{finalJudgments.good}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#ff3300', fontWeight: 'bold' }}>BAD</p>
              <p style={{ fontSize: '1.5rem' }}>{finalJudgments.bad}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#ff0000', fontWeight: 'bold' }}>MISS</p>
              <p style={{ fontSize: '1.5rem' }}>{finalJudgments.miss}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={handleBackToSongs} style={{ flex: 1 }}>
              곡 목록
            </button>
            <button className="btn" onClick={handleRetry} style={{ flex: 1 }}>
              다시 하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
