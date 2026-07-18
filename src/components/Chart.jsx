import React, { useRef, useEffect, useState } from 'react';
import { calculateEMA } from '../strategies/tradingStrategies';

// ─── Pure canvas draw function (called from rAF loop) ───────────────────────
function drawChart({ canvas, candles, trades, activeTrade, dims, strategy, granularity, viewport, mouse, timestamp }) {
  if (!canvas || candles.length === 0) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = dims.width  * dpr;
  canvas.height = dims.height * dpr;
  ctx.scale(dpr, dpr);

  const W = dims.width;
  const H = dims.height;
  const M = { top: 20, right: 72, bottom: 25, left: 15 };
  const cW = W - M.left - M.right;
  const cH = H - M.top  - M.bottom;

  // Background
  ctx.fillStyle = '#090e1a';
  ctx.fillRect(0, 0, W, H);

  // EMAs
  const ema9  = calculateEMA(candles, 9);
  const ema21 = calculateEMA(candles, 21);

  // Viewport slice
  const si = Math.max(0, Math.min(viewport.startIdx, candles.length - 1));
  const ei = Math.min(candles.length, si + viewport.count);
  const vis  = candles.slice(si, ei);
  const ve9  = ema9.slice(si,  ei);
  const ve21 = ema21.slice(si, ei);
  if (!vis.length) return;

  // Price range
  let lo = Infinity, hi = -Infinity;
  vis.forEach((c, i) => {
    lo = Math.min(lo, c.low);
    hi = Math.max(hi, c.high);
    if (ve9[i])  { lo = Math.min(lo, ve9[i]);  hi = Math.max(hi, ve9[i]);  }
    if (ve21[i]) { lo = Math.min(lo, ve21[i]); hi = Math.max(hi, ve21[i]); }
  });
  const pad = (hi - lo || 0.5) * 0.12;
  lo -= pad; hi += pad;

  const gX = (i) => M.left + (i / Math.max(vis.length - 1, 1)) * cW;
  const gY = (p) => M.top  + (1 - (p - lo) / (hi - lo)) * cH;

  // ── 1. DASHED GRID ──────────────────────────────────────────────────────────
  const gridRows = 5;
  for (let i = 0; i <= gridRows; i++) {
    const price = lo + (i / gridRows) * (hi - lo);
    const y = gY(price);
    ctx.setLineDash([4, 7]);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(M.left, y); ctx.lineTo(W - M.right, y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#475569';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(price.toFixed(5), W - M.right + 5, y + 3);
  }

  const xStep = Math.max(1, Math.ceil(vis.length / 4));
  for (let i = 0; i < vis.length; i += xStep) {
    const x = gX(i);
    ctx.setLineDash([4, 7]);
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, M.top); ctx.lineTo(x, H - M.bottom); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#475569';
    ctx.font = '9px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      new Date(vis[i].epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      x, H - 8
    );
  }

  // ── 2. EMA LINES ────────────────────────────────────────────────────────────
  const drawLine = (vals, color) => {
    ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.beginPath();
    let first = true;
    vals.forEach((v, i) => {
      if (v == null) return;
      const x = gX(i), y = gY(v);
      first ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      first = false;
    });
    ctx.stroke();
  };
  drawLine(ve9,  '#a78bfa');
  drawLine(ve21, '#fb923c');

  // ── 3. GRADIENT CANDLESTICKS ─────────────────────────────────────────────────
  const cw = Math.max(2, (cW / vis.length) * 0.7);

  vis.forEach((c, i) => {
    const x  = gX(i);
    const yO = gY(c.open), yC = gY(c.close);
    const yH = gY(c.high), yL = gY(c.low);
    const bull = c.close >= c.open;
    const isLast = i === vis.length - 1;

    // Pulsing glow on live candle
    if (isLast) {
      const p = (Math.sin(timestamp / 400) + 1) / 2;
      const r = 12 + p * 8;
      const cy = (yO + yC) / 2;
      const g = ctx.createRadialGradient(x, cy, 0, x, cy, r);
      g.addColorStop(0, bull ? `rgba(16,185,129,${0.18 * p})` : `rgba(239,68,68,${0.18 * p})`);
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, cy, r, 0, Math.PI * 2); ctx.fill();
    }

    // Wick
    ctx.strokeStyle = bull ? '#10b981' : '#ef4444';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, yH); ctx.lineTo(x, yL); ctx.stroke();

    // Body gradient
    const bH = Math.abs(yC - yO) || 1;
    const bT = Math.min(yO, yC);
    const bg = ctx.createLinearGradient(0, bT, 0, bT + bH);
    if (bull) { bg.addColorStop(0, '#34d399'); bg.addColorStop(1, '#047857'); }
    else       { bg.addColorStop(0, '#f87171'); bg.addColorStop(1, '#991b1b'); }
    ctx.fillStyle = bg;
    ctx.fillRect(x - cw / 2, bT, cw, bH);

    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(x - cw / 2, bT, cw, 1);
  });

  // ── 4. ACTIVE TRADE LINES ────────────────────────────────────────────────────
  if (activeTrade) {
    const ep = activeTrade.entryPrice || candles[candles.length - 1].close;
    const ey = gY(ep);
    const isCall = activeTrade.contractType === 'CALL';

    const drawHL = (yp, col, label) => {
      ctx.strokeStyle = col; ctx.lineWidth = 1.2; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(M.left, yp); ctx.lineTo(W - M.right, yp); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col.replace('0.7', '0.85');
      const lw = ctx.measureText(label).width + 12;
      ctx.beginPath(); ctx.roundRect(M.left + 4, yp - 8, lw, 16, 3); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8px Outfit, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(label, M.left + 10, yp + 4);
    };

    drawHL(ey, 'rgba(139,92,246,0.7)', isCall ? '▲ ENTRADA' : '▼ ENTRADA');
    if (activeTrade.targetPrice) drawHL(gY(activeTrade.targetPrice), 'rgba(16,185,129,0.7)', 'TARGET');
    if (activeTrade.stopPrice)   drawHL(gY(activeTrade.stopPrice),   'rgba(239,68,68,0.7)',   'STOP');
  }

  // ── 5. TRADE ARROW MARKERS ───────────────────────────────────────────────────
  trades.forEach((trade) => {
    const mi = vis.findIndex(c => c.epoch <= trade.epoch && c.epoch + 60 > trade.epoch);
    if (mi === -1) return;

    const x = gX(mi);
    const isCall = trade.contractType === 'CALL';
    const isWin  = trade.result === 'WIN';
    const isLoss = trade.result === 'LOSS';
    const col = isWin ? '#10b981' : isLoss ? '#ef4444' : '#06b6d4';

    const by = isCall
      ? gY(vis[mi].low)  + 20
      : gY(vis[mi].high) - 20;

    // Glow
    const gg = ctx.createRadialGradient(x, by, 0, x, by, 14);
    gg.addColorStop(0, col + '44'); gg.addColorStop(1, 'transparent');
    ctx.fillStyle = gg;
    ctx.beginPath(); ctx.arc(x, by, 14, 0, Math.PI * 2); ctx.fill();

    // Arrow triangle
    const as = 7;
    ctx.fillStyle = col;
    ctx.beginPath();
    if (isCall) {
      ctx.moveTo(x, by - as); ctx.lineTo(x - as, by + as * 0.5); ctx.lineTo(x + as, by + as * 0.5);
    } else {
      ctx.moveTo(x, by + as); ctx.lineTo(x - as, by - as * 0.5); ctx.lineTo(x + as, by - as * 0.5);
    }
    ctx.closePath(); ctx.fill();

    // W / L label
    if (isWin || isLoss) {
      ctx.fillStyle = col;
      ctx.font = 'bold 8px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isWin ? 'W' : 'L', x, isCall ? by + as + 9 : by - as - 4);
    }
  });

  // ── 6. LIVE PRICE LINE ───────────────────────────────────────────────────────
  const lc = candles[candles.length - 1];
  const ly = gY(lc.close);
  const p2 = (Math.sin(timestamp / 300) + 1) / 2;

  ctx.strokeStyle = '#8b5cf6'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(M.left, ly); ctx.lineTo(W - M.right, ly); ctx.stroke();

  ctx.fillStyle = `rgba(139,92,246,${0.25 + p2 * 0.2})`;
  ctx.beginPath(); ctx.arc(W - M.right, ly, 7 + p2 * 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#8b5cf6';
  ctx.beginPath(); ctx.arc(W - M.right, ly, 4, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#7c3aed';
  ctx.beginPath(); ctx.roundRect(W - M.right + 1, ly - 9, 64, 18, 3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px JetBrains Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillText(lc.close.toFixed(5), W - M.right + 4, ly + 3);

  // ── 7. STRATEGY BADGE ────────────────────────────────────────────────────────
  if (strategy) {
    const label = strategy.toUpperCase().replace(/_/g, ' ');
    ctx.font = 'bold 9px Outfit, sans-serif';
    const tw = ctx.measureText(label).width + 16;
    const bx = M.left + 4, by2 = M.top + 4;
    ctx.fillStyle = 'rgba(139,92,246,0.12)';
    ctx.strokeStyle = 'rgba(139,92,246,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(bx, by2, tw, 18, 4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#a78bfa'; ctx.textAlign = 'left';
    ctx.fillText(label, bx + 8, by2 + 12);
  }

  // ── 8. CROSSHAIR + OHLC TOOLTIP ─────────────────────────────────────────────
  const { x: mx, y: my } = mouse;
  if (mx !== null && mx >= M.left && mx <= W - M.right && my >= M.top && my <= H - M.bottom) {
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1; ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(mx, M.top); ctx.lineTo(mx, H - M.bottom); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(M.left, my); ctx.lineTo(W - M.right, my); ctx.stroke();
    ctx.setLineDash([]);

    // Price on Y-axis
    const hp = lo + (1 - (my - M.top) / cH) * (hi - lo);
    ctx.fillStyle = 'rgba(71,85,105,0.9)';
    ctx.fillRect(W - M.right + 1, my - 8, 64, 16);
    ctx.fillStyle = '#e2e8f0'; ctx.font = '8px JetBrains Mono, monospace'; ctx.textAlign = 'left';
    ctx.fillText(hp.toFixed(5), W - M.right + 4, my + 3);

    // Hovered candle
    const ni = Math.round(((mx - M.left) / cW) * (vis.length - 1));
    const hc = vis[Math.max(0, Math.min(ni, vis.length - 1))];
    if (hc) {
      const bull = hc.close >= hc.open;
      const chg = ((hc.close - hc.open) / hc.open * 100).toFixed(3);
      const tLines = [
        ['Tempo', new Date(hc.epoch * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })],
        ['Open',  hc.open.toFixed(5)],
        ['High',  hc.high.toFixed(5)],
        ['Low',   hc.low.toFixed(5)],
        ['Close', hc.close.toFixed(5)],
        ['Var.',  `${chg >= 0 ? '+' : ''}${chg}%`],
      ];
      const tpW = 168, tpH = tLines.length * 16 + 16;
      let tpX = mx + 14, tpY = my - 10;
      if (tpX + tpW > W - M.right) tpX = mx - tpW - 14;
      if (tpY + tpH > H - M.bottom) tpY = H - M.bottom - tpH;
      if (tpY < M.top) tpY = M.top;

      ctx.fillStyle = 'rgba(9,14,26,0.94)';
      ctx.strokeStyle = bull ? 'rgba(16,185,129,0.45)' : 'rgba(239,68,68,0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(tpX, tpY, tpW, tpH, 6); ctx.fill(); ctx.stroke();

      // Color bar top
      ctx.fillStyle = bull ? '#10b981' : '#ef4444';
      ctx.beginPath(); ctx.roundRect(tpX, tpY, tpW, 3, [6, 6, 0, 0]); ctx.fill();

      tLines.forEach(([lbl, val], ri) => {
        const ry = tpY + 14 + ri * 16;
        ctx.font = 'bold 8px JetBrains Mono, monospace'; ctx.textAlign = 'left';
        ctx.fillStyle = '#64748b'; ctx.fillText(lbl, tpX + 8, ry);
        ctx.fillStyle = '#e2e8f0'; ctx.fillText(val, tpX + 52, ry);
      });
    }
  }
}

// ─── React Component ─────────────────────────────────────────────────────────
export default function Chart({ candles, trades, activeTrade, granularity, strategy }) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });

  // Refs so the rAF loop always reads latest values
  const refs = useRef({ candles, trades, activeTrade, dimensions, strategy, granularity });
  useEffect(() => { refs.current = { candles, trades, activeTrade, dimensions, strategy, granularity }; });

  // Viewport: { startIdx, count }
  const viewportRef = useRef({ startIdx: 0, count: 40 });
  useEffect(() => {
    if (candles.length > 0) {
      const count = viewportRef.current.count;
      viewportRef.current.startIdx = Math.max(0, candles.length - count);
    }
  }, [candles.length]);

  // Mouse state
  const mouseRef = useRef({ x: null, y: null, isDragging: false, dragX: 0, dragStart: 0 });

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setDimensions(p => (p.width === width && p.height === height) ? p : { width: width || 600, height: height || 350 });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Mouse events: crosshair, pan
  const handleMouseMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mouseRef.current.x = mx;
    mouseRef.current.y = my;

    if (mouseRef.current.isDragging) {
      const dx = mx - mouseRef.current.dragX;
      const pixPerCandle = (dimensions.width - 87) / Math.max(viewportRef.current.count - 1, 1);
      const candleDelta = Math.round(-dx / pixPerCandle);
      if (candleDelta !== 0) {
        const { candles: c } = refs.current;
        const newStart = Math.max(0, Math.min(c.length - viewportRef.current.count, mouseRef.current.dragStart + candleDelta));
        viewportRef.current.startIdx = newStart;
        mouseRef.current.dragX = mx;
        mouseRef.current.dragStart = newStart;
      }
    }
  };

  const handleMouseLeave = () => { mouseRef.current.x = null; mouseRef.current.y = null; };
  const handleMouseDown  = (e) => {
    mouseRef.current.isDragging = true;
    mouseRef.current.dragX = e.clientX - (canvasRef.current?.getBoundingClientRect().left || 0);
    mouseRef.current.dragStart = viewportRef.current.startIdx;
    e.preventDefault();
  };
  const handleMouseUp = () => { mouseRef.current.isDragging = false; };

  // Wheel: zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const { candles: c } = refs.current;
    const vp = viewportRef.current;
    const delta = e.deltaY > 0 ? 5 : -5;
    const newCount = Math.max(10, Math.min(c.length, vp.count + delta));
    const newStart = Math.max(0, Math.min(c.length - newCount, vp.startIdx + Math.round(delta / 2)));
    vp.count = newCount;
    vp.startIdx = newStart;
  };

  // rAF loop
  useEffect(() => {
    let raf;
    const loop = (ts) => {
      const { candles: cv, trades: tv, activeTrade: at, dimensions: dv, strategy: sv, granularity: gv } = refs.current;
      drawChart({
        canvas:      canvasRef.current,
        candles:     cv,
        trades:      tv,
        activeTrade: at,
        dims:        dv,
        strategy:    sv,
        granularity: gv,
        viewport:    viewportRef.current,
        mouse:       mouseRef.current,
        timestamp:   ts,
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const latestPrice = candles.length > 0 ? candles[candles.length - 1].close : null;
  const isUp = candles.length > 1 ? candles[candles.length - 1].close >= candles[candles.length - 2].close : true;

  return (
    <div
      ref={containerRef}
      className="glass-panel"
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', padding: '10px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            GRÁFICO EM TEMPO REAL ({granularity === '60' ? 'M1' : granularity === '300' ? 'M5' : 'M15'})
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>EMA 9</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fb923c', display: 'inline-block' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>EMA 21</span>
          </div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 4 }}>
            🖱 Scroll=Zoom · Drag=Pan
          </span>
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

      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: 'calc(100% - 34px)', cursor: mouseRef.current.isDragging ? 'grabbing' : 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      />
    </div>
  );
}
