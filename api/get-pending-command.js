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
      success: false, 
      message: 'Configuração do Supabase ausente.' 
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, message: 'O e-mail do usuário é obrigatório.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data: userDoc, error: userErr } = await supabase
      .from('users')
      .select('pending_command')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (userErr || !userDoc) {
      return res.status(404).json({ success: false, message: 'Usuário não encontrado.' });
    }

    let commandToReturn = null;
    if (userDoc.pending_command && !userDoc.pending_command.processed) {
      commandToReturn = userDoc.pending_command;
      
      // Mark it as processed
      await supabase
        .from('users')
        .update({
          pending_command: { ...commandToReturn, processed: true }
        })
        .eq('email', cleanEmail);
    }

    return res.status(200).json({
      success: true,
      command: commandToReturn
    });

  } catch (error) {
    console.error("Get pending command error:", error);
    return res.status(500).json({ success: false, message: 'Erro ao buscar comando.', error: error.message });
  }
}
