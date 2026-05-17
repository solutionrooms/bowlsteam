import { getAllRatings, runSelection, determineDroppedPlayer } from './selection.js';
import { scrapeAll, scrapeFixtures, scrapeMatch, scrapeOpponentDifficulty } from './scraper.js';
import { recommendOrder } from './order.js';

// --- Auth helper: resolve club + role from PIN header ---
async function getClub(request, db) {
  const pin = request.headers.get('X-Club-Pin');
  if (!pin) return null;
  // Try captain PIN first (globally unique)
  let club = await db.prepare('SELECT * FROM clubs WHERE pin = ?').bind(pin).first();
  if (club) return { ...club, role: 'captain' };
  // Then try player PIN (could be same value across clubs in theory, but each club has its own)
  club = await db.prepare('SELECT * FROM clubs WHERE player_pin = ?').bind(pin).first();
  if (club) return { ...club, role: 'player' };
  return null;
}

export async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;
  const db = env.DB;

  try {

    // === PUBLIC: Auth endpoints (no PIN required) ===

    // Validate PIN and return club info + role
    if (path === '/api/auth' && method === 'POST') {
      const body = await request.json();
      const { pin } = body;
      if (!pin) return error('PIN required', 400);
      let club = await db.prepare('SELECT id, name FROM clubs WHERE pin = ?').bind(pin).first();
      let role = 'captain';
      if (!club) {
        club = await db.prepare('SELECT id, name FROM clubs WHERE player_pin = ?').bind(pin).first();
        role = 'player';
      }
      if (!club) return error('Invalid PIN', 401);
      return json({ id: club.id, name: club.name, needsName: !club.name, role });
    }

    // Set club name (first login)
    if (path === '/api/auth/set-name' && method === 'POST') {
      const body = await request.json();
      const { pin, name } = body;
      if (!pin || !name) return error('PIN and name required', 400);
      const club = await db.prepare('SELECT id, name FROM clubs WHERE pin = ?').bind(pin).first();
      if (!club) return error('Invalid PIN', 401);
      if (club.name) return error('Club name already set', 400);
      await db.prepare('UPDATE clubs SET name = ? WHERE id = ?').bind(name, club.id).run();
      return json({ id: club.id, name });
    }

    // === ADMIN: PIN management (protected by admin key) ===

    if (path === '/api/admin/pins') {
      const adminKey = env.ADMIN_KEY || 'bowlsteam-admin';
      const authHeader = request.headers.get('Authorization');
      if (authHeader !== 'Bearer ' + adminKey) return error('Unauthorized', 401);

      if (method === 'GET') {
        const rows = await db.prepare('SELECT id, pin, name, created_at FROM clubs ORDER BY id').all();
        return json(rows.results);
      }

      if (method === 'POST') {
        const body = await request.json();
        const pin = body.pin || generatePin();
        const existing = await db.prepare('SELECT id FROM clubs WHERE pin = ?').bind(pin).first();
        if (existing) return error('PIN already exists', 409);
        const res = await db.prepare('INSERT INTO clubs (pin) VALUES (?)').bind(pin).run();
        return json({ id: res.meta.last_row_id, pin }, 201);
      }
    }

    // === ALL OTHER ROUTES: require valid PIN ===

    const club = await getClub(request, db);
    if (!club) return error('PIN required', 401);
    const clubId = club.id;

    // Players are read-only — block all non-GET methods.
    if (club.role === 'player' && method !== 'GET') {
      return error('Read-only access (player PIN)', 403);
    }

    // --- Club info (rename, set player pin) ---
    if (path === '/api/club' && method === 'GET') {
      return json({ id: club.id, name: club.name, player_pin: club.player_pin || null });
    }

    if (path === '/api/club' && method === 'PUT') {
      const body = await request.json();
      const sets = [];
      const vals = [];
      if (body.name !== undefined) { sets.push('name = ?'); vals.push(body.name); }
      if (body.player_pin !== undefined) { sets.push('player_pin = ?'); vals.push(body.player_pin || null); }
      if (sets.length === 0) return error('No valid fields', 400);
      vals.push(clubId);
      await db.prepare(`UPDATE clubs SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
      const updated = await db.prepare('SELECT id, name, player_pin FROM clubs WHERE id = ?').bind(clubId).first();
      return json(updated);
    }

    // --- Teams (scoped to club) ---
    if (path === '/api/teams' && method === 'GET') {
      const rows = await db.prepare('SELECT * FROM teams WHERE club_id = ? ORDER BY id DESC').bind(clubId).all();
      return json(rows.results);
    }

    if (path === '/api/teams' && method === 'POST') {
      const body = await request.json();
      const { name, league_name, website_url } = body;
      if (!name || !league_name) return error('name and league_name required', 400);
      const res = await db.prepare(
        'INSERT INTO teams (club_id, name, league_name, website_url) VALUES (?, ?, ?, ?)'
      ).bind(clubId, name, league_name, website_url || null).run();
      return json({ id: res.meta.last_row_id }, 201);
    }

    const teamMatch = path.match(/^\/api\/teams\/(\d+)$/);
    if (teamMatch && method === 'PUT') {
      const teamId = parseInt(teamMatch[1]);
      // Verify team belongs to club
      const team = await db.prepare('SELECT id FROM teams WHERE id = ? AND club_id = ?').bind(teamId, clubId).first();
      if (!team) return error('Team not found', 404);
      const body = await request.json();
      const sets = [];
      const vals = [];
      if (body.name !== undefined) { sets.push('name = ?'); vals.push(body.name); }
      if (body.league_name !== undefined) { sets.push('league_name = ?'); vals.push(body.league_name); }
      if (body.website_url !== undefined) { sets.push('website_url = ?'); vals.push(body.website_url); }
      if (sets.length === 0) return error('No valid fields', 400);
      vals.push(teamId);
      await db.prepare(`UPDATE teams SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
      const updated = await db.prepare('SELECT * FROM teams WHERE id = ?').bind(teamId).first();
      return json(updated);
    }

    // --- Scrape team page ---
    const scrapePathMatch = path.match(/^\/api\/teams\/(\d+)\/scrape$/);
    if (scrapePathMatch && method === 'POST') {
      const teamId = parseInt(scrapePathMatch[1]);
      const team = await db.prepare('SELECT * FROM teams WHERE id = ? AND club_id = ?').bind(teamId, clubId).first();
      if (!team) return error('Team not found', 404);
      if (!team.website_url) return error('No website URL configured for this team', 400);

      const body = await request.json().catch(() => ({}));
      const year = body.year || new Date().getFullYear();

      const data = await scrapeAll(team.website_url, year);
      return json(data);
    }

    // --- Setup: create season + import fixtures + import players ---
    const setupMatch = path.match(/^\/api\/teams\/(\d+)\/setup$/);
    if (setupMatch && method === 'POST') {
      const teamId = parseInt(setupMatch[1]);
      const team = await db.prepare('SELECT * FROM teams WHERE id = ? AND club_id = ?').bind(teamId, clubId).first();
      if (!team) return error('Team not found', 404);

      const body = await request.json();
      const { year, division, selection_method, players, fixtures } = body;
      if (!year || !division) return error('year and division required', 400);

      const seasonRes = await db.prepare(
        'INSERT INTO seasons (team_id, year, division, is_current, selection_method) VALUES (?, ?, ?, 1, ?)'
      ).bind(teamId, year, division, selection_method || 'form_based').run();
      const seasonId = seasonRes.meta.last_row_id;

      await db.prepare(
        'UPDATE seasons SET is_current = 0 WHERE id != ? AND team_id = ?'
      ).bind(seasonId, teamId).run();

      await db.prepare(
        'INSERT INTO season_config (season_id) VALUES (?)'
      ).bind(seasonId).run();

      if (players && players.length > 0) {
        for (const p of players) {
          if (p.role === 'skip') continue;
          await db.prepare(`
            INSERT INTO players (team_id, name, is_reserve, is_active)
            VALUES (?, ?, ?, 1)
            ON CONFLICT(team_id, name) DO UPDATE SET is_reserve = excluded.is_reserve, is_active = 1
          `).bind(teamId, p.name, p.role === 'reserve' ? 1 : 0).run();
        }
      }

      if (fixtures && fixtures.length > 0) {
        for (let i = 0; i < fixtures.length; i++) {
          const f = fixtures[i];
          await db.prepare(
            'INSERT INTO fixtures (season_id, week_number, match_date, opponent, venue) VALUES (?, ?, ?, ?, ?)'
          ).bind(seasonId, i + 1, f.match_date, f.opponent, f.venue).run();
        }
        const dates = fixtures.map(f => f.match_date).sort();
        await db.prepare(
          'UPDATE seasons SET start_date = ?, end_date = ? WHERE id = ?'
        ).bind(dates[0], dates[dates.length - 1], seasonId).run();
      }

      return json({ season_id: seasonId }, 201);
    }

    // --- Seasons (scoped via team → club) ---
    if (path === '/api/seasons' && method === 'GET') {
      const teamId = url.searchParams.get('team_id');
      let query = `SELECT s.*, t.name as team_name, t.league_name FROM seasons s
        JOIN teams t ON s.team_id = t.id WHERE t.club_id = ?`;
      const params = [clubId];
      if (teamId) {
        query += ' AND s.team_id = ?';
        params.push(parseInt(teamId));
      }
      query += ' ORDER BY s.year DESC';
      const rows = await db.prepare(query).bind(...params).all();
      return json(rows.results);
    }

    if (path === '/api/seasons' && method === 'POST') {
      const body = await request.json();
      const { team_id, year, division, selection_method } = body;
      if (!team_id || !year || !division) return error('team_id, year and division required', 400);
      // Verify team belongs to club
      const team = await db.prepare('SELECT id FROM teams WHERE id = ? AND club_id = ?').bind(team_id, clubId).first();
      if (!team) return error('Team not found', 404);

      const res = await db.prepare(
        'INSERT INTO seasons (team_id, year, division, is_current, selection_method) VALUES (?, ?, ?, 1, ?)'
      ).bind(team_id, year, division, selection_method || 'form_based').run();

      await db.prepare(
        'UPDATE seasons SET is_current = 0 WHERE id != ? AND team_id = ?'
      ).bind(res.meta.last_row_id, team_id).run();

      await db.prepare(
        'INSERT INTO season_config (season_id) VALUES (?)'
      ).bind(res.meta.last_row_id).run();

      return json({ id: res.meta.last_row_id }, 201);
    }

    // --- Set Current Season ---
    const currentMatch = path.match(/^\/api\/seasons\/(\d+)\/set-current$/);
    if (currentMatch && method === 'POST') {
      const seasonId = parseInt(currentMatch[1]);
      const season = await db.prepare(
        'SELECT s.team_id FROM seasons s JOIN teams t ON s.team_id = t.id WHERE s.id = ? AND t.club_id = ?'
      ).bind(seasonId, clubId).first();
      if (!season) return error('Season not found', 404);
      await db.prepare('UPDATE seasons SET is_current = 0 WHERE team_id = ?').bind(season.team_id).run();
      await db.prepare('UPDATE seasons SET is_current = 1 WHERE id = ?').bind(seasonId).run();
      return json({ ok: true });
    }

    // --- Season Config ---
    const configMatch = path.match(/^\/api\/seasons\/(\d+)\/config$/);
    if (configMatch) {
      const seasonId = parseInt(configMatch[1]);
      // Verify ownership
      const owns = await db.prepare(
        'SELECT s.id FROM seasons s JOIN teams t ON s.team_id = t.id WHERE s.id = ? AND t.club_id = ?'
      ).bind(seasonId, clubId).first();
      if (!owns) return error('Season not found', 404);

      if (method === 'GET') {
        const config = await db.prepare(
          'SELECT * FROM season_config WHERE season_id = ?'
        ).bind(seasonId).first();
        if (!config) return error('Config not found', 404);
        return json(config);
      }

      if (method === 'PUT') {
        const body = await request.json();
        const fields = ['squad_size', 'reserve_count', 'pick_count', 'max_score',
          'rating_window', 'default_rating', 'reserve_score', 'away_score',
          'drop_enabled', 'drop_count', 'drop_duration', 'drop_carry_over',
          'difficulty_weight', 'win_bonus_cap', 'loss_penalty_cap'];
        const sets = [];
        const vals = [];
        for (const f of fields) {
          if (body[f] !== undefined) {
            sets.push(`${f} = ?`);
            vals.push(body[f]);
          }
        }
        if (sets.length === 0) return error('No valid fields to update', 400);
        vals.push(seasonId);
        await db.prepare(
          `UPDATE season_config SET ${sets.join(', ')} WHERE season_id = ?`
        ).bind(...vals).run();
        const updated = await db.prepare(
          'SELECT * FROM season_config WHERE season_id = ?'
        ).bind(seasonId).first();
        return json(updated);
      }
    }

    // --- Fixture Import ---
    const importMatch = path.match(/^\/api\/seasons\/(\d+)\/import-fixtures$/);
    if (importMatch && method === 'POST') {
      const seasonId = parseInt(importMatch[1]);
      const season = await db.prepare(
        'SELECT s.*, t.website_url FROM seasons s JOIN teams t ON s.team_id = t.id WHERE s.id = ? AND t.club_id = ?'
      ).bind(seasonId, clubId).first();
      if (!season) return error('Season not found', 404);
      if (!season.website_url) return error('No website URL on team', 400);

      const fixtures = await scrapeFixtures(season.website_url, season.year);
      if (fixtures.length === 0) return error('No fixtures found on website', 404);

      let inserted = 0;
      let updated = 0;
      for (let i = 0; i < fixtures.length; i++) {
        const f = fixtures[i];
        const weekNum = i + 1;
        const existing = await db.prepare(
          'SELECT id FROM fixtures WHERE season_id = ? AND match_date = ? AND opponent = ?'
        ).bind(seasonId, f.match_date, f.opponent).first();

        if (existing) {
          await db.prepare(
            'UPDATE fixtures SET venue = ?, week_number = ? WHERE id = ?'
          ).bind(f.venue, weekNum, existing.id).run();
          updated++;
        } else {
          await db.prepare(
            'INSERT INTO fixtures (season_id, week_number, match_date, opponent, venue) VALUES (?, ?, ?, ?, ?)'
          ).bind(seasonId, weekNum, f.match_date, f.opponent, f.venue).run();
          inserted++;
        }
      }

      if (fixtures.length > 0) {
        const dates = fixtures.map(f => f.match_date).sort();
        await db.prepare(
          'UPDATE seasons SET start_date = ?, end_date = ? WHERE id = ?'
        ).bind(dates[0], dates[dates.length - 1], seasonId).run();
      }

      return json({ imported: inserted, updated, total: fixtures.length });
    }

    // --- Fixtures ---
    if (path === '/api/fixtures' && method === 'GET') {
      const seasonId = url.searchParams.get('season_id');
      if (!seasonId) return error('season_id required', 400);
      // Verify ownership
      const owns = await db.prepare(
        'SELECT s.id FROM seasons s JOIN teams t ON s.team_id = t.id WHERE s.id = ? AND t.club_id = ?'
      ).bind(parseInt(seasonId), clubId).first();
      if (!owns) return json([]);
      const rows = await db.prepare(`
        SELECT f.*,
          COUNT(CASE WHEN r.player_score > r.opponent_score THEN 1 END) as wins,
          COUNT(CASE WHEN r.player_score < r.opponent_score THEN 1 END) as losses,
          COALESCE(SUM(r.player_score), 0) as points_for,
          COALESCE(SUM(r.opponent_score), 0) as points_against
        FROM fixtures f
        LEFT JOIN results r ON r.fixture_id = f.id
        WHERE f.season_id = ?
        GROUP BY f.id
        ORDER BY f.week_number ASC
      `).bind(parseInt(seasonId)).all();
      return json(rows.results);
    }

    const fixtureDetailMatch = path.match(/^\/api\/fixtures\/(\d+)$/);
    if (fixtureDetailMatch) {
      const fixtureId = parseInt(fixtureDetailMatch[1]);

      if (method === 'GET') {
        const fixture = await db.prepare('SELECT * FROM fixtures WHERE id = ?').bind(fixtureId).first();
        if (!fixture) return error('Fixture not found', 404);

        // Verify ownership
        const season = await db.prepare(
          'SELECT s.team_id FROM seasons s JOIN teams t ON s.team_id = t.id WHERE s.id = ? AND t.club_id = ?'
        ).bind(fixture.season_id, clubId).first();
        if (!season) return error('Fixture not found', 404);

        const avail = await db.prepare(
          'SELECT a.*, p.name FROM availability a JOIN players p ON a.player_id = p.id WHERE a.fixture_id = ?'
        ).bind(fixtureId).all();

        const sel = await db.prepare(
          'SELECT s.*, p.name, p.is_reserve FROM selections s JOIN players p ON s.player_id = p.id WHERE s.fixture_id = ? ORDER BY s.rating_at_selection DESC'
        ).bind(fixtureId).all();

        const res = await db.prepare(
          'SELECT r.*, p.name FROM results r JOIN players p ON r.player_id = p.id WHERE r.fixture_id = ?'
        ).bind(fixtureId).all();

        return json({
          ...fixture,
          team_id: season ? season.team_id : null,
          availability: avail.results,
          selections: sel.results,
          results: res.results,
        });
      }

      if (method === 'PUT') {
        const body = await request.json();
        if (body.status) {
          await db.prepare('UPDATE fixtures SET status = ? WHERE id = ?')
            .bind(body.status, fixtureId).run();
        }
        const updated = await db.prepare('SELECT * FROM fixtures WHERE id = ?').bind(fixtureId).first();
        return json(updated);
      }
    }

    // --- Players ---
    if (path === '/api/players' && method === 'GET') {
      const teamId = url.searchParams.get('team_id');
      if (!teamId) return error('team_id required', 400);
      // Verify team belongs to club
      const team = await db.prepare('SELECT id FROM teams WHERE id = ? AND club_id = ?').bind(parseInt(teamId), clubId).first();
      if (!team) return json([]);
      const rows = await db.prepare(
        'SELECT * FROM players WHERE is_active = 1 AND team_id = ? ORDER BY is_reserve ASC, name ASC'
      ).bind(parseInt(teamId)).all();
      return json(rows.results);
    }

    if (path === '/api/players' && method === 'POST') {
      const body = await request.json();
      if (!body.name || !body.team_id) return error('name and team_id required', 400);
      // Verify team belongs to club
      const team = await db.prepare('SELECT id FROM teams WHERE id = ? AND club_id = ?').bind(body.team_id, clubId).first();
      if (!team) return error('Team not found', 404);
      const isReserve = body.is_reserve ? 1 : 0;
      const res = await db.prepare(
        'INSERT INTO players (team_id, name, is_reserve) VALUES (?, ?, ?)'
      ).bind(body.team_id, body.name, isReserve).run();
      return json({ id: res.meta.last_row_id, name: body.name, is_reserve: isReserve }, 201);
    }

    const playerMatch = path.match(/^\/api\/players\/(\d+)$/);
    if (playerMatch) {
      const playerId = parseInt(playerMatch[1]);

      if (method === 'PUT') {
        const body = await request.json();
        const sets = [];
        const vals = [];
        if (body.name !== undefined) { sets.push('name = ?'); vals.push(body.name); }
        if (body.is_reserve !== undefined) { sets.push('is_reserve = ?'); vals.push(body.is_reserve ? 1 : 0); }
        if (body.is_active !== undefined) { sets.push('is_active = ?'); vals.push(body.is_active ? 1 : 0); }
        if (sets.length === 0) return error('No valid fields', 400);
        vals.push(playerId);
        await db.prepare(`UPDATE players SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
        const updated = await db.prepare('SELECT * FROM players WHERE id = ?').bind(playerId).first();
        return json(updated);
      }

      if (method === 'DELETE') {
        await db.prepare('UPDATE players SET is_active = 0 WHERE id = ?').bind(playerId).run();
        return json({ ok: true });
      }
    }

    // --- Availability ---
    const availMatch = path.match(/^\/api\/fixtures\/(\d+)\/availability$/);
    if (availMatch && method === 'PUT') {
      const fixtureId = parseInt(availMatch[1]);
      const body = await request.json();
      if (!body.players || !Array.isArray(body.players)) {
        return error('players array required', 400);
      }
      for (const p of body.players) {
        await db.prepare(`
          INSERT INTO availability (fixture_id, player_id, is_available)
          VALUES (?, ?, ?)
          ON CONFLICT(fixture_id, player_id) DO UPDATE SET is_available = excluded.is_available
        `).bind(fixtureId, p.player_id, p.is_available ? 1 : 0).run();
      }
      const avail = await db.prepare(
        'SELECT a.*, p.name FROM availability a JOIN players p ON a.player_id = p.id WHERE a.fixture_id = ?'
      ).bind(fixtureId).all();
      return json(avail.results);
    }

    // --- Selection ---
    const selectMatch = path.match(/^\/api\/fixtures\/(\d+)\/select$/);
    if (selectMatch && method === 'POST') {
      const fixtureId = parseInt(selectMatch[1]);
      const fixture = await db.prepare('SELECT * FROM fixtures WHERE id = ?').bind(fixtureId).first();
      if (!fixture) return error('Fixture not found', 404);

      const config = await db.prepare(
        'SELECT * FROM season_config WHERE season_id = ?'
      ).bind(fixture.season_id).first();
      if (!config) return error('Season config not found', 404);

      const result = await runSelection(db, fixtureId, fixture.season_id, config);

      await db.prepare('DELETE FROM selections WHERE fixture_id = ?').bind(fixtureId).run();

      for (const p of result.selected) {
        await db.prepare(`
          INSERT INTO selections (fixture_id, player_id, is_selected, is_dropped, rating_at_selection)
          VALUES (?, ?, 1, 0, ?)
        `).bind(fixtureId, p.player_id, p.rating).run();
      }

      for (const d of result.dropped) {
        if (d.was_available) {
          await db.prepare(`
            INSERT INTO selections (fixture_id, player_id, is_selected, is_dropped, rating_at_selection)
            VALUES (?, ?, 0, 1, ?)
          `).bind(fixtureId, d.player_id, d.rating).run();
        }
      }

      for (const p of result.notSelected) {
        await db.prepare(`
          INSERT INTO selections (fixture_id, player_id, is_selected, is_dropped, rating_at_selection)
          VALUES (?, ?, 0, 0, ?)
        `).bind(fixtureId, p.player_id, p.rating).run();
      }

      return json(result);
    }

    const selectionGetMatch = path.match(/^\/api\/fixtures\/(\d+)\/selection$/);
    if (selectionGetMatch && method === 'GET') {
      const fixtureId = parseInt(selectionGetMatch[1]);
      const sel = await db.prepare(`
        SELECT s.*, p.name, p.is_reserve
        FROM selections s JOIN players p ON s.player_id = p.id
        WHERE s.fixture_id = ?
        ORDER BY s.is_selected DESC, s.rating_at_selection DESC
      `).bind(fixtureId).all();
      return json(sel.results);
    }

    // --- Player-order recommender (captain-only; player_order.prd §6, §7.2) ---
    const orderMatch = path.match(/^\/api\/fixtures\/(\d+)\/order$/);
    if (orderMatch && method === 'GET') {
      // Tactical opponent intelligence — never expose to the read-only player
      // PIN. Enforced here on the server, not just hidden in the UI (§6.5).
      if (club.role !== 'captain') return error('Captain access required', 403);
      const fixtureId = parseInt(orderMatch[1]);

      const fix = await db.prepare(`
        SELECT f.id, f.opponent, f.venue, s.team_id, t.name AS team_name
        FROM fixtures f
        JOIN seasons s ON f.season_id = s.id
        JOIN teams t ON s.team_id = t.id
        WHERE f.id = ? AND t.club_id = ?
      `).bind(fixtureId, clubId).first();
      if (!fix) return error('Fixture not found', 404);

      const sel = await db.prepare(`
        SELECT p.name FROM selections s JOIN players p ON s.player_id = p.id
        WHERE s.fixture_id = ? AND s.is_selected = 1
      `).bind(fixtureId).all();
      if (!sel.results.length) {
        return error('Run selection first — no selected players for this fixture', 400);
      }

      // Our full active roster — excluded from the opponent habit so a
      // player who changed clubs isn't suggested as his own opponent.
      const roster = await db.prepare(
        'SELECT name FROM players WHERE team_id = ? AND is_active = 1'
      ).bind(fix.team_id).all();

      let lg;
      try {
        lg = await db.prepare(`
          SELECT season_year, match_date, division, home_team, away_team, board,
                 home_player, home_score, away_player, away_score, match_url
          FROM league_games
        `).all();
      } catch (e) {
        return error('Order data not loaded. Run `npm run ingest` then `npm run load`.', 503);
      }
      if (!lg.results.length) {
        return error('Order data empty. Run `npm run ingest` then `npm run load`.', 503);
      }

      const rec = recommendOrder({
        games: lg.results,
        ourTeam: fix.team_name,
        selected: sel.results.map(r => r.name),
        ourPlayers: roster.results.map(r => r.name),
        opponentTeam: fix.opponent,
        venue: fix.venue,
      });
      return json({ fixture_id: fixtureId, opponent: fix.opponent, venue: fix.venue, ...rec });
    }

    // --- Import results preview from cgleague match URL ---
    const importResultsMatch = path.match(/^\/api\/fixtures\/(\d+)\/import-results-preview$/);
    if (importResultsMatch && method === 'POST') {
      const fixtureId = parseInt(importResultsMatch[1]);
      const body = await request.json();
      const matchUrl = body.url;
      if (!matchUrl) return error('url required', 400);

      // Verify fixture ownership and get team name
      const fix = await db.prepare(
        `SELECT f.*, t.name as team_name FROM fixtures f
         JOIN seasons s ON f.season_id = s.id
         JOIN teams t ON s.team_id = t.id
         WHERE f.id = ? AND t.club_id = ?`
      ).bind(fixtureId, clubId).first();
      if (!fix) return error('Fixture not found', 404);

      const scraped = await scrapeMatch(matchUrl, fix.team_name);
      if (!scraped.venue) {
        return error('Could not match team name "' + fix.team_name + '" against home (' + (scraped.homeTeam || '?') + ') or away (' + (scraped.awayTeam || '?') + ')', 400);
      }

      // Match scraped names to active players for this team
      const players = await db.prepare(
        'SELECT id, name FROM players WHERE team_id = ? AND is_active = 1'
      ).bind(fix.team_id || (await db.prepare('SELECT team_id FROM seasons WHERE id = ?').bind(fix.season_id).first()).team_id).all();

      const byName = {};
      for (const p of players.results) byName[p.name.toLowerCase()] = p.id;

      const rows = scraped.rows.map(r => ({
        name: r.name,
        player_id: byName[r.name.toLowerCase()] || null,
        our_score: r.our_score,
        opp_score: r.opp_score,
        opponent_name: r.opponent_name || null,
        opponent_url: r.opponent_url || null,
      }));

      // Save the match URL on the fixture so we can recompute later without re-prompting.
      await db.prepare('UPDATE fixtures SET match_url = ? WHERE id = ?').bind(matchUrl, fixtureId).run();

      return json({ venue: scraped.venue, rows });
    }

    // --- Results ---
    const resultsMatch = path.match(/^\/api\/fixtures\/(\d+)\/results$/);
    if (resultsMatch) {
      const fixtureId = parseInt(resultsMatch[1]);

      if (method === 'POST') {
        const body = await request.json();
        if (!body.results || !Array.isArray(body.results)) {
          return error('results array required', 400);
        }

        const fixture = await db.prepare('SELECT season_id FROM fixtures WHERE id = ?').bind(fixtureId).first();
        const config = fixture ? await db.prepare(
          'SELECT max_score FROM season_config WHERE season_id = ?'
        ).bind(fixture.season_id).first() : null;
        const maxScore = config ? config.max_score : 21;

        for (const r of body.results) {
          if (r.player_score < 0 || r.player_score > maxScore ||
              r.opponent_score < 0 || r.opponent_score > maxScore) {
            return error(`Scores must be between 0 and ${maxScore}`, 400);
          }
          await db.prepare(`
            INSERT INTO results (fixture_id, player_id, player_score, opponent_score, opponent_name, opponent_url)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(fixture_id, player_id) DO UPDATE
            SET player_score = excluded.player_score,
                opponent_score = excluded.opponent_score,
                opponent_name = COALESCE(excluded.opponent_name, results.opponent_name),
                opponent_url = COALESCE(excluded.opponent_url, results.opponent_url),
                opponent_difficulty = CASE
                  WHEN excluded.opponent_url IS NOT NULL AND excluded.opponent_url != results.opponent_url
                  THEN NULL ELSE results.opponent_difficulty END
          `).bind(fixtureId, r.player_id, r.player_score, r.opponent_score, r.opponent_name || null, r.opponent_url || null).run();
        }

        await db.prepare(
          "UPDATE fixtures SET status = 'completed' WHERE id = ?"
        ).bind(fixtureId).run();

        return json({ ok: true, count: body.results.length });
      }

      if (method === 'GET') {
        const rows = await db.prepare(`
          SELECT r.*, p.name FROM results r
          JOIN players p ON r.player_id = p.id
          WHERE r.fixture_id = ?
        `).bind(fixtureId).all();
        return json(rows.results);
      }
    }

    // --- Compute opponent difficulty ---
    // POST /api/seasons/:id/compute-difficulty
    // Two-phase backfill:
    //  1. For completed fixtures with a stored match_url but no opponent_name on their results,
    //     re-scrape the match page to fill in opponent_name/url.
    //  2. For all results with opponent_url, scrape opponent player.php and store opponent_difficulty.
    // If force=true in body, recompute even when opponent_difficulty is already set.
    const computeDiffMatch = path.match(/^\/api\/seasons\/(\d+)\/compute-difficulty$/);
    if (computeDiffMatch && method === 'POST') {
      const seasonId = parseInt(computeDiffMatch[1]);
      const owns = await db.prepare(
        'SELECT s.id, s.team_id, s.year, t.name as team_name FROM seasons s JOIN teams t ON s.team_id = t.id WHERE s.id = ? AND t.club_id = ?'
      ).bind(seasonId, clubId).first();
      if (!owns) return error('Season not found', 404);

      const body = await request.json().catch(() => ({}));
      const force = !!body.force;

      // Phase 1: re-scrape matches that have a URL but missing opponent_name on results
      const fixturesNeedingScrape = await db.prepare(`
        SELECT f.id, f.match_url, f.match_date
        FROM fixtures f
        WHERE f.season_id = ? AND f.status = 'completed' AND f.match_url IS NOT NULL
          AND EXISTS (SELECT 1 FROM results r WHERE r.fixture_id = f.id AND r.opponent_name IS NULL)
      `).bind(seasonId).all();

      const scrapeFailures = [];
      for (const fix of fixturesNeedingScrape.results) {
        try {
          const scraped = await scrapeMatch(fix.match_url, owns.team_name);
          if (!scraped.venue) {
            scrapeFailures.push({ fixture_id: fix.id, reason: 'team name mismatch' });
            continue;
          }
          // Match scraped players to our results by name
          const ourResults = await db.prepare(
            'SELECT r.id, p.name FROM results r JOIN players p ON r.player_id = p.id WHERE r.fixture_id = ?'
          ).bind(fix.id).all();
          const byName = {};
          for (const r of ourResults.results) byName[r.name.toLowerCase()] = r.id;
          for (const row of scraped.rows) {
            const resultId = byName[row.name.toLowerCase()];
            if (!resultId) continue;
            await db.prepare(
              'UPDATE results SET opponent_name = ?, opponent_url = ?, opponent_difficulty = NULL WHERE id = ?'
            ).bind(row.opponent_name || null, row.opponent_url || null, resultId).run();
          }
        } catch (e) {
          scrapeFailures.push({ fixture_id: fix.id, reason: e.message });
        }
      }

      // Phase 2: compute difficulty for any results with opponent_url that lack a stored difficulty
      const sql = force
        ? `SELECT r.id, r.opponent_url, f.match_date
           FROM results r JOIN fixtures f ON r.fixture_id = f.id
           WHERE f.season_id = ? AND r.opponent_url IS NOT NULL`
        : `SELECT r.id, r.opponent_url, f.match_date
           FROM results r JOIN fixtures f ON r.fixture_id = f.id
           WHERE f.season_id = ? AND r.opponent_url IS NOT NULL AND r.opponent_difficulty IS NULL`;
      const toCompute = await db.prepare(sql).bind(seasonId).all();

      let computed = 0;
      let priorless = 0;
      const fetchFailures = [];
      for (const r of toCompute.results) {
        try {
          const diff = await scrapeOpponentDifficulty(r.opponent_url, r.match_date, owns.year);
          if (diff === null) {
            // No prior games — store 0 so we don't keep re-fetching, but count separately.
            await db.prepare('UPDATE results SET opponent_difficulty = 0 WHERE id = ?').bind(r.id).run();
            priorless++;
          } else {
            await db.prepare('UPDATE results SET opponent_difficulty = ? WHERE id = ?').bind(diff.avg, r.id).run();
            computed++;
          }
        } catch (e) {
          fetchFailures.push({ result_id: r.id, reason: e.message });
        }
      }

      // Report fixtures still missing data
      const stillMissing = await db.prepare(`
        SELECT f.id, f.week_number, f.opponent, f.match_date, f.match_url
        FROM fixtures f
        WHERE f.season_id = ? AND f.status = 'completed'
          AND (f.match_url IS NULL OR EXISTS (
            SELECT 1 FROM results r WHERE r.fixture_id = f.id AND r.opponent_url IS NULL
          ))
        ORDER BY f.week_number
      `).bind(seasonId).all();

      return json({
        scraped_fixtures: fixturesNeedingScrape.results.length,
        computed,
        priorless,
        scrape_failures: scrapeFailures,
        fetch_failures: fetchFailures,
        fixtures_missing_url: stillMissing.results,
      });
    }

    // --- Ratings ---
    if (path === '/api/ratings' && method === 'GET') {
      const seasonId = url.searchParams.get('season_id');
      let sid = seasonId ? parseInt(seasonId) : null;
      if (!sid) {
        const current = await db.prepare(
          'SELECT s.id FROM seasons s JOIN teams t ON s.team_id = t.id WHERE s.is_current = 1 AND t.club_id = ?'
        ).bind(clubId).first();
        if (!current) return json([]);
        sid = current.id;
      }
      const config = await db.prepare('SELECT * FROM season_config WHERE season_id = ?').bind(sid).first();
      if (!config) return json([]);

      const season = await db.prepare('SELECT team_id FROM seasons WHERE id = ?').bind(sid).first();
      const ratings = await getAllRatings(db, sid, season.team_id, config);
      ratings.sort((a, b) => b.rating - a.rating);
      return json(ratings);
    }

    // --- Player Timeline (per-fixture info) ---
    const timelineMatch = path.match(/^\/api\/players\/(\d+)\/timeline$/);
    if (timelineMatch && method === 'GET') {
      const playerId = parseInt(timelineMatch[1]);
      const seasonId = parseInt(url.searchParams.get('season_id') || '0');
      if (!seasonId) return error('season_id required', 400);

      const owns = await db.prepare(
        'SELECT s.id FROM seasons s JOIN teams t ON s.team_id = t.id WHERE s.id = ? AND t.club_id = ?'
      ).bind(seasonId, clubId).first();
      if (!owns) return error('Season not found', 404);

      const config = await db.prepare('SELECT * FROM season_config WHERE season_id = ?').bind(seasonId).first();
      if (!config) return error('Config not found', 404);

      const fixtures = await db.prepare(`
        SELECT id, week_number, match_date, opponent, venue, status
        FROM fixtures WHERE season_id = ?
        ORDER BY match_date ASC
      `).bind(seasonId).all();

      const pResults = await db.prepare(
        'SELECT fixture_id, player_score, opponent_score, opponent_name, opponent_url, opponent_difficulty FROM results WHERE player_id = ?'
      ).bind(playerId).all();
      const resultsByFix = {};
      for (const r of pResults.results) resultsByFix[r.fixture_id] = r;
      const alpha = config.difficulty_weight !== undefined && config.difficulty_weight !== null
        ? config.difficulty_weight : 1.0;
      const winCap = config.win_bonus_cap !== undefined && config.win_bonus_cap !== null
        ? config.win_bonus_cap : Infinity;
      const lossCap = config.loss_penalty_cap !== undefined && config.loss_penalty_cap !== null
        ? config.loss_penalty_cap : Infinity;
      const maxScore = config.max_score !== undefined && config.max_score !== null
        ? config.max_score : 21;

      const pAvail = await db.prepare(
        'SELECT fixture_id, is_available FROM availability WHERE player_id = ?'
      ).bind(playerId).all();
      const availByFix = {};
      for (const a of pAvail.results) availByFix[a.fixture_id] = a.is_available;

      const pSel = await db.prepare(
        'SELECT fixture_id, is_selected, is_dropped, rating_at_selection FROM selections WHERE player_id = ?'
      ).bind(playerId).all();
      const selByFix = {};
      for (const s of pSel.results) selByFix[s.fixture_id] = s;

      const entries = [];
      const timeline = [];

      for (const f of fixtures.results) {
        let entryType = null;
        let rawScore = null;
        let bonus = 0;
        let opponentName = null;
        let opponentDifficulty = null;
        let result = null;

        if (f.status === 'completed') {
          const r = resultsByFix[f.id];
          if (r) {
            entryType = 'played';
            rawScore = r.player_score;
            opponentName = r.opponent_name || null;
            opponentDifficulty = r.opponent_difficulty;
            // Asymmetric + capped (matches selection.js).
            if (opponentDifficulty !== null && opponentDifficulty !== undefined) {
              const won = r.player_score > r.opponent_score;
              bonus = alpha * opponentDifficulty;
              if (bonus > 0 && won && bonus > winCap) bonus = winCap;
              if (bonus < 0 && bonus < -lossCap) bonus = -lossCap;
              const ceiling = won ? maxScore + winCap : maxScore;
              if (r.player_score + bonus > ceiling) bonus = ceiling - r.player_score;
              if (r.player_score + bonus < 0) bonus = -r.player_score;
            }
            result = { player_score: r.player_score, opp_score: r.opponent_score };
          } else {
            const isAvail = availByFix[f.id];
            if (isAvail) {
              entryType = 'reserve';
              rawScore = config.reserve_score;
            } else {
              entryType = 'away';
              rawScore = config.away_score;
            }
          }
          entries.push(rawScore + bonus);
        }

        let ratingAfter = null;
        if (entries.length > 0) {
          const recent = entries.slice(-config.rating_window);
          ratingAfter = recent.reduce((s, v) => s + v, 0) / recent.length;
        }

        const sel = selByFix[f.id];
        timeline.push({
          fixture_id: f.id,
          week_number: f.week_number,
          match_date: f.match_date,
          opponent: f.opponent,
          venue: f.venue,
          status: f.status,
          was_available: availByFix[f.id] !== undefined ? !!availByFix[f.id] : null,
          was_selected: sel ? !!sel.is_selected : null,
          entry_type: entryType,
          entry_score: rawScore,
          opponent_name: opponentName,
          opponent_difficulty: opponentDifficulty,
          difficulty_bonus: (opponentDifficulty === null || opponentDifficulty === undefined)
            ? null
            : Math.round(bonus * 100) / 100,
          effective_score: rawScore !== null ? Math.round((rawScore + bonus) * 100) / 100 : null,
          result,
          rating_after: ratingAfter !== null ? Math.round(ratingAfter * 100) / 100 : null,
          recent_scores: entries.slice(-config.rating_window),
        });
      }

      return json(timeline);
    }

    // --- Player History ---
    const historyMatch = path.match(/^\/api\/players\/(\d+)\/history$/);
    if (historyMatch && method === 'GET') {
      const playerId = parseInt(historyMatch[1]);
      const seasonId = url.searchParams.get('season_id');

      let query = `
        SELECT r.*, f.match_date, f.opponent, f.venue, f.week_number
        FROM results r
        JOIN fixtures f ON r.fixture_id = f.id
        WHERE r.player_id = ?
      `;
      const params = [playerId];
      if (seasonId) {
        query += ' AND f.season_id = ?';
        params.push(parseInt(seasonId));
      }
      query += ' ORDER BY f.match_date DESC';

      const rows = await db.prepare(query).bind(...params).all();
      return json(rows.results);
    }

    return error('Not found', 404);

  } catch (e) {
    console.error(e);
    return error(e.message || 'Internal error', 500);
  }
}

function generatePin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function error(message, status = 400) {
  return json({ error: message }, status);
}
