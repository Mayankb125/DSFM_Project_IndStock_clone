import requests, json
url='http://127.0.0.1:5000/api/sentiment-adjusted-corr'
body={'tickers':['INFY.NS','SBIN.NS','TCS.NS'],'lookback_days':7,'alpha':0.3}
res = requests.post(url,json=body)
print('status',res.status_code)
j=res.json()
print('tickers',j.get('tickers'))
print('sentiment',j.get('sentiment'))
print('raw')
for r in j.get('raw',[]):
    print(r)
print('adjusted')
for r in j.get('adjusted',[]):
    print(r)
