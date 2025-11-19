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
      height: container.clientHeight || 600,
      layout: { background: { color: '#0a0a0a' }, textColor: '#888' },
      rightPriceScale: { visible: true, borderColor: '#333' },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: '#333' },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' }
      },
      // hide the default TradingView watermark
      watermark: { visible: false }
    });

    candleSeriesRef.current = chartRef.current.addCandlestickSeries({
      upColor: '#26a69a', downColor: '#ef5350', borderVisible: false, wickUpColor: '#26a69a', wickDownColor: '#ef5350'
    });

    lineSeriesRef.current = chartRef.current.addLineSeries({ color: '#2962FF', lineWidth: 2 });

    const handleResize = () => {
      if (chartRef.current && container) {
        chartRef.current.applyOptions({ 
          width: container.clientWidth,
          height: container.clientHeight || 600
        });
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
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const url = `${API_URL}/historical/${encodeURIComponent(symbol)}?period=${encodeURIComponent(period)}&interval=${encodeURIComponent(interval)}`;
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
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const url = `${API_URL}/historical/${encodeURIComponent(symbol)}?period=${encodeURIComponent(period)}&interval=${encodeURIComponent(interval)}`;
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
    <div className="w-full h-full bg-[#0a0a0a] relative">
      {error ? (
        <div className="text-red-500 p-4">{error}</div>
      ) : (
        <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
      )}
      {loading && (
        <div className="absolute top-4 right-4 text-xs text-gray-400">Loading…</div>
      )}
      {adjustedInterval && (
        <div className="absolute top-4 left-4 text-xs text-yellow-500">Interval adjusted: {adjustedInterval}</div>
      )}
    </div>
  );
};

export default CandlestickChart;
