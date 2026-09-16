export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método não permitido' });
  res.setHeader('Cache-Control', 'no-store');
  const scalping = req.query?.strategy === 'scalp';
  if (req.query?.strategy && !['scalp', 'h1'].includes(req.query.strategy)) return res.status(400).json({ error: 'Estratégia inválida' });
  try {
    const response = await fetch(`https://187-127-40-228.sslip.io/downloads/${scalping ? 'crypto-scalp' : 'crypto-lab'}.json`, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!response.ok) throw new Error('Coletor indisponível');
    const body = await response.text();
    if (body.length > 1500000) throw new Error('Snapshot excede limite');
    const data = JSON.parse(body);
    if (data.schema !== 1 || data.mode !== 'paper' || !Number.isFinite(data.updatedAt)
      || !['BTC-USDT', 'ETH-USDT', 'SOL-USDT'].every(s => Number.isFinite(data.assets?.[s]?.equity))) throw new Error('Snapshot inválido');
    if (scalping && (data.version !== 'spot-pullback-m5-v1' || !data.day || !data.config)) throw new Error('Versão scalping inválida');
    return res.status(200).json({ ...data, stale: Date.now() - data.updatedAt > (scalping ? 30000 : 180000) });
  } catch {
    return res.status(503).json({ error: 'Coletor prospectivo indisponível; resultados preservados na VPS' });
  }
}
