import React from 'react';
import Plot from 'react-plotly.js';

const EigenHistogram = ({ eigenvalues = [], lambda_max = null }) => {
  if (!eigenvalues || eigenvalues.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">RMT Eigenvalue Histogram</h3>
      <Plot
        data={[
          {
            x: eigenvalues,
            type: 'histogram',
            marker: { color: '#3b82f6' },
            nbinsx: Math.min(40, Math.max(10, Math.floor(eigenvalues.length / 2)))
          },
          ...(lambda_max ? [{
            x: [lambda_max, lambda_max],
            y: [0, Math.max(1, eigenvalues.length / 4)],
            mode: 'lines',
            line: { color: 'red', width: 2, dash: 'dash' },
            name: 'λ₊'
          }] : [])
        ]}
        layout={{
          autosize: true,
          margin: { t: 10, r: 10, l: 30, b: 30 },
          xaxis: { title: 'Eigenvalue' },
          yaxis: { title: 'Count' },
          showlegend: !!lambda_max
        }}
        style={{ width: '100%', height: 320 }}
      />
    </div>
  );
};

export default EigenHistogram;
