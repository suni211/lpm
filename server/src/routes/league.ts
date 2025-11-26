import express, { Request, Response } from 'express';
import {
  getCurrentSeason,
  getTeamLeague,
  getLeagueStandings,
  getLeagueMatches,
  getNextSchedule,
  initializeNewSeason,
  simulateLeagueMatch,
  getAllLeagues,
} from '../services/leagueService';

const router = express.Router();

// 현재 시즌 정보 조회
router.get('/current-season', async (req: Request, res: Response) => {
  try {
    const season = await getCurrentSeason();

    if (!season) {
      return res.status(404).json({
        success: false,
        message: '진행 중인 시즌이 없습니다',
      });
    }

    res.json({
      success: true,
      season,
    });
  } catch (error) {
    console.error('현재 시즌 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
    });
  }
});

// 내 팀의 리그 정보 조회
router.get('/my-league', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '로그인이 필요합니다',
      });
    }

    const userId = (req.user as any).id;
    const { team_id } = req.query;

    if (!team_id) {
      return res.status(400).json({
        success: false,
        message: '팀 ID가 필요합니다',
      });
    }

    const season = await getCurrentSeason();

    if (!season) {
      return res.status(404).json({
        success: false,
        message: '진행 중인 시즌이 없습니다',
      });
    }

    const teamLeague = await getTeamLeague(team_id as string, season.id);

    if (!teamLeague) {
      return res.status(404).json({
        success: false,
        message: '리그 정보를 찾을 수 없습니다',
      });
    }

    res.json({
      success: true,
      season,
      league: teamLeague,
    });
  } catch (error) {
    console.error('내 리그 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
    });
  }
});

// 특정 리그의 순위표 조회
router.get('/standings/:leagueId', async (req: Request, res: Response) => {
  try {
    const { leagueId } = req.params;

    const season = await getCurrentSeason();

    if (!season) {
      return res.status(404).json({
        success: false,
        message: '진행 중인 시즌이 없습니다',
      });
    }

    const standings = await getLeagueStandings(parseInt(leagueId), season.id);

    res.json({
      success: true,
      standings,
    });
  } catch (error) {
    console.error('순위표 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
    });
  }
});

// 특정 리그의 경기 일정 조회
router.get('/matches/:leagueId', async (req: Request, res: Response) => {
  try {
    const { leagueId } = req.params;

    const season = await getCurrentSeason();

    if (!season) {
      return res.status(404).json({
        success: false,
        message: '진행 중인 시즌이 없습니다',
      });
    }

    const matches = await getLeagueMatches(parseInt(leagueId), season.id);

    res.json({
      success: true,
      matches,
    });
  } catch (error) {
    console.error('경기 일정 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
    });
  }
});

// 다음 경기 일정 조회
router.get('/next-schedule', async (req: Request, res: Response) => {
  try {
    const season = await getCurrentSeason();

    if (!season) {
      return res.status(404).json({
        success: false,
        message: '진행 중인 시즌이 없습니다',
      });
    }

    const nextSchedule = await getNextSchedule(season.id);

    res.json({
      success: true,
      nextSchedule,
    });
  } catch (error) {
    console.error('다음 일정 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
    });
  }
});

// 모든 리그 조회
router.get('/all-leagues', async (req: Request, res: Response) => {
  try {
    const leagues = await getAllLeagues();

    res.json({
      success: true,
      leagues,
    });
  } catch (error) {
    console.error('리그 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
    });
  }
});

// 새 시즌 초기화 (관리자 전용)
router.post('/initialize-season', async (req: Request, res: Response) => {
  try {
    const { seasonNumber, seasonName, startDate, endDate } = req.body;

    if (!seasonNumber || !seasonName || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: '모든 필드를 입력해주세요',
      });
    }

    const seasonId = await initializeNewSeason(
      parseInt(seasonNumber),
      seasonName,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      message: '시즌 초기화 완료',
      seasonId,
    });
  } catch (error) {
    console.error('시즌 초기화 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
    });
  }
});

// 경기 시뮬레이션 (테스트용 - 나중에 크론 작업으로 대체)
router.post('/simulate-match/:matchId', async (req: Request, res: Response) => {
  try {
    const { matchId } = req.params;

    const result = await simulateLeagueMatch(matchId);

    res.json({
      success: true,
      message: '경기 시뮬레이션 완료',
      result,
    });
  } catch (error) {
    console.error('경기 시뮬레이션 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다',
    });
  }
});

export default router;
