import React from 'react';

const SentimentCards = ({ sentiments, examples }) => {
  if (!sentiments) return null;
  const tickers = Object.keys(sentiments);
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4">Sentiment</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tickers.map(t => (
          <div key={t} className="border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{t}</div>
              <div className={`text-sm px-2 py-1 rounded ${sentiments[t] > 0.2 ? 'bg-green-100 text-green-800' : sentiments[t] < -0.2 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                {(sentiments[t] ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="text-sm text-gray-600 mb-1">Top headlines</div>
            <ul className="list-disc list-inside text-sm space-y-1">
              {(examples?.[t] || []).slice(0,3).map((h, i) => (
                <li key={i}>
                  <a className="text-blue-600 hover:underline" href={h.url} target="_blank" rel="noreferrer">{h.title}</a>
                  <div className="text-xs text-gray-500">{h.source} · {new Date(h.published_at).toLocaleString()}</div>
                </li>
              ))}
              {(!examples?.[t] || examples[t].length === 0) && <li className="text-gray-500">No recent headlines</li>}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SentimentCards;


