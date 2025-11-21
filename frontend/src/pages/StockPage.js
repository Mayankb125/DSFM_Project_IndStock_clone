import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TrendingUp, TrendingDown, ChevronLeft, ChevronDown, MessageSquare, Moon, User, Search, LayoutGrid, ShoppingCart, Briefcase, Target, Newspaper, Wallet, BarChart3, LogOut, Settings, Bell, Maximize2, MoreVertical, Star, Zap, Terminal as TerminalIcon, Pencil, Type, Camera, Sparkles, GitCompare, Split, Volume2, Code, Image, LayoutPanelLeft, Columns } from 'lucide-react';
import CandlestickChart from '../components/CandlestickChart';
import Overview from './Overview';

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
  const [activeCategory, setActiveCategory] = useState('explore');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartPeriod, setChartPeriod] = useState('max');
  const [chartType, setChartType] = useState('candlestick');
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [walletMoneyInOpen, setWalletMoneyInOpen] = useState(false);
  const [walletMoneyOutOpen, setWalletMoneyOutOpen] = useState(false);
  
  // Chart toolbar dropdown states
  const [timeIntervalOpen, setTimeIntervalOpen] = useState(false);
  const [volumeMenuOpen, setVolumeMenuOpen] = useState(false);
  const [drawMenuOpen, setDrawMenuOpen] = useState(false);
  const [indicatorMenuOpen, setIndicatorMenuOpen] = useState(false);
  const [compareMenuOpen, setCompareMenuOpen] = useState(false);
  const [layoutMenuOpen, setLayoutMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [selectedTimeInterval, setSelectedTimeInterval] = useState('1m');
  const [selectedDrawTool, setSelectedDrawTool] = useState(null);

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

  // Filter and sort stocks based on active filter and search
  const getFilteredStocks = () => {
    let filtered = [...stocks];
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(stock => 
        stock.name.toLowerCase().includes(query) ||
        stock.symbol.toLowerCase().includes(query) ||
        getShort(stock.symbol).toLowerCase().includes(query)
      );
    }
    
    // Apply category filters
    switch (activeFilter) {
      case 'gainers':
        filtered = filtered.filter(s => s.changePercent > 0)
                          .sort((a, b) => b.changePercent - a.changePercent);
        break;
      case 'losers':
        filtered = filtered.filter(s => s.changePercent < 0)
                          .sort((a, b) => a.changePercent - b.changePercent);
        break;
      case 'hot':
        filtered = filtered.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
        break;
      case 'all':
      default:
        // Keep original order or sort by name
        break;
    }
    
    return filtered;
  };

  const navItems = [
    { icon: Star, label: 'WATCHLIST', active: true },
    { icon: BarChart3, label: 'STOCKS' },
    { icon: Target, label: 'F&O' },
    { icon: TrendingUp, label: 'IPO' },
    { icon: Wallet, label: 'WALLET', onClick: () => setIsWalletOpen(!isWalletOpen) },
    { icon: Newspaper, label: 'NEWS' },
    { icon: BarChart3, label: 'P&L' },
    { icon: LogOut, label: 'LOGOUT' },
  ];

  return (
    <div className="flex h-screen bg-[#0d0d0d] text-white overflow-hidden">
      {/* Sidebar */}
      <div className="bg-[#151515] border-r border-gray-800/50 flex transition-all duration-300 shadow-xl h-full overflow-y-auto">
        {/* Navigation Icons - Left Side */}
        <div className="flex flex-col items-center w-16 border-r border-gray-800/50 bg-[#0f0f0f]">
          {navItems.map((item, index) => (
            <div
              key={index}
              onClick={item.onClick}
              className={`w-full flex flex-col items-center py-4 cursor-pointer transition ${
                item.active ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500' : 'text-gray-400 hover:bg-gray-800/50'
              }`}
            >
              <item.icon size={20} />
              <span className="text-[8px] mt-1.5 font-medium uppercase tracking-wider">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Stock List / Wallet Panel - Right Side */}
        <div className={`overflow-hidden flex flex-col transition-all duration-300 bg-[#151515] ${isSidebarOpen ? 'w-72' : 'w-0'}`}>
          {!isWalletOpen ? (
            <>
              {/* Categories */}
              <div className="p-3 border-b border-gray-800/50">
                <div className="flex gap-2 mb-3">
                  <button 
                    onClick={() => setActiveCategory('myStocks')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                      activeCategory === 'myStocks' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    My Stocks
                  </button>
                  <button 
                    onClick={() => setActiveCategory('explore')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                      activeCategory === 'explore' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    Explore
                  </button>
                  <button 
                    onClick={() => setActiveCategory('watchlist')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                      activeCategory === 'watchlist' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    }`}
                  >
                    Watchlist
                  </button>
                </div>
                
                {/* Filter Chips */}
                <div className="flex flex-wrap gap-2">
                  <button 
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      activeFilter === 'all' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800/60 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    All Stocks
                  </button>
                  <button 
                    onClick={() => setActiveFilter('gainers')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      activeFilter === 'gainers' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800/60 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    Top Gainers
                  </button>
                  <button 
                    onClick={() => setActiveFilter('losers')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      activeFilter === 'losers' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800/60 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    Top Losers
                  </button>
                  <button 
                    onClick={() => setActiveFilter('hot')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                      activeFilter === 'hot' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-800/60 text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    Hot S...
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="px-3 py-3 border-b border-gray-800/50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                    type="text"
                    placeholder="Search Stocks, F&O"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-900/50 text-white pl-10 pr-3 py-2 rounded-lg text-sm border border-gray-800/50 focus:border-blue-600/50 focus:bg-gray-900/70 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Stock List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <div key={i} className="px-3 py-3 border-b border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gray-700 rounded-full animate-pulse" />
                        <div className="flex-1">
                          <div className="h-3 bg-gray-700 rounded w-3/4 mb-2 animate-pulse" />
                          <div className="h-2 bg-gray-700 rounded w-1/2 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : getFilteredStocks().length > 0 ? (
                  getFilteredStocks().map((stock) => (
                    <div
                      key={stock.symbol}
                      onClick={() => navigate(`/stock/${stock.symbol}`)}
                      className={`px-3 py-3 border-b border-gray-800/30 hover:bg-gray-800/30 cursor-pointer transition ${
                        stock.symbol === symbol ? 'bg-gray-800/50 border-l-2 border-blue-500 shadow-sm' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-9 h-9 ${getStockColor(stock.symbol)} rounded-full flex items-center justify-center text-sm font-semibold text-white flex-shrink-0`}>
                            {getStockInitial(stock.name, stock.symbol)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-white font-medium truncate">{stock.name || getShort(stock.symbol)}</div>
                            <div className="text-xs text-gray-400 mt-0.5">{getShort(stock.symbol)}</div>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm text-white font-semibold">₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
                          <div className={`text-xs font-medium mt-0.5 ${
                            stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {stock.changePercent >= 0 ? '▲' : '▼'} {Math.abs(stock.changePercent).toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-8 text-center text-gray-500">
                    <Search size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No stocks found</p>
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Wallet Panel Content */
            <>
              {/* Header */}
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <button 
                  onClick={() => setIsWalletOpen(false)}
                  className="text-gray-400 hover:text-white transition"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>

              {/* Trading Balance Section */}
              <div className="p-6 border-b border-gray-800">
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-1">Trading Balance</div>
                  <div className="text-4xl font-bold">₹0.00</div>
                </div>
                <div className="text-sm text-gray-400 mb-4">
                  Unsettled funds: <span className="text-white">₹0.00</span>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition">
                    Add Money
                  </button>
                  <button className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white font-semibold transition border border-gray-700">
                    Withdraw
                  </button>
                </div>
              </div>

              {/* InvestBoost MTF Section */}
              <div className="p-6 border-b border-gray-800">
                <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center relative">
                        <div className="absolute inset-2 bg-yellow-500 rounded-full" />
                        <div className="absolute inset-3 bg-yellow-400 rounded-full" />
                        <div className="absolute inset-4 bg-yellow-300 rounded-full" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-semibold mb-1">InvestBoost (MTF)</div>
                      <div className="text-sm text-green-400 mb-2">coming soon</div>
                      <div className="text-xs text-gray-400">
                        For transacting in MTF, please visit the app. It will be available on web soon.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Wallet Statement Section */}
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Wallet Statement</h3>
                  <span className="text-sm text-gray-400">(22 Nov)</span>
                </div>

                {/* Opening Balance */}
                <div className="flex items-center justify-between py-3 border-b border-gray-800/50">
                  <span className="text-sm text-gray-300">Opening Balance</span>
                  <span className="text-sm text-white">₹0.00</span>
                </div>

                {/* Money In */}
                <div className="py-3 border-b border-gray-800/50">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setWalletMoneyInOpen(!walletMoneyInOpen)}
                  >
                    <span className="text-sm text-gray-300">Money In</span>
                    <ChevronDown 
                      size={16} 
                      className={`text-gray-400 transition-transform ${walletMoneyInOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {/* Money Out */}
                <div className="py-3 border-b border-gray-800/50">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setWalletMoneyOutOpen(!walletMoneyOutOpen)}
                  >
                    <span className="text-sm text-gray-300">Money Out</span>
                    <ChevronDown 
                      size={16} 
                      className={`text-gray-400 transition-transform ${walletMoneyOutOpen ? 'rotate-180' : ''}`}
                    />
                  </div>
                </div>

                {/* Available for Trading */}
                <div className="flex items-center justify-between py-4">
                  <span className="text-sm text-green-400 font-medium">Available for trading</span>
                  <span className="text-sm text-green-400 font-semibold">₹0.00</span>
                </div>

                {/* Empty State */}
                <div className="mt-8 flex flex-col items-center justify-center py-12">
                  <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mb-4">
                    <Wallet size={32} className="text-gray-600" />
                  </div>
                  <p className="text-gray-400 text-sm">You don't have any wallet history</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[#0d0d0d] h-full overflow-hidden">
        {/* Header */}
        <header className="bg-[#111111] border-b border-gray-800/50 px-6 py-3 shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between">
            {/* Left side - Logo and Indices */}
            <div className="flex items-center gap-4">
              {/* IND Logo */}
              <div className="bg-white text-black px-3 py-2 rounded-lg font-bold text-sm shadow-md">
                IND
              </div>
              
              {/* Indices with Dropdown */}
              <div className="flex items-center gap-4 bg-[#0d0d0d] rounded-lg px-4 py-2 cursor-pointer hover:bg-[#151515] transition border border-gray-800/30">
                {/* Nifty 50 */}
                {indices.nifty50 && (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">NIFTY 50</span>
                      <span className={`text-sm font-semibold ${
                        indices.nifty50.change >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {indices.nifty50.change >= 0 ? '+' : '-'}{Math.abs(indices.nifty50.change).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white">
                        {indices.nifty50.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                      <span className={`text-xs flex items-center gap-0.5 ${
                        indices.nifty50.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {indices.nifty50.changePercent >= 0 ? '▲' : '▼'}
                        {Math.abs(indices.nifty50.changePercent).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Vertical Divider */}
                <div className="h-10 w-px bg-gray-700"></div>

                {/* Sensex */}
                {indices.sensex && (
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">SENSEX</span>
                      <span className={`text-sm font-semibold ${
                        indices.sensex.change >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {indices.sensex.change >= 0 ? '+' : '-'}{Math.abs(indices.sensex.change).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-semibold text-white">
                        {indices.sensex.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </span>
                      <span className={`text-xs flex items-center gap-0.5 ${
                        indices.sensex.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {indices.sensex.changePercent >= 0 ? '▲' : '▼'}
                        {Math.abs(indices.sensex.changePercent).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Dropdown Arrow */}
                <ChevronDown size={16} className="text-gray-400" />
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-3">
              {/* Flash Trade Button */}
              <button className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition shadow-md">
                <Zap size={16} className="text-white" />
                <span className="text-sm font-semibold text-white">Flash Trade</span>
              </button>

              {/* Trading Balance */}
              <div className="flex items-center gap-2 px-4 py-2 bg-[#0d0d0d] rounded-lg border border-gray-800/30">
                <span className="text-xs text-gray-400">Trading Balance</span>
                <span className="text-sm font-semibold text-white">₹0.00</span>
                <button className="text-blue-400 hover:text-blue-300">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                    <circle cx="6" cy="6" r="1"/>
                  </svg>
                </button>
              </div>

              {/* Profile Icon */}
              <button className="w-10 h-10 bg-cyan-500 hover:bg-cyan-600 rounded-full flex items-center justify-center transition shadow-md">
                <User size={20} className="text-white" />
              </button>
            </div>
          </div>
        </header>

        {/* Chart Area */}
        <div className="flex-1 bg-[#0a0a0a] flex flex-col overflow-hidden">
          {/* Stock Info Bar with Tab Navigation */}
          <div className="flex items-center justify-between px-4 py-1 border-b border-gray-800 flex-shrink-0">
            {/* Left: Stock Info */}
            {currentStock && (
              <div className="flex items-center gap-3">
                {/* Back Arrow */}
                <button className="p-0.5 hover:bg-gray-800 rounded">
                  <ChevronLeft size={16} className="text-gray-400" />
                </button>
                
                {/* Stock Name, Price, Change */}
                <div className="flex items-center gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-sm font-semibold text-white">{getShort(currentStock.symbol)} Ltd</h2>
                      <span className="text-xs text-gray-500">₹{currentStock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium ${
                        currentStock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {currentStock.change >= 0 ? '+' : ''}{currentStock.change.toFixed(2)} 
                        {currentStock.changePercent >= 0 ? '▲' : '▼'} {Math.abs(currentStock.changePercent).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Right: Tab Navigation */}
            <div className="flex items-center gap-4">
              <button
                className={`px-2 py-0.5 text-xs font-medium transition ${
                  activeTab === 'chart' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab('chart')}
              >
                Chart
              </button>
              <button
                className={`px-3 py-1 text-sm font-medium transition ${
                  activeTab === 'overview' ? 'text-blue-400 border-b-2 border-blue-500' : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTab('overview')}
              >
                Overview
              </button>
            </div>
          </div>

          {/* Chart Tools Bar */}
          {currentStock && activeTab === 'chart' && (
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-[#0f0f0f] flex-shrink-0">
              {/* Left: Time Intervals and Tools */}
              <div className="flex items-center gap-2">
                {/* Time Interval Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setTimeIntervalOpen(!timeIntervalOpen)}
                    className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 ${
                      selectedTimeInterval ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {selectedTimeInterval}
                    <ChevronDown size={12} />
                  </button>
                  {timeIntervalOpen && (
                    <div className="absolute top-full mt-1 left-0 bg-[#1a1a1a] border border-gray-700 rounded shadow-xl z-50 min-w-[120px]">
                      {['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '1d'].map(interval => (
                        <button
                          key={interval}
                          onClick={() => {
                            setSelectedTimeInterval(interval);
                            setTimeIntervalOpen(false);
                          }}
                          className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300"
                        >
                          {interval}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <button className="px-2.5 py-1 hover:bg-gray-800 rounded text-xs font-medium text-gray-400">3m</button>
                
                {/* Divider */}
                <div className="h-5 w-px bg-gray-700 mx-1"></div>
                
                {/* Chart Type Dropdown (Graph Icon) */}
                <div className="relative">
                  <button 
                    onClick={() => setVolumeMenuOpen(!volumeMenuOpen)}
                    className="p-1.5 hover:bg-gray-800 rounded flex items-center gap-1"
                    title="Chart Type"
                  >
                    <BarChart3 size={16} className="text-gray-400" />
                    <ChevronDown size={10} className="text-gray-500" />
                  </button>
                  {volumeMenuOpen && (
                    <div className="absolute top-full mt-1 left-0 bg-[#1a1a1a] border border-gray-700 rounded shadow-xl z-50 min-w-[180px] max-h-96 overflow-y-auto">
                      <button onClick={() => { setChartType('candlestick'); setVolumeMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${ chartType === 'candlestick' ? 'bg-gray-800 text-white' : 'text-gray-300' }`}>
                        <span className="text-yellow-500">🕯</span> Candle
                      </button>
                      <button onClick={() => { setChartType('bar'); setVolumeMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${ chartType === 'bar' ? 'bg-gray-800 text-white' : 'text-gray-300' }`}>
                        <BarChart3 size={14} className="text-gray-400" /> Bar
                      </button>
                      <button onClick={() => { setChartType('line'); setVolumeMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${ chartType === 'line' ? 'bg-gray-800 text-white' : 'text-gray-300' }`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <polyline points="3 17 9 11 13 15 21 7"></polyline>
                        </svg>
                        Line
                      </button>
                      <button onClick={() => { setChartType('area'); setVolumeMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${ chartType === 'area' ? 'bg-gray-800 text-white' : 'text-gray-300' }`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <polyline points="3 17 9 11 13 15 21 7"></polyline>
                          <path d="M3 17 L3 21 L21 21 L21 7" fill="currentColor" opacity="0.3"></path>
                        </svg>
                        Area
                      </button>
                      <button onClick={() => { setChartType('equivolume'); setVolumeMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${ chartType === 'equivolume' ? 'bg-gray-800 text-white' : 'text-gray-300' }`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <rect x="6" y="8" width="4" height="12" fill="currentColor" opacity="0.6"></rect>
                          <rect x="14" y="4" width="4" height="16" fill="currentColor" opacity="0.6"></rect>
                        </svg>
                        Equivolume
                      </button>
                      <button onClick={() => { setChartType('heikin-ashi'); setVolumeMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${ chartType === 'heikin-ashi' ? 'bg-gray-800 text-white' : 'text-gray-300' }`}>
                        <span className="text-gray-400">🕯</span> Heikin-Ashi
                      </button>
                      <button onClick={() => { setChartType('scatter'); setVolumeMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${ chartType === 'scatter' ? 'bg-gray-800 text-white' : 'text-gray-300' }`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <circle cx="8" cy="8" r="2" fill="currentColor"></circle>
                          <circle cx="16" cy="12" r="2" fill="currentColor"></circle>
                          <circle cx="12" cy="16" r="2" fill="currentColor"></circle>
                        </svg>
                        Scatter
                      </button>
                      <button onClick={() => { setChartType('hollow-candles'); setVolumeMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${ chartType === 'hollow-candles' ? 'bg-gray-800 text-white' : 'text-gray-300' }`}>
                        <span className="text-gray-400">🕯</span> Hollow Candles
                      </button>
                      <button onClick={() => { setChartType('histogram'); setVolumeMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${ chartType === 'histogram' ? 'bg-gray-800 text-yellow-500 font-semibold' : 'text-gray-300' }`}>
                        <BarChart3 size={14} className={chartType === 'histogram' ? 'text-yellow-500' : 'text-gray-400'} /> Histogram
                      </button>
                      <button onClick={() => { setChartType('baseline'); setVolumeMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${ chartType === 'baseline' ? 'bg-gray-800 text-white' : 'text-gray-300' }`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <line x1="3" y1="12" x2="21" y2="12"></line>
                        </svg>
                        Baseline
                      </button>
                      <button onClick={() => { setChartType('trend'); setVolumeMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${ chartType === 'trend' ? 'bg-gray-800 text-white' : 'text-gray-300' }`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                          <polyline points="3 20 9 14 13 18 21 10"></polyline>
                        </svg>
                        Trend
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Drawing Tool Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setDrawMenuOpen(!drawMenuOpen)}
                    className="p-1.5 hover:bg-gray-800 rounded flex items-center gap-1"
                    title="Drawing Tools"
                  >
                    <Pencil size={16} className="text-gray-400" />
                    <ChevronDown size={10} className="text-gray-500" />
                  </button>
                  {drawMenuOpen && (
                    <div className="absolute top-full mt-1 left-0 bg-[#1a1a1a] border border-gray-700 rounded shadow-xl z-50 min-w-[200px] max-h-96 overflow-y-auto">
                      <button onClick={() => { setSelectedDrawTool('trend-line'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'trend-line' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-yellow-500">/</span> Trend Line
                      </button>
                      <button onClick={() => { setSelectedDrawTool('extended-line'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'extended-line' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">/</span> Extended Line
                      </button>
                      <button onClick={() => { setSelectedDrawTool('price-line'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'price-line' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">↔</span> Price Line
                      </button>
                      <button onClick={() => { setSelectedDrawTool('info-line'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'info-line' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">↗</span> Info Line
                      </button>
                      <button onClick={() => { setSelectedDrawTool('arrow'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'arrow' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">↗</span> Arrow
                      </button>
                      <button onClick={() => { setSelectedDrawTool('horizontal-ray'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'horizontal-ray' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">→</span> Horizontal Ray
                      </button>
                      <button onClick={() => { setSelectedDrawTool('ray'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'ray' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">/</span> Ray
                      </button>
                      <button onClick={() => { setSelectedDrawTool('time-line'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'time-line' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">|</span> Time Line
                      </button>
                      <button onClick={() => { setSelectedDrawTool('trend-channel'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'trend-channel' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">⊏</span> Trend Channel
                      </button>
                      <button onClick={() => { setSelectedDrawTool('range-volume'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'range-volume' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">⊏</span> Range volume profile
                      </button>
                      <button onClick={() => { setSelectedDrawTool('anchored-volume'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'anchored-volume' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">⊢</span> Anchored volume profile
                      </button>
                      <button onClick={() => { setSelectedDrawTool('oval'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'oval' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">○</span> Oval
                      </button>
                      <button onClick={() => { setSelectedDrawTool('rectangle'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'rectangle' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">□</span> Rectangle
                      </button>
                      <button onClick={() => { setSelectedDrawTool('curve'); setDrawMenuOpen(false); }} className={`w-full px-3 py-2 text-xs text-left hover:bg-gray-800 flex items-center gap-2 ${selectedDrawTool === 'curve' ? 'bg-gray-800 text-white' : 'text-gray-300'}`}>
                        <span className="text-gray-400">~</span> Curve
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Indicators Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setIndicatorMenuOpen(!indicatorMenuOpen)}
                    className="p-1.5 hover:bg-gray-800 rounded flex items-center gap-1 text-gray-400 text-sm font-mono"
                    title="Indicators"
                  >
                    f
                    <ChevronDown size={10} className="text-gray-500" />
                  </button>
                  {indicatorMenuOpen && (
                    <div className="absolute top-full mt-1 left-0 bg-[#1a1a1a] border border-gray-700 rounded shadow-xl z-50 min-w-[160px]">
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">Moving Average</button>
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">RSI</button>
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">MACD</button>
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">Bollinger Bands</button>
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">Stochastic</button>
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">Volume Profile</button>
                    </div>
                  )}
                </div>
                
                {/* Compare Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setCompareMenuOpen(!compareMenuOpen)}
                    className="p-1.5 hover:bg-gray-800 rounded flex items-center gap-1"
                    title="Compare"
                  >
                    <Code size={16} className="text-gray-400" />
                    <ChevronDown size={10} className="text-gray-500" />
                  </button>
                  {compareMenuOpen && (
                    <div className="absolute top-full mt-1 left-0 bg-[#1a1a1a] border border-gray-700 rounded shadow-xl z-50 min-w-[160px]">
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">Add Symbol</button>
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">Compare with Index</button>
                    </div>
                  )}
                </div>
                
                {/* Layout Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setLayoutMenuOpen(!layoutMenuOpen)}
                    className="p-1.5 hover:bg-gray-800 rounded flex items-center gap-1"
                    title="Layout"
                  >
                    <Columns size={16} className="text-gray-400" />
                    <ChevronDown size={10} className="text-gray-500" />
                  </button>
                  {layoutMenuOpen && (
                    <div className="absolute top-full mt-1 left-0 bg-[#1a1a1a] border border-gray-700 rounded shadow-xl z-50 min-w-[160px]">
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">Single Chart</button>
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">2 Vertical</button>
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">2 Horizontal</button>
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">4 Grid</button>
                    </div>
                  )}
                </div>
                
                {/* More Options Dropdown */}
                <div className="relative">
                  <button 
                    onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                    className="p-1.5 hover:bg-gray-800 rounded flex items-center gap-1"
                    title="More Options"
                  >
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                  {moreMenuOpen && (
                    <div className="absolute top-full mt-1 left-0 bg-[#1a1a1a] border border-gray-700 rounded shadow-xl z-50 min-w-[160px]">
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">Chart Settings</button>
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">Time Zone</button>
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">Color Theme</button>
                      <button className="w-full px-3 py-2 text-xs text-left hover:bg-gray-800 text-gray-300">Export Data</button>
                    </div>
                  )}
                </div>
                
                {/* Camera */}
                <button className="p-1.5 hover:bg-gray-800 rounded" title="Screenshot">
                  <Camera size={16} className="text-gray-400" />
                </button>
                
                {/* Settings */}
                <button className="p-1.5 hover:bg-gray-800 rounded" title="Settings">
                  <Settings size={16} className="text-gray-400" />
                </button>
                
                {/* Fullscreen */}
                <button className="p-1.5 hover:bg-gray-800 rounded" title="Fullscreen">
                  <Maximize2 size={16} className="text-gray-400" />
                </button>
              </div>

              {/* Right: Buy/Sell Buttons */}
              <div className="flex items-center gap-2">
                {/* Sell Button */}
                <button className="px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm font-semibold text-white transition">
                  Sell
                </button>
                
                {/* Buy Button */}
                <button className="px-4 py-1.5 bg-green-600 hover:bg-green-700 rounded text-sm font-semibold text-white transition">
                  Buy
                </button>
              </div>
            </div>
          )}

          {/* OHLCV Data Bar */}
          {currentStock && activeTab === 'chart' && (
            <div className="px-4 py-2 border-b border-gray-800 bg-[#0a0a0a] flex-shrink-0">
              <div className="flex items-center gap-1">
                <span className="text-xs text-gray-500">{getShort(currentStock.symbol).toUpperCase()}</span>
                <span className="text-xs text-gray-600">-</span>
                <span className="text-xs text-gray-500">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <span className="text-xs text-gray-500">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                <ChevronDown size={12} className="text-gray-500" />
                
                <div className="ml-4 flex items-center gap-4">
                  <span className="text-xs"><span className="text-green-400 font-semibold">O</span> <span className="text-green-400">{currentStock.open.toFixed(2)}</span></span>
                  <span className="text-xs"><span className="text-green-400 font-semibold">H</span> <span className="text-green-400">{currentStock.dayHigh.toFixed(2)}</span></span>
                  <span className="text-xs"><span className="text-green-400 font-semibold">L</span> <span className="text-green-400">{currentStock.dayLow.toFixed(2)}</span></span>
                  <span className="text-xs"><span className="text-green-400 font-semibold">C</span> <span className="text-green-400">{currentStock.price.toFixed(2)}</span></span>
                  <span className="text-xs"><span className="text-green-400 font-semibold">Volume</span> <span className="text-green-400">{(currentStock.volume / 1000).toFixed(2)}K</span></span>
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="flex-1 relative bg-[#0d0d0d] chart-container overflow-hidden">
            {activeTab === 'chart' ? (
              <div className="h-full relative w-full">
                {/* Chart */}
                <CandlestickChart 
                  symbol={symbol} 
                  period={chartPeriod} 
                  chartType={chartType} 
                  drawTool={selectedDrawTool}
                  interval={selectedTimeInterval}
                />
              </div>
            ) : activeTab === 'overview' ? (
              <Overview stock={currentStock} />
            ) : (
              <div className="p-6 text-gray-400">
                <h3 className="text-lg mb-4">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
                <p>Content for {activeTab} tab coming soon...</p>
              </div>
            )}
          </div>

          {/* Timeline - Bottom Controls */}
          <div className="px-6 py-3 border-t border-gray-800/50 bg-[#111111] shadow-sm flex-shrink-0">
            <div className="flex items-center justify-between">
              {/* Left Side - Time Period Buttons */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setChartPeriod('1d')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    chartPeriod === '1d' ? 'text-white bg-blue-600 shadow-md' : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  1D
                </button>
                <button 
                  onClick={() => setChartPeriod('5d')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    chartPeriod === '5d' ? 'text-white bg-blue-600 shadow-md' : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  1W
                </button>
                <button 
                  onClick={() => setChartPeriod('1mo')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    chartPeriod === '1mo' ? 'text-white bg-blue-600 shadow-md' : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  1M
                </button>
                <button 
                  onClick={() => setChartPeriod('1y')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    chartPeriod === '1y' ? 'text-white bg-blue-600 shadow-md' : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  1Y
                </button>
                <button 
                  onClick={() => setChartPeriod('max')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                    chartPeriod === 'max' ? 'text-white bg-blue-600 shadow-md' : 'text-gray-300 hover:text-white hover:bg-gray-800/60'
                  }`}
                >
                  All
                </button>
              </div>

              {/* Right Side - Toggle Controls */}
              <div className="flex items-center gap-2">
                {/* % Toggle */}
                <button className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-800/60 rounded-md transition-all">
                  %
                </button>
                
                {/* Log Toggle */}
                <button className="px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-gray-800/60 rounded-md transition-all">
                  Log
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockPage;
