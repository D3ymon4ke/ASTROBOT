import { supabase } from './utils/supabase.js';

export default async function handler(req, res) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabase) {
    const action = req.query?.action || (req.method === 'POST' ? 'delete' : 'list');
    if (action === 'generate') {
      const durationDays = parseInt(req.query.days) || 30;
      const count = parseInt(req.query.count) || 1;
      const keys = Array.from({ length: count }, () => ({
        key: `ASTRO-LOCAL-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        durationDays
      }));
      return res.status(200).json({ success: true, keys });
    }
    return res.status(200).json({ success: true, keys: [] });
  }

  const method = req.method;
  const action = req.query.action;

  // --- DELETE KEY ACTION ---
  if (method === 'POST' && (action === 'delete' || req.body?.cdkey)) {
    const { admin_token, cdkey } = req.body;
    if (admin_token !== 'lucas_astro_admin') {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }
    if (!cdkey) {
      return res.status(400).json({ error: 'Parâmetro cdkey ausente.' });
    }
    const cleanKey = cdkey.trim().toUpperCase();
    try {
      const { data: doc } = await supabase
        .from('keys')
        .select('cdkey')
        .eq('cdkey', cleanKey)
        .maybeSingle();

      if (!doc) {
        return res.status(404).json({ error: 'Chave não encontrada.' });
      }

      const { error: deleteErr } = await supabase
        .from('keys')
        .delete()
        .eq('cdkey', cleanKey);

      if (deleteErr) throw deleteErr;

      return res.status(200).json({
        success: true,
        message: `Chave ${cleanKey} excluída com sucesso.`
      });
    } catch (err) {
      return res.status(500).json({ error: 'Falha ao excluir chave do banco de dados.', details: err.message });
    }
  }

  // --- GENERATE KEY ACTION ---
  if (method === 'GET' && (action === 'generate' || req.query.days || req.query.count)) {
    const { admin_token, days, count } = req.query;
    if (admin_token !== 'lucas_astro_admin') {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }
    const durationDays = parseInt(days) || 30;
    const keyCount = parseInt(count) || 1;
    const generatedKeys = [];

    try {
      for (let i = 0; i < keyCount; i++) {
        const part1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const part2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const part3 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const newKey = `ASTRO-${part1}-${part2}-${part3}`;

        const { error: insertErr } = await supabase.from('keys').insert({
          cdkey: newKey,
          status: 'pending',
          duration_days: durationDays,
          created_at: Date.now(),
          activated_at: null,
          expires_at: null
        });

        if (insertErr) throw insertErr;

        generatedKeys.push({
          key: newKey,
          durationDays
        });
      }

      return res.status(200).json({ success: true, keys: generatedKeys });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // --- LIST KEYS ACTION (DEFAULT GET) ---
  if (method === 'GET') {
    const { admin_token } = req.query;
    if (admin_token !== 'lucas_astro_admin') {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }
    try {
      const { data: keysData, error } = await supabase
        .from('keys')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const keysList = keysData.map(row => ({
        key: row.cdkey,
        status: row.status,
        durationDays: row.duration_days,
        createdAt: row.created_at ? Number(row.created_at) : null,
        activatedAt: row.activated_at ? Number(row.activated_at) : null,
        expiresAt: row.expires_at ? Number(row.expires_at) : null,
        owner: row.owner
      }));

      return res.status(200).json({
        success: true,
        keys: keysList
      });
    } catch (err) {
      return res.status(500).json({ error: 'Falha ao buscar chaves no banco de dados.', details: err.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
