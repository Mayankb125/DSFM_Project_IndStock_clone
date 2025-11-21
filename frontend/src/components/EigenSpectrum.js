import React from 'react';
import Plot from 'react-plotly.js';

const EigenSpectrum = ({ eigenvalues = [] }) => {
  if (!eigenvalues || eigenvalues.length === 0) return null;

  // Show eigenvalues sorted descending index on x-axis
  const sorted = [...eigenvalues].slice().sort((a,b) => b - a);
  const idx = sorted.map((_, i) => i + 1);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Eigenvalue Spectrum</h3>
      <Plot
        data={[
          {
            x: idx,
            y: sorted,
            mode: 'markers+lines',
            type: 'scatter',
            marker: { color: '#10b981' }
          }
        ]}
        layout={{
          autosize: true,
          margin: { t: 10, r: 10, l: 30, b: 30 },
          xaxis: { title: 'Eigenvalue index (descending)' },
          yaxis: { title: 'Eigenvalue' }
        }}
        style={{ width: '100%', height: 320 }}
      />
    </div>
  );
};

export default EigenSpectrum;
