-- Cap the positive bonus when LOSING (credit you get for losing narrowly
-- to a strong opponent). Distinct from win_bonus_cap (cap on + bonus when
-- you actually won) and loss_penalty_cap (cap on any negative bonus).
-- Default 3 so a loss can move you up by at most 3 chalks — meaningful but
-- not "nearly as good as a win".
ALTER TABLE season_config ADD COLUMN loss_credit_cap REAL NOT NULL DEFAULT 3.0;
