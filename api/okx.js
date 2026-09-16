import marketHandler from '../server/okxMarket.js';
import demoHandler from '../server/okxDemo.js';
import researchHandler from '../server/okxResearch.js';

export default async function handler(req, res) {
  if (req.query?.kind === 'market') return marketHandler(req, res);
  if (req.query?.kind === 'demo') return demoHandler(req, res);
  if (req.query?.kind === 'research') return researchHandler(req, res);
  res.setHeader('Cache-Control', 'no-store');
  return res.status(400).json({ error: 'Serviço OKX inválido' });
}
