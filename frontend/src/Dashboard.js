import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import TickerSelector from './components/TickerSelector';
import Heatmap from './components/Heatmap';
import SentimentCards from './components/SentimentCards';
import PredictionBadges from './components/PredictionBadges';
import Sparkline from './components/Sparkline';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [indices, setIndices] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [selectedTab, setSelectedTab] = useState('Hot Stocks');
  // no chart on home page

  // Analysis state
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const API_URL = 'http://localhost:5000/api';

  // Fetch data from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stocks (your 3 chosen stocks)
      const stocksResponse = await fetch(`${API_URL}/stocks`);
      const stocksData = await stocksResponse.json();
      
      // Fetch indices (Nifty 50 + Sensex)
      const indicesResponse = await fetch(`${API_URL}/index`);
      const indicesData = await indicesResponse.json();
      
      if (stocksData.success) {
        setStocks(stocksData.data);
        setLastUpdate(stocksData.lastUpdate);
      }
      
      if (indicesData.success) {
        setIndices(indicesData.data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const runAnalysis = async (tickers) => {
    setAnalysis(null);
    setAnalysisError('');
    setAnalysisLoading(true);
    try {
      const body = (obj) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
      const start = undefined; // optional
      const end = undefined; // optional

      // Prices and returns
      const pricesRes = await fetch(`${API_URL}/prices`, body({ tickers, start, end }));
      const prices = await pricesRes.json();
      if (!prices.success) throw new Error(prices.message || 'Prices failed');

      // Correlations
      const corrRes = await fetch(`${API_URL}/correlations`, body({ tickers, start, end }));
      const correlations = await corrRes.json();
      if (!correlations.success) throw new Error(correlations.message || 'Correlations failed');

      // RMT
      const T = (prices.returns?.[tickers[0]] || []).length;
      const N = tickers.length;
      const rmtRes = await fetch(`${API_URL}/rmt`, body({ correlation: correlations.correlation, T, N }));
      const rmt = await rmtRes.json();
      if (!rmt.success) throw new Error(rmt.message || 'RMT failed');

      // Sentiment-adjusted correlations (includes news + sentiment)
      const adjRes = await fetch(`${API_URL}/sentiment-adjusted-corr`, body({ tickers, start, end, lookback_days: 7, alpha: 0.3 }));
      const adjusted = await adjRes.json();
      if (!adjusted.success) throw new Error(adjusted.message || 'Adjusted corr failed');

      // Predictions
      const predRes = await fetch(`${API_URL}/predict`, body({ tickers, start, end, lookback_days: 7 }));
      const predictions = await predRes.json();
      if (!predictions.success) throw new Error(predictions.message || 'Predict failed');

      const result = {
        tickers,
        prices: prices.prices,
        returns: prices.returns,
        correlations: {
          tickers: correlations.tickers,
          raw: correlations.correlation
        },
        rmt: {
          eigenvalues: rmt.eigenvalues,
          lambda_min: rmt.lambda_min,
          lambda_max: rmt.lambda_max,
          denoised: rmt.denoised
        },
        sentiment: adjusted.sentiment,
        adjusted_correlation: {
          tickers: adjusted.tickers,
          raw: adjusted.raw,
          adjusted: adjusted.adjusted,
          examples: adjusted.examples
        },
        predictions: predictions.predictions
      };
      setAnalysis(result);
    } catch (err) {
      console.error('Analysis error', err);
      setAnalysisError(err.message || 'Error');
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const tabs = ['My WatchList', 'Hot Stocks', 'Most Traded', 'Top Gainers', 'Top Losers'];

  // Get stock short name from symbol
  const getStockShortName = (symbol) => {
    return symbol.replace('.NS', '').replace('.BO', '');
  };

  // Get stock initial for logo
  const getStockInitial = (name, symbol) => {
    // Try to get first letters of company name
    if (name && name !== 'N/A') {
      const words = name.split(' ');
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    // Fallback to symbol
    return getStockShortName(symbol).substring(0, 2);
  };

  // Generate random color for stock logo based on symbol
  const getStockColor = (symbol) => {
    const colors = [
      'bg-blue-600',
      'bg-purple-600',
      'bg-green-600',
      'bg-red-600',
      'bg-orange-600',
      'bg-indigo-600',
      'bg-pink-600',
      'bg-teal-600'
    ];
    // Simple hash function to get consistent color for same symbol
    const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Filter/sort stocks based on selected tab
  const getFilteredStocks = () => {
    const list = [...stocks];
    switch (selectedTab) {
      case 'Top Gainers':
        return list
          .filter(s => typeof s.changePercent === 'number')
          .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
      case 'Top Losers':
        return list
          .filter(s => typeof s.changePercent === 'number')
          .sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));
      case 'Most Traded':
        return list
          .filter(s => typeof s.volume === 'number')
          .sort((a, b) => (b.volume || 0) - (a.volume || 0));
      case 'Hot Stocks':
        return list
          .filter(s => typeof s.changePercent === 'number')
          .sort((a, b) => Math.abs(b.changePercent || 0) - Math.abs(a.changePercent || 0));
      case 'My WatchList':
      default:
        return list;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">IND</span>
                </div>
                <span className="text-xl font-bold">INDstocks</span>
              </div>
              
              <div className="hidden md:flex items-center gap-4">
                <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full font-medium text-sm">
                  INDstocks
                </button>
                <button className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-full font-medium text-sm">
                  IPO
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={fetchData}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <span className="text-sm text-gray-500">
                {lastUpdate ? `Updated: ${new Date(lastUpdate).toLocaleTimeString()}` : 'Loading...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="text-sm text-gray-500">
            Home → <span className="text-gray-900">IND Stocks</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2">
            {/* Selection & Analyze */}
            <div className="mb-6">
              <TickerSelector onAnalyze={runAnalysis} />
              {analysisLoading && <div className="mt-2 text-sm text-gray-600">Analyzing…</div>}
              {analysisError && <div className="mt-2 text-sm text-red-600">{analysisError}</div>}
            </div>

            {analysis && (
              <div className="space-y-6 mb-8">
                {/* Heatmaps */}
                <div className="flex flex-col gap-4">
                  <Heatmap title="Correlation (raw)" tickers={analysis.correlations.tickers} matrix={analysis.correlations.raw} />
                  <Heatmap title="Correlation (sentiment-adjusted)" tickers={analysis.adjusted_correlation.tickers} matrix={analysis.adjusted_correlation.adjusted} />
                </div>

                {/* Predictions */}
                <PredictionBadges predictions={analysis.predictions} />

                {/* Sentiment */}
                <SentimentCards sentiments={analysis.sentiment} examples={analysis.adjusted_correlation.examples} />

                {/* Mini sparklines */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-3">Mini Price Sparklines</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {analysis.tickers.map(t => (
                      <div key={t} className="flex items-center justify-between border rounded-xl p-3">
                        <div className="font-semibold">{t}</div>
                        <Sparkline data={(analysis.prices?.[t] || []).slice(-60)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* Removed promo hero section */}

            {/* Chart removed from home page */}

            {/* Indian Share Market Today */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Indian share market today</h2>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`px-6 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                      selectedTab === tab
                        ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Stock Cards - Horizontal Scroll (YOUR 3 STOCKS) */}
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {loading ? (
                    // Loading skeletons
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="flex flex-col items-center p-4 bg-gray-50 rounded-xl animate-pulse">
                        <div className="w-16 h-16 bg-gray-300 rounded-full mb-3"></div>
                        <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded w-16 mb-1"></div>
                        <div className="h-4 bg-gray-300 rounded w-12"></div>
                      </div>
                    ))
                  ) : getFilteredStocks().length > 0 ? (
                    getFilteredStocks().map((stock) => (
                      <div
                        key={stock.symbol}
                        onClick={() => navigate(`/stock/${encodeURIComponent(stock.symbol)}`)}
                        className={`flex flex-col items-center p-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer min-w-[140px]`}
                      >
                        {/* Stock Logo/Initial - Dynamic Color */}
                        <div className={`w-16 h-16 ${getStockColor(stock.symbol)} rounded-full flex items-center justify-center mb-3`}>
                          <span className="text-white font-bold text-sm">
                            {getStockInitial(stock.name, stock.symbol)}
                          </span>
                        </div>

                        {/* Stock Symbol */}
                        <div className="text-center mb-2">
                          <p className="font-semibold text-gray-900 text-sm">
                            {getStockShortName(stock.symbol)}
                          </p>
                        </div>

                        {/* Price */}
                        <p className="font-bold text-gray-900 text-lg">
                          ₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>

                        {/* Change */}
                        <div className={`flex items-center gap-1 text-sm font-medium ${
                          stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stock.changePercent >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No stock data available
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center mt-6">
                <button className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-full font-semibold hover:bg-blue-50 transition-colors">
                  Share Market Today
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-8 flex gap-6 border-b border-gray-200">
              <button className="px-4 py-3 text-blue-600 border-b-2 border-blue-600 font-semibold">
                Invest
              </button>
              <button className="px-4 py-3 text-gray-600 hover:text-gray-900 font-medium">
                My Stocks (INDstocks)
              </button>
              <button className="px-4 py-3 text-gray-600 hover:text-gray-900 font-medium">
                Orders
              </button>
              <button className="px-4 py-3 text-gray-600 hover:text-gray-900 font-medium">
                Watchlists
              </button>
            </div>
          </div>

          {/* Live from the Market - Right Sidebar (YOUR INDICES) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Live from the Market</h3>

              <div className="space-y-4">
                {loading ? (
                  // Loading skeletons
                  [...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border-2 border-gray-200 p-6 animate-pulse">
                      <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                      <div className="h-6 bg-gray-300 rounded w-32 mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                    </div>
                  ))
                ) : (
                  <>
                    {/* Nifty 50 - Dynamic Data */}
                    {indices.nifty50 && (
                      <div className={`bg-white rounded-xl border-2 ${
                        indices.nifty50.changePercent >= 0 ? 'border-green-200' : 'border-red-200'
                      } p-6 hover:shadow-md transition-shadow`}>
                        <div className="text-sm text-gray-600 mb-2">{indices.nifty50.name}</div>
                        <div className="text-2xl font-bold text-gray-900 mb-2">
                          ₹{indices.nifty50.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className={`flex items-center gap-2 ${
                          indices.nifty50.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {indices.nifty50.changePercent >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="font-semibold">
                            {indices.nifty50.change.toFixed(2)} ({indices.nifty50.changePercent >= 0 ? '▲' : '▼'}{Math.abs(indices.nifty50.changePercent).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Sensex - Dynamic Data */}
                    {indices.sensex && (
                      <div className={`bg-white rounded-xl border-2 ${
                        indices.sensex.changePercent >= 0 ? 'border-green-200' : 'border-red-200'
                      } p-6 hover:shadow-md transition-shadow`}>
                        <div className="text-sm text-gray-600 mb-2">{indices.sensex.name}</div>
                        <div className="text-2xl font-bold text-gray-900 mb-2">
                          ₹{indices.sensex.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className={`flex items-center gap-2 ${
                          indices.sensex.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {indices.sensex.changePercent >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="font-semibold">
                            {indices.sensex.change.toFixed(2)} ({indices.sensex.changePercent >= 0 ? '▲' : '▼'}{Math.abs(indices.sensex.changePercent).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Show message if no data */}
                    {!indices.nifty50 && !indices.sensex && (
                      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 text-center text-gray-500">
                        No index data available
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Info Box */}
              <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Tracking:</strong> {stocks.length} stocks + 2 indices
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Data updates automatically every 30 seconds
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;