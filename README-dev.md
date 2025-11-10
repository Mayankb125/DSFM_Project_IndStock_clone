# Development Setup Guide

This guide provides instructions for setting up and running the INDstocks project locally.

## Prerequisites

- **Node.js** (v16 or higher) and npm
- **Python** (v3.8 or higher) and pip
- **Git**

## Project Structure

```
DSFM_Project_IndStock_clone/
├── backend/          # Flask API server
│   ├── app.py       # Main Flask application
│   ├── services/    # Business logic services
│   └── cache/       # Cached stock data
├── frontend/         # React application
│   ├── src/         # React source code
│   └── public/      # Static assets
└── scripts/         # Utility scripts
```

## Backend Setup

### 1. Navigate to backend directory

```bash
cd backend
```

### 2. Create virtual environment (recommended)

**Windows:**
```powershell
python -m venv venv
.\venv\Scripts\activate
```

**Unix/macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

If `requirements.txt` is missing, install manually:
```bash
pip install Flask Flask-CORS yfinance pandas numpy APScheduler python-dotenv requests transformers torch
```

### 4. Configure environment (optional)

Create a `.env` file in the `backend/` directory if needed:
```env
# Add any required API keys or configuration here
```

### 5. Start the backend server

```bash
python app.py
```

The backend will start on `http://localhost:5000` and will:
- Fetch stock data on startup
- Update data every 30 seconds
- Cache data in `backend/cache/stock_data.json`

**Expected output:**
```
==================================================
[INFO] Flask Stock API Server Starting...
==================================================
[INFO] API at: http://localhost:5000
[INFO] Stock data updates: Every 30 seconds
==================================================
```

## Frontend Setup

### 1. Navigate to frontend directory

```bash
cd frontend
```

### 2. Install dependencies

```bash
npm install
```

If you encounter `ajv` or `ajv-formats` errors:
```bash
npm install ajv@8.12.0 ajv-formats@2.1.1
npm install --legacy-peer-deps
```

### 3. Configure environment (optional)

Create a `.env.development` file in the `frontend/` directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

**Note:** The `package.json` already includes a proxy configuration for development, so you can also use relative URLs (`/api`) in your code.

### 4. Start the development server

```bash
npm start
```

The frontend will start on `http://localhost:3000` and automatically open in your browser.

## Running Both Services

### Option 1: Separate Terminals

**Terminal 1 (Backend):**
```bash
cd backend
python app.py
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

### Option 2: Background Processes

**Windows PowerShell:**
```powershell
# Start backend in background
Start-Process python -ArgumentList "backend/app.py" -WindowStyle Hidden

# Start frontend
cd frontend
npm start
```

**Unix/macOS:**
```bash
# Start backend in background
cd backend && python app.py &
cd ../frontend && npm start
```

## API Endpoints

The backend exposes the following endpoints:

- `GET /api/health` - Health check
- `GET /api/stocks` - Get all stocks
- `GET /api/stocks/<symbol>` - Get specific stock
- `GET /api/index` - Get Nifty 50 and Sensex indices
- `GET /api/index/nifty50` - Get Nifty 50 only
- `GET /api/index/sensex` - Get Sensex only
- `GET /api/historical/<symbol>?period=1y&interval=1d` - Get historical data
- `POST /api/prices` - Get adjusted close prices and returns
- `POST /api/correlations` - Compute correlation matrix
- `POST /api/rmt` - Denoise correlation using RMT
- `POST /api/news` - Fetch news for tickers
- `POST /api/sentiment` - Analyze sentiment
- `POST /api/predict` - Get predictions
- `POST /api/refresh` - Manually refresh data

## Smoke Testing

Run the smoke check script to verify endpoints are working:

**Unix/macOS:**
```bash
chmod +x scripts/smoke-check.sh
./scripts/smoke-check.sh
```

**Windows PowerShell:**
```powershell
.\scripts\smoke-check.ps1
```

**Manual testing:**
```bash
# Health check
curl http://localhost:5000/api/health

# Get stocks
curl http://localhost:5000/api/stocks

# Get indices
curl http://localhost:5000/api/index
```

## Troubleshooting

### Backend Issues

1. **ModuleNotFoundError**: Ensure virtual environment is activated and dependencies are installed.
2. **Port 5000 already in use**: Change port in `app.py` or stop the conflicting service.
3. **yfinance errors**: Check internet connection and try again. yfinance may have rate limits.

### Frontend Issues

1. **npm install errors**: 
   - Clear cache: `npm cache clean --force`
   - Delete `node_modules` and `package-lock.json`, then reinstall
   - Try `npm install --legacy-peer-deps`

2. **CORS errors**: Ensure backend CORS is enabled (already configured in `app.py`).

3. **API connection errors**: 
   - Verify backend is running on port 5000
   - Check `REACT_APP_API_URL` in `.env.development`
   - Verify proxy in `package.json`

4. **Build errors**: Check for missing imports or syntax errors in console.

### Common Fixes

**Fix ajv/ajv-formats compatibility:**
```bash
cd frontend
npm install ajv@8.12.0 ajv-formats@2.1.1
npm install
```

**Reset frontend:**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Reset backend cache:**
```bash
rm backend/cache/stock_data.json
# Restart backend to regenerate cache
```

## Development Workflow

1. **Start backend** → `cd backend && python app.py`
2. **Start frontend** → `cd frontend && npm start`
3. **Make changes** → Files auto-reload (frontend) or restart backend
4. **Test endpoints** → Use smoke-check script or curl
5. **Check logs** → Backend logs to console, frontend logs to browser console

## Environment Variables

### Backend
- No required environment variables by default
- Optional: Add API keys in `.env` for news/sentiment services

### Frontend
- `REACT_APP_API_URL` - Backend API URL (default: `http://localhost:5000/api`)

## Next Steps

- Review the codebase structure
- Check API documentation in `backend/app.py`
- Explore components in `frontend/src/components/`
- Run smoke tests to verify setup

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review error messages in console/logs
3. Verify all prerequisites are installed
4. Ensure both services are running

