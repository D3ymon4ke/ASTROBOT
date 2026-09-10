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
      [{ text: "🌳 Árvore de Decisão" }, { text: "⚙ Configurações" }]
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
export { formatWinMessage, formatLossMessage, formatOpportunityFound, formatOrderExecuted, formatTakeProfitMessage, formatStopLossMessage } from './telegramTemplates.js';

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

// Format Decision & Entry Tree Map for Telegram
export const formatDecisionTreeMap = (cycle = null, settings = {}, activeStatus = 'Aguardando') => {
  const isFakegale = cycle?.enableFakegale || cycle?.moneyManagement === 'fakegale' || cycle?.selectedStrategy === 'fakegale' || settings?.moneyManagement === 'fakegale';
  const isSorosgale = (cycle?.moneyManagement || settings?.moneyManagement) === 'sorosgale';
  const stratName = cycle?.selectedStrategy || settings?.selectedStrategy || 'mhi_auto';
  const symbol = cycle?.symbol || settings?.symbol || 'R_100';
  const stake = parseFloat(cycle?.stakeValue || settings?.stakeValue || 1.0).toFixed(2);
  const tp = parseFloat(cycle?.takeProfit || settings?.takeProfit || 5.0).toFixed(2);
  const sl = parseFloat(cycle?.stopLoss || settings?.stopLoss || 15.0).toFixed(2);
  const galeLevels = parseInt(cycle?.martingaleLevels ?? settings?.martingaleLevels ?? 2);
  const time = cycle?.startTime || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const cycleName = cycle?.name || 'Missão Ativa MHI Vol 100';

  let treeDiagram = '';

  if (isFakegale) {
    treeDiagram = 
`[🌌 RAÍZ] Início Ciclo (${time} • ${symbol})
  │
  ├── [🧠 ESTUDO IA] MHI Dinâmico (Vela 5)
  ├── [🛡️ FILTRO] Streak Shield (Max 4V)
  │     └── Se Tendência ──► 🛑 Bloqueio (0 Risco)
  │
  └── [🎯 GATILHO] Sinal Detectado (CALL/PUT)
        │
        ▼
  [🧪 FAKEGALE] Vela 1: Teste Virtual (G0)
        ├── (WIN Virtual) ──► 🛡️ Entrada Descartada
        └── (LOSS Virtual) ─► 🚀 ENTRADA REAL (Vela 2)
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
              [🟢 WIN REAL]                 [🔴 LOSS REAL]
                     │                             │
              [🏆 META: +$${tp}]             [⚠️ GALE 1 REAL]
                                                   │
                                     ┌─────────────┴─────────────┐
                                     ▼                           ▼
                              [🟢 WIN G1]                 [🔴 LOSS G1]
                                     │                           │
                              [✔ RECUPERADO]              [⚠️ GALE 2 REAL]
                                                                 │
                                                   ┌─────────────┴─────────────┐
                                                   ▼                           ▼
                                            [🟢 WIN G2]                 [🛑 STOP: -$${sl}]`;
  } else if (isSorosgale) {
    treeDiagram = 
`[🌌 RAÍZ] Início Ciclo (${time} • ${symbol})
  │
  ├── [🧠 ESTUDO IA] MHI Dinâmico / Padrão
  ├── [🛡️ FILTRO] Streak Shield & Time Guard
  │
  └── [🎯 GATILHO] Ordem Spot Direta (Stake: $${stake})
        │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
 [🟢 WIN SPOT] (+$${(parseFloat(stake)*0.95).toFixed(2)})                         [🔴 LOSS SPOT] (-$${stake})
        │                                                       │
 [🚀 SOROS NÍVEL 1]                                      [⚠️ GALE RECOVERY 1]
 (Stake Composta: $${(parseFloat(stake)*1.95).toFixed(2)})                                (Stake: $${(parseFloat(stake)*2.0).toFixed(2)})
        │                                                       │
 ┌──────┴──────┐                                         ┌──────┴──────┐
 ▼             ▼                                         ▼             ▼
[🟢 WIN 2]    [🔴 LOSS]                                 [🟢 WIN G1]   [🔴 LOSS G1]
 │             │                                         │             │
[🏆 META]     [🔄 RESET]                                [✔ RECOV]     [⚠️ GALE 2]
(+$${tp})                                                              │
                                                         ┌─────────────┴─────────────┐
                                                         ▼                           ▼
                                                  [🟢 WIN G2]                 [🛑 STOP: -$${sl}]`;
  } else {
    treeDiagram = 
`[🌌 RAÍZ] Início Ciclo (${time} • ${symbol})
  │
  ├── [🧠 ESTUDO IA] Leitura de Padrões & Volatilidade
  ├── [🛡️ FILTRO] Proteção Anti-Tendência
  │
  └── [🎯 GATILHO] Ordem Base (Stake: $${stake})
        │
        ┌───────────────────────────┴───────────────────────────┐
        ▼                                                       ▼
 [🟢 WIN REAL]                                           [🔴 LOSS REAL]
        │                                                       │
 [🏆 META: +$${tp}]                                       [⚠️ GALE NÍVEL 1 (${galeLevels >= 1 ? 'Ativo' : 'Off'})]
                                                                │
                                                  ┌─────────────┴─────────────┐
                                                  ▼                           ▼
                                           [🟢 WIN G1]                 [🔴 LOSS G1]
                                                  │                           │
                                           [✔ RECUPERADO]              [⚠️ GALE NÍVEL 2]
                                                                              │
                                                                ┌─────────────┴─────────────┐
                                                                ▼                           ▼
                                                         [🟢 WIN G2]                 [🛑 STOP: -$${sl}]`;
  }

  return `🌳 <b>ASTROBOT • ÁRVORE DE DECISÃO & FLUXO DE ENTRADAS</b>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🎯 <b>Missão:</b> <code>${escapeHtml(cycleName)}</code>\n` +
         `📈 <b>Ativo:</b> <code>${escapeHtml(symbol)}</code> | <b>Estratégia:</b> <code>${escapeHtml(stratName)}</code>\n` +
         `🛡️ <b>Gestão:</b> <code>${isFakegale ? '🧪 Fakegale Sniper' : isSorosgale ? '🚀 Sorosgale Turbo' : 'Martingale Tradicional'}</code>\n` +
         `💵 <b>Stake Base:</b> <code>$${stake}</code> | <b>Target:</b> <code>+$${tp}</code> / <code>-$${sl}</code>\n` +
         `⚡ <b>Status Atual:</b> <code>${escapeHtml(activeStatus)}</code>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `<pre>${treeDiagram}</pre>\n` +
         `━━━━━━━━━━━━━━━━━━━━━━\n` +
         `🤖 <i>Acompanhe o caminho neural percorrido pelo robô em tempo real.</i>`;
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

