interface PhaseResult {
    team1_score: number;
    team2_score: number;
    description: string;
    events: string[];
}
interface MatchResult {
    winner_id: string;
    team1_power: number;
    team2_power: number;
    phase1_result: PhaseResult;
    phase2_result: PhaseResult;
    phase3_result: PhaseResult;
    match_log: any;
    lp_change: number;
}
/**
 * 랭크 경기 시뮬레이션
 */
export declare function simulateMatch(team1Id: string, team2Id: string): Promise<MatchResult>;
export {};
//# sourceMappingURL=matchService.d.ts.map