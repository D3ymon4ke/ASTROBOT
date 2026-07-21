import React, { useState } from 'react';
import { Settings as SettingsIcon, Play, Square, AlertCircle, ChevronLeft, ChevronRight, HelpCircle, Globe, Cpu, Coins, ShieldCheck, Zap, Activity, Save, Volume2, ShieldAlert, Users } from 'lucide-react';
import { playWinSound, playLossSound, playClickSound } from '../utils/sound';

export default function Settings({
  settings,
  onChange,
  onStart,
  onStop,
  isRunning,
  connected,
  authorized,
  bestStrategy,
  collapsed,
  onToggleCollapse,
  schedulerState = false,
  onToggleScheduler = () => {},
  onSaveSettings = () => {}
}) {
  const [activeModule, setActiveModule] = useState('mercado');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showBetaFeatures, setShowBetaFeatures] = useState(
    localStorage.getItem('astrobot_beta_features') === 'true'
  );

  const handleToggleBeta = (e) => {
    const val = e.target.checked;
    setShowBetaFeatures(val);
    localStorage.setItem('astrobot_beta_features', val ? 'true' : 'false');
    window.dispatchEvent(new Event('astrobot_beta_features_changed'));
  };

  const handleSave = () => {
    onSaveSettings();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  };

  const assets = [
    { symbol: 'R_10', name: 'Volatility 10 Index' },
    { symbol: 'R_25', name: 'Volatility 25 Index' },
    { symbol: 'R_50', name: 'Volatility 50 Index' },
    { symbol: 'R_75', name: 'Volatility 75 Index' },
    { symbol: 'R_100', name: 'Volatility 100 Index' },
    { symbol: '1HZ10V', name: 'Volatility 10 (1s) Index' },
    { symbol: '1HZ25V', name: 'Volatility 25 (1s) Index' },
    { symbol: '1HZ50V', name: 'Volatility 50 (1s) Index' },
    { symbol: '1HZ75V', name: 'Volatility 75 (1s) Index' },
    { symbol: '1HZ100V', name: 'Volatility 100 (1s) Index' },
    { symbol: '1HZ200V', name: 'Volatility 200 (1s) Index' },
    { symbol: '1HZ300V', name: 'Volatility 300 (1s) Index' },
    { symbol: 'RDBEAR', name: 'Bear Market Index' },
    { symbol: 'RDBULL', name: 'Bull Market Index' },
    { symbol: 'frxEURUSD', name: 'EUR/USD' },
    { symbol: 'frxEURGBP', name: 'EUR/GBP' },
    { symbol: 'frxEURJPY', name: 'EUR/JPY' },
    { symbol: 'frxGBPUSD', name: 'GBP/USD' },
    { symbol: 'frxUSDJPY', name: 'USD/JPY' },
    { symbol: 'frxAUDUSD', name: 'AUD/USD' },
    { symbol: 'frxUSDCAD', name: 'USD/CAD' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    onChange({ ...settings, [name]: val });
  };

  const getAssetLabel = (sym) => {
    const asset = assets.find(a => a.symbol === sym);
    return asset ? asset.symbol : sym;
  };

  const getMoneyManagementLabel = (val) => {
    switch (val) {
      case 'fixed': return 'Mão Fixa';
      case 'martingale': return 'Martingale';
      case 'progressive_gale': return 'Gale Prog.';
      case 'reverse_gale': return 'Gale Inv.';
      case 'iron_hands': return 'Mãos de Ferro';
      case 'soros': return 'Soros';
      default: return 'Fixa';
    }
  };

  if (collapsed) {
    return (
      <div className="glass-panel" style={{
        padding: '0.75rem 0.5rem',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        overflow: 'hidden',
        borderRight: '1px solid var(--border-color)',
        background: '#0e0b1880',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="icon-button"
          style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid var(--border-active)',
            borderRadius: '8px',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            cursor: 'pointer',
            boxShadow: '0 0 8px rgba(139, 92, 246, 0.25)'
          }}
          title="Expandir Painel"
        >
          <ChevronRight size={20} style={{ strokeWidth: 3, color: '#ffffff' }} />
        </button>

        <SettingsIcon size={20} style={{ color: 'var(--primary)', opacity: 0.7 }} />

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          width: '100%',
          flex: 1
        }}>
          {/* Quick info badges */}
          <div style={{
            fontSize: '0.65rem',
            fontWeight: 'bold',
            padding: '4px 6px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center',
            width: '45px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'white'
          }} title={settings.symbol}>
            {settings.symbol}
          </div>

          <div style={{
            fontSize: '0.65rem',
            fontWeight: 'bold',
            padding: '4px 6px',
            borderRadius: '6px',
            background: 'var(--primary-glow)',
            border: '1px solid var(--border-active)',
            textAlign: 'center',
            width: '45px',
            color: 'var(--primary-light)'
          }}>
            {settings.granularity === '60' ? 'M1' : settings.granularity === '300' ? 'M5' : 'M15'}
          </div>

          <div style={{
            fontSize: '0.65rem',
            fontWeight: 'bold',
            padding: '4px 6px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center',
            width: '45px',
            color: 'var(--text-secondary)'
          }}>
            ${settings.stakeValue}
          </div>
        </div>

        {/* Start/Stop Button */}
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 'auto' }}>
          {!isRunning ? (
            <button
              className="success"
              onClick={onStart}
              disabled={!connected || !authorized}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
                boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)'
              }}
              title="Iniciar Bot"
            >
              <Play size={16} fill="currentColor" />
            </button>
          ) : (
            <button
              className="danger"
              onClick={onStop}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0',
                boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)'
              }}
              title="Parar Bot"
            >
              <Square size={16} fill="currentColor" />
            </button>
          )}
        </div>
      </div>
    );
  }

  const toggleModule = (moduleName) => {
    setActiveModule(activeModule === moduleName ? '' : moduleName);
  };

  return (
    <div className="glass-panel" style={{
      padding: '1.25rem 1rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      background: 'rgba(14, 11, 24, 0.65)',
      borderRight: '1px solid var(--border-color)',
      boxSizing: 'border-box'
    }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon size={18} style={{ color: 'var(--primary-light)' }} className="pulse-primary" />
          <h2 style={{ fontSize: '0.95rem', fontWeight: '800', letterSpacing: '0.5px', color: 'white' }}>MÓDULOS DE CONFIG</h2>
        </div>
        <button
          onClick={onToggleCollapse}
          className="icon-button"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Recolher Painel"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* Modules List Accordion */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', flex: 1, paddingRight: '2px' }} className="modules-scrollbar">
        
        {/* MODULE 1: MERCADO */}
        <div style={{
          background: activeModule === 'mercado' ? 'rgba(139, 92, 246, 0.06)' : 'rgba(255, 255, 255, 0.01)',
          border: activeModule === 'mercado' ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '0.75rem',
          transition: 'all 0.25s ease',
          boxShadow: activeModule === 'mercado' ? '0 4px 15px rgba(139, 92, 246, 0.1)' : 'none'
        }}>
          <div onClick={() => toggleModule('mercado')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={15} style={{ color: activeModule === 'mercado' ? 'var(--primary-light)' : '#94A3B8' }} />
              <strong style={{ fontSize: '0.78rem', color: activeModule === 'mercado' ? 'white' : '#94A3B8', fontWeight: 'bold' }}>⚙ MERCADO</strong>
            </div>
            {activeModule !== 'mercado' && (
              <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                {getAssetLabel(settings.symbol)} | {settings.granularity === '60' ? 'M1' : settings.granularity === '300' ? 'M5' : 'M15'}
              </span>
            )}
          </div>
          
          {activeModule === 'mercado' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>ATIVO DE TRADING</label>
                <select name="symbol" value={settings.symbol} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}>
                  {assets.map((asset) => (
                    <option key={asset.symbol} value={asset.symbol}>
                      {asset.name} ({asset.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>TIMEFRAME (VELA)</label>
                <select name="granularity" value={settings.granularity} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}>
                  <option value="60">1 Minuto (M1)</option>
                  <option value="300">5 Minutos (M5)</option>
                  <option value="900">15 Minutos (M15)</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* MODULE 2: IA */}
        <div style={{
          background: activeModule === 'ia' ? 'rgba(139, 92, 246, 0.06)' : 'rgba(255, 255, 255, 0.01)',
          border: activeModule === 'ia' ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '0.75rem',
          transition: 'all 0.25s ease',
          boxShadow: activeModule === 'ia' ? '0 4px 15px rgba(139, 92, 246, 0.1)' : 'none'
        }}>
          <div onClick={() => toggleModule('ia')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={15} style={{ color: activeModule === 'ia' ? 'var(--primary-light)' : '#94A3B8' }} />
              <strong style={{ fontSize: '0.78rem', color: activeModule === 'ia' ? 'white' : '#94A3B8', fontWeight: 'bold' }}>🤖 MOTOR IA</strong>
            </div>
            {activeModule !== 'ia' && (
              <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                {settings.autoPilot ? 'Piloto: ON' : 'Manual'}
              </span>
            )}
          </div>
          
          {activeModule === 'ia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'white' }}>PILOTO AUTOMÁTICO</label>
                  <span style={{ fontSize: '0.62rem', color: '#94A3B8', display: 'block' }}>Chaveia estratégias pela maior winrate</span>
                </div>
                <label className="switch">
                  <input type="checkbox" name="autoPilot" checked={settings.autoPilot} onChange={handleInputChange} disabled={isRunning} />
                  <span className="slider"></span>
                </label>
              </div>

              {settings.autoPilot && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '0.5rem', borderLeft: '2px solid var(--primary-light)' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', fontWeight: '800', color: 'white' }}>EXCLUIR PULLBACK/REVERSÃO</label>
                    <span style={{ fontSize: '0.58rem', color: '#94A3B8', display: 'block' }}>Ignora análises lentas de suporte/resistência</span>
                  </div>
                  <label className="switch">
                    <input type="checkbox" name="disableSlowStrategies" checked={settings.disableSlowStrategies || false} onChange={handleInputChange} disabled={isRunning} />
                    <span className="slider"></span>
                  </label>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>INTERVALO DE REAVALIAÇÃO</label>
                <select name="autoPilotInterval" value={settings.autoPilotInterval || '5'} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}>
                  <option value="1">A cada 1 Minuto</option>
                  <option value="2">A cada 2 Minutos</option>
                  <option value="5">A cada 5 Minutos (Recomendado)</option>
                  <option value="10">A cada 10 Minutos</option>
                </select>
              </div>

              {!settings.autoPilot && (
                <div>
                  <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>ESTRATÉGIA ATIVA MANUAL</label>
                  <select name="selectedStrategy" value={settings.selectedStrategy} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}>
                    <option value="ma_crossover">Cruzamento de Médias (9/21)</option>
                    <option value="mhi_minority">MHI Padrão (Minoria)</option>
                    <option value="mhi_majority">MHI Maioria</option>
                    <option value="twin_towers">Torres Gêmeas</option>
                    <option value="three_musketeers">Três Mosqueteiros</option>
                    <option value="padrao_23">Padrão 23</option>
                    <option value="padrao_3x1">Padrão 3x1</option>
                    <option value="padrao_impar">Padrão Ímpar</option>
                    <option value="r7">Padrão R7</option>
                    <option value="pullback">Pullback na Média (EMA 20)</option>
                    <option value="reversal">Reversão (Hammer / Shooting)</option>
                    <option value="pivot_123">Pivô de 1-2-3</option>
                    <option value="ross_hook">123 de Ross</option>
                    <option value="r10">Padrão R10</option>
                    <option value="marubozu">Marubozu</option>
                    <option value="bos_choch">BOS + ChoCH</option>
                  </select>
                </div>
              )}

              {settings.autoPilot && bestStrategy && (
                <div style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.7rem' }}>
                  <span style={{ color: '#94A3B8', display: 'block', fontSize: '0.58rem' }}>IA ESCOLHEU</span>
                  <strong style={{ color: 'var(--success)' }}>{bestStrategy.name} ({bestStrategy.winRate.toFixed(1)}% WR)</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODULE 3: GESTÃO */}
        <div style={{
          background: activeModule === 'gestao' ? 'rgba(139, 92, 246, 0.06)' : 'rgba(255, 255, 255, 0.01)',
          border: activeModule === 'gestao' ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '0.75rem',
          transition: 'all 0.25s ease',
          boxShadow: activeModule === 'gestao' ? '0 4px 15px rgba(139, 92, 246, 0.1)' : 'none'
        }}>
          <div onClick={() => toggleModule('gestao')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Coins size={15} style={{ color: activeModule === 'gestao' ? 'var(--primary-light)' : '#94A3B8' }} />
              <strong style={{ fontSize: '0.78rem', color: activeModule === 'gestao' ? 'white' : '#94A3B8', fontWeight: 'bold' }}>💰 GESTÃO BANCA</strong>
            </div>
            {activeModule !== 'gestao' && (
              <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                Entrada: ${settings.stakeValue}
              </span>
            )}
          </div>
          
          {activeModule === 'gestao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>TIPO DE ENTRADA</label>
                <select name="stakeType" value={settings.stakeType} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}>
                  <option value="fixed">Mão Fixa (Valor em USD)</option>
                  <option value="percentage">Porcentagem da Banca (%)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                  {settings.stakeType === 'fixed' ? 'VALOR DA ENTRADA ($)' : 'PORCENTAGEM DA ENTRADA (%)'}
                </label>
                <input
                  type="number"
                  name="stakeValue"
                  value={settings.stakeValue}
                  onChange={handleInputChange}
                  min={settings.stakeType === 'fixed' ? '0.35' : '0.1'}
                  step="0.01"
                  disabled={isRunning}
                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>STOP LOSS ($)</label>
                  <input
                    type="number"
                    name="stopLoss"
                    value={settings.stopLoss}
                    onChange={handleInputChange}
                    min="1"
                    step="1"
                    disabled={isRunning}
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>TAKE PROFIT ($)</label>
                  <input
                    type="number"
                    name="takeProfit"
                    value={settings.takeProfit}
                    onChange={handleInputChange}
                    min="1"
                    step="1"
                    disabled={isRunning}
                    style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODULE 4: ESTRATÉGIAS (GERENCIAMENTO FINANCEIRO) */}
        <div style={{
          background: activeModule === 'estrategias' ? 'rgba(139, 92, 246, 0.06)' : 'rgba(255, 255, 255, 0.01)',
          border: activeModule === 'estrategias' ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '0.75rem',
          transition: 'all 0.25s ease',
          boxShadow: activeModule === 'estrategias' ? '0 4px 15px rgba(139, 92, 246, 0.1)' : 'none'
        }}>
          <div onClick={() => toggleModule('estrategias')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={15} style={{ color: activeModule === 'estrategias' ? 'var(--primary-light)' : '#94A3B8' }} />
              <strong style={{ fontSize: '0.78rem', color: activeModule === 'estrategias' ? 'white' : '#94A3B8', fontWeight: 'bold' }}>📈 RECUPERAÇÃO</strong>
            </div>
            {activeModule !== 'estrategias' && (
              <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                {getMoneyManagementLabel(settings.moneyManagement)}
              </span>
            )}
          </div>
          
          {activeModule === 'estrategias' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>SISTEMA FINANCEIRO</label>
                <select 
                  name="moneyManagement" 
                  value={settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')} 
                  onChange={handleInputChange} 
                  disabled={isRunning}
                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}
                >
                  <option value="fixed">Mão Fixa (Sem Recuperação)</option>
                  <option value="martingale">Martingale Tradicional</option>
                  <option value="progressive_gale">Gale Progressivo</option>
                  <option value="reverse_gale">Gale Invertido (Anti-Martingale)</option>
                  <option value="iron_hands">Mãos de Ferro</option>
                  <option value="soros">Ciclo de Soros</option>
                </select>
              </div>

              {((settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')) !== 'fixed' && 
                (settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')) !== 'iron_hands') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {(settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')) !== 'soros' && (
                    <div>
                      <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>EXECUTAR GALE</label>
                      <select name="martingaleMode" value={settings.martingaleMode} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}>
                        <option value="next_candle">Na Próxima Vela (Imediato)</option>
                        <option value="next_signal">No Próximo Sinal</option>
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                        {(settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')) === 'soros' ? 'RETORNO (%)' : 'MULTIPLICADOR'}
                      </label>
                      <input
                        type="number"
                        name="martingaleMultiplier"
                        value={settings.martingaleMultiplier}
                        onChange={handleInputChange}
                        min="1.0"
                        step="0.1"
                        disabled={isRunning}
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>
                        {(settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')) === 'soros' ? 'ESTÁGIOS' : 'NÍVEIS MÁX.'}
                      </label>
                      <input
                        type="number"
                        name="martingaleMaxLevels"
                        value={settings.martingaleMaxLevels}
                        onChange={handleInputChange}
                        min="1"
                        max="10"
                        step="1"
                        disabled={isRunning}
                        style={{ fontSize: '0.78rem', padding: '0.4rem 0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODULE 5: AUTOMAÇÃO */}
        <div style={{
          background: activeModule === 'automacao' ? 'rgba(139, 92, 246, 0.06)' : 'rgba(255, 255, 255, 0.01)',
          border: activeModule === 'automacao' ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '0.75rem',
          transition: 'all 0.25s ease',
          boxShadow: activeModule === 'automacao' ? '0 4px 15px rgba(139, 92, 246, 0.1)' : 'none'
        }}>
          <div onClick={() => toggleModule('automacao')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={15} style={{ color: activeModule === 'automacao' ? 'var(--primary-light)' : '#94A3B8' }} />
              <strong style={{ fontSize: '0.78rem', color: activeModule === 'automacao' ? 'white' : '#94A3B8', fontWeight: 'bold' }}>⚡ AUTOMAÇÃO</strong>
            </div>
            {activeModule !== 'automacao' && (
              <span style={{ fontSize: '0.7rem', color: schedulerState ? 'var(--success)' : '#94A3B8', fontWeight: 'bold', background: schedulerState ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>
                {schedulerState ? 'ATIVO' : 'DESATIVADO'}
              </span>
            )}
          </div>
          
          {activeModule === 'automacao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'white' }}>AGENDADOR DE CICLOS</label>
                  <span style={{ fontSize: '0.62rem', color: '#94A3B8', display: 'block' }}>Liga/Desliga robô em horários programados</span>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={schedulerState} onChange={(e) => onToggleScheduler(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
              <div style={{ padding: '0.5rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '6px', fontSize: '0.68rem', color: '#94A3B8', lineHeight: '1.4' }}>
                ⚠️ Programe e adicione os múltiplos horários na aba <strong>Agendador & Ciclos (Automação)</strong> localizada no rodapé central.
              </div>
            </div>
          )}
        </div>

        {/* MODULE 6: SEGURANÇA */}
        <div style={{
          background: activeModule === 'seguranca' ? 'rgba(139, 92, 246, 0.06)' : 'rgba(255, 255, 255, 0.01)',
          border: activeModule === 'seguranca' ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '0.75rem',
          transition: 'all 0.25s ease',
          boxShadow: activeModule === 'seguranca' ? '0 4px 15px rgba(139, 92, 246, 0.1)' : 'none'
        }}>
          <div onClick={() => toggleModule('seguranca')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={15} style={{ color: activeModule === 'seguranca' ? 'var(--primary-light)' : '#94A3B8' }} />
              <strong style={{ fontSize: '0.78rem', color: activeModule === 'seguranca' ? 'white' : '#94A3B8', fontWeight: 'bold' }}>🛡 SEGURANÇA</strong>
            </div>
            {activeModule !== 'seguranca' && (
              <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                {settings.enableMasterCandleSecondary ? 'Vela Mestra' : 'Normal'}
              </span>
            )}
          </div>
          
          {activeModule === 'seguranca' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'white' }}>VELA MESTRA SECUNDÁRIA</label>
                  <span style={{ fontSize: '0.62rem', color: '#94A3B8', display: 'block' }}>Opera rompimentos de vela mestra de forma secundária</span>
                </div>
                <label className="switch" style={{ flexShrink: 0 }}>
                  <input type="checkbox" name="enableMasterCandleSecondary" checked={settings.enableMasterCandleSecondary || false} onChange={handleInputChange} disabled={isRunning} />
                  <span className="slider"></span>
                </label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.6rem', background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '6px', fontSize: '0.68rem', color: '#38bdf8' }}>
                <Activity size={14} /> Fator de proteção contra delay da corretora ativo por padrão.
              </div>
            </div>
          )}
        </div>

        {/* MODULE 7: SONS */}
        <div style={{
          background: activeModule === 'sons' ? 'rgba(139, 92, 246, 0.06)' : 'rgba(255, 255, 255, 0.01)',
          border: activeModule === 'sons' ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '0.75rem',
          transition: 'all 0.25s ease',
          boxShadow: activeModule === 'sons' ? '0 4px 15px rgba(139, 92, 246, 0.1)' : 'none'
        }}>
          <div onClick={() => toggleModule('sons')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Volume2 size={15} style={{ color: activeModule === 'sons' ? 'var(--primary-light)' : '#94A3B8' }} />
              <strong style={{ fontSize: '0.78rem', color: activeModule === 'sons' ? 'white' : '#94A3B8', fontWeight: 'bold' }}>🔊 ALERTA & SONS</strong>
            </div>
            {activeModule !== 'sons' && (
              <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'bold', background: 'rgba(139, 92, 246, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                {settings.soundEnabled !== false ? 'Ativos' : 'Mudos'}
              </span>
            )}
          </div>
          
          {activeModule === 'sons' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'white' }}>ALERTAS SONOROS</label>
                  <span style={{ fontSize: '0.62rem', color: '#94A3B8', display: 'block' }}>Habilitar avisos sonoros de WIN e LOSS</span>
                </div>
                <label className="switch" style={{ flexShrink: 0 }}>
                  <input 
                    type="checkbox" 
                    name="soundEnabled" 
                    checked={settings.soundEnabled !== false} 
                    onChange={handleInputChange} 
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {settings.soundEnabled !== false && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.65rem' }}>
                  <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block' }}>TESTAR PREVIEW DE SONS</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => {
                        playWinSound();
                      }}
                      style={{
                        flex: 1,
                        padding: '0.4rem 0.5rem',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        color: '#10b981',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      🔊 Testar Win
                    </button>
                    <button
                      onClick={() => {
                        playLossSound();
                      }}
                      style={{
                        flex: 1,
                        padding: '0.4rem 0.5rem',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        color: '#ef4444',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      🔊 Testar Loss
                    </button>
                    <button
                      onClick={() => {
                        playClickSound();
                      }}
                      style={{
                        flex: 1,
                        padding: '0.4rem 0.5rem',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        color: '#3b82f6',
                        background: 'rgba(59, 130, 246, 0.08)',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      🔊 Testar Click
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODULE 8: BETA EXPERIMENTAL */}
        <div style={{
          background: activeModule === 'beta' ? 'rgba(168, 85, 247, 0.06)' : 'rgba(255, 255, 255, 0.01)',
          border: activeModule === 'beta' ? '1px solid rgba(168, 85, 247, 0.35)' : '1px solid rgba(255, 255, 255, 0.03)',
          borderRadius: '12px',
          padding: '0.75rem',
          transition: 'all 0.25s ease',
          boxShadow: activeModule === 'beta' ? '0 4px 15px rgba(168, 85, 247, 0.1)' : 'none'
        }}>
          <div onClick={() => toggleModule('beta')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={15} style={{ color: activeModule === 'beta' ? '#a855f7' : '#94A3B8' }} />
              <strong style={{ fontSize: '0.78rem', color: activeModule === 'beta' ? 'white' : '#94A3B8', fontWeight: 'bold' }}>🧪 EXPERIMENTAL (BETA)</strong>
            </div>
            {activeModule !== 'beta' && (
              <span style={{ fontSize: '0.7rem', color: '#a855f7', fontWeight: 'bold', background: 'rgba(168, 85, 247, 0.1)', padding: '2px 8px', borderRadius: '12px' }}>
                {showBetaFeatures ? 'Ativo' : 'Inativo'}
              </span>
            )}
          </div>
          
          {activeModule === 'beta' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'white' }}>MÓDULOS BETA</label>
                  <span style={{ fontSize: '0.62rem', color: '#94A3B8', display: 'block' }}>Habilitar Feed da Comunidade e Rankings Sociais</span>
                </div>
                <label className="switch" style={{ flexShrink: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={showBetaFeatures} 
                    onChange={handleToggleBeta} 
                  />
                  <span className="slider"></span>
                </label>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.4rem 0.6rem', background: 'rgba(168, 85, 247, 0.06)', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: '6px', fontSize: '0.68rem', color: '#c084fc' }}>
                <Users size={14} /> Ativar novos recursos experimentais de interação social do ASTROBOT.
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Save Settings Button */}
      <div style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
        <button
          onClick={handleSave}
          disabled={isRunning}
          style={{
            width: '100%',
            padding: '0.55rem',
            fontWeight: 'bold',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            background: saveSuccess ? 'rgba(34, 197, 94, 0.15)' : 'rgba(139, 92, 246, 0.12)',
            border: saveSuccess ? '1px solid var(--success)' : '1px solid rgba(139, 92, 246, 0.4)',
            color: saveSuccess ? 'var(--success)' : 'white',
            borderRadius: '6px',
            cursor: isRunning ? 'not-allowed' : 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: saveSuccess ? '0 0 10px rgba(34, 197, 94, 0.2)' : 'none'
          }}
        >
          {saveSuccess ? (
            <>
              <ShieldCheck size={14} /> CONFIGURAÇÕES SALVAS!
            </>
          ) : (
            <>
              <Save size={14} style={{ color: 'var(--primary-light)' }} /> SALVAR CONFIGURAÇÕES
            </>
          )}
        </button>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem', borderTop: '1px solid var(--border-color)' }}>
        {!isRunning ? (
          <button
            className="success"
            onClick={onStart}
            disabled={!connected || !authorized}
            style={{ width: '100%', padding: '0.65rem', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 0 10px rgba(34, 197, 94, 0.15)' }}
          >
            <Play size={15} fill="currentColor" /> INICIAR BOT
          </button>
        ) : (
          <button
            className="danger"
            onClick={onStop}
            style={{ width: '100%', padding: '0.65rem', fontWeight: 'bold', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 0 10px rgba(239, 68, 68, 0.15)' }}
          >
            <Square size={15} fill="currentColor" /> PARAR OPERAÇÕES
          </button>
        )}

        {(!connected || !authorized) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center', color: 'var(--warning)' }}>
            <AlertCircle size={12} />
            <span style={{ fontSize: '0.68rem', fontWeight: 'bold' }}>Requer login na Deriv</span>
          </div>
        )}
      </div>
    </div>
  );
}
