import os
from datetime import datetime, timedelta
from typing import List, Dict, Any

import requests
import time


NEWSAPI_ENDPOINT = "https://newsapi.org/v2/everything"
MEDIASTACK_ENDPOINT = "https://api.mediastack.com/v1/news"
TWITTER_API_V2_ENDPOINT = "https://api.twitter.com/2/tweets/search/recent"

# Mapping from ticker to NewsAPI query keywords (use company names for better matches)
TICKER_QUERY_MAP = {
    'RELIANCE.NS': '"Reliance Industries"',
    'TCS.NS': '"Tata Consultancy Services"',
    'INFY.NS': '"Infosys"',
    'HDFCBANK.NS': '"HDFC Bank"',
    'ICICIBANK.NS': '"ICICI Bank"',
    'ITC.NS': '"ITC Limited"',
    'LT.NS': '"Larsen & Toubro"',
    'SBIN.NS': '"State Bank of India"',
    'BHARTIARTL.NS': '"Bharti Airtel"',
    'AXISBANK.NS': '"Axis Bank"',
    'KOTAKBANK.NS': '"Kotak Mahindra Bank"',
    'HCLTECH.NS': '"HCL Technologies"',
    'WIPRO.NS': '"Wipro"',
    'ASIANPAINT.NS': '"Asian Paints"',
    'HINDUNILVR.NS': '"Hindustan Unilever"',
    'MARUTI.NS': '"Maruti Suzuki"',
    'SUNPHARMA.NS': '"Sun Pharma"',
    'ULTRACEMCO.NS': '"UltraTech Cement"',
    'BAJAJFINSV.NS': '"Bajaj Finserv"',
    'BAJFINANCE.NS': '"Bajaj Finance"',
    'ADANIENT.NS': '"Adani Enterprises"',
    'ADANIPORTS.NS': '"Adani Ports"',
    'TITAN.NS': '"Titan Company"',
    'NESTLEIND.NS': '"Nestle India"',
    'TATASTEEL.NS': '"Tata Steel"',
    'JSWSTEEL.NS': '"JSW Steel"',
    'POWERGRID.NS': '"Power Grid"',
    'NTPC.NS': '"NTPC"',
    'COALINDIA.NS': '"Coal India"',
    'M&M.NS': '"Mahindra & Mahindra"',
    'TATAMOTORS.NS': '"Tata Motors"',
    'EICHERMOT.NS': '"Eicher Motors"',
    'HEROMOTOCO.NS': '"Hero MotoCorp"',
    'CIPLA.NS': '"Cipla"',
    'DRREDDY.NS': '"Dr. Reddy"',
    'BRITANNIA.NS': '"Britannia"',
    'DIVISLAB.NS': '"Divis Laboratories"',
    'HDFCLIFE.NS': '"HDFC Life"',
    'SBILIFE.NS': '"SBI Life"',
    'GRASIM.NS': '"Grasim"',
    'SHREECEM.NS': '"Shree Cement"',
    'BPCL.NS': '"BPCL"',
    'HINDALCO.NS': '"Hindalco"',
    'ONGC.NS': '"ONGC"',
    'APOLLOHOSP.NS': '"Apollo Hospitals"',
    'BAJAJ-AUTO.NS': '"Bajaj Auto"',
    'TATACONSUM.NS': '"Tata Consumer"',
    'TECHM.NS': '"Tech Mahindra"',
    'INDUSINDBK.NS': '"IndusInd Bank"',
    'UPL.NS': '"UPL Limited"'
}


def _fetch_newsapi(ticker: str, query: str, from_date: datetime, to_date: datetime, page_size: int, api_key: str) -> List[Dict[str, Any]]:
    """Fetch news from NewsAPI for a single ticker"""
    items: List[Dict[str, Any]] = []
    headers = {"X-Api-Key": api_key}
    params = {
        "q": query,
        "from": from_date.strftime('%Y-%m-%d'),
        "to": to_date.strftime('%Y-%m-%d'),
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": min(max(page_size, 1), 20),
    }
    for attempt in range(3):
        try:
            resp = requests.get(NEWSAPI_ENDPOINT, params=params, headers=headers, timeout=15)
            resp.raise_for_status()
            payload = resp.json()
            articles = payload.get('articles', [])
            for a in articles:
                items.append({
                    'title': a.get('title'),
                    'snippet': a.get('description'),
                    'published_at': a.get('publishedAt'),
                    'url': a.get('url'),
                    'source': a.get('source', {}).get('name')
                })
            break
        except requests.RequestException:
            if attempt < 2:
                time.sleep(1.5 * (attempt + 1))
                continue
    return items


def _fetch_mediastack(ticker: str, query: str, from_date: datetime, to_date: datetime, page_size: int, api_key: str) -> List[Dict[str, Any]]:
    """Fetch news from MediaStack (Apilayer) for a single ticker"""
    items: List[Dict[str, Any]] = []
    # Remove quotes from query for mediastack
    keywords = query.replace('"', '').strip()
    params = {
        "access_key": api_key,
        "keywords": keywords,
        "languages": "en",
        "date": f"{from_date.strftime('%Y-%m-%d')},{to_date.strftime('%Y-%m-%d')}",
        "limit": min(max(page_size, 1), 25),
        "sort": "published_desc"
    }
    for attempt in range(3):
        try:
            resp = requests.get(MEDIASTACK_ENDPOINT, params=params, timeout=15)
            resp.raise_for_status()
            payload = resp.json()
            articles = payload.get('data', [])
            for a in articles:
                items.append({
                    'title': a.get('title'),
                    'snippet': a.get('description'),
                    'published_at': a.get('published_at'),
                    'url': a.get('url'),
                    'source': a.get('source')
                })
            break
        except requests.RequestException:
            if attempt < 2:
                time.sleep(1.5 * (attempt + 1))
                continue
    return items


def _fetch_twitter(ticker: str, query: str, lookback_days: int, max_results: int, bearer_token: str) -> List[Dict[str, Any]]:
    """Fetch tweets from Twitter API v2 for a single ticker"""
    items: List[Dict[str, Any]] = []
    # Remove quotes and prepare query for Twitter search
    keywords = query.replace('"', '').strip()
    # Twitter search query - look for company mentions
    search_query = f"{keywords} -is:retweet lang:en"
    
    headers = {
        "Authorization": f"Bearer {bearer_token}"
    }
    
    # Calculate start_time (Twitter API uses ISO 8601)
    start_time = (datetime.utcnow() - timedelta(days=lookback_days)).strftime('%Y-%m-%dT%H:%M:%SZ')
    
    params = {
        "query": search_query,
        "max_results": min(max(max_results, 10), 100),  # Twitter allows 10-100
        "start_time": start_time,
        "tweet.fields": "created_at,public_metrics,text,author_id",
        "expansions": "author_id",
        "user.fields": "username,name"
    }
    
    for attempt in range(3):
        try:
            resp = requests.get(TWITTER_API_V2_ENDPOINT, params=params, headers=headers, timeout=15)
            resp.raise_for_status()
            payload = resp.json()
            
            tweets = payload.get('data', [])
            users = {u['id']: u for u in payload.get('includes', {}).get('users', [])}
            
            for tweet in tweets:
                author_id = tweet.get('author_id')
                author = users.get(author_id, {})
                author_name = author.get('username', 'Unknown')
                
                # Convert tweet to news article format
                items.append({
                    'title': tweet.get('text', '')[:200],  # Truncate long tweets
                    'snippet': tweet.get('text', ''),
                    'published_at': tweet.get('created_at', ''),
                    'url': f"https://twitter.com/{author_name}/status/{tweet.get('id', '')}",
                    'source': f"Twitter (@{author_name})"
                })
            break
        except requests.RequestException as e:
            if attempt < 2:
                time.sleep(2 * (attempt + 1))
                continue
            # If Twitter API fails, continue without tweets
            pass
    return items


def _deduplicate_articles(articles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Remove duplicate articles based on URL or similar title"""
    seen_urls = set()
    seen_titles = set()
    unique = []
    for article in articles:
        url = article.get('url', '').lower().strip()
        title = article.get('title', '').lower().strip()[:50]  # first 50 chars for comparison
        if url and url not in seen_urls:
            seen_urls.add(url)
            seen_titles.add(title)
            unique.append(article)
        elif title and title not in seen_titles:
            seen_titles.add(title)
            unique.append(article)
    return unique


def fetch_news_for_tickers(tickers: List[str], lookback_days: int = 7, page_size: int = 10) -> Dict[str, List[Dict[str, Any]]]:
    newsapi_key = os.getenv('NEWSAPI_KEY')
    mediastack_key = os.getenv('MEDIASTACK_KEY') or os.getenv('APILAYER_KEY')
    twitter_bearer = os.getenv('TWITTER_BEARER_TOKEN')
    
    if not newsapi_key and not mediastack_key and not twitter_bearer:
        raise RuntimeError("At least one of NEWSAPI_KEY, MEDIASTACK_KEY, or TWITTER_BEARER_TOKEN must be set in environment")

    to_date = datetime.utcnow()
    from_date = to_date - timedelta(days=lookback_days)

    results: Dict[str, List[Dict[str, Any]]] = {}

    for ticker in tickers:
        query = TICKER_QUERY_MAP.get(ticker, ticker)
        all_articles: List[Dict[str, Any]] = []
        
        # Fetch from NewsAPI if available
        if newsapi_key:
            try:
                newsapi_items = _fetch_newsapi(ticker, query, from_date, to_date, page_size, newsapi_key)
                all_articles.extend(newsapi_items)
            except Exception:
                pass  # Continue even if NewsAPI fails
        
        # Fetch from MediaStack (Apilayer) if available
        if mediastack_key:
            try:
                mediastack_items = _fetch_mediastack(ticker, query, from_date, to_date, page_size, mediastack_key)
                all_articles.extend(mediastack_items)
            except Exception:
                pass  # Continue even if MediaStack fails
        
        # Fetch from Twitter/X if available
        if twitter_bearer:
            try:
                twitter_items = _fetch_twitter(ticker, query, lookback_days, page_size, twitter_bearer)
                all_articles.extend(twitter_items)
            except Exception:
                pass  # Continue even if Twitter fails
        
        # Deduplicate and limit results
        unique_articles = _deduplicate_articles(all_articles)
        # Sort by published_at (most recent first) and limit
        unique_articles.sort(key=lambda x: x.get('published_at', ''), reverse=True)
        results[ticker] = unique_articles[:page_size * 3]  # Allow more since we're combining 3 sources

    return results


