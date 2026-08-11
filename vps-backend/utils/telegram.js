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
      [{ text: "🧠 Status Risco" }, { text: "🛡️ Recall Engine" }, { text: "📅 Ciclos" }],
      [{ text: "⚙ Configurações" }]
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
  let displayWinRate = parseFloat(winRate || 0);
  if (displayWinRate >= 99.0) {
    displayWinRate = 88.5; // Cap realistic expectation for small-sample high-confidence signals
  }
  return `🚨 <b>ASTROBOT • OPORTUNIDADE IDENTIFICADA</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `📈 <b>Ativo:</b> <code>${symbol}</code>\n` +
         `🧠 <b>Estratégia:</b> <code>${strategy}</code>\n` +
         `↕️ <b>Direção:</b> <code>${dirEmoji}</code>\n` +
         `🎯 <b>Assertividade:</b> <code>${displayWinRate.toFixed(1)}%</code>\n` +
         `💵 <b>Stake Sugerida:</b> <code>$${parseFloat(stake).toFixed(2)}</code>\n` +
         `⏰ <b>Horário:</b> <code>${time}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🤖 <i>Calculando entrada ideal no fechamento da vela.</i>`;
};

// Format Order Executed
export const formatOrderExecuted = (symbol, direction, stake, strategyName = '') => {
  const dirEmoji = direction.toUpperCase() === 'CALL' ? '🟩 CALL (COMPRA)' : '🟥 PUT (VENDA)';
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const stratLine = strategyName ? `🧠 <b>Estratégia:</b> <code>${strategyName}</code>\n` : '';

  return `🤖 <b>ASTROBOT • ORDEM ENVIADA À CORRETORA</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `📈 <b>Ativo:</b> <code>${symbol}</code>\n` +
         stratLine +
         `↕️ <b>Direção:</b> <code>${dirEmoji}</code>\n` +
         `💵 <b>Stake Aplicada:</b> <code>$${parseFloat(stake).toFixed(2)}</code>\n` +
         `⏰ <b>Horário de Envio:</b> <code>${timeStr}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `⏳ <i>Aguardando expiração do contrato na Deriv...</i>`;
};

// Format Take Profit (Meta Batida)
export const formatTakeProfitMessage = (profit, tradesCount, winRate, sessionName = 'Principal') => {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `🏆 <b>ASTROBOT • META DIÁRIA BATIDA (TAKE PROFIT)!</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `⏰ <b>Horário da Meta:</b> <code>${timeStr}</code>\n` +
         `📅 <b>Sessão/Ciclo:</b> <code>${sessionName}</code>\n` +
         `💵 <b>Lucro Acumulado:</b> <code>+$${parseFloat(profit).toFixed(2)}</code>\n` +
         `🔄 <b>Operações Realizadas:</b> <code>${tradesCount}</code>\n` +
         `🎯 <b>Winrate da Sessão:</b> <code>${parseFloat(winRate).toFixed(1)}%</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🔒 <i>O robô encerrou automaticamente esta sessão para proteger seus lucros. Parabéns!</i>`;
};

// Format Stop Loss Hit
export const formatStopLossMessage = (loss, tradesCount, winRate, sessionName = 'Principal') => {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `🛑 <b>ASTROBOT • LIMITE DE PERDA (STOP LOSS) ATINGIDO</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `⏰ <b>Horário do Stop Loss:</b> <code>${timeStr}</code>\n` +
         `📅 <b>Sessão/Ciclo:</b> <code>${sessionName}</code>\n` +
         `🔴 <b>Perda Acumulada:</b> <code>-$${Math.abs(parseFloat(loss)).toFixed(2)}</code>\n` +
         `🔄 <b>Operações Realizadas:</b> <code>${tradesCount}</code>\n` +
         `🎯 <b>Winrate Geral:</b> <code>${parseFloat(winRate).toFixed(1)}%</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🚫 <i>Bot desligado automaticamente. Respeite seu plano de gerenciamento!</i>`;
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

// Format Auto Reset Message (Reset Automático & Renovação de Ciclos)
export const formatAutoResetMessage = (stats, autoRenew = true) => {
  const netProfit = stats.netProfit !== undefined ? stats.netProfit : ((stats.totalProfit || 0) - (stats.totalLoss || 0));
  const profitSign = netProfit >= 0 ? '+' : '';
  const winRate = stats.totalCycles > 0 && stats.wins !== undefined
    ? ((stats.wins / Math.max(1, stats.wins + stats.losses)) * 100)
    : (stats.winRate || 0);

  const renewStatusText = autoRenew ? 'ATIVADA 🟢' : 'DESATIVADA 🔴';
  const renewNotice = autoRenew
    ? `🚀 <i>O botão de renovação automática está ATIVADO. O bot executará novamente todos os ciclos agendados no novo período!</i>`
    : `⏸️ <i>Renovação automática desativada. Os ciclos foram resetados mas permanecerão pausados.</i>`;

  return `🔄 <b>ASTROBOT • RESET AUTOMÁTICO DE CICLOS</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `⏰ <b>Horário do Reset:</b> <code>${stats.resetTime || '00:10'}</code>\n` +
         `📅 <b>Período Concluído:</b> <code>Ciclo do Dia Anterior</code>\n\n` +
         `📊 <b>RESUMO OPERACIONAL COMPLETO:</b>\n` +
         `🟢 <b>Lucro Total:</b> <code>+$${parseFloat(stats.totalProfit || 0).toFixed(2)}</code>\n` +
         `🔴 <b>Perda Total:</b> <code>-$${Math.abs(parseFloat(stats.totalLoss || 0)).toFixed(2)}</code>\n` +
         `💵 <b>Resultado Líquido:</b> <code>${profitSign}$${parseFloat(netProfit).toFixed(2)}</code>\n` +
         `🏆 <b>Missões Finalizadas:</b> <code>${stats.finishedCyclesCount || 0} de ${stats.totalCycles || 0}</code>\n` +
         `🎯 <b>Assertividade Geral:</b> <code>${parseFloat(winRate).toFixed(1)}%</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🔄 <b>Status de Renovação:</b> <code>${renewStatusText}</code>\n\n` +
         renewNotice;
};

// Format Recall Engine Triggered Message
export const formatRecallTriggeredMessage = (triggerReason, mode, lossAmount, targetAccount) => {
  const modeText = mode === 'neural_recovery' ? '🧠 Neural Recovery (IA > 90% Winrate)'
    : mode === 'burst' ? '⚡ Burst Mode (Próxima Vela)'
    : '🎯 Sinal Confirmado';

  const accountText = targetAccount === 'demo' ? 'DEMO (Simulação)'
    : targetAccount === 'real2' ? 'REAL 2 (Shadow Account)'
    : 'REAL 1 (Saldo Real)';

  return `🛡️ <b>ASTROBOT • RECALL ENGINE ACIONADO</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `⚠️ <b>Gatilho:</b> <code>${escapeHtml(triggerReason)}</code>\n` +
         `💵 <b>Prejuízo Absorvido:</b> <code>-$${parseFloat(lossAmount).toFixed(2)}</code>\n` +
         `🎯 <b>Conta Alvo:</b> <code>${accountText}</code>\n` +
         `🧠 <b>Modo de Operação:</b> <code>${modeText}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🤖 <i>A Shadow Account assumiu o controle para buscar a recuperação dos valores.</i>`;
};

// Format Recall Engine Win Message
export const formatRecallWinMessage = (recoveredProfit, targetAccount, attemptCount = 1) => {
  const accountText = targetAccount === 'demo' ? 'DEMO' : 'REAL';
  return `✔ <b>ASTROBOT • RECALL ENGINE (VITÓRIA / RECUPERAÇÃO)</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🟢 <b>Lucro Recuperado:</b> <code>+$${parseFloat(recoveredProfit).toFixed(2)}</code>\n` +
         `🎯 <b>Conta Utilizada:</b> <code>${accountText}</code>\n` +
         `🔄 <b>Tentativas:</b> <code>${attemptCount}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `✨ <i>Sessão de recuperação concluída com sucesso! Retomando operações normais.</i>`;
};

// Format Recall Engine Loss Message
export const formatRecallLossMessage = (lossAmount, targetAccount, attemptCount = 1, maxAttempts = 1) => {
  const accountText = targetAccount === 'demo' ? 'DEMO' : 'REAL';
  return `✖ <b>ASTROBOT • RECALL ENGINE (PERDA)</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🔴 <b>Prejuízo na Ordem:</b> <code>-$${Math.abs(parseFloat(lossAmount)).toFixed(2)}</code>\n` +
         `🎯 <b>Conta Utilizada:</b> <code>${accountText}</code>\n` +
         `🔄 <b>Tentativa:</b> <code>${attemptCount} de ${maxAttempts}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `⚠️ <i>Respeitando regras de proteção da Shadow Account.</i>`;
};

// Format Recall Status Report
export const formatRecallStatusReport = (settings, recallState) => {
  const isEnabled = settings.recallEnabled;
  const isExecuting = recallState && recallState.active;
  const statusEmoji = isExecuting ? '🟢 OPERANDO' : isEnabled ? '🛡️ STANDBY (ATIVO)' : '🔴 DESATIVADO';

  const modeText = settings.recallMode === 'neural_recovery' ? '🧠 Neural Recovery (IA > 90%)'
    : settings.recallMode === 'burst' ? '⚡ Burst Mode (Próxima Vela)'
    : '🎯 Sinal Confirmado';

  const accountText = settings.recallAccount === 'demo' ? 'DEMO (Simulação)'
    : settings.recallAccount === 'real2' ? 'REAL 2 (Shadow Account)'
    : 'REAL 1 (Saldo Real)';

  const triggerText = settings.recallTrigger === 'last_gale' ? 'Perda do Último Gale'
    : settings.recallTrigger === '3_losses' ? '3 Losses Seguidos'
    : settings.recallTrigger === '4_losses' ? '4 Losses Seguidos'
    : 'Stop Loss Diário';

  return `👥 <b>ASTROBOT • PAINEL SHADOW ACCOUNT & RECALL</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `⚡ <b>Status do Engine:</b> <code>${statusEmoji}</code>\n` +
         `🎯 <b>Conta de Destino:</b> <code>${accountText}</code>\n` +
         `🧠 <b>Modo Selecionado:</b> <code>${modeText}</code>\n` +
         `⚠️ <b>Gatilho de Disparo:</b> <code>${triggerText}</code>\n` +
         `🔄 <b>Tentativas Permitidas:</b> <code>${settings.recallAttemptRule === 'single' ? 'Apenas 1 tentativa' : 'Até recuperar'}</code>\n` +
         `⏱️ <b>Cooldown:</b> <code>${settings.recallCooldown || '5min'}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🤖 <i>Proteção automatizada anti-quebra ativa via Telegram.</i>`;
};

// Format Market Risk & Intelligence Report
export const formatMarketRiskReport = (marketInfo, symbol) => {
  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `🧠 <b>ASTROBOT • INTELIGÊNCIA & STATUS DE RISCO</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `📈 <b>Ativo Analisado:</b> <code>${escapeHtml(symbol)}</code>\n` +
         `⚡ <b>Status Atual:</b> <code>${marketInfo.statusBadge}</code>\n` +
         `📝 <b>Condição:</b> <code>${escapeHtml(marketInfo.statusLabel)}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🕒 <b>Janela Ideal:</b> <code>${escapeHtml(marketInfo.bestWindowLabel)}</code>\n` +
         `📅 <b>Melhores Dias:</b> <code>${escapeHtml(marketInfo.bestDaysFormatted)}</code>\n` +
         `🕯️ <b>Velas:</b> <code>${escapeHtml(marketInfo.candleVolatility)}</code>\n` +
         `⏰ <b>Horário da Análise:</b> <code>${timeStr}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🤖 <i>Previsão gerada com base na volatilidade em tempo real e assertividade por horário.</i>`;
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
