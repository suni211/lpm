-- 스폰서 초기 데이터
-- 실제 기업 + 가상 기업 포함

INSERT INTO sponsors (sponsor_name, sponsor_logo, monthly_payment, bonus_type, bonus_value, bonus_description, contract_duration, tier) VALUES
-- MEGA 티어 (최상위 스폰서)
('Red Bull', '/sponsors/redbull.png', 800000000, 'CONDITION', 10, '선수 전원 컨디션 10% 향상', 12, 'MEGA'),
('Samsung', '/sponsors/samsung.png', 750000000, 'POWER', 8, '팀 전체 파워 8% 증가', 12, 'MEGA'),
('Coca-Cola', '/sponsors/cocacola.png', 700000000, 'MONEY', 15, '월급 15% 추가 지급', 12, 'MEGA'),
('Mercedes-Benz', '/sponsors/benz.png', 850000000, 'CARD_CHANCE', 20, '가챠 LEGEND 확률 20% 증가', 12, 'MEGA'),

-- BIG 티어 (대기업)
('Nike', '/sponsors/nike.png', 500000000, 'CONDITION', 8, '선수 전원 컨디션 8% 향상', 12, 'BIG'),
('Sony', '/sponsors/sony.png', 550000000, 'XP', 15, '경험치 획득량 15% 증가', 12, 'BIG'),
('Toyota', '/sponsors/toyota.png', 480000000, 'POWER', 5, '팀 전체 파워 5% 증가', 12, 'BIG'),
('BMW', '/sponsors/bmw.png', 600000000, 'CARD_CHANCE', 15, '가챠 EPIC 이상 확률 15% 증가', 12, 'BIG'),
('Adobe', '/sponsors/adobe.png', 520000000, 'MONEY', 12, '월급 12% 추가 지급', 12, 'BIG'),
('Kia', '/sponsors/kia.png', 450000000, 'CONDITION', 7, '선수 전원 컨디션 7% 향상', 12, 'BIG'),

-- NORMAL 티어 (중견 기업)
('PILA', '/sponsors/pila.png', 300000000, 'POWER', 3, '팀 전체 파워 3% 증가', 12, 'NORMAL'),
('Domino', '/sponsors/domino.png', 280000000, 'CONDITION', 5, '선수 전원 컨디션 5% 향상', 12, 'NORMAL'),
('SEGA', '/sponsors/sega.png', 320000000, 'XP', 10, '경험치 획득량 10% 증가', 12, 'NORMAL'),
('NAMCO', '/sponsors/namco.png', 310000000, 'CARD_CHANCE', 10, '가챠 RARE 이상 확률 10% 증가', 12, 'NORMAL'),
('SKY', '/sponsors/sky.png', 350000000, 'MONEY', 8, '월급 8% 추가 지급', 12, 'NORMAL'),

-- SMALL 티어 (중소 기업)
('Shell', '/sponsors/shell.png', 150000000, 'POWER', 2, '팀 전체 파워 2% 증가', 12, 'SMALL'),
('Tic Tac', '/sponsors/tictac.png', 120000000, 'CONDITION', 3, '선수 전원 컨디션 3% 향상', 12, 'SMALL');
