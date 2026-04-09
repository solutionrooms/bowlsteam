# BowlSteam — Player Selection System PRD

## 1. Overview

A weekly player selection and rotation tool for **Westlands 1**, competing in the
**Newcastle Borough Mid-week Bowling League**. The app automates team selection based
on recent form, enforces a "worst loser sits out" drop rule, and tracks scores across
a season.

**Core problem:** Each week, a captain must pick 8 players from a squad of ~14. This
app replaces gut-feel selection with a transparent, form-based algorithm that the whole
team can understand.

### How it works (player-facing explanation)

> Each week, the 8 available players with the best recent scoring averages are selected —
> your average is based on your last three games, so form matters.
>
> In addition, the player who lost by the most points in the previous game will sit out
> regardless of their average. If no player lost then this does not apply.
>
> If you have not played yet then you are assigned an arbitrary average of 15, but this
> gets replaced by your real average after you have played.

---

## 2. Users & Access

- **Single user:** Team captain (Jon Scott). No authentication needed initially.
- **Future:** May roll out to other teams. Design data model to support multiple teams
  from the start (team_id on core tables), but only build single-team UI for now.

---

## 3. Architecture

Same stack as [friday_bowls_app](/Users/jonscott/Projects/friday_bowls_app):

| Layer        | Technology                  |
|--------------|-----------------------------|
| Frontend     | Vanilla JS + HTML/CSS (SPA) |
| Backend      | Cloudflare Workers          |
| Database     | Cloudflare D1 (SQLite)      |
| Hosting      | Cloudflare Pages            |
| Deployment   | Wrangler CLI                |
| Cost         | Free tier                   |

**Key architectural decisions:**
- No build step, no framework dependencies
- Single `worker.js` entry point routing to API or serving HTML
- Hash-based client-side routing
- Mobile-first responsive design (max ~540px)
- Dev and prod D1 databases (separate wrangler environments)

---

## 4. League Context

- **League:** Newcastle Borough Mid-week Bowling League
- **Team:** Westlands 1 (Division 2, 2026 season)
- **Season:** ~April to September (22 matches in 2026)
- **Match day:** Usually Wednesday, but not always
- **Format:** 8 individual head-to-head games per match, each scored 0–21
- **League website:** https://www.cgleague.co.uk/archives/team.php?L=Ncl&T=Westlands+1

### Website data available for import

**Team page** (`team.php?L=Ncl&T=Westlands+1`):
- Fixture list: date, opponent, home/away, aggregate scores
- Player list: name, P, W, L, Ave (season-level stats)

**Match detail** (`match.php?L=Ncl&D=2&Ht=X&At=Y`):
- Individual pairings: player name, score, opponent name, opponent score, gain

**Archives** (`archives.php?A=45`):
- Historical seasons back to 2013
- URL pattern for past seasons: `team.php?DB=A&S=YYYY&L=Ncl&T=Westlands+1`

---

## 5. Squad Structure

| Category         | Count | Description                                              |
|------------------|-------|----------------------------------------------------------|
| Regular players  | 11    | Core squad, first in line for selection                   |
| Reserves         | 3     | Called up only when regulars unavailable; prefer not to play often |
| Selected per match | 8   | Chosen by algorithm from available pool                   |

**Reserve priority:** When fewer than 8 regulars are available, non-selected regulars
fill gaps first. The 3 dedicated reserves are only called upon if the regular squad
cannot field 8 players.

All 14 players are ranked by the same rating system. Reserves are simply less likely to
be available (the captain marks them as available only when needed).

### Roster Management

The league website lists all registered players for the club (~34), but only ~14 are in
the active squad for this system. The captain manages the roster manually:

- **Add players** by name (typed in, not imported from the website)
- **Assign role:** regular (11) or reserve (3)
- **Deactivate** players who leave or are no longer in the squad
- **Reactivate** players returning to the squad
- Players can be added or removed mid-season
- The roster is independent of the league website's registered player list

---

## 6. Data Model

### Tables

```sql
-- Season and fixture management
CREATE TABLE seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL UNIQUE,
    division TEXT NOT NULL,
    start_date TEXT,          -- ISO date
    end_date TEXT,            -- ISO date
    is_current INTEGER DEFAULT 0
);

CREATE TABLE fixtures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL REFERENCES seasons(id),
    week_number INTEGER NOT NULL,
    match_date TEXT NOT NULL,  -- ISO date
    opponent TEXT NOT NULL,
    venue TEXT NOT NULL CHECK (venue IN ('Home', 'Away')),
    status TEXT NOT NULL DEFAULT 'upcoming'
        CHECK (status IN ('upcoming', 'completed')),
    UNIQUE(season_id, week_number)
);

-- Squad management
CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    is_reserve INTEGER DEFAULT 0,  -- 0 = regular, 1 = reserve
    is_active INTEGER DEFAULT 1    -- soft delete / retired
);

-- Per-fixture availability and selection
CREATE TABLE availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL REFERENCES fixtures(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    is_available INTEGER NOT NULL DEFAULT 1,
    UNIQUE(fixture_id, player_id)
);

CREATE TABLE selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL REFERENCES fixtures(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    is_selected INTEGER NOT NULL,      -- 1 = playing, 0 = not selected
    is_dropped INTEGER NOT NULL DEFAULT 0,  -- 1 = sat out due to drop rule
    rating_at_selection REAL,          -- snapshot of rating when selected
    UNIQUE(fixture_id, player_id)
);

-- Match results (individual games)
CREATE TABLE results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fixture_id INTEGER NOT NULL REFERENCES fixtures(id),
    player_id INTEGER NOT NULL REFERENCES players(id),
    player_score INTEGER NOT NULL CHECK (player_score >= 0),
    opponent_score INTEGER NOT NULL CHECK (opponent_score >= 0),
    UNIQUE(fixture_id, player_id)
);
```

### Indexes

```sql
CREATE INDEX idx_results_player ON results(player_id);
CREATE INDEX idx_results_fixture ON results(fixture_id);
CREATE INDEX idx_fixtures_season ON fixtures(season_id);
CREATE INDEX idx_availability_fixture ON availability(fixture_id);
CREATE INDEX idx_selections_fixture ON selections(fixture_id);
```

---

## 7. Configuration Parameters

All selection logic is driven by configurable parameters stored per season. This allows
different teams (or different seasons) to tailor the system to their preferences.

```sql
CREATE TABLE season_config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season_id INTEGER NOT NULL UNIQUE REFERENCES seasons(id),

    -- Squad & selection
    squad_size INTEGER NOT NULL DEFAULT 11,        -- total regular players
    reserve_count INTEGER NOT NULL DEFAULT 3,      -- additional reserves
    pick_count INTEGER NOT NULL DEFAULT 8,         -- players selected per match
    max_score INTEGER NOT NULL DEFAULT 21,         -- maximum individual game score

    -- Rating system
    rating_window INTEGER NOT NULL DEFAULT 3,      -- number of recent games for rolling average
    default_rating REAL NOT NULL DEFAULT 15.0,     -- seed rating for unplayed players

    -- Drop rule
    drop_enabled INTEGER NOT NULL DEFAULT 1,       -- 1 = enforce drop rule, 0 = disabled
    drop_count INTEGER NOT NULL DEFAULT 1,         -- how many players to drop per week
    drop_duration INTEGER NOT NULL DEFAULT 1,      -- how many weeks the drop lasts
    drop_carry_over INTEGER NOT NULL DEFAULT 0     -- 1 = drop carries to next week if
                                                   --     player unavailable, 0 = consumed
);
```

**Parameter summary:**

| Parameter        | Default | Description                                        |
|------------------|---------|----------------------------------------------------|
| `squad_size`     | 11      | Number of regular squad members                    |
| `reserve_count`  | 3       | Number of reserve players                          |
| `pick_count`     | 8       | Players selected each match                        |
| `max_score`      | 21      | Maximum score per game (used for input validation) |
| `rating_window`  | 3       | How many recent games the rolling average uses     |
| `default_rating` | 15.0    | Starting rating for players with no games          |
| `drop_enabled`   | 1       | Whether the drop rule is active                    |
| `drop_count`     | 1       | Number of players dropped per match                |
| `drop_duration`  | 1       | Number of matches the drop lasts                   |
| `drop_carry_over`| 0       | Whether drop carries over if player unavailable    |

A settings screen allows the captain to adjust these when creating or editing a season.
Any changes apply from the next fixture onwards — completed fixtures are not
recalculated.

---

## 8. Core Logic

### 8.1 Player Rating

A rolling average of the player's most recent scores. Recalculated after each match.
The number of games used is controlled by `rating_window` (default: 3).

| Games played          | Rating                                          |
|-----------------------|-------------------------------------------------|
| 0                     | `default_rating` (default: 15.00)               |
| < `rating_window`     | Average of all games played so far              |
| >= `rating_window`    | Average of last `rating_window` games only      |

**"Last N scores"** means the N most recent `results` rows for that player, ordered by
fixture date descending. Only games where the player actually played count (not weeks
they were dropped or unavailable).

**Season reset:** Ratings reset to `default_rating` at the start of each new season.
No carryover. No historical data is imported — every season is a fresh start.

### 8.2 Drop Rule

After each completed match (when `drop_enabled = 1`):

1. Identify all players who **lost** (player_score < opponent_score)
2. Among losers, find the `drop_count` player(s) with the **largest margin of defeat**
   (opponent_score - player_score)
3. Those player(s) are **dropped for the next `drop_duration` match(es)**

**Edge cases:**
- If no player lost (all won): no one is dropped
- Draws are not possible — games are played to `max_score`
- **Tie-break on margin:** player with the lower current rating sits out
- **Still tied:** flag for captain's manual decision (prompt in UI)
- The dropped player **re-enters the pool** after `drop_duration` matches, ranked
  normally — no automatic reinstatement, they must rank into the top `pick_count`
- **Drop consumed if unavailable** (when `drop_carry_over = 0`): If the dropped player
  was already going to be unavailable for the next match, the drop is simply consumed —
  no one else is dropped in their place
- **Drop carries over** (when `drop_carry_over = 1`): If the dropped player is
  unavailable, the drop applies to their next available match instead

### 8.3 Weekly Selection Algorithm

Run when the captain triggers selection for an upcoming fixture:

```
1. Load all players marked as available for this fixture
2. Remove dropped player(s) (if any, from previous match's drop rule)
3. Rank remaining available players by current rating (descending)
4. Select top `pick_count`
5. Store selections with rating snapshot
```

If fewer than `pick_count` players are available after step 2, **all available players
are selected** (short-handed match).

### 7.4 Opponent Matching

The order in which the 8 selected players are assigned to games is **randomised** — the
draw determines who faces which opponent. This is outside the app's control; the app
just needs to record which player scored what against their opponent.

---

## 9. Fixture Import

### Automatic import from league website

Scrape the team page to populate the `fixtures` table for a season:

**Source URL:** `https://www.cgleague.co.uk/archives/team.php?L=Ncl&T=Westlands+1`

**Data to extract per fixture:**
- Match date (parse "Wed 15 Apr" → ISO date with correct year)
- Opponent name
- Venue (Home/Away)

**When to run:** Manual "Sync Fixtures" button in the UI. Captain triggers it when
needed (typically once at season start, or if fixtures change). Handle fixtures being
added/changed on the league website by matching on date + opponent.

**Implementation:** Fetch the HTML in a Worker, parse the fixture table, upsert into
D1. No external scraping service needed — Cloudflare Workers can fetch the page
directly.

### Future: result import

The match detail pages contain individual player scores. This could be used to
auto-populate results instead of manual entry. **Not in v1** — manual entry is fine
for now, but the URL pattern is documented above for future use.

---

## 10. Match Day Workflow

### Before the match

1. **Captain opens the upcoming fixture** (next unplayed fixture by date)
2. **Marks availability** — toggle each player as available/unavailable
3. **Triggers selection** — app runs the algorithm and shows:
   - The 8 selected players (ranked by rating)
   - The dropped player (if any) and why (margin of defeat shown)
   - Any players who were available but not selected (and their ratings)
4. **Reviews and confirms** — no manual overrides to selection, but captain can
   adjust availability and re-run

### After the match

5. **Enters scores** — for each of the 8 players: their score (0–21) and opponent
   score (0–21)
6. **Confirms results** — app automatically:
   - Recalculates all player ratings
   - Determines the dropped player for next week
   - Shows updated ratings table

---

## 11. API Endpoints

### Seasons
- `GET /api/seasons` — list all seasons
- `POST /api/seasons` — create season (year, division); auto-creates default config
- `POST /api/seasons/:id/import-fixtures` — scrape and import fixtures from league website

### Season Config
- `GET /api/seasons/:id/config` — get configuration parameters
- `PUT /api/seasons/:id/config` — update configuration parameters

### Fixtures
- `GET /api/fixtures?season_id=X` — list fixtures for a season
- `GET /api/fixtures/:id` — fixture detail (with availability, selections, results)
- `PUT /api/fixtures/:id` — update fixture status

### Players
- `GET /api/players` — list all players (with current ratings)
- `POST /api/players` — add player
- `PUT /api/players/:id` — update player (name, reserve status, active)
- `DELETE /api/players/:id` — deactivate player

### Availability
- `PUT /api/fixtures/:id/availability` — bulk set availability for a fixture
  (body: `{ players: [{ player_id, is_available }] }`)

### Selection
- `POST /api/fixtures/:id/select` — run selection algorithm, store results
- `GET /api/fixtures/:id/selection` — get selection result for a fixture

### Results
- `POST /api/fixtures/:id/results` — submit all 8 results for a match
  (body: `{ results: [{ player_id, player_score, opponent_score }] }`)
- `PUT /api/fixtures/:id/results/:result_id` — update a single result

### Ratings & Stats
- `GET /api/ratings` — current ratings for all active players
- `GET /api/players/:id/history` — historical scores for a player

---

## 12. UI Views

### 12.1 Dashboard (`#/`)
- Current season summary (team name, division, W/L record)
- Next fixture card: date, opponent, venue, selection status
- Quick link to enter results for the most recent unscored match
- Season progress bar

### 12.2 Fixtures (`#/fixtures`)
- List of all fixtures for current season
- Status badges: upcoming / completed
- Home/Away indicators
- Click through to fixture detail

### 12.3 Fixture Detail (`#/fixture/:id`)
- Opponent, date, venue
- **Availability panel:** toggles for each player
- **Selection panel:** run selection button, shows selected 8 + dropped player + reasoning
- **Results panel** (post-match): score entry form for 8 games
- Match summary after results entered

### 12.4 Ratings (`#/ratings`)
- All active players ranked by current rating
- Columns: rank, name, rating, last 3 scores, games played
- Highlight: dropped player (for next match)
- Visual indicator for reserve players
- Designed to be copy-paste friendly for WhatsApp sharing

### 12.5 Player History (`#/player/:id`)
- Player name, current rating, total games played
- Full score history: date, opponent team, score, opponent score, W/L, margin
- Rating trend (last N games)

### 12.6 Squad (`#/squad`)
- **Add player** — type name manually (not imported from league website)
- **Set role** — regular or reserve, with count indicators (e.g. "9/11 regulars")
- **Deactivate / reactivate** — soft removal without losing historical data
- **List view** — shows all squad members grouped by role, with current rating
- Captain builds roster from scratch; the 34 names on the league website are not
  auto-imported (many are not part of this squad)

### 12.7 Season Management (`#/season`)
- Create new season
- Import fixtures from league website
- View/switch between seasons

---

### 12.8 Season Settings (`#/season/:id/settings`)
- Edit all configuration parameters for the season (see Section 7)
- Sensible defaults pre-filled; captain adjusts what they want
- Changes apply from next fixture onwards
- Summary of current settings always visible

---

## 13. Copy-Paste Optimised Output

Since the captain may share selections and ratings via WhatsApp, key outputs should
render cleanly as plain text:

**Example: Weekly selection**
```
WESTLANDS 1 vs Oakhill (Away)
Wed 22 Apr 2026

SELECTED (8):
1. Stan Wilkes    — 18.3
2. Bernard Oates  — 17.8
3. Andrew Hall    — 17.2
4. Harry Walklet  — 16.7
5. Jon Scott      — 16.5
6. Dave Pedlar    — 15.6
7. Wayne Fisher   — 15.2
8. Peggy Moss     — 14.8

DROPPED: Hilary Dale (lost by 10 last week)

NOT SELECTED:
- Sylvia Oates (12.5) — available but not in top 8
```

**Example: Ratings table**
```
RATINGS — Week 3

 #  Player           Avg   Last 3
 1  Stan Wilkes     18.3   19, 17, 19
 2  Bernard Oates   17.8   18, 21, 14
 3  Andrew Hall     17.2   16, 18, 18
 ...
```

A "Copy to clipboard" button should be provided on these views.

---

## 14. Home/Away Consideration

The user notes that away matches are significantly harder than home matches. **v1 does
not adjust ratings for venue.** However, the data model stores venue per fixture, so a
future version could:

- Weight away scores slightly higher in rating calculations
- Show separate home/away averages on the ratings page
- Apply a home/away adjustment factor to expected scores

This is explicitly deferred — the user is unsure how to calibrate an adjustment factor.

---

## 15. Non-Functional Requirements

- **Performance:** Page loads under 1 second on mobile (edge-deployed via Cloudflare)
- **Offline:** Not required — always used with internet access
- **Data integrity:** D1 foreign key constraints enforced; no orphaned records
- **Backup:** D1 provides automatic backups; manual export (JSON dump) as a future nice-to-have
- **Browser support:** Modern mobile browsers (Safari iOS, Chrome Android)

---

## 16. Development Phases

### Phase 1 — Core (MVP)
- [ ] Project setup (Cloudflare Worker + D1, wrangler.toml, schema)
- [ ] Player/squad management (CRUD)
- [ ] Season creation and fixture import from league website
- [ ] Availability marking
- [ ] Rating calculation engine
- [ ] Selection algorithm with drop rule
- [ ] Score entry
- [ ] Ratings view with copy-to-clipboard
- [ ] Selection view with copy-to-clipboard

### Phase 2 — Polish
- [ ] Player history / score trends
- [ ] Season summary stats (W/L record, best/worst performances)
- [ ] Fixture list with status badges and match results
- [ ] Dashboard with next-match card

### Phase 3 — Future
- [ ] Auto-import match results from league website
- [ ] Home/away rating adjustment
- [ ] Multi-team support
- [ ] Player-facing read-only view
- [ ] WhatsApp integration (share via API instead of copy-paste)

---

## 17. Open Questions

None — all resolved.
