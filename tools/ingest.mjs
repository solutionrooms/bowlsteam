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

  const stripBase = u0 => {
    const u = new URL(u0);
    u.searchParams.delete('T'); u.searchParams.delete('DB'); u.searchParams.delete('S');
    return u.toString();
  };

  // One group per team: each team has its own league base URL and its own
  // opponents. league_games is a shared pool, so groups can overlap freely.
  const groups = [];
  if (a.team && a.base) {
    const opp = d1('SELECT DISTINCT opponent FROM fixtures').map(r => r.opponent);
    groups.push({ name: a.team, base: a.base, members: [a.team, ...opp.filter(o => o && o !== a.team)] });
  } else {
    const rows = d1('SELECT id, name, website_url FROM teams ORDER BY id');
    if (!rows.length) { console.error('No teams found in D1.'); process.exit(1); }
    for (const t of rows) {
      if (!t.website_url) { console.error(`  skip "${t.name}": no website_url`); continue; }
      const opp = d1(`SELECT DISTINCT f.opponent FROM fixtures f
        JOIN seasons s ON f.season_id = s.id WHERE s.team_id = ${t.id}`).map(r => r.opponent);
      groups.push({
        name: t.name,
        base: a.base || stripBase(t.website_url),
        members: [t.name, ...opp.filter(o => o && o !== t.name)],
      });
    }
    if (!groups.length) { console.error('No teams with a website_url.'); process.exit(1); }
  }
  const ourTeams = groups.map(g => g.name);

  // Incremental: a recorded cgleague match is immutable, so reuse anything
  // we already stored and only chase genuinely new results (kind to the
  // site, and fast enough to run weekly).
  let existing = [];
  if (!a.full && existsSync(OUT)) {
    try { existing = (JSON.parse(readFileSync(OUT, 'utf8')).games) || []; } catch { existing = []; }
  }
  const knownUrls = new Set(existing.map(g => g.match_url));
  const yearsWithData = new Set(existing.map(g => g.season_year));

  console.error(`Teams (groups): ${ourTeams.join(', ')}`);
  console.error(`Years: ${years.join(', ')}`);
  console.error(a.full
    ? 'Mode: FULL re-scrape (--full)\n'
    : `Mode: incremental (${existing.length} board-rows already stored)\n`);

  // Phase A — collect NEW match URLs only, across every team group. A team
  // page can appear in more than one group (shared opponents / two of our
  // teams in one league) — fetch each team-page once per (year).
  const matchMeta = new Map(); // match_url → { season_year, match_date }
  const seenTeamPage = new Set();
  for (const g of groups) {
    for (const year of years) {
      // A completed past season never gains matches — skip once captured.
      if (!a.full && year < currentYear && yearsWithData.has(year)) {
        console.error(`  ${g.name} ${year}: past season already captured — skipped`);
        continue;
      }
      for (const team of g.members) {
        const url = teamUrl(g.base, team, year, currentYear);
        if (seenTeamPage.has(url)) continue;
        seenTeamPage.add(url);
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
          if (!f.completed) continue;               // not played yet — don't fetch
          if (knownUrls.has(f.match_url)) continue;   // immutable, already have it
          if (!matchMeta.has(f.match_url)) {
            matchMeta.set(f.match_url, { season_year: year, match_date: f.match_date });
            added++;
          }
        }
        console.error(`  [${g.name}] ${team} ${year}: ${fx.length} fixtures, +${added} new`);
        await sleep(a.delay);
      }
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
      our_team: ourTeams[0],
      teams: ourTeams,
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
