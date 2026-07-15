import React, { useRef, useEffect, useState } from 'react';
import { calculateEMA } from '../strategies/tradingStrategies';

export default function Chart({ candles, trades, activeTrade, granularity }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const newWidth = entry.contentRect.width || 600;
        const newHeight = entry.contentRect.height || 350;
        setDimensions(prev => {
          if (prev.width === newWidth && prev.height === newHeight) {
            return prev;
          }
          return { width: newWidth, height: newHeight };
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Scale for high DPI displays
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const width = dimensions.width;
    const height = dimensions.height;

    // Margins
    const margin = { top: 20, right: 65, bottom: 25, left: 15 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;

    // Clear background
    ctx.fillStyle = '#0f172a'; // Slate 900
    ctx.fillRect(0, 0, width, height);

    // Calculate Indicators (EMA 9 and EMA 21)
    const ema9 = calculateEMA(candles, 9);
    const ema21 = calculateEMA(candles, 21);

    // Determine viewport range
    // Show last 40 candles for detail
    const maxVisibleCandles = 40;
    const startIndex = Math.max(0, candles.length - maxVisibleCandles);
    const visibleCandles = candles.slice(startIndex);
    const visibleEma9 = ema9.slice(startIndex);
    const visibleEma21 = ema21.slice(startIndex);

    if (visibleCandles.length === 0) return;

    // Find min and max prices to scale Y
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    visibleCandles.forEach((c, i) => {
      minPrice = Math.min(minPrice, c.low);
      maxPrice = Math.max(maxPrice, c.high);
      
      // Include EMA values in scaling if they exist
      const e9 = visibleEma9[i];
      const e21 = visibleEma21[i];
      if (e9) {
        minPrice = Math.min(minPrice, e9);
        maxPrice = Math.max(maxPrice, e9);
      }
      if (e21) {
        minPrice = Math.min(minPrice, e21);
        maxPrice = Math.max(maxPrice, e21);
      }
    });

    // Add padding to Y axis
    const priceRange = maxPrice - minPrice;
    const padding = priceRange * 0.1 || 0.5; // fallbacks if flat
    minPrice -= padding;
    maxPrice += padding;

    // Helpers to convert data to canvas coordinates
    const getX = (index) => margin.left + (index / (visibleCandles.length - 1)) * chartWidth;
    const getY = (price) => margin.top + (1 - (price - minPrice) / (maxPrice - minPrice)) * chartHeight;

    // 1. Draw Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Y Grid (Price)
    const gridCount = 5;
    for (let i = 0; i <= gridCount; i++) {
      const price = minPrice + (i / gridCount) * (maxPrice - minPrice);
      const y = getY(price);
      
      // Line
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(width - margin.right, y);
      ctx.stroke();

      // Price Label
      ctx.fillStyle = '#64748b'; // Slate 500
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(5), width - margin.right + 5, y + 3);
    }

    // X Grid (Time)
    const xGridCount = 4;
    const step = Math.ceil(visibleCandles.length / xGridCount);
    for (let i = 0; i < visibleCandles.length; i += step) {
      const c = visibleCandles[i];
      const x = getX(i);

      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, height - margin.bottom);
      ctx.stroke();

      // Time label
      const timeStr = new Date(c.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono';
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, x, height - 10);
    }

    // 2. Draw Candlesticks
    const candleWidth = (chartWidth / visibleCandles.length) * 0.7;

    visibleCandles.forEach((c, i) => {
      const x = getX(i);
      const yOpen = getY(c.open);
      const yClose = getY(c.close);
      const yHigh = getY(c.high);
      const yLow = getY(c.low);

      const isBullish = c.close > c.open;
      const color = isBullish ? '#10b981' : '#ef4444'; // Emerald / Rose

      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.5;

      // Wick
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // Body
      const bodyHeight = Math.abs(yClose - yOpen) || 1; // min 1px height
      const bodyTop = Math.min(yOpen, yClose);
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // 3. Draw EMA Indicators
    // EMA 9 (Fast) - Purple
    ctx.strokeStyle = '#a78bfa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let firstEma9 = true;
    visibleEma9.forEach((val, i) => {
      if (val !== null) {
        const x = getX(i);
        const y = getY(val);
        if (firstEma9) {
          ctx.moveTo(x, y);
          firstEma9 = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();

    // EMA 21 (Slow) - Orange
    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let firstEma21 = true;
    visibleEma21.forEach((val, i) => {
      if (val !== null) {
        const x = getX(i);
        const y = getY(val);
        if (firstEma21) {
          ctx.moveTo(x, y);
          firstEma21 = false;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();

    // 4. Draw Trade Execution Markers
    trades.forEach((trade) => {
      // Find if this trade matches a visible candle
      const matchIdx = visibleCandles.findIndex(c => c.epoch <= trade.epoch && c.epoch + 60 > trade.epoch);
      if (matchIdx !== -1) {
        const x = getX(matchIdx);
        const y = getY(visibleCandles[matchIdx].close);
        const isCall = trade.contractType === 'CALL';
        
        // Glow circle
        ctx.fillStyle = isCall ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fill();

        // Inner circle
        ctx.fillStyle = isCall ? '#10b981' : '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Label above or below
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 9px Outfit';
        ctx.textAlign = 'center';
        
        let label = isCall ? '▲ CALL' : '▼ PUT';
        if (trade.result === 'WIN') label += ' (W)';
        if (trade.result === 'LOSS') label += ' (L)';
        
        ctx.fillText(label, x, isCall ? y - 16 : y + 20);
      }
    });

    // 5. Draw Active Trade Highlight (if any)
    if (activeTrade) {
      // Draw horizontal line for entry price
      const entryY = getY(activeTrade.entryPrice || candles[candles.length - 1].close);
      ctx.strokeStyle = 'rgba(217, 70, 239, 0.4)'; // Magenta/Pink dash
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.moveTo(margin.left, entryY);
      ctx.lineTo(width - margin.right, entryY);
      ctx.stroke();
      ctx.setLineDash([]); // Reset
    }

    // 6. Draw Current Live Price Label (Current Spot)
    const latestCandle = candles[candles.length - 1];
    const liveY = getY(latestCandle.close);
    
    ctx.strokeStyle = '#8b5cf6'; // Neon Purple
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, liveY);
    ctx.lineTo(width - margin.right, liveY);
    ctx.stroke();

    // Glow dot
    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.arc(width - margin.right, liveY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Price badge on right axis
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(width - margin.right + 1, liveY - 9, 62, 18);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(latestCandle.close.toFixed(5), width - margin.right + 4, liveY + 3);

  }, [candles, trades, activeTrade, dimensions]);

  const latestPrice = candles.length > 0 ? candles[candles.length - 1].close : null;
  const isUp = candles.length > 1 ? candles[candles.length - 1].close >= candles[candles.length - 2].close : true;

  return (
    <div ref={containerRef} className="glass-panel" style={{ width: '100%', height: '360px', position: 'relative', overflow: 'hidden', padding: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '600', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            GRÁFICO EM TEMPO REAL ({granularity === '60' ? 'M1' : granularity === '300' ? 'M5' : 'M15'})
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#a78bfa' }}></span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EMA 9</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#fb923c' }}></span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>EMA 21</span>
          </div>
        </div>
        {latestPrice !== null && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: '700', fontFamily: 'var(--font-mono)', color: isUp ? 'var(--success)' : 'var(--danger)' }}>
              {latestPrice.toFixed(5)}
            </span>
            <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: isUp ? 'var(--success-glow)' : 'var(--danger-glow)', color: isUp ? 'var(--success)' : 'var(--danger)', fontWeight: 'bold' }}>
              {isUp ? '▲ HIGH' : '▼ LOW'}
            </span>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: 'calc(100% - 30px)' }} />
    </div>
  );
}
