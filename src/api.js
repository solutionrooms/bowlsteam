import { getAllRatings, runSelection, determineDroppedPlayer } from './selection.js';
import { scrapeAll, scrapeFixtures } from './scraper.js';

// --- Auth helper: resolve club from PIN header ---
async function getClub(request, db) {
  const pin = request.headers.get('X-Club-Pin');
  if (!pin) return null;
  return db.prepare('SELECT * FROM clubs WHERE pin = ?').bind(pin).first();
}

export async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '');
  const method = request.method;
  const db = env.DB;

  try {

    // === PUBLIC: Auth endpoints (no PIN required) ===

    // Validate PIN and return club info
    if (path === '/api/auth' && method === 'POST') {
      const body = await request.json();
      const { pin } = body;
      if (!pin) return error('PIN required', 400);
      const club = await db.prepare('SELECT id, pin, name FROM clubs WHERE pin = ?').bind(pin).first();
      if (!club) return error('Invalid PIN', 401);
      return json({ id: club.id, name: club.name, needsName: !club.name });
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
    const scrapeMatch = path.match(/^\/api\/teams\/(\d+)\/scrape$/);
    if (scrapeMatch && method === 'POST') {
      const teamId = parseInt(scrapeMatch[1]);
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
          'rating_window', 'default_rating', 'drop_enabled', 'drop_count',
          'drop_duration', 'drop_carry_over'];
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
      const rows = await db.prepare(
        'SELECT * FROM fixtures WHERE season_id = ? ORDER BY week_number ASC'
      ).bind(parseInt(seasonId)).all();
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
            INSERT INTO results (fixture_id, player_id, player_score, opponent_score)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(fixture_id, player_id) DO UPDATE
            SET player_score = excluded.player_score, opponent_score = excluded.opponent_score
          `).bind(fixtureId, r.player_id, r.player_score, r.opponent_score).run();
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
