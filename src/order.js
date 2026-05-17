// Player-order recommender (player_order.prd §6). Pure, dependency-free ESM
// (reuses elo.js) so it runs in the Worker and in a local test harness.
//
// IMPORTANT framing (§7.2): this is captain DECISION-SUPPORT, not a proven
// optimiser. The backtest found no reliable predictive edge; we build it
// anyway as an explainable suggestion, and the output must surface its own
// uncertainty (predictability + expected-total range) honestly.

import {
  defaultEloConfig, expectedShare, outcomeShare, calibrate, predictScore,
} from './elo.js';

const norm = s => (s || '').toString().trim().toLowerCase().replace(/\s+/g, ' ');

// Chronological score-share Elo over every league game; also collect
// calibration samples from BOTH players' perspectives so the curve maps
// "rating gap (incl. home edge) → expected that player's chalks".
function buildLadder(games, cfg) {
  const R = new Map();
  const get = k => (R.has(k) ? R.get(k) : cfg.start);
  const samples = [];
  const ordered = games.slice().sort(
    (a, b) => (a.match_date || '').localeCompare(b.match_date || ''));
  for (const g of ordered) {
    if ((g.home_score + g.away_score) <= 0) continue;
    const hk = norm(g.home_player);
    const ak = norm(g.away_player);
    const d = get(hk) - get(ak) + cfg.homeAdv;
    samples.push({ d, score: g.home_score });
    samples.push({ d: -d, score: g.away_score });
    const delta = cfg.k * (outcomeShare(g.home_score, g.away_score) - expectedShare(d, cfg.scale));
    R.set(hk, get(hk) + delta);
    R.set(ak, get(ak) - delta);
  }
  return { R, curve: calibrate(samples, 8) };
}

// Per board slot, what does the opponent team habitually field there?
// Two layers (§6.2): identity (named players) and strength (their Elo).
function opponentHabit(games, opponentTeam, R, cfg, ourSet) {
  const opp = norm(opponentTeam);
  const slots = {}; // board → Map(playerName → { count, strength })
  let matches = 0;
  const seenMatch = new Set();
  for (const g of games) {
    const homeIs = norm(g.home_team) === opp;
    const awayIs = norm(g.away_team) === opp;
    if (!homeIs && !awayIs) continue;
    if (!seenMatch.has(g.match_url)) { seenMatch.add(g.match_url); matches++; }
    const player = homeIs ? g.home_player : g.away_player;
    const b = g.board;
    if (!player || !b) continue;
    // A player now on our roster (e.g. transferred clubs) can't be the
    // opposition this week — exclude them from the opponent's habit so we
    // never suggest "our player vs themselves".
    if (ourSet && ourSet.has(norm(player))) continue;
    if (!slots[b]) slots[b] = new Map();
    const key = norm(player);
    const cur = slots[b].get(key) || { name: player, count: 0, strength: null };
    cur.count++;
    cur.strength = R.has(key) ? R.get(key) : cfg.start;
    slots[b].set(key, cur);
  }

  // Normalised entropy per slot → predictability (1 = rigid, 0 = shuffles).
  const slotConsistency = {};
  let consSum = 0, consN = 0;
  for (const b of Object.keys(slots)) {
    const cands = [...slots[b].values()];
    const n = cands.reduce((s, c) => s + c.count, 0);
    let H = 0;
    for (const c of cands) {
      const p = c.count / n;
      if (p > 0) H -= p * Math.log2(p);
    }
    const maxH = Math.log2(Math.max(2, cands.length));
    const consistency = cands.length <= 1 ? 1 : 1 - H / maxH;
    slotConsistency[b] = { consistency, candidates: cands.length, samples: n };
    consSum += consistency;
    consN++;
  }
  return {
    slots,
    matches,
    predictability: consN ? consSum / consN : 0,
    slotConsistency,
  };
}

// Expectation of our player's chalks at a slot, taken OVER the opponent's
// habitual distribution there (so the saturating curve is handled correctly,
// not collapsed to a point). Also returns the variance for the honest range.
function cellStats(strength, slotMap, venue, curve, cfg) {
  const homeEdge = venue === 'Home' ? cfg.homeAdv : -cfg.homeAdv;
  let cands = slotMap ? [...slotMap.values()] : [];
  if (cands.length === 0) cands = [{ name: null, count: 1, strength: cfg.start }];
  const total = cands.reduce((s, c) => s + c.count, 0);
  let mean = 0, m2 = 0;
  let modal = cands[0];
  for (const c of cands) {
    if (c.count > modal.count) modal = c;
    const w = c.count / total;
    const v = predictScore(curve, strength - c.strength + homeEdge);
    mean += w * v;
    m2 += w * v * v;
  }
  return {
    mean,
    variance: Math.max(0, m2 - mean * mean),
    assumed_opponent: modal.name,
    assumed_opponent_strength: Math.round(modal.strength),
  };
}

function* permutations(arr) {
  if (arr.length <= 1) { yield arr; return; }
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) yield [arr[i], ...p];
  }
}

/**
 * @param {object} a
 *   a.games      league_games rows
 *   a.ourTeam    our team name
 *   a.selected   [{ name }] or [name] — the chosen squad (≤8)
 *   a.ourPlayers optional [name] — our full current roster (excluded from the
 *                opponent habit so a transferred player isn't shown vs himself)
 *   a.opponentTeam opponent team name
 *   a.venue      'Home' | 'Away'
 *   a.config     optional season_config overrides (k, scale, homeAdv, …)
 * @returns recommendation (see fields below)
 */
export function recommendOrder(a) {
  const cfg = { ...defaultEloConfig, ...(a.config || {}) };
  const selected = (a.selected || []).map(s => (typeof s === 'string' ? s : s.name));
  const n = selected.length;
  if (n === 0) return { error: 'no players selected' };

  const ourSet = new Set(
    [...(a.ourPlayers || []), ...selected].map(norm));

  const { R, curve } = buildLadder(a.games || [], cfg);
  const habit = opponentHabit(a.games || [], a.opponentTeam, R, cfg, ourSet);
  const strengthOf = name => (R.has(norm(name)) ? R.get(norm(name)) : cfg.start);

  const slotIds = Array.from({ length: n }, (_, i) => i + 1);
  // cell[i][b] for player i, slot index b (0-based over slotIds)
  const cell = selected.map(name =>
    slotIds.map(b => cellStats(strengthOf(name), habit.slots[b], a.venue, curve, cfg)));

  // Brute-force the assignment (n ≤ 8 ⇒ ≤ 40320 perms; the PRD endorses this).
  const idx = Array.from({ length: n }, (_, i) => i);
  let best = null;
  for (const perm of permutations(idx)) {
    let tot = 0;
    for (let slot = 0; slot < n; slot++) tot += cell[perm[slot]][slot].mean;
    if (!best || tot > best.tot) best = { tot, perm: perm.slice() };
  }

  // Coherent opponent lineup: a player only plays ONE board, so resolve a
  // one-to-one board→opponent assignment (strongest historical signal wins
  // each player's single most-likely board). The expected-score maths above
  // still uses the full per-slot distribution; this is display-only so the
  // shown opposition can't list the same person twice.
  const tuples = [];
  for (let slot = 0; slot < n; slot++) {
    const m = habit.slots[slotIds[slot]];
    if (!m) continue;
    for (const c of m.values()) {
      tuples.push({ slot, key: norm(c.name), name: c.name, count: c.count, strength: c.strength });
    }
  }
  tuples.sort((a2, b2) => b2.count - a2.count || b2.strength - a2.strength);
  const oppBySlot = {};
  const usedSlot = new Set();
  const usedOpp = new Set();
  for (const t of tuples) {
    if (usedSlot.has(t.slot) || usedOpp.has(t.key)) continue;
    oppBySlot[t.slot] = { name: t.name, strength: Math.round(t.strength) };
    usedSlot.add(t.slot);
    usedOpp.add(t.key);
  }

  const order = [];
  let variance = 0;
  for (let slot = 0; slot < n; slot++) {
    const pi = best.perm[slot];
    const c = cell[pi][slot];
    variance += c.variance;
    const opp = oppBySlot[slot];
    order.push({
      board: slotIds[slot],
      player: selected[pi],
      expected: Math.round(c.mean * 10) / 10,
      assumed_opponent: opp ? opp.name : null,
      assumed_opponent_strength: opp ? opp.strength : null,
    });
  }

  // Naive comparison: our players strongest-on-board-1 (the obvious order).
  const naivePerm = idx.slice().sort((x, y) => strengthOf(selected[y]) - strengthOf(selected[x]));
  let naiveTotal = 0;
  for (let slot = 0; slot < n; slot++) naiveTotal += cell[naivePerm[slot]][slot].mean;

  // Honest range (§7.2): the band must reflect REAL uncertainty, which is
  // dominated by inherent game-day noise, not opponent-assignment variance.
  // Combine both in quadrature so the tool never looks more precise than it
  // is: σ² = Σ(assignment var) + n·residualSd².
  const sd = Math.sqrt(variance + n * cfg.residualSd * cfg.residualSd);
  const clamp = v => Math.max(0, Math.min(21 * n, v));

  return {
    decision_support: true, // never present as a guaranteed optimiser (§7.2)
    order,
    expected_total: Math.round(best.tot * 10) / 10,
    total_low: Math.round(clamp(best.tot - 0.674 * sd) * 10) / 10,
    total_high: Math.round(clamp(best.tot + 0.674 * sd) * 10) / 10,
    max_total: 21 * n,
    naive_total: Math.round(naiveTotal * 10) / 10,
    gain_vs_naive: Math.round((best.tot - naiveTotal) * 10) / 10,
    predictability: Math.round(habit.predictability * 100) / 100,
    opponent_matches: habit.matches,
    low_confidence: habit.matches < 4 || habit.predictability < 0.34,
  };
}
