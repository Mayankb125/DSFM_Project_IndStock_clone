import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

const CandlestickChart = ({ symbol, period: periodProp, chartType = 'candlestick', drawTool = null, interval: intervalProp = '1m' }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const candleSeriesRef = useRef();
  const volumeSeriesRef = useRef();
  const mainSeriesRef = useRef(); // For line, area, baseline, histogram, bar
  const canvasRef = useRef();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // UI state for period and interval
  const [period, setPeriod] = useState(periodProp || 'max');
  const [interval, setInterval] = useState(intervalProp);
  const [adjustedInterval, setAdjustedInterval] = useState(null);
  const [currentChartType, setCurrentChartType] = useState(chartType);
  const [drawnObjects, setDrawnObjects] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState(null);
  const [currentDrawing, setCurrentDrawing] = useState(null);

  useEffect(() => {
    // initialize chart
    const container = chartContainerRef.current;
    if (!container) return;

    chartRef.current = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight || 600,
      layout: { background: { color: '#1a1a1a' }, textColor: '#999' },
      rightPriceScale: { 
        visible: true, 
        borderColor: '#2a2a2a',
        textColor: '#999'
      },
      timeScale: { 
        visible: true,
        timeVisible: true, 
        secondsVisible: true, 
        borderColor: '#2a2a2a',
        textColor: '#999'
      },
      grid: {
        vertLines: { color: '#2a2a2a' },
        horzLines: { color: '#2a2a2a' }
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#505050',
          width: 1,
          style: 3,
          labelBackgroundColor: '#333'
        },
        horzLine: {
          color: '#505050',
          width: 1,
          style: 3,
          labelBackgroundColor: '#333'
        }
      },
      watermark: { visible: false }
    });

    // Initially don't add any series - will be added based on chartType
    
    // Add volume histogram series
    volumeSeriesRef.current = chartRef.current.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      scaleMargins: {
        top: 0.9,
        bottom: 0.01,
      },
    });
    
    chartRef.current.priceScale('volume').applyOptions({
      scaleMargins: {
        top: 0.9,
        bottom: 0.01,
      },
    });

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

  // Handle chart type changes
  useEffect(() => {
    if (!chartRef.current) return;
    
    // Remove existing main series
    if (candleSeriesRef.current) {
      try {
        chartRef.current.removeSeries(candleSeriesRef.current);
        candleSeriesRef.current = null;
      } catch (e) {}
    }
    if (mainSeriesRef.current) {
      try {
        chartRef.current.removeSeries(mainSeriesRef.current);
        mainSeriesRef.current = null;
      } catch (e) {}
    }

    // Add new series based on chartType
    switch (chartType) {
      case 'candlestick':
        candleSeriesRef.current = chartRef.current.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444'
        });
        break;
      
      case 'bar':
        candleSeriesRef.current = chartRef.current.addBarSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          thinBars: false
        });
        break;
      
      case 'line':
        mainSeriesRef.current = chartRef.current.addLineSeries({
          color: '#2962FF',
          lineWidth: 2
        });
        break;
      
      case 'area':
        mainSeriesRef.current = chartRef.current.addAreaSeries({
          topColor: 'rgba(41, 98, 255, 0.4)',
          bottomColor: 'rgba(41, 98, 255, 0.0)',
          lineColor: '#2962FF',
          lineWidth: 2
        });
        break;
      
      case 'baseline':
        mainSeriesRef.current = chartRef.current.addBaselineSeries({
          baseValue: { type: 'price', price: 0 },
          topLineColor: '#22c55e',
          topFillColor1: 'rgba(34, 197, 94, 0.4)',
          topFillColor2: 'rgba(34, 197, 94, 0.0)',
          bottomLineColor: '#ef4444',
          bottomFillColor1: 'rgba(239, 68, 68, 0.0)',
          bottomFillColor2: 'rgba(239, 68, 68, 0.4)',
          lineWidth: 2
        });
        break;
      
      case 'histogram':
        mainSeriesRef.current = chartRef.current.addHistogramSeries({
          color: '#26a69a'
        });
        break;
      
      case 'equivolume':
        // Equivolume: use candlestick series (volume-proportional width not supported by lightweight-charts, using standard candles)
        candleSeriesRef.current = chartRef.current.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444'
        });
        break;
      
      case 'heikin-ashi':
        // Heikin-Ashi: smoothed candlesticks (will calculate HA values from data)
        candleSeriesRef.current = chartRef.current.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444'
        });
        break;
      
      case 'scatter':
        // Scatter plot using line series with no line, just markers
        mainSeriesRef.current = chartRef.current.addLineSeries({
          color: '#2962FF',
          lineWidth: 0,
          pointMarkersVisible: true,
          lastValueVisible: true
        });
        break;
      
      case 'hollow-candles':
        // Hollow candles (similar to candlestick but with hollow body on up candles)
        candleSeriesRef.current = chartRef.current.addCandlestickSeries({
          upColor: 'transparent',
          downColor: '#ef4444',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          borderVisible: true,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444'
        });
        break;
      
      case 'trend':
        // Trend chart showing outlined candlesticks (border only, no fill)
        candleSeriesRef.current = chartRef.current.addCandlestickSeries({
          upColor: 'transparent',
          downColor: 'transparent',
          borderUpColor: '#22c55e',
          borderDownColor: '#ef4444',
          borderVisible: true,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444'
        });
        break;
      
      default:
        candleSeriesRef.current = chartRef.current.addCandlestickSeries({
          upColor: '#22c55e',
          downColor: '#ef4444',
          borderVisible: false,
          wickUpColor: '#22c55e',
          wickDownColor: '#ef4444'
        });
    }
    
    setCurrentChartType(chartType);
  }, [chartType]);

  // Canvas drawing functionality - setup and resize
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = chartContainerRef.current;
    if (!canvas || !container) return;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  // Redraw canvas objects
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
      
    drawnObjects.forEach(obj => {
      ctx.strokeStyle = obj.color || '#2962FF';
      ctx.lineWidth = obj.lineWidth || 2;
      ctx.fillStyle = obj.fillColor || 'rgba(41, 98, 255, 0.1)';

      switch (obj.tool) {
        case 'trend-line':
        case 'extended-line':
        case 'ray':
        case 'info-line':
          ctx.beginPath();
          ctx.moveTo(obj.x1, obj.y1);
          ctx.lineTo(obj.x2, obj.y2);
          ctx.stroke();
          break;
        
        case 'horizontal-ray':
        case 'price-line':
          ctx.beginPath();
          ctx.moveTo(0, obj.y1);
          ctx.lineTo(canvas.width, obj.y1);
          ctx.stroke();
          break;
        
        case 'arrow':
          // Draw arrow
          ctx.beginPath();
          ctx.moveTo(obj.x1, obj.y1);
          ctx.lineTo(obj.x2, obj.y2);
          ctx.stroke();
          // Arrow head
          const angle = Math.atan2(obj.y2 - obj.y1, obj.x2 - obj.x1);
          const headLength = 15;
          ctx.beginPath();
          ctx.moveTo(obj.x2, obj.y2);
          ctx.lineTo(
            obj.x2 - headLength * Math.cos(angle - Math.PI / 6),
            obj.y2 - headLength * Math.sin(angle - Math.PI / 6)
          );
          ctx.moveTo(obj.x2, obj.y2);
          ctx.lineTo(
            obj.x2 - headLength * Math.cos(angle + Math.PI / 6),
            obj.y2 - headLength * Math.sin(angle + Math.PI / 6)
          );
          ctx.stroke();
          break;
        
        case 'rectangle':
          const width = obj.x2 - obj.x1;
          const height = obj.y2 - obj.y1;
          ctx.fillRect(obj.x1, obj.y1, width, height);
          ctx.strokeRect(obj.x1, obj.y1, width, height);
          break;
        
        case 'oval':
          const radiusX = Math.abs(obj.x2 - obj.x1) / 2;
          const radiusY = Math.abs(obj.y2 - obj.y1) / 2;
          const centerX = (obj.x1 + obj.x2) / 2;
          const centerY = (obj.y1 + obj.y2) / 2;
          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          break;
        
        case 'time-line':
          ctx.beginPath();
          ctx.moveTo(obj.x1, 0);
          ctx.lineTo(obj.x1, canvas.height);
          ctx.stroke();
          break;
      }
    });

    // Draw current drawing in progress
    if (isDrawing && currentDrawing) {
      ctx.strokeStyle = '#2962FF';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      const cd = currentDrawing;
      switch (drawTool) {
        case 'trend-line':
        case 'extended-line':
        case 'ray':
        case 'arrow':
        case 'info-line':
          ctx.beginPath();
          ctx.moveTo(cd.x1, cd.y1);
          ctx.lineTo(cd.x2, cd.y2);
          ctx.stroke();
          break;
        
        case 'horizontal-ray':
        case 'price-line':
          ctx.beginPath();
          ctx.moveTo(0, cd.y1);
          ctx.lineTo(canvas.width, cd.y1);
          ctx.stroke();
          break;
        
        case 'time-line':
          ctx.beginPath();
          ctx.moveTo(cd.x1, 0);
          ctx.lineTo(cd.x1, canvas.height);
          ctx.stroke();
          break;
        
        case 'rectangle':
          ctx.strokeRect(cd.x1, cd.y1, cd.x2 - cd.x1, cd.y2 - cd.y1);
          break;
        
        case 'oval':
          const rX = Math.abs(cd.x2 - cd.x1) / 2;
          const rY = Math.abs(cd.y2 - cd.y1) / 2;
          const cX = (cd.x1 + cd.x2) / 2;
          const cY = (cd.y1 + cd.y2) / 2;
          ctx.beginPath();
          ctx.ellipse(cX, cY, rX, rY, 0, 0, 2 * Math.PI);
          ctx.stroke();
          break;
      }
      ctx.setLineDash([]);
    }
  }, [drawnObjects, isDrawing, currentDrawing, drawTool]);

  // Handle mouse events for drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !drawTool) return;

    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      setIsDrawing(true);
      setDrawStart({ x, y });
      setCurrentDrawing({ x1: x, y1: y, x2: x, y2: y });
    };

    const handleMouseMove = (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const currentX = (e.clientX - rect.left) * scaleX;
      const currentY = (e.clientY - rect.top) * scaleY;
      
      setCurrentDrawing({ 
        x1: drawStart.x, 
        y1: drawStart.y, 
        x2: currentX, 
        y2: currentY 
      });
    };

    const handleMouseUp = (e) => {
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const endX = (e.clientX - rect.left) * scaleX;
      const endY = (e.clientY - rect.top) * scaleY;
      
      const newObject = {
        tool: drawTool,
        x1: drawStart.x,
        y1: drawStart.y,
        x2: endX,
        y2: endY,
        color: '#2962FF',
        lineWidth: 2,
        fillColor: 'rgba(41, 98, 255, 0.1)'
      };

      setDrawnObjects(prev => [...prev, newObject]);
      setIsDrawing(false);
      setDrawStart(null);
      setCurrentDrawing(null);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [drawTool, isDrawing, drawStart]);

  // Sync period and interval state when props change
  useEffect(() => {
    if (periodProp) {
      setPeriod(periodProp);
    }
  }, [periodProp]);

  useEffect(() => {
    if (intervalProp) {
      setInterval(intervalProp);
    }
  }, [intervalProp]);

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
        let candles = list.map(d => ({ time: d.date, open: d.open, high: d.high, low: d.low, close: d.close }));
        
        // Calculate Heikin-Ashi candles if needed
        if (chartType === 'heikin-ashi' && candles.length > 0) {
          const haCandles = [];
          for (let i = 0; i < candles.length; i++) {
            const current = candles[i];
            const prev = i > 0 ? haCandles[i - 1] : current;
            
            const haClose = (current.open + current.high + current.low + current.close) / 4;
            const haOpen = i === 0 ? (current.open + current.close) / 2 : (prev.open + prev.close) / 2;
            const haHigh = Math.max(current.high, haOpen, haClose);
            const haLow = Math.min(current.low, haOpen, haClose);
            
            haCandles.push({
              time: current.time,
              open: haOpen,
              high: haHigh,
              low: haLow,
              close: haClose
            });
          }
          candles = haCandles;
        }
        
        const volumes = list.map(d => ({ 
          time: d.date, 
          value: d.volume,
          color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
        }));

        if (!mounted) return;
        
        // Set data based on chart type
        if (candleSeriesRef.current) {
          candleSeriesRef.current.setData(candles);
        }
        
        if (mainSeriesRef.current) {
          // For line, area, baseline, histogram - use close prices
          const priceData = list.map(d => ({ time: d.date, value: d.close }));
          mainSeriesRef.current.setData(priceData);
          
          // Calculate and update baseline value after setting data
          if (chartType === 'baseline' && list.length > 0) {
            const prices = list.map(d => d.close);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const baselineValue = (minPrice + maxPrice) / 2;
            
            mainSeriesRef.current.applyOptions({
              baseValue: { type: 'price', price: baselineValue }
            });
            
            // Create a horizontal price line at baseline
            mainSeriesRef.current.createPriceLine({
              price: baselineValue,
              color: '#888',
              lineWidth: 1,
              lineStyle: 2, // dashed
              axisLabelVisible: true,
              title: 'Baseline'
            });
          }
        }
        
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(volumes);
        }
        
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error('Error fetching historical:', err);
        setError(err.message || 'Error');
        if (candleSeriesRef.current) candleSeriesRef.current.setData([]);
        if (mainSeriesRef.current) mainSeriesRef.current.setData([]);
        if (volumeSeriesRef.current) volumeSeriesRef.current.setData([]);
        setLoading(false);
      }
    };

    fetchHistorical();

    return () => { mounted = false; };
  }, [symbol]);

  // Re-fetch when period or interval changes by depending on them as well
  useEffect(() => {
    if (!symbol) return;
    
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      setAdjustedInterval(null);
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const url = `${API_URL}/historical/${encodeURIComponent(symbol)}?period=${encodeURIComponent(period)}&interval=${encodeURIComponent(interval)}`;
        console.log('Fetching with period:', period, 'interval:', interval, 'URL:', url);
        const res = await fetch(url);
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
        
        let candles = list.map(d => ({ time: d.date, open: d.open, high: d.high, low: d.low, close: d.close }));
        
        // Calculate Heikin-Ashi candles if needed
        if (chartType === 'heikin-ashi' && candles.length > 0) {
          const haCandles = [];
          for (let i = 0; i < candles.length; i++) {
            const current = candles[i];
            const prev = i > 0 ? haCandles[i - 1] : current;
            
            const haClose = (current.open + current.high + current.low + current.close) / 4;
            const haOpen = i === 0 ? (current.open + current.close) / 2 : (prev.open + prev.close) / 2;
            const haHigh = Math.max(current.high, haOpen, haClose);
            const haLow = Math.min(current.low, haOpen, haClose);
            
            haCandles.push({
              time: current.time,
              open: haOpen,
              high: haHigh,
              low: haLow,
              close: haClose
            });
          }
          candles = haCandles;
        }
        
        const volumes = list.map(d => ({ 
          time: d.date, 
          value: d.volume,
          color: d.close >= d.open ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'
        }));
        
        if (candleSeriesRef.current) candleSeriesRef.current.setData(candles);
        
        if (mainSeriesRef.current) {
          const priceData = list.map(d => ({ time: d.date, value: d.close }));
          mainSeriesRef.current.setData(priceData);
          
          // Calculate and update baseline value after setting data
          if (chartType === 'baseline' && list.length > 0) {
            const prices = list.map(d => d.close);
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);
            const baselineValue = (minPrice + maxPrice) / 2;
            
            mainSeriesRef.current.applyOptions({
              baseValue: { type: 'price', price: baselineValue }
            });
            
            // Create a horizontal price line at baseline
            mainSeriesRef.current.createPriceLine({
              price: baselineValue,
              color: '#888',
              lineWidth: 1,
              lineStyle: 2, // dashed
              axisLabelVisible: true,
              title: 'Baseline'
            });
          }
        }
        
        if (volumeSeriesRef.current) volumeSeriesRef.current.setData(volumes);
        
        setLoading(false);
      } catch (err) {
        if (!mounted) return;
        console.error('Error fetching historical (on param change):', err);
        setError(err.message || 'Error');
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [period, interval, symbol, chartType]);

  return (
    <div className="w-full h-full bg-[#0a0a0a] relative">
      {error ? (
        <div className="text-red-500 p-4">{error}</div>
      ) : (
        <div className="w-full h-full relative">
          <div ref={chartContainerRef} className="w-full h-full" />
          <canvas 
            ref={canvasRef}
            className="absolute top-0 left-0"
            style={{ 
              pointerEvents: drawTool ? 'auto' : 'none',
              cursor: drawTool ? 'crosshair' : 'default',
              zIndex: 10
            }}
          />
        </div>
      )}
      {loading && (
        <div className="absolute top-4 right-4 text-xs text-gray-400 z-20">Loading…</div>
      )}
      {adjustedInterval && (
        <div className="absolute top-4 left-4 text-xs text-yellow-500 z-20">Interval adjusted: {adjustedInterval}</div>
      )}
      {drawTool && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs text-blue-400 bg-gray-900 px-3 py-1 rounded z-20 shadow-lg border border-blue-600">
          Drawing: {drawTool.replace('-', ' ').toUpperCase()} - Click and drag to draw
        </div>
      )}
    </div>
  );
};

export default CandlestickChart;
