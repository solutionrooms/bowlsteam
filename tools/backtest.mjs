#!/usr/bin/env node
// Phase 2 backtest harness (player_order.prd §7). CLI/log only — no Worker,
// no endpoints, no auth surface. Decides whether the Elo signal beats the
// current rolling-average signal at predicting our per-board score.
//
// Walk-forward (prequential): every prediction uses ONLY games strictly
// before it, then the game is folded in. Same handicap for both models.
//
// Two data modes:
//   - Dense (preferred): tools/league_games.json from `npm run ingest` —
//     a cross-team ladder, opponents have real histories.
//   - Sparse fallback: our results pulled live from D1 (opponents anchored
//     only by their scraped net-chalks prior).
//
// Usage:
//   node tools/backtest.mjs                         # auto: league_games.json else D1
//   node tools/backtest.mjs --games tools/league_games.json
//   node tools/backtest.mjs --file dump.json        # D1 results dump
//   node tools/backtest.mjs --k 24 --scale 400 --home 30 --window 4 --warmup 12

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  defaultEloConfig, expectedShare, outcomeShare, opponentPriorRating,
  calibrate, predictScore, rollingBaseline,
} from '../src/elo.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const GAMES_FILE = join(HERE, 'league_games.json');
const DB = 'bowlsteam-db';
const SQL = `
  SELECT f.match_date AS date, f.venue AS venue,
         r.player_id AS our_id, p.name AS our_name,
         r.player_score AS our_score, r.opponent_score AS opp_score,
         r.opponent_name AS opp_name, r.opponent_url AS opp_url,
         r.opponent_difficulty AS opp_diff
  FROM results r
  JOIN fixtures f ON r.fixture_id = f.id
  JOIN players  p ON r.player_id  = p.id
  WHERE f.status = 'completed'
  ORDER BY f.match_date ASC, r.id ASC
`.replace(/\s+/g, ' ').trim();

function parseArgs(argv) {
  const a = { ...defaultEloConfig, file: null, games: null, warmup: 12 };
  for (let i = 2; i < argv.length; i++) {
    const [k, v] = argv[i].replace(/^--/, '').split('=');
    const val = v ?? argv[++i];
    if (k === 'file') a.file = val;
    else if (k === 'games') a.games = val;
    else if (k === 'k') a.k = +val;
    else if (k === 'scale') a.scale = +val;
    else if (k === 'home') a.homeAdv = +val;
    else if (k === 'oppscale') a.oppPriorScale = +val;
    else if (k === 'window') a.baselineWindow = +val;
    else if (k === 'warmup') a.warmup = +val;
  }
  return a;
}

function d1Rows() {
  let out;
  try {
    out = execFileSync(
      'npx',
      ['wrangler', 'd1', 'execute', DB, '--remote', '--json', '--command', SQL],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (e) {
    const detail = ((e.stderr || '') + (e.stdout || '')).trim();
    console.error('Could not query remote D1 via wrangler.\n');
    if (detail) console.error('wrangler said:\n' + detail + '\n');
    console.error(
      'Either run `npm run ingest` first (preferred — builds the dense\n' +
      'cross-team ladder), or dump the results query and pass --file:\n\n' +
      `  npx wrangler d1 execute ${DB} --remote --json --command "${SQL}" > dump.json\n` +
      '  node tools/backtest.mjs --file dump.json\n',
    );
    process.exit(1);
  }
  const s = out.indexOf('['), e = out.lastIndexOf(']');
  if (s === -1 || e === -1) {
    console.error('wrangler returned no JSON. Raw output:\n' + out.trim());
    process.exit(1);
  }
  const parsed = JSON.parse(out.slice(s, e + 1));
  const block = Array.isArray(parsed) ? parsed.find(b => b && b.results) : parsed;
  return (block && block.results) || [];
}

const norm = s => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

// Paired bootstrap 90% interval for (baselineMAE − eloMAE): honest noise band.
function bootstrapDiff(absElo, absBase, iters = 2000) {
  const n = absElo.length;
  const diffs = [];
  for (let it = 0; it < iters; it++) {
    let se = 0, sb = 0;
    for (let i = 0; i < n; i++) {
      const j = (Math.random() * n) | 0;
      se += absElo[j];
      sb += absBase[j];
    }
    diffs.push((sb - se) / n);
  }
  diffs.sort((x, y) => x - y);
  return [diffs[(0.05 * iters) | 0], diffs[(0.95 * iters) | 0]];
}

// Dense mode: build a cross-team ladder over ALL games chronologically,
// evaluate only on our team's boards (the thing the recommender predicts).
function evalGames(data, cfg) {
  const ourTeam = norm(data.meta && data.meta.our_team);
  const games = (data.games || [])
    .filter(g => (g.home_score + g.away_score) > 0)
    .slice()
    .sort((x, y) => (x.match_date || '').localeCompare(y.match_date || ''));

  const R = new Map();                       // player key → rating
  const get = k => (R.has(k) ? R.get(k) : cfg.start);
  const priorScores = new Map();             // our player key → [raw scores]
  const seen = [];                           // {d, score} from our prior boards
  const rec = [];

  for (const g of games) {
    const hk = norm(g.home_player);
    const ak = norm(g.away_player);
    const dGame = get(hk) - get(ak) + cfg.homeAdv;

    const homeIsOurs = norm(g.home_team) === ourTeam;
    const awayIsOurs = norm(g.away_team) === ourTeam;
    if (homeIsOurs || awayIsOurs) {
      const ourKey = homeIsOurs ? hk : ak;
      const oppKey = homeIsOurs ? ak : hk;
      const ourScore = homeIsOurs ? g.home_score : g.away_score;
      const dOur = get(ourKey) - get(oppKey) + (homeIsOurs ? cfg.homeAdv : -cfg.homeAdv);
      const curve = calibrate(seen, 6);
      const eloPred = predictScore(curve, dOur);
      const basePred = rollingBaseline(priorScores.get(ourKey) || [], cfg);
      rec.push({
        date: g.match_date,
        name: homeIsOurs ? g.home_player : g.away_player,
        actual: ourScore,
        eAbs: Math.abs(eloPred - ourScore),
        bAbs: Math.abs(basePred - ourScore),
        eSign: eloPred - ourScore,
        bSign: basePred - ourScore,
        warm: seen.length < cfg.warmup,
      });
      seen.push({ d: dOur, score: ourScore });
      const ps = priorScores.get(ourKey) || [];
      ps.push(ourScore);
      priorScores.set(ourKey, ps);
    }

    const actualHome = outcomeShare(g.home_score, g.away_score);
    const delta = cfg.k * (actualHome - expectedShare(dGame, cfg.scale));
    R.set(hk, get(hk) + delta);
    R.set(ak, get(ak) - delta);
  }

  return {
    rec,
    meta: {
      mode: 'dense (cross-team ladder)',
      games: games.length,
      players: R.size,
      ourBoards: rec.length,
      range: games.length ? `${games[0].match_date} → ${games[games.length - 1].match_date}` : '-',
    },
  };
}

// Sparse fallback: only our results; opponents anchored by net-chalks prior.
function evalResults(rows, cfg) {
  const ratings = new Map();
  const oppRatings = new Map();
  const priorScores = new Map();
  const seen = [];
  const rec = [];

  for (const row of rows) {
    const ourId = row.our_id;
    const ok = (row.opp_url || row.opp_name || 'unknown').toString().trim().toLowerCase();
    const rOur = ratings.has(ourId) ? ratings.get(ourId) : cfg.start;
    const rOpp = oppRatings.has(ok)
      ? oppRatings.get(ok)
      : opponentPriorRating(row.opp_diff ?? null, cfg);
    const home = row.venue === 'Home' ? cfg.homeAdv : -cfg.homeAdv;
    const dPre = rOur - rOpp + home;

    const curve = calibrate(seen, 6);
    const eloPred = predictScore(curve, dPre);
    const basePred = rollingBaseline(priorScores.get(ourId) || [], cfg);
    const actual = row.our_score;
    rec.push({
      date: row.date, name: row.our_name, actual,
      eAbs: Math.abs(eloPred - actual), bAbs: Math.abs(basePred - actual),
      eSign: eloPred - actual, bSign: basePred - actual,
      warm: seen.length < cfg.warmup,
    });

    const delta = cfg.k * (outcomeShare(row.our_score, row.opp_score) - expectedShare(dPre, cfg.scale));
    ratings.set(ourId, rOur + delta);
    oppRatings.set(ok, rOpp - delta);
    seen.push({ d: dPre, score: actual });
    const ps = priorScores.get(ourId) || [];
    ps.push(actual);
    priorScores.set(ourId, ps);
  }
  return {
    rec,
    meta: {
      mode: 'sparse (our results only)',
      games: rows.length,
      players: new Set(rows.map(r => r.our_id)).size,
      ourBoards: rec.length,
      range: rows.length ? `${rows[0].date} → ${rows[rows.length - 1].date}` : '-',
    },
  };
}

function report(label, set) {
  if (set.length === 0) { console.log(`  ${label}: (no games)`); return; }
  const eMAE = mean(set.map(r => r.eAbs));
  const bMAE = mean(set.map(r => r.bAbs));
  const eBias = mean(set.map(r => r.eSign));
  const bBias = mean(set.map(r => r.bSign));
  const [lo, hi] = bootstrapDiff(set.map(r => r.eAbs), set.map(r => r.bAbs));
  const better = bMAE - eMAE;
  const sign = x => (x >= 0 ? '+' : '') + x.toFixed(2);
  console.log(`  ${label}  (n=${set.length})`);
  console.log(`    Elo      MAE ${eMAE.toFixed(2)}  bias ${sign(eBias)}`);
  console.log(`    Baseline MAE ${bMAE.toFixed(2)}  bias ${sign(bBias)}`);
  console.log(`    Elo − Baseline improvement: ${sign(better)} chalks MAE`);
  console.log(`    90% bootstrap interval: [${lo.toFixed(2)}, ${hi.toFixed(2)}]`);
  console.log(`    Verdict: ${lo > 0 ? 'Elo clearly better'
    : hi < 0 ? 'Baseline clearly better'
    : 'inconclusive — interval straddles zero (too little data / no real edge)'}`);
}

function main() {
  const cfg = parseArgs(process.argv);

  let result;
  if (cfg.games || (!cfg.file && existsSync(GAMES_FILE))) {
    const path = cfg.games || GAMES_FILE;
    result = evalGames(JSON.parse(readFileSync(path, 'utf8')), cfg);
  } else if (cfg.file) {
    result = evalResults(JSON.parse(readFileSync(cfg.file, 'utf8')), cfg);
  } else {
    result = evalResults(d1Rows(), cfg);
  }

  const { rec, meta } = result;
  if (rec.length === 0) {
    console.error('No evaluable boards. Nothing to backtest.');
    process.exit(1);
  }
  const post = rec.filter(r => !r.warm);

  console.log('\nBowlSteam Elo backtest — Phase 2 (player_order.prd §7)');
  console.log(`Mode: ${meta.mode}`);
  console.log(`Config: k=${cfg.k} scale=${cfg.scale} home=${cfg.homeAdv} ` +
    `oppscale=${cfg.oppPriorScale} window=${cfg.baselineWindow} warmup=${cfg.warmup}`);
  console.log(`Data: ${meta.games} games, ${meta.players} players, ` +
    `${meta.ourBoards} of our boards evaluated, ${meta.range}`);
  console.log('\nLower MAE = better prediction of our per-board score.\n');
  report('All our boards (incl. cold-start warmup)', rec);
  console.log('');
  report('Post-warmup only', post);

  if (post.length < 60) {
    console.log(
      '\nNote: < 60 post-warmup boards. Per the PRD gate, Phase 3 needs a\n' +
      'repeatable edge — treat anything here as indicative until more games\n' +
      'accumulate (re-run as the season progresses).',
    );
  }
}

main();
