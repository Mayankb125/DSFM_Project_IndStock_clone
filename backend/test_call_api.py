import requests
import json
url = 'http://127.0.0.1:5000/api/sentiment-adjusted-corr'
payload = {'tickers': ['HDFCBANK.NS','INFY.NS','TCS.NS'], 'lookback_days': 7}
try:
    r = requests.post(url, json=payload, timeout=30)
    print('status', r.status_code)
    print(json.dumps(r.json(), indent=2)[:2000])
except Exception as e:
    print('Request failed:', e)
