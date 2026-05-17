// Elo model (Phase 2 — see player_order.prd §5.1).
//
// Pure, dependency-free ESM so it can run in the Node backtest harness now and
// inside the Worker later. Nothing here touches D1, fetch, or the DOM.
//
// We only ever store OUR players' games (one row = our player vs a named
// opponent). Opponents rarely recur, so a naive per-opponent Elo is
// under-determined. Strategy: Elo-rate our players with margin-aware updates;
// anchor each opponent from the strength signal we already scrape
// (avg net chalks → opponent_difficulty); let the backtest judge it.

export const defaultEloConfig = {
  start: 1500,        // initial rating
  k: 24,              // update step
  scale: 400,         // logistic spread (base-10, classic Elo scale)
  homeAdv: 30,        // rating points added to whichever player is at home
  oppPriorScale: 25,  // Elo points per 1.0 of opponent avg net chalks
  baselineWindow: 4,  // rolling-average baseline window (matches selection)
  defaultScore: 15,   // fallback predicted score when no history
  residualSd: 5,      // inherent per-board score noise (≈ measured backtest MAE);
                      // dominates the honest expected-total range (§7.2)
};

/** Expected share of total chalks for player A given effective rating diff d. */
export function expectedShare(d, scale) {
  return 1 / (1 + Math.pow(10, -d / scale));
}

/** Actual share of total chalks (margin-aware: 21–20 ≈ 0.51, 21–3 ≈ 0.88). */
export function outcomeShare(scoreA, scoreB) {
  const t = scoreA + scoreB;
  if (t <= 0) return 0.5;
  return scoreA / t;
}

/** Map an opponent's avg net chalks to a starting rating on our ladder. */
export function opponentPriorRating(avgNetChalks, config) {
  if (avgNetChalks === null || avgNetChalks === undefined) return config.start;
  return config.start + config.oppPriorScale * avgNetChalks;
}

/**
 * Replay games in chronological order, updating ratings as we go.
 * Each game also records the pre-game state so a backtest can predict using
 * only information available before that game.
 *
 * @param {Array} games - chronological, each:
 *   { date, ourKey, ourName, oppKey, oppName, ourScore, oppScore,
 *     venue:'Home'|'Away', oppAvgNetChalks:number|null }
 * @param {object} config
 * @returns {{ ratings:Map, samples:Array }}
 *   samples: [{ date, ourKey, dPre, ourScore, oppScore }] — dPre is the
 *   pre-game effective rating diff (our − opp, incl. home advantage).
 */
export function buildLadder(games, config = defaultEloConfig) {
  const ratings = new Map();   // our player key → rating
  const oppRatings = new Map(); // opponent key → rating
  const samples = [];

  const ourR = k => (ratings.has(k) ? ratings.get(k) : config.start);
  const oppR = (k, prior) =>
    oppRatings.has(k) ? oppRatings.get(k) : opponentPriorRating(prior, config);

  for (const g of games) {
    const rOur = ourR(g.ourKey);
    const rOpp = oppR(g.oppKey, g.oppAvgNetChalks);
    const home = g.venue === 'Home' ? config.homeAdv : -config.homeAdv;
    const dPre = rOur - rOpp + home;

    samples.push({
      date: g.date,
      ourKey: g.ourKey,
      ourName: g.ourName,
      dPre,
      ourScore: g.ourScore,
      oppScore: g.oppScore,
    });

    const actual = outcomeShare(g.ourScore, g.oppScore);
    const expected = expectedShare(dPre, config.scale);
    const delta = config.k * (actual - expected);
    ratings.set(g.ourKey, rOur + delta);
    oppRatings.set(g.oppKey, rOpp - delta);
  }

  return { ratings, oppRatings, samples };
}

/**
 * Non-parametric calibration of rating-diff → expected our-score (0–21).
 * We deliberately avoid a fixed functional form: in to-21 singles a player
 * scores 21 on a win or their stuck total on a loss, so E[score|d] has an
 * awkward shape. Quantile bins + monotone interpolation fit whatever the
 * data actually does, which is exactly what we want to stress-test.
 *
 * @param {Array<{d:number, score:number}>} samples
 * @param {number} nBins
 * @returns {{ xs:number[], ys:number[] }} monotone lookup curve
 */
export function calibrate(samples, nBins = 6) {
  const pts = samples
    .filter(s => Number.isFinite(s.d) && Number.isFinite(s.score))
    .sort((a, b) => a.d - b.d);
  if (pts.length === 0) return { xs: [0], ys: [defaultEloConfig.defaultScore] };

  const per = Math.max(1, Math.floor(pts.length / nBins));
  const xs = [];
  const ys = [];
  for (let i = 0; i < pts.length; i += per) {
    const chunk = pts.slice(i, i + per);
    const mx = chunk.reduce((s, p) => s + p.d, 0) / chunk.length;
    const my = chunk.reduce((s, p) => s + p.score, 0) / chunk.length;
    xs.push(mx);
    ys.push(my);
  }
  // Enforce non-decreasing (stronger gap should never predict a lower score).
  for (let i = 1; i < ys.length; i++) if (ys[i] < ys[i - 1]) ys[i] = ys[i - 1];
  return { xs, ys };
}

/** Predict expected our-score from the calibration curve (clamped 0–21). */
export function predictScore(curve, d) {
  const { xs, ys } = curve;
  if (xs.length === 1) return clamp(ys[0]);
  if (d <= xs[0]) return clamp(ys[0]);
  if (d >= xs[xs.length - 1]) return clamp(ys[ys.length - 1]);
  for (let i = 1; i < xs.length; i++) {
    if (d <= xs[i]) {
      const t = (d - xs[i - 1]) / (xs[i] - xs[i - 1] || 1);
      return clamp(ys[i - 1] + t * (ys[i] - ys[i - 1]));
    }
  }
  return clamp(ys[ys.length - 1]);
}

/** Current-system baseline: predict next score = mean of recent raw scores. */
export function rollingBaseline(priorScores, config = defaultEloConfig) {
  if (!priorScores || priorScores.length === 0) return config.defaultScore;
  const w = priorScores.slice(-config.baselineWindow);
  return w.reduce((s, v) => s + v, 0) / w.length;
}

function clamp(v) {
  return Math.max(0, Math.min(21, v));
}
