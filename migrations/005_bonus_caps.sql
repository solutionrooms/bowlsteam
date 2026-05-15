-- Caps on the difficulty bonus magnitude.
-- win_bonus_cap   = max positive bonus you can get for a win (default 1 chalk)
-- loss_penalty_cap = max negative bonus magnitude you can suffer on a loss (default 1 chalk)
ALTER TABLE season_config ADD COLUMN win_bonus_cap REAL NOT NULL DEFAULT 1.0;
ALTER TABLE season_config ADD COLUMN loss_penalty_cap REAL NOT NULL DEFAULT 1.0;
