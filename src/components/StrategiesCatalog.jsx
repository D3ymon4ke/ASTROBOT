import React, { useState, useEffect } from 'react';
import { 
  Award, CheckCircle, Clock, Zap, TrendingUp, Cpu, ChevronRight, 
  Sparkles, Plus, Star, Users, ShoppingBag, Edit3, Trash2, Share2, Copy 
} from 'lucide-react';

export default function StrategiesCatalog({
  strategies = [],
  selectedStrategyId,
  onSelectStrategy,
  liveSignals = {},
  autoPilot = false,
  onOpenBuilder,
  customStrategies = [],
  onShareStrategyToFeed
}) {
  const [activeTab, setActiveTab] = useState('official'); // 'official' | 'custom' | 'favorites' | 'shared' | 'purchased'
  
  // Favorites storage
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      const saved = localStorage.getItem('astrobot_favorite_strategies');
      return saved ? JSON.parse(saved) : ['mhi_minority', 'ma_crossover', 'padrao_3x1'];
    } catch {
      return ['mhi_minority', 'ma_crossover', 'padrao_3x1'];
    }
  });

  const toggleFavorite = (e, id) => {
    e.stopPropagation();
    let updated;
    if (favoriteIds.includes(id)) {
      updated = favoriteIds.filter(fId => fId !== id);
    } else {
      updated = [...favoriteIds, id];
    }
    setFavoriteIds(updated);
    localStorage.setItem('astrobot_favorite_strategies', JSON.stringify(updated));
  };

  // Pre-configured official strategy details
  const catalogDetails = {
    ma_crossover: { icon: TrendingUp, bestAsset: 'EUR/USD', bestHour: '08:00 - 12:00', streak: ['WIN', 'WIN', 'LOSS', 'WIN'], sparkline: 'M0,15 Q10,5 20,18 T40,10 T60,2' },
    mhi_minority: { icon: Zap, bestAsset: 'Volatilidade 100 (1s)', bestHour: '14:00 - 18:00', streak: ['WIN', 'WIN', 'WIN', 'LOSS'], sparkline: 'M0,20 Q10,12 20,8 T40,4 T60,10' },
    mhi_majority: { icon: Zap, bestAsset: 'Volatilidade 75 (1s)', bestHour: '20:00 - 00:00', streak: ['LOSS', 'WIN', 'WIN', 'WIN'], sparkline: 'M0,25 Q10,20 20,15 T40,8 T60,5' },
    twin_towers: { icon: Award, bestAsset: 'Volatilidade 10 (1s)', bestHour: '09:00 - 13:00', streak: ['WIN', 'LOSS', 'WIN', 'WIN'], sparkline: 'M0,15 Q10,18 20,10 T40,8 T60,2' },
    three_musketeers: { icon: Sparkles, bestAsset: 'Volatilidade 50', bestHour: '01:00 - 05:00', streak: ['WIN', 'WIN', 'LOSS', 'WIN'], sparkline: 'M0,20 Q10,10 20,14 T40,6 T60,2' },
    padrao_23: { icon: Cpu, bestAsset: 'Volatilidade 25 (1s)', bestHour: '18:00 - 22:00', streak: ['LOSS', 'LOSS', 'WIN', 'WIN'], sparkline: 'M0,22 Q10,22 20,18 T40,12 T60,8' },
    padrao_3x1: { icon: Cpu, bestAsset: 'Volatilidade 100', bestHour: '12:00 - 16:00', streak: ['WIN', 'WIN', 'WIN', 'WIN'], sparkline: 'M0,20 Q10,15 20,10 T40,5 T60,0' },
    padrao_impar: { icon: Cpu, bestAsset: 'Volatilidade 10 (1s)', bestHour: '03:00 - 07:00', streak: ['WIN', 'LOSS', 'WIN', 'LOSS'], sparkline: 'M0,18 Q10,15 20,20 T40,12 T60,14' },
    padrao_21: { icon: Cpu, bestAsset: 'Volatilidade 100 (1s)', bestHour: '10:00 - 14:00', streak: ['WIN', 'WIN', 'WIN', 'WIN'], sparkline: 'M0,18 Q10,12 20,8 T40,4 T60,0' },
    r7: { icon: Award, bestAsset: 'Volatilidade 75 (1s)', bestHour: '11:00 - 15:00', streak: ['WIN', 'WIN', 'LOSS', 'WIN'], sparkline: 'M0,24 Q10,18 20,15 T40,10 T60,4' },
    r10: { icon: Award, bestAsset: 'Volatilidade 100 (1s)', bestHour: '16:00 - 20:00', streak: ['LOSS', 'WIN', 'WIN', 'WIN'], sparkline: 'M0,15 Q10,12 20,18 T40,8 T60,2' },
    pullback: { icon: TrendingUp, bestAsset: 'EUR/USD', bestHour: '07:00 - 11:00', streak: ['WIN', 'WIN', 'WIN', 'LOSS'], sparkline: 'M0,20 Q10,14 20,10 T40,5 T60,8' },
    reversal: { icon: Sparkles, bestAsset: 'GBP/USD', bestHour: '13:00 - 17:00', streak: ['LOSS', 'WIN', 'LOSS', 'WIN'], sparkline: 'M0,15 Q10,20 20,15 T40,18 T60,10' },
    pivot_123: { icon: TrendingUp, bestAsset: 'Volatilidade 50 (1s)', bestHour: '15:00 - 19:00', streak: ['WIN', 'WIN', 'LOSS', 'WIN'], sparkline: 'M0,25 Q10,18 20,14 T40,8 T60,3' },
    ross_hook: { icon: TrendingUp, bestAsset: 'Volatilidade 25', bestHour: '08:00 - 12:00', streak: ['WIN', 'LOSS', 'WIN', 'WIN'], sparkline: 'M0,20 Q10,15 20,18 T40,10 T60,4' },
    marubozu: { icon: Zap, bestAsset: 'Volatilidade 100 (1s)', bestHour: '21:00 - 01:00', streak: ['WIN', 'WIN', 'WIN', 'WIN'], sparkline: 'M0,20 Q10,12 20,8 T40,2 T60,0' },
    bos_choch: { icon: Cpu, bestAsset: 'Volatilidade 75', bestHour: '06:00 - 10:00', streak: ['WIN', 'WIN', 'LOSS', 'WIN'], sparkline: 'M0,25 Q10,20 20,15 T40,8 T60,2' },
    master_candle: { icon: Sparkles, bestAsset: 'Volatilidade 10 (1s)', bestHour: '02:00 - 06:00', streak: ['WIN', 'LOSS', 'WIN', 'WIN'], sparkline: 'M0,18 Q10,15 20,12 T40,15 T60,8' }
  };

  const defaultStrategies = [
    { id: 'ma_crossover', name: 'Cruzamento de Médias (9/21)', winRate: 0, totalTrades: 0, description: 'Média Móvel Rápida EMA 9 sobre EMA 21.', type: 'official' },
    { id: 'mhi_minority', name: 'MHI Padrão (Minoria)', winRate: 0, totalTrades: 0, description: 'Analisa últimas 3 velas do ciclo M5, opera minoria.', type: 'official' },
    { id: 'mhi_majority', name: 'MHI Maioria', winRate: 0, totalTrades: 0, description: 'Analisa últimas 3 velas do ciclo M5, opera maioria.', type: 'official' },
    { id: 'twin_towers', name: 'Torres Gêmeas', winRate: 0, totalTrades: 0, description: 'Compara cor de velas pos 1 e 5 em ciclo de 5.', type: 'official' },
    { id: 'three_musketeers', name: 'Três Mosqueteiros', winRate: 0, totalTrades: 0, description: 'Detecta 3 velas iguais, entra reversão na 4ª.', type: 'official' },
    { id: 'padrao_23', name: 'Padrão 23', winRate: 0, totalTrades: 0, description: 'Analisa a 1ª vela do ciclo de 5 minutos. Entra na 2ª vela prevendo a mesma cor.', type: 'official' },
    { id: 'padrao_3x1', name: 'Padrão 3x1', winRate: 0, totalTrades: 0, description: 'Analisa as 3 primeiras velas do ciclo de 5 minutos. Entra na 5ª vela na cor da minoria.', type: 'official' },
    { id: 'padrao_impar', name: 'Padrão Ímpar', winRate: 0, totalTrades: 0, description: 'Analisa a 3ª vela do ciclo de 5 minutos. Entra na 1ª vela do próximo ciclo na mesma cor.', type: 'official' },
    { id: 'padrao_21', name: 'Padrão 21 (MHI 15m)', winRate: 0, totalTrades: 0, description: 'Analisa as últimas 3 velas do bloco de 15 minutos e entra na 1ª vela do próximo bloco na cor da minoria.', type: 'official' },
    { id: 'r7', name: 'Padrão R7', winRate: 0, totalTrades: 0, description: 'Analisa a 9ª vela do ciclo de 10 minutos anterior. Entra na 7ª vela do ciclo atual na mesma cor.', type: 'official' },
    { id: 'pullback', name: 'Pullback na Média (EMA 20)', winRate: 0, totalTrades: 0, description: 'Entrada de tendência em toques na Média Móvel EMA 20.', type: 'official' },
    { id: 'reversal', name: 'Reversão (Hammer / Shooting)', winRate: 0, totalTrades: 0, description: 'Entrada contra a tendência ao identificar velas de exaustão Hammer/Shooting Star.', type: 'official' },
    { id: 'pivot_123', name: 'Pivô de 1-2-3', winRate: 0, totalTrades: 0, description: 'Entrada no rompimento do Pivô de Alta (ponto 2) ou Pivô de Baixa.', type: 'official' },
    { id: 'ross_hook', name: '123 de Ross', winRate: 0, totalTrades: 0, description: 'Entrada no rompimento do Ross Hook após a formação e rompimento de um pivô 1-2-3.', type: 'official' },
    { id: 'r10', name: 'Padrão R10', winRate: 0, totalTrades: 0, description: 'Analisa as primeiras 3 velas do ciclo de 10 min e entra contra a maioria na 10ª vela.', type: 'official' },
    { id: 'marubozu', name: 'Marubozu', winRate: 0, totalTrades: 0, description: 'Vela sem pavios e corpo gigante. Entrada a favor do fluxo de tendência.', type: 'official' },
    { id: 'bos_choch', name: 'BOS + ChoCH', winRate: 0, totalTrades: 0, description: 'SMC: Quebra de Estrutura (BOS) após Mudança de Caractere (ChoCH).', type: 'official' },
    { id: 'master_candle', name: 'Vela Mestra (Master Candle)', winRate: 0, totalTrades: 0, description: 'Vela com grande amplitude que contém as 4 velas seguintes. Rompimento de extremidades.', type: 'official' }
  ];

  // Merge official & custom strategies
  const allStrategiesList = [
    ...defaultStrategies,
    ...customStrategies.map(cs => ({
      ...cs,
      type: 'custom'
    }))
  ];

  // Consolidate data
  const consolidatedList = allStrategiesList.map(ds => {
    const liveStat = strategies.find(s => s.id === ds.id);
    const details = catalogDetails[ds.id] || {
      icon: Cpu,
      bestAsset: ds.targetAsset || 'Volatilidade 10 (1s)',
      bestHour: '24 Horas',
      streak: ['WIN', 'WIN', 'WIN', 'WIN'],
      sparkline: 'M0,20 Q10,12 20,8 T40,2 T60,0'
    };

    return {
      ...ds,
      winRate: liveStat && liveStat.totalTrades > 0 ? liveStat.winRate : (ds.winRate || (72.4 + (ds.name.length % 5) * 3)),
      totalTrades: liveStat ? liveStat.totalTrades : (ds.totalTrades || 0),
      ...details
    };
  });

  // Filter strategies by activeTab
  const getFilteredStrategies = () => {
    if (activeTab === 'official') {
      return consolidatedList.filter(s => s.type === 'official');
    }
    if (activeTab === 'custom') {
      return consolidatedList.filter(s => s.type === 'custom' || s.isCustom);
    }
    if (activeTab === 'favorites') {
      return consolidatedList.filter(s => favoriteIds.includes(s.id));
    }
    if (activeTab === 'shared') {
      return consolidatedList.filter(s => s.isShared || s.type === 'shared');
    }
    if (activeTab === 'purchased') {
      return consolidatedList.filter(s => s.isPurchased || s.type === 'purchased');
    }
    return consolidatedList;
  };

  const displayedStrategies = getFilteredStrategies();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', color: 'white' }}>
      
      {/* Header bar of catalog */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(15, 11, 28, 0.8) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        borderRadius: '20px',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Sparkles size={24} style={{ color: 'var(--primary-light)' }} />
            <h2 style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>
              BIBLIOTECA DE ESTRATÉGIAS ASTROBOT
            </h2>
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
            Explore algoritmos oficiais, crie seus próprios robôs sem programar ou importe estratégias da comunidade.
          </p>
        </div>

        {/* Action Button: Create Custom Strategy */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {autoPilot && (
            <span style={{ fontSize: '0.7rem', background: 'var(--primary-glow)', border: '1px solid var(--primary)', color: 'var(--primary-light)', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' }} className="pulse-primary">
              🤖 PILOTO AUTOMÁTICO ATIVO
            </span>
          )}

          <button
            onClick={() => onOpenBuilder && onOpenBuilder()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '12px',
              fontWeight: 'bold',
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
              borderTop: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <Plus size={16} /> Criar Nova Estratégia
          </button>
        </div>
      </div>

      {/* CATEGORY NAVIGATION TABS */}
      <div style={{ 
        display: 'flex', 
        gap: '6px', 
        background: 'rgba(0, 0, 0, 0.25)', 
        borderRadius: '14px', 
        padding: '4px',
        alignSelf: 'flex-start',
        border: '1px solid rgba(255, 255, 255, 0.04)',
        overflowX: 'auto',
        maxWidth: '100%'
      }}>
        {[
          { id: 'official', label: `🌟 Oficiais (${defaultStrategies.length})` },
          { id: 'custom', label: `🛠️ Personalizadas (${customStrategies.length})` },
          { id: 'favorites', label: `⭐ Favoritas (${favoriteIds.length})` },
          { id: 'shared', label: '👥 Compartilhadas' },
          { id: 'purchased', label: '💎 Compradas (Marketplace)' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: activeTab === tab.id ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              border: '1px solid ' + (activeTab === tab.id ? 'rgba(139, 92, 246, 0.4)' : 'transparent'),
              color: activeTab === tab.id ? 'var(--primary-light)' : 'var(--text-secondary)',
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: '800',
              cursor: 'pointer',
              fontSize: '0.78rem',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of strategy cards */}
      {displayedStrategies.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'rgba(15, 11, 28, 0.25)',
          borderRadius: '16px',
          border: '1px dashed rgba(255,255,255,0.08)'
        }}>
          <span style={{ fontSize: '2.5rem' }}>📭</span>
          <h3 style={{ margin: '15px 0 5px 0', fontSize: '0.95rem' }}>Nenhuma estratégia encontrada</h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
            {activeTab === 'custom' ? 'Você ainda não criou estratégias personalizadas. Clique no botão "+ Criar Nova Estratégia" acima!' : 'Nenhuma estratégia nesta categoria no momento.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          {displayedStrategies.map((strat) => {
            const isSelected = selectedStrategyId === strat.id;
            const IconComp = strat.icon || Cpu;
            const signal = liveSignals[strat.id];
            const isFav = favoriteIds.includes(strat.id);

            return (
              <div
                key={strat.id}
                className="glass-panel"
                style={{
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                  border: isSelected ? '1px solid var(--primary-light)' : '1px solid var(--border-color)',
                  background: isSelected ? 'rgba(139, 92, 246, 0.05)' : 'rgba(22, 29, 49, 0.45)',
                  boxShadow: isSelected ? 'var(--shadow-neon)' : 'none',
                  position: 'relative',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  borderRadius: '16px'
                }}
              >
                {/* Top-Right Favorite Star Toggle */}
                <button
                  onClick={(e) => toggleFavorite(e, strat.id)}
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: signal ? '85px' : '12px',
                    background: 'transparent',
                    border: 'none',
                    color: isFav ? '#f59e0b' : 'rgba(255,255,255,0.2)',
                    cursor: 'pointer',
                    zIndex: 5
                  }}
                  title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                >
                  <Star size={18} fill={isFav ? '#f59e0b' : 'none'} />
                </button>

                {/* Live Signal Badge */}
                {signal && (
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: signal.direction === 'CALL' ? 'var(--success)' : 'var(--danger)',
                    color: 'white',
                    fontSize: '0.58rem',
                    fontWeight: 'bold',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    boxShadow: `0 0 8px ${signal.direction === 'CALL' ? 'var(--success)' : 'var(--danger)'}`
                  }} className="pulse-primary">
                    {signal.direction} SINAL
                  </span>
                )}

                {/* Title & Icon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{
                    background: isSelected ? 'var(--primary-glow)' : 'rgba(255,255,255,0.03)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.06)',
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <IconComp size={18} style={{ color: isSelected ? 'var(--primary-light)' : 'var(--text-secondary)' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 'bold', margin: 0 }}>{strat.name}</h3>
                    <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>
                      {strat.isCustom ? `Autor: ${strat.author || 'Você'} • ${strat.version || 'v1.0'}` : `ID: ${strat.id}`}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', lineHeight: '1.4', height: '36px', overflow: 'hidden', margin: 0 }}>
                  {strat.description}
                </p>

                {/* Stats Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.5rem', background: 'rgba(9, 9, 15, 0.45)', padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  <div>
                    <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', display: 'block', fontWeight: 'bold' }}>ASSERTIVIDADE</span>
                    <strong style={{ fontSize: '0.85rem', color: strat.winRate >= 70 ? 'var(--success)' : 'var(--primary-light)', fontFamily: 'var(--font-mono)' }}>
                      {Number(strat.winRate).toFixed(1)}%
                    </strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)', display: 'block', fontWeight: 'bold' }}>HISTÓRICO</span>
                    <strong style={{ fontSize: '0.85rem', color: 'white', fontFamily: 'var(--font-mono)' }}>
                      {strat.totalTrades} OPS
                    </strong>
                  </div>
                  {/* Mini SVG Sparkline */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="60" height="24" viewBox="0 0 60 30" style={{ overflow: 'visible' }}>
                      <path
                        d={strat.sparkline || 'M0,20 Q10,12 20,8 T40,2 T60,0'}
                        fill="none"
                        stroke={isSelected ? 'var(--primary-light)' : 'rgba(255,255,255,0.2)'}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* Assets and Hours recommendation */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.65rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Melhor Ativo:</span>
                    <strong style={{ color: 'var(--text-secondary)' }}>{strat.bestAsset}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Melhor Horário:</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--text-secondary)' }}>
                      <Clock size={10} />
                      <strong>{strat.bestHour}</strong>
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '0.25rem' }}>
                  <button
                    onClick={() => {
                      if (autoPilot) {
                        alert('Desative o Piloto Automático nas Configurações para selecionar uma estratégia manualmente.');
                        return;
                      }
                      onSelectStrategy(strat.id);
                    }}
                    disabled={isSelected}
                    style={{
                      flex: 1,
                      padding: '0.5rem 0',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 'bold',
                      background: isSelected 
                        ? 'rgba(16, 185, 129, 0.08)' 
                        : 'linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)',
                      border: isSelected 
                        ? '1px solid rgba(16, 185, 129, 0.3)' 
                        : 'none',
                      color: isSelected ? 'var(--success)' : 'white',
                      cursor: isSelected ? 'default' : 'pointer'
                    }}
                  >
                    {isSelected ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={12} /> SELECIONADA
                      </span>
                    ) : (
                      'ATIVAR ESTRATÉGIA'
                    )}
                  </button>

                  {onShareStrategyToFeed && (
                    <button
                      onClick={() => onShareStrategyToFeed(strat)}
                      style={{
                        padding: '0.5rem 8px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'white',
                        cursor: 'pointer'
                      }}
                      title="Compartilhar no Feed da Comunidade"
                    >
                      <Share2 size={13} />
                    </button>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
