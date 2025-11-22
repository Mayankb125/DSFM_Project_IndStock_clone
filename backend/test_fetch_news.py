from services.news import fetch_news_for_tickers
import json
try:
    res = fetch_news_for_tickers(['TCS.NS','INFY.NS'], lookback_days=3, page_size=3)
    print(json.dumps({k: len(v) for k,v in res.items()}, indent=2))
    for k,v in res.items():
        print('---', k)
        for a in v[:3]:
            print('-', a.get('title'))
except Exception as e:
    print('ERROR', e)
