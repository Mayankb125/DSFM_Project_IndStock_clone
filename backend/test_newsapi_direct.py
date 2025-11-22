import os
from dotenv import load_dotenv
import requests
from datetime import datetime, timedelta

load_dotenv()

# Test NewsAPI directly
key = os.getenv('NEWSAPI_KEY')
print(f'NEWSAPI_KEY loaded: {key}')

if key:
    # Test with a simple query
    url = "https://newsapi.org/v2/everything"
    to_date = datetime.utcnow()
    from_date = to_date - timedelta(days=7)
    
    params = {
        'q': '"HDFC Bank"',
        'from': from_date.strftime('%Y-%m-%d'),
        'to': to_date.strftime('%Y-%m-%d'),
        'language': 'en',
        'sortBy': 'publishedAt',
        'pageSize': 5,
        'apiKey': key  # Try apiKey parameter instead of header
    }
    
    print(f'\nTesting NewsAPI with params:')
    print(f"  q: {params['q']}")
    print(f"  from: {params['from']}")
    print(f"  to: {params['to']}")
    
    try:
        # Try with apiKey parameter
        resp = requests.get(url, params=params, timeout=15)
        print(f'\nStatus code: {resp.status_code}')
        data = resp.json()
        print(f'Response keys: {list(data.keys())}')
        
        if resp.status_code == 200:
            articles = data.get('articles', [])
            print(f'\nFound {len(articles)} articles')
            for i, art in enumerate(articles[:3]):
                print(f'{i+1}. {art.get("title", "")[:100]}')
        else:
            print(f'Error: {data.get("message", "")}')
            print(f'Code: {data.get("code", "")}')
    except Exception as e:
        print(f'Request failed: {e}')
