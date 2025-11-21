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
from services.analytics import fetch_adjusted_close, compute_log_returns, compute_correlation_matrix, rmt_denoise_correlation, compute_momentum, compute_rsi, compute_annualized_volatility
from services.news import fetch_news_for_tickers
from services.sentiment import analyze_texts
from dotenv import load_dotenv
import numpy as np
import pandas as pd

load_dotenv()
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
        
        print(f"[OK] Cache updated successfully! ({len(cache['stocks'])} stocks + 2 indices)")
        
    except Exception as e:
        print(f"[ERR] Error updating cache: {e}")

# Load existing cache on startup
load_cache_from_file()

# Update cache immediately on startup
update_cache()

# Schedule automatic updates every 15 minutes
scheduler = BackgroundScheduler()
scheduler.add_job(func=update_cache, trigger="interval", minutes=15)
scheduler.start()

print("[INFO] Stock data updater scheduled (every 15 minutes)")

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
            '/api/prices': 'Get adjusted close and log returns for tickers',
            '/api/correlations': 'Compute correlation matrix from returns',
            '/api/rmt': 'Denoise correlation matrix using RMT',
            '/api/news': 'Fetch recent news via NewsAPI',
            '/api/sentiment': 'Run FinBERT sentiment on texts',
            '/api/sentiment-adjusted-corr': 'Adjust correlations with sentiment',
            '/api/predict': 'Simple momentum+sentiment predictions',
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

# ==================== ANALYTICS API ====================

@app.route('/api/prices', methods=['POST'])
def api_prices():
    body = request.get_json(force=True, silent=True) or {}
    tickers = body.get('tickers') or []
    start = body.get('start')
    end = body.get('end')
    if not isinstance(tickers, list) or len(tickers) < 1:
        return jsonify({'success': False, 'message': 'tickers must be a non-empty list'}), 400
    try:
        adj = fetch_adjusted_close(tickers, start=start, end=end)
        rets = compute_log_returns(adj)
        return jsonify({
            'success': True,
            'tickers': list(adj.columns),
            'dates': [d.strftime('%Y-%m-%d') for d in adj.index],
            'prices': {t: adj[t].dropna().round(6).tolist() for t in adj.columns},
            'returns': {t: rets[t].dropna().round(8).tolist() for t in rets.columns}
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/correlations', methods=['POST'])
def api_correlations():
    body = request.get_json(force=True, silent=True) or {}
    tickers = body.get('tickers') or []
    start = body.get('start')
    end = body.get('end')
    if not isinstance(tickers, list) or len(tickers) < 2:
        return jsonify({'success': False, 'message': 'tickers must be a list of at least 2'}), 400
    try:
        adj = fetch_adjusted_close(tickers, start=start, end=end)
        rets = compute_log_returns(adj)
        corr = compute_correlation_matrix(rets)
        return jsonify({
            'success': True,
            'tickers': list(corr.columns),
            'correlation': corr.round(6).values.tolist()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/rmt', methods=['POST'])
def api_rmt():
    body = request.get_json(force=True, silent=True) or {}
    matrix = body.get('correlation')
    T = body.get('T')
    N = body.get('N')
    if matrix is None or T is None or N is None:
        return jsonify({'success': False, 'message': 'correlation, T and N are required'}), 400
    try:
        import numpy as np
        import pandas as pd
        corr_df = pd.DataFrame(np.array(matrix))
        result = rmt_denoise_correlation(corr_df, int(T))
        return jsonify({
            'success': True,
            'eigenvalues': result['eigenvalues_sorted'],
            'lambda_min': result['lambda_min'],
            'lambda_max': result['lambda_max'],
            'denoised': result['denoised_correlation'].round(6).values.tolist()
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/news', methods=['POST'])
def api_news():
    body = request.get_json(force=True, silent=True) or {}
    tickers = body.get('tickers') or []
    lookback_days = int(body.get('lookback_days', 7))
    if not isinstance(tickers, list) or len(tickers) < 1:
        return jsonify({'success': False, 'message': 'tickers must be a non-empty list'}), 400
    try:
        news = fetch_news_for_tickers(tickers, lookback_days=lookback_days)
        return jsonify({'success': True, 'news': news})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/sentiment', methods=['POST'])
def api_sentiment():
    body = request.get_json(force=True, silent=True) or {}
    texts = body.get('texts') or []
    if not isinstance(texts, list) or len(texts) < 1:
        return jsonify({'success': False, 'message': 'texts must be a non-empty list'}), 400
    try:
        results = analyze_texts(texts)
        return jsonify({'success': True, 'results': results})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/sentiment-adjusted-corr', methods=['POST'])
def api_sentiment_adjusted_corr():
    body = request.get_json(force=True, silent=True) or {}
    tickers = body.get('tickers') or []
    start = body.get('start')
    end = body.get('end')
    lookback_days = int(body.get('lookback_days', 7))
    alpha = float(body.get('alpha', 0.3))
    if not isinstance(tickers, list) or len(tickers) < 2:
        return jsonify({'success': False, 'message': 'tickers must be a list of at least 2'}), 400
    try:
        # Raw corr
        adj = fetch_adjusted_close(tickers, start=start, end=end)
        rets = compute_log_returns(adj)
        corr = compute_correlation_matrix(rets)

        # News per ticker (graceful fallback on provider failure)
        try:
            news = fetch_news_for_tickers(tickers, lookback_days=lookback_days)
        except Exception:
            news = {t: [] for t in tickers}

        # Sentiment per ticker from their headlines
        per_ticker_sent = {}
        per_ticker_examples = {}
        for t in tickers:
            headlines = [n['title'] for n in news.get(t, []) if n.get('title')]
            if not headlines:
                per_ticker_sent[t] = 0.0
                per_ticker_examples[t] = []
                continue
            sentiments = analyze_texts(headlines)
            avg = float(np.mean([s['score'] for s in sentiments])) if sentiments else 0.0
            per_ticker_sent[t] = avg
            per_ticker_examples[t] = news.get(t, [])[:3]

        # Adjust correlations
        corr_mat = corr.values.astype(float)
        adjusted = corr_mat.copy()
        for i, ti in enumerate(corr.columns):
            for j, tj in enumerate(corr.columns):
                adj_factor = 1.0 + alpha * (per_ticker_sent.get(ti, 0.0) + per_ticker_sent.get(tj, 0.0)) / 2.0
                adjusted[i, j] = float(np.clip(corr_mat[i, j] * adj_factor, -1.0, 1.0))

        return jsonify({
            'success': True,
            'tickers': list(corr.columns),
            'raw': corr.round(6).values.tolist(),
            'adjusted': np.round(adjusted, 6).tolist(),
            'sentiment': per_ticker_sent,
            'examples': per_ticker_examples
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/analyze', methods=['POST'])
def api_analyze():
    """
    One-shot analysis endpoint combining prices, returns, correlations, RMT,
    news+sentiment, adjusted correlation, and predictions.
    Returns the unified JSON structure requested by the frontend.
    """
    body = request.get_json(force=True, silent=True) or {}
    tickers = body.get('tickers') or []
    start = body.get('start')
    end = body.get('end')
    lookback_days = int(body.get('lookback_days', 7))
    alpha = float(body.get('alpha', 0.3))
    use_news = bool(body.get('use_news', True))
    if not isinstance(tickers, list) or len(tickers) < 2:
        return jsonify({'success': False, 'message': 'tickers must be a list of at least 2'}), 400
    try:
        # Prices and returns
        adj = fetch_adjusted_close(tickers, start=start, end=end)
        rets = compute_log_returns(adj)
        prices = {t: adj[t].dropna().round(6).tolist() for t in adj.columns}
        returns = {t: rets[t].dropna().round(8).tolist() for t in rets.columns}
        dates = [d.strftime('%Y-%m-%d') for d in adj.index]

        # Correlations
        corr_df = compute_correlation_matrix(rets)
        corr_raw = corr_df.round(6).values.tolist()
        corr_tickers = list(corr_df.columns)

        # RMT
        T = rets.shape[0]
        rmt = rmt_denoise_correlation(corr_df, T)
        rmt_payload = {
            'eigenvalues': rmt['eigenvalues_sorted'],
            'lambda_min': rmt['lambda_min'],
            'lambda_max': rmt['lambda_max'],
            'denoised': rmt['denoised_correlation'].round(6).values.tolist(),
        }

        # Compute RSI and volatility for predictions
        try:
            rsi = compute_rsi(adj, period=14)
        except Exception:
            rsi = pd.Series(index=adj.columns, dtype=float)
        try:
            vol = compute_annualized_volatility(rets)
        except Exception:
            vol = pd.Series(index=rets.columns, dtype=float)

        # News + sentiment
        per_ticker_sent = {t: 0.0 for t in tickers}
        per_ticker_examples = {t: [] for t in tickers}
        if use_news:
            try:
                news = fetch_news_for_tickers(tickers, lookback_days=lookback_days)
                for t in tickers:
                    heads = [n['title'] for n in news.get(t, []) if n.get('title')]
                    sentiments = analyze_texts(heads) if heads else []
                    per_ticker_sent[t] = float(np.mean([s['score'] for s in sentiments])) if sentiments else 0.0
                    per_ticker_examples[t] = news.get(t, [])[:3]
            except Exception:
                pass

        # Adjusted correlation
        corr_mat = corr_df.values.astype(float)
        adjusted = corr_mat.copy()
        for i, ti in enumerate(corr_df.columns):
            for j, tj in enumerate(corr_df.columns):
                adj_factor = 1.0 + alpha * (per_ticker_sent.get(ti, 0.0) + per_ticker_sent.get(tj, 0.0)) / 2.0
                adjusted[i, j] = float(np.clip(corr_mat[i, j] * adj_factor, -1.0, 1.0))

        # Predictions (inline logic from api_predict)
        mom = compute_momentum(adj, window_days=7)
        predictions = {}
        for t in tickers:
            s = per_ticker_sent.get(t, 0.0)
            m = float(mom.get(t, 0.0)) if t in mom.index else 0.0
            try:
                r = float(rsi.loc[t]) if t in rsi.index else float('nan')
            except Exception:
                r = float('nan')
            try:
                v = float(vol.loc[t]) if t in vol.index else float('nan')
            except Exception:
                v = float('nan')
            likely_up = (m > 0) and (np.isnan(r) or r < 70) and ((s > 0.2) if use_news else True)
            likely_down = (m < 0) and (np.isnan(r) or r > 30) and ((s < -0.2) if use_news else True)
            if likely_up:
                label = 'Likely Up'
            elif likely_down:
                label = 'Likely Down'
            else:
                label = 'Uncertain'
            predictions[t] = {
                'sentiment': s,
                'momentum_7d': m,
                'rsi_14': r,
                'vol_annualized': v,
                'prediction': label
            }

        payload = {
            'success': True,
            'tickers': tickers,
            'prices': prices,
            'returns': returns,
            'dates': dates,
            'correlations': {
                'tickers': corr_tickers,
                'raw': corr_raw
            },
            'rmt': rmt_payload,
            'sentiment': per_ticker_sent,
            'adjusted_correlation': {
                'tickers': corr_tickers,
                'raw': corr_raw,
                'adjusted': np.round(adjusted, 6).tolist(),
                'examples': per_ticker_examples
            },
            'predictions': predictions
        }
        return jsonify(payload)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/predict', methods=['POST'])
def api_predict():
    body = request.get_json(force=True, silent=True) or {}
    tickers = body.get('tickers') or []
    start = body.get('start')
    end = body.get('end')
    lookback_days = int(body.get('lookback_days', 7))
    use_news = bool(body.get('use_news', True))
    if not isinstance(tickers, list) or len(tickers) < 1:
        return jsonify({'success': False, 'message': 'tickers must be a non-empty list'}), 400
    try:
        adj = fetch_adjusted_close(tickers, start=start, end=end)
        mom = compute_momentum(adj, window_days=7)
        rets = compute_log_returns(adj)
        rsi = compute_rsi(adj, period=14)
        vol = compute_annualized_volatility(rets)

        # sentiment per ticker (optional + graceful fallback)
        sent_avg = {t: 0.0 for t in tickers}
        if use_news:
            try:
                news = fetch_news_for_tickers(tickers, lookback_days=lookback_days)
                for t in tickers:
                    heads = [n['title'] for n in news.get(t, []) if n.get('title')]
                    sentiments = analyze_texts(heads) if heads else []
                    sent_avg[t] = float(np.mean([s['score'] for s in sentiments])) if sentiments else 0.0
            except Exception:
                pass

        predictions = {}
        for t in tickers:
            s = sent_avg.get(t, 0.0)
            m = float(mom.get(t, 0.0)) if t in mom.index else 0.0
            # RSI may be pandas Series; fetch safely
            r = None
            try:
                r = float(rsi.loc[t])
            except Exception:
                try:
                    r = float(rsi.get(t))
                except Exception:
                    r = float('nan')
            v = float(vol.get(t, float('nan'))) if hasattr(vol, 'get') else (float(vol.loc[t]) if t in vol.index else float('nan'))

            likely_up = (m > 0) and (np.isnan(r) or r < 70) and ((s > 0.2) if use_news else True)
            likely_down = (m < 0) and (np.isnan(r) or r > 30) and ((s < -0.2) if use_news else True)

            if likely_up:
                label = 'Likely Up'
            elif likely_down:
                label = 'Likely Down'
            else:
                label = 'Uncertain'
            predictions[t] = {
                'sentiment': s,
                'momentum_7d': m,
                'rsi_14': r,
                'vol_annualized': v,
                'prediction': label
            }

        return jsonify({'success': True, 'predictions': predictions})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

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
    print("[INFO] Flask Stock API Server Starting...")
    print("=" * 50)
    print("[INFO] API at: http://localhost:5000")
    print("[INFO] Stock data updates: Every 15 minutes")
    print("=" * 50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)