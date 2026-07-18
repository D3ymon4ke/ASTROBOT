import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, AlertCircle, HelpCircle, Save, Bell, Shield, TrendingUp, Info } from 'lucide-react';
import { sendTelegramMessage } from '../utils/telegram';

export default function TelegramConfig({
  settings,
  onSaveTelegramSettings
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
    }
  };

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('astrobot_telegram_config');
    if (saved) {
      try {
        return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
      } catch (e) {
        // ignore
      }
    }
    return DEFAULT_CONFIG;
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // { success: boolean, message: string }
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleToggleActive = () => {
    setConfig(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleNotificationToggle = (key) => {
    setConfig(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
  };

  const handleSave = () => {
    localStorage.setItem('astrobot_telegram_config', JSON.stringify(config));
    
    // Register the Vercel webhook automatically on Telegram if config is enabled
    if (config.enabled && config.token) {
      const isLocalOrElectron = window.location.hostname === 'localhost' || 
                                window.location.hostname === '127.0.0.1' || 
                                window.location.protocol === 'file:' ||
                                (window.process && window.process.type === 'renderer');
      const baseDomain = isLocalOrElectron ? 'https://astrobot-seven.vercel.app' : window.location.origin;
      const webhookUrl = `${baseDomain}/api/telegram-webhook`;
      fetch(`https://api.telegram.org/bot${config.token}/setWebhook?url=${encodeURIComponent(webhookUrl)}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.ok) {
            console.log("Telegram webhook registered successfully!");
          } else {
            console.error("Failed to register Telegram webhook:", resData.description);
          }
        })
        .catch(err => console.error("Error setting webhook:", err));
    }
    
    // Send to Electron main process if available
    const isElectron = window && window.process && window.process.type === 'renderer';
    if (isElectron) {
      try {
        const { ipcRenderer } = window.require('electron');
        ipcRenderer.send('update-telegram-config', config);
      } catch (err) {
        console.error('Failed to notify Electron main process:', err);
      }
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
    if (!config.token || !config.chatId) {
      return { label: 'AGUARDANDO CONFIGURAÇÃO', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.3)' };
    }
    return { label: 'INTEGRAÇÃO ATIVA (24H)', color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)', border: 'rgba(16, 185, 129, 0.3)' };
  };

  const status = getStatusDetails();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Banner Status */}
      <div className="glass-panel" style={{
        padding: '1.25rem',
        background: 'rgba(14, 11, 24, 0.6)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        borderRadius: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.1)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3b82f6'
          }}>
            <Send size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, color: 'white' }}>INTEGRAÇÃO TELEGRAM REMOTE</h2>
            <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Monitore e comande o robô pelo celular mesmo em segundo plano</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '0.65rem',
            fontWeight: '900',
            padding: '4px 10px',
            borderRadius: '20px',
            background: status.bg,
            border: `1px solid ${status.border}`,
            color: status.color,
            letterSpacing: '0.5px'
          }}>
            {status.label}
          </span>
          <label className="switch">
            <input type="checkbox" checked={config.enabled} onChange={handleToggleActive} />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.25rem' }} className="planning-grid">
        
        {/* Left Column: API Settings & Notification Toggles */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Credentials Card */}
          <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Shield size={14} style={{ color: 'var(--primary-light)' }} /> DADOS DE CONEXÃO DO BOT
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>TELEGRAM BOT TOKEN</label>
                <input
                  type="password"
                  name="token"
                  value={config.token}
                  onChange={handleInputChange}
                  placeholder="Ex: 123456789:ABCdefGhIJKlmNoPQ..."
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.55rem',
                    background: '#09090f',
                    color: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    width: '100%'
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '6px', letterSpacing: '0.5px' }}>SEU TELEGRAM CHAT ID</label>
                <input
                  type="text"
                  name="chatId"
                  value={config.chatId}
                  onChange={handleInputChange}
                  placeholder="Ex: 987654321"
                  style={{
                    fontSize: '0.78rem',
                    padding: '0.55rem',
                    background: '#09090f',
                    color: 'white',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    width: '100%'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.25rem', gap: '10px' }}>
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="action-button-glow"
                style={{
                  padding: '0.55rem 1rem',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  color: 'white',
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {testing ? 'Testando...' : 'Testar Conexão'}
              </button>

              <button
                onClick={handleSave}
                style={{
                  padding: '0.55rem 1.25rem',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  color: 'white',
                  background: saveSuccess ? 'rgba(16, 185, 129, 0.15)' : 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                  border: saveSuccess ? '1px solid var(--success)' : 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: saveSuccess ? 'none' : '0 0 12px rgba(139, 92, 246, 0.3)',
                  transition: 'all 0.25s ease'
                }}
              >
                <Save size={13} /> {saveSuccess ? 'Salvo!' : 'Salvar Dados'}
              </button>
            </div>

            {testResult && (
              <div style={{
                marginTop: '1rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: testResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: testResult.success ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                color: testResult.success ? '#10b981' : '#ef4444'
              }}>
                {testResult.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                {testResult.message}
              </div>
            )}
          </div>

          {/* Central de Notificações Checklist */}
          <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Bell size={14} style={{ color: 'var(--primary-light)' }} /> CENTRAL DE NOTIFICAÇÕES SELETIVA
            </h3>

            {/* Config Sections */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              
              {/* Group 1: Trading & Signals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--primary-light)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>📊 Operações & Sinais</span>
                
                {[
                  { key: 'opportunity_found', label: 'Entrada encontrada' },
                  { key: 'order_executed', label: 'Ordem executada' },
                  { key: 'win', label: 'Operação WIN' },
                  { key: 'loss', label: 'Operação LOSS' },
                  { key: 'g1', label: 'Martingale Nível G1' },
                  { key: 'g2', label: 'Martingale Nível G2' }
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                    <span style={{ color: '#cbd5e1' }}>{item.label}</span>
                    <label className="switch scale-switch">
                      <input type="checkbox" checked={config.notifications[item.key]} onChange={() => handleNotificationToggle(item.key)} />
                      <span className="slider"></span>
                    </label>
                  </div>
                ))}
              </div>

              {/* Group 2: Cycles & Engine status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '900', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>⚙️ Automação & IA</span>
                
                {[
                  { key: 'cycle_started', label: 'Ciclo iniciado (Scheduler)' },
                  { key: 'cycle_finished', label: 'Ciclo finalizado (Scheduler)' },
                  { key: 'bot_started', label: 'Bot iniciado' },
                  { key: 'bot_stopped', label: 'Bot desligado' },
                  { key: 'ia_started', label: 'Scanner/IA iniciada' },
                  { key: 'ia_stopped', label: 'Scanner/IA parada' }
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                    <span style={{ color: '#cbd5e1' }}>{item.label}</span>
                    <label className="switch scale-switch">
                      <input type="checkbox" checked={config.notifications[item.key]} onChange={() => handleNotificationToggle(item.key)} />
                      <span className="slider"></span>
                    </label>
                  </div>
                ))}
              </div>

              {/* Group 3: Financial & Targets */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.85rem' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '900', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>🏆 Alvos de Segurança</span>
                
                {[
                  { key: 'take_profit', label: 'Meta diária atingida' },
                  { key: 'stop_loss', label: 'Stop Loss atingido' },
                  { key: 'stop_gain', label: 'Stop Gain atingido' },
                  { key: 'deriv_connected', label: 'Deriv conectada' },
                  { key: 'deriv_disconnected', label: 'Deriv desconectada' }
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                    <span style={{ color: '#cbd5e1' }}>{item.label}</span>
                    <label className="switch scale-switch">
                      <input type="checkbox" checked={config.notifications[item.key]} onChange={() => handleNotificationToggle(item.key)} />
                      <span className="slider"></span>
                    </label>
                  </div>
                ))}
              </div>

              {/* Group 4: Summaries & Critical Alerts */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '0.85rem' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '900', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>⚠️ Alertas e Resumos</span>
                
                {[
                  { key: 'daily_summary', label: 'Resumo Diário Automático' },
                  { key: 'weekly_summary', label: 'Resumo Semanal' },
                  { key: 'monthly_summary', label: 'Resumo Mensal' },
                  { key: 'system_alerts', label: 'Alertas do sistema' },
                  { key: 'critical_errors', label: 'Erros críticos de saldo' }
                ].map(item => (
                  <div key={item.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                    <span style={{ color: '#cbd5e1' }}>{item.label}</span>
                    <label className="switch scale-switch">
                      <input type="checkbox" checked={config.notifications[item.key]} onChange={() => handleNotificationToggle(item.key)} />
                      <span className="slider"></span>
                    </label>
                  </div>
                ))}
              </div>

            </div>
          </div>

        </div>

        {/* Right Column: Instructions & Commands Guide */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Quick Guide */}
          <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px', fontSize: '0.72rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'white', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} style={{ color: 'var(--primary-light)' }} /> COMO CONFIGURAR?
            </h3>
            <ol style={{ paddingLeft: '1.1rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px', margin: 0 }}>
              <li>Abra o Telegram e pesquise por <code>@BotFather</code>.</li>
              <li>Envie <code>/newbot</code> e siga as instruções para criar seu bot e obter o <b>Token</b>.</li>
              <li>Inicie uma conversa com o seu bot recém-criado clicando no link gerado.</li>
              <li>Para descobrir seu <b>Chat ID</b>, pesquise por <code>@userinfobot</code> no Telegram e envie qualquer mensagem. Ele responderá com o ID numérico.</li>
              <li>Cole as credenciais aqui, salve e clique em <b>Testar Conexão</b>!</li>
            </ol>
          </div>

          {/* Interactive Keyboard & Commands Guide */}
          <div className="glass-panel" style={{ padding: '1.25rem', background: 'rgba(14, 11, 24, 0.5)', borderRadius: '16px', fontSize: '0.72rem' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: '800', color: 'white', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TrendingUp size={14} style={{ color: 'var(--primary-light)' }} /> BOTÕES DO TELEGRAM
            </h3>
            <span style={{ color: '#94A3B8', display: 'block', marginBottom: '0.75rem', fontSize: '0.65rem' }}>Ao receber qualquer mensagem, o bot disponibilizará um menu de acesso rápido no seu celular:</span>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              background: '#09090f',
              padding: '8px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.03)',
              fontFamily: 'var(--font-mono)'
            }}>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '4px', textAlign: 'center', color: '#10b981' }}>▶ Iniciar Bot</div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '4px', textAlign: 'center', color: '#f59e0b' }}>⏸ Pausar</div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '4px', textAlign: 'center', color: '#ef4444' }}>⛔ Parar</div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '4px', textAlign: 'center', color: 'white' }}>📈 Relatório</div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '4px', textAlign: 'center', color: 'white' }}>📊 Scanner</div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '4px', textAlign: 'center', color: 'white' }}>💰 Saldo</div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '4px', textAlign: 'center', color: 'white' }}>📅 Ciclos</div>
              <div style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 6px', borderRadius: '4px', textAlign: 'center', color: '#8b5cf6' }}>⚙ Config</div>
            </div>

            <span style={{ color: '#94A3B8', display: 'block', marginTop: '1rem', marginBottom: '0.5rem', fontSize: '0.65rem' }}>Lista de comandos disponíveis por texto:</span>
            <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }} className="modules-scrollbar">
              {[
                { cmd: '/status', desc: 'Verifica status geral' },
                { cmd: '/startbot', desc: 'Inicia operação do bot' },
                { cmd: '/stopbot', desc: 'Pára operação do bot' },
                { cmd: '/pause', desc: 'Pausa as operações' },
                { cmd: '/resume', desc: 'Retoma do ponto pausado' },
                { cmd: '/saldo', desc: 'Consulta saldo em dólares' },
                { cmd: '/lucro', desc: 'Retorna placar e lucros' },
                { cmd: '/scanner', desc: 'Sinais ativos dos ativos' },
                { cmd: '/ciclos', desc: 'Verifica ciclos do Scheduler' },
                { cmd: '/estrategias', desc: 'Assertividade do catálogo' },
                { cmd: '/relatorio', desc: 'Gera relatório completo' },
                { cmd: '/help', desc: 'Lista os comandos' }
              ].map(c => (
                <div key={c.cmd} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem' }}>
                  <code style={{ color: 'var(--primary-light)' }}>{c.cmd}</code>
                  <span style={{ color: 'var(--text-muted)' }}>{c.desc}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
