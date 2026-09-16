import fs from 'node:fs/promises';
import path from 'node:path';
import { createScalpState, observeScalp, SCALP_VERSION } from './scalpEngine.js';
import { SYMBOLS } from './paperEngine.js';

const dir = process.env.CRYPTO_LAB_DATA_DIR, publicFile = process.env.CRYPTO_LAB_PUBLIC_FILE;
if (!dir || !publicFile) throw new Error('Diretórios não configurados');
await fs.mkdir(dir, { recursive: true, mode: 0o700 });
const file = path.join(dir, 'scalp-state.json');
async function atomic(filePath, value, mode) {
  const handle = await fs.open(`${filePath}.tmp`, 'w', mode);
  try { await handle.writeFile(JSON.stringify(value)); await handle.sync(); } finally { await handle.close(); }
  await fs.rename(`${filePath}.tmp`, filePath);
}
let state;
try {
  state = JSON.parse(await fs.readFile(file, 'utf8'));
  if (state.version !== SCALP_VERSION || state.mode !== 'paper' || !state.day
    || SYMBOLS.some(s => !Number.isFinite(state.assets?.[s]?.cash))) throw new Error('Estado scalping incompatível; não será zerado');
} catch (e) { if (e.code !== 'ENOENT') throw e; state = createScalpState(Date.now()); }
async function get(resource, symbol) {
  const url = new URL(`https://www.okx.com/api/v5/market/${resource}`);
  url.searchParams.set('instId', symbol);
  if (resource === 'candles') { url.searchParams.set('bar', '5m'); url.searchParams.set('limit', '100'); }
  const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!response.ok) throw new Error('OKX indisponível');
  const payload = await response.json();
  if (payload.code !== '0' || !payload.data?.length) throw new Error('OKX sem dados');
  return payload.data;
}
async function loop() {
  const started = Date.now();
  try {
    const feeds = {};
    await Promise.all(SYMBOLS.map(async symbol => {
      const [bars, tick] = await Promise.allSettled([get('candles', symbol), get('ticker', symbol)]);
      const q = tick.status === 'fulfilled' ? tick.value[0] : null;
      feeds[symbol] = { quote: q ? { ask: +q.askPx, bid: +q.bidPx, time: +q.ts } : null,
        candles: bars.status === 'fulfilled' ? bars.value.filter(b => b[8] === '1').map(b => ({ time: +b[0], open: +b[1], high: +b[2], low: +b[3], close: +b[4], volume: +b[5], closed: true })).sort((a, b) => a.time - b.time) : [] };
    }));
    const next = observeScalp(state, feeds, Date.now());
    await atomic(file, next, 0o600);
    state = next;
    await atomic(publicFile, state, 0o644);
    if (Math.floor(started / 60000) !== Math.floor((started - 10000) / 60000)) console.log(JSON.stringify({ mode: 'paper', updatedAt: state.updatedAt, day: state.day, errors: SYMBOLS.map(s => state.assets[s].error) }));
  } catch (e) { console.error('Falha no coletor scalping:', e.message); process.exitCode = 1; return; }
  setTimeout(loop, Math.max(1000, 10000 - (Date.now() - started)));
}
await loop();
