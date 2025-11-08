import React, { useState } from 'react';

const DEFAULT_SUGGESTIONS = [
  'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
  'SBIN.NS', 'LT.NS', 'BHARTIARTL.NS', 'ITC.NS', 'AXISBANK.NS'
];

const TickerSelector = ({ onAnalyze }) => {
  const [input, setInput] = useState('');
  const [tickers, setTickers] = useState([]);

  const addTicker = (t) => {
    const sym = (t || input).trim().toUpperCase();
    if (!sym) return;
    if (tickers.includes(sym)) return;
    if (tickers.length >= 5) return;
    setTickers([...tickers, sym]);
    setInput('');
  };

  const removeTicker = (t) => setTickers(tickers.filter(x => x !== t));

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-3">Select 4–5 tickers</h3>
      <div className="flex gap-2 mb-3">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="e.g. RELIANCE.NS"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTicker(); }}
        />
        <button onClick={() => addTicker()} className="px-4 py-2 bg-blue-600 text-white rounded">Add</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {tickers.map(t => (
          <span key={t} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
            {t}
            <button className="ml-2 text-blue-700" onClick={() => removeTicker(t)}>×</button>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {DEFAULT_SUGGESTIONS.map(s => (
          <button key={s} onClick={() => addTicker(s)} className="px-3 py-1 border rounded text-sm hover:bg-gray-50">
            {s}
          </button>
        ))}
      </div>

      <button
        onClick={() => onAnalyze(tickers)}
        disabled={tickers.length < 4}
        className={`px-5 py-2 rounded font-semibold ${tickers.length < 4 ? 'bg-gray-300 text-gray-600' : 'bg-green-600 text-white'}`}
      >
        Analyze
      </button>
    </div>
  );
};

export default TickerSelector;


