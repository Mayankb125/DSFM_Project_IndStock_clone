import React from 'react';

const RmtInterpretation = ({ rmt }) => {
  if (!rmt || !rmt.eigenvalues) return null;

  const eig = Array.isArray(rmt.eigenvalues) ? rmt.eigenvalues.slice() : [];
  if (!eig.length) return null;

  const sorted = eig.slice().sort((a,b)=>b-a);
  const lambda1 = sorted[0] || 0;
  const lambda2 = sorted[1] || 0;
  const lambda_max = rmt.lambda_max || null;
  const spread = lambda1 - lambda2;
  const ratio = lambda2 > 0 ? lambda1 / lambda2 : Infinity;

  // Interpretations
  let headline = '';
  let details = [];

  if (lambda_max && lambda1 > lambda_max) {
    headline = 'Market stress detected — a dominant market mode is present.';
    details.push('λ1 (largest eigenvalue) is above the Marchenko–Pastur noise limit (λ⁺), indicating a common factor driving many stocks — often market- or sector-wide moves.');
  } else if (lambda_max && lambda1 > 0.8 * lambda_max) {
    headline = 'Emerging common factor — monitor correlations.';
    details.push('Largest eigenvalue is approaching the noise limit; correlations may be strengthening across stocks.');
  } else {
    headline = 'No dominant market mode — diversification benefits likely.';
    details.push('Eigen-spectrum is close to random-matrix predictions, suggesting no large common factors currently.');
  }

  // concentration
  if (ratio > 2) {
    details.push('The gap between the first and second eigenvalues is large — returns are concentrated in a single factor. Consider sector-specific risks.');
  }

  // sudden spike guidance
  if (spread > 0.5 * lambda1) {
    details.push('A large spread between λ1 and λ2 suggests one very strong mode — volatility and systemic risk may be elevated.');
  }

  // actionable suggestions
  const suggestions = [];
  if (lambda1 > (lambda_max || 0)) {
    suggestions.push('Review portfolio exposure to market/sector factors and consider hedging or reducing concentrated positions.');
  } else {
    suggestions.push('Diversification appears effective; continue monitoring correlations and news-driven shocks.');
  }

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <h4 className="text-lg font-semibold mb-2">RMT Interpretation</h4>
      <div className="text-sm text-gray-700 mb-3">{headline}</div>
      <ul className="list-disc list-inside text-sm text-gray-600 mb-3">
        {details.map((d, i) => <li key={i}>{d}</li>)}
      </ul>
      <div className="text-sm text-gray-700 font-medium mb-2">Actionable suggestions</div>
      <ul className="list-disc list-inside text-sm text-gray-600">
        {suggestions.map((s, i) => <li key={i}>{s}</li>)}
      </ul>
      <div className="mt-3 text-xs text-gray-500">Quick tip: λ1 measures the strength of the largest collective mode. If λ1 &gt; λ⁺ the market behaves less like random noise and more like a coordinated system.</div>
    </div>
  );
};

export default RmtInterpretation;
