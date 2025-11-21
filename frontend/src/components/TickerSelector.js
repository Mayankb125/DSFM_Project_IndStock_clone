import React, { useState } from 'react';

const DEFAULT_SUGGESTIONS = [
  'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HDFCBANK.NS', 'ICICIBANK.NS',
  'SBIN.NS', 'LT.NS', 'BHARTIARTL.NS', 'ITC.NS', 'AXISBANK.NS'
];

const TickerSelector = ({ onAnalyze }) => {
  const [input, setInput] = useState('');
  const [tickers, setTickers] = useState([]);
  const [alpha, setAlpha] = useState(0.3);
  const [windowSize, setWindowSize] = useState(60);
  const [useNews, setUseNews] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

      <div className="mt-4">
        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm">α (sentiment weight):</label>
          <input type="range" min="0" max="1" step="0.05" value={alpha} onChange={(e) => setAlpha(parseFloat(e.target.value))} />
          <span className="text-sm w-12">{alpha.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm">Window (days):</label>
          <input type="range" min="20" max="252" step="1" value={windowSize} onChange={(e) => setWindowSize(parseInt(e.target.value))} />
          <span className="text-sm w-12">{windowSize}</span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <label className="text-sm">Use news for sentiment:</label>
          <input type="checkbox" checked={useNews} onChange={(e) => setUseNews(e.target.checked)} />
        </div>

        <div className="flex gap-2 mb-3">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border rounded px-3 py-2" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border rounded px-3 py-2" />
        </div>

        <button
          onClick={() => onAnalyze({ tickers, alpha, windowSize, useNews, start: startDate || undefined, end: endDate || undefined })}
          disabled={tickers.length < 2}
          className={`px-5 py-2 rounded font-semibold ${tickers.length < 2 ? 'bg-gray-300 text-gray-600' : 'bg-green-600 text-white'}`}
        >
          Analyze
        </button>
      </div>
    </div>
  );
};

export default TickerSelector;


