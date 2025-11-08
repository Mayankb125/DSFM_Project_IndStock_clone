import React from 'react';

// Simple correlation heatmap using CSS grid
const Heatmap = ({ tickers, matrix, title }) => {
  if (!tickers || !matrix) return null;
  const n = tickers.length;
  const colorFor = (v) => {
    // v in [-1,1]
    const val = Math.max(-1, Math.min(1, v || 0));
    // red (-1) to white (0) to green (1)
    const r = val < 0 ? 255 : Math.round(255 * (1 - val));
    const g = val > 0 ? 255 : Math.round(255 * (1 + val));
    const b = val < 0 ? Math.round(255 * (1 + val)) : Math.round(255 * (1 - val));
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
      </div>
      <div className="overflow-auto">
        <div className="grid" style={{ gridTemplateColumns: `repeat(${n + 1}, minmax(60px, 1fr))` }}>
          <div></div>
          {tickers.map(t => (
            <div key={t} className="text-xs font-semibold text-center p-1">{t}</div>
          ))}
          {tickers.map((row, i) => (
            <React.Fragment key={row}>
              <div className="text-xs font-semibold p-1">{row}</div>
              {tickers.map((col, j) => (
                <div key={col+String(j)} className="border" style={{ backgroundColor: colorFor(matrix[i][j]) }}>
                  <div className="text-[10px] text-center py-1">{(matrix[i][j] ?? 0).toFixed(2)}</div>
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Heatmap;


