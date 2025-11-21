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
# volatility_model may be intentionally removed in some distributions (placeholder removed).
# Import it if available; otherwise provide safe placeholders and a flag so endpoints can
# return informative errors instead of crashing the whole server during import.
VOLATILITY_AVAILABLE = True
try:
    from volatility_model import build_dataset, train_random_forest, save_model, load_model, predict_from_recent
except Exception as e:
    # Module missing or intentionally removed. Provide fallbacks that raise when used.
    VOLATILITY_AVAILABLE = False
    def _missing(*args, **kwargs):
        raise ImportError('volatility_model module not available: ' + str(e))
    build_dataset = _missing
    train_random_forest = _missing
    save_model = _missing
    load_model = _missing
    predict_from_recent = _missing
from services.analytics import marchenko_pastur_bounds
ARCH_AVAILABLE = True
STATS_AVAILABLE = True
try:
    from arch import arch_model
except Exception as _e:
    ARCH_AVAILABLE = False
    def arch_model(*args, **kwargs):
        raise ImportError('arch package not installed or importable')

try:
    from statsmodels.tsa.arima.model import ARIMA
except Exception as _e:
    STATS_AVAILABLE = False
    class ARIMA:
        def __init__(self, *a, **k):
            raise ImportError('statsmodels not installed or importable')

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
        # include model info if available
        try:
            metrics_path = os.path.join(os.path.dirname(__file__), 'models', 'volatility_metrics.json')
            if os.path.exists(metrics_path):
                with open(metrics_path, 'r') as mf:
                    payload['model_info'] = json.load(mf)
        except Exception:
            pass
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


@app.route('/api/train-volatility', methods=['POST'])
def api_train_volatility():
    body = request.get_json(force=True, silent=True) or {}
    tickers = body.get('tickers') or []
    start = body.get('start')
    end = body.get('end')
    label_pct = float(body.get('label_pct', 0.75))
    model_name = body.get('model_name', 'volatility_rf.joblib')
    sentiments = body.get('sentiments') or None

    if not isinstance(tickers, list) or len(tickers) < 2:
        return jsonify({'success': False, 'message': 'tickers must be a list of at least 2'}), 400

    if not VOLATILITY_AVAILABLE:
        return jsonify({'success': False, 'message': 'volatility_model module not available on server; train-volatility is disabled'}), 501

    try:
        X, y = build_dataset(tickers, start, end, sentiments, label_pct=label_pct)
        model, metrics = train_random_forest(X, y)
        model_path = save_model(model, name=model_name)
        # persist metrics to disk alongside model for frontend introspection
        try:
            metrics_path = os.path.join(os.path.dirname(model_path), 'volatility_metrics.json')
            with open(metrics_path, 'w') as mf:
                json.dump(metrics, mf, indent=2)
        except Exception as _e:
            print(f"Warning: failed to save metrics file: {_e}")
        return jsonify({'success': True, 'metrics': metrics, 'model_path': model_path})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/eigen-timeseries', methods=['POST'])
def api_eigen_timeseries():
    """Compute rolling eigenvalues (λ1, λ2) and spread for tickers over date range and window."""
    body = request.get_json(force=True, silent=True) or {}
    tickers = body.get('tickers') or []
    start = body.get('start')
    end = body.get('end')
    window = int(body.get('window', 60))

    if not isinstance(tickers, list) or len(tickers) < 2:
        return jsonify({'success': False, 'message': 'tickers must be a list of at least 2'}), 400

    try:
        adj = fetch_adjusted_close(tickers, start=start, end=end)
        rets = compute_log_returns(adj)
        dates = rets.index
        lambda1_series = []
        lambda2_series = []
        spreads = []
        out_dates = []
        for i in range(window, len(dates)):
            window_rets = rets.iloc[i - window: i]
            if window_rets.shape[0] < 2:
                continue
            corr = compute_correlation_matrix(window_rets)
            eigvals = np.linalg.eigvalsh(corr.values)
            eig_sorted = np.sort(eigvals)[::-1]
            l1 = float(eig_sorted[0])
            l2 = float(eig_sorted[1]) if len(eig_sorted) > 1 else 0.0
            lambda1_series.append(l1)
            lambda2_series.append(l2)
            spreads.append(l1 - l2)
            out_dates.append(dates[i].strftime('%Y-%m-%d'))

        # compute mp bounds using T=window, N=len(tickers)
        T = window
        N = len(tickers)
        lambda_min, lambda_max = marchenko_pastur_bounds(T=T, N=N)

        return jsonify({'success': True, 'dates': out_dates, 'lambda1': lambda1_series, 'lambda2': lambda2_series, 'spread': spreads, 'lambda_min': lambda_min, 'lambda_max': lambda_max})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/warmup-sentiment', methods=['POST'])
def api_warmup_sentiment():
    """Warm-up FinBERT pipeline to reduce latency on first real request."""
    try:
        from services.sentiment import _load_pipeline
        _load_pipeline()
        return jsonify({'success': True, 'message': 'FinBERT warmup complete'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/predict-volatility', methods=['POST'])
def api_predict_volatility():
    body = request.get_json(force=True, silent=True) or {}
    tickers = body.get('tickers') or []
    start = body.get('start')
    end = body.get('end')
    model_name = body.get('model_name', 'volatility_rf.joblib')
    sentiments = body.get('sentiments') or None

    if not isinstance(tickers, list) or len(tickers) < 2:
        return jsonify({'success': False, 'message': 'tickers must be a list of at least 2'}), 400

    if not VOLATILITY_AVAILABLE:
        return jsonify({'success': False, 'message': 'volatility_model module not available on server; predict-volatility is disabled'}), 501

    try:
        model = load_model(name=model_name)
        result = predict_from_recent(tickers, start, end, model, sentiments=sentiments)
        # try to load persisted metrics if present
        metrics = None
        try:
            metrics_path = os.path.join(os.path.dirname(__file__), 'models', 'volatility_metrics.json')
            if os.path.exists(metrics_path):
                with open(metrics_path, 'r') as mf:
                    metrics = json.load(mf)
        except Exception:
            metrics = None
        return jsonify({'success': True, 'result': result, 'model_info': metrics})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/garch_volatility', methods=['GET'])
def api_garch_volatility():
    """Compute GARCH(1,1) conditional volatility and 1-step forecast for a single symbol.
    Query params: symbol (required), start (optional), end (optional)
    """
    symbol = request.args.get('symbol')
    start = request.args.get('start')
    end = request.args.get('end')
    if not symbol:
        return jsonify({'success': False, 'message': 'symbol query parameter is required'}), 400
    if not ARCH_AVAILABLE:
        return jsonify({'success': False, 'message': 'arch package not installed on server; garch_volatility disabled'}), 501
    try:
        # fetch adjusted close for single symbol
        adj = fetch_adjusted_close([symbol], start=start, end=end)
        if adj is None or adj.empty or symbol not in adj.columns:
            return jsonify({'success': False, 'message': f'No price data for {symbol}'}), 404

        # compute daily log returns
        rets = compute_log_returns(adj)
        series = rets[symbol].dropna()
        if series.shape[0] < 10:
            return jsonify({'success': False, 'message': 'Not enough data to fit GARCH (need at least 10 observations)'}), 400

        # fit GARCH(1,1)
        am = arch_model(series * 100.0, vol='GARCH', p=1, q=1)  # scale to percent to improve numeric stability
        res = am.fit(disp='off')

        # conditional volatility (in percent) -- arch returns vol in same units as series
        sigma_t = res.conditional_volatility.tolist()

        # forecast 1-step variance
        forecast = res.forecast(horizon=1)
        try:
            # forecast.variance is a DataFrame-like; extract last row, first col
            fv = forecast.variance.values
            forecast_variance = [float(x) for x in fv.flatten().tolist()]
            next_var = float(fv[-1, 0])
        except Exception:
            # fallback
            next_var = float(forecast.variance.iloc[-1, 0])
            forecast_variance = [float(v) for v in forecast.variance.iloc[:, 0].tolist()]

        vol_next = float(next_var ** 0.5)

        # model summary
        try:
            model_summary = res.summary().as_text()
        except Exception:
            model_summary = str(res)

        # dates aligned to series index
        dates = [d.strftime('%Y-%m-%d') for d in series.index]

        # convert sigma_t and forecast_variance to floats (they are percent since we scaled by 100)
        historical_vol = [float(v) for v in sigma_t]
        forecast_variance = [float(v) for v in forecast_variance]

        # compute simple insights
        insights = {}
        try:
            import numpy as _np
            median_vol = float(_np.median(historical_vol)) if historical_vol else 0.0
            if vol_next > 2 * median_vol:
                insights['summary'] = 'High volatility expected tomorrow.'
            elif vol_next < median_vol:
                insights['summary'] = 'Market is stable.'
            else:
                insights['summary'] = 'No significant change predicted.'

            # sudden spike detection: compare last sigma to median
            last_sigma = historical_vol[-1] if historical_vol else 0.0
            if vol_next > 1.5 * median_vol and last_sigma > 1.5 * median_vol:
                insights['note'] = 'Volatility clustering detected — risk increasing.'
        except Exception:
            insights = {}

        payload = {
            'success': True,
            'symbol': symbol,
            'dates': dates,
            'historical_volatility': historical_vol,  # percent units
            'next_day_volatility': vol_next,  # percent units
            'forecast_variance': forecast_variance,
            'model_summary': model_summary,
            'insights': insights
        }
        return jsonify(payload)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/hybrid_forecast', methods=['GET'])
def api_hybrid_forecast():
    """Hybrid ARIMA (mean) + GARCH(1,1) (volatility) forecast for next day.
    Query params: symbol (required), start (optional), end (optional), p,d,q (optional ARIMA order)
    Returns JSON with returns series, arima forecast, garch vol forecast, CI and model summaries.
    """
    symbol = request.args.get('symbol')
    start = request.args.get('start')
    end = request.args.get('end')
    try:
        p = int(request.args.get('p', 1))
        d = int(request.args.get('d', 0))
        q = int(request.args.get('q', 1))
    except Exception:
        return jsonify({'success': False, 'message': 'Invalid p,d,q values'}), 400

    if not symbol:
        return jsonify({'success': False, 'message': 'symbol query parameter is required'}), 400
    if not STATS_AVAILABLE:
        return jsonify({'success': False, 'message': 'statsmodels not installed on server; ARIMA is unavailable'}), 501
    if not ARCH_AVAILABLE:
        return jsonify({'success': False, 'message': 'arch package not installed on server; GARCH is unavailable'}), 501

    try:
        # Fetch adjusted close for single symbol
        adj = fetch_adjusted_close([symbol], start=start, end=end)
        if adj is None or adj.empty or symbol not in adj.columns:
            return jsonify({'success': False, 'message': f'No price data for {symbol}'}), 404

        # compute daily log returns (decimal form)
        rets = compute_log_returns(adj)
        series = rets[symbol].dropna()
        if series.shape[0] < 20:
            return jsonify({'success': False, 'message': 'Not enough data to fit models (need at least 20 returns)'}), 400

        # ---------------------- ARIMA (mean forecast) ----------------------
        try:
            arima_model = ARIMA(series, order=(p, d, q))
            arima_res = arima_model.fit()
            arima_fore = arima_res.forecast(steps=1)
            arima_pred = float(arima_fore.iloc[0]) if hasattr(arima_fore, 'iloc') else float(arima_fore[0])
            try:
                arima_summary = arima_res.summary().as_text()
            except Exception:
                arima_summary = str(arima_res)
        except Exception as e:
            return jsonify({'success': False, 'message': f'ARIMA fit error: {e}'}), 500

        # ---------------------- GARCH (volatility forecast) ----------------------
        try:
            # scale returns to percent for numeric stability (consistent with garch endpoint)
            am = arch_model(series * 100.0, vol='GARCH', p=1, q=1)
            garch_res = am.fit(disp='off')

            sigma_t = garch_res.conditional_volatility.tolist()  # percent units
            forecast = garch_res.forecast(horizon=1)
            try:
                fv = forecast.variance.values
                next_var = float(fv[-1, 0])
            except Exception:
                next_var = float(forecast.variance.iloc[-1, 0])
            sigma_next = float(next_var ** 0.5)
            try:
                garch_summary = garch_res.summary().as_text()
            except Exception:
                garch_summary = str(garch_res)
        except Exception as e:
            return jsonify({'success': False, 'message': f'GARCH fit error: {e}'}), 500

        # ---------------------- Hybrid distribution and CI ----------------------
        # Convert ARIMA prediction to percent (returns are decimals)
        arima_pred_pct = arima_pred * 100.0

        # Confidence interval using normal z (95% -> 1.96)
        z95 = 1.96
        ci_lower = arima_pred_pct - z95 * sigma_next
        ci_upper = arima_pred_pct + z95 * sigma_next

        # Prepare payload
        dates = [d.strftime('%Y-%m-%d') for d in series.index]
        returns_list = [float(v) for v in series.tolist()]

        payload = {
            'success': True,
            'symbol': symbol,
            'dates': dates,
            'returns': returns_list,
            'arima_return_forecast': arima_pred_pct,  # percent
            'garch_vol_forecast': sigma_next,  # percent
            'hybrid_confidence_lower': ci_lower,
            'hybrid_confidence_upper': ci_upper,
            'conditional_vol_series': [float(v) for v in sigma_t],
            'arima_model_summary': arima_summary,
            'garch_model_summary': garch_summary
        }

        return jsonify(payload)
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