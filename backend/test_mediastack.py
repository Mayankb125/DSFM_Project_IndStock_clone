import os
from dotenv import load_dotenv
import requests
from datetime import datetime, timedelta

load_dotenv()

# Test MediaStack
key = os.getenv('MEDIASTACK_KEY')
print(f'MEDIASTACK_KEY loaded: {key}')

if key:
    url = "https://api.mediastack.com/v1/news"
    to_date = datetime.utcnow()
    from_date = to_date - timedelta(days=7)
    
    keywords = 'HDFC Bank'
    
    params = {
        'access_key': key,
        'keywords': keywords,
        'languages': 'en',
        'date': f"{from_date.strftime('%Y-%m-%d')},{to_date.strftime('%Y-%m-%d')}",
        'limit': 5,
        'sort': 'published_desc'
    }
    
    print(f'\nTesting MediaStack with params:')
    print(f"  keywords: {keywords}")
    print(f"  date: {params['date']}")
    
    try:
        resp = requests.get(url, params=params, timeout=15)
        print(f'\nStatus code: {resp.status_code}')
        data = resp.json()
        print(f'Response keys: {list(data.keys())}')
        
        if resp.status_code == 200:
            articles = data.get('data', [])
            print(f'\nFound {len(articles)} articles')
            for i, art in enumerate(articles[:3]):
                print(f'{i+1}. {art.get("title", "")[:100]}')
                print(f'   Source: {art.get("source", "")}')
        else:
            print(f'Error: {data}')
    except Exception as e:
        print(f'Request failed: {e}')
