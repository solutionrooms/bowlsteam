-- BowlSteam schema

CREATE TABLE IF NOT EXISTS clubs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pin TEXT NOT NULL UNIQUE,
    name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER NOT NULL REFERENCES clubs(id),
    name TEXT NOT NULL,
    league_name TEXT NOT NULL,
    website_url TEXT
);

CREATE TABLE IF NOT EXISTS seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    year INTEGER NOT NULL,
    division TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    is_current INTEGER DEFAULT 0,
    selection_method TEXT NOT NULL DEFAULT 'form_based',
    UNIQUE(team_id, year)
);

CREATE TABLE IF NOT EXISTS season_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL UNIQUE REFERENCES seasons(id),
    squad_size INTEGER NOT NULL DEFAULT 11,
    reserve_count INTEGER NOT NULL DEFAULT 3,
    pick_count INTEGER NOT NULL DEFAULT 8,
    max_score INTEGER NOT NULL DEFAULT 21,
    rating_window INTEGER NOT NULL DEFAULT 3,
    default_rating REAL NOT NULL DEFAULT 15.0,
    drop_enabled INTEGER NOT NULL DEFAULT 1,
    drop_count INTEGER NOT NULL DEFAULT 1,
    drop_duration INTEGER NOT NULL DEFAULT 1,
    drop_carry_over INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS fixtures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    week_number INTEGER NOT NULL,
    match_date TEXT NOT NULL,
    opponent TEXT NOT NULL,
    venue TEXT NOT NULL CHECK (venue IN ('Home', 'Away')),
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed')),
    UNIQUE(season_id, week_number)
);

CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    name TEXT NOT NULL,
    is_reserve INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    UNIQUE(team_id, name)
);

CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL REFERENCES fixtures(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    is_available INTEGER NOT NULL DEFAULT 1,
    UNIQUE(fixture_id, player_id)
);

CREATE TABLE IF NOT EXISTS selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL REFERENCES fixtures(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    is_selected INTEGER NOT NULL,
    is_dropped INTEGER NOT NULL DEFAULT 0,
    rating_at_selection REAL,
    UNIQUE(fixture_id, player_id)
);

CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL REFERENCES fixtures(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    player_score INTEGER NOT NULL CHECK (player_score >= 0),
    opponent_score INTEGER NOT NULL CHECK (opponent_score >= 0),
    UNIQUE(fixture_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_results_player ON results(player_id);
CREATE INDEX IF NOT EXISTS idx_results_fixture ON results(fixture_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_season ON fixtures(season_id);
CREATE INDEX IF NOT EXISTS idx_availability_fixture ON availability(fixture_id);
CREATE INDEX IF NOT EXISTS idx_selections_fixture ON selections(fixture_id);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_seasons_team ON seasons(team_id);
CREATE INDEX IF NOT EXISTS idx_teams_club ON teams(club_id);
CREATE INDEX IF NOT EXISTS idx_clubs_pin ON clubs(pin);
