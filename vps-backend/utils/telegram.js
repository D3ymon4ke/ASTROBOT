/**
 * Utility for formatting and sending Telegram notifications for ASTROBOT.
 * Uses HTML styling for clean rendering without markdown escape bugs.
 */

// Helper to escape simple HTML characters
export const escapeHtml = (text) => {
  if (!text) return '';
  return text.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// Send message to Telegram API
export const sendTelegramMessage = async (token, chatId, htmlText, useKeyboard = true) => {
  if (!token || !chatId) return { success: false, error: 'Token ou Chat ID ausente' };
  
  const keyboardMarkup = {
    keyboard: [
      [{ text: "▶ Iniciar Bot" }, { text: "⏸ Pausar" }, { text: "⛔ Parar" }],
      [{ text: "📈 Relatório" }, { text: "📊 Scanner" }, { text: "💰 Saldo" }],
      [{ text: "📅 Ciclos" }, { text: "⚙ Configurações" }]
    ],
    resize_keyboard: true,
    one_time_keyboard: false
  };

  const payload = {
    chat_id: chatId,
    text: htmlText,
    parse_mode: 'HTML',
    reply_markup: useKeyboard ? keyboardMarkup : undefined
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.ok) {
      return { success: true, data };
    }
    return { success: false, error: data.description || 'Erro desconhecido da API do Telegram' };
  } catch (err) {
    return { success: false, error: err.message || 'Erro na requisição de rede' };
  }
};

// Format Win message
export const formatWinMessage = (profit, balance, dailyGoalPercent = 0) => {
  return `🟢 <b>ASTROBOT • OPERAÇÃO VITORIOSA (WIN)</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `💵 <b>Retorno:</b> <code>+$${parseFloat(profit).toFixed(2)}</code>\n` +
         `💰 <b>Saldo Atual:</b> <code>$${parseFloat(balance).toFixed(2)}</code>\n` +
         `📈 <b>Meta Diária:</b> <code>${dailyGoalPercent.toFixed(1)}%</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🤖 <i>Operação realizada automaticamente via Inteligência Artificial.</i>`;
};

// Format Loss message
export const formatLossMessage = (loss, balance, nextGaleLevel = 0, nextStake = 0) => {
  let galeSection = '';
  if (nextGaleLevel > 0 && nextStake > 0) {
    galeSection = `\n🔄 <b>Próxima Entrada:</b> <code>Martingale G${nextGaleLevel}</code>\n` +
                  `💵 <b>Stake Estimada:</b> <code>$${parseFloat(nextStake).toFixed(2)}</code>`;
  } else {
    galeSection = `\n🔄 <b>Sequência:</b> <code>Mão Fixa Resetada</code>`;
  }

  return `🔴 <b>ASTROBOT • OPERAÇÃO CONCLUÍDA (LOSS)</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `💵 <b>Prejuízo:</b> <code>-$${Math.abs(parseFloat(loss)).toFixed(2)}</code>\n` +
         `💰 <b>Saldo Atual:</b> <code>$${parseFloat(balance).toFixed(2)}</code>` +
         galeSection +
         `\n━━━━━━━━━━━━━━━━━━━━━━\n` +
         `⚠️ <i>Respeite o seu gerenciamento e mantenha a consistência.</i>`;
};

// Format Entry/Opportunity Found
export const formatOpportunityFound = (symbol, strategy, direction, winRate, stake, time) => {
  const dirEmoji = direction.toUpperCase() === 'CALL' ? '🟩 CALL (COMPRA)' : '🟥 PUT (VENDA)';
  return `🚨 <b>ASTROBOT • OPORTUNIDADE IDENTIFICADA</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `📈 <b>Ativo:</b> <code>${symbol}</code>\n` +
         `🧠 <b>Estratégia:</b> <code>${strategy}</code>\n` +
         `↕️ <b>Direção:</b> <code>${dirEmoji}</code>\n` +
         `🎯 <b>Assertividade:</b> <code>${parseFloat(winRate).toFixed(1)}%</code>\n` +
         `💵 <b>Stake Sugerida:</b> <code>$${parseFloat(stake).toFixed(2)}</code>\n` +
         `⏰ <b>Horário:</b> <code>${time}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🤖 <i>Calculando entrada ideal no fechamento da vela.</i>`;
};

// Format Order Executed
export const formatOrderExecuted = (symbol, direction, stake) => {
  const dirEmoji = direction.toUpperCase() === 'CALL' ? '🟩 CALL (COMPRA)' : '🟥 PUT (VENDA)';
  return `🤖 <b>ASTROBOT • ORDEM ENVIADA</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `📈 <b>Ativo:</b> <code>${symbol}</code>\n` +
         `↕️ <b>Direção:</b> <code>${dirEmoji}</code>\n` +
         `💵 <b>Stake Aplicada:</b> <code>$${parseFloat(stake).toFixed(2)}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `⏳ <i>Aguardando expiração do contrato...</i>`;
};

// Format Take Profit (Meta Batida)
export const formatTakeProfitMessage = (profit, tradesCount, winRate, sessionName = 'Principal') => {
  return `🏆 <b>ASTROBOT • META DIÁRIA BATIDA!</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `📅 <b>Sessão:</b> <code>${sessionName}</code>\n` +
         `💵 <b>Lucro Acumulado:</b> <code>+$${parseFloat(profit).toFixed(2)}</code>\n` +
         `🔄 <b>Operações:</b> <code>${tradesCount}</code>\n` +
         `🎯 <b>Winrate da Sessão:</b> <code>${parseFloat(winRate).toFixed(1)}%</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🔒 <i>O robô encerrou automaticamente esta sessão para proteger seus lucros. Parabéns!</i>`;
};

// Format Stop Loss Hit
export const formatStopLossMessage = (loss, tradesCount, winRate, sessionName = 'Principal') => {
  return `🛑 <b>ASTROBOT • LIMITE DE PERDA (STOP LOSS)</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `📅 <b>Sessão:</b> <code>${sessionName}</code>\n` +
         `💵 <b>Perda Acumulada:</b> <code>-$${Math.abs(parseFloat(loss)).toFixed(2)}</code>\n` +
         `🔄 <b>Operações:</b> <code>${tradesCount}</code>\n` +
         `🎯 <b>Winrate da Sessão:</b> <code>${parseFloat(winRate).toFixed(1)}%</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🚫 <i>Bot desligado automaticamente. Revise seus parâmetros antes de iniciar um novo ciclo.</i>`;
};

// Format Status Report
export const formatStatusReport = (isRunning, settings, balance, sessionStats = {}) => {
  const statusEmoji = isRunning ? '🟢' : '🔴';
  const statusText = isRunning ? 'ONLINE & OPERANDO' : 'OFFLINE & PAUSADO';
  
  const wins = sessionStats.wins || 0;
  const losses = sessionStats.losses || 0;
  const total = wins + losses;
  const winrate = total > 0 ? (wins / total) * 100 : 0;
  const profit = sessionStats.profit || 0;
  const profitSign = profit >= 0 ? '+' : '';

  return `🤖 <b>ASTROBOT • PAINEL DE STATUS</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `⚡ <b>Estado do Motor:</b> <code>${statusText} ${statusEmoji}</code>\n` +
         `💰 <b>Saldo em Conta:</b> <code>$${parseFloat(balance).toFixed(2)}</code>\n` +
         `💵 <b>Lucro Sessão:</b> <code>${profitSign}$${parseFloat(profit).toFixed(2)}</code>\n` +
         `🏆 <b>Placar Sessão:</b> <code>${wins}W - ${losses}L</code> (Assertividade: <code>${winrate.toFixed(1)}%</code>)\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `📈 <b>Ativo:</b> <code>${settings.symbol}</code>\n` +
         `⏰ <b>Gráficos:</b> <code>M${settings.granularity === '60' ? '1' : settings.granularity === '300' ? '5' : '15'}</code>\n` +
         `🛡️ <b>Gerenciamento:</b> <code>${settings.moneyManagement.toUpperCase()}</code>\n` +
         `🤖 <b>Piloto Automático:</b> <code>${settings.autoPilot ? 'LIGADO' : 'DESLIGADO'}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `📅 <i>Use os botões do teclado para comandar o robô remotamente.</i>`;
};

// Format Daily Summary (Resumo Diário)
export const formatDailySummary = (stats) => {
  const profitSign = stats.profit >= 0 ? '+' : '';
  const winRate = stats.total > 0 ? (stats.wins / stats.total) * 100 : 0;
  
  return `📊 <b>ASTROBOT • RESUMO OPERACIONAL DIÁRIO</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `💵 <b>Lucro Líquido:</b> <code>${profitSign}$${parseFloat(stats.profit || 0).toFixed(2)}</code>\n` +
         `📈 <b>ROI Estimado:</b> <code>${parseFloat(stats.roi || 0).toFixed(2)}%</code>\n` +
         `🔄 <b>Total de Operações:</b> <code>${stats.total || 0}</code>\n` +
         `🏆 <b>Placar Geral:</b> <code>${stats.wins || 0}W - ${stats.losses || 0}L</code>\n` +
         `🎯 <b>Winrate:</b> <code>${winRate.toFixed(1)}%</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🧠 <b>Melhor Estratégia:</b> <code>${stats.bestStrategy || 'N/A'}</code>\n` +
         `📈 <b>Melhor Ativo:</b> <code>${stats.bestSymbol || 'N/A'}</code>\n` +
         `🥇 <b>Maior Sequência:</b> <code>${stats.maxStreak || 0} wins</code>\n` +
         `🥅 <b>Meta Atingida:</b> <code>${parseFloat(stats.goalProgress || 0).toFixed(1)}%</code>\n` +
         `⏰ <b>Tempo Operando:</b> <code>${stats.runtime || '0h 0m'}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🏆 <i>A evolução rumo à liberdade financeira continua!</i>`;
};

// Delete a batch of messages
export const deleteTelegramMessages = async (token, chatId, baseMessageId, count = 100) => {
  if (!token || !chatId || !baseMessageId) return;
  
  const promises = [];
  for (let i = 0; i < count; i++) {
    const msgId = baseMessageId - i;
    if (msgId <= 0) break;
    
    const url = `https://api.telegram.org/bot${token}/deleteMessage?chat_id=${chatId}&message_id=${msgId}`;
    promises.push(
      fetch(url, { method: 'POST' })
        .then(res => res.json())
        .catch(err => ({ ok: false, error: err.message }))
    );
  }
  
  await Promise.allSettled(promises);
};
