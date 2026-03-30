/**
 * Probability of Ruin Engine
 *
 * Computes the probability a trader's equity hits a ruin threshold
 * given their edge, loss distribution, and position sizing.
 *
 * Used to enhance A/B book routing:
 *   - Low PoR + positive edge → A-Book (hedge — trader is dangerous)
 *   - High PoR + negative edge → B-Book (warehouse — trader will lose)
 */
const RuinEngine = {

  // ─── Edge Calculation ───────────────────────────────────────────

  /**
   * Expected edge per trade in $ terms
   * @param {number} winRate - probability of winning (0-1)
   * @param {number} avgWin - average win amount ($)
   * @param {number} avgLoss - average loss amount ($ positive number)
   * @returns {number} expected value per trade
   */
  edgePerTrade(winRate, avgWin, avgLoss) {
    return winRate * avgWin - (1 - winRate) * avgLoss;
  },

  /**
   * Expected edge per day
   */
  edgePerDay(winRate, avgWin, avgLoss, tradesPerDay) {
    return this.edgePerTrade(winRate, avgWin, avgLoss) * tradesPerDay;
  },

  /**
   * Profit factor: gross wins / gross losses
   */
  profitFactor(winRate, avgWin, avgLoss) {
    const grossWin = winRate * avgWin;
    const grossLoss = (1 - winRate) * avgLoss;
    return grossLoss > 0 ? grossWin / grossLoss : Infinity;
  },

  // ─── Position Sizing Models ─────────────────────────────────────

  /**
   * Kelly Criterion — optimal fraction of capital to risk per trade.
   * f* = (p * b - q) / b
   * where p = win prob, q = loss prob, b = win/loss ratio
   */
  kellyCriterion(winRate, avgWin, avgLoss) {
    if (avgLoss <= 0) return 0;
    const b = avgWin / avgLoss; // win/loss ratio
    const p = winRate;
    const q = 1 - winRate;
    const kelly = (p * b - q) / b;
    return Math.max(0, kelly); // never negative
  },

  /**
   * Half-Kelly — more conservative, reduces variance
   */
  halfKelly(winRate, avgWin, avgLoss) {
    return this.kellyCriterion(winRate, avgWin, avgLoss) / 2;
  },

  /**
   * Fixed fractional — risk a fixed % of capital per trade
   * Returns the fraction (e.g., 0.02 for 2%)
   */
  fixedFractional(riskPercent) {
    return riskPercent / 100;
  },

  /**
   * Optimal-f (Ralph Vince) — fraction that maximises geometric growth
   * Approximated via TWR (Terminal Wealth Relative) maximisation
   * over the trade history distribution.
   * @param {number[]} returns - array of trade P&L values
   */
  optimalF(returns) {
    if (!returns || returns.length === 0) return 0;
    const maxLoss = Math.max(...returns.map(r => Math.abs(Math.min(r, 0))));
    if (maxLoss === 0) return 1;

    let bestF = 0;
    let bestTWR = 0;

    for (let f = 0.01; f <= 1.0; f += 0.01) {
      let twr = 1;
      for (const r of returns) {
        const hpr = 1 + (f * r) / maxLoss;
        if (hpr <= 0) { twr = 0; break; }
        twr *= hpr;
      }
      const geoMean = Math.pow(twr, 1 / returns.length);
      if (geoMean > bestTWR) {
        bestTWR = geoMean;
        bestF = f;
      }
    }
    return bestF;
  },

  // ─── Loss Distribution ──────────────────────────────────────────

  /**
   * Fit a normal distribution to trade returns
   * @param {number[]} returns - array of trade P&L values
   * @returns {{ mean: number, std: number }}
   */
  fitNormal(returns) {
    const n = returns.length;
    if (n === 0) return { mean: 0, std: 1 };
    const mean = returns.reduce((s, r) => s + r, 0) / n;
    const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1 || 1);
    return { mean, std: Math.sqrt(variance) };
  },

  /**
   * Compute distribution statistics
   */
  distributionStats(returns) {
    if (!returns.length) return { mean: 0, std: 0, skew: 0, kurtosis: 0, maxLoss: 0, maxWin: 0, median: 0 };
    const sorted = [...returns].sort((a, b) => a - b);
    const n = returns.length;
    const mean = returns.reduce((s, r) => s + r, 0) / n;
    const std = Math.sqrt(returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (n - 1 || 1));

    // Skewness
    const skew = std > 0 ? (returns.reduce((s, r) => s + ((r - mean) / std) ** 3, 0) / n) : 0;

    // Excess kurtosis
    const kurtosis = std > 0 ? (returns.reduce((s, r) => s + ((r - mean) / std) ** 4, 0) / n - 3) : 0;

    return {
      mean, std, skew, kurtosis,
      maxLoss: Math.min(...returns),
      maxWin: Math.max(...returns),
      median: sorted[Math.floor(n / 2)],
    };
  },

  // ─── Analytical Probability of Ruin ─────────────────────────────

  /**
   * Classic gambler's ruin formula (for even-bet approximation):
   *   PoR = (q/p)^(capital/unit)  if p ≠ q
   *   PoR = 1 - capital/(capital + ruinLevel)  if p = q
   *
   * More general: uses the edge and variance to compute ruin probability
   * via the continuous approximation:
   *   PoR = exp(-2 * edge * capital / variance)
   *
   * @param {number} capital - starting capital ($)
   * @param {number} edge - expected edge per trade ($)
   * @param {number} variance - variance of trade returns ($^2)
   * @param {number} ruinLevel - equity level considered "ruin" ($)
   * @returns {number} probability of ruin (0-1)
   */
  analyticalPoR(capital, edge, variance, ruinLevel = 0) {
    const effectiveCapital = capital - ruinLevel;
    if (effectiveCapital <= 0) return 1;
    if (edge <= 0) return 1; // negative edge → eventual ruin is certain
    if (variance <= 0) return 0;

    // Continuous diffusion approximation
    const por = Math.exp(-2 * edge * effectiveCapital / variance);
    return Math.min(1, Math.max(0, por));
  },

  /**
   * Discrete gambler's ruin for win/loss streaks
   * @param {number} winRate - win probability
   * @param {number} capital - starting units
   * @param {number} ruinUnits - how many units to lose to be ruined
   */
  discretePoR(winRate, capital, ruinUnits) {
    if (winRate === 0.5) return ruinUnits / (capital + ruinUnits);
    const r = (1 - winRate) / winRate;
    if (r === 1) return 1 - capital / (capital + ruinUnits);
    return (Math.pow(r, capital) - Math.pow(r, capital + ruinUnits)) / (1 - Math.pow(r, capital + ruinUnits));
  },

  // ─── Monte Carlo Ruin Simulation ────────────────────────────────

  /**
   * Run Monte Carlo simulation to estimate probability of ruin.
   *
   * @param {Object} params
   * @param {number} params.startingCapital - initial equity ($)
   * @param {number} params.winRate - probability of winning (0-1)
   * @param {number} params.avgWin - average win ($)
   * @param {number} params.avgLoss - average loss ($, positive)
   * @param {number} params.tradesPerDay - average trades per day
   * @param {number} params.days - simulation horizon (trading days)
   * @param {number} params.paths - number of MC paths
   * @param {number} params.ruinThreshold - fraction of starting capital (e.g., 0.1 = 10%)
   * @param {string} params.sizing - 'fixed_fractional' | 'kelly' | 'half_kelly' | 'fixed_lot'
   * @param {number} params.riskPercent - for fixed_fractional, % of capital risked per trade
   * @param {number} params.stdWin - std dev of wins (for distribution)
   * @param {number} params.stdLoss - std dev of losses (for distribution)
   * @returns {Object} simulation results
   */
  monteCarloRuin(params) {
    const {
      startingCapital = 10000,
      winRate = 0.5,
      avgWin = 100,
      avgLoss = 100,
      tradesPerDay = 3,
      days = 252,
      paths = 500,
      ruinThreshold = 0.1,
      sizing = 'fixed_lot',
      riskPercent = 2,
      stdWin = null,
      stdLoss = null,
    } = params;

    const ruinLevel = startingCapital * ruinThreshold;
    const totalTrades = Math.round(tradesPerDay * days);

    // Position sizing fraction
    let sizingFraction;
    switch (sizing) {
      case 'kelly':
        sizingFraction = this.kellyCriterion(winRate, avgWin, avgLoss);
        break;
      case 'half_kelly':
        sizingFraction = this.halfKelly(winRate, avgWin, avgLoss);
        break;
      case 'fixed_fractional':
        sizingFraction = riskPercent / 100;
        break;
      default: // fixed_lot
        sizingFraction = 0; // use raw amounts
    }

    // Win/loss std deviations (for realistic distribution)
    const sigmaWin = stdWin || avgWin * 0.3;
    const sigmaLoss = stdLoss || avgLoss * 0.3;

    // Simulate
    const equityCurves = [];
    let ruinCount = 0;
    const finalEquities = [];
    const maxDrawdowns = [];

    // For percentile tracking at each trade step (sample every N trades)
    const sampleInterval = Math.max(1, Math.floor(totalTrades / days));
    const dailyEquities = new Array(days + 1);
    for (let d = 0; d <= days; d++) dailyEquities[d] = [];

    for (let p = 0; p < paths; p++) {
      let equity = startingCapital;
      let peak = equity;
      let maxDD = 0;
      let ruined = false;
      const curve = [equity];

      for (let t = 0; t < totalTrades; t++) {
        if (ruined) { curve.push(equity); continue; }

        // Generate trade outcome
        const isWin = Math.random() < winRate;
        let tradeResult;

        if (isWin) {
          // Log-normal-ish win: normal with positive skew
          tradeResult = avgWin + this._boxMuller() * sigmaWin;
          tradeResult = Math.max(0, tradeResult); // wins are positive
        } else {
          tradeResult = -(avgLoss + this._boxMuller() * sigmaLoss);
          tradeResult = Math.min(0, tradeResult); // losses are negative
        }

        // Apply position sizing
        if (sizing !== 'fixed_lot' && sizingFraction > 0) {
          // Scale result relative to risked fraction of current equity
          const riskedAmount = equity * sizingFraction;
          const baseRisk = avgLoss; // normalise relative to avg loss
          tradeResult = tradeResult * (riskedAmount / baseRisk);
        }

        equity += tradeResult;

        // Track peak and drawdown
        if (equity > peak) peak = equity;
        const dd = (peak - equity) / peak;
        if (dd > maxDD) maxDD = dd;

        // Check ruin
        if (equity <= ruinLevel) {
          ruined = true;
          equity = ruinLevel;
          ruinCount++;
        }

        curve.push(equity);

        // Sample daily
        if ((t + 1) % sampleInterval === 0) {
          const dayIdx = Math.floor((t + 1) / sampleInterval);
          if (dayIdx <= days) dailyEquities[dayIdx].push(equity);
        }
      }

      // Ensure day 0 and final day populated
      dailyEquities[0].push(startingCapital);
      if (dailyEquities[days].length < p + 1) dailyEquities[days].push(equity);

      finalEquities.push(equity);
      maxDrawdowns.push(maxDD);
      equityCurves.push(curve);
    }

    // Compute percentiles at each day
    const percentiles = { p5: [], p25: [], p50: [], p75: [], p95: [] };
    for (let d = 0; d <= days; d++) {
      const vals = dailyEquities[d].sort((a, b) => a - b);
      const n = vals.length || 1;
      percentiles.p5.push(vals[Math.floor(n * 0.05)] || startingCapital);
      percentiles.p25.push(vals[Math.floor(n * 0.25)] || startingCapital);
      percentiles.p50.push(vals[Math.floor(n * 0.50)] || startingCapital);
      percentiles.p75.push(vals[Math.floor(n * 0.75)] || startingCapital);
      percentiles.p95.push(vals[Math.floor(n * 0.95)] || startingCapital);
    }

    // Final equity stats
    const sortedFinal = [...finalEquities].sort((a, b) => a - b);

    return {
      probabilityOfRuin: ruinCount / paths,
      ruinCount,
      paths,
      days,
      totalTrades,
      ruinLevel,
      sizingFraction,

      percentiles,

      finalEquity: {
        mean: finalEquities.reduce((s, e) => s + e, 0) / paths,
        median: sortedFinal[Math.floor(paths / 2)],
        p5: sortedFinal[Math.floor(paths * 0.05)],
        p95: sortedFinal[Math.floor(paths * 0.95)],
        min: sortedFinal[0],
        max: sortedFinal[paths - 1],
      },

      maxDrawdown: {
        mean: maxDrawdowns.reduce((s, d) => s + d, 0) / paths,
        median: [...maxDrawdowns].sort((a, b) => a - b)[Math.floor(paths / 2)],
        p95: [...maxDrawdowns].sort((a, b) => a - b)[Math.floor(paths * 0.95)],
      },

      // Return a subset of equity curves for charting (first 50)
      sampleCurves: equityCurves.slice(0, 50).map(c => {
        // Downsample to daily
        const daily = [c[0]];
        for (let d = 1; d <= days; d++) {
          const idx = Math.min(d * sampleInterval, c.length - 1);
          daily.push(c[idx]);
        }
        return daily;
      }),
    };
  },

  // ─── PoR as Function of Starting Capital ────────────────────────

  /**
   * Sweep starting capital from min to max, computing PoR at each level.
   * Uses the analytical formula for speed (MC would be too slow for sweep).
   *
   * @param {Object} params
   * @param {number} params.winRate
   * @param {number} params.avgWin
   * @param {number} params.avgLoss
   * @param {number} params.capitalMin
   * @param {number} params.capitalMax
   * @param {number} params.steps - number of capital levels to compute
   * @param {number} params.ruinThreshold - fraction (e.g., 0.1 for 10%)
   * @returns {{ capitals: number[], porValues: number[] }}
   */
  porVsCapital(params) {
    const {
      winRate, avgWin, avgLoss,
      capitalMin = 1000,
      capitalMax = 100000,
      steps = 50,
      ruinThreshold = 0.1,
    } = params;

    const edge = this.edgePerTrade(winRate, avgWin, avgLoss);
    const variance = winRate * avgWin ** 2 + (1 - winRate) * avgLoss ** 2 - edge ** 2;

    const capitals = [];
    const porValues = [];
    const stepSize = (capitalMax - capitalMin) / steps;

    for (let i = 0; i <= steps; i++) {
      const capital = capitalMin + i * stepSize;
      const ruinLevel = capital * ruinThreshold;
      const por = this.analyticalPoR(capital, edge, variance, ruinLevel);
      capitals.push(capital);
      porValues.push(por);
    }

    return { capitals, porValues };
  },

  // ─── Position Sizing Comparison ─────────────────────────────────

  /**
   * Compare different position sizing strategies via MC simulation.
   * Returns summary for each sizing method.
   */
  compareSizing(params) {
    const strategies = [
      { name: 'Fixed Lot', sizing: 'fixed_lot', riskPercent: 0 },
      { name: 'Fixed 1%', sizing: 'fixed_fractional', riskPercent: 1 },
      { name: 'Fixed 2%', sizing: 'fixed_fractional', riskPercent: 2 },
      { name: 'Half Kelly', sizing: 'half_kelly', riskPercent: 0 },
      { name: 'Full Kelly', sizing: 'kelly', riskPercent: 0 },
    ];

    return strategies.map(strat => {
      const result = this.monteCarloRuin({
        ...params,
        sizing: strat.sizing,
        riskPercent: strat.riskPercent,
        paths: 200, // fewer paths for speed in comparison
      });
      return {
        name: strat.name,
        sizing: strat.sizing,
        fraction: strat.sizing === 'fixed_fractional' ? strat.riskPercent + '%' :
                  strat.sizing === 'kelly' ? U.pct(result.sizingFraction * 100) :
                  strat.sizing === 'half_kelly' ? U.pct(result.sizingFraction * 100) : 'N/A',
        por: result.probabilityOfRuin,
        expectedReturn: ((result.finalEquity.median - params.startingCapital) / params.startingCapital) * 100,
        meanMaxDD: result.maxDrawdown.mean * 100,
        p95MaxDD: result.maxDrawdown.p95 * 100,
        medianFinal: result.finalEquity.median,
      };
    });
  },

  // ─── A/B Book Recommendation ────────────────────────────────────

  /**
   * Composite routing score using multiple risk factors.
   *
   * Factors (each normalised 0-1, where 1 = more dangerous to broker):
   *   1. Edge direction & magnitude — positive edge = dangerous (A-book)
   *   2. Profit factor — high PF = consistent winner
   *   3. Risk-reward ratio (avgWin/avgLoss) — high RR = skilled
   *   4. Sharpe ratio — risk-adjusted returns
   *   5. Drawdown — low DD = disciplined
   *   6. Return volatility (std dev) — low vol = predictable
   *   7. Probability of ruin — low PoR = survivor
   *
   * Weights are intentionally simple (equal-ish) to avoid overfitting.
   * The model classifies into 3 buckets, not a precise score.
   *
   * @param {Object} trader - account with full stats
   * @returns {Object} recommendation with breakdown
   */
  routingRecommendation(trader) {
    const edge = this.edgePerTrade(trader.winRate, trader.avgWin, trader.avgLoss);
    const kelly = this.kellyCriterion(trader.winRate, trader.avgWin, trader.avgLoss);
    const variance = trader.winRate * trader.avgWin ** 2 + (1 - trader.winRate) * trader.avgLoss ** 2 - edge ** 2;
    const stdDev = Math.sqrt(variance);
    const por = this.analyticalPoR(trader.balance || 10000, edge, variance, (trader.balance || 10000) * 0.1);
    const pf = trader.profitFactor || this.profitFactor(trader.winRate, trader.avgWin, trader.avgLoss);
    const rr = trader.avgLoss > 0 ? trader.avgWin / trader.avgLoss : 1;
    const sharpe = trader.sharpeRatio || 0;
    const maxDD = trader.maxDrawdown || 0.5;

    // ── Normalise each factor to 0-1 (1 = trader is skilled/dangerous) ──

    // Edge: clamp to [-200, +200], map to [0, 1]
    const edgeScore = Math.min(1, Math.max(0, (edge + 200) / 400));

    // Profit factor: 0.5 → 0, 1.0 → 0.33, 2.0 → 0.67, 3.0+ → 1
    const pfScore = Math.min(1, Math.max(0, (pf - 0.5) / 2.5));

    // Risk-reward: 0.5 → 0, 1.0 → 0.25, 2.0 → 0.5, 4.0+ → 1
    const rrScore = Math.min(1, Math.max(0, (rr - 0.5) / 3.5));

    // Sharpe: -1 → 0, 0 → 0.25, 1 → 0.5, 3+ → 1
    const sharpeScore = Math.min(1, Math.max(0, (sharpe + 1) / 4));

    // Drawdown (inverted): low DD = more dangerous. DD 60% → 0, DD 5% → 1
    const ddScore = Math.min(1, Math.max(0, 1 - maxDD / 0.6));

    // Volatility (inverted): low vol = more consistent = more dangerous
    // Normalise relative to avg trade size
    const avgTrade = (trader.avgWin + trader.avgLoss) / 2;
    const normVol = avgTrade > 0 ? stdDev / avgTrade : 1;
    const volScore = Math.min(1, Math.max(0, 1 - normVol / 2));

    // PoR (inverted): low PoR = survivor = dangerous
    const porScore = Math.min(1, Math.max(0, 1 - por));

    // ── Composite: simple average (no overfitting) ──
    const composite = (edgeScore + pfScore + rrScore + sharpeScore + ddScore + volScore + porScore) / 7;

    // ── Classify into 3 buckets ──
    let recommendation, reason;

    if (composite > 0.55 && edge > 0) {
      recommendation = 'a_book';
      reason = `Skilled trader (score ${U.pct(composite * 100)}): PF ${U.num(pf)}, Sharpe ${U.num(sharpe)}, PoR ${U.pct(por * 100)} — hedge exposure`;
    } else if (composite < 0.40 || edge < 0) {
      recommendation = 'b_book';
      reason = `Weak trader (score ${U.pct(composite * 100)}): PF ${U.num(pf)}, edge ${U.money(edge)}, PoR ${U.pct(por * 100)} — warehouse risk`;
    } else {
      recommendation = 'review';
      reason = `Borderline (score ${U.pct(composite * 100)}): PF ${U.num(pf)}, Sharpe ${U.num(sharpe)}, PoR ${U.pct(por * 100)} — manual review`;
    }

    return {
      recommendation, por, edge, kelly, variance, reason, composite,
      breakdown: { edgeScore, pfScore, rrScore, sharpeScore, ddScore, volScore, porScore },
    };
  },

  // ─── Helpers ────────────────────────────────────────────────────

  /** Box-Muller transform for standard normal random variable */
  _boxMuller() {
    let u1, u2;
    do { u1 = Math.random(); } while (u1 === 0);
    u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  },
};
