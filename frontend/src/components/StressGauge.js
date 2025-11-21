import React from 'react';
import Plot from 'react-plotly.js';

const StressGauge = ({ lambda1 = null, lambda2 = null, lambda_max = null }) => {
  if (lambda1 === null) return null;

  // Normalize lambda1 against lambda_max if available
  const maxVal = lambda_max || Math.max(lambda1, lambda2 || 0, 1);
  const pct = Math.min(1, Math.max(0, lambda1 / maxVal));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Market Stress Gauge (λ₁)</h3>
      <Plot
        data={[
          {
            type: 'indicator',
            mode: 'gauge+number',
            value: lambda1,
            gauge: {
              axis: { range: [0, maxVal], tickformat: '.2f' },
              bar: { color: pct > 0.8 ? 'red' : pct > 0.5 ? 'orange' : 'green' },
              steps: [
                { range: [0, maxVal * 0.5], color: 'rgba(16,185,129,0.3)' },
                { range: [maxVal * 0.5, maxVal * 0.8], color: 'rgba(250,204,21,0.3)' },
                { range: [maxVal * 0.8, maxVal], color: 'rgba(239,68,68,0.3)' }
              ]
            }
          }
        ]}
        layout={{ autosize: true, margin: { t: 10, r: 10, l: 30, b: 30 } }}
        style={{ width: '100%', height: 320 }}
      />
    </div>
  );
};

export default StressGauge;
