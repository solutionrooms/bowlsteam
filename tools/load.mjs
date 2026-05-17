#!/usr/bin/env node
// Load tools/league_games.json into remote D1 (player_order.prd §6.1).
// Separate from `ingest` so the production write is an explicit, intentional
// step. Idempotent: creates the table if missing and uses INSERT OR IGNORE
// on the (match_url, board) unique key, so re-running only adds new rows
// (matches are immutable).
//
// Usage:
//   npm run ingest     # scrape → tools/league_games.json
//   npm run load       # this script → remote D1
//
//   node tools/load.mjs --file tools/league_games.json

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const DB = 'bowlsteam-db';

const SCHEMA = `
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
`;

const q = v => (v === null || v === undefined || v === '')
  ? 'NULL'
  : (typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

function main() {
  let file = join(HERE, 'league_games.json');
  const v = process.argv;
  for (let i = 2; i < v.length; i++) {
    const [k, val0] = v[i].replace(/^--/, '').split('=');
    if (k === 'file') file = val0 ?? v[++i];
  }

  const games = (JSON.parse(readFileSync(file, 'utf8')).games) || [];
  if (games.length === 0) { console.error('No games in ' + file); process.exit(1); }

  const cols = '(season_year,match_date,division,home_team,away_team,board,' +
    'home_player,home_score,away_player,away_score,match_url)';
  const lines = [SCHEMA.trim()];
  for (let i = 0; i < games.length; i += 200) {
    const vals = games.slice(i, i + 200).map(g => '(' + [
      g.season_year, g.match_date, g.division, g.home_team, g.away_team,
      g.board, g.home_player, g.home_score, g.away_player, g.away_score,
      g.match_url,
    ].map(q).join(',') + ')').join(',');
    lines.push(`INSERT OR IGNORE INTO league_games ${cols} VALUES ${vals};`);
  }

  const tmp = join(HERE, '_load.sql');
  writeFileSync(tmp, lines.join('\n'));
  try {
    console.error(`Loading ${games.length} rows into ${DB} (INSERT OR IGNORE)...`);
    const out = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', DB, '--remote', '--file', tmp],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 },
    );
    process.stdout.write(out);
    const rows = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command',
        'SELECT COUNT(*) AS n FROM league_games'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const s = rows.indexOf('['), e = rows.lastIndexOf(']');
    const parsed = JSON.parse(rows.slice(s, e + 1));
    const block = Array.isArray(parsed) ? parsed.find(b => b && b.results) : parsed;
    console.error(`Done. league_games now holds ${block.results[0].n} rows.`);
  } catch (e) {
    console.error('wrangler load failed:\n' + ((e.stderr || '') + (e.stdout || '')).trim());
    console.error('\nRun locally where wrangler is logged in.');
    process.exit(1);
  } finally {
    try { unlinkSync(tmp); } catch { /* ignore */ }
  }
}

main();
