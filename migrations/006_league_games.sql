-- Cross-team raw board results for the Elo ladder (player_order.prd §5.1).
-- Additive and immutable. Not required for the Phase 2 backtest (which uses
-- the local tools/league_games.json); apply this only when Phase 3 needs the
-- ladder server-side.
CREATE TABLE IF NOT EXISTS league_games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_year INTEGER NOT NULL,
    match_date TEXT,
    division TEXT,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    board INTEGER NOT NULL,
    home_player TEXT,
    home_score INTEGER,
    away_player TEXT,
    away_score INTEGER,
    match_url TEXT NOT NULL,
    UNIQUE(match_url, board)
);

CREATE INDEX IF NOT EXISTS idx_league_games_date ON league_games(match_date);
