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

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  if (!supabase) {
    return res.status(200).json({
      success: true,
      message: 'Configurações salvas localmente.'
    });
  }

  const { email, settings, telegramConfig, cycles, profile } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'O e-mail do usuário é obrigatório.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // 1. Verify if user exists
    const { data: userDoc, error: userErr } = await supabase
      .from('users')
      .select('email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (userErr || !userDoc) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    const updateData = {
      updated_at: Date.now()
    };

    if (settings !== undefined) updateData.settings = settings;
    if (telegramConfig !== undefined) updateData.telegram_config = telegramConfig;
    if (cycles !== undefined) updateData.cycles = cycles;
    if (profile !== undefined) updateData.profile = profile;

    const { error: updateErr } = await supabase
      .from('users')
      .update(updateData)
      .eq('email', cleanEmail);

    if (updateErr) throw updateErr;

    return res.status(200).json({
      success: true,
      message: 'Configurações salvas com sucesso no banco de dados!'
    });

  } catch (error) {
    console.error("Save settings error:", error);
    return res.status(500).json({ success: false, message: 'Erro ao salvar configurações.', error: error.message });
  }
}
