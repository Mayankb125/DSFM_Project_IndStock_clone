import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

class YahooFinanceService:
    """Service to fetch stock data from Yahoo Finance using Ticker"""
    
    def __init__(self):
        # ==========================================
        # 🔧 CHANGE YOUR 3 STOCKS HERE
        # ==========================================
        self.stocks = [
            'RELIANCE.NS',  # ← Change Stock 1 here
            'TCS.NS',       # ← Change Stock 2 here
            'INFY.NS'       # ← Change Stock 3 here
        
        ]
        
        # ==========================================
        # 🔧 INDICES (Both Nifty 50 and Sensex)
        # ==========================================
        self.nifty50 = '^NSEI'   # Nifty 50
        self.sensex = '^BSESN'   # Sensex
        self.indices = [self.nifty50, self.sensex]
        
        # ==========================================
        # 🔧 HISTORICAL DATA SETTINGS
        # ==========================================
        self.historical_years = 20  # ← Change number of years here (default: 20)
        
        print(f"✓ YahooFinanceService initialized")
        print(f"  - Stocks: {len(self.stocks)}")
        print(f"  - Indices: 2 (Nifty 50 + Sensex)")
        print(f"  - Total: 5 symbols")
        print(f"  - Historical data: Last {self.historical_years} years")
    
    def get_stock_data(self, symbol):
        """
        Fetch current data for a single stock using Ticker
        
        Args:
            symbol (str): Stock symbol (e.g., 'RELIANCE.NS')
            
        Returns:
            dict: Stock data or None if error
        """
        try:
            print(f"Fetching data for {symbol}...")
            
            # Create Ticker object
            ticker = yf.Ticker(symbol)
            
            # Get stock info
            info = ticker.info
            
            # Extract current price (try multiple fields)
            current_price = (
                info.get('currentPrice') or 
                info.get('regularMarketPrice') or 
                info.get('previousClose', 0)
            )
            
            previous_close = info.get('regularMarketPreviousClose') or info.get('previousClose', 0)
            
            # Calculate change
            change = current_price - previous_close if previous_close > 0 else 0
            change_percent = (change / previous_close * 100) if previous_close > 0 else 0
            
            # Prepare stock data
            data = {
                'symbol': symbol,
                'name': info.get('longName') or info.get('shortName', 'N/A'),
                'price': round(current_price, 2),
                'previousClose': round(previous_close, 2),
                'change': round(change, 2),
                'changePercent': round(change_percent, 2),
                'dayHigh': round(info.get('dayHigh', 0), 2),
                'dayLow': round(info.get('dayLow', 0), 2),
                'open': round(info.get('open', 0), 2),
                'fiftyTwoWeekHigh': round(info.get('fiftyTwoWeekHigh', 0), 2),
                'fiftyTwoWeekLow': round(info.get('fiftyTwoWeekLow', 0), 2),
                'marketCap': info.get('marketCap', 0),
                'pe': round(info.get('trailingPE', 0), 2) if info.get('trailingPE') else 0,
                'eps': round(info.get('trailingEps', 0), 2) if info.get('trailingEps') else 0,
                'volume': info.get('volume', 0),
                'averageVolume': info.get('averageVolume', 0),
                'sector': info.get('sector', 'N/A'),
                'industry': info.get('industry', 'N/A'),
                'dividendYield': round(info.get('dividendYield', 0) * 100, 2) if info.get('dividendYield') else 0,
                'bookValue': round(info.get('bookValue', 0), 2) if info.get('bookValue') else 0,
                'priceToBook': round(info.get('priceToBook', 0), 2) if info.get('priceToBook') else 0,
                'lastUpdate': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'currency': info.get('currency', 'INR')
            }
            
            print(f"✓ {symbol}: ₹{data['price']} ({data['changePercent']:+.2f}%)")
            return data
            
        except Exception as e:
            print(f"✗ Error fetching {symbol}: {str(e)}")
            return None
    
    def get_all_stocks(self):
        """
        Fetch data for all 3 configured stocks
        
        Returns:
            list: List of stock data dictionaries
        """
        stocks_data = []
        
        print("\n" + "="*50)
        print("Fetching all stocks data...")
        print("="*50)
        
        for symbol in self.stocks:
            data = self.get_stock_data(symbol)
            if data:
                stocks_data.append(data)
        
        print(f"\n✓ Successfully fetched {len(stocks_data)}/{len(self.stocks)} stocks")
        return stocks_data
    
    def get_index_data(self, index_symbol):
        """
        Fetch index data (Nifty 50 or Sensex)
        
        Args:
            index_symbol (str): Index symbol (^NSEI or ^BSESN)
            
        Returns:
            dict: Index data or None if error
        """
        try:
            print(f"Fetching index data for {index_symbol}...")
            
            ticker = yf.Ticker(index_symbol)
            info = ticker.info
            
            current_price = (
                info.get('regularMarketPrice') or 
                info.get('previousClose', 0)
            )
            
            previous_close = info.get('regularMarketPreviousClose') or info.get('previousClose', 0)
            
            change = current_price - previous_close if previous_close > 0 else 0
            change_percent = (change / previous_close * 100) if previous_close > 0 else 0
            
            # Determine index name
            index_name = 'NIFTY 50' if index_symbol == '^NSEI' else 'SENSEX'
            
            data = {
                'symbol': index_symbol,
                'name': index_name,
                'type': 'index',
                'price': round(current_price, 2),
                'previousClose': round(previous_close, 2),
                'change': round(change, 2),
                'changePercent': round(change_percent, 2),
                'dayHigh': round(info.get('dayHigh', 0), 2),
                'dayLow': round(info.get('dayLow', 0), 2),
                'open': round(info.get('open', 0), 2),
                'fiftyTwoWeekHigh': round(info.get('fiftyTwoWeekHigh', 0), 2),
                'fiftyTwoWeekLow': round(info.get('fiftyTwoWeekLow', 0), 2),
                'lastUpdate': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            
            print(f"✓ {data['name']}: {data['price']} ({data['changePercent']:+.2f}%)")
            return data
            
        except Exception as e:
            print(f"✗ Error fetching index: {str(e)}")
            return None
    
    def get_nifty50_data(self):
        """Get Nifty 50 index data"""
        return self.get_index_data(self.nifty50)
    
    def get_sensex_data(self):
        """Get Sensex index data"""
        return self.get_index_data(self.sensex)
    
    def get_all_indices(self):
        """
        Fetch data for both Nifty 50 and Sensex
        
        Returns:
            dict: Dictionary with 'nifty50' and 'sensex' keys
        """
        print("\n" + "="*50)
        print("Fetching indices data...")
        print("="*50)
        
        indices_data = {
            'nifty50': self.get_nifty50_data(),
            'sensex': self.get_sensex_data()
        }
        
        success_count = sum(1 for v in indices_data.values() if v is not None)
        print(f"\n✓ Successfully fetched {success_count}/2 indices")
        
        return indices_data
    
    def get_all_data(self):
        """
        Fetch all data: 3 stocks + Nifty 50 + Sensex
        
        Returns:
            dict: Dictionary containing stocks and indices data
        """
        print("\n" + "="*60)
        print("Fetching ALL data (3 stocks + 2 indices)...")
        print("="*60)
        
        all_data = {
            'stocks': self.get_all_stocks(),
            'indices': self.get_all_indices(),
            'totalSymbols': 5,
            'lastUpdate': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        print("\n" + "="*60)
        print(f"✓ Total data fetched:")
        print(f"  - Stocks: {len(all_data['stocks'])}")
        print(f"  - Indices: 2 (Nifty 50 + Sensex)")
        print("="*60)
        
        return all_data
    
    def get_historical_data(self, symbol, period=None, interval='1d'):
        """
        Fetch historical data for charts (LAST 20 YEARS by default)
        
        Args:
            symbol (str): Stock/Index symbol
            period (str): Time period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, 20y, max)
                         If None, uses self.historical_years
            interval (str): Data interval (1d, 1wk, 1mo)
            
        Returns:
            list: List of historical data points
        """
        try:
            # If no period specified, use configured years
            if period is None:
                period = f'{self.historical_years}y'
            
            print(f"Fetching {period} historical data for {symbol}...")
            
            ticker = yf.Ticker(symbol)
            
            # Download historical data
            hist = ticker.history(period=period, interval=interval)
            
            if hist.empty:
                print(f"✗ No historical data found for {symbol}")
                return []
            
            # Convert DataFrame to list of dictionaries
            historical = []
            for date, row in hist.iterrows():
                historical.append({
                    'date': date.strftime('%Y-%m-%d'),
                    'timestamp': int(date.timestamp()),
                    'open': round(row['Open'], 2),
                    'high': round(row['High'], 2),
                    'low': round(row['Low'], 2),
                    'close': round(row['Close'], 2),
                    'volume': int(row['Volume'])
                })
            
            print(f"✓ Fetched {len(historical)} data points for {symbol} ({period})")
            print(f"  Date range: {historical[0]['date']} to {historical[-1]['date']}")
            return historical
            
        except Exception as e:
            print(f"✗ Error fetching historical data: {str(e)}")
            return []
    
    def get_all_historical_data(self):
        """
        Fetch 20 years historical data for all 5 symbols (3 stocks + 2 indices)
        
        Returns:
            dict: Dictionary with symbol as key and historical data as value
        """
        print("\n" + "="*60)
        print(f"Fetching {self.historical_years} years historical data for ALL 5 symbols...")
        print("="*60)
        
        all_historical = {}
        
        # Fetch for all stocks
        for symbol in self.stocks:
            historical = self.get_historical_data(symbol)
            if historical:
                all_historical[symbol] = historical
        
        # Fetch for both indices
        for index in self.indices:
            historical = self.get_historical_data(index)
            if historical:
                all_historical[index] = historical
        
        print(f"\n✓ Historical data fetched for {len(all_historical)}/5 symbols")
        return all_historical
    
    def download_all_data_to_csv(self, output_dir='data'):
        """
        Download 20 years data for all 5 symbols and save to CSV files
        
        Args:
            output_dir (str): Directory to save CSV files
        """
        import os
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        print("\n" + "="*60)
        print(f"Downloading {self.historical_years} years data to CSV files...")
        print(f"Total symbols: 5 (3 stocks + 2 indices)")
        print("="*60)
        
        all_symbols = self.stocks + self.indices
        
        for symbol in all_symbols:
            try:
                print(f"\nDownloading {symbol}...")
                
                # Fetch historical data
                historical = self.get_historical_data(symbol, period=f'{self.historical_years}y')
                
                if historical:
                    # Convert to DataFrame
                    df = pd.DataFrame(historical)
                    
                    # Create filename
                    symbol_name = symbol.replace('.', '_').replace('^', '')
                    filename = f"{symbol_name}_{self.historical_years}years.csv"
                    filepath = os.path.join(output_dir, filename)
                    
                    # Save to CSV
                    df.to_csv(filepath, index=False)
                    
                    print(f"✓ Saved to: {filepath}")
                    print(f"  Records: {len(historical)}")
                    print(f"  Date range: {historical[0]['date']} to {historical[-1]['date']}")
                else:
                    print(f"✗ No data available for {symbol}")
                    
            except Exception as e:
                print(f"✗ Error downloading {symbol}: {str(e)}")
        
        print("\n" + "="*60)
        print("✓ Download complete!")
        print(f"✓ 5 CSV files saved in: {output_dir}/")
        print("="*60)
    
    def get_intraday_data(self, symbol, period='1d', interval='5m'):
        """
        Fetch intraday data (for current day chart)
        
        Args:
            symbol (str): Stock/Index symbol
            period (str): Time period (1d, 5d)
            interval (str): Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m)
            
        Returns:
            list: List of intraday data points
        """
        return self.get_historical_data(symbol, period=period, interval=interval)


# Test function
if __name__ == "__main__":
    print("Testing YahooFinanceService - 3 Stocks + Nifty 50 + Sensex")
    print("="*60)
    
    service = YahooFinanceService()
    
    # Test single stock
    print("\n1. Testing single stock fetch:")
    stock = service.get_stock_data('RELIANCE.NS')
    if stock:
        print(f"   Name: {stock['name']}")
        print(f"   Price: ₹{stock['price']}")
        print(f"   Change: {stock['changePercent']:+.2f}%")
    
    # Test all stocks
    print("\n2. Testing all 3 stocks fetch:")
    all_stocks = service.get_all_stocks()
    print(f"   Total stocks fetched: {len(all_stocks)}")
    
    # Test Nifty 50
    print("\n3. Testing Nifty 50 fetch:")
    nifty = service.get_nifty50_data()
    if nifty:
        print(f"   Index: {nifty['name']}")
        print(f"   Value: {nifty['price']}")
    
    # Test Sensex
    print("\n4. Testing Sensex fetch:")
    sensex = service.get_sensex_data()
    if sensex:
        print(f"   Index: {sensex['name']}")
        print(f"   Value: {sensex['price']}")
    
    # Test all indices
    print("\n5. Testing both indices fetch:")
    indices = service.get_all_indices()
    
    # Test all data (3 stocks + 2 indices)
    print("\n6. Testing ALL data fetch (3 stocks + 2 indices):")
    all_data = service.get_all_data()
    
    # Test 20 years historical data
    print("\n7. Testing 20 years historical data for RELIANCE:")
    historical = service.get_historical_data('RELIANCE.NS')
    if historical:
        print(f"   Total data points: {len(historical)}")
        print(f"   First date: {historical[0]['date']}")
        print(f"   Last date: {historical[-1]['date']}")
        print(f"   First close: ₹{historical[0]['close']}")
        print(f"   Last close: ₹{historical[-1]['close']}")
    
    # Test CSV download
    print("\n8. CSV Download Option:")
    choice = input("   Download all 20 years data to CSV? (y/n): ")
    if choice.lower() == 'y':
        service.download_all_data_to_csv()
    
    print("\n" + "="*60)
    print("✓ All tests completed!")
    print("="*60)