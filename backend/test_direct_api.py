from dotenv import load_dotenv
import os
import requests
load_dotenv()

newsapi_key = os.getenv('NEWSAPI_KEY')
mediastack_key = os.getenv('MEDIASTACK_KEY')

print('=== Testing NewsAPI ===')
if newsapi_key:
    url = 'https://newsapi.org/v2/everything'
    params = {'q': 'HDFC Bank', 'from': '2025-11-15', 'to': '2025-11-22', 'language': 'en', 'pageSize': 5}
    r = requests.get(url, params=params, headers={'X-Api-Key': newsapi_key}, timeout=15)
    print(f'Status: {r.status_code}')
    j = r.json()
    print(f'Response keys: {list(j.keys())}')
    if 'message' in j:
        print(f'Message: {j["message"]}')
    if 'articles' in j:
        print(f'Articles count: {len(j["articles"])}')
        for i, a in enumerate(j['articles'][:3]):
            print(f'  {i+1}. {a.get("title", "")[:100]}')
else:
    print('NEWSAPI_KEY not set')

print('\n=== Testing MediaStack ===')
if mediastack_key:
    url = 'https://api.mediastack.com/v1/news'
    params = {'access_key': mediastack_key, 'keywords': 'HDFC Bank', 'languages': 'en', 'limit': 5}
    r = requests.get(url, params=params, timeout=15)
    print(f'Status: {r.status_code}')
    j = r.json()
    print(f'Response keys: {list(j.keys())}')
    if 'error' in j:
        print(f'Error: {j["error"]}')
    if 'data' in j:
        print(f'Articles count: {len(j["data"])}')
        for i, a in enumerate(j['data'][:3]):
            print(f'  {i+1}. {a.get("title", "")[:100]}')
else:
    print('MEDIASTACK_KEY not set')
