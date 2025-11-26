-- 작전 카드 초기 데이터 (9개)

INSERT INTO tactic_cards (tactic_name, tactic_image, position, effect_description, effect_type, effect_value, rarity) VALUES
('고춧가루 작전', '/cards/tactics/고춧가루작전.png', NULL, '상위 파워 팀일 시, 3% 증가', 'POWER_BOOST_VS_STRONGER', 3, 'RARE'),
('물귀신 작전', '/cards/tactics/물귀신작전.png', NULL, '강등권에 있을 때, 상위팀 과 대전 시 선수들의 능력치 상승', 'UNDERDOG_BOOST', 5, 'EPIC'),
('선두를 잡아라', '/cards/tactics/선두를잡아라.png', NULL, '1위팀과 상대 시, 능력치 상승', 'VS_FIRST_PLACE_BOOST', 7, 'EPIC'),
('비밀병기', '/cards/tactics/비밀병기.png', NULL, '파워 450이하 라이너 능력치 상승 3%', 'LOW_POWER_LANER_BOOST', 3, 'RARE'),
('용사', '/cards/tactics/용사.png', NULL, '파워 450이하, 정글-서폿 능력치 상승 3.45%', 'LOW_POWER_JGSUP_BOOST', 3, 'RARE'),
('연패탈출', '/cards/tactics/연패탈출.png', NULL, '전 시합에서, 2연속 패배시, 선수들의 능력치 상승', 'LOSING_STREAK_BOOST', 8, 'EPIC'),
('헝그리 정신', '/cards/tactics/헝그리정신.png', NULL, '코스트보다 높은 구단과 상대시 선수들의 능력치 상승', 'HIGH_COST_OPPONENT_BOOST', 5, 'RARE'),
('ㄷㄷㄷㅈ', '/cards/tactics/ㄷㄷㄷㅈ.png', 'MID', '한타 때, 미드가 이기고 있을 시 (파워로) 3% 상승', 'MID_WINNING_TEAMFIGHT_BOOST', 3, 'RARE'),
('특급 소방수', '/cards/tactics/특급소방수.png', NULL, '혼자서 라인전 이기고 있을 시, 5% 상승 파워', 'SOLO_LANING_WIN_BOOST', 5, 'EPIC');
