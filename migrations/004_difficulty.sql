-- Add opponent strength tracking ("difficulty bonus")
ALTER TABLE season_config ADD COLUMN difficulty_weight REAL NOT NULL DEFAULT 1.0;
ALTER TABLE fixtures ADD COLUMN match_url TEXT;
ALTER TABLE results ADD COLUMN opponent_name TEXT;
ALTER TABLE results ADD COLUMN opponent_url TEXT;
ALTER TABLE results ADD COLUMN opponent_difficulty REAL;
