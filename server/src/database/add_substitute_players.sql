-- Add substitute player slots to the rosters table

ALTER TABLE rosters
ADD COLUMN sub1_player_id UUID REFERENCES user_player_cards(id),
ADD COLUMN sub2_player_id UUID REFERENCES user_player_cards(id);
