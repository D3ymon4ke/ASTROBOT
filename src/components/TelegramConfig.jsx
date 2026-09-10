import React, { useState, useEffect, useRef } from 'react';
import { Save } from 'lucide-react';
import { sendTelegramMessage } from '../utils/telegram';
import { derivAPI } from '../deriv/DerivAPI';
import './TelegramConfig.css';

export default function TelegramConfig({
  settings,
  onSaveTelegramSettings,
  userEmail
}) {
  const DEFAULT_CONFIG = {
    enabled: false,
    token: '',
    chatId: '',
    notifications: {
      cycle_started: true,
      cycle_finished: true,
      scanner_started: true,
      opportunity_found: true,
      order_executed: true,
      win: true,
      loss: true,
      g1: true,
      g2: true,
      take_profit: true,
      stop_loss: true,
      stop_gain: true,
      bot_started: true,
      bot_stopped: true,
      deriv_connected: true,
      deriv_disconnected: true,
      ia_started: true,
      ia_stopped: true,
      daily_summary: true,
      weekly_summary: true,
      monthly_summary: true,
      system_alerts: true,
      critical_errors: true,
      recall_triggered: true,
      recall_win: true,
      recall_loss: true
    }
  };

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('astrobot_telegram_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved); return { ...DEFAULT_CONFIG, ...parsed, notifications: { ...DEFAULT_CONFIG.notifications, ...parsed.notifications } };
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_CONFIG;
  });

  const dirty = useRef(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [useOfficial, setUseOfficial] = useState(!config.token);

  useEffect(() => {
    if (settings && !dirty.current) {
      setConfig(prev => {
        const updated = { ...prev };
        let changed = false;
        const mapping={win:'Win',loss:'Loss',daily_summary:'DailySummary',bot_started:'BotStarted',bot_stopped:'BotStopped',take_profit:'TakeProfit',stop_loss:'StopLoss',opportunity_found:'Opportunity',order_executed:'Order',cycle_started:'Cycle'};
        updated.notifications={...prev.notifications};
        for(const [key,suffix] of Object.entries(mapping)){const value=settings['telegramNotif'+suffix];if(typeof value==='boolean' && value!==prev.notifications[key]){updated.notifications[key]=value;changed=true;}}

        
        if (settings.telegramEnabled !== undefined && settings.telegramEnabled !== prev.enabled) {
          updated.enabled = settings.telegramEnabled;
          changed = true;
        }
        if (settings.telegramToken !== undefined && settings.telegramToken !== prev.token) {
          updated.token = settings.telegramToken;
          changed = true;
        }
        if (settings.telegramChatId !== undefined && String(settings.telegramChatId) !== String(prev.chatId)) {
          updated.chatId = String(settings.telegramChatId);
          changed = true;
        }
        
        if (changed) {
          localStorage.setItem('astrobot_telegram_config', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  }, [settings]);

  useEffect(() => {
    // If the token changes or is updated, adjust the tab selection automatically
    setUseOfficial(!config.token);
  }, [config.token]);

  const getTelegramLink = () => {
    if (!userEmail) return '#';
    try {
      const base64 = btoa(userEmail.toLowerCase().trim())
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, ''); // Base64url safe
      return `https://t.me/ASTROOFICIAL_BOT?start=${base64}`;
    } catch (e) {
      return '#';
    }
  };

  const handleDisconnectOfficial = () => {
    const updated = { ...config, chatId: '', token: '' };
    setConfig(updated);
    localStorage.setItem('astrobot_telegram_config', JSON.stringify(updated));
    if (onSaveTelegramSettings) {
      onSaveTelegramSettings(updated);
    }
  };

  const handleToggleActive = () => {
    dirty.current = true;
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleInputChange = (e) => {
    dirty.current = true;
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationToggle = (key) => {
    dirty.current = true;
    setConfig(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
  };

  const handleSave = () => {
    dirty.current = false;
    localStorage.setItem('astrobot_telegram_config', JSON.stringify(config));
    
    // Push Telegram settings to VPS backend (mapped to the field names UserSession.js uses)
    derivAPI.updateSettings({
      telegramEnabled: config.enabled,
      telegramToken: config.token,
      telegramChatId: config.chatId,
      telegramNotifWin: config.notifications?.win ?? true,
      telegramNotifLoss: config.notifications?.loss ?? true,
      telegramNotifDailySummary: config.notifications?.daily_summary ?? true,
      telegramNotifBotStarted: config.notifications?.bot_started ?? true,
      telegramNotifBotStopped: config.notifications?.bot_stopped ?? true,
      telegramNotifTakeProfit: config.notifications?.take_profit ?? true,
      telegramNotifStopLoss: config.notifications?.stop_loss ?? true,
      telegramNotifOpportunity: config.notifications?.opportunity_found ?? true,
      telegramNotifOrder: config.notifications?.order_executed ?? true,
      telegramNotifCycle: config.notifications?.cycle_started ?? true,
    });

    // Register the VPS Telegram webhook so commands from Telegram go directly to the VPS
    if (config.enabled && config.token && userEmail) {
      const VPS_URL = 'https://187-127-40-228.sslip.io';
      const webhookUrl = `${VPS_URL}/api/telegram-webhook?email=${encodeURIComponent(userEmail)}`;
      fetch(`https://api.telegram.org/bot${config.token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      })
        .then(r => r.json())
        .then(d => {
          if (d.ok) {
            console.log('[Telegram] Webhook registrado no VPS:', webhookUrl);
          } else {
            console.error('[Telegram] Falha ao registrar webhook:', d.description);
          }
        })
        .catch(e => console.error('[Telegram] Erro ao registrar webhook:', e));
    }

    if (onSaveTelegramSettings) {
      onSaveTelegramSettings(config);
    }

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  };

  const handleTestConnection = async () => {
    if (!config.token || !config.chatId) {
      setTestResult({ success: false, message: 'Informe o Token e o Chat ID para testar.' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const testText = `⚡ <b>ASTROBOT - CANAL DE CONTROLE</b>\n` +
                     `━━━━━━━━━━━━━━━━━━━━━━\n` +
                     `Conexão estabelecida com sucesso!\n\n` +
                     `<b>Dispositivo:</b> <code>Remoto (Vercel/Desktop)</code>\n` +
                     `<b>Status:</b> 🟩 <code>Ativo</code>\n` +
                     `━━━━━━━━━━━━━━━━━━━━━━\n` +
                     `🤖 <i>Use os botões de menu do Telegram para iniciar/pausar operações.</i>`;

    const res = await sendTelegramMessage(config.token, config.chatId, testText, true);
    setTesting(false);
    if (res.success) {
      setTestResult({ success: true, message: 'Mensagem de teste enviada! Verifique o Telegram.' });
    } else {
      setTestResult({ success: false, message: `Erro: ${res.error}` });
    }
  };

  // Connection Status badge details
  const getStatusDetails = () => {
    if (!config.enabled) {
      return { label: 'DESATIVADO', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.3)' };
    }
    const isConfigured = useOfficial ? !!config.chatId : (!!config.token && !!config.chatId);
    if (!isConfigured) {
      return { label: 'AGUARDANDO CONFIGURAÇÃO', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' };
    }
    return { label: 'CONFIGURADO', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' };
  };

  const status = getStatusDetails();

  const choices = [['win','Resultados positivos'],['loss','Resultados negativos'],['daily_summary','Resumo diário'],['bot_started','Sessão iniciada'],['bot_stopped','Sessão pausada'],['take_profit','Meta atingida'],['stop_loss','Limite de perda'],['opportunity_found','Sinais identificados'],['order_executed','Ordens enviadas'],['cycle_started','Eventos das missões']];
  return <div className="telegram-workspace">
    <section className="tg-status"><div><span className="tg-eyebrow">CANAL DE OPERAÇÕES</span><h3>Notificações com contexto.</h3><p>Conexão, resultados e eventos da sessão em um único canal.</p></div><label className="tg-toggle"><input type="checkbox" checked={config.enabled} onChange={handleToggleActive}/>Ativar notificações</label><span className="tg-badge">{status.label}</span></section>
    <div className="tg-columns"><section className="tg-card"><h3>Conectar ao Telegram</h3><div className="tg-tabs"><button aria-pressed={useOfficial} onClick={()=>{dirty.current=true;setUseOfficial(true);setConfig(p=>({...p,token:''}));}}>Bot oficial</button><button aria-pressed={!useOfficial} onClick={()=>{dirty.current=true;setUseOfficial(false);}}>Bot próprio</button></div>
      {useOfficial ? <><p>Abra o bot oficial e conclua a vinculação da conta. O Chat ID recebido identifica o destino dos avisos.</p><a className="tg-button" href={getTelegramLink()} target="_blank" rel="noreferrer">Abrir bot oficial ↗</a>{config.chatId && <button className="tg-button" onClick={handleDisconnectOfficial}>Desvincular canal</button>}</> : <><p>Use as credenciais do seu bot. O token fica oculto neste formulário.</p><label>Token do bot<input type="password" autoComplete="off" name="token" value={config.token} onChange={handleInputChange} placeholder="Token fornecido pelo BotFather" /></label></>}
      <label>Chat ID<input name="chatId" value={config.chatId} onChange={handleInputChange} placeholder="Identificador do chat ou grupo" /></label><p className="tg-note">“Configurado” indica que os campos necessários estão preenchidos; não comprova entrega de mensagens.</p>
      {!useOfficial && <button className="tg-button" disabled={testing || !config.token || !config.chatId} onClick={handleTestConnection}>{testing?'Enviando…':'Enviar mensagem de teste'}</button>}{testResult && <p role="status">{testResult.message}</p>}
    </section><section className="tg-card"><h3>Prévia de mensagem</h3><p>Exemplo ilustrativo de um resultado da sessão.</p><div className="tg-preview"><b>ASTROBOT · Resultado da sessão</b><span>Resultado líquido: +USD 0,31</span><span>Saldo informado: USD 100,31</span><small>Contrato liquidado · agenda / manual</small></div><h3>Controle remoto</h3><p>Os comandos existentes continuam disponíveis no bot. Iniciar uma sessão pelo Telegram pode gerar compras conforme a configuração da conta.</p><p className="tg-note">Os avisos abaixo se referem à sessão e às missões. Observações do Trader Contínuo ficam no laboratório.</p></section></div>
    <section className="tg-card"><h3>Escolha o que receber</h3><p>As alterações são aplicadas ao salvar. Resultados, ordens e sinais são eventos distintos.</p><div className="tg-preferences">{choices.map(([key,label])=><label key={key}><input type="checkbox" checked={config.notifications[key] ?? true} onChange={()=>handleNotificationToggle(key)}/>{label}</label>)}</div></section>
    <footer className="tg-footer"><p role="status">{saveSuccess?'Configuração salva e enviada para sincronização.':'Salve para aplicar as alterações ao canal.'}</p><button className="tg-button tg-primary" onClick={handleSave}><Save size={16}/>Salvar configurações</button></footer>
  </div>;
}
