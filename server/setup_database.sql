-- LPM 전체 데이터베이스 설정 스크립트
-- 이 파일을 실행하면 모든 테이블과 초기 데이터가 설정됩니다

USE lpm;

-- 기존 테이블 삭제 (주의: 모든 데이터가 삭제됩니다!)
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS auction_watchlist;
DROP TABLE IF EXISTS auction_notifications;
DROP TABLE IF EXISTS auction_transactions;
DROP TABLE IF EXISTS auction_bids;
DROP TABLE IF EXISTS auctions;
DROP TABLE IF EXISTS friendly_match_stats;
DROP TABLE IF EXISTS friendly_matches;
DROP TABLE IF EXISTS friendly_invites;
DROP TABLE IF EXISTS solo_rank_history;
DROP TABLE IF EXISTS solo_rank_queue;
DROP TABLE IF EXISTS solo_rank_matches;
DROP TABLE IF EXISTS player_solo_rank;
DROP TABLE IF EXISTS solo_rank_seasons;
DROP TABLE IF EXISTS season_rewards;
DROP TABLE IF EXISTS lp_history;
DROP TABLE IF EXISTS ranked_matches;
DROP TABLE IF EXISTS team_ranked;
DROP TABLE IF EXISTS ranked_seasons;
DROP TABLE IF EXISTS ranked_tiers;
DROP TABLE IF EXISTS fusion_stats;
DROP TABLE IF EXISTS fusion_history;
DROP TABLE IF EXISTS fusion_recipes;
DROP TABLE IF EXISTS training_stats;
DROP TABLE IF EXISTS training_history;
DROP TABLE IF EXISTS active_trainings;
DROP TABLE IF EXISTS trait_training_programs;
DROP TABLE IF EXISTS mentoring_programs;
DROP TABLE IF EXISTS correction_programs;
DROP TABLE IF EXISTS facility_upgrade_history;
DROP TABLE IF EXISTS team_facilities;
DROP TABLE IF EXISTS facility_levels;
DROP TABLE IF EXISTS facilities;
DROP TABLE IF EXISTS condition_history;
DROP TABLE IF EXISTS exp_history;
DROP TABLE IF EXISTS level_exp_requirements;
DROP TABLE IF EXISTS condition_grades;
DROP TABLE IF EXISTS sponsor_payments;
DROP TABLE IF EXISTS team_sponsors;
DROP TABLE IF EXISTS sponsors;
DROP TABLE IF EXISTS player_traits;
DROP TABLE IF EXISTS trait_acquisition_rates;
DROP TABLE IF EXISTS traits;
DROP TABLE IF EXISTS promotion_matches;
DROP TABLE IF EXISTS playoff_matches;
DROP TABLE IF EXISTS league_matches;
DROP TABLE IF EXISTS league_participants;
DROP TABLE IF EXISTS league_seasons;
DROP TABLE IF EXISTS seasons;
DROP TABLE IF EXISTS leagues;

SET FOREIGN_KEY_CHECKS = 1;

-- 1. 리그 시스템
SOURCE src/database/league_system.sql;

-- 2. 특성 시스템
SOURCE src/database/traits_system.sql;
SOURCE src/database/initial_traits.sql;

-- 3. 스폰서 시스템
SOURCE src/database/sponsor_system.sql;
SOURCE src/database/initial_sponsors.sql;

-- 4. 컨디션/레벨/경험치 시스템
SOURCE src/database/player_condition_level_system.sql;

-- 5. 시설 시스템
SOURCE src/database/facility_system.sql;

-- 6. 랭크 리그 시스템
SOURCE src/database/ranked_system.sql;

-- 7. 솔랭 시스템
SOURCE src/database/solo_rank_system.sql;

-- 8. 경매장 시스템
SOURCE src/database/posting_auction_system.sql;

-- 9. 친선경기 시스템
SOURCE src/database/friendly_match_system.sql;

-- 10. 카드 합성 시스템
SOURCE src/database/card_fusion_system.sql;

-- 11. 선수 육성 시스템
SOURCE src/database/player_training_system.sql;

-- 12. 초기 데이터
SOURCE src/database/initial_coaches.sql;
SOURCE src/database/initial_tactics.sql;
SOURCE src/database/initial_supports.sql;
SOURCE src/database/initial_players_2026.sql;

-- 완료 메시지
SELECT '✅ 모든 데이터베이스 설정 완료!' AS Status;
SELECT COUNT(*) AS player_count FROM player_cards;
SELECT COUNT(*) AS coach_count FROM coach_cards;
SELECT COUNT(*) AS tactic_count FROM tactic_cards;
SELECT COUNT(*) AS support_count FROM support_cards;
SELECT COUNT(*) AS trait_count FROM traits;
SELECT COUNT(*) AS sponsor_count FROM sponsors;
