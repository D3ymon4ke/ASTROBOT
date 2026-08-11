import React, { useState } from 'react';
import {
  Settings as SettingsIcon, Play, Square, AlertCircle, ChevronLeft, ChevronRight,
  HelpCircle, Globe, Cpu, Coins, ShieldCheck, Zap, Activity, Save, Volume2,
  ShieldAlert, Users, Rocket, Target, BarChart3, FlaskConical, Sparkles, AlertTriangle
} from 'lucide-react';
import Switch from './Switch';
import SorosgaleSimulator from './SorosgaleSimulator';

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
  onSaveSettings = () => {},
  trades = []
}) {
  const [activeTab, setActiveTab] = useState('mercado');
  const [saveSuccess, setSaveSuccess] = useState(false);

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
      case 'sorosgale': return '🚀 Sorosgale';
      case 'soros': return 'Soros';
      case 'martingale': return 'Martingale Tradicional';
      case 'progressive_gale': return 'Gale Prog.';
      case 'reverse_gale': return 'Gale Inv.';
      case 'iron_hands': return 'Mãos de Ferro';
      default: return 'Fixa';
    }
  };

  // COLLAPSED VIEW FOR SIDEBAR PRESERVED & ENHANCED
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

  // TABS DEFINITION FOR REDESIGNED SETTINGS UI
  const navTabs = [
    { id: 'mercado', label: 'Mercado', icon: Globe },
    { id: 'ia', label: 'Motor IA', icon: Cpu },
    { id: 'sorosgale', label: 'Sorosgale & Gestão', icon: Rocket, badge: 'NOVO' },
    { id: 'micrometas', label: 'Micro-Metas', icon: Target },
    { id: 'seguranca', label: 'Segurança & Trava', icon: ShieldCheck },
    { id: 'recall', label: 'Shadow Account', icon: Users },
    { id: 'laboratorio', label: 'Laboratório Estudos', icon: FlaskConical, badge: 'TESTE' }
  ];

  return (
    <div className="glass-panel" style={{
      padding: '1.25rem 1rem',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      background: 'rgba(14, 11, 24, 0.75)',
      borderRight: '1px solid var(--border-color)',
      boxSizing: 'border-box'
    }}>
      {/* Title & Save Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <SettingsIcon size={18} style={{ color: 'var(--primary-light)' }} className="pulse-primary" />
          <div>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', letterSpacing: '0.5px', color: 'white', margin: 0 }}>
              PAINEL DE CONFIGURAÇÕES & IA
            </h2>
            <span style={{ fontSize: '0.62rem', color: '#94A3B8' }}>ASTROBOT v3.5 • Motor de Alta Precisão</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={handleSave}
            className="success"
            style={{
              padding: '6px 12px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Save size={14} /> {saveSuccess ? 'Salvo! ✓' : 'Salvar'}
          </button>
          
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
      </div>

      {/* Navigation Tab Bar */}
      <div style={{
        display: 'flex',
        gap: '0.35rem',
        overflowX: 'auto',
        paddingBottom: '4px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }} className="modules-scrollbar">
        {navTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: isActive ? 'rgba(139, 92, 246, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                border: isActive ? '1px solid rgba(139, 92, 246, 0.4)' : '1px solid rgba(255, 255, 255, 0.04)',
                color: isActive ? 'white' : '#94A3B8',
                borderRadius: '8px',
                padding: '6px 10px',
                fontSize: '0.72rem',
                fontWeight: isActive ? '800' : '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
            >
              <Icon size={14} style={{ color: isActive ? 'var(--primary-light)' : '#94A3B8' }} />
              {tab.label}
              {tab.badge && (
                <span style={{
                  fontSize: '0.52rem',
                  fontWeight: '800',
                  background: tab.badge === 'NOVO' ? '#10B981' : '#3B82F6',
                  color: 'white',
                  padding: '1px 4px',
                  borderRadius: '4px',
                  lineHeight: 1
                }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main Tab Content View */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }} className="modules-scrollbar">

        {/* TAB 1: MERCADO */}
        {activeTab === 'mercado' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>ATIVO DE TRADING</label>
              <select name="symbol" value={settings.symbol} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}>
                {assets.map((asset) => (
                  <option key={asset.symbol} value={asset.symbol}>
                    {asset.name} ({asset.symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
              <label style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>TIMEFRAME (GRÁFICO)</label>
              <select name="granularity" value={settings.granularity} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}>
                <option value="60">1 Minuto (M1)</option>
                <option value="300">5 Minutos (M5) - Recomendado</option>
                <option value="900">15 Minutos (M15)</option>
              </select>
            </div>

            {/* AUTO-BLACKLIST CONSOLIDAÇÃO */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: 'white' }}>🛡️ AUTO-BLACKLIST DE CONSOLIDAÇÃO</label>
                  <span style={{ fontSize: '0.62rem', color: '#94A3B8', display: 'block' }}>Bloqueia e troca ativos sem volatilidade (dojis seguidos)</span>
                </div>
                <Switch name="autoBlacklistConsolidation" checked={settings.autoBlacklistConsolidation ?? true} onChange={handleInputChange} disabled={isRunning} />
              </div>

              {(settings.autoBlacklistConsolidation ?? true) && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>LIMITE DE DOJIS/VELAS ESTREITAS</label>
                  <select name="consolidationDojiLimit" value={settings.consolidationDojiLimit || '4'} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}>
                    <option value="3">3 Dojis em sequência (Super Sensível)</option>
                    <option value="4">4 Dojis em sequência (Recomendado)</option>
                    <option value="5">5 Dojis em sequência (Conservador)</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MOTOR IA */}
        {activeTab === 'ia' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: 'white' }}>🤖 PILOTO AUTOMÁTICO IA</label>
                  <span style={{ fontSize: '0.62rem', color: '#94A3B8', display: 'block' }}>Chaveia estratégias dinamicamente pela maior winrate</span>
                </div>
                <Switch name="autoPilot" checked={settings.autoPilot} onChange={handleInputChange} disabled={isRunning} />
              </div>

              {settings.autoPilot && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'white' }}>EXCLUIR ANÁLISES LENTAS</label>
                      <span style={{ fontSize: '0.62rem', color: '#94A3B8', display: 'block' }}>Foca apenas em padrões rápidos de velas</span>
                    </div>
                    <Switch name="disableSlowStrategies" checked={settings.disableSlowStrategies || false} onChange={handleInputChange} disabled={isRunning} />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>INTERVALO DE REAVALIAÇÃO DA IA</label>
                    <select name="autoPilotInterval" value={settings.autoPilotInterval || '5'} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}>
                      <option value="1">A cada 1 Minuto</option>
                      <option value="2">A cada 2 Minutos</option>
                      <option value="5">A cada 5 Minutos (Recomendado)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {!settings.autoPilot && (
              <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '6px' }}>ESTRATÉGIA SELECIONADA</label>
                <select name="selectedStrategy" value={settings.selectedStrategy} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}>
                  <option value="mhi_minority">MHI 1 (Minoria - Vela 1)</option>
                  <option value="mhi_majority">MHI 1 (Maioria - Vela 1)</option>
                  <option value="mhi_2_minority">MHI 2 (Minoria - Vela 2)</option>
                  <option value="twin_towers">Torres Gêmeas</option>
                  <option value="padrao_23">Padrão 23</option>
                  <option value="three_musketeers">Três Mosqueteiros</option>
                  <option value="ma_crossover">Cruzamento de Médias (9/21)</option>
                  <option value="pivot_123">Pivô de 1-2-3</option>
                </select>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SOROSGALE & GESTÃO DE BANCA */}
        {activeTab === 'sorosgale' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(16, 185, 129, 0.05) 100%)', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                <Rocket size={18} style={{ color: 'var(--primary-light)' }} />
                <h3 style={{ fontSize: '0.88rem', fontWeight: '800', color: 'white', margin: 0 }}>SISTEMA FINANCEIRO DE TRADING</h3>
              </div>

              <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>MODO DE GERENCIAMENTO</label>
              <select
                name="moneyManagement"
                value={settings.moneyManagement || 'fixed'}
                onChange={handleInputChange}
                disabled={isRunning}
                style={{ fontSize: '0.85rem', fontWeight: 'bold', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-active)', borderRadius: '8px', width: '100%' }}
              >
                <option value="sorosgale">🚀 Sorosgale (Crescimento Acelerado + Recovery - RECOMENDADO)</option>
                <option value="soros">Ciclo de Soros Puro</option>
                <option value="fixed">Mão Fixa (Sem Recuperação)</option>
                <option value="martingale">Martingale Tradicional</option>
                <option value="progressive_gale">Gale Progressivo</option>
                <option value="reverse_gale">Gale Invertido (Anti-Martingale)</option>
              </select>

              {/* Sorosgale specific options */}
              {(settings.moneyManagement === 'sorosgale' || settings.moneyManagement === 'soros') && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>ESTÁGIOS DE COMPOUNDING</label>
                      <select name="sorosgaleLevels" value={settings.sorosgaleLevels || '2'} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.78rem', padding: '0.4rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}>
                        <option value="2">2 Níveis (2 Wins consecutivos)</option>
                        <option value="3">3 Níveis (3 Wins consecutivos)</option>
                        <option value="4">4 Níveis (Alavancagem Máxima)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>REINVESTIMENTO DE LUCRO</label>
                      <select name="sorosgaleCompounding" value={settings.sorosgaleCompounding || '100'} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.78rem', padding: '0.4rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}>
                        <option value="50">50% do Lucro (Conservador)</option>
                        <option value="75">75% do Lucro (Moderado)</option>
                        <option value="100">100% do Lucro (Padrão Soros)</option>
                      </select>
                    </div>
                  </div>

                  {settings.moneyManagement === 'sorosgale' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', padding: '0.65rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: '800', color: 'white' }}>RECUPERAÇÃO GALE NO LOSS</label>
                          <span style={{ fontSize: '0.58rem', color: '#94A3B8', display: 'block' }}>Executa tentativas de recuperação ao sofrer loss</span>
                        </div>
                        <Switch name="sorosgaleAllowGale" checked={settings.sorosgaleAllowGale !== false} onChange={handleInputChange} disabled={isRunning} />
                      </div>

                      {(settings.sorosgaleAllowGale !== false) && (
                        <div style={{ marginTop: '0.35rem', paddingTop: '0.35rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                          <label style={{ fontSize: '0.62rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>MÁXIMO DE GALES DE RECUPERAÇÃO (1 ATÉ 6)</label>
                          <select
                            name="sorosgaleMaxGale"
                            value={settings.sorosgaleMaxGale || '2'}
                            onChange={handleInputChange}
                            disabled={isRunning}
                            style={{ fontSize: '0.78rem', padding: '0.4rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}
                          >
                            <option value="1">1 Gale (Conservador)</option>
                            <option value="2">2 Gales (Padrão Recomendado)</option>
                            <option value="3">3 Gales (Moderado)</option>
                            <option value="4">4 Gales (Alavancado)</option>
                            <option value="5">5 Gales (Agressivo)</option>
                            <option value="6">6 Gales (Máximo Livre)</option>
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Base Stake & Limits */}
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>VALOR DA ENTRADA ($)</label>
                  <input
                    type="number"
                    name="stakeValue"
                    value={settings.stakeValue}
                    onChange={handleInputChange}
                    min="0.35"
                    step="0.5"
                    disabled={isRunning}
                    style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>STOP LOSS ($)</label>
                  <input
                    type="number"
                    name="stopLoss"
                    value={settings.stopLoss}
                    onChange={handleInputChange}
                    min="1"
                    step="1"
                    disabled={isRunning}
                    style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MICRO-METAS */}
        {activeTab === 'micrometas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: 'white' }}>⏰ ESTRATÉGIA DE MICRO-METAS FRACIONADAS</label>
                  <span style={{ fontSize: '0.62rem', color: '#94A3B8', display: 'block' }}>Divide a meta do dia em sessões curtas de rápida conclusão</span>
                </div>
                <Switch name="microMetaEnabled" checked={settings.microMetaEnabled || false} onChange={handleInputChange} disabled={isRunning} />
              </div>

              {(settings.microMetaEnabled || false) && (
                <div style={{ marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>META POR SESSÃO ($)</label>
                    <input
                      type="number"
                      name="microMetaTarget"
                      value={settings.microMetaTarget || '5.00'}
                      onChange={handleInputChange}
                      min="1"
                      step="0.5"
                      disabled={isRunning}
                      style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>SESSÕES POR DIA</label>
                    <select name="maxSessionsPerDay" value={settings.maxSessionsPerDay || 4} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}>
                      <option value={2}>2 Sessões</option>
                      <option value={3}>3 Sessões</option>
                      <option value={4}>4 Sessões (Recomendado)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SEGURANÇA */}
        {activeTab === 'seguranca' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: 'white' }}>🛡️ STREAK SHIELD (TRAVA DE TENDÊNCIA)</label>
                  <span style={{ fontSize: '0.62rem', color: '#94A3B8', display: 'block' }}>Bloqueia ordens contra sequências longas de velas</span>
                </div>
                <Switch name="enableStreakShield" checked={settings.enableStreakShield ?? true} onChange={handleInputChange} disabled={isRunning} />
              </div>

              {(settings.enableStreakShield ?? true) && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>MÁX. VELAS SEGUIDAS</label>
                    <input
                      type="number"
                      name="maxStreakCandles"
                      value={settings.maxStreakCandles || 4}
                      onChange={handleInputChange}
                      min="3"
                      max="10"
                      disabled={isRunning}
                      style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.65rem', fontWeight: '800', color: '#94A3B8', display: 'block', marginBottom: '4px' }}>AÇÃO</label>
                    <select name="streakShieldAction" value={settings.streakShieldAction || 'block'} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.5rem', background: '#09090f', color: 'white', border: '1px solid var(--border-color)', borderRadius: '8px', width: '100%' }}>
                      <option value="block">Bloquear Entrada</option>
                      <option value="pause">Pausar Robô (5 min)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: SHADOW ACCOUNT */}
        {activeTab === 'recall' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.01)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '800', color: 'white' }}>👥 SHADOW ACCOUNT & RECALL ENGINE</label>
                  <span style={{ fontSize: '0.62rem', color: '#94A3B8', display: 'block' }}>Aciona conta paralela para recuperar prejuízos</span>
                </div>
                <Switch name="recallEnabled" checked={settings.recallEnabled || false} onChange={handleInputChange} disabled={isRunning} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: LABORATORIO DE ESTUDOS */}
        {activeTab === 'laboratorio' && (
          <SorosgaleSimulator trades={trades} />
        )}

      </div>
    </div>
  );
}
