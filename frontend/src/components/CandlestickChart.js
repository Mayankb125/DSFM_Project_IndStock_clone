import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

const CandlestickChart = ({ symbol }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candleSeriesRef = useRef();
  const lineSeriesRef = useRef();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // UI state for period and interval
  const [period, setPeriod] = useState('1mo');
  const [interval, setInterval] = useState('1d');
  const [adjustedInterval, setAdjustedInterval] = useState(null);

  useEffect(() => {
    // initialize chart
    const container = chartContainerRef.current;
    if (!container) return;

    chartRef.current = createChart(container, {
      width: container.clientWidth,
      height: 380,
      layout: { background: { color: '#ffffff' }, textColor: '#333' },
      rightPriceScale: { visible: true },
      timeScale: { timeVisible: true, secondsVisible: false },
      // hide the default TradingView watermark
      watermark: { visible: false }
    });

    candleSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350'
    });

    lineSeriesRef.current = chartRef.current.addLineSeries({ color: '#2962FF', lineWidth: 2 });

    const handleResize = () => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ width: container.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) chartRef.current.remove();
    };
  }, []);

  useEffect(() => {
    // fetch historical data for symbol using selected period & interval
    if (!symbol) return;

    let mounted = true;
    const fetchHistorical = async () => {
      setLoading(true);
      setError(null);
      setAdjustedInterval(null);
      try {
        // Call backend with selected period and interval
        const url = `http://localhost:5000/api/historical/${encodeURIComponent(symbol)}?period=${encodeURIComponent(period)}&interval=${encodeURIComponent(interval)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} ${text}`);
        }
        const data = await res.json();

        // Backend may return an object with error info or a direct array
        let list = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray(data.data)) list = data.data;
        else if (data && data.adjustedInterval && Array.isArray(data.data)) {
          // backend may include adjustedInterval info
          setAdjustedInterval(data.adjustedInterval);
          list = data.data;
        } else throw new Error('Unexpected response shape from server');

        if (list.length === 0) {
          throw new Error('No historical data returned for this symbol');
        }

        // expect list of {date, timestamp, open, high, low, close, volume}
        const candles = list.map(d => ({ time: d.date, open: d.open, high: d.high, low: d.low, close: d.close }));
        const line = list.map(d => ({ time: d.date, value: d.close }));

        if (!mounted) return;
        if (candleSeriesRef.current) candleSeriesRef.current.setData(candles);
        if (lineSeriesRef.current) lineSeriesRef.current.setData(line);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error('Error fetching historical:', err);
        setError(err.message || 'Error');
        if (candleSeriesRef.current) candleSeriesRef.current.setData([]);
        if (lineSeriesRef.current) lineSeriesRef.current.setData([]);
        setLoading(false);
      }
    };

    fetchHistorical();

    return () => { mounted = false; };
  }, [symbol]);

  // Re-fetch when period or interval changes by depending on them as well
  useEffect(() => {
    // re-run fetch: the main effect depends on symbol only, so trigger by toggling symbol via no-op state change
    // Simpler: call the fetch by simulating symbol change: we re-run the main effect by using a small hack - create a key
    // However to keep code simple, we just call the fetch logic again by creating a small wrapper here.
    if (!symbol) return;
    // The main fetch is self-contained, so just trigger it by changing a temporary state – but to avoid code duplication, we use a tiny approach: force a re-mount of series
    // Easiest and safe approach: set data to empty and let the existing effect (which runs on mount) not cover it; instead call the same fetch by creating a small async here.
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const url = `http://localhost:5000/api/historical/${encodeURIComponent(symbol)}?period=${encodeURIComponent(period)}&interval=${encodeURIComponent(interval)}`;
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} ${text}`);
        }
        const data = await res.json();
        let list = [];
        if (Array.isArray(data)) list = data;
        else if (data && Array.isArray(data.data)) list = data.data;
        else if (data && data.adjustedInterval && Array.isArray(data.data)) {
          setAdjustedInterval(data.adjustedInterval);
          list = data.data;
        } else throw new Error('Unexpected response shape from server');

        if (!mounted) return;
        if (list.length === 0) {
          throw new Error('No historical data returned for this symbol');
        }
        const candles = list.map(d => ({ time: d.date, open: d.open, high: d.high, low: d.low, close: d.close }));
        const line = list.map(d => ({ time: d.date, value: d.close }));
        if (candleSeriesRef.current) candleSeriesRef.current.setData(candles);
        if (lineSeriesRef.current) lineSeriesRef.current.setData(line);
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error('Error fetching historical (on param change):', err);
        setError(err.message || 'Error');
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [period, interval, symbol]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">{symbol} — Candlestick</h3>
          <div className="text-sm text-gray-500">Range: {period} · Interval: {interval}</div>
          {adjustedInterval && (
            <div className="text-xs text-yellow-600">Interval adjusted by server to: {adjustedInterval}</div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Period select */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            title="Select time range"
          >
            <option value="1d">1 day</option>
            <option value="5d">5 days</option>
            <option value="7d">7 days</option>
            <option value="1mo">1 month</option>
            <option value="3mo">3 months</option>
            <option value="6mo">6 months</option>
            <option value="1y">1 year</option>
            <option value="2y">2 years</option>
            <option value="5y">5 years</option>
            <option value="10y">10 years</option>
            <option value="20y">20 years</option>
            <option value="max">Max</option>
          </select>

          {/* Interval select */}
          <select
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
            title="Select data interval / granularity"
          >
            <option value="1m">1 minute</option>
            <option value="2m">2 minutes</option>
            <option value="5m">5 minutes</option>
            <option value="15m">15 minutes</option>
            <option value="30m">30 minutes</option>
            <option value="60m">1 hour</option>
            <option value="90m">90 minutes</option>
            <option value="1d">1 day</option>
            <option value="1wk">1 week</option>
            <option value="1mo">1 month</option>
          </select>

          {loading && <div className="text-sm text-gray-500">Loading…</div>}
        </div>
      </div>
      {error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div ref={chartContainerRef} style={{ width: '100%', height: 380 }} />
      )}
    </div>
  );
};

export default CandlestickChart;
