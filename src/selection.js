// Selection engine — rating calculation, drop rule, team selection
// All logic is parameterised via season_config values.

/**
 * Calculate a player's current rating from their recent results.
 * @param {Array} results - player's results [{player_score, opponent_score}] ordered newest-first
 * @param {object} config - season_config row
 * @returns {number} rating
 */
export function calculateRating(results, config) {
  if (results.length === 0) return config.default_rating;
  const window = Math.min(results.length, config.rating_window);
  const recent = results.slice(0, window);
  const sum = recent.reduce((s, r) => s + r.player_score, 0);
  return sum / window;
}

/**
 * Calculate ratings for all players in a season.
 * @param {D1Database} db
 * @param {number} seasonId
 * @param {object} config - season_config row
 * @returns {Promise<Array>} [{player_id, name, is_reserve, rating, games_played, recent_scores}]
 */
export async function getAllRatings(db, seasonId, teamId, config) {
  // Get all active players for this team
  const players = await db.prepare(
    'SELECT id, name, is_reserve FROM players WHERE is_active = 1 AND team_id = ?'
  ).bind(teamId).all();

  // Get all results for this season, ordered newest-first
  const allResults = await db.prepare(`
    SELECT r.player_id, r.player_score, r.opponent_score
    FROM results r
    JOIN fixtures f ON r.fixture_id = f.id
    WHERE f.season_id = ? AND f.status = 'completed'
    ORDER BY f.match_date DESC
  `).bind(seasonId).all();

  // Group results by player
  const resultsByPlayer = {};
  for (const r of allResults.results) {
    if (!resultsByPlayer[r.player_id]) resultsByPlayer[r.player_id] = [];
    resultsByPlayer[r.player_id].push(r);
  }

  return players.results.map(p => {
    const playerResults = resultsByPlayer[p.id] || [];
    const rating = calculateRating(playerResults, config);
    const window = Math.min(playerResults.length, config.rating_window);
    const recentScores = playerResults.slice(0, window).map(r => r.player_score);
    return {
      player_id: p.id,
      name: p.name,
      is_reserve: p.is_reserve,
      rating: Math.round(rating * 100) / 100,
      games_played: playerResults.length,
      recent_scores: recentScores,
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

  // Determine dropped players from previous match
  const droppedPlayers = await getDroppedForFixture(db, fixtureId, seasonId, config, ratings);
  const droppedIds = new Set(droppedPlayers.map(d => d.player_id));

  // Build candidate pool: available AND not dropped
  const candidates = ratings
    .filter(r => availableIds.has(r.player_id) && !droppedIds.has(r.player_id))
    .sort((a, b) => b.rating - a.rating);

  const selected = candidates.slice(0, config.pick_count);
  const notSelected = candidates.slice(config.pick_count);

  // Dropped players info (only those who were available — consumed if unavailable)
  const droppedInfo = droppedPlayers.map(d => ({
    ...d,
    was_available: availableIds.has(d.player_id),
  }));

  return {
    selected,
    dropped: droppedInfo,
    notSelected,
    shortHanded: selected.length < config.pick_count,
  };
}
