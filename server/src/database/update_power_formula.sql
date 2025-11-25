-- 포지션별 파워 계산 공식
-- 기존 power 컬럼 제거하고 새로운 계산식 적용

-- 1. 기존 power 컬럼 제거
ALTER TABLE player_cards DROP COLUMN IF EXISTS power;

-- 2. 포지션별 파워 계산 함수 생성
CREATE OR REPLACE FUNCTION calculate_position_power(
  pos VARCHAR,
  men INTEGER,
  tf INTEGER,
  cs INTEGER,
  vis INTEGER,
  jud INTEGER,
  lan INTEGER
) RETURNS INTEGER AS $$
BEGIN
  CASE pos
    WHEN 'TOP' THEN
      -- 멘탈 + 한타 + CS + 시야*0.5 + 판단 + 라인전*2
      RETURN ROUND(men + tf + cs + (vis * 0.5) + jud + (lan * 2));
    WHEN 'JUNGLE' THEN
      -- 멘탈*2 + 한타 + CS + 시야*1.5 + 판단 - 라인전*0.5
      RETURN ROUND((men * 2) + tf + cs + (vis * 1.5) + jud - (lan * 0.5));
    WHEN 'MID' THEN
      -- 전부 다 더함
      RETURN men + tf + cs + vis + jud + lan;
    WHEN 'ADC' THEN
      -- CS*1.25 + 라인전*1.25 + 한타*1.25 + 나머지
      RETURN ROUND((cs * 1.25) + (lan * 1.25) + (tf * 1.25) + men + vis + jud);
    WHEN 'SUPPORT' THEN
      -- 시야*1.25 + 한타*1.25 + 나머지
      RETURN ROUND((vis * 1.25) + (tf * 1.25) + men + cs + jud + lan);
    ELSE
      RETURN men + tf + cs + vis + jud + lan;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. power 컬럼을 GENERATED COLUMN으로 추가
ALTER TABLE player_cards ADD COLUMN power INTEGER GENERATED ALWAYS AS (
  calculate_position_power(position, mental, team_fight, cs_ability, vision, judgment, laning)
) STORED;

-- 4. 코멘트 추가
COMMENT ON COLUMN player_cards.power IS '포지션별 파워 계산 (자동 생성)
TOP: 멘탈 + 한타 + CS + 시야*0.5 + 판단 + 라인전*2
JUNGLE: 멘탈*2 + 한타 + CS + 시야*1.5 + 판단 - 라인전*0.5
MID: 멘탈 + 한타 + CS + 시야 + 판단 + 라인전
ADC: CS*1.25 + 라인전*1.25 + 한타*1.25 + 멘탈 + 시야 + 판단
SUPPORT: 시야*1.25 + 한타*1.25 + 멘탈 + CS + 판단 + 라인전';
