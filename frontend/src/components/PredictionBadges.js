import React from 'react';

const badgeClass = (label) => {
  if (label === 'Likely Up') return 'bg-green-100 text-green-800';
  if (label === 'Likely Down') return 'bg-red-100 text-red-800';
  return 'bg-yellow-100 text-yellow-800';
};

const PredictionBadges = ({ predictions }) => {
  if (!predictions) return null;
  const tickers = Object.keys(predictions);
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Predictions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickers.map(t => (
          <div key={t} className="border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{t}</div>
              <span className={`text-sm px-2 py-1 rounded ${badgeClass(predictions[t].prediction)}`}>{predictions[t].prediction}</span>
            </div>
            <div className="text-sm text-gray-600">Avg sentiment: {(predictions[t].sentiment ?? 0).toFixed(2)}</div>
            <div className="text-sm text-gray-600">7d momentum: {(predictions[t].momentum_7d ?? 0).toFixed(3)}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PredictionBadges;


