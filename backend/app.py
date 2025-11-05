import sys
import os

# If a local venv exists at backend/venv, re-exec this script with that Python interpreter.
# This makes `python app.py` work even when the system Python doesn't have the project's
# dependencies installed (fixes ModuleNotFoundError for packages like flask_cors).
venv_python = os.path.join(os.path.dirname(__file__), 'venv', 'Scripts', 'python.exe')
try:
    if os.path.exists(venv_python):
        venv_python_abs = os.path.abspath(venv_python)
        current_python_abs = os.path.abspath(sys.executable)
        # Compare case-insensitively on Windows
        if current_python_abs.lower() != venv_python_abs.lower():
            os.execv(venv_python_abs, [venv_python_abs] + sys.argv)
except Exception:
    # If anything goes wrong with re-exec, fall back to current interpreter and let imports fail
    pass

from flask import Flask, jsonify, request
from flask_cors import CORS
from services.yahoo_finance import YahooFinanceService
from apscheduler.schedulers.background import BackgroundScheduler
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Initialize Yahoo Finance Service
finance_service = YahooFinanceService()

# Cache configuration
CACHE_DIR = 'cache'
CACHE_FILE = os.path.join(CACHE_DIR, 'stock_data.json')

# Global cache storage
cache = {
    'stocks': [],
    'indices': {},
    'last_update': None
}

def load_cache_from_file():
    """Load cache from file if exists"""
    global cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, 'r') as f:
                cache = json.load(f)
            print("Cache loaded from file")
        except Exception as e:
            print(f"Error loading cache: {e}")

def save_cache_to_file():
    """Save cache to file"""
    try:
        os.makedirs(CACHE_DIR, exist_ok=True)
        with open(CACHE_FILE, 'w') as f:
            json.dump(cache, f, indent=2)
        print("Cache saved to file")
    except Exception as e:
        print(f"Error saving cache: {e}")

def update_cache():
    """Fetch fresh data and update cache"""
    global cache
    print(f"[{datetime.now()}] Updating stock data...")
    
    try:
        # Fetch all stocks
        cache['stocks'] = finance_service.get_all_stocks()
        
        # Fetch both indices (Nifty 50 and Sensex)
        cache['indices'] = finance_service.get_all_indices()
        
        # Update timestamp
        cache['last_update'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Save to file
        save_cache_to_file()
        
        print(f"✓ Cache updated successfully! ({len(cache['stocks'])} stocks + 2 indices)")
        
    except Exception as e:
        print(f"✗ Error updating cache: {e}")

# Load existing cache on startup
load_cache_from_file()

# Update cache immediately on startup
update_cache()

# Schedule automatic updates every 15 minutes
scheduler = BackgroundScheduler()
scheduler.add_job(func=update_cache, trigger="interval", minutes=15)
scheduler.start()

print("📊 Stock data updater scheduled (every 15 minutes)")

# ==================== API ROUTES ====================

@app.route('/', methods=['GET'])
def home():
    """API home endpoint"""
    return jsonify({
        'message': 'Stock Clone API - 3 Stocks + Nifty 50 + Sensex',
        'version': '1.0',
        'totalSymbols': 5,
        'endpoints': {
            '/api/stocks': 'Get all 3 stocks',
            '/api/stocks/<symbol>': 'Get specific stock',
            '/api/index': 'Get both Nifty 50 and Sensex',
            '/api/index/nifty50': 'Get Nifty 50 only',
            '/api/index/sensex': 'Get Sensex only',
            '/api/historical/<symbol>': 'Get historical data (20 years)',
            '/api/refresh': 'Refresh data manually',
            '/api/health': 'Health check',
            '/api/stats': 'Get statistics'
        }
    })

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'lastUpdate': cache['last_update'],
        'stocksCount': len(cache['stocks']),
        'indicesCount': 2,
        'hasNifty50': bool(cache['indices'].get('nifty50')),
        'hasSensex': bool(cache['indices'].get('sensex'))
    })

@app.route('/api/stocks', methods=['GET'])
def get_stocks():
    """Get all stocks data"""
    if not cache['stocks']:
        return jsonify({
            'success': False,
            'message': 'No stock data available',
            'data': []
        }), 503
    
    return jsonify({
        'success': True,
        'data': cache['stocks'],
        'count': len(cache['stocks']),
        'lastUpdate': cache['last_update']
    })

@app.route('/api/stocks/<symbol>', methods=['GET'])
def get_stock(symbol):
    """Get specific stock details"""
    # Find stock in cache
    stock = next((s for s in cache['stocks'] if s['symbol'].upper() == symbol.upper()), None)
    
    if stock:
        return jsonify({
            'success': True,
            'data': stock
        })
    
    return jsonify({
        'success': False,
        'message': f'Stock {symbol} not found'
    }), 404

@app.route('/api/index', methods=['GET'])
def get_index():
    """Get both Nifty 50 and Sensex data"""
    if not cache['indices']:
        return jsonify({
            'success': False,
            'message': 'Index data not available',
            'data': {}
        }), 503
    
    return jsonify({
        'success': True,
        'data': cache['indices'],
        'lastUpdate': cache['last_update']
    })

@app.route('/api/index/nifty50', methods=['GET'])
def get_nifty50():
    """Get Nifty 50 index data only"""
    nifty_data = cache['indices'].get('nifty50')
    
    if not nifty_data:
        return jsonify({
            'success': False,
            'message': 'Nifty 50 data not available'
        }), 503
    
    return jsonify({
        'success': True,
        'data': nifty_data,
        'lastUpdate': cache['last_update']
    })

@app.route('/api/index/sensex', methods=['GET'])
def get_sensex():
    """Get Sensex index data only"""
    sensex_data = cache['indices'].get('sensex')
    
    if not sensex_data:
        return jsonify({
            'success': False,
            'message': 'Sensex data not available'
        }), 503
    
    return jsonify({
        'success': True,
        'data': sensex_data,
        'lastUpdate': cache['last_update']
    })

@app.route('/api/historical/<symbol>', methods=['GET'])
def get_historical(symbol):
    """Get historical data for a stock"""
    # Get period from query parameter (default: 1y)
    period = request.args.get('period', '1y')
    
    # Validate period
    # Allow common shorthand periods and longer multi-year options (10y, 20y)
    valid_periods = ['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', '20y', 'max']
    if period not in valid_periods:
        return jsonify({
            'success': False,
            'message': f'Invalid period. Valid options: {", ".join(valid_periods)}'
        }), 400
    
    try:
        # Fetch historical data
        data = finance_service.get_historical_data(symbol, period=period)
        
        if not data:
            return jsonify({
                'success': False,
                'message': f'No historical data found for {symbol}'
            }), 404
        
        return jsonify({
            'success': True,
            'data': data,
            'count': len(data),
            'period': period,
            'symbol': symbol
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error fetching historical data: {str(e)}'
        }), 500

@app.route('/api/refresh', methods=['POST'])
def refresh_data():
    """Manually refresh stock data"""
    try:
        update_cache()
        return jsonify({
            'success': True,
            'message': 'Data refreshed successfully',
            'lastUpdate': cache['last_update']
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error refreshing data: {str(e)}'
        }), 500

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get overall statistics"""
    if not cache['stocks']:
        return jsonify({
            'success': False,
            'message': 'No data available'
        }), 503
    
    gainers = [s for s in cache['stocks'] if s['change'] > 0]
    losers = [s for s in cache['stocks'] if s['change'] < 0]
    unchanged = [s for s in cache['stocks'] if s['change'] == 0]
    
    return jsonify({
        'success': True,
        'data': {
            'totalStocks': len(cache['stocks']),
            'gainers': len(gainers),
            'losers': len(losers),
            'unchanged': len(unchanged),
            'topGainer': max(cache['stocks'], key=lambda x: x['changePercent']) if cache['stocks'] else None,
            'topLoser': min(cache['stocks'], key=lambda x: x['changePercent']) if cache['stocks'] else None,
            'lastUpdate': cache['last_update']
        }
    })

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500

if __name__ == '__main__':
    print("=" * 50)
    print("🚀 Flask Stock API Server Starting...")
    print("=" * 50)
    print("📡 API will be available at: http://localhost:5000")
    print("📊 Stock data updates: Every 15 minutes")
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)