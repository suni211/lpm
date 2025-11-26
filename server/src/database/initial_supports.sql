-- 서포트 카드 초기 데이터 (15개)

INSERT INTO support_cards (support_name, support_image, effect_description, effect_type, effect_value, rarity) VALUES
-- 팀 전체 서포트
('해외여행', '/cards/supports/해외여행.png', '외국인 선수 1명당 10% 컨디션 상승', 'FOREIGN_PLAYER_CONDITION', 10, 'RARE'),
('홈 파티', '/cards/supports/홈파티.png', '외국인 선수 1명당 5% 컨디션 상승', 'FOREIGN_PLAYER_CONDITION_SMALL', 5, 'NORMAL'),
('월급날', '/cards/supports/월급날.png', '선수 전원 컨디션 1단계 상승', 'TEAM_CONDITION_UP_1', 1, 'NORMAL'),
('단체 휴양', '/cards/supports/단체휴양.png', '선수 전원 컨디션 2단계 상승', 'TEAM_CONDITION_UP_2', 2, 'RARE'),
('라인 휴식', '/cards/supports/라인휴식.png', '선수 전원 컨디션 3단계 상승, 10% 파워 하락', 'TEAM_CONDITION_UP_3_POWER_DOWN', 3, 'EPIC'),
('엔터기 뽑음', '/cards/supports/엔터기뽑음.png', '라인전 전원 집중력 상승 (라인전 +5)', 'LANING_FOCUS_UP', 5, 'RARE'),
('희생 정신', '/cards/supports/희생정신.png', '정글, 서폿 선수의 전력이 상승 (+10 파워)', 'JGSUP_POWER_UP', 10, 'RARE'),
('배터리 재정비', '/cards/supports/배터리재정비.png', '원딜 라인전의 집중력 증가 (+10 라인전)', 'ADC_LANING_UP', 10, 'RARE'),

-- 선수 개별 서포트
('팬미팅', '/cards/supports/팬미팅.png', '개별 선수 컨디션 1단계 상승', 'PLAYER_CONDITION_UP_1', 1, 'NORMAL'),
('보약', '/cards/supports/보약.png', '개별 선수 컨디션 2단계 상승', 'PLAYER_CONDITION_UP_2', 2, 'RARE'),
('CF 출연', '/cards/supports/CF출연.png', '개별 선수 컨디션 3단계 상승, 파워 하락 5%', 'PLAYER_CONDITION_UP_3_POWER_DOWN', 3, 'EPIC'),
('장인의 마우스', '/cards/supports/장인의마우스.png', '집중력(판단력) +10', 'JUDGMENT_UP', 10, 'RARE'),
('장인의 키보드', '/cards/supports/장인의키보드.png', '한타력 +10', 'TEAMFIGHT_UP', 10, 'RARE'),
('장인의 헤드셋', '/cards/supports/장인의헤드셋.png', '시야 +10', 'VISION_UP', 10, 'RARE'),
('시장평가좀 받으실까', '/cards/supports/시장평가좀받으실까.png', '모든 능력치 +5', 'ALL_STATS_UP', 5, 'LEGEND');
