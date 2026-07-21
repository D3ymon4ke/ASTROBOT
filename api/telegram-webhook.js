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
    return res.status(500).json({ 
      success: false, 
      message: 'Configuração do Supabase ausente.' 
    });
  }

  try {
    const update = req.body;
    if (!update) {
      return res.status(400).json({ success: false, message: 'Nenhum payload recebido.' });
    }

    // Extract message details
    const message = update.message || update.edited_message;
    if (!message || !message.text) {
      // We only process text commands or reply keyboard buttons
      return res.status(200).json({ success: true, message: 'Ignorado (não é mensagem de texto).' });
    }

    const text = message.text.trim();
    const chatId = String(message.chat.id);

    const emailQuery = req.query.email;
    let matchedEmail = null;

    if (emailQuery) {
      const cleanEmail = emailQuery.trim().toLowerCase();
      const { data: userDoc } = await supabase
        .from('users')
        .select('email')
        .eq('email', cleanEmail)
        .maybeSingle();
      if (userDoc) {
        matchedEmail = userDoc.email;
      }
    }

    if (!matchedEmail) {
      // Fallback: Find user in Supabase that has telegram_config->>chatId === chatId
      const { data: userDoc } = await supabase
        .from('users')
        .select('email')
        .eq('telegram_config->>chatId', chatId)
        .limit(1)
        .maybeSingle();

      if (userDoc) {
        matchedEmail = userDoc.email;
      }
    }

    if (!matchedEmail) {
      console.log(`Mensagem de chat ID desconhecido: ${chatId}`);
      return res.status(200).json({ success: true, message: 'Chat ID não vinculado a nenhum usuário.' });
    }

    // Write command to the user's queue (pending_command)
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        pending_command: {
          text: text,
          timestamp: Date.now(),
          processed: false,
          message_id: message.message_id
        }
      })
      .eq('email', matchedEmail);

    if (updateErr) throw updateErr;

    return res.status(200).json({
      success: true,
      message: 'Comando registrado na fila com sucesso!'
    });

  } catch (error) {
    console.error("Telegram webhook error:", error);
    return res.status(500).json({ success: false, message: 'Erro interno no webhook.', error: error.message });
  }
}
