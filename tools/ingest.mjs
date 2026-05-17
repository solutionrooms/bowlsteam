#!/usr/bin/env node
// Offline cross-team ingest (player_order.prd §5.1, §6.1). CLI/local only —
// scrapes cgleague and writes tools/league_games.json. Does NOT write to prod
// D1 (that's a Phase 3 concern); the Phase 2 backtest reads the JSON file.
//
// Two phases so each match page is fetched exactly once: we and the opponent
// both list the same match, so we dedupe URLs before fetching.
//
// Usage:
//   node tools/ingest.mjs                       # derives everything from D1
//   node tools/ingest.mjs --years 2025,2026 --delay 400
//   node tools/ingest.mjs --team "Westlands 1" --base "https://www.cgleague.co.uk/team.php?L=Ncl"

import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseTeamFixtures, parseMatchBoth, parseDivision } from '../src/scraper.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'league_games.json');
const DB = 'bowlsteam-db';
const ORIGIN = 'https://www.cgleague.co.uk';

function args() {
  const a = { years: null, delay: 400, team: null, base: null, full: false };
  const v = process.argv;
  for (let i = 2; i < v.length; i++) {
    const [k, val0] = v[i].replace(/^--/, '').split('=');
    if (k === 'full') { a.full = true; continue; }
    const val = val0 ?? v[++i];
    if (k === 'years') a.years = val.split(',').map(s => +s.trim());
    else if (k === 'delay') a.delay = +val;
    else if (k === 'team') a.team = val;
    else if (k === 'base') a.base = val;
  }
  return a;
}

function d1(sql) {
  let out;
  try {
    out = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command',
        sql.replace(/\s+/g, ' ').trim()],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 32 * 1024 * 1024 },
    );
  } catch (e) {
    console.error('wrangler query failed:\n' + ((e.stderr || '') + (e.stdout || '')).trim());
    console.error('\nRun this locally where wrangler is logged in.');
    process.exit(1);
  }
  const s = out.indexOf('['), en = out.lastIndexOf(']');
  const parsed = JSON.parse(out.slice(s, en + 1));
  const block = Array.isArray(parsed) ? parsed.find(b => b && b.results) : parsed;
  return (block && block.results) || [];
}

// Build a team page URL for (teamName, year). Current year = live page;
// older = archive (DB=A&S=year). Keeps the league (L=) from --base / our
// team's stored website_url; swaps the team (T=).
function teamUrl(base, teamName, year, currentYear) {
  const u = new URL(base);
  u.searchParams.set('T', teamName);
  if (year < currentYear) {
    u.searchParams.set('DB', 'A');
    u.searchParams.set('S', String(year));
  }
  // cgleague expects spaces as '+', which URLSearchParams already does.
  return u.toString();
}

async function getText(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'BowlSteam-ingest' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.text();
}

const sleep = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  const a = args();
  const currentYear = new Date().getFullYear();
  const years = a.years || [currentYear - 1, currentYear];

  // Derive our team, league base, and the opponents we play.
  let ourTeam = a.team;
  let base = a.base;
  if (!ourTeam || !base) {
    const t = d1('SELECT name, website_url FROM teams ORDER BY id LIMIT 1')[0];
    if (!t) { console.error('No team found in D1.'); process.exit(1); }
    ourTeam = ourTeam || t.name;
    if (!base) {
      if (!t.website_url) { console.error('Team has no website_url; pass --base.'); process.exit(1); }
      // Strip the team param down to just the league base.
      const u = new URL(t.website_url);
      u.searchParams.delete('T'); u.searchParams.delete('DB'); u.searchParams.delete('S');
      base = u.toString();
    }
  }
  const opponents = d1('SELECT DISTINCT opponent FROM fixtures').map(r => r.opponent);
  const teams = [ourTeam, ...opponents.filter(o => o && o !== ourTeam)];

  // Incremental: a recorded cgleague match is immutable, so reuse anything
  // we already stored and only chase genuinely new results (kind to the
  // site, and fast enough to run weekly).
  let existing = [];
  if (!a.full && existsSync(OUT)) {
    try { existing = (JSON.parse(readFileSync(OUT, 'utf8')).games) || []; } catch { existing = []; }
  }
  const knownUrls = new Set(existing.map(g => g.match_url));
  const yearsWithData = new Set(existing.map(g => g.season_year));

  console.error(`Our team: ${ourTeam}`);
  console.error(`Base: ${base}`);
  console.error(`Years: ${years.join(', ')}`);
  console.error(`Teams: ${teams.length} (us + ${teams.length - 1} opponents)`);
  console.error(a.full
    ? 'Mode: FULL re-scrape (--full)\n'
    : `Mode: incremental (${existing.length} board-rows already stored)\n`);

  // Phase A — collect NEW match URLs only.
  const matchMeta = new Map(); // match_url → { season_year, match_date }
  for (const year of years) {
    // A completed past season never gains matches — skip it once captured.
    if (!a.full && year < currentYear && yearsWithData.has(year)) {
      console.error(`  ${year}: past season already captured — skipped`);
      continue;
    }
    for (const team of teams) {
      const url = teamUrl(base, team, year, currentYear);
      let html;
      try {
        html = await getText(url);
      } catch (e) {
        console.error(`  skip ${team} ${year}: ${e.message}`);
        await sleep(a.delay);
        continue;
      }
      const fx = parseTeamFixtures(html, year);
      let added = 0;
      for (const f of fx) {
        if (!f.completed) continue;                 // not played yet — don't fetch
        if (knownUrls.has(f.match_url)) continue;     // immutable, already have it
        if (!matchMeta.has(f.match_url)) {
          matchMeta.set(f.match_url, { season_year: year, match_date: f.match_date });
          added++;
        }
      }
      console.error(`  ${team} ${year}: ${fx.length} fixtures, +${added} new matches`);
      await sleep(a.delay);
    }
  }

  // Phase B — fetch each unique match once, expand to per-board rows.
  console.error(`\nFetching ${matchMeta.size} unique match pages...`);
  const games = [];
  let done = 0;
  for (const [matchUrl, meta] of matchMeta) {
    done++;
    let html;
    try {
      html = await getText(matchUrl);
    } catch (e) {
      console.error(`  [${done}/${matchMeta.size}] skip ${matchUrl}: ${e.message}`);
      await sleep(a.delay);
      continue;
    }
    const division = parseDivision(html);
    const { homeTeam, awayTeam, boards } = parseMatchBoth(html);
    if (!homeTeam || !awayTeam || boards.length === 0) {
      console.error(`  [${done}/${matchMeta.size}] no boards: ${matchUrl}`);
      await sleep(a.delay);
      continue;
    }
    for (const b of boards) {
      games.push({
        season_year: meta.season_year,
        match_date: meta.match_date,
        division,
        home_team: homeTeam,
        away_team: awayTeam,
        board: b.board,
        home_player: b.home_player,
        home_score: b.home_score,
        away_player: b.away_player,
        away_score: b.away_score,
        match_url: matchUrl,
      });
    }
    if (done % 25 === 0) console.error(`  [${done}/${matchMeta.size}]`);
    await sleep(a.delay);
  }

  // Merge new rows into the existing store (existing wins on dedupe).
  const merged = new Map();
  for (const g of existing) merged.set(`${g.match_url}#${g.board}`, g);
  let addedRows = 0;
  for (const g of games) {
    const key = `${g.match_url}#${g.board}`;
    if (!merged.has(key)) { merged.set(key, g); addedRows++; }
  }
  const all = [...merged.values()]
    .sort((x, y) => (x.match_date || '').localeCompare(y.match_date || ''));
  const matchCount = new Set(all.map(g => g.match_url)).size;

  writeFileSync(OUT, JSON.stringify({
    meta: {
      our_team: ourTeam,
      years,
      generated: new Date().toISOString(),
      matches: matchCount,
      games: all.length,
    },
    games: all,
  }, null, 1));
  console.error(
    `\n+${addedRows} new board-rows (${matchMeta.size} new matches fetched). ` +
    `Total: ${all.length} rows / ${matchCount} matches → ${OUT}`);
}

main().catch(e => { console.error(e); process.exit(1); });
