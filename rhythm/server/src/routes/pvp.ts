import express from 'express';
import { query } from '../database/connection';
import { requireAuth } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import '../types';

const router = express.Router();

// 매치메이킹 큐 진입
router.post('/queue/join', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    // 이미 큐에 있는지 확인
    const existing: any = await query(
      'SELECT * FROM matchmaking_queue WHERE user_id = ? AND status = "SEARCHING"',
      [userId]
    );

    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(400).json({ error: '이미 매칭 중입니다' });
    }

    // 사용자의 현재 레이팅 가져오기
    let rating: any = await query(
      'SELECT rating FROM ladder_ratings WHERE user_id = ?',
      [userId]
    );

    if (!Array.isArray(rating) || rating.length === 0) {
      // 레이팅이 없으면 생성 (기본 1000)
      await query(
        'INSERT INTO ladder_ratings (id, user_id, rating) VALUES (?, ?, ?)',
        [uuidv4(), userId, 1000]
      );
      rating = [{ rating: 1000 }];
    }

    const userRating = rating[0].rating;

    // 큐에 추가
    await query(
      'INSERT INTO matchmaking_queue (id, user_id, rating, status) VALUES (?, ?, ?, "SEARCHING")',
      [uuidv4(), userId, userRating]
    );

    // 매칭 시도 (±200 레이팅 범위)
    const opponents: any = await query(
      `SELECT * FROM matchmaking_queue
       WHERE user_id != ?
       AND status = "SEARCHING"
       AND rating BETWEEN ? AND ?
       ORDER BY created_at ASC
       LIMIT 1`,
      [userId, userRating - 200, userRating + 200]
    );

    if (Array.isArray(opponents) && opponents.length > 0) {
      // 매칭 성공!
      const opponent = opponents[0];
      const matchId = uuidv4();

      // 매치 생성
      await query(
        `INSERT INTO matches (id, player1_id, player2_id, status)
         VALUES (?, ?, ?, "BAN_PICK")`,
        [matchId, userId, opponent.user_id]
      );

      // 큐 상태 업데이트
      await query(
        'UPDATE matchmaking_queue SET status = "MATCHED", matched_at = NOW() WHERE user_id IN (?, ?)',
        [userId, opponent.user_id]
      );

      // 5개의 4K 비트맵 랜덤 선택
      const songPool: any = await query(
        `SELECT b.id as beatmap_id, b.song_id
         FROM beatmaps b
         WHERE b.key_count = 4
         ORDER BY RAND()
         LIMIT 5`
      );

      // 매치 곡 풀에 추가
      for (let i = 0; i < songPool.length; i++) {
        await query(
          `INSERT INTO match_song_pool (id, match_id, song_id, beatmap_id, pool_order)
           VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), matchId, songPool[i].song_id, songPool[i].beatmap_id, i + 1]
        );
      }

      res.json({
        matched: true,
        matchId,
        opponentId: opponent.user_id
      });
    } else {
      // 매칭 대기 중
      res.json({
        matched: false,
        message: '매칭 상대를 찾는 중...'
      });
    }
  } catch (error) {
    console.error('Queue join error:', error);
    res.status(500).json({ error: '매치메이킹 큐 진입 실패' });
  }
});

// 큐 나가기
router.post('/queue/leave', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    await query(
      'UPDATE matchmaking_queue SET status = "CANCELLED" WHERE user_id = ? AND status = "SEARCHING"',
      [userId]
    );

    res.json({ message: '매칭 취소됨' });
  } catch (error) {
    console.error('Queue leave error:', error);
    res.status(500).json({ error: '큐 나가기 실패' });
  }
});

// 매치 정보 조회
router.get('/match/:matchId', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.session.userId!;

    const matches: any = await query(
      `SELECT m.*,
              u1.username as player1_username, u1.display_name as player1_display,
              u2.username as player2_username, u2.display_name as player2_display
       FROM matches m
       JOIN users u1 ON m.player1_id = u1.id
       JOIN users u2 ON m.player2_id = u2.id
       WHERE m.id = ? AND (m.player1_id = ? OR m.player2_id = ?)`,
      [matchId, userId, userId]
    );

    if (!Array.isArray(matches) || matches.length === 0) {
      return res.status(404).json({ error: '매치를 찾을 수 없습니다' });
    }

    const match = matches[0];

    // 곡 풀 가져오기
    const songPool: any = await query(
      `SELECT msp.*, s.title, s.artist, b.difficulty_name, b.difficulty_level
       FROM match_song_pool msp
       JOIN songs s ON msp.song_id = s.id
       JOIN beatmaps b ON msp.beatmap_id = b.id
       WHERE msp.match_id = ?
       ORDER BY msp.pool_order`,
      [matchId]
    );

    res.json({
      match,
      songPool: songPool || []
    });
  } catch (error) {
    console.error('Match info error:', error);
    res.status(500).json({ error: '매치 정보 조회 실패' });
  }
});

// 곡 밴하기
router.post('/match/:matchId/ban', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { songPoolId } = req.body;
    const userId = req.session.userId!;

    // 매치 확인
    const matches: any = await query(
      'SELECT * FROM matches WHERE id = ? AND (player1_id = ? OR player2_id = ?)',
      [matchId, userId, userId]
    );

    if (!Array.isArray(matches) || matches.length === 0) {
      return res.status(404).json({ error: '매치를 찾을 수 없습니다' });
    }

    const match = matches[0];

    if (match.status !== 'BAN_PICK') {
      return res.status(400).json({ error: '밴픽 단계가 아닙니다' });
    }

    // 이미 밴한 곡 수 확인
    const bannedCount: any = await query(
      'SELECT COUNT(*) as count FROM match_song_pool WHERE match_id = ? AND banned_by = ?',
      [matchId, userId]
    );

    if (bannedCount[0].count >= 2) {
      return res.status(400).json({ error: '이미 2곡을 밴했습니다' });
    }

    // 곡 밴
    await query(
      'UPDATE match_song_pool SET is_banned = TRUE, banned_by = ? WHERE id = ? AND match_id = ?',
      [userId, songPoolId, matchId]
    );

    // 총 밴 수 확인
    const totalBanned: any = await query(
      'SELECT COUNT(*) as count FROM match_song_pool WHERE match_id = ? AND is_banned = TRUE',
      [matchId]
    );

    // 4곡이 밴되면 게임 시작
    if (totalBanned[0].count === 4) {
      await query(
        'UPDATE matches SET status = "PLAYING", started_at = NOW(), current_round = 1 WHERE id = ?',
        [matchId]
      );
    }

    res.json({ message: '밴 완료', totalBanned: totalBanned[0].count });
  } catch (error) {
    console.error('Ban error:', error);
    res.status(500).json({ error: '밴 실패' });
  }
});

// 레더 랭킹 조회
router.get('/ladder/rankings', async (req, res) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const rankings: any = await query(
      `SELECT lr.*, u.username, u.display_name
       FROM ladder_ratings lr
       JOIN users u ON lr.user_id = u.id
       ORDER BY lr.rating DESC
       LIMIT ? OFFSET ?`,
      [parseInt(limit as string), parseInt(offset as string)]
    );

    res.json(rankings || []);
  } catch (error) {
    console.error('Rankings error:', error);
    res.status(500).json({ error: '랭킹 조회 실패' });
  }
});

// 내 레이팅 조회
router.get('/ladder/my-rating', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId!;

    let rating: any = await query(
      'SELECT * FROM ladder_ratings WHERE user_id = ?',
      [userId]
    );

    if (!Array.isArray(rating) || rating.length === 0) {
      // 레이팅 생성
      await query(
        'INSERT INTO ladder_ratings (id, user_id, rating) VALUES (?, ?, ?)',
        [uuidv4(), userId, 1000]
      );
      rating = [{ id: uuidv4(), user_id: userId, rating: 1000, wins: 0, losses: 0, winrate: 0 }];
    }

    res.json(rating[0]);
  } catch (error) {
    console.error('My rating error:', error);
    res.status(500).json({ error: '레이팅 조회 실패' });
  }
});

// 라운드 완료 제출
router.post('/match/:matchId/round-complete', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { score, judgments, maxCombo } = req.body;
    const userId = req.session.userId!;

    // 매치 확인
    const matches: any = await query(
      'SELECT * FROM matches WHERE id = ? AND (player1_id = ? OR player2_id = ?)',
      [matchId, userId, userId]
    );

    if (!Array.isArray(matches) || matches.length === 0) {
      return res.status(404).json({ error: '매치를 찾을 수 없습니다' });
    }

    const match = matches[0];

    if (match.status !== 'PLAYING') {
      return res.status(400).json({ error: '게임 중이 아닙니다' });
    }

    res.json({ message: '라운드 결과 수신 완료', score, userId });
  } catch (error) {
    console.error('Round complete error:', error);
    res.status(500).json({ error: '라운드 완료 처리 실패' });
  }
});

// 라운드 승자 결정 및 다음 라운드/매치 종료 처리
router.post('/match/:matchId/finalize-round', requireAuth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { player1Score, player2Score, player1Judgments, player2Judgments, player1MaxCombo, player2MaxCombo, songId, beatmapId } = req.body;

    const matches: any = await query('SELECT * FROM matches WHERE id = ?', [matchId]);
    if (!Array.isArray(matches) || matches.length === 0) {
      return res.status(404).json({ error: '매치를 찾을 수 없습니다' });
    }

    const match = matches[0];
    const winnerId = player1Score > player2Score ? match.player1_id : match.player2_id;

    // 라운드 기록 저장
    await query(
      `INSERT INTO match_rounds (id, match_id, round_number, song_id, beatmap_id, player1_score, player2_score, player1_judgments, player2_judgments, player1_max_combo, player2_max_combo, winner_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [uuidv4(), matchId, match.current_round, songId, beatmapId, player1Score, player2Score, JSON.stringify(player1Judgments), JSON.stringify(player2Judgments), player1MaxCombo, player2MaxCombo, winnerId]
    );

    // 라운드 승자 점수 추가
    let newPlayer1Score = match.player1_score;
    let newPlayer2Score = match.player2_score;

    if (winnerId === match.player1_id) {
      newPlayer1Score++;
    } else {
      newPlayer2Score++;
    }

    // 3판 2선승 체크
    if (newPlayer1Score === 2 || newPlayer2Score === 2) {
      // 매치 종료
      const finalWinnerId = newPlayer1Score === 2 ? match.player1_id : match.player2_id;
      const loserId = finalWinnerId === match.player1_id ? match.player2_id : match.player1_id;

      await query(
        'UPDATE matches SET status = "COMPLETED", winner_id = ?, player1_score = ?, player2_score = ?, ended_at = NOW() WHERE id = ?',
        [finalWinnerId, newPlayer1Score, newPlayer2Score, matchId]
      );

      // ELO 레이팅 업데이트
      await updateEloRatings(finalWinnerId, loserId);

      res.json({
        matchCompleted: true,
        winnerId: finalWinnerId,
        finalScore: { player1: newPlayer1Score, player2: newPlayer2Score }
      });
    } else {
      // 다음 라운드
      await query(
        'UPDATE matches SET current_round = current_round + 1, player1_score = ?, player2_score = ? WHERE id = ?',
        [newPlayer1Score, newPlayer2Score, matchId]
      );

      res.json({
        matchCompleted: false,
        nextRound: match.current_round + 1,
        currentScore: { player1: newPlayer1Score, player2: newPlayer2Score }
      });
    }
  } catch (error) {
    console.error('Finalize round error:', error);
    res.status(500).json({ error: '라운드 완료 실패' });
  }
});

// ELO 레이팅 업데이트 함수
async function updateEloRatings(winnerId: string, loserId: string) {
  try {
    // 승자와 패자의 현재 레이팅 가져오기
    const winnerRating: any = await query('SELECT * FROM ladder_ratings WHERE user_id = ?', [winnerId]);
    const loserRating: any = await query('SELECT * FROM ladder_ratings WHERE user_id = ?', [loserId]);

    const K = 32; // K-factor
    const winnerElo = winnerRating[0].rating;
    const loserElo = loserRating[0].rating;

    // 예상 승률 계산
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

    // 새 레이팅 계산
    const newWinnerElo = Math.round(winnerElo + K * (1 - expectedWinner));
    const newLoserElo = Math.round(loserElo + K * (0 - expectedLoser));

    // 승자 업데이트
    const newWinnerWins = winnerRating[0].wins + 1;
    const newWinnerTotal = newWinnerWins + winnerRating[0].losses;
    const newWinnerWinrate = (newWinnerWins / newWinnerTotal) * 100;
    const newWinnerHighest = Math.max(newWinnerElo, winnerRating[0].highest_rating);

    await query(
      `UPDATE ladder_ratings
       SET rating = ?, wins = ?, winrate = ?, highest_rating = ?, rank_tier = ?
       WHERE user_id = ?`,
      [newWinnerElo, newWinnerWins, newWinnerWinrate, newWinnerHighest, getTier(newWinnerElo), winnerId]
    );

    // 패자 업데이트
    const newLoserLosses = loserRating[0].losses + 1;
    const newLoserTotal = loserRating[0].wins + newLoserLosses;
    const newLoserWinrate = (loserRating[0].wins / newLoserTotal) * 100;

    await query(
      `UPDATE ladder_ratings
       SET rating = ?, losses = ?, winrate = ?, rank_tier = ?
       WHERE user_id = ?`,
      [newLoserElo, newLoserLosses, newLoserWinrate, getTier(newLoserElo), loserId]
    );
  } catch (error) {
    console.error('Update ELO error:', error);
  }
}

// 티어 계산 함수
function getTier(rating: number): string {
  if (rating >= 2400) return 'GRANDMASTER';
  if (rating >= 2000) return 'MASTER';
  if (rating >= 1600) return 'DIAMOND';
  if (rating >= 1300) return 'PLATINUM';
  if (rating >= 1100) return 'GOLD';
  if (rating >= 900) return 'SILVER';
  return 'BRONZE';
}

export default router;
