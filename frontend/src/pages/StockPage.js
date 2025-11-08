import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import CandlestickChart from '../components/CandlestickChart';
import Sparkline from '../components/Sparkline';

const API_URL = 'http://localhost:5000/api';

const StockPage = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [indices, setIndices] = useState({});
  const [loading, setLoading] = useState(true);

  const getShort = (s) => s.replace('.NS','').replace('.BO','');

  useEffect(() => {
    const fetchLists = async () => {
      try {
        setLoading(true);
        const [sRes, iRes] = await Promise.all([
          fetch(`${API_URL}/stocks`),
          fetch(`${API_URL}/index`)
        ]);
        const sData = await sRes.json();
        const iData = await iRes.json();
        if (sData.success) setStocks(sData.data);
        if (iData.success) setIndices(iData.data);
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchLists();
  }, []);

  const otherStocks = stocks.filter(s => s.symbol !== symbol);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <button className="text-blue-600 font-semibold" onClick={() => navigate('/')}>← Back</button>
          <div className="text-lg font-bold">{symbol}</div>
          <div />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar list */}
        <aside className="lg:col-span-1">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-semibold mb-3">Explore</h3>
            <div className="space-y-2 max-h-[70vh] overflow-auto">
              {loading ? (
                [...Array(6)].map((_,i)=>(<div key={i} className="h-10 bg-gray-100 rounded animate-pulse"/>))
              ) : (
                stocks.map(s => (
                  <button
                    key={s.symbol}
                    onClick={() => navigate(`/stock/${encodeURIComponent(s.symbol)}`)}
                    className={`w-full text-left px-3 py-2 rounded border ${s.symbol===symbol?'border-blue-300 bg-blue-50':'border-gray-200 hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{s.name || getShort(s.symbol)}</div>
                      <div className="text-sm font-semibold">₹{s.price.toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${s.changePercent>=0?'text-green-600':'text-red-600'}`}>
                      {s.changePercent>=0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                      <span>{s.changePercent>=0?'+':''}{s.changePercent.toFixed(2)}%</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Indices cards */}
          <div className="mt-4 space-y-3">
            {indices.nifty50 && (
              <div className="bg-white rounded-2xl p-4 border">
                <div className="text-xs text-gray-600">{indices.nifty50.name}</div>
                <div className="text-lg font-bold">₹{indices.nifty50.price.toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
              </div>
            )}
            {indices.sensex && (
              <div className="bg-white rounded-2xl p-4 border">
                <div className="text-xs text-gray-600">{indices.sensex.name}</div>
                <div className="text-lg font-bold">₹{indices.sensex.price.toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
              </div>
            )}
          </div>
        </aside>

        {/* Main chart */}
        <main className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-semibold">{symbol} — Chart</h2>
            </div>
            <CandlestickChart symbol={symbol} />
          </div>

          {/* Other stocks quick view */}
          {otherStocks.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h3 className="text-lg font-semibold mb-2">Other stocks</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {otherStocks.slice(0,6).map(s => (
                  <button key={s.symbol} onClick={() => navigate(`/stock/${encodeURIComponent(s.symbol)}`)} className="border rounded-xl p-3 text-left hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-medium text-sm">{getShort(s.symbol)}</div>
                      <div className="text-sm font-semibold">₹{s.price.toLocaleString('en-IN',{maximumFractionDigits:2})}</div>
                    </div>
                    <Sparkline data={[s.previousClose, s.price]} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default StockPage;


