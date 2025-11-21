import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const Overview = ({ stock }) => {
  if (!stock) return null;

  return (
    <div className="p-6 text-gray-300 overflow-y-auto h-full">
      <h3 className="text-xl font-semibold mb-6 text-white">{stock.name} Performance</h3>
      
      <div className="space-y-6">
        {/* Performance Section - Price Range Bars */}
        <div className="space-y-6">
          {/* Day's Range */}
          <div className="bg-[#111111] p-5 rounded-lg border border-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Day's Range</span>
              <span className="text-sm font-medium text-white">
                ₹{stock.dayLow?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="relative h-2 bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500 rounded-full mb-2">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
                style={{ 
                  left: `${stock.dayLow && stock.dayHigh 
                    ? Math.min(Math.max(((stock.price - stock.dayLow) / (stock.dayHigh - stock.dayLow)) * 100, 0), 100)
                    : 50}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-red-400">
                  <TrendingDown size={14} />
                  <span className="font-medium">
                    {stock.dayLow && stock.price 
                      ? (((stock.price - stock.dayLow) / stock.price) * 100).toFixed(2)
                      : '0.00'}% Downside
                  </span>
                </div>
                <span className="text-gray-500">Day's Volatility: {stock.dayLow && stock.dayHigh 
                  ? (((stock.dayHigh - stock.dayLow) / stock.price) * 100).toFixed(2)
                  : '0.00'}%</span>
              </div>
              <div className="flex items-center gap-1 text-green-400">
                <span className="font-medium">
                  {stock.dayHigh && stock.price 
                    ? (((stock.dayHigh - stock.price) / stock.price) * 100).toFixed(2)
                    : '0.00'}% Upside
                </span>
                <TrendingUp size={14} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
              <span>₹{stock.dayLow?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || 'N/A'}</span>
              <span className="text-white font-medium">₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span>₹{stock.dayHigh?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || 'N/A'}</span>
            </div>
          </div>

          {/* 52 Week Range */}
          <div className="bg-[#111111] p-5 rounded-lg border border-gray-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">52 Weeks Range</span>
              <span className="text-sm font-medium text-white">
                ₹{stock.fiftyTwoWeekLow.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="relative h-2 bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500 rounded-full mb-2">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg"
                style={{ 
                  left: `${Math.min(Math.max(((stock.price - stock.fiftyTwoWeekLow) / (stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow)) * 100, 0), 100)}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-red-400">
                  <TrendingDown size={14} />
                  <span className="font-medium">
                    {(((stock.price - stock.fiftyTwoWeekLow) / stock.price) * 100).toFixed(2)}% Downside
                  </span>
                </div>
                <span className="text-gray-500">52 Weeks Volatility: {(((stock.fiftyTwoWeekHigh - stock.fiftyTwoWeekLow) / stock.price) * 100).toFixed(2)}%</span>
              </div>
              <div className="flex items-center gap-1 text-green-400">
                <span className="font-medium">
                  {(((stock.fiftyTwoWeekHigh - stock.price) / stock.price) * 100).toFixed(2)}% Upside
                </span>
                <TrendingUp size={14} />
              </div>
            </div>
            <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
              <span>₹{stock.fiftyTwoWeekLow.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span className="text-white font-medium">₹{stock.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
              <span>₹{stock.fiftyTwoWeekHigh.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Returns % and Market Stats Section - Side by Side */}
        <div className="grid grid-cols-2 gap-6">
          {/* Returns % Section */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4">Returns %</h4>
            <div className="bg-[#111111] rounded-lg border border-gray-800/50 overflow-hidden">
              <div className="divide-y divide-gray-800/50">
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-400">1 Month Return</span>
                  <span className="text-sm font-semibold text-green-400">5.73 %</span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-400">3 Month Return</span>
                  <span className="text-sm font-semibold text-green-400">8.72 %</span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-400">1 Year Return</span>
                  <span className="text-sm font-semibold text-green-400">26.66 %</span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-400">3 Year Return</span>
                  <span className="text-sm font-semibold text-green-400">33.78 %</span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-400">5 Year Return</span>
                  <span className="text-sm font-semibold text-green-400">74.94 %</span>
                </div>
              </div>
            </div>
          </div>

          {/* Market Stats Section */}
          <div>
            <h4 className="text-base font-semibold text-white mb-4">Market Stats</h4>
            <div className="bg-[#111111] rounded-lg border border-gray-800/50 overflow-hidden">
              <div className="divide-y divide-gray-800/50">
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-400">Previous Close</span>
                  <span className="text-sm font-semibold text-white">
                    ₹{stock.previousClose.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-400">Open</span>
                  <span className="text-sm font-semibold text-white">
                    ₹{stock.dayLow?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-400">Volume</span>
                  <span className="text-sm font-semibold text-white">
                    {stock.volume.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-400">Upper Circuit</span>
                  <span className="text-sm font-semibold text-white">
                    ₹{(stock.price * 1.10).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between items-center p-4">
                  <span className="text-sm text-gray-400">Lower Circuit</span>
                  <span className="text-sm font-semibold text-white">
                    ₹{(stock.price * 0.90).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* About Company Section */}
        <div>
          <h4 className="text-base font-semibold text-white mb-4">About {stock.name}</h4>
          <div className="bg-[#111111] p-5 rounded-lg border border-gray-800/50 space-y-4">
            <p className="text-sm text-gray-300 leading-relaxed">
              {stock.name} is a leading company in the {stock.sector || 'Indian'} sector. 
              The company operates in various segments and has established itself as a major player in the market. 
              With a strong market presence and consistent performance, it continues to deliver value to its shareholders.
            </p>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800/50">
              <div>
                <div className="text-xs text-gray-500 mb-1">Market Cap</div>
                <div className="text-sm font-semibold text-white">
                  ₹{(stock.marketCap / 1e12).toFixed(2)} Trillion
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">P/E Ratio</div>
                <div className="text-sm font-semibold text-white">{stock.pe || 'N/A'}</div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800/50 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Organization</span>
                <span className="text-sm font-medium text-white">{stock.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Industry</span>
                <span className="text-sm font-medium text-white">{stock.industry || stock.sector || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Symbol</span>
                <span className="text-sm font-medium text-white">{stock.symbol}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Overview;
