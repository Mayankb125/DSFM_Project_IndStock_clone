from dotenv import load_dotenv
import os
load_dotenv()
from services.news import fetch_news_for_tickers

print('NEWSAPI_KEY', os.getenv('NEWSAPI_KEY') is not None)
print('MEDIASTACK_KEY', os.getenv('MEDIASTACK_KEY') is not None)
print('TWITTER_BEARER_TOKEN', os.getenv('TWITTER_BEARER_TOKEN') is not None)

try:
    tickers = ['HDFCBANK.NS','INFY.NS','TCS.NS']
    res = fetch_news_for_tickers(tickers, lookback_days=3, page_size=5)
    for t in tickers:
        items = res.get(t, [])
        print(f"{t}: {len(items)} articles")
        for i,a in enumerate(items[:3]):
            print(f"  {i+1}. {a.get('title')[:120]} ({a.get('source')})")
except Exception as e:
    print('Error fetching news:', e)

# Diagnostic: try direct NewsAPI request for first ticker and print status/json
import requests
from services.news import NEWSAPI_ENDPOINT, TICKER_QUERY_MAP
key = os.getenv('NEWSAPI_KEY')
if key:
    q = TICKER_QUERY_MAP.get('HDFCBANK.NS','HDFCBANK.NS')
    params = {'q': q, 'from': (os.environ.get('FROM_DATE') or ''), 'to': (os.environ.get('TO_DATE') or ''), 'language': 'en', 'sortBy': 'publishedAt', 'pageSize': 5}
    try:
        resp = requests.get(NEWSAPI_ENDPOINT, params={k:v for k,v in params.items() if v}, headers={'X-Api-Key': key}, timeout=15)
        print('Direct NewsAPI status', resp.status_code)
        try:
            print('Direct NewsAPI json keys:', list(resp.json().keys()))
        except Exception as _e:
            print('Failed to parse NewsAPI json:', _e)
    except Exception as e:
        print('Direct NewsAPI request failed:', e)
