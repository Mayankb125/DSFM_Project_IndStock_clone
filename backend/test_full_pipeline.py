from dotenv import load_dotenv
load_dotenv()

from services.yahoo_finance import YahooFinanceService
from services.analytics import fetch_adjusted_close, compute_log_returns, compute_correlation_matrix
from services.news import fetch_news_for_tickers
from services.sentiment import analyze_texts
import numpy as np

print("Testing full correlation adjustment pipeline...\n")

tickers = ['HDFCBANK.NS', 'INFY.NS', 'TCS.NS']
print(f"Tickers: {tickers}\n")

# 1. Fetch prices and compute raw correlation
print("1. Fetching prices and computing raw correlation...")
adj = fetch_adjusted_close(tickers, start='2025-10-01', end='2025-11-22')
rets = compute_log_returns(adj)
corr_raw = compute_correlation_matrix(rets)
print("Raw correlation matrix:")
print(corr_raw.round(3))
print()

# 2. Fetch news
print("2. Fetching news...")
news = fetch_news_for_tickers(tickers, lookback_days=7, page_size=5)
for t in tickers:
    print(f"  {t}: {len(news.get(t, []))} articles")
print()

# 3. Compute sentiment per ticker
print("3. Computing sentiment...")
per_ticker_sent = {}
for t in tickers:
    headlines = [n['title'] for n in news.get(t, []) if n.get('title')]
    if headlines:
        sentiments = analyze_texts(headlines)
        avg = float(np.mean([s['score'] for s in sentiments])) if sentiments else 0.0
        per_ticker_sent[t] = avg
        print(f"  {t}: {len(headlines)} headlines, avg sentiment = {avg:.4f}")
    else:
        per_ticker_sent[t] = 0.0
        print(f"  {t}: no headlines")
print()

# 4. Adjust correlations
print("4. Adjusting correlations with sentiment (alpha=0.3)...")
alpha = 0.3
corr_mat = corr_raw.values.astype(float)
adjusted = corr_mat.copy()
for i, ti in enumerate(corr_raw.columns):
    for j, tj in enumerate(corr_raw.columns):
        adj_factor = 1.0 + alpha * (per_ticker_sent.get(ti, 0.0) + per_ticker_sent.get(tj, 0.0)) / 2.0
        adjusted[i, j] = float(np.clip(corr_mat[i, j] * adj_factor, -1.0, 1.0))

print("Sentiment-adjusted correlation matrix:")
print(np.round(adjusted, 3))
print()

# 5. Show differences
print("5. Difference (adjusted - raw):")
diff = adjusted - corr_mat
print(np.round(diff, 3))
print()

if np.allclose(corr_mat, adjusted, atol=1e-6):
    print("WARNING: Matrices are identical (no sentiment effect)")
else:
    print("SUCCESS: Sentiment adjustment is working! Matrices differ.")
