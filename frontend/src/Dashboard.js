import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import TickerSelector from './components/TickerSelector';
import Heatmap from './components/Heatmap';
import SentimentCards from './components/SentimentCards';
import PredictionBadges from './components/PredictionBadges';
import Sparkline from './components/Sparkline';
import VolatilityPanel from './components/VolatilityPanel';
import EigenHistogram from './components/EigenHistogram';
import EigenSpectrum from './components/EigenSpectrum';
import StressGauge from './components/StressGauge';
import TrainModelPanel from './components/TrainModelPanel';
import InsightsCard from './components/InsightsCard';
import Plot from 'react-plotly.js';

// Single entry inference generator
// Accepts the analysis payload returned from /api/analyze (or /api/vol_diagnostics)
// Returns structured inference object as specified in requirements
export function generateInferences(payload) {
  // Helper: safe access
  const safe = (p, def = null) => (p === undefined || p === null ? def : p);

  // Compute sample size (T) from returns if available
  let sample_size = 0;
  try {
    const returnsObj = payload.returns || {};
    const first = Object.values(returnsObj)[0] || [];
    sample_size = Array.isArray(first) ? first.length : 0;
  } catch (e) { sample_size = 0 }

  // Raw correlation: compute mean absolute correlation from raw matrix
  let mean_abs_corr = 0;
  const corrMatrix = safe(payload.correlations && payload.correlations.raw, null) || null;
  try {
    if (corrMatrix && Array.isArray(corrMatrix) && corrMatrix.length) {
      const N = corrMatrix.length;
      let sum = 0; let count = 0;
      for (let i = 0; i < N; i++) {
        for (let j = i+1; j < N; j++) {
          const v = Math.abs(Number(corrMatrix[i][j] ?? 0));
          sum += v; count += 1;
        }
      }
      mean_abs_corr = count ? sum / count : 0;
    }
  } catch (e) { mean_abs_corr = 0 }

  // Correlation level thresholds
  let corrLevel = 'low';
  if (mean_abs_corr < 0.2) corrLevel = 'low';
  else if (mean_abs_corr < 0.5) corrLevel = 'moderate';
  else corrLevel = 'high';

  // Sentiment impact: compute average |S| and pairwise sentiment-weighted change in mean correlation
  let sentimentAdjusted = { summary: 'No sentiment data', impact: 'none', notes: [] };
  try {
    const sentiment = safe(payload.sentiment, null);
    const adjustedCorr = safe(payload.adjusted_correlation && payload.adjusted_correlation.adjusted, null);
    const rawCorrFromAdj = safe(payload.adjusted_correlation && payload.adjusted_correlation.raw, null);
    if (!sentiment || !Array.isArray(sentiment) && typeof sentiment === 'object' && Object.keys(sentiment).length === 0) {
      sentimentAdjusted = { summary: 'No sentiment data', impact: 'none', notes: ['No sentiment available for this analysis'] };
    } else {
      // compute avg |S|
      let svals = [];
      if (Array.isArray(sentiment)) svals = sentiment.map(s=>Math.abs(Number(s)||0));
      else if (typeof sentiment === 'object') svals = Object.values(sentiment).map(s=>Math.abs(Number(s)||0));
      const avgAbsS = svals.length ? svals.reduce((a,b)=>a+b,0)/svals.length : 0;

      // compute mean_abs_corr for adjusted and raw (pairwise)
      const meanAbs = (m) => {
        try {
          if (!m || !m.length) return 0;
          const N = m.length; let sum=0, count=0;
          for (let i=0;i<N;i++) for (let j=i+1;j<N;j++){ sum += Math.abs(Number(m[i][j]||0)); count++; }
          return count? sum/count:0;
        } catch(e){ return 0 }
      };
      const rawMean = meanAbs(rawCorrFromAdj || corrMatrix);
      const adjMean = meanAbs(adjustedCorr || rawCorrFromAdj || corrMatrix);
      const change = Math.abs(adjMean - rawMean);

      let impact = 'none';
      if (change < 0.01) impact = 'none';
      else if (change < 0.03) impact = 'small';
      else if (change < 0.06) impact = 'medium';
      else impact = 'large';

      const summary = `News sentiment ${impact === 'none' ? 'had almost no effect on how stocks move together' : (impact === 'small' ? 'slightly influenced stock relationships' : (impact === 'medium'? 'moderately changed stock relationships' : 'strongly affected how stocks move together'))}.`;
      const notes = [
        impact === 'none' ? 'Market news is not driving stock relationships right now' : 'Recent news is affecting how stocks correlate',
        change < 0.01 ? 'Very minimal change in correlations' : (change < 0.03 ? 'Small shift in how stocks move together' : 'Noticeable change in stock relationships')
      ];
      if (sample_size && sample_size < 30) notes.push('Not much data — take these insights with caution');
      sentimentAdjusted = { summary, impact, notes };
    }
  } catch (e) { sentimentAdjusted = { summary: 'No sentiment data', impact: 'none', notes: ['Sentiment processing failed'] } }

  // RMT: compute Q and lambda bounds and noise fraction
  let rmtHistogram = { summary: 'RMT data not available', noiseFraction: 0, lambda_plus: 0, notes: [] };
  try {
    const eigenvalues = safe(payload.rmt && payload.rmt.eigenvalues, null) || [];
    const T = sample_size || Number(payload.rmt && payload.rmt.T) || 0;
    const N = (payload.tickers && payload.tickers.length) || (eigenvalues.length || 0);
    const Q = (N>0 && T>0) ? (T / N) : null;
    const helper = (Qv) => {
      const s = Math.sqrt(1/Math.max(Qv, 1e-12));
      const lambda_plus = Math.pow(1 + s, 2);
      const lambda_minus = Math.pow(1 - s, 2);
      return { lambda_plus, lambda_minus };
    };
    if (Q && eigenvalues && eigenvalues.length) {
      const { lambda_plus, lambda_minus } = helper(Q);
      const within = eigenvalues.filter(l => l >= lambda_minus && l <= lambda_plus).length;
      const noiseFraction = eigenvalues.length ? within / eigenvalues.length : 0;
      let summary = 'Mixed real patterns and random noise';
      if (noiseFraction > 0.8) summary = 'Mostly random noise — hard to find real patterns';
      else if (noiseFraction > 0.5) summary = 'A lot of noise mixed with some real patterns';
      else summary = 'Clear patterns detected — less random noise';
      const notes = [
        noiseFraction > 0.8 ? 'Most movements look random' : (noiseFraction > 0.5 ? 'Some real trends, some randomness' : 'Strong real patterns found'),
        `About ${(noiseFraction * 100).toFixed(0)}% of the data is just noise`
      ];
      if (sample_size && sample_size < 30) notes.push('Not enough data — these numbers might be unreliable');
      rmtHistogram = { summary, noiseFraction, lambda_plus, notes };
    }
  } catch (e) { /* leave default */ }

  // Eigen-spectrum: top 3 eigenvalues and interpretations
  let eigenSpectrum = { lambda1: 0, lambda2: 0, lambda3: 0, summary: 'Eigenvalues not available', factorInterpretation: [] };
  try {
    const eigenvalues = (payload.rmt && payload.rmt.eigenvalues) || [];
    const sorted = [...eigenvalues].sort((a,b)=>b-a);
    const l1 = sorted[0] || 0; const l2 = sorted[1] || 0; const l3 = sorted[2] || 0;
    const lambda_plus = rmtHistogram.lambda_plus || (payload.rmt && payload.rmt.lambda_max) || 0;
    const spread = l1 - l2;
    let summary = '';
    if (lambda_plus && l1 > lambda_plus * 1.05) summary = 'Strong market-wide trend — all stocks moving together';
    else if (lambda_plus && l1 > lambda_plus) summary = 'Slight market-wide trend detected';
    else summary = 'No clear market-wide trend — stocks moving independently';
    const factorInterpretation = [];
    if (l1 > lambda_plus * 1.05) factorInterpretation.push('Market acting as one — many stocks moving in sync');
    else if (l1 > lambda_plus) factorInterpretation.push('Weak market trend present');
    else factorInterpretation.push('Stocks moving independently — no strong common trend');
    if (spread > 0.3) factorInterpretation.push('One dominant factor controls most price movements');
    else factorInterpretation.push('Multiple factors at play — no single dominant force');
    eigenSpectrum = { lambda1: l1, lambda2: l2, lambda3: l3, summary, factorInterpretation };
  } catch (e) { /* noop */ }

  // Stress gauge mapping
  let stressGauge = { value: 0, regime: 'calm', explanation: '' };
  try {
    const lambda1 = eigenSpectrum.lambda1 || (payload.rmt && Math.max(...(payload.rmt.eigenvalues||[]))) || 0;
    const lambda_plus = rmtHistogram.lambda_plus || (payload.rmt && payload.rmt.lambda_max) || 0;
    let regime = 'calm';
    if (lambda_plus && lambda1 < 0.95 * lambda_plus) regime = 'calm';
    else if (lambda_plus && lambda1 <= 1.05 * lambda_plus) regime = 'normal';
    else if (lambda_plus && lambda1 > 1.05 * lambda_plus) regime = 'stress';
    const explanation = regime === 'calm' ? 'Market looks stable — stocks moving fairly independently' : (regime === 'normal' ? 'Normal market conditions — moderate stock synchronization' : 'High market stress — many stocks moving together (could signal panic or herd behavior)');
    stressGauge = { value: lambda1, regime, explanation };
  } catch (e) { /* noop */ }

  // Combined headline + actions
  let headline = '';
  try {
    const parts = [];
    // short phrases
    parts.push((corrLevel === 'low') ? 'Stocks moving independently' : (corrLevel === 'moderate' ? 'Moderate stock connections' : 'Strong market-wide movement'));
    if (sentimentAdjusted && sentimentAdjusted.impact && sentimentAdjusted.impact !== 'none') parts.push(`news sentiment adding ${sentimentAdjusted.impact} influence`);
    else parts.push('news not having much effect');
    if (stressGauge && stressGauge.regime === 'stress') parts.push('high market stress detected');
    headline = parts.join('; ') + '.';
  } catch (e) { headline = 'No clear conclusion'; }
  const actions = [
    'Watch for emerging patterns — check how stocks are moving together',
    'Run individual stock volatility checks (GARCH models)',
    'Consider reducing risk if market stress continues'
  ];
  if (sentimentAdjusted && sentimentAdjusted.impact === 'large') actions.unshift('Check the news — sentiment is having a big effect on prices');

  // Raw correlation block
  const rawCorrelation = {
    summary: `On average, stocks are ${corrLevel === 'low' ? 'moving mostly independently (weak connection)' : (corrLevel === 'moderate' ? 'showing some connection — about 30-50%' : 'moving together strongly — highly synchronized')}.`,
    level: corrLevel,
    notes: [
      `Average correlation strength: ${(mean_abs_corr * 100).toFixed(0)}%`,
      sample_size ? `Based on ${sample_size} data points` : 'Sample size unknown',
    ]
  };

  return {
    rawCorrelation,
    sentimentAdjusted,
    rmtHistogram,
    eigenSpectrum,
    stressGauge,
    combined: { headline, actions },
    sample_size
  };
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [indices, setIndices] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [selectedTab, setSelectedTab] = useState('Hot Stocks');
  // no chart on home page

  // Analysis state
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysis, setAnalysis] = useState(null);
  // Inference UI state
  const [inferenceData, setInferenceData] = useState(null);
  const [inferenceOpen, setInferenceOpen] = useState(true);
  const [expandedCard, setExpandedCard] = useState(null);
  // Hybrid forecast state
  const [hybridLoading, setHybridLoading] = useState(false);
  const [hybridError, setHybridError] = useState('');
  const [hybridData, setHybridData] = useState(null);
  const [hybridP, setHybridP] = useState(1);
  const [hybridD, setHybridD] = useState(0);
  const [hybridQ, setHybridQ] = useState(1);
  const [hybridTicker, setHybridTicker] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Recompute inferences when analysis updates
  useEffect(() => {
    if (!analysis) {
      setInferenceData(null);
      return;
    }
    try {
      const inf = generateInferences(analysis);
      setInferenceData(inf);
    } catch (e) {
      console.warn('Inference generation failed', e);
      setInferenceData(null);
    }
  }, [analysis]);

  // UI helpers
  const pillColor = (type, value) => {
    // type: 'corr','sentiment','rmt','eigen','stress'
    // Map using rules: calm/none/low -> green, moderate/small/borderline -> yellow, high/large/stress -> red
    if (type === 'corr') {
      if (value === 'low') return 'bg-green-100 text-green-700';
      if (value === 'moderate') return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-700';
    }
    if (type === 'sentiment') {
      if (value === 'none') return 'bg-green-100 text-green-700';
      if (value === 'small' || value === 'medium') return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-700';
    }
    if (type === 'rmt') {
      // value is noiseFraction
      if (value > 0.8) return 'bg-green-100 text-green-700';
      if (value > 0.5) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-700';
    }
    if (type === 'stress') {
      if (value === 'calm') return 'bg-green-100 text-green-700';
      if (value === 'normal') return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-700';
    }
    return 'bg-gray-100 text-gray-700';
  };

  const copySummary = async () => {
    if (!inferenceData) return;
    const text = `${inferenceData.combined.headline}\n\nActions:\n- ${inferenceData.combined.actions.join('\n- ')}`;
    try { await navigator.clipboard.writeText(text); } catch (e) { console.warn('Clipboard failed', e); }
  };

  // Fetch data from backend
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch stocks (your 3 chosen stocks)
      const stocksResponse = await fetch(`${API_URL}/stocks`);
      const stocksData = await stocksResponse.json();
      
      // Fetch indices (Nifty 50 + Sensex)
      const indicesResponse = await fetch(`${API_URL}/index`);
      const indicesData = await indicesResponse.json();
      
      if (stocksData.success) {
        setStocks(stocksData.data);
        setLastUpdate(stocksData.lastUpdate);
      }
      
      if (indicesData.success) {
        setIndices(indicesData.data);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  const runAnalysis = async (tickers) => {
    setAnalysis(null);
    setAnalysisError('');
    setAnalysisLoading(true);
    // Accept either array of tickers or options object from TickerSelector
    let opts = {};
    if (Array.isArray(tickers)) {
      opts.tickers = tickers;
    } else if (typeof tickers === 'object' && tickers !== null) {
      opts = { ...tickers };
    }
    try {
  const body = (obj) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(obj) });
  const start = opts.start;
  const end = opts.end;
  const alpha = opts.alpha ?? 0.3;
  const windowSize = opts.windowSize ?? 60;
  const useNews = opts.useNews ?? true;
  const tickersList = opts.tickers || [];

      // Prices and returns
  const pricesRes = await fetch(`${API_URL}/prices`, body({ tickers: tickersList, start, end }));
      const prices = await pricesRes.json();
      if (!prices.success) throw new Error(prices.message || 'Prices failed');

      // Correlations
  const corrRes = await fetch(`${API_URL}/correlations`, body({ tickers: tickersList, start, end }));
      const correlations = await corrRes.json();
      if (!correlations.success) throw new Error(correlations.message || 'Correlations failed');

    // RMT - compute T (time series length) from the returned returns object and N from tickersList
    const returnsObj = prices.returns || {};
    const firstReturnsArr = Object.values(returnsObj)[0] || [];
    const T = firstReturnsArr.length;
    const N = tickersList.length;
    // ensure correlation matrix exists
    const corrMatrix = (correlations && correlations.correlation) ? correlations.correlation : null;
    if (!corrMatrix || T <= 0 || N <= 0) throw new Error('Missing correlation matrix or invalid T/N for RMT');
    const rmtRes = await fetch(`${API_URL}/rmt`, body({ correlation: corrMatrix, T, N }));
      const rmt = await rmtRes.json();
      if (!rmt.success) throw new Error(rmt.message || 'RMT failed');

      // Sentiment-adjusted correlations (includes news + sentiment)
  const adjRes = await fetch(`${API_URL}/sentiment-adjusted-corr`, body({ tickers: tickersList, start, end, lookback_days: 7, alpha }));
      const adjusted = await adjRes.json();
      if (!adjusted.success) throw new Error(adjusted.message || 'Adjusted corr failed');

      // Predictions
      const predRes = await fetch(`${API_URL}/predict`, body({ tickers: tickersList, start, end, lookback_days: 7 }));
      const predictions = await predRes.json();
      if (!predictions.success) throw new Error(predictions.message || 'Predict failed');

      // Call volatility predict endpoint (uses persisted model if available)
      let volResult = null;
      try {
        const volRes = await fetch(`${API_URL}/predict-volatility`, body({ tickers: tickersList, start, end, sentiments: adjusted.sentiment }));
        const volJson = await volRes.json();
        if (volJson.success) volResult = volJson.result;
      } catch (e) {
        // non-fatal
        console.warn('Volatility predict failed', e);
      }

      // Optionally trigger training (async) - commented out by default
      // await fetch(`${API_URL}/train-volatility`, body({ tickers: tickersList, start, end, label_pct: 0.75 }));

      const result = {
        tickers: tickersList,
        prices: prices.prices,
        returns: prices.returns,
        correlations: {
          tickers: correlations.tickers,
          raw: correlations.correlation
        },
        rmt: {
          eigenvalues: rmt.eigenvalues,
          lambda_min: rmt.lambda_min,
          lambda_max: rmt.lambda_max,
          denoised: rmt.denoised
        },
        sentiment: adjusted.sentiment,
        adjusted_correlation: {
          tickers: adjusted.tickers,
          raw: adjusted.raw,
          adjusted: adjusted.adjusted,
          examples: adjusted.examples
        },
        predictions: predictions.predictions
      };
      if (volResult) result.volatility = volResult;
      setAnalysis(result);
    } catch (err) {
      console.error('Analysis error', err);
      setAnalysisError(err.message || 'Error');
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 15 minutes
    const interval = setInterval(fetchData, 900000); // 15 minutes = 900000ms
    return () => clearInterval(interval);
  }, []);

  const tabs = ['My WatchList', 'Hot Stocks', 'Most Traded', 'Top Gainers', 'Top Losers'];

  // Get stock short name from symbol
  const getStockShortName = (symbol) => {
    return symbol.replace('.NS', '').replace('.BO', '');
  };

  // Get stock initial for logo
  const getStockInitial = (name, symbol) => {
    // Try to get first letters of company name
    if (name && name !== 'N/A') {
      const words = name.split(' ');
      if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }
    // Fallback to symbol
    return getStockShortName(symbol).substring(0, 2);
  };

  // Generate random color for stock logo based on symbol
  const getStockColor = (symbol) => {
    const colors = [
      'bg-blue-600',
      'bg-purple-600',
      'bg-green-600',
      'bg-red-600',
      'bg-orange-600',
      'bg-indigo-600',
      'bg-pink-600',
      'bg-teal-600'
    ];
    // Simple hash function to get consistent color for same symbol
    const hash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Filter/sort stocks based on selected tab
  const getFilteredStocks = () => {
    const list = [...stocks];
    switch (selectedTab) {
      case 'Top Gainers':
        return list
          .filter(s => typeof s.changePercent === 'number')
          .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0));
      case 'Top Losers':
        return list
          .filter(s => typeof s.changePercent === 'number')
          .sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0));
      case 'Most Traded':
        return list
          .filter(s => typeof s.volume === 'number')
          .sort((a, b) => (b.volume || 0) - (a.volume || 0));
      case 'Hot Stocks':
        return list
          .filter(s => typeof s.changePercent === 'number')
          .sort((a, b) => Math.abs(b.changePercent || 0) - Math.abs(a.changePercent || 0));
      case 'My WatchList':
      default:
        return list;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">IND</span>
                </div>
                <span className="text-xl font-bold">INDstocks</span>
              </div>
              
              <div className="hidden md:flex items-center gap-4">
                <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full font-medium text-sm">
                  INDstocks
                </button>
                <button className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-full font-medium text-sm">
                  IPO
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={fetchData}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                title="Refresh data"
              >
                <RefreshCw className={`w-5 h-5 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <span className="text-sm text-gray-500">
                {lastUpdate ? `Updated: ${new Date(lastUpdate).toLocaleTimeString()}` : 'Loading...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="text-sm text-gray-500">
            Home → <span className="text-gray-900">IND Stocks</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left Side */}
          <div className="lg:col-span-2">
            {/* Selection & Analyze */}
            <div className="mb-6">
              <TickerSelector onAnalyze={runAnalysis} />
              {analysisLoading && <div className="mt-2 text-sm text-gray-600">Analyzing…</div>}
              {analysisError && <div className="mt-2 text-sm text-red-600">{analysisError}</div>}
            </div>

            {analysis && (
              <div className="space-y-6 mb-8">
                {/* Heatmaps */}
                <div className="flex flex-col gap-4">
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <Heatmap title="Correlation (raw)" tickers={analysis.correlations.tickers} matrix={analysis.correlations.raw} />
                  </div>
                  <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <Heatmap title="Correlation (sentiment-adjusted)" tickers={analysis.adjusted_correlation.tickers} matrix={analysis.adjusted_correlation.adjusted} />
                  </div>
                </div>

                {/* Quick heuristic insights (polished card) */}
                <div className="mt-4">
                  <InsightsCard analysis={analysis} />
                </div>

                {/* RMT visuals: histogram, spectrum, gauge */}
                <div className="flex items-center gap-4 mb-4">
                  <nav className="text-sm text-gray-600">
                    <button className="px-3 py-1 mr-2 rounded-full hover:bg-gray-100">Correlation + RMT Analyzer</button>
                    <button className="px-3 py-1 mr-2 rounded-full hover:bg-gray-100">Eigenvalue Spectrum</button>
                    <button className="px-3 py-1 mr-2 rounded-full hover:bg-gray-100">Volatility Prediction</button>
                  </nav>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <EigenHistogram eigenvalues={analysis.rmt.eigenvalues} lambda_max={analysis.rmt.lambda_max} />
                  <EigenSpectrum eigenvalues={analysis.rmt.eigenvalues} />
                  <div className="space-y-4">
                    <StressGauge lambda1={analysis.rmt.eigenvalues ? Math.max(...analysis.rmt.eigenvalues) : null} lambda2={analysis.rmt.eigenvalues ? (analysis.rmt.eigenvalues.length>1? analysis.rmt.eigenvalues.sort((a,b)=>b-a)[1]:0) : null} lambda_max={analysis.rmt.lambda_max} />
                  </div>
                </div>

                {/* Automated Inference panel */}
                <div className="mt-6 bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <img src="/mnt/data/49ce1903-34f2-41f7-9102-f7a8dbd103fe.png" alt="thumb" className="w-12 h-12 rounded-md object-cover" />
                      <div>
                        <h3 className="text-lg font-semibold">Automated Inference</h3>
                        <div className="text-sm text-gray-500">Concise, beginner-friendly summaries and suggested actions based on analysis results.</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setInferenceOpen(!inferenceOpen)} className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">{inferenceOpen ? 'Collapse' : 'Expand'}</button>
                      <button onClick={copySummary} className="px-3 py-1 bg-blue-600 text-white text-sm rounded">Copy summary</button>
                    </div>
                  </div>

                  {inferenceData && inferenceOpen && (
                    <div className="mt-4">
                      {/* Validation banner if sample small */}
                      {inferenceData.sample_size && inferenceData.sample_size < 30 && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded">Validation sample small — interpret inferences cautiously.</div>
                      )}

                      <div className="mt-2 mb-4">
                        <div className="text-xl font-semibold">{inferenceData.combined.headline}</div>
                        <div className="text-sm text-gray-600 mt-1">{inferenceData.combined.actions.slice(0,3).join(' • ')}</div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {/* Raw correlation card */}
                        <div className="bg-gray-50 border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-medium">Raw correlation</div>
                              <div className="text-xs text-gray-600 mt-1">{inferenceData.rawCorrelation.summary}</div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold ${pillColor('corr', inferenceData.rawCorrelation.level)}`}>{inferenceData.rawCorrelation.level}</div>
                          </div>
                          <div className="mt-2">
                            <button onClick={() => setExpandedCard(expandedCard === 'corr' ? null : 'corr')} className="text-sm text-gray-500">{expandedCard === 'corr' ? 'Hide' : 'Show notes'}</button>
                            {expandedCard === 'corr' && (
                              <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
                                {inferenceData.rawCorrelation.notes.map((n,i) => <li key={i}>{n}</li>)}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Sentiment-adjusted card */}
                        <div className="bg-gray-50 border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-medium">Sentiment-adjusted</div>
                              <div className="text-xs text-gray-600 mt-1">{inferenceData.sentimentAdjusted.summary}</div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold ${pillColor('sentiment', inferenceData.sentimentAdjusted.impact)}`}>{inferenceData.sentimentAdjusted.impact}</div>
                          </div>
                          <div className="mt-2">
                            <button onClick={() => setExpandedCard(expandedCard === 'sent' ? null : 'sent')} className="text-sm text-gray-500">{expandedCard === 'sent' ? 'Hide' : 'Show notes'}</button>
                            {expandedCard === 'sent' && (
                              <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
                                {inferenceData.sentimentAdjusted.notes.map((n,i) => <li key={i}>{n}</li>)}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* RMT histogram card */}
                        <div className="bg-gray-50 border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-medium">RMT histogram</div>
                              <div className="text-xs text-gray-600 mt-1">{inferenceData.rmtHistogram.summary}</div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold ${pillColor('rmt', inferenceData.rmtHistogram.noiseFraction)}`}>{(inferenceData.rmtHistogram.noiseFraction*100).toFixed(0)}%</div>
                          </div>
                          <div className="mt-2">
                            <button onClick={() => setExpandedCard(expandedCard === 'rmt' ? null : 'rmt')} className="text-sm text-gray-500">{expandedCard === 'rmt' ? 'Hide' : 'Show notes'}</button>
                            {expandedCard === 'rmt' && (
                              <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
                                {inferenceData.rmtHistogram.notes.map((n,i) => <li key={i}>{n}</li>)}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Eigen spectrum card */}
                        <div className="bg-gray-50 border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-medium">Eigen-spectrum</div>
                              <div className="text-xs text-gray-600 mt-1">{inferenceData.eigenSpectrum.summary}</div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold ${pillColor('corr', (inferenceData.eigenSpectrum.lambda1 > (inferenceData.rmtHistogram.lambda_plus||0) ? 'high' : 'low'))}`}>λ₁={inferenceData.eigenSpectrum.lambda1.toFixed(2)}</div>
                          </div>
                          <div className="mt-2">
                            <button onClick={() => setExpandedCard(expandedCard === 'eig' ? null : 'eig')} className="text-sm text-gray-500">{expandedCard === 'eig' ? 'Hide' : 'Show notes'}</button>
                            {expandedCard === 'eig' && (
                              <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
                                {inferenceData.eigenSpectrum.factorInterpretation.map((n,i) => <li key={i}>{n}</li>)}
                              </ul>
                            )}
                          </div>
                        </div>

                        {/* Stress gauge card */}
                        <div className="bg-gray-50 border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="text-sm font-medium">Stress gauge</div>
                              <div className="text-xs text-gray-600 mt-1">{inferenceData.stressGauge.explanation}</div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold ${pillColor('stress', inferenceData.stressGauge.regime)}`}>{inferenceData.stressGauge.regime}</div>
                          </div>
                          <div className="mt-2">
                            <button onClick={() => setExpandedCard(expandedCard === 'stress' ? null : 'stress')} className="text-sm text-gray-500">{expandedCard === 'stress' ? 'Hide' : 'Show notes'}</button>
                            {expandedCard === 'stress' && (
                              <ul className="mt-2 list-disc list-inside text-sm text-gray-700">
                                <li>λ₁ = {inferenceData.stressGauge.value.toFixed(3)}</li>
                                <li>{inferenceData.stressGauge.explanation}</li>
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {!inferenceData && (
                    <div className="mt-3 text-sm text-gray-600">RMT or sentiment data not available — run analysis with a larger window.</div>
                  )}
                </div>

                {/* Predictions */}
                {/* Beginner-friendly explanation: what the predictions mean and where they come from */}
                <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
                  <div className="text-sm text-gray-700">
                    <strong>Quick guide for beginners:</strong> The small predictions above are quick signals combining recent price momentum and news sentiment (a lightweight heuristic). The "Volatility Prediction" panel uses a RandomForest baseline trained on historical data — its accuracy is shown above. If accuracy is low (e.g., 25%), treat model outputs as exploratory and prefer the heuristic signals or add more training data.
                  </div>
                </div>
                <PredictionBadges predictions={analysis.predictions} modelInfo={analysis.model_info} />

                {/* Volatility */}
                <div className="mt-4">
                  <VolatilityPanel volatility={analysis.volatility} modelInfo={analysis.model_info} />
                </div>

                {/* Hybrid ARIMA + GARCH Forecast */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Hybrid ARIMA + GARCH Forecast</h3>
                      <div className="text-sm text-gray-500">ARIMA predicts the mean return (direction), GARCH predicts volatility (risk). Together they form a hybrid model that forecasts both expected move and expected uncertainty for the next trading day.</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">Ticker</label>
                        <select value={hybridTicker || (analysis.tickers && analysis.tickers[0])} onChange={e=>setHybridTicker(e.target.value)} className="px-2 py-1 border rounded">
                          {(analysis.tickers||[]).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">p</label>
                        <select value={hybridP} onChange={e=>setHybridP(Number(e.target.value))} className="px-2 py-1 border rounded">
                          {[0,1,2,3].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">d</label>
                        <select value={hybridD} onChange={e=>setHybridD(Number(e.target.value))} className="px-2 py-1 border rounded">
                          {[0,1,2].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600">q</label>
                        <select value={hybridQ} onChange={e=>setHybridQ(Number(e.target.value))} className="px-2 py-1 border rounded">
                          {[0,1,2,3].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <button onClick={async ()=>{
                        // trigger hybrid forecast
                        setHybridError('');
                        setHybridData(null);
                        setHybridLoading(true);
                        const symbol = hybridTicker || (analysis.tickers && analysis.tickers[0]);
                        const start = analysis.dates && analysis.dates.length ? analysis.dates[0] : '';
                        const end = analysis.dates && analysis.dates.length ? analysis.dates[analysis.dates.length-1] : '';
                        try{
                          const q = new URLSearchParams({ symbol, start, end, p: hybridP, d: hybridD, q: hybridQ }).toString();
                          const res = await fetch(`${API_URL}/hybrid_forecast?${q}`);
                          const j = await res.json();
                          if(!j.success) throw new Error(j.message || 'Hybrid forecast failed');
                          setHybridData(j);
                        }catch(err){
                          console.error('Hybrid error', err);
                          setHybridError(err.message || 'Error');
                        }finally{
                          setHybridLoading(false);
                        }
                      }} className="px-4 py-2 bg-blue-600 text-white rounded">Run Hybrid Forecast</button>
                    </div>
                  </div>

                  <div className="mt-4">
                    {hybridLoading && <div className="text-sm text-gray-600">Computing hybrid forecast…</div>}
                    {hybridError && <div className="text-sm text-red-600">{hybridError}</div>}

                    {hybridData && (
                      <div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="p-4 border rounded-lg">
                            <div className="text-xs text-gray-500">Next-day ARIMA predicted return</div>
                            <div className="mt-1 font-semibold text-xl">{hybridData.arima_return_forecast.toFixed(4)}%</div>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <div className="text-xs text-gray-500">Next-day GARCH predicted volatility</div>
                            <div className="mt-1 font-semibold text-xl">{hybridData.garch_vol_forecast.toFixed(4)}%</div>
                          </div>
                          <div className="p-4 border rounded-lg">
                            <div className="text-xs text-gray-500">95% hybrid confidence interval</div>
                            <div className="mt-1 font-semibold text-xl">{hybridData.hybrid_confidence_lower.toFixed(4)}% → {hybridData.hybrid_confidence_upper.toFixed(4)}%</div>
                          </div>
                        </div>

                        {/* Plotly chart: historical returns, ARIMA predicted return (horizontal), historical sigma, next-day sigma marker, CI shaded band */}
                        <div>
                          <Plot
                            data={(() => {
                              const symbol = hybridData.symbol;
                              // historical returns (percent)
                              const histR = (hybridData.returns || []).map(r => r * 100.0);
                              const dates = hybridData.dates || [];
                              const sigma = hybridData.conditional_vol_series || [];
                              const arimaLine = {
                                x: [dates[0], dates[dates.length-1]],
                                y: [hybridData.arima_return_forecast, hybridData.arima_return_forecast],
                                type: 'scatter', mode: 'lines', name: 'ARIMA mean (pct)', line: { dash: 'dash', color: '#8B00FF' } // magenta for prediction
                              };
                              const returnsTrace = { x: dates, y: histR, type: 'scatter', mode: 'lines', name: 'Historical returns (%)', line: { color: '#2563eb' }, yaxis: 'y1' };
                              const sigmaTrace = { x: dates, y: sigma, type: 'scatter', mode: 'lines', name: 'GARCH σ(t) (%)', line: { color: 'orange' }, yaxis: 'y2' };
                              const sigmaNextMarker = {
                                x: [dates[dates.length-1]],
                                y: [hybridData.garch_vol_forecast],
                                type: 'scatter', mode: 'markers+text', name: 'Next σ forecast', marker: { color: 'red', size: 10 }, text: ['σₜ+1'], textposition: 'top center', yaxis: 'y2'
                              };

                              // confidence band as filled trace (use dates first and last to create rectangular band)
                              const ciLower = hybridData.hybrid_confidence_lower;
                              const ciUpper = hybridData.hybrid_confidence_upper;
                              const bandTrace = {
                                x: [dates[0], dates[dates.length-1], dates[dates.length-1], dates[0]],
                                y: [ciLower, ciLower, ciUpper, ciUpper],
                                fill: 'toself', fillcolor: 'rgba(139,0,255,0.12)', line: { color: 'rgba(0,0,0,0)' }, name: '95% CI (next day)'
                              };

                              // predicted return marker at next trading day
                              let nextReturnMarker = null;
                              try {
                                const last = dates[dates.length-1];
                                const nd = new Date(last);
                                nd.setDate(nd.getDate() + 1);
                                const nds = nd.toISOString().slice(0,10);
                                nextReturnMarker = {
                                  x: [nds],
                                  y: [hybridData.arima_return_forecast],
                                  type: 'scatter', mode: 'markers+text', name: 'Predicted return (next day)', marker: { color: '#8B00FF', size: 10 }, text: ['r̂ₜ+1'], textposition: 'top center'
                                };
                              } catch(e) { nextReturnMarker = null }

                              const traces = [returnsTrace, arimaLine, bandTrace, sigmaTrace, sigmaNextMarker];
                              if (nextReturnMarker) traces.push(nextReturnMarker);
                              return traces;
                            })()}
                            layout={{
                              autosize: true,
                              margin: { t: 30, r: 40, l: 50, b: 40 },
                              xaxis: { title: 'Date' },
                              yaxis: { title: 'Returns (%)', side: 'left' },
                              yaxis2: { title: 'Volatility (%)', overlaying: 'y', side: 'right' },
                              legend: { orientation: 'h' }
                            }}
                            style={{ width: '100%', height: '420px' }}
                            config={{ responsive: true }}
                          />
                        </div>

                        {/* Insights card */}
                        <div className="mt-3 p-3 bg-yellow-50 border rounded text-sm text-gray-800">
                          <strong>Insight:</strong> {
                            (() => {
                              try{
                                const ar = hybridData.arima_return_forecast; // percent
                                const vol = hybridData.garch_vol_forecast; // percent
                                const histSigma = (hybridData.conditional_vol_series||[]).slice(-30);
                                const median = histSigma.length ? histSigma.sort((a,b)=>a-b)[Math.floor(histSigma.length/2)] : vol;
                                if (Math.abs(ar) < 0.05) return 'Neutral expectation';
                                if (ar > 0 && vol < median) return 'Mild bullish with low risk';
                                if (ar > 0 && vol >= median) return 'Bullish but high uncertainty';
                                if (ar < 0 && vol >= median) return 'Bearish & risky';
                                return 'Neutral expectation';
                              }catch(e){ return 'No insight available'; }
                            })()
                          }
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sentiment */}
                <SentimentCards sentiments={analysis.sentiment} examples={analysis.adjusted_correlation.examples} />

                {/* Train model panel */}
                <div className="mt-4">
                  <TrainModelPanel tickers={analysis.tickers} start={null} end={null} sentiments={analysis.sentiment} />
                </div>

                {/* Mini sparklines */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="text-lg font-semibold mb-3">Mini Price Sparklines</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {analysis.tickers.map(t => (
                      <div key={t} className="flex items-center justify-between border rounded-xl p-3">
                        <div className="font-semibold">{t}</div>
                        <Sparkline data={(analysis.prices?.[t] || []).slice(-60)} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {/* Removed promo hero section */}

            {/* Chart removed from home page */}

            {/* Indian Share Market Today */}
            <div className="bg-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Indian share market today</h2>

              {/* Tabs */}
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setSelectedTab(tab)}
                    className={`px-6 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                      selectedTab === tab
                        ? 'bg-blue-100 text-blue-600 border-2 border-blue-600'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Stock Cards - Horizontal Scroll (YOUR 3 STOCKS) */}
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4 min-w-max">
                  {loading ? (
                    // Loading skeletons
                    [...Array(3)].map((_, i) => (
                      <div key={i} className="flex flex-col items-center p-4 bg-gray-50 rounded-xl animate-pulse">
                        <div className="w-16 h-16 bg-gray-300 rounded-full mb-3"></div>
                        <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                        <div className="h-4 bg-gray-300 rounded w-16 mb-1"></div>
                        <div className="h-4 bg-gray-300 rounded w-12"></div>
                      </div>
                    ))
                  ) : getFilteredStocks().length > 0 ? (
                    getFilteredStocks().map((stock) => (
                      <div
                        key={stock.symbol}
                        onClick={() => navigate(`/stock/${encodeURIComponent(stock.symbol)}`)}
                        className={`flex flex-col items-center p-4 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer min-w-[140px]`}
                      >
                        {/* Stock Logo/Initial - Dynamic Color */}
                        <div className={`w-16 h-16 ${getStockColor(stock.symbol)} rounded-full flex items-center justify-center mb-3`}>
                          <span className="text-white font-bold text-sm">
                            {getStockInitial(stock.name, stock.symbol)}
                          </span>
                        </div>

                        {/* Stock Symbol */}
                        <div className="text-center mb-2">
                          <p className="font-semibold text-gray-900 text-sm">
                            {getStockShortName(stock.symbol)}
                          </p>
                        </div>

                        {/* Price */}
                        <p className="font-bold text-gray-900 text-lg">
                          ₹{stock.price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>

                        {/* Change */}
                        <div className={`flex items-center gap-1 text-sm font-medium ${
                          stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stock.changePercent >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span>{stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No stock data available
                    </div>
                  )}
                </div>
              </div>

              <div className="text-center mt-6">
                <button className="px-8 py-3 border-2 border-blue-600 text-blue-600 rounded-full font-semibold hover:bg-blue-50 transition-colors">
                  Share Market Today
                </button>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="mt-8 flex gap-6 border-b border-gray-200">
              <button className="px-4 py-3 text-blue-600 border-b-2 border-blue-600 font-semibold">
                Invest
              </button>
              <button className="px-4 py-3 text-gray-600 hover:text-gray-900 font-medium">
                My Stocks (INDstocks)
              </button>
              <button className="px-4 py-3 text-gray-600 hover:text-gray-900 font-medium">
                Orders
              </button>
              <button className="px-4 py-3 text-gray-600 hover:text-gray-900 font-medium">
                Watchlists
              </button>
            </div>
          </div>

          {/* Live from the Market - Right Sidebar (YOUR INDICES) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Live from the Market</h3>

              <div className="space-y-4">
                {loading ? (
                  // Loading skeletons
                  [...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white rounded-xl border-2 border-gray-200 p-6 animate-pulse">
                      <div className="h-4 bg-gray-300 rounded w-20 mb-2"></div>
                      <div className="h-6 bg-gray-300 rounded w-32 mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                    </div>
                  ))
                ) : (
                  <>
                    {/* Nifty 50 - Dynamic Data */}
                    {indices.nifty50 && (
                      <div className={`bg-white rounded-xl border-2 ${
                        indices.nifty50.changePercent >= 0 ? 'border-green-200' : 'border-red-200'
                      } p-6 hover:shadow-md transition-shadow`}>
                        <div className="text-sm text-gray-600 mb-2">{indices.nifty50.name}</div>
                        <div className="text-2xl font-bold text-gray-900 mb-2">
                          ₹{indices.nifty50.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className={`flex items-center gap-2 ${
                          indices.nifty50.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {indices.nifty50.changePercent >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="font-semibold">
                            {indices.nifty50.change.toFixed(2)} ({indices.nifty50.changePercent >= 0 ? '▲' : '▼'}{Math.abs(indices.nifty50.changePercent).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Sensex - Dynamic Data */}
                    {indices.sensex && (
                      <div className={`bg-white rounded-xl border-2 ${
                        indices.sensex.changePercent >= 0 ? 'border-green-200' : 'border-red-200'
                      } p-6 hover:shadow-md transition-shadow`}>
                        <div className="text-sm text-gray-600 mb-2">{indices.sensex.name}</div>
                        <div className="text-2xl font-bold text-gray-900 mb-2">
                          ₹{indices.sensex.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className={`flex items-center gap-2 ${
                          indices.sensex.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {indices.sensex.changePercent >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className="font-semibold">
                            {indices.sensex.change.toFixed(2)} ({indices.sensex.changePercent >= 0 ? '▲' : '▼'}{Math.abs(indices.sensex.changePercent).toFixed(2)}%)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Show message if no data */}
                    {!indices.nifty50 && !indices.sensex && (
                      <div className="bg-white rounded-xl border-2 border-gray-200 p-6 text-center text-gray-500">
                        No index data available
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Info Box */}
              <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
                <p className="text-sm text-blue-900">
                  <strong>Tracking:</strong> {stocks.length} stocks + 2 indices
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Data updates automatically every 15 minutes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;