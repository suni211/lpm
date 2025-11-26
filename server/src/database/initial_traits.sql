-- 특성 초기 데이터
-- 포지션별 특성과 효과 정의

-- TOP 포지션 특성
INSERT INTO traits (trait_name, trait_description, position, category, effect_type, effect_value, phase, is_positive, rarity) VALUES
('정신병자', '라인전에서 공격적인 플레이로 상대를 압박한다', 'TOP', 'LANING', 'LANING_AGGRESSION', 15, 1, TRUE, 'RARE'),
('솔로킬 머신', '1vs1 상황에서 솔로킬 확률이 크게 증가한다', 'TOP', 'LANING', 'SOLOKILL_CHANCE', 20, 1, TRUE, 'EPIC'),
('한타의 지배자', '한타에서 팀에 큰 기여를 한다', 'TOP', 'TEAMFIGHT', 'TEAMFIGHT_POWER', 15, 2, TRUE, 'EPIC'),
('언더독', '불리한 상황에서 역전의 기회를 만든다', 'TOP', 'MENTAL', 'COMEBACK_BOOST', 10, 0, TRUE, 'RARE'),
('갑작스런 쓰로잉', '가끔 예상치 못한 실수로 팀에 손해를 준다', 'TOP', 'SPECIAL', 'THROW_CHANCE', -15, 0, FALSE, 'NORMAL');

-- JUNGLE 포지션 특성
INSERT INTO traits (trait_name, trait_description, position, category, effect_type, effect_value, phase, is_positive, rarity) VALUES
('카정충', '정글 CS에 집중하여 안정적으로 성장한다', 'JUNGLE', 'LANING', 'JUNGLE_FARM_BOOST', 20, 1, TRUE, 'NORMAL'),
('갱크충', '갱킹에 집중하여 라인에 큰 영향을 준다', 'JUNGLE', 'LANING', 'GANK_SUCCESS', 25, 1, TRUE, 'RARE'),
('미드만 봐줘', '미드 라인을 집중 케어한다', 'JUNGLE', 'SPECIAL', 'MID_FOCUS', 15, 1, TRUE, 'NORMAL'),
('바텀만 봐줘', '바텀 라인을 집중 케어한다', 'JUNGLE', 'SPECIAL', 'BOT_FOCUS', 15, 1, TRUE, 'NORMAL'),
('탑은 버려', '탑 라인 케어를 포기하는 대신 다른 라인에 집중한다', 'JUNGLE', 'SPECIAL', 'TOP_IGNORE', -10, 1, FALSE, 'NORMAL');

-- MID 포지션 특성
INSERT INTO traits (trait_name, trait_description, position, category, effect_type, effect_value, phase, is_positive, rarity) VALUES
('기선 제압', '초반부터 압도적인 존재감으로 상대를 제압한다', 'MID', 'LANING', 'EARLY_DOMINANCE', 20, 1, TRUE, 'EPIC'),
('공포심 자극', '상대에게 심리적 압박을 가한다', 'MID', 'MENTAL', 'MENTAL_PRESSURE', 15, 0, TRUE, 'RARE'),
('정글 도와줄게', '정글과의 호흡이 좋아 시너지가 증가한다', 'MID', 'SPECIAL', 'JUNGLE_SYNERGY', 12, 1, TRUE, 'RARE'),
('한타의 지배자', '한타에서 팀에 큰 기여를 한다', 'MID', 'TEAMFIGHT', 'TEAMFIGHT_POWER', 15, 2, TRUE, 'EPIC'),
('언더독', '불리한 상황에서 역전의 기회를 만든다', 'MID', 'MENTAL', 'COMEBACK_BOOST', 10, 0, TRUE, 'RARE'),
('갑작스런 그랩 끌리기', '가끔 예상치 못하게 적의 CC기에 걸린다', 'MID', 'SPECIAL', 'CC_VULNERABLE', -10, 2, FALSE, 'NORMAL'),
('SHOW MAKER', '경기의 흐름을 바꾸는 결정적인 플레이를 만든다', 'MID', 'SPECIAL', 'GAME_CHANGER', 25, 3, TRUE, 'LEGEND'),
('고전파', '전통적이고 안정적인 플레이 스타일', 'MID', 'LANING', 'STABLE_PLAY', 10, 0, TRUE, 'NORMAL');

-- ADC 포지션 특성
INSERT INTO traits (trait_name, trait_description, position, category, effect_type, effect_value, phase, is_positive, rarity) VALUES
('갑작스런 그랩 끌리기', '가끔 예상치 못하게 적의 CC기에 걸린다', 'ADC', 'SPECIAL', 'CC_VULNERABLE', -10, 2, FALSE, 'NORMAL'),
('갑작스런 쓰로잉', '가끔 예상치 못한 실수로 팀에 손해를 준다', 'ADC', 'SPECIAL', 'THROW_CHANCE', -15, 0, FALSE, 'NORMAL'),
('기선 제압', '초반부터 압도적인 존재감으로 상대를 제압한다', 'ADC', 'LANING', 'EARLY_DOMINANCE', 20, 1, TRUE, 'EPIC'),
('한타의 지배자', '한타에서 팀에 큰 기여를 한다', 'ADC', 'TEAMFIGHT', 'TEAMFIGHT_POWER', 15, 2, TRUE, 'EPIC'),
('알파카임미다', 'DEFT처럼 안정적이고 믿음직한 캐리력을 보여준다', 'ADC', 'SPECIAL', 'RELIABLE_CARRY', 18, 0, TRUE, 'LEGEND'),
('땅땅땅 빵', '공격 속도가 빠르고 지속 딜이 강력하다', 'ADC', 'TEAMFIGHT', 'ATTACK_SPEED_BOOST', 15, 2, TRUE, 'RARE'),
('F점멸 뒷 비전', '점멸을 뒤로 사용하여 생존력이 높다', 'ADC', 'SPECIAL', 'SURVIVAL_INSTINCT', 20, 2, TRUE, 'EPIC');

-- SUPPORT 포지션 특성
INSERT INTO traits (trait_name, trait_description, position, category, effect_type, effect_value, phase, is_positive, rarity) VALUES
('추격의 시작', '이니시에이팅 능력이 뛰어나다', 'SUPPORT', 'TEAMFIGHT', 'ENGAGE_POWER', 20, 2, TRUE, 'EPIC'),
('자석', '적을 끌어모으는 능력이 뛰어나다', 'SUPPORT', 'TEAMFIGHT', 'CROWD_CONTROL', 15, 2, TRUE, 'RARE'),
('골든 루키', '신인이지만 뛰어난 재능을 보여준다', 'SUPPORT', 'SPECIAL', 'ROOKIE_BOOST', 12, 0, TRUE, 'RARE'),
('영웅 놀이', '결정적인 순간에 팀을 구한다', 'SUPPORT', 'SPECIAL', 'CLUTCH_SAVE', 18, 3, TRUE, 'EPIC'),
('철인', '부상 없이 항상 안정적인 컨디션을 유지한다', 'SUPPORT', 'MENTAL', 'INJURY_IMMUNE', 10, 0, TRUE, 'LEGEND');

-- 한타 페이즈 전용 특성 (모든 포지션)
INSERT INTO traits (trait_name, trait_description, position, category, effect_type, effect_value, phase, is_positive, rarity) VALUES
('한타 던질게', '한타에서 실수로 팀에 손해를 준다', 'ALL', 'TEAMFIGHT', 'TEAMFIGHT_THROW', -20, 2, FALSE, 'NORMAL'),
('한타 잡을게', '한타에서 뛰어난 활약을 보여준다', 'ALL', 'TEAMFIGHT', 'TEAMFIGHT_CARRY', 25, 2, TRUE, 'EPIC'),
('한타, 지배해주지.', '한타를 완전히 장악하는 압도적인 플레이', 'ALL', 'TEAMFIGHT', 'TEAMFIGHT_DOMINATION', 30, 2, TRUE, 'LEGEND');
