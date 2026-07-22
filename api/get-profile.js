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

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'O e-mail do usuário é obrigatório.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!supabase) {
    console.warn('Supabase não configurado. Retornando perfil de recuperação local para:', cleanEmail);
    const adminEmails = ['deymonmachado@gmail.com', 'lucassmachado9@gmail.com'];
    const isAdmin = adminEmails.includes(cleanEmail);
    return res.status(200).json({
      success: true,
      user: {
        email: cleanEmail,
        cdkey: isAdmin ? 'ASTROBOT-ADMIN-KEY' : 'ASTROBOT-LOCAL-KEY',
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
        licenseStatus: 'active',
        settings: {},
        telegramConfig: {},
        cycles: [],
        profile: { fullname: cleanEmail.split('@')[0], profileImage: '' }
      }
    });
  }

  try {
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (userErr || !userData) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    // Verify key status
    let expiresAt = userData.expires_at ? Number(userData.expires_at) : null;
    let licenseStatus = 'active';

    if (userData.cdkey) {
      const { data: keyDoc } = await supabase
        .from('keys')
        .select('*')
        .eq('cdkey', userData.cdkey)
        .maybeSingle();

      if (keyDoc) {
        expiresAt = keyDoc.expires_at ? Number(keyDoc.expires_at) : expiresAt;
        const now = Date.now();
        if (keyDoc.status === 'expired' || (expiresAt && now > expiresAt)) {
          licenseStatus = 'expired';
          if (keyDoc.status !== 'expired') {
            await supabase.from('keys').update({ status: 'expired' }).eq('cdkey', userData.cdkey);
          }
        }
      }
    }

    return res.status(200).json({
      success: true,
      user: {
        email: userData.email,
        cdkey: userData.cdkey,
        expiresAt: expiresAt,
        licenseStatus: licenseStatus,
        settings: userData.settings || {},
        telegramConfig: userData.telegram_config || {},
        cycles: userData.cycles || [],
        profile: userData.profile || {}
      }
    });

  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ success: false, message: 'Erro ao carregar perfil.', error: error.message });
  }
}
