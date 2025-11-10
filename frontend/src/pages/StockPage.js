import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, ChevronLeft, MessageSquare, Moon, User, Search, LayoutGrid, ShoppingCart, Briefcase, Target, Gavel, Wallet, FileText, LogOut, Settings, Bell, Maximize2, MoreVertical } from 'lucide-react';
import CandlestickChart from '../components/CandlestickChart';
import ChartDrawToolbar from '../components/ChartDrawToolbar';
import ChartCanvasOverlay from '../components/ChartCanvasOverlay';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const StockPage = () => {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [indices, setIndices] = useState({});
  const [currentStock, setCurrentStock] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('chart');
  const [activeDrawTool, setActiveDrawTool] = useState('select');
  const [annotations, setAnnotations] = useState([]);
  const [chartDimensions, setChartDimensions] = useState({ width: 0, height: 0 });

  const getShort = (s) => s.replace('.NS','').replace('.BO','');

  // Get stock initial for logo
  const getStockInitial = (name, symbol) => {
    if (name && name !== 'N/A') {
      const words = name.split(' ');
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    return getShort(symbol).substring(0, 2);
  };

  // Generate color for stock logo
  const getStockColor = (symbol) => {
    const colors = ['bg-blue-600', 'bg-purple-600', 'bg-green-600', 'bg-red-600', 'bg-orange-600', 'bg-indigo-600', 'bg-pink-600', 'bg-teal-600'];
    const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [sRes, iRes, stockRes] = await Promise.all([
          fetch(`${API_URL}/stocks`),
          fetch(`${API_URL}/index`),
          fetch(`${API_URL}/stocks/${encodeURIComponent(symbol)}`)
        ]);
        const sData = await sRes.json();
        const iData = await iRes.json();
        const stockData = await stockRes.json();
        
        if (sData.success) setStocks(sData.data);
        if (iData.success) setIndices(iData.data);
        if (stockData.success) setCurrentStock(stockData.data);
      } catch (e) {
        console.error('Error fetching data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [symbol]);

  // Load annotations from localStorage when symbol changes
  useEffect(() => {
    if (symbol) {
      try {
        const saved = localStorage.getItem(`annotations_${symbol}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAnnotations(parsed);
        } else {
          setAnnotations([]);
        }
      } catch (e) {
        console.error('Error loading annotations:', e);
        setAnnotations([]);
      }
    }
  }, [symbol]);

  // Measure chart container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      const chartContainer = document.querySelector('.chart-container');
      if (chartContainer) {
        setChartDimensions({
          width: chartContainer.clientWidth,
          height: chartContainer.clientHeight || 600,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    // Also update after a short delay to ensure chart is rendered
    const timeout = setTimeout(updateDimensions, 500);

    return () => {
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timeout);
    };
  }, [activeTab, symbol]);

  const navItems = [
    { icon: LayoutGrid, label: 'WATCHLIST', active: true },
    { icon: ShoppingCart, label: 'ORDERS' },
    { icon: Briefcase, label: 'HOLDINGS' },
    { icon: Target, label: 'POSITIONS' },
    { icon: Gavel, label: 'BIDS' },
    { icon: Wallet, label: 'FUNDS' },
    { icon: FileText, label: 'BILL' },
    { icon: LogOut, label: 'LOGOUT' },
  ];

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="bg-[#0a0a0a] border-r border-gray-800 flex transition-all duration-300">
        {/* Navigation Icons - Left Side */}
        <div className="flex flex-col items-center w-20 border-r border-gray-800">
          {navItems.map((item, index) => (
            <div
              key={index}
              className={`w-full flex flex-col items-center py-3 cursor-pointer transition ${
                item.active ? 'bg-gray-800 text-cyan-400' : 'text-gray-400 hover:bg-gray-900'
              }`}
            >
              <item.icon size={18} />
              <span className="text-[9px] mt-1">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Stock List - Right Side */}
        <div className={`overflow-hidden flex flex-col transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-0'}`}>
          <div className="p-3 border-b border-gray-800">
            <h3 className="text-xs text-gray-400 mb-3">My Stocks</h3>
            <div className="flex flex-wrap gap-2">
              <button className="px-3 py-1 bg-cyan-500 text-black rounded text-xs">
                Explore
              </button>
              <button className="px-3 py-1 bg-gray-800 text-white rounded text-xs">
                All Stocks
              </button>
              <button className="px-3 py-1 bg-gray-800 text-white rounded text-xs">
                Top Gainers
              </button>
              <button className="px-3 py-1 bg-gray-800 text-white rounded text-xs">
                Top Losers
              </button>
              <button className="px-3 py-1 bg-gray-800 text-white rounded text-xs">
                Most Active
              </button>
            </div>
          </div>

          <div className="px-3 py-2 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input
                type="text"
                placeholder="Search Stocks, FnO"
                className="w-full bg-gray-900 text-white pl-8 pr-3 py-1.5 rounded text-xs border border-gray-700 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
              {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="px-3 py-2.5 border-b border-gray-800">
                  <div className="h-12 bg-gray-800 rounded animate-pulse" />
                </div>
              ))
            ) : (
              stocks.map((stock) => (
                <div
                  key={stock.symbol}
                  onClick={() => navigate(`/stock/${encodeURIComponent(stock.symbol)}`)}
                  className={`px-3 py-2.5 border-b border-gray-800 hover:bg-gray-900 cursor-pointer ${
                    stock.symbol === symbol ? 'bg-gray-900' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-2 flex-1">
                      <div className={`w-6 h-6 ${getStockColor(stock.symbol)} rounded-full flex items-center justify-center text-xs text-white`}>
                        {getStockInitial(stock.name, stock.symbol)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-white truncate">{stock.name || getShort(stock.symbol)}</div>
                        <div className="text-[10px] text-gray-500">{getShort(stock.symbol)}</div>
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="text-xs text-white">₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                      <div className={`text-[10px] flex items-center gap-0.5 justify-end ${stock.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stock.changePercent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                </div>
                ))
              )}
          </div>
            </div>
          </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-[#0a0a0a] border-b border-gray-800 px-4 py-2">
          <div className="flex items-center justify-between">
            {/* Left side - Index info */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="bg-white text-black px-2 py-1 rounded">
                  <span className="text-xs">IND</span>
                </div>
                <div>
            {indices.nifty50 && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">NIFTY 50</span>
                        <span className={`text-xs ${indices.nifty50.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {indices.nifty50.change >= 0 ? '+' : ''}{indices.nifty50.change.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{indices.nifty50.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                        <span className={`text-xs ${indices.nifty50.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {indices.nifty50.changePercent >= 0 ? '▲' : '▼'} {Math.abs(indices.nifty50.changePercent).toFixed(2)}%
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {indices.sensex && (
                <div className="border-l border-gray-700 pl-6">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">SENSEX</span>
                    <span className={`text-xs ${indices.sensex.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {indices.sensex.change >= 0 ? '+' : ''}{indices.sensex.change.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{indices.sensex.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    <span className={`text-xs ${indices.sensex.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {indices.sensex.changePercent >= 0 ? '▲' : '▼'} {Math.abs(indices.sensex.changePercent).toFixed(2)}%
                    </span>
                  </div>
              </div>
            )}

              <button 
                className="p-1 hover:bg-gray-800 rounded"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                <ChevronLeft size={16} className={isSidebarOpen ? '' : 'rotate-180'} />
              </button>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-3 py-1.5 border border-green-500 text-green-500 rounded hover:bg-green-500/10">
                <MessageSquare size={14} />
                <span className="text-xs">Share Feedback</span>
              </button>
              <button className="px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 text-xs">
                Enter Flash Mode
              </button>
              <div className="flex items-center gap-2 ml-2">
                <Moon size={16} className="text-gray-400" />
                <label className="relative inline-block w-10 h-5">
                  <input type="checkbox" className="opacity-0 w-0 h-0 peer" />
                  <span className="absolute cursor-pointer inset-0 bg-gray-600 rounded-full transition peer-checked:bg-green-500"></span>
                  <span className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition peer-checked:translate-x-5"></span>
                </label>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-gray-400">Trading Stopbook</span>
                <span className="text-xs">₹0.00</span>
              </div>
              <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center">
                <User size={16} className="text-black" />
              </div>
            </div>
          </div>
        </header>

        {/* Chart Area */}
        <div className="flex-1 bg-[#0a0a0a] flex flex-col">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <div className="flex items-center gap-4">
              <button
                className={`px-3 py-1 text-sm ${activeTab === 'chart' ? 'text-white border-b-2 border-cyan-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('chart')}
              >
                Chart
              </button>
              <button
                className={`px-3 py-1 text-sm ${activeTab === 'overview' ? 'text-white border-b-2 border-cyan-500' : 'text-gray-400'}`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-2 py-1 bg-gray-800 rounded text-xs flex items-center gap-1">
                Default
                <ChevronLeft size={12} className="rotate-90" />
              </button>
              <button className="p-1 hover:bg-gray-800 rounded">
                <Settings size={16} />
              </button>
              <button className="p-1 hover:bg-gray-800 rounded">
                <Bell size={16} />
              </button>
              <button className="p-1 hover:bg-gray-800 rounded">
                <Maximize2 size={16} />
              </button>
              <button className="p-1 hover:bg-gray-800 rounded">
                <MoreVertical size={16} />
              </button>
            </div>
          </div>

          {/* Chart Header */}
          {currentStock && (
            <div className="px-4 py-3 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <h2 className="text-lg">{getShort(currentStock.symbol)} - F - NSE</h2>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <span className="text-xs text-gray-400">O: {currentStock.open.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    <span className="text-xs text-gray-400">H: {currentStock.dayHigh.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    <span className="text-xs text-gray-400">L: {currentStock.dayLow.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    <span className="text-xs text-gray-400">C: {currentStock.previousClose.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    <span className={`text-xs ${currentStock.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {currentStock.changePercent >= 0 ? '+' : ''}{currentStock.changePercent.toFixed(2)}%
                    </span>
                    <span className="text-xs text-gray-400">Volume: {currentStock.volume.toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm">{currentStock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                  <div className={`text-sm ${currentStock.changePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {currentStock.change >= 0 ? '+' : ''}{currentStock.change.toFixed(2)}
                  </div>
                    </div>
              </div>
            </div>
          )}

          {/* Chart Tools */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#0f0f0f] border-b border-gray-800">
            <div className="flex items-center gap-3">
              <button className="px-3 py-1 bg-gray-800 rounded text-xs">1m</button>
              <button className="px-3 py-1 hover:bg-gray-800 rounded text-xs text-gray-400">3m</button>
              <button className="px-2 py-1 hover:bg-gray-800 rounded">
                <TrendingUp size={14} />
              </button>
              <button className="px-2 py-1 hover:bg-gray-800 rounded text-xs">
                Indicators
              </button>
              <button className="px-2 py-1 hover:bg-gray-800 rounded">
                <Settings size={14} />
              </button>
              <button className="px-2 py-1 hover:bg-gray-800 rounded">
                ⟲
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 relative bg-[#0a0a0a] chart-container overflow-hidden">
            {activeTab === 'chart' ? (
              <div className="h-full relative w-full" style={{ position: 'relative', minHeight: '400px' }}>
                {/* Toolbar - positioned relative to chart container, not affected by chart loading */}
                <div 
                  className="absolute"
                  style={{ 
                    left: '16px', 
                    top: '50%', 
                    transform: 'translateY(-50%)',
                    zIndex: 100,
                    pointerEvents: 'auto'
                  }}
                >
                  <ChartDrawToolbar
                    activeTool={activeDrawTool}
                    onSelectTool={setActiveDrawTool}
                  />
                </div>
                <CandlestickChart symbol={symbol} />
                {chartDimensions.width > 0 && chartDimensions.height > 0 && (
                  <ChartCanvasOverlay
                    width={chartDimensions.width}
                    height={chartDimensions.height}
                    activeTool={activeDrawTool}
                    annotations={annotations}
                    setAnnotations={setAnnotations}
                    symbol={symbol}
                  />
                )}
              </div>
            ) : (
              <div className="p-6 text-gray-400">
                <h3 className="text-lg mb-4">Overview</h3>
                {currentStock && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Market Cap</div>
                      <div className="text-sm">₹{(currentStock.marketCap / 1e12).toFixed(2)}T</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">P/E Ratio</div>
                      <div className="text-sm">{currentStock.pe}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Sector</div>
                      <div className="text-sm">{currentStock.sector}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">52W High</div>
                      <div className="text-sm">₹{currentStock.fiftyTwoWeekHigh.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">52W Low</div>
                      <div className="text-sm">₹{currentStock.fiftyTwoWeekLow.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Volume</div>
                      <div className="text-sm">{currentStock.volume.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <div className="flex gap-6">
              <span>1y</span>
              <span>1m</span>
              <span>5m</span>
              <span>3m</span>
              <span>6m</span>
              <span>5d</span>
              <span>1d</span>
            </div>
            <div className="flex items-center gap-4">
              <span>{new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</span>
              <button className="hover:text-white">%</button>
              <button className="hover:text-white">Log</button>
              <button className="hover:text-white">Auto</button>
              <button className="hover:text-white">⊕</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockPage;


