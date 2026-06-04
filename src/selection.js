// Selection engine — rating calculation, drop rule, team selection
// All logic is parameterised via season_config values.

/**
 * Calculate a player's current rating from their recent effective scores.
 * @param {Array} scores - newest-first array of numbers
 * @param {object} config - season_config row
 * @returns {number} rating
 */
export function calculateRating(scores, config) {
  if (scores.length === 0) return config.default_rating;
  const window = Math.min(scores.length, config.rating_window);
  const recent = scores.slice(0, window);
  const sum = recent.reduce((s, v) => s + v, 0);
  return sum / window;
}

/**
 * Calculate ratings for all players in a season.
 * Each completed fixture contributes one "effective score" per active player:
 *  - Actual score if they played (have a result)
 *  - reserve_score if they were available but not picked (still on the team that week)
 *  - away_score if they were unavailable
 * Only fixtures completed after a player became active count toward their history.
 *
 * @returns {Promise<Array>} [{player_id, name, is_reserve, rating, games_played, recent_scores, recent_entries}]
 *   recent_entries is [{score, type}] where type is 'played' | 'reserve' | 'away'
 */
export async function getAllRatings(db, seasonId, teamId, config) {
  const players = await db.prepare(
    'SELECT id, name, is_reserve FROM players WHERE is_active = 1 AND team_id = ?'
  ).bind(teamId).all();

  // All completed fixtures for this season, newest-first
  const fixtures = await db.prepare(`
    SELECT id, match_date FROM fixtures
    WHERE season_id = ? AND status = 'completed'
    ORDER BY match_date DESC
  `).bind(seasonId).all();

  // Pre-load results and availability for these fixtures
  const fixtureIds = fixtures.results.map(f => f.id);
  const resultsByFix = {}; // fixture_id → player_id → { score, opp, difficulty }
  const availByFix = {};
  if (fixtureIds.length > 0) {
    const placeholders = fixtureIds.map(() => '?').join(',');
    const allResults = await db.prepare(
      `SELECT fixture_id, player_id, player_score, opponent_score, opponent_difficulty FROM results WHERE fixture_id IN (${placeholders})`
    ).bind(...fixtureIds).all();
    for (const r of allResults.results) {
      if (!resultsByFix[r.fixture_id]) resultsByFix[r.fixture_id] = {};
      resultsByFix[r.fixture_id][r.player_id] = {
        score: r.player_score,
        opp: r.opponent_score,
        difficulty: r.opponent_difficulty,
      };
    }
    const allAvail = await db.prepare(
      `SELECT fixture_id, player_id, is_available FROM availability WHERE fixture_id IN (${placeholders})`
    ).bind(...fixtureIds).all();
    for (const a of allAvail.results) {
      if (!availByFix[a.fixture_id]) availByFix[a.fixture_id] = {};
      availByFix[a.fixture_id][a.player_id] = a.is_available;
    }
  }

  const alpha = config.difficulty_weight !== undefined && config.difficulty_weight !== null
    ? config.difficulty_weight : 1.0;
  const winCap = config.win_bonus_cap !== undefined && config.win_bonus_cap !== null
    ? config.win_bonus_cap : Infinity;
  const lossCap = config.loss_penalty_cap !== undefined && config.loss_penalty_cap !== null
    ? config.loss_penalty_cap : Infinity;
  const lossCredCap = config.loss_credit_cap !== undefined && config.loss_credit_cap !== null
    ? config.loss_credit_cap : Infinity;
  const maxScore = config.max_score !== undefined && config.max_score !== null
    ? config.max_score : 21;

  return players.results.map(p => {
    const entries = []; // newest-first list of {score, type, bonus}
    let wins = 0;
    let losses = 0;
    let pointsFor = 0;
    let pointsAgainst = 0;
    for (const f of fixtures.results) {
      const r = resultsByFix[f.id] && resultsByFix[f.id][p.id];
      if (r !== undefined) {
        // bonus = α × opp_diff, then:
        //   positive bonus on a WIN  capped at +winCap
        //   positive bonus on a LOSS capped at +lossCredCap (a loss should
        //                            not be made nearly as good as a win)
        //   negative bonus (any)     capped at -lossCap
        //   ceiling: wins can reach maxScore + winCap; losses capped at maxScore.
        //   floor: 0 in all cases.
        let bonus = 0;
        if (r.difficulty !== null && r.difficulty !== undefined) {
          const won = r.score > r.opp;
          bonus = alpha * r.difficulty;
          if (bonus > 0 && won && bonus > winCap) bonus = winCap;
          if (bonus > 0 && !won && bonus > lossCredCap) bonus = lossCredCap;
          if (bonus < 0 && bonus < -lossCap) bonus = -lossCap;
          const ceiling = won ? maxScore + winCap : maxScore;
          if (r.score + bonus > ceiling) bonus = ceiling - r.score;
          if (r.score + bonus < 0) bonus = -r.score;
        }
        entries.push({ raw_score: r.score, bonus, type: 'played', difficulty: r.difficulty });
        if (r.score > r.opp) wins++;
        else if (r.score < r.opp) losses++;
        pointsFor += r.score;
        pointsAgainst += r.opp;
      } else {
        const isAvail = availByFix[f.id] && availByFix[f.id][p.id];
        // Default to "away" if no availability record (player wasn't tracked for that match)
        if (isAvail) {
          entries.push({ raw_score: config.reserve_score, bonus: 0, type: 'reserve' });
        } else {
          entries.push({ raw_score: config.away_score, bonus: 0, type: 'away' });
        }
      }
    }

    const effectiveScores = entries.map(e => e.raw_score + e.bonus);
    const rating = calculateRating(effectiveScores, config);
    const window = Math.min(entries.length, config.rating_window);
    const recentEntries = entries.slice(0, window);
    const gamesPlayed = entries.filter(e => e.type === 'played').length;

    return {
      player_id: p.id,
      name: p.name,
      is_reserve: p.is_reserve,
      rating: Math.round(rating * 100) / 100,
      games_played: gamesPlayed,
      wins,
      losses,
      points_for: pointsFor,
      points_against: pointsAgainst,
      recent_scores: recentEntries.map(e => e.raw_score),
      recent_entries: recentEntries,
    };
  });
}

/**
 * Determine the dropped player after a completed match.
 * @param {D1Database} db
 * @param {number} fixtureId - the just-completed fixture
 * @param {object} config - season_config row
 * @param {Array} ratings - current ratings [{player_id, rating}]
 * @returns {Promise<object|null>} {player_id, name, margin, rating} or null if no one lost
 */
export async function determineDroppedPlayer(db, fixtureId, config, ratings) {
  if (!config.drop_enabled) return null;

  // Get results for this fixture — only losers
  const results = await db.prepare(`
    SELECT r.player_id, r.player_score, r.opponent_score, p.name
    FROM results r
    JOIN players p ON r.player_id = p.id
    WHERE r.fixture_id = ?
      AND r.player_score < r.opponent_score
    ORDER BY (r.opponent_score - r.player_score) DESC
  `).bind(fixtureId).all();

  if (results.results.length === 0) return null;

  const losers = results.results.map(r => ({
    player_id: r.player_id,
    name: r.name,
    margin: r.opponent_score - r.player_score,
    rating: (ratings.find(rt => rt.player_id === r.player_id) || {}).rating || 0,
  }));

  // Sort: largest margin first, then lowest rating first (tie-break)
  losers.sort((a, b) => {
    if (b.margin !== a.margin) return b.margin - a.margin;
    return a.rating - b.rating;
  });

  // Return the top drop_count players (usually 1)
  return losers.slice(0, config.drop_count);
}

/**
 * Find who is dropped for a given fixture (based on previous fixture's results).
 * @param {D1Database} db
 * @param {number} fixtureId - the upcoming fixture
 * @param {number} seasonId
 * @param {object} config
 * @param {Array} ratings
 * @returns {Promise<Array>} array of dropped player objects, or empty array
 */
export async function getDroppedForFixture(db, fixtureId, seasonId, config, ratings) {
  if (!config.drop_enabled) return [];

  // Find the previous completed fixture in this season
  const currentFixture = await db.prepare(
    'SELECT week_number FROM fixtures WHERE id = ?'
  ).bind(fixtureId).first();

  if (!currentFixture) return [];

  // Get the most recent completed fixture before this one
  const prevFixture = await db.prepare(`
    SELECT id FROM fixtures
    WHERE season_id = ? AND status = 'completed' AND week_number < ?
    ORDER BY week_number DESC LIMIT 1
  `).bind(seasonId, currentFixture.week_number).first();

  if (!prevFixture) return [];

  const dropped = await determineDroppedPlayer(db, prevFixture.id, config, ratings);
  return dropped || [];
}

/**
 * Run the full selection algorithm for a fixture.
 * @param {D1Database} db
 * @param {number} fixtureId
 * @param {number} seasonId
 * @param {object} config
 * @returns {Promise<object>} {selected, dropped, notSelected, shortHanded}
 */
export async function runSelection(db, fixtureId, seasonId, config) {
  // Get team_id from season
  const season = await db.prepare('SELECT team_id FROM seasons WHERE id = ?').bind(seasonId).first();
  const ratings = await getAllRatings(db, seasonId, season.team_id, config);

  // Get availability for this fixture
  const avail = await db.prepare(
    'SELECT player_id, is_available FROM availability WHERE fixture_id = ?'
  ).bind(fixtureId).all();

  const availableIds = new Set(
    avail.results.filter(a => a.is_available).map(a => a.player_id)
  );

  // Available cores are never excluded — they always play if available.
  // Reserves only fill in when there aren't enough cores available.
  const coreCandidates = ratings.filter(r => availableIds.has(r.player_id) && !r.is_reserve).sort((a, b) => b.rating - a.rating);
  const reserveCandidates = ratings.filter(r => availableIds.has(r.player_id) && r.is_reserve).sort((a, b) => b.rating - a.rating);

  const selected = [];
  for (const c of coreCandidates) {
    if (selected.length >= config.pick_count) break;
    selected.push(c);
  }
  for (const c of reserveCandidates) {
    if (selected.length >= config.pick_count) break;
    selected.push(c);
  }

  const selectedIds = new Set(selected.map(s => s.player_id));
  const notSelected = [...coreCandidates, ...reserveCandidates].filter(c => !selectedIds.has(c.player_id));

  // Drop rule is informational only — available cores are never excluded.
  const droppedInfo = [];

  return {
    selected,
    dropped: droppedInfo,
    notSelected,
    shortHanded: selected.length < config.pick_count,
  };
}
