-- LCK 2026 선수 카드 초기 데이터
-- 순서: card_name, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity

-- T1 (최강팀)
INSERT INTO player_cards (card_name, card_image, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity) VALUES
('Doran', '/cards/players/Doran.png', 'TOP', 9, 68, 73, 80, 43, 80, 91, 'EPIC'),
('Oner', '/cards/players/Oner.png', 'JUNGLE', 9, 85, 88, 80, 81, 77, 33, 'EPIC'),
('Faker', '/cards/players/Faker.png', 'MID', 10, 91, 90, 88, 85, 90, 91, 'LEGEND'),
('Peyz', '/cards/players/Peyz.png', 'ADC', 9, 80, 91, 92, 32, 77, 85, 'EPIC'),
('Keria', '/cards/players/Keria.png', 'SUPPORT', 10, 77, 92, 25, 95, 90, 88, 'LEGEND');

-- GEN (최강팀)
INSERT INTO player_cards (card_name, card_image, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity) VALUES
('Kiin', '/cards/players/Kiin.png', 'TOP', 10, 82, 91, 90, 42, 83, 92, 'LEGEND'),
('Canyon', '/cards/players/Canyon.png', 'JUNGLE', 10, 88, 92, 85, 88, 90, 85, 'LEGEND'),
('Chovy', '/cards/players/Chovy.png', 'MID', 10, 90, 88, 95, 80, 92, 93, 'LEGEND'),
('Ruler', '/cards/players/Ruler.png', 'ADC', 10, 92, 93, 90, 85, 91, 88, 'LEGEND'),
('Duro', '/cards/players/Duro.png', 'SUPPORT', 8, 75, 85, 30, 90, 82, 80, 'EPIC');

-- HLE (상위권)
INSERT INTO player_cards (card_name, card_image, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity) VALUES
('Zeus', '/cards/players/Zeus.png', 'TOP', 10, 85, 88, 85, 50, 87, 95, 'LEGEND'),
('Kanavi', '/cards/players/Kanavi.png', 'JUNGLE', 9, 82, 90, 82, 85, 88, 80, 'EPIC'),
('Zeka', '/cards/players/Zeka.png', 'MID', 9, 80, 85, 88, 75, 85, 87, 'EPIC'),
('Gumayusi', '/cards/players/Gumayusi.png', 'ADC', 10, 78, 92, 93, 40, 85, 90, 'LEGEND'),
('Delight', '/cards/players/Delight.png', 'SUPPORT', 8, 77, 82, 28, 88, 85, 82, 'EPIC');

-- KT (상위권)
INSERT INTO player_cards (card_name, card_image, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity) VALUES
('PerfecT', '/cards/players/PerfecT.png', 'TOP', 7, 72, 78, 80, 45, 75, 82, 'RARE'),
('Cuzz', '/cards/players/Cuzz.png', 'JUNGLE', 8, 75, 85, 78, 80, 82, 77, 'EPIC'),
('Bdd', '/cards/players/Bdd.png', 'MID', 8, 80, 82, 85, 72, 83, 85, 'EPIC'),
('Aiming', '/cards/players/Aiming.png', 'ADC', 8, 75, 88, 87, 38, 80, 83, 'EPIC'),
('Ghost', '/cards/players/Ghost.png', 'ADC', 7, 78, 80, 82, 42, 78, 78, 'RARE'),
('Pollu', '/cards/players/Pollu.png', 'SUPPORT', 7, 70, 80, 25, 85, 78, 75, 'RARE');

-- DK (상위권)
INSERT INTO player_cards (card_name, card_image, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity) VALUES
('Siwoo', '/cards/players/Siwoo.png', 'TOP', 7, 70, 75, 78, 48, 73, 80, 'RARE'),
('Lucid', '/cards/players/Lucid.png', 'JUNGLE', 8, 77, 82, 80, 82, 80, 75, 'EPIC'),
('ShowMaker', '/cards/players/ShowMaker.png', 'MID', 10, 88, 90, 92, 82, 91, 90, 'LEGEND'),
('Smash', '/cards/players/Smash.png', 'ADC', 7, 72, 78, 83, 35, 75, 80, 'RARE'),
('Career', '/cards/players/Career.png', 'SUPPORT', 7, 68, 77, 22, 82, 75, 73, 'RARE');

-- BFX (중위권)
INSERT INTO player_cards (card_name, card_image, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity) VALUES
('Clear', '/cards/players/Clear.png', 'TOP', 6, 65, 70, 75, 50, 68, 75, 'RARE'),
('Raptor', '/cards/players/Raptor.png', 'JUNGLE', 6, 68, 73, 72, 75, 72, 70, 'RARE'),
('VicLa', '/cards/players/VicLa.png', 'MID', 7, 73, 78, 80, 68, 77, 78, 'RARE'),
('Daystar', '/cards/players/Daystar.png', 'MID', 5, 60, 68, 72, 62, 65, 70, 'NORMAL'),
('Diable', '/cards/players/Diable.png', 'ADC', 6, 67, 72, 78, 30, 70, 73, 'RARE'),
('Kellin', '/cards/players/Kellin.png', 'SUPPORT', 7, 70, 78, 20, 85, 75, 72, 'RARE');

-- NS (중위권)
INSERT INTO player_cards (card_name, card_image, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity) VALUES
('Kingen', '/cards/players/Kingen.png', 'TOP', 7, 75, 80, 82, 45, 78, 83, 'RARE'),
('Sponge', '/cards/players/Sponge.png', 'JUNGLE', 6, 70, 75, 70, 78, 73, 68, 'RARE'),
('Calix', '/cards/players/Calix.png', 'MID', 6, 68, 72, 75, 65, 70, 73, 'RARE'),
('Scout', '/cards/players/Scout.png', 'MID', 8, 80, 83, 85, 75, 82, 85, 'EPIC'),
('Taeyoon', '/cards/players/Taeyoon.png', 'ADC', 6, 65, 73, 77, 32, 68, 72, 'RARE'),
('Lehends', '/cards/players/Lehends.png', 'SUPPORT', 8, 78, 85, 23, 90, 83, 80, 'EPIC');

-- BRO (중위권)
INSERT INTO player_cards (card_name, card_image, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity) VALUES
('Casting', '/cards/players/Casting.png', 'TOP', 6, 68, 73, 77, 47, 70, 75, 'RARE'),
('GIDEON', '/cards/players/GIDEON.png', 'JUNGLE', 7, 72, 78, 75, 80, 75, 73, 'RARE'),
('Fisher', '/cards/players/Fisher.png', 'MID', 6, 65, 70, 73, 63, 68, 72, 'RARE'),
('Teddy', '/cards/players/Teddy.png', 'ADC', 8, 82, 85, 88, 38, 83, 85, 'EPIC'),
('Namgung', '/cards/players/Namgung.png', 'SUPPORT', 6, 67, 73, 22, 80, 72, 70, 'RARE');

-- DRX (하위권)
INSERT INTO player_cards (card_name, card_image, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity) VALUES
('Rich', '/cards/players/Rich.png', 'TOP', 5, 62, 68, 72, 45, 65, 70, 'NORMAL'),
('Vincenzo', '/cards/players/Vincenzo.png', 'JUNGLE', 5, 65, 70, 68, 72, 68, 65, 'NORMAL'),
('Willer', '/cards/players/Willer.png', 'JUNGLE', 6, 68, 73, 72, 75, 70, 68, 'RARE'),
('Jiwoo', '/cards/players/Jiwoo.png', 'ADC', 5, 60, 68, 73, 28, 63, 68, 'NORMAL'),
('Andil', '/cards/players/Andil.png', 'SUPPORT', 5, 63, 70, 20, 75, 68, 65, 'NORMAL');

-- DNF (하위권)
INSERT INTO player_cards (card_name, card_image, position, cost, mental, team_fight, cs_ability, vision, judgment, laning, rarity) VALUES
('DuDu', '/cards/players/DuDu.png', 'TOP', 5, 65, 70, 73, 48, 67, 72, 'NORMAL'),
('Pyosik', '/cards/players/Pyosik.png', 'JUNGLE', 6, 70, 75, 73, 77, 72, 70, 'RARE'),
('Clozer', '/cards/players/Clozer.png', 'MID', 7, 73, 77, 80, 68, 75, 78, 'RARE'),
('deokdam', '/cards/players/deokdam.png', 'ADC', 6, 67, 72, 77, 30, 68, 73, 'RARE'),
('Life', '/cards/players/Life.png', 'SUPPORT', 8, 75, 82, 22, 88, 80, 78, 'EPIC'),
('Peter', '/cards/players/Peter.png', 'SUPPORT', 5, 62, 68, 20, 73, 65, 63, 'NORMAL');
