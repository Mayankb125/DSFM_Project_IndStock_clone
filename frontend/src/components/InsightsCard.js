import React from 'react';

// Ported inference logic from the provided Python snippet into JS
function computeInsights(analysis) {
  const insights = {};

  try {
    const corr = (analysis?.correlations?.raw) || [];
    const corr_adj = (analysis?.adjusted_correlation?.adjusted) || [];
    const sentimentObj = analysis?.sentiment || {};
    const eigen = analysis?.rmt?.eigenvalues || [];
    const lambda_plus = analysis?.rmt?.lambda_max || null;

    // correlation analysis: use upper triangle
    let strongest = 0;
    if (corr && corr.length > 0) {
      const n = corr.length;
      const vals = [];
      for (let i = 0; i < n; i++) {
        for (let j = i+1; j < n; j++) {
          const v = Number(corr[i][j]) || 0;
          vals.push(v);
        }
      }
      if (vals.length) strongest = Math.max(...vals);
    }
    if (strongest > 0.7) insights.correlation = 'Strong sector co-movement detected.';
    else if (strongest > 0.3) insights.correlation = 'Moderate correlation among selected stocks.';
    else insights.correlation = 'Low correlation; diversification is beneficial.';

    // sentiment analysis
    const svals = Object.values(sentimentObj).map(x => Number(x)).filter(x => !isNaN(x));
    const avg_sent = svals.length ? (svals.reduce((a,b)=>a+b,0)/svals.length) : 0;
    if (avg_sent > 0.4) insights.sentiment = 'Market sentiment is positive.';
    else if (avg_sent > 0.1) insights.sentiment = 'Sentiment is mildly positive.';
    else if (avg_sent < -0.1) insights.sentiment = 'Sentiment is negative.';
    else insights.sentiment = 'Sentiment is neutral.';

    // RMT eigenvalue interpretation
    const lambda1 = eigen && eigen.length ? Math.max(...eigen) : null;
    if (lambda1 != null && lambda_plus != null && lambda1 > lambda_plus) insights.stress = 'Market stress detected (λ1 above noise limit).';
    else insights.stress = 'Market appears stable.';

    // volatility probability: prefer model probability if provided
    let vol_prob = 0;
    if (analysis?.volatility?.probabilities && analysis.volatility.probabilities.length > 1) {
      // probability of "high" is index 1
      vol_prob = Number(analysis.volatility.probabilities[1]) || 0;
    } else if (analysis?.predictions) {
      // fallback: proportion of tickers with vol_annualized > median
      const vols = Object.values(analysis.predictions).map(p => Number(p.vol_annualized)).filter(x => !isNaN(x));
      if (vols.length) {
        const sorted = vols.slice().sort((a,b)=>a-b);
        const median = sorted[Math.floor(sorted.length/2)];
        const count = vols.filter(v => v > median).length;
        vol_prob = count / vols.length;
      }
    }
    if (vol_prob > 0.7) insights.volatility = 'High volatility risk expected.';
    else if (vol_prob > 0.4) insights.volatility = 'Moderate volatility risk.';
    else insights.volatility = 'Low volatility risk.';

    return insights;
  } catch (e) {
    return { error: 'Could not compute insights' };
  }
}

const InsightsCard = ({ analysis }) => {
  if (!analysis) return null;
  const ins = computeInsights(analysis);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-md">
      <h3 className="text-xl font-semibold mb-3">Quick Insights</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-gray-500">Correlation</div>
          <div className="mt-1 font-medium text-gray-800">{ins.correlation}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-gray-500">Sentiment</div>
          <div className="mt-1 font-medium text-gray-800">{ins.sentiment}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-gray-500">Market Stress</div>
          <div className="mt-1 font-medium text-gray-800">{ins.stress}</div>
        </div>
        <div className="p-4 border rounded-lg">
          <div className="text-sm text-gray-500">Volatility Risk</div>
          <div className="mt-1 font-medium text-gray-800">{ins.volatility}</div>
        </div>
      </div>
      <div className="mt-4 text-xs text-gray-500">Tip: These are heuristic insights to help interpretation. For trading decisions, validate with your own analysis.</div>
    </div>
  );
};

export default InsightsCard;
