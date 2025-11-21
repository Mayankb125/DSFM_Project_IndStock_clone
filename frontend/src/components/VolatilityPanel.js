import React from 'react';

const VolatilityPanel = ({ volatility }) => {
  if (!volatility) return null;

  const probs = volatility.probabilities || [];
  const features = volatility.features ? Object.values(volatility.features)[0] : {};
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Volatility (snapshot)</h3>
      <div className="mb-3">
        <div className="text-sm text-gray-600">Predicted regime</div>
        <div className="text-2xl font-bold">{volatility.predicted_label === 1 ? 'High Volatility' : 'Low/Normal'}</div>
      </div>
      {/* Model metadata removed with RandomForest; keep features & probabilities if present */}
      <div className="mb-3">
        <div className="text-sm text-gray-600">Probabilities</div>
        <div className="flex gap-3 mt-2">
          <div className="p-3 bg-gray-100 rounded">
            <div className="text-xs text-gray-500">Low</div>
            <div className="font-semibold">{(probs[0] * 100 || 0).toFixed(1)}%</div>
          </div>
          <div className="p-3 bg-gray-100 rounded">
            <div className="text-xs text-gray-500">High</div>
            <div className="font-semibold">{(probs[1] * 100 || 0).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-sm text-gray-600">Feature snapshot (latest)</div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-700">
          {Object.entries(features || {}).map(([k, v]) => (
            <div key={k} className="p-2 bg-gray-50 rounded">
              <div className="text-xs text-gray-500">{k}</div>
              <div className="font-medium">{Number(v).toFixed(4)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VolatilityPanel;
