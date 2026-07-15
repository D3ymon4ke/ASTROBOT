import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Settings as SettingsIcon, Play, Square, Award, AlertCircle, ChevronLeft, ChevronRight, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

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
  onToggleCollapse
}) {
  const [hoveredTooltip, setHoveredTooltip] = useState({ text: '', x: 0, y: 0, show: false });
  const [sectionsExpanded, setSectionsExpanded] = useState({
    assetTimeframe: true,
    stakeManagement: true,
    riskManagement: true,
    strategies: true
  });

  const handleMouseLeave = () => {
    setHoveredTooltip(prev => ({ ...prev, show: false }));
  };

  // Prevent sticky tooltips by dismissing them on window mouseleave and blur
  useEffect(() => {
    const dismissTooltip = () => {
      setHoveredTooltip(prev => prev.show ? { ...prev, show: false } : prev);
    };
    window.addEventListener('mouseleave', dismissTooltip);
    window.addEventListener('blur', dismissTooltip);
    return () => {
      window.removeEventListener('mouseleave', dismissTooltip);
      window.removeEventListener('blur', dismissTooltip);
    };
  }, []);

  const toggleSection = (sectionKey) => {
    handleMouseLeave();
    setSectionsExpanded(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handleInputChange = (e) => {
    handleMouseLeave();
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    onChange({ ...settings, [name]: val });
  };

  const handleMouseEnter = (text, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredTooltip({
      text,
      x: rect.left + rect.width / 2,
      y: rect.top,
      show: true
    });
  };

  const Tooltip = ({ text }) => (
    <span 
      style={{ display: 'inline-flex', alignItems: 'center', cursor: 'help', marginLeft: '4px' }}
      onMouseEnter={(e) => handleMouseEnter(text, e)}
      onMouseLeave={handleMouseLeave}
    >
      <HelpCircle size={12} style={{ color: 'var(--text-muted)', opacity: 0.7 }} />
    </span>
  );

  const renderTooltip = () => {
    if (!hoveredTooltip.show) return null;

    const tooltipWidth = 220;
    let leftPos = hoveredTooltip.x;
    
    // Prevent overflowing screen boundaries
    if (leftPos - tooltipWidth / 2 < 10) {
      leftPos = tooltipWidth / 2 + 10;
    } else if (leftPos + tooltipWidth / 2 > window.innerWidth - 10) {
      leftPos = window.innerWidth - tooltipWidth / 2 - 10;
    }

    // Calculate arrow position relative to the tooltip bubble
    const arrowLeft = hoveredTooltip.x - (leftPos - tooltipWidth / 2);

    return createPortal(
      <div style={{
        position: 'fixed',
        zIndex: 99999,
        left: `${leftPos}px`,
        top: `${hoveredTooltip.y}px`,
        transform: 'translate(-50%, -125%)',
        backgroundColor: '#13112c',
        color: '#f8fafc',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '0.72rem',
        width: `${tooltipWidth}px`,
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.75)',
        pointerEvents: 'none',
        textAlign: 'center',
        lineHeight: '1.4',
        border: '1px solid #8b5cf6',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {hoveredTooltip.text}
        {/* Arrow */}
        <div style={{
          position: 'absolute',
          top: '100%',
          left: `${arrowLeft}px`,
          transform: 'translateX(-50%)',
          borderWidth: '6px',
          borderStyle: 'solid',
          borderColor: '#8b5cf6 transparent transparent transparent'
        }} />
        <div style={{
          position: 'absolute',
          top: '100%',
          left: `${arrowLeft}px`,
          transform: 'translateX(-50%)',
          borderWidth: '5px',
          borderStyle: 'solid',
          borderColor: '#13112c transparent transparent transparent',
          marginTop: '-1px'
        }} />
      </div>,
      document.body
    );
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

  if (collapsed) {
    return (
      <div className="glass-panel" style={{
        padding: '0.75rem 0.5rem',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        overflow: 'hidden'
      }}>
        {/* Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="icon-button"
          style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid var(--primary-glow)',
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
            fontSize: '0.7rem',
            fontWeight: 'bold',
            padding: '4px 6px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center',
            width: '45px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }} title={settings.symbol}>
            {settings.symbol.replace('Volatility ', '').replace(' Index', '')}
          </div>

          <div style={{
            fontSize: '0.7rem',
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
            fontSize: '0.7rem',
            fontWeight: 'bold',
            padding: '4px 6px',
            borderRadius: '6px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
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
                padding: '0'
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
                padding: '0'
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

  const renderSectionHeader = (title, key) => (
    <div 
      onClick={() => toggleSection(key)}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.55rem 0.65rem',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        cursor: 'pointer',
        userSelect: 'none',
        marginTop: '0.4rem',
        marginBottom: '0.2rem',
        transition: 'all 0.2s ease',
        fontSize: '0.7rem',
        fontWeight: '800',
        color: sectionsExpanded[key] ? '#a78bfa' : 'rgba(255,255,255,0.7)',
        boxShadow: sectionsExpanded[key] ? 'inset 0 0 8px rgba(139, 92, 246, 0.05)' : 'none'
      }}
    >
      <span style={{ letterSpacing: '0.5px' }}>{title}</span>
      {sectionsExpanded[key] ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
    </div>
  );

  return (
    <div className="glass-panel" style={{ padding: '1.25rem', height: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <SettingsIcon size={20} style={{ color: 'var(--primary)' }} />
          <h2 style={{ fontSize: '1.05rem', fontWeight: '700' }}>CONFIGURAÇÕES</h2>
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', overflowY: 'auto', flex: 1, paddingRight: '2px' }}>
        
        {/* SECTION 1: ATIVO E TIMEFRAME */}
        {renderSectionHeader("1. ATIVO E TIMEFRAME", "assetTimeframe")}
        {sectionsExpanded.assetTimeframe && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0.25rem 0.75rem 0.5rem', borderLeft: '1px solid rgba(139, 92, 246, 0.2)', marginLeft: '4px', marginBottom: '0.5rem' }}>
            {/* Asset Selection */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>ATIVO DE NEGOCIAÇÃO</label>
                <Tooltip text="Escolha o mercado sintético (índice de volatilidade) no qual o robô fará as operações." />
              </div>
              <select name="symbol" value={settings.symbol} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '36px' }}>
                {assets.map((asset) => (
                  <option key={asset.symbol} value={asset.symbol}>
                    {asset.name} ({asset.symbol})
                  </option>
                ))}
              </select>
            </div>

            {/* Timeframe Selection */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>TIMEFRAME (VELA)</label>
                <Tooltip text="Duração de cada vela no gráfico (M1 = 1 min, M5 = 5 min, M15 = 15 min)." />
              </div>
              <select name="granularity" value={settings.granularity} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '36px' }}>
                <option value="60">1 Minuto (M1)</option>
                <option value="300">5 Minutos (M5)</option>
                <option value="900">15 Minutos (M15)</option>
              </select>
            </div>
          </div>
        )}

        {/* SECTION 2: GESTÃO E BANCA */}
        {renderSectionHeader("2. GESTÃO E BANCA", "stakeManagement")}
        {sectionsExpanded.stakeManagement && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0.25rem 0.75rem 0.5rem', borderLeft: '1px solid rgba(139, 92, 246, 0.2)', marginLeft: '4px', marginBottom: '0.5rem' }}>
            {/* Stake Type */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>TIPO DE ENTRADA</label>
                <Tooltip text="Mão Fixa (valor fixo em USD) ou Porcentagem do saldo total da conta." />
              </div>
              <select name="stakeType" value={settings.stakeType} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '36px' }}>
                <option value="fixed">Mão Fixa (Valor em USD)</option>
                <option value="percentage">Porcentagem da Banca (%)</option>
              </select>
            </div>

            {/* Stake Value */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>
                  {settings.stakeType === 'fixed' ? 'VALOR DA ENTRADA ($)' : 'PORCENTAGEM DA ENTRADA (%)'}
                </label>
                <Tooltip text="Valor inicial investido em cada contrato comprado." />
              </div>
              <input
                type="number"
                name="stakeValue"
                value={settings.stakeValue}
                onChange={handleInputChange}
                min={settings.stakeType === 'fixed' ? '0.35' : '0.1'}
                step="0.01"
                disabled={isRunning}
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '36px' }}
              />
            </div>

            {/* Risk Limits */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>STOP LOSS ($)</label>
                  <Tooltip text="Limite máximo de perda acumulada. O robô para se atingir este valor." />
                </div>
                <input
                  type="number"
                  name="stopLoss"
                  value={settings.stopLoss}
                  onChange={handleInputChange}
                  min="1"
                  step="1"
                  disabled={isRunning}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '36px' }}
                />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>TAKE PROFIT ($)</label>
                  <Tooltip text="Meta de lucro acumulado. O robô para ao alcançar a meta." align="left" />
                </div>
                <input
                  type="number"
                  name="takeProfit"
                  value={settings.takeProfit}
                  onChange={handleInputChange}
                  min="1"
                  step="1"
                  disabled={isRunning}
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '36px' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: GERENCIAMENTO FINANCEIRO */}
        {renderSectionHeader("3. GERENCIAMENTO FINANCEIRO", "riskManagement")}
        {sectionsExpanded.riskManagement && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0.25rem 0.75rem 0.5rem', borderLeft: '1px solid rgba(139, 92, 246, 0.2)', marginLeft: '4px', marginBottom: '0.5rem' }}>
            {/* Money Management Dropdown */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>SISTEMA FINANCEIRO</label>
                <Tooltip text="Selecione o modelo de gerenciamento de risco e recuperação de perdas desejado." />
              </div>
              <select 
                name="moneyManagement" 
                value={settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')} 
                onChange={handleInputChange} 
                disabled={isRunning} 
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '36px' }}
              >
                <option value="fixed">Mão Fixa (Sem Recuperação)</option>
                <option value="martingale">Martingale Tradicional</option>
                <option value="progressive_gale">Gale Progressivo</option>
                <option value="reverse_gale">Gale Invertido (Anti-Martingale)</option>
                <option value="iron_hands">Mãos de Ferro (Mão Fixa Rigorosa)</option>
                <option value="soros">Ciclo de Soros</option>
              </select>
            </div>

            {/* Render conditional inputs if a martingale/soros system is selected */}
            {((settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')) !== 'fixed' && 
              (settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')) !== 'iron_hands') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                
                {/* Martingale Mode (Trigger type) */}
                {(settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')) !== 'soros' && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>EXECUTAR GALE</label>
                      <Tooltip text="Na Próxima Vela (entrada imediata) ou No Próximo Sinal (aguarda nova análise)." />
                    </div>
                    <select name="martingaleMode" value={settings.martingaleMode} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '36px' }}>
                      <option value="next_candle">Na Próxima Vela (Imediato)</option>
                      <option value="next_signal">No Próximo Sinal</option>
                    </select>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  {/* Multiplier / Compounding factor */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>
                        {(settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')) === 'soros' ? 'RETORNO (%)' : 'MULTIPLICADOR'}
                      </label>
                      <Tooltip text={(settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')) === 'soros' ? "Porcentagem do lucro a somar na próxima mão do ciclo (ex: 100% = aposta todo o lucro anterior)." : "Fator multiplicador do valor da entrada no Gale."} />
                    </div>
                    <input
                      type="number"
                      name="martingaleMultiplier"
                      value={settings.martingaleMultiplier}
                      onChange={handleInputChange}
                      min="1.0"
                      step="0.1"
                      disabled={isRunning}
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '36px' }}
                    />
                  </div>

                  {/* Max Levels / Steps */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>
                        {(settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')) === 'soros' ? 'ESTÁGIOS (SOROS)' : 'NÍVEIS (GALE)'}
                      </label>
                      <Tooltip text={(settings.moneyManagement || (settings.martingaleEnabled ? 'martingale' : 'fixed')) === 'soros' ? "Número de mãos vitoriosas consecutivas necessárias para fechar o ciclo de Soros." : "Número máximo de martingales seguidos permitidos."} align="left" />
                    </div>
                    <input
                      type="number"
                      name="martingaleMaxLevels"
                      value={settings.martingaleMaxLevels}
                      onChange={handleInputChange}
                      min="1"
                      max="10"
                      step="1"
                      disabled={isRunning}
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '36px' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* SECTION 4: ESTRATÉGIAS */}
        {renderSectionHeader("4. ESTRATÉGIAS E PILOTO", "strategies")}
        {sectionsExpanded.strategies && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.5rem 0.25rem 0.75rem 0.5rem', borderLeft: '1px solid rgba(139, 92, 246, 0.2)', marginLeft: '4px', marginBottom: '0.5rem' }}>
            {/* Auto Pilot Switch */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '0.3px' }}>PILOTO AUTOMÁTICO</label>
                  <Tooltip text="O robô seleciona automaticamente a estratégia com maior assertividade no momento." />
                </div>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Usa a melhor estratégia atual</span>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  name="autoPilot"
                  checked={settings.autoPilot}
                  onChange={handleInputChange}
                  disabled={isRunning}
                />
                <span className="slider"></span>
              </label>
            </div>

            {settings.autoPilot && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '0.5rem', borderLeft: '2px solid var(--primary-light)', marginTop: '-0.25rem', marginBottom: '0.25rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>EXCLUIR PULLBACK/REVERSÃO</label>
                    <Tooltip text="Exclui as estratégias de Pullback e Reversão do Piloto Automático para evitar a demora excessiva em encontrar sinais." />
                  </div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Desativa estratégias demoradas</span>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    name="disableSlowStrategies"
                    checked={settings.disableSlowStrategies || false}
                    onChange={handleInputChange}
                    disabled={isRunning}
                  />
                  <span className="slider"></span>
                </label>
              </div>
            )}

            {/* Auto Pilot Revaluation Interval */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>INTERVALO DE REAVALIAÇÃO</label>
                <Tooltip text="Tempo (em minutos) para o bot reavaliar as estratégias e trocar (no piloto automático) ou sugerir troca." />
              </div>
              <select name="autoPilotInterval" value={settings.autoPilotInterval || '5'} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '36px' }}>
                <option value="1">A cada 1 Minuto (Cada vela)</option>
                <option value="2">A cada 2 Minutos</option>
                <option value="5">A cada 5 Minutos (Recomendado)</option>
                <option value="10">A cada 10 Minutos</option>
                <option value="15">A cada 15 Minutos</option>
              </select>
            </div>

            {/* Manual Strategy Selection */}
            {!settings.autoPilot && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label style={{ fontSize: '0.66rem', fontWeight: '700', color: 'var(--text-secondary)', letterSpacing: '0.3px' }}>SELECIONAR ESTRATÉGIA</label>
                  <Tooltip text="Selecione manualmente a estratégia de análise probabilística." />
                </div>
                <select name="selectedStrategy" value={settings.selectedStrategy} onChange={handleInputChange} disabled={isRunning} style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '36px' }}>
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

            {/* Secondary strategy: Vela Mestra */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.25rem 0', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem', marginTop: '0.25rem', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '0.3px' }}>VELA MESTRA SECUNDÁRIA</label>
                  <Tooltip text="Executa entradas de Vela Mestra (Master Candle) automaticamente se o padrão ocorrer no mercado, mesmo que outra estratégia seja a principal." />
                </div>
                <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Opera rompimentos de Vela Mestra de forma secundária</span>
              </div>
              <label className="switch" style={{ flexShrink: 0 }}>
                <input
                  type="checkbox"
                  name="enableMasterCandleSecondary"
                  checked={settings.enableMasterCandleSecondary || false}
                  onChange={handleInputChange}
                  disabled={isRunning}
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* Recommended Strategy Badge */}
            {settings.autoPilot && bestStrategy && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem', borderRadius: '8px', background: 'var(--success-glow)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <Award size={16} style={{ color: 'var(--success)' }} />
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block' }}>MELHOR RECOMENDADA</span>
                  <strong style={{ fontSize: '0.75rem', color: 'var(--success)' }}>{bestStrategy.name} ({bestStrategy.winRate.toFixed(1)}% Winrate)</strong>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto' }}>
        {!isRunning ? (
          <button
            className="success"
            onClick={onStart}
            disabled={!connected || !authorized}
            style={{ width: '100%', padding: '0.75rem', fontWeight: 'bold' }}
          >
            <Play size={18} fill="currentColor" /> INICIAR BOT
          </button>
        ) : (
          <button
            className="danger"
            onClick={onStop}
            style={{ width: '100%', padding: '0.75rem', fontWeight: 'bold' }}
          >
            <Square size={18} fill="currentColor" /> PARAR BOT
          </button>
        )}

        {(!connected || !authorized) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center', color: 'var(--warning)', marginTop: '0.25rem' }}>
            <AlertCircle size={14} />
            <span style={{ fontSize: '0.75rem' }}>Requer autenticação com a Deriv</span>
          </div>
        )}
      </div>

      {renderTooltip()}
    </div>
  );
}
