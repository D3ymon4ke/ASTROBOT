import React, { useRef, useEffect, useState } from 'react';
import { calculateEMA } from '../strategies/tradingStrategies';
import { analyzeMarketConditions } from '../utils/marketIntelligence';
import { Clock, Calendar, ShieldCheck, Zap, Activity, Layers, BarChart2, Timer, Shield, ZoomIn, ZoomOut, RotateCcw, Anchor, ArrowDown } from 'lucide-react';

// Helper para gerar velas sintéticas de pré-visualização quando a conexão inicial do mercado ainda não retornou velas
function generateFallbackCandles(count = 40) {
  const now = Math.floor(Date.now() / 1000);
  const candles = [];
  let basePrice = 149.45;
  for (let i = count - 1; i >= 0; i--) {
    const epoch = now - (i * 60);
    const delta = (Math.random() - 0.48) * 0.45;
    const open = basePrice;
    const close = open + delta;
    const high = Math.max(open, close) + Math.random() * 0.25;
    const low = Math.min(open, close) - Math.random() * 0.25;
    basePrice = close;
    candles.push({ epoch, open, high, low, close });
  }
  return candles;
}

// ─── Pure canvas draw function (called from rAF loop) ───────────────────────
function drawChart({ canvas, candles, trades, activeTrade, dims, strategy, granularity, viewport, mouse, timestamp, toggles = {} }) {
  if (!canvas || !candles || candles.length === 0) return;

  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = dims.width  * dpr;
  canvas.height = dims.height * dpr;
  ctx.scale(dpr, dpr);

  const W = dims.width;
  const H = dims.height;
  const M = { top: 24, right: 76, bottom: 25, left: 15 };
  const cW = W - M.left - M.right;
  const cH = H - M.top  - M.bottom;

  // Defaults for toggles
  const showEMAs          = toggles.showEMAs          !== false;
  const showSR            = toggles.showSR            !== false;
  const showVolume        = toggles.showVolume        !== false;
  const showTimer         = toggles.showTimer         !== false;
  const showStreak        = toggles.showStreak        !== false;


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
    if (showEMAs) {
      if (ve9[i])  { lo = Math.min(lo, ve9[i]);  hi = Math.max(hi, ve9[i]);  }
      if (ve21[i]) { lo = Math.min(lo, ve21[i]); hi = Math.max(hi, ve21[i]); }
    }
  });
  const pad = (hi - lo || 0.5) * 0.14;
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

  // ── 2. SUB-GRÁFICO DE VOLUME (HISTOGRAMA NO RODAPÉ) ──────────────────────────
  const cw = Math.max(2, (cW / vis.length) * 0.7);

  if (showVolume) {
    let maxVol = 0.0001;
    vis.forEach(c => {
      const v = Math.abs(c.close - c.open) + (c.high - c.low) * 0.4;
      if (v > maxVol) maxVol = v;
    });

    const maxBarH = cH * 0.18; // Max 18% of chart height
    vis.forEach((c, i) => {
      const x = gX(i);
      const volVal = Math.abs(c.close - c.open) + (c.high - c.low) * 0.4;
      const barH = Math.max(2, (volVal / maxVol) * maxBarH);
      const yB = H - M.bottom - barH;
      const bull = c.close >= c.open;

      ctx.fillStyle = bull ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(x - cw / 2, yB, cw, barH);
    });

    // Volume baseline label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = 'bold 8px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('VOL', M.left + 4, H - M.bottom - 4);
  }

  // ── 3. LINHAS AUTOMÁTICAS DE SUPORTE E RESISTÊNCIA ───────────────────────────
  if (showSR) {
    let maxHigh = -Infinity;
    let minLow  = Infinity;
    vis.forEach(c => {
      if (c.high > maxHigh) maxHigh = c.high;
      if (c.low < minLow)   minLow  = c.low;
    });

    if (maxHigh !== -Infinity && minLow !== Infinity) {
      // Resistance Line (Red)
      const yRes = gY(maxHigh);
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(M.left, yRes); ctx.lineTo(W - M.right, yRes); ctx.stroke();

      ctx.fillStyle = 'rgba(239, 68, 68, 0.85)';
      ctx.beginPath(); ctx.roundRect(M.left + 4, yRes - 8, 88, 16, 3); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px Outfit, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`RES: ${maxHigh.toFixed(5)}`, M.left + 8, yRes + 4);

      // Support Line (Green)
      const ySup = gY(minLow);
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
      ctx.beginPath(); ctx.moveTo(M.left, ySup); ctx.lineTo(W - M.right, ySup); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.85)';
      ctx.beginPath(); ctx.roundRect(M.left + 4, ySup - 8, 88, 16, 3); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 8px Outfit, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText(`SUP: ${minLow.toFixed(5)}`, M.left + 8, ySup + 4);
    }
  }

  // ── 4. EMA LINES ────────────────────────────────────────────────────────────
  if (showEMAs) {
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
  }

  // ── 5. CANDLESTICKS RENDERING ───────────────────────────────────────────────
  let streakCounts = new Array(vis.length).fill(0);
  let streakColors = new Array(vis.length).fill(null);

    if (showStreak) {
      vis.forEach((c, vi) => {
        const fullIdx = si + vi;
        let count = 0;
        let col = c.close >= c.open ? 'CALL' : 'PUT';

        for (let k = fullIdx; k >= 0; k--) {
          const prevC = candles[k];
          const prevCol = prevC.close >= prevC.open ? 'CALL' : 'PUT';
          if (prevCol === col) {
            count++;
          } else {
            break;
          }
        }
        streakCounts[vi] = count;
        streakColors[vi] = col;
      });
    }

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

      // ── STREAK TAG ─────────────────────────────────────────────────────────────
      if (showStreak && streakCounts[i] >= 3) {
        const streakCnt = streakCounts[i];
        const isShield  = streakCnt >= 4;
        const label     = isShield ? `🛡️ ${streakCnt}V` : `🔥 ${streakCnt}V`;
        const tagColor  = isShield ? '#34d399' : '#f59e0b';
        const tagBg     = isShield ? 'rgba(6, 78, 59, 0.85)' : 'rgba(120, 53, 15, 0.85)';

        const tagY = bull ? yL + 12 : yH - 12;
        ctx.font = 'bold 8px Outfit, sans-serif';
        const tw = ctx.measureText(label).width + 8;

        ctx.fillStyle = tagBg;
        ctx.strokeStyle = tagColor;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.roundRect(x - tw / 2, tagY - 6, tw, 13, 3); ctx.fill(); ctx.stroke();

        ctx.fillStyle = tagColor;
        ctx.textAlign = 'center';
        ctx.fillText(label, x, tagY + 3);
      }
    });

  // ── 6. ACTIVE TRADE LINES ────────────────────────────────────────────────────
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

  // ── 7. TRADE ARROW MARKERS ───────────────────────────────────────────────────
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

  // ── 8. LIVE PRICE LINE & CANDLE TIMER ────────────────────────────────────────
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
  ctx.beginPath(); ctx.roundRect(W - M.right + 1, ly - 9, 68, 18, 3); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 9px JetBrains Mono, monospace'; ctx.textAlign = 'left';
  ctx.fillText(lc.close.toFixed(5), W - M.right + 4, ly + 3);

  // ⏱️ CANDLE TIMER BADGE (Floating next to live price box)
  if (showTimer) {
    const granSec = parseInt(granularity || '60');
    const nowSec  = Math.floor(Date.now() / 1000);
    const remSec  = Math.max(0, granSec - (nowSec % granSec));
    const mm = String(Math.floor(remSec / 60)).padStart(2, '0');
    const ss = String(remSec % 60).padStart(2, '0');
    const timerText = `⏳ ${mm}:${ss}`;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(W - M.right + 1, ly - 28, 68, 16, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#38bdf8'; ctx.font = 'bold 8px JetBrains Mono, monospace'; ctx.textAlign = 'center';
    ctx.fillText(timerText, W - M.right + 35, ly - 17);
  }

  // ── 9. STRATEGY BADGE ────────────────────────────────────────────────────────
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

  // ── 10. CROSSHAIR + OHLC TOOLTIP ────────────────────────────────────────────
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
    ctx.fillRect(W - M.right + 1, my - 8, 68, 16);
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
export default function Chart({ candles = [], trades = [], dbTrades = [], symbol = '', activeTrade, granularity, strategy, toggles: togglesProp }) {
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 350 });
  const [isLiveLocked, setIsLiveLocked] = useState(true);

  // Toggles de Indicadores do Gráfico
  const [toggles, setToggles] = useState({
    showEMAs: true,
    showSR: true,
    showVolume: true,
    showTimer: true,
    showStreak: true,
  });

  // Gerar velas de fallback sintéticas para que o gráfico NUNCA fique em branco
  const fallbackCandlesRef = useRef(null);
  if (!fallbackCandlesRef.current) {
    fallbackCandlesRef.current = generateFallbackCandles(40);
  }

  const effectiveCandles = (candles && candles.length > 0) ? candles : fallbackCandlesRef.current;
  const isSyncing = !candles || candles.length === 0;

  // Motor de Inteligência de Horários & Mercado
  const marketIntel = analyzeMarketConditions({
    dbTrades,
    candles: effectiveCandles,
    currentSymbol: symbol
  });

  // Refs para que a animação rAF leia sempre os dados mais recentes
  const refs = useRef({ candles: effectiveCandles, trades, activeTrade, dimensions, strategy, granularity, toggles, isLiveLocked });
  useEffect(() => { 
    refs.current = { candles: effectiveCandles, trades, activeTrade, dimensions, strategy, granularity, toggles, isLiveLocked }; 
  });

  // Viewport: { startIdx, count }
  const viewportRef = useRef({ startIdx: 0, count: 40 });

  // Auto-Follow / Live Lock: manter o gráfico preso na última vela se isLiveLocked === true
  useEffect(() => {
    if (effectiveCandles.length > 0 && isLiveLocked) {
      const count = viewportRef.current.count;
      viewportRef.current.startIdx = Math.max(0, effectiveCandles.length - count);
    }
  }, [effectiveCandles.length, isLiveLocked]);

  // Função para ancorar/retornar ao tempo real
  const snapToLive = () => {
    viewportRef.current.startIdx = Math.max(0, effectiveCandles.length - viewportRef.current.count);
    setIsLiveLocked(true);
  };

  // Funções de Zoom Manual pelos botões
  const zoomIn = () => {
    const { candles: c } = refs.current;
    const vp = viewportRef.current;
    const newCount = Math.max(8, Math.round(vp.count * 0.8));
    const delta = vp.count - newCount;
    vp.count = newCount;
    vp.startIdx = Math.max(0, Math.min(c.length - newCount, vp.startIdx + Math.round(delta / 2)));
  };

  const zoomOut = () => {
    const { candles: c } = refs.current;
    const vp = viewportRef.current;
    const newCount = Math.min(c.length, Math.round(vp.count * 1.25));
    const delta = newCount - vp.count;
    vp.count = newCount;
    vp.startIdx = Math.max(0, Math.min(c.length - newCount, vp.startIdx - Math.round(delta / 2)));
  };

  const resetZoom = () => {
    viewportRef.current.count = 40;
    snapToLive();
  };

  // Mouse state
  const mouseRef = useRef({ x: null, y: null, isDragging: false, dragX: 0, dragStart: 0 });
  const touchStateRef = useRef({ initialDist: 0, initialCount: 40 });

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
      const pixPerCandle = (dimensions.width - 91) / Math.max(viewportRef.current.count - 1, 1);
      const candleDelta = Math.round(-dx / pixPerCandle);
      if (candleDelta !== 0) {
        const { candles: c } = refs.current;
        const newStart = Math.max(0, Math.min(c.length - viewportRef.current.count, mouseRef.current.dragStart + candleDelta));
        viewportRef.current.startIdx = newStart;
        mouseRef.current.dragX = mx;
        mouseRef.current.dragStart = newStart;

        // Se o usuário arrastar para o histórico, solta a trava do tempo real
        const isAtEnd = (newStart + viewportRef.current.count) >= c.length - 1;
        if (!isAtEnd && isLiveLocked) {
          setIsLiveLocked(false);
        }
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

  // 🎯 ZOOM FOCADO NO CURSOR DO MOUSE (Cursor-Centered Zoom)
  const handleWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mx = e.clientX - rect.left;
    const { candles: c } = refs.current;
    const vp = viewportRef.current;

    const zoomStep = e.deltaY > 0 ? 1.15 : 0.85; // 15% zoom step
    const currentCount = vp.count;
    const newCount = Math.max(8, Math.min(c.length, Math.round(currentCount * zoomStep)));

    if (newCount === currentCount) return;

    // Calcular qual índice de vela está sob o cursor
    const M_left = 15;
    const M_right = 76;
    const cW = dimensions.width - M_left - M_right;
    const cursorRatio = Math.max(0, Math.min(1, (mx - M_left) / cW));
    const candleAtCursor = vp.startIdx + cursorRatio * currentCount;

    let newStart = Math.round(candleAtCursor - cursorRatio * newCount);
    newStart = Math.max(0, Math.min(c.length - newCount, newStart));

    vp.count = newCount;
    vp.startIdx = newStart;

    // Desativa Live Lock se afastou do final
    const isAtEnd = (newStart + newCount) >= c.length - 1;
    if (!isAtEnd && isLiveLocked) {
      setIsLiveLocked(false);
    }
  };

  // 📱 SUPORTE A GESTOS TOUCH (TOUCH PAN & PINCH-TO-ZOOM)
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.touches[0].clientX - rect.left;
      mouseRef.current.isDragging = true;
      mouseRef.current.dragX = mx;
      mouseRef.current.dragStart = viewportRef.current.startIdx;
    } else if (e.touches.length === 2) {
      mouseRef.current.isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      touchStateRef.current.initialDist = dist;
      touchStateRef.current.initialCount = viewportRef.current.count;
    }
  };

  const handleTouchMove = (e) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (e.touches.length === 1 && mouseRef.current.isDragging) {
      const mx = e.touches[0].clientX - rect.left;
      const dx = mx - mouseRef.current.dragX;
      const cW = dimensions.width - 91;
      const pixPerCandle = cW / Math.max(viewportRef.current.count - 1, 1);
      const candleDelta = Math.round(-dx / pixPerCandle);
      if (candleDelta !== 0) {
        const { candles: c } = refs.current;
        const newStart = Math.max(0, Math.min(c.length - viewportRef.current.count, mouseRef.current.dragStart + candleDelta));
        viewportRef.current.startIdx = newStart;
        mouseRef.current.dragX = mx;
        mouseRef.current.dragStart = newStart;
        if ((newStart + viewportRef.current.count) < c.length - 1 && isLiveLocked) {
          setIsLiveLocked(false);
        }
      }
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const initialDist = touchStateRef.current.initialDist;
      if (initialDist > 0) {
        const scale = initialDist / dist;
        const { candles: c } = refs.current;
        let newCount = Math.max(8, Math.min(c.length, Math.round(touchStateRef.current.initialCount * scale)));
        viewportRef.current.count = newCount;
      }
    }
  };

  const handleTouchEnd = () => {
    mouseRef.current.isDragging = false;
    touchStateRef.current.initialDist = 0;
  };

  // rAF loop
  useEffect(() => {
    let raf;
    const loop = (ts) => {
      const { candles: cv, trades: tv, activeTrade: at, dimensions: dv, strategy: sv, granularity: gv, toggles: tvg } = refs.current;
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
        toggles:     tvg
      });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const latestPrice = effectiveCandles.length > 0 ? effectiveCandles[effectiveCandles.length - 1].close : null;
  const isUp = effectiveCandles.length > 1 ? effectiveCandles[effectiveCandles.length - 1].close >= effectiveCandles[effectiveCandles.length - 2].close : true;

  return (
    <div
      ref={containerRef}
      className="glass-panel"
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', padding: '10px' }}
    >
      {/* Overlay de Sincronização Vivo */}
      {isSyncing && (
        <div style={{
          position: 'absolute',
          top: '46px',
          left: '10px',
          right: '10px',
          bottom: '10px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(9, 14, 26, 0.75)',
          backdropFilter: 'blur(3px)',
          borderRadius: '8px',
          border: '1px solid rgba(139, 92, 246, 0.25)',
          zIndex: 8,
          gap: '8px'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            border: '2px solid rgba(139, 92, 246, 0.2)',
            borderTopColor: '#a78bfa',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#a78bfa', letterSpacing: '0.5px' }}>
            SINCRONIZANDO VELAS DO MERCADO...
          </span>
          <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
            Conectando à Deriv API & Servidor VPS em Tempo Real
          </span>
        </div>
      )}

      {/* Banner de Inteligência de Horários & Mercado */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        padding: '6px 12px',
        marginBottom: '8px',
        background: 'rgba(15, 11, 28, 0.75)',
        border: `1px solid ${marketIntel.statusBorder}`,
        borderRadius: '8px',
        fontSize: '0.75rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            background: marketIntel.statusBg,
            color: marketIntel.statusColor,
            border: `1px solid ${marketIntel.statusBorder}`,
            padding: '2px 8px',
            borderRadius: '6px',
            fontWeight: '800',
            fontSize: '0.68rem',
            letterSpacing: '0.5px'
          }}>
            {marketIntel.statusBadge}
          </span>
          <span style={{ color: '#e2e8f0', fontWeight: 'bold' }}>
            {marketIntel.statusLabel}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Janela com maior taxa de acerto no banco de dados">
            <Clock size={12} style={{ color: '#a78bfa' }} />
            <strong style={{ color: '#a78bfa' }}>Janela Ideal:</strong> {marketIntel.bestWindowLabel}
          </span>

          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Dias da semana mais lucrativos no histórico">
            <Calendar size={12} style={{ color: '#10b981' }} />
            <strong style={{ color: '#10b981' }}>Melhores Dias:</strong> {marketIntel.bestDaysFormatted}
          </span>

          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Zap size={12} style={{ color: '#f59e0b' }} />
            <span style={{ color: 'var(--text-muted)' }}>Velas:</span> {marketIntel.candleVolatility}
          </span>
        </div>
      </div>

      {/* Header & Barra de Ferramentas (Toggles) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 8px', flexWrap: 'wrap', gap: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            GRÁFICO EM TEMPO REAL ({granularity === '60' ? 'M1' : granularity === '300' ? 'M5' : 'M15'})
          </span>

          {/* BARRA DE FERRAMENTAS / TOGGLES */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(15, 23, 42, 0.6)', padding: '2px 6px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setToggles(t => ({ ...t, showEMAs: !t.showEMAs }))}
              title="Alternar Médias Móveis (EMA 9/21)"
              style={{
                background: toggles.showEMAs ? 'rgba(139, 92, 246, 0.25)' : 'transparent',
                color: toggles.showEMAs ? '#a78bfa' : 'var(--text-muted)',
                border: toggles.showEMAs ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.2s ease'
              }}
            >
              <Activity size={10} /> EMAs
            </button>

            <button
              onClick={() => setToggles(t => ({ ...t, showSR: !t.showSR }))}
              title="Alternar Linhas Automáticas de Suporte e Resistência"
              style={{
                background: toggles.showSR ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                color: toggles.showSR ? '#34d399' : 'var(--text-muted)',
                border: toggles.showSR ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid transparent',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.2s ease'
              }}
            >
              <Layers size={10} /> Sup/Res
            </button>

            <button
              onClick={() => setToggles(t => ({ ...t, showVolume: !t.showVolume }))}
              title="Alternar Sub-Gráfico de Volume"
              style={{
                background: toggles.showVolume ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                color: toggles.showVolume ? '#38bdf8' : 'var(--text-muted)',
                border: toggles.showVolume ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.2s ease'
              }}
            >
              <BarChart2 size={10} /> Volume
            </button>

            <button
              onClick={() => setToggles(t => ({ ...t, showTimer: !t.showTimer }))}
              title="Alternar Cronômetro de Fechamento da Vela"
              style={{
                background: toggles.showTimer ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                color: toggles.showTimer ? '#fbbf24' : 'var(--text-muted)',
                border: toggles.showTimer ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid transparent',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.2s ease'
              }}
            >
              <Timer size={10} /> Timer
            </button>

            <button
              onClick={() => setToggles(t => ({ ...t, showStreak: !t.showStreak }))}
              title="Alternar Marcadores de Velas Consecutivas (Streak Shield)"
              style={{
                background: toggles.showStreak ? 'rgba(236, 72, 153, 0.25)' : 'transparent',
                color: toggles.showStreak ? '#f472b6' : 'var(--text-muted)',
                border: toggles.showStreak ? '1px solid rgba(236, 72, 153, 0.5)' : '1px solid transparent',
                padding: '2px 7px',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                transition: 'all 0.2s ease'
              }}
            >
              <Shield size={10} /> Streak
            </button>


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

      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: 'calc(100% - 76px)', cursor: mouseRef.current.isDragging ? 'grabbing' : 'crosshair' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      />

      {/* 🎛️ CONTROLES FLUTUANTES DE NAVEGAÇÃO DO GRÁFICO */}
      <div style={{
        position: 'absolute',
        bottom: '36px',
        right: '90px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'rgba(9, 14, 26, 0.88)',
        backdropFilter: 'blur(8px)',
        padding: '4px 6px',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.4)',
        zIndex: 5
      }}>
        <button
          onClick={zoomIn}
          title="Aumentar Zoom (Zoom In)"
          style={{
            background: 'rgba(139, 92, 246, 0.12)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            transition: 'all 0.15s ease'
          }}
        >
          <ZoomIn size={15} strokeWidth={2.5} color="#a78bfa" />
        </button>

        <button
          onClick={zoomOut}
          title="Diminuir Zoom (Zoom Out)"
          style={{
            background: 'rgba(139, 92, 246, 0.12)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            transition: 'all 0.15s ease'
          }}
        >
          <ZoomOut size={15} strokeWidth={2.5} color="#a78bfa" />
        </button>

        <button
          onClick={resetZoom}
          title="Resetar Zoom Padrão (40 Velas)"
          style={{
            background: 'rgba(139, 92, 246, 0.12)',
            color: '#a78bfa',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <RotateCcw size={14} strokeWidth={2.5} color="#a78bfa" />
        </button>

        <button
          onClick={() => setIsLiveLocked(!isLiveLocked)}
          title={isLiveLocked ? "Trava no Tempo Real ATIVA (Auto-Scroll)" : "Ativar Trava no Tempo Real"}
          style={{
            background: isLiveLocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.05)',
            color: isLiveLocked ? '#34d399' : 'var(--text-muted)',
            border: isLiveLocked ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
            padding: '0 10px',
            height: '28px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.7rem',
            fontWeight: '800',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Anchor size={13} strokeWidth={2.5} color={isLiveLocked ? '#34d399' : '#94a3b8'} />
          <span>{isLiveLocked ? 'LIVE LOCK' : 'LIVRE'}</span>
        </button>
      </div>

      {/* ⬇️ BOTÃO FLUTUANTE DE VOLTAR AO TEMPO REAL CUANDO NAVEGANDO NO HISTÓRICO */}
      {!isLiveLocked && (
        <button
          onClick={snapToLive}
          style={{
            position: 'absolute',
            bottom: '72px',
            right: '90px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
            color: '#ffffff',
            border: 'none',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '0.72rem',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 6,
            animation: 'fadeIn 0.25s ease-out'
          }}
        >
          <ArrowDown size={14} /> Voltar ao Tempo Real
        </button>
      )}
    </div>
  );
}
