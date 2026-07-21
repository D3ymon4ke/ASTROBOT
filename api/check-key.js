import { supabase } from './utils/supabase.js';

export default async function handler(req, res) {
  // Support CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!supabase) {
    return res.status(500).json({ 
      valid: false,
      message: 'Configuração do Supabase ausente ou incorreta.'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { cdkey } = req.body;

  if (!cdkey || typeof cdkey !== 'string') {
    return res.status(400).json({ message: 'CDKey inválida ou não fornecida.' });
  }

  const cleanKey = cdkey.trim().toUpperCase();

  try {
    const { data: keyDoc, error: keyErr } = await supabase
      .from('keys')
      .select('*')
      .eq('cdkey', cleanKey)
      .maybeSingle();

    if (keyErr || !keyDoc) {
      return res.status(404).json({ valid: false, message: 'Chave de ativação (CDKEY) não encontrada.' });
    }

    const now = Date.now();
    const expiresAt = keyDoc.expires_at ? Number(keyDoc.expires_at) : null;
    const activatedAt = keyDoc.activated_at ? Number(keyDoc.activated_at) : null;

    // 1. If key is already expired
    if (keyDoc.status === 'expired' || (expiresAt && now > expiresAt)) {
      if (keyDoc.status !== 'expired') {
        await supabase.from('keys').update({ status: 'expired' }).eq('cdkey', cleanKey);
      }
      return res.status(200).json({ 
        valid: false, 
        status: 'expired',
        message: 'Esta CDKEY expirou. Por favor, adquira uma nova licença.' 
      });
    }

    // 2. If key is pending activation
    if (keyDoc.status === 'pending' || !activatedAt) {
      const durationDays = keyDoc.duration_days || 30;
      const newExpiresAt = now + durationDays * 24 * 60 * 60 * 1000;
      
      await supabase
        .from('keys')
        .update({
          status: 'active',
          activated_at: now,
          expires_at: newExpiresAt
        })
        .eq('cdkey', cleanKey);

      return res.status(200).json({
        valid: true,
        status: 'active',
        activatedAt: now,
        expiresAt: newExpiresAt,
        message: `Licença ativada com sucesso! Válida por ${durationDays} dias.`
      });
    }

    // 3. If key is active
    if (keyDoc.status === 'active') {
      return res.status(200).json({
        valid: true,
        status: 'active',
        activatedAt: activatedAt,
        expiresAt: expiresAt,
        message: `Licença ativa. Expira em: ${new Date(expiresAt).toLocaleDateString()}`
      });
    }

    return res.status(400).json({ valid: false, message: 'Estado de chave desconhecido.' });

  } catch (error) {
    console.error("Supabase check key error:", error);
    return res.status(500).json({ message: 'Erro interno ao validar a CDKEY.', error: error.message });
  }
}
