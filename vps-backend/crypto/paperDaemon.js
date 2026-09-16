import fs from 'node:fs/promises';
import path from 'node:path';
import { createPaperState, observePaper, SYMBOLS } from './paperEngine.js';

const dataDir = process.env.CRYPTO_LAB_DATA_DIR;
const publicFile = process.env.CRYPTO_LAB_PUBLIC_FILE;
if (!dataDir || !publicFile) throw new Error('Diretórios do laboratório não configurados');
await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });
const stateFile = path.join(dataDir, 'state.json');
async function atomic(file, data, mode) {
  const handle = await fs.open(`${file}.tmp`, 'w', mode);
  try { await handle.writeFile(JSON.stringify(data)); await handle.sync(); } finally { await handle.close(); }
  await fs.rename(`${file}.tmp`, file);
}
let state;
try {
  state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
  if (state.schema !== 1 || state.version !== createPaperState(0).version || state.mode !== 'paper'
    || SYMBOLS.some(s => !state.assets?.[s] || !Number.isFinite(state.assets[s].cash))) throw new Error('Estado persistido incompatível; migração necessária');
} catch (error) {
  if (error.code !== 'ENOENT') throw error; // Nunca zera resultados por falha de leitura.
  state = createPaperState(Date.now());
}
async function market(resource, symbol) {
  const url = new URL(`https://www.okx.com/api/v5/market/${resource}`);
  url.searchParams.set('instId', symbol);
  if (resource === 'candles') { url.searchParams.set('bar', '1H'); url.searchParams.set('limit', '300'); }
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`OKX HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.code !== '0' || !payload.data?.length) throw new Error('OKX sem dados válidos');
  return payload.data;
}
async function cycle() {
  const next = structuredClone(state);
  const results = await Promise.allSettled(SYMBOLS.map(async symbol => {
    const [rows, tickers] = await Promise.all([market('candles', symbol), market('ticker', symbol)]);
    const candles = rows.filter(r => r[8] === '1').map(r => ({ time: +r[0], open: +r[1], high: +r[2], low: +r[3], close: +r[4], closed: true })).sort((a, b) => a.time - b.time);
    const ticker = tickers[0];
    return observePaper(state.assets[symbol], candles, { ask: +ticker.askPx, bid: +ticker.bidPx, time: +ticker.ts }, Date.now());
  }));
  results.forEach((r, i) => {
    const symbol = SYMBOLS[i];
    if (r.status === 'fulfilled') next.assets[symbol] = r.value;
    else next.assets[symbol].error = String(r.reason.message).slice(0, 160);
  });
  next.updatedAt = Date.now();
  await atomic(stateFile, next, 0o600);
  state = next;
  // Somente dados públicos de simulação. Sem credenciais, contas ou rotas de escrita.
  await atomic(publicFile, next, 0o644);
  console.log(JSON.stringify({ at: next.updatedAt, mode: 'paper', assets: SYMBOLS.map(s => ({ symbol: s, error: next.assets[s].error, closedTrades: next.assets[s].closedTrades })) }));
}
async function loop() {
  try { await cycle(); } catch (error) { console.error('Falha ao persistir laboratório:', error.message); process.exitCode = 1; return; }
  setTimeout(loop, 60000);
}
await loop();
