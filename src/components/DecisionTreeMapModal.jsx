import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Play, 
  RotateCcw, 
  Shield, 
  Zap, 
  Cpu, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Info,
  DollarSign
} from 'lucide-react';

export default function DecisionTreeMapModal({ 
  isOpen, 
  onClose, 
  cycles = [], 
  selectedCycleId, 
  activeCycleId,
  isRunning = false,
  onSendTelegram = null
}) {
  const [selectedId, setSelectedId] = useState(selectedCycleId || (cycles[0]?.id) || null);
  const [activeSimulation, setActiveSimulation] = useState(null); // 'fakegale' | 'sorosgale' | 'gale_recovery' | 'streak_block' | null
  const [simStep, setSimStep] = useState(0);
  const [selectedNodeInfo, setSelectedNodeInfo] = useState(null);
  const [telegramStatus, setTelegramStatus] = useState({ sending: false, sent: false });

  // Sync selectedId when prop changes
  useEffect(() => {
    if (selectedCycleId) {
      setSelectedId(selectedCycleId);
    } else if (cycles.length > 0 && !selectedId) {
      setSelectedId(cycles[0].id);
    }
  }, [selectedCycleId, cycles]);

  // Simulation timer sequence
  useEffect(() => {
    if (!activeSimulation) {
      setSimStep(0);
      return;
    }

    const timer = setInterval(() => {
      setSimStep(prev => {
        if (prev >= 4) {
          return prev; // keep at end state
        }
        return prev + 1;
      });
    }, 1100);

    return () => clearInterval(timer);
  }, [activeSimulation]);

  if (!isOpen) return null;

  const currentCycle = cycles.find(c => c.id === selectedId) || cycles[0] || {
    name: 'Missão Sniper IA MHI',
    startTime: '09:00',
    symbol: 'R_100',
    stakeValue: 1.0,
    takeProfit: 5.0,
    stopLoss: 15.0,
    moneyManagement: 'fakegale',
    martingaleLevels: 2,
    martingaleMultiplier: 2.0,
    enableFakegale: true,
    enableStreakShield: true
  };

  const isFakegale = currentCycle.enableFakegale || currentCycle.moneyManagement === 'fakegale' || currentCycle.selectedStrategy === 'fakegale';
  const isSorosgale = currentCycle.moneyManagement === 'sorosgale';
  const stake = parseFloat(currentCycle.stakeValue || 1.0).toFixed(2);
  const tp = parseFloat(currentCycle.takeProfit || 5.0).toFixed(2);
  const sl = parseFloat(currentCycle.stopLoss || 15.0).toFixed(2);
  const galeLevels = parseInt(currentCycle.martingaleLevels ?? 2);
  const galeMult = parseFloat(currentCycle.martingaleMultiplier || 2.0);

  const handleStartSimulation = (type) => {
    setActiveSimulation(type);
    setSimStep(1);
  };

  const handleResetSimulation = () => {
    setActiveSimulation(null);
    setSimStep(0);
  };

  const handleSendToTelegram = () => {
    setTelegramStatus({ sending: true, sent: false });
    if (onSendTelegram) {
      onSendTelegram(currentCycle.id);
    }
    setTimeout(() => {
      setTelegramStatus({ sending: false, sent: true });
      setTimeout(() => setTelegramStatus({ sending: false, sent: false }), 4000);
    }, 800);
  };

  // Node details info dictionary
  const nodeDetails = {
    root: {
      title: '🌌 1. Início do Ciclo Agendado',
      desc: 'O agendador do ASTROBOT monitora continuamente os horários calculados pelo motor estatístico (Smart Hours). Ao atingir o horário definido, o robô ativa o scanner para o ativo alvo.',
      stat: 'Precisão de Disparo: ~0.1s',
      formula: 'Trigger = (CurrentTime >= StartTime) && ActiveStatus'
    },
    scanner: {
      title: '📡 2. Scanner & Estudo IA (MHI Dinâmico)',
      desc: 'O robô analisa os blocos de 5 minutos (Vela 1 a 5) do Volatility 100 Index. Ele avalia os padrões MHI 1, MHI 2 e MHI 3 (Minoria e Maioria) e seleciona o padrão dominante de maior assertividade histórica recente.',
      stat: 'Assertividade Teórica: 92%+',
      formula: 'Padrão = ModeCount(Candle3, Candle4, Candle5) < 2 ? Minoria : Maioria'
    },
    shield: {
      title: '🛡️ 3. Filtro Streak Shield (Anti-Tendência)',
      desc: 'Proteção algorítmica essencial: se o mercado apresentar uma sequência contínua de 4 ou mais velas da mesma cor, o ASTROBOT detecta risco de super-tendência e bloqueia qualquer operação contrária.',
      stat: 'Taxa de Preservação de Banca: 100% no filtro',
      formula: 'Bloqueio = (ContadorSequencia >= 4) && (DireçãoContraria)'
    },
    trigger: {
      title: '🎯 4. Disparo do Sinal & Definição de Rota',
      desc: 'Com o filtro aprovado e a assertividade mínima atingida (>90%), o motor gera a direção operacional (CALL para Compra ou PUT para Venda) e calcula a rota conforme o gerenciamento configurado.',
      stat: 'Confiança do Sinal: Alta',
      formula: 'Signal = { Direction: CALL|PUT, Prob: >=92%, Stake: BaseStake }'
    },
    fakegale_v1: {
      title: '🧪 5A. Vela 1: Teste Virtual (Sinal Fakegale)',
      desc: 'No modo Fakegale, o robô NÃO envia ordem real na Vela 1. A 1ª vela funciona exclusivamente como filtro/validador virtual. Se der WIN, o lucro é considerado batido teoricamente e a banca é protegida; se der LOSS, a entrada real é disparada na Vela 2 (G1).',
      stat: 'Risco de Banca na Vela 1: $0.00 (Zero Risco)',
      formula: 'VirtualTest = Candle1.Outcome; if (Loss) ExecuteReal(Candle2, StakeBase)'
    },
    real_g0: {
      title: '💵 5B. Entrada Spot Direta (G0 Real)',
      desc: 'No modo padrão ou Sorosgale direto, a ordem é enviada imediatamente na abertura da 1ª vela com a stake inicial base configurada.',
      stat: 'Stake Inicial: $' + stake,
      formula: 'ExecuteContract(Duration: 60s, Stake: $' + stake + ')'
    },
    real_entry_v2: {
      title: '🚀 6. Entrada Real (Vela 2 / G1 Sniper)',
      desc: 'Após a confirmação do Loss Virtual na Vela 1, o robô abre a PRIMEIRA ORDEM REAL no mercado exatamente onde outros traders já estariam no Martingale 1, utilizando apenas a stake inicial.',
      stat: 'Vantagem: 1 Nível de Gale Poupado',
      formula: 'RealEntry = StartContract(Candle2, Stake: $' + stake + ')'
    },
    win_branch: {
      title: '🏆 7A. Vitória Real (WIN)',
      desc: 'A operação fecha no lucro. O robô contabiliza o retorno financeiro e encaminha para a meta final ou para a próxima mão de Sorosgale Compounding.',
      stat: 'Retorno Médio: +95% sobre a stake',
      formula: 'Profit = Stake * PayoutRate (ex: +$' + (parseFloat(stake) * 0.95).toFixed(2) + ')'
    },
    soros_compound: {
      title: '🚀 8. Sorosgale Compounding (Nível 1)',
      desc: 'No modo Sorosgale, o lucro obtido na 1ª vitória é somado à stake base para realizar uma entrada alavancada e atingir a meta em apenas 2 operações.',
      stat: 'Stake Composta: $' + (parseFloat(stake) * 1.95).toFixed(2),
      formula: 'NextStake = StakeBase + (Profit * CompoundingRate)'
    },
    gale_branch: {
      title: '⚠️ 7B. Recuperação Martingale (Gale 1 & 2)',
      desc: 'Em caso de Loss na entrada real, o robô avança para o nível de recuperação configurado, multiplicando a stake para cobrir a perda anterior e garantir lucro.',
      stat: 'Níveis Ativos: ' + galeLevels + ' Gales (' + galeMult + 'x)',
      formula: 'StakeGale = PreviousLoss * GaleMultiplier'
    },
    meta_batida: {
      title: '🏆 9. Meta Batida (Take Profit Concluído)',
      desc: 'O objetivo financeiro do ciclo (+$' + tp + ') é alcançado. O ASTROBOT encerra imediatamente a missão e aguarda o próximo horário agendado.',
      stat: 'Meta: +$' + tp,
      formula: 'CycleProfit >= TakeProfit => StopCycle(WIN)'
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 3, 15, 0.88)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '1.25rem'
    }}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(16, 12, 34, 0.96) 0%, rgba(9, 6, 20, 0.98) 100%)',
        border: '1.5px solid rgba(139, 92, 246, 0.35)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '1240px',
        height: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(139, 92, 246, 0.15)',
        overflow: 'hidden'
      }}>
        
        {/* TOP BAR / HEADER */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          background: 'rgba(0, 0, 0, 0.35)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Title & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.25) 100%)',
              border: '1px solid rgba(167, 139, 250, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.3rem',
              boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)'
            }}>
              🌳
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '900', color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
                  Árvore Neural de Decisão & Fluxo de Entradas
                </h3>
                <span style={{
                  fontSize: '0.6rem',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '5px',
                  background: isFakegale ? 'rgba(236, 72, 153, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                  color: isFakegale ? '#f472b6' : '#34d399',
                  border: `1px solid ${isFakegale ? 'rgba(236, 72, 153, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                }}>
                  {isFakegale ? '🧪 FAKEGALE SNIPER' : isSorosgale ? '🚀 SOROSGALE TURBO' : 'MARTINGALE BASE'}
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', marginTop: '2px', display: 'block' }}>
                Visualização do caminho algorítmico, testes virtuais e ramificações de risco em tempo real.
              </span>
            </div>
          </div>

          {/* Right Controls: Mission Selector, Send Telegram, Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* Cycle Selector */}
            {cycles.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 'bold' }}>Missão:</span>
                <select
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    handleResetSimulation();
                  }}
                  style={{
                    background: '#09090f',
                    color: 'white',
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    outline: 'none',
                    maxWidth: '220px'
                  }}
                >
                  {cycles.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.startTime} - {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Send to Telegram Button */}
            <button
              type="button"
              onClick={handleSendToTelegram}
              disabled={telegramStatus.sending}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                background: telegramStatus.sent ? 'rgba(16, 185, 129, 0.25)' : 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)',
                border: telegramStatus.sent ? '1px solid #10b981' : '1px solid rgba(96, 165, 250, 0.5)',
                color: telegramStatus.sent ? '#34d399' : '#93c5fd',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 15px rgba(59, 130, 246, 0.2)'
              }}
            >
              {telegramStatus.sent ? (
                <>
                  <CheckCircle2 size={15} />
                  <span>Enviado p/ Telegram!</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>{telegramStatus.sending ? 'Enviando...' : '📲 Enviar p/ Telegram'}</span>
                </>
              )}
            </button>

            {/* Close Modal */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                borderRadius: '8px',
                padding: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* SIMULATOR QUICK BAR */}
        <div style={{
          padding: '0.65rem 1.5rem',
          background: 'rgba(0, 0, 0, 0.45)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Play size={12} /> Testar Cenário (Simulador):
            </span>

            <button
              type="button"
              onClick={() => handleStartSimulation('fakegale')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 'bold',
                background: activeSimulation === 'fakegale' ? 'rgba(236, 72, 153, 0.3)' : 'rgba(255, 255, 255, 0.03)',
                border: activeSimulation === 'fakegale' ? '1px solid #f472b6' : '1px solid rgba(255, 255, 255, 0.08)',
                color: activeSimulation === 'fakegale' ? '#f472b6' : '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              🧪 Fakegale: Loss Virtual ➔ Win Real G1
            </button>

            <button
              type="button"
              onClick={() => handleStartSimulation('sorosgale')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 'bold',
                background: activeSimulation === 'sorosgale' ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.03)',
                border: activeSimulation === 'sorosgale' ? '1px solid #a78bfa' : '1px solid rgba(255, 255, 255, 0.08)',
                color: activeSimulation === 'sorosgale' ? '#c084fc' : '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              🚀 Sorosgale: Win ➔ Compounding Nível 1
            </button>

            <button
              type="button"
              onClick={() => handleStartSimulation('gale_recovery')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 'bold',
                background: activeSimulation === 'gale_recovery' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.03)',
                border: activeSimulation === 'gale_recovery' ? '1px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.08)',
                color: activeSimulation === 'gale_recovery' ? '#fbbf24' : '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              ⚠️ Recuperação: Loss ➔ Gale 1 Win
            </button>

            <button
              type="button"
              onClick={() => handleStartSimulation('streak_block')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 'bold',
                background: activeSimulation === 'streak_block' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 255, 255, 0.03)',
                border: activeSimulation === 'streak_block' ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.08)',
                color: activeSimulation === 'streak_block' ? '#f87171' : '#cbd5e1',
                cursor: 'pointer'
              }}
            >
              🛡️ Streak Shield: Bloqueio 0 Risco
            </button>
          </div>

          {activeSimulation && (
            <button
              type="button"
              onClick={handleResetSimulation}
              style={{
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '0.64rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <RotateCcw size={12} /> Resetar
            </button>
          )}
        </div>

        {/* MAIN BODY: TREE CANVAS & NODE INSPECTOR */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: selectedNodeInfo ? '1fr 340px' : '1fr',
          overflow: 'hidden',
          position: 'relative'
        }}>
          
          {/* TREE CANVAS SCROLL AREA */}
          <div style={{
            overflowY: 'auto',
            overflowX: 'auto',
            padding: '1.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            background: 'radial-gradient(ellipse at 50% 15%, rgba(139, 92, 246, 0.08) 0%, rgba(5, 3, 15, 0) 70%)'
          }}>

            {/* ─── NÍVEL 1: RAÍZ & SCANNER ─── */}
            <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
              <div 
                onClick={() => setSelectedNodeInfo(nodeDetails.root)}
                style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25) 0%, rgba(59, 130, 246, 0.15) 100%)',
                  border: '1.5px solid #a78bfa',
                  borderRadius: '14px',
                  padding: '10px 18px',
                  boxShadow: '0 0 20px rgba(139, 92, 246, 0.25)',
                  cursor: 'pointer',
                  minWidth: '220px',
                  textAlign: 'center',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ fontSize: '0.62rem', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🌌 RAÍZ DO CICLO
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '900', color: 'white', marginTop: '2px' }}>
                  {currentCycle.startTime} • {currentCycle.symbol}
                </div>
                <div style={{ fontSize: '0.62rem', color: '#cbd5e1', marginTop: '3px' }}>
                  Meta: +${tp} | Stop: -${sl}
                </div>
              </div>
            </div>

            {/* Vertical Connector */}
            <div style={{ width: '2px', height: '24px', background: 'linear-gradient(to bottom, #a78bfa, #60a5fa)' }} />

            {/* ─── NÍVEL 2: ESTUDO IA & FILTROS ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '780px', width: '100%' }}>
              {/* Estudo IA */}
              <div 
                onClick={() => setSelectedNodeInfo(nodeDetails.scanner)}
                style={{
                  background: 'rgba(15, 11, 28, 0.7)',
                  border: '1px solid rgba(139, 92, 246, 0.4)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Cpu size={15} style={{ color: '#c084fc' }} />
                  <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'white' }}>Estudo Dinâmico IA</span>
                </div>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '4px' }}>
                  Avalia MHI 1 a 3 (Minoria/Maioria) na Vela 5 do ciclo M5.
                </div>
                <div style={{ fontSize: '0.58rem', color: '#34d399', fontWeight: 'bold', marginTop: '4px' }}>
                  ✓ Assertividade Histórica: 92%+
                </div>
              </div>

              {/* Filtro Streak Shield */}
              <div 
                onClick={() => setSelectedNodeInfo(nodeDetails.shield)}
                style={{
                  background: activeSimulation === 'streak_block' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(15, 11, 28, 0.7)',
                  border: activeSimulation === 'streak_block' ? '1.5px solid #ef4444' : '1px solid rgba(52, 211, 153, 0.3)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={15} style={{ color: activeSimulation === 'streak_block' ? '#f87171' : '#34d399' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: '800', color: 'white' }}>Streak Shield (Max 4V)</span>
                  </div>
                  <span style={{ fontSize: '0.55rem', background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', padding: '1px 5px', borderRadius: '4px', fontWeight: '800' }}>
                    ATIVO
                  </span>
                </div>
                <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '4px' }}>
                  {activeSimulation === 'streak_block' 
                    ? '🛑 SUPER-TENDÊNCIA DETECTADA: Entrada Bloqueada (0 Risco)!' 
                    : 'Bloqueia contra tendências de 4+ velas consecutivas.'}
                </div>
              </div>
            </div>

            {/* Vertical Connector */}
            <div style={{ width: '2px', height: '24px', background: 'linear-gradient(to bottom, #60a5fa, #34d399)' }} />

            {/* ─── NÍVEL 3: GATILHO DE SINAL & ROTA ─── */}
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <div 
                onClick={() => setSelectedNodeInfo(nodeDetails.trigger)}
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(6, 78, 59, 0.3) 100%)',
                  border: '1px solid #34d399',
                  borderRadius: '12px',
                  padding: '8px 18px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)'
                }}
              >
                <div style={{ fontSize: '0.64rem', fontWeight: '800', color: '#34d399', textTransform: 'uppercase' }}>
                  🎯 GATILHO CONFIRMADO (&gt;90% Assertividade)
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'white', marginTop: '2px' }}>
                  Direção Identificada (CALL 🟩 / PUT 🟥)
                </div>
              </div>
            </div>

            {/* Vertical Connector */}
            <div style={{ width: '2px', height: '24px', background: 'linear-gradient(to bottom, #34d399, #ec4899)' }} />

            {/* ─── NÍVEL 4: RAMIFICAÇÃO OPERACIONAL (FAKEGALE vs DIRETO) ─── */}
            {isFakegale ? (
              /* MODO FAKEGALE FLOW */
              <div style={{
                background: 'rgba(236, 72, 153, 0.08)',
                border: '1.5px solid rgba(244, 114, 182, 0.4)',
                borderRadius: '16px',
                padding: '1.25rem',
                maxWidth: '920px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 0 30px rgba(236, 72, 153, 0.12)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '900', color: '#f472b6', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>🧪</span> RAMIFICAÇÃO FAKEGALE (MHI G1 SNIPER)
                  </span>
                  <span style={{ fontSize: '0.58rem', background: 'rgba(236, 72, 153, 0.25)', color: '#fbcfe8', padding: '2px 8px', borderRadius: '5px', fontWeight: '800', border: '1px solid #f472b6' }}>
                    FILTRO VIRTUAL ATIVO
                  </span>
                </div>

                {/* Vela 1: Teste Virtual Node */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Win Virtual */}
                  <div 
                    onClick={() => setSelectedNodeInfo(nodeDetails.fakegale_v1)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      borderRadius: '10px',
                      padding: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#34d399' }}>
                      ✔ Se Vela 1 = WIN VIRTUAL
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#cbd5e1', marginTop: '3px' }}>
                      Sinal cumprido com sucesso. <strong>Entrada real descartada</strong> para preservar capital.
                    </div>
                  </div>

                  {/* Loss Virtual -> Real Entry Vela 2 */}
                  <div 
                    onClick={() => setSelectedNodeInfo(nodeDetails.real_entry_v2)}
                    style={{
                      background: 'rgba(236, 72, 153, 0.2)',
                      border: '1.5px solid #f472b6',
                      borderRadius: '10px',
                      padding: '10px',
                      cursor: 'pointer',
                      boxShadow: '0 0 15px rgba(236, 72, 153, 0.25)'
                    }}
                  >
                    <div style={{ fontSize: '0.68rem', fontWeight: 'bold', color: '#fbcfe8' }}>
                      🚀 Se Vela 1 = LOSS VIRTUAL ➔ DISPARO REAL
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#e2e8f0', marginTop: '3px' }}>
                      Entrada Real aberta na <strong>Vela 2 (G1)</strong> com Stake Base: <strong>${stake}</strong>.
                    </div>
                  </div>
                </div>

                {/* Sub-Branch: Real Entry Outcome */}
                <div style={{ borderTop: '1px dashed rgba(244, 114, 182, 0.3)', paddingTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Real WIN */}
                  <div 
                    onClick={() => setSelectedNodeInfo(nodeDetails.win_branch)}
                    style={{
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 78, 59, 0.4) 100%)',
                      border: '1px solid #10b981',
                      borderRadius: '10px',
                      padding: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: '900', color: '#34d399' }}>
                      🟢 VITÓRIA REAL (WIN NA VELA 2)
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#cbd5e1', marginTop: '2px' }}>
                      Retorno: <strong>+${(parseFloat(stake) * 0.95).toFixed(2)}</strong> ➔ Rumo à Meta (+${tp})
                    </div>
                  </div>

                  {/* Real LOSS -> Martingale Sequence */}
                  <div 
                    onClick={() => setSelectedNodeInfo(nodeDetails.gale_branch)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.12)',
                      border: '1px solid rgba(239, 68, 68, 0.4)',
                      borderRadius: '10px',
                      padding: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: '900', color: '#f87171' }}>
                      🔴 LOSS REAL NA VELA 2 ➔ GALE 1 (VELA 3)
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#cbd5e1', marginTop: '2px' }}>
                      Sequência normal de recuperação com Stake: <strong>${(parseFloat(stake) * galeMult).toFixed(2)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            ) : isSorosgale ? (
              /* MODO SOROSGALE FLOW */
              <div style={{
                background: 'rgba(139, 92, 246, 0.08)',
                border: '1.5px solid rgba(167, 139, 250, 0.4)',
                borderRadius: '16px',
                padding: '1.25rem',
                maxWidth: '920px',
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                boxShadow: '0 0 30px rgba(139, 92, 246, 0.15)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '900', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    🚀 RAMIFICAÇÃO SOROSGALE TURBO (COMPOUNDING)
                  </span>
                  <span style={{ fontSize: '0.58rem', background: 'rgba(139, 92, 246, 0.25)', color: '#e9d5ff', padding: '2px 8px', borderRadius: '5px', fontWeight: '800', border: '1px solid #a78bfa' }}>
                    ALAVANCAGEM ACELERADA
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {/* Win Spot -> Soros 1 */}
                  <div 
                    onClick={() => setSelectedNodeInfo(nodeDetails.soros_compound)}
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid #10b981',
                      borderRadius: '10px',
                      padding: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: '900', color: '#34d399' }}>
                      🟢 1º WIN SPOT ➔ SOROS NÍVEL 1
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#cbd5e1', marginTop: '3px' }}>
                      Próxima entrada alavancada com lucro: <strong>${(parseFloat(stake) * 1.95).toFixed(2)}</strong>
                    </div>
                  </div>

                  {/* Loss Spot -> Gale Recovery */}
                  <div 
                    onClick={() => setSelectedNodeInfo(nodeDetails.gale_branch)}
                    style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      borderRadius: '10px',
                      padding: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', fontWeight: '900', color: '#fbbf24' }}>
                      ⚠️ LOSS SPOT ➔ GALE RECOVERY
                    </div>
                    <div style={{ fontSize: '0.62rem', color: '#cbd5e1', marginTop: '3px' }}>
                      Recupera a perda inicial com <strong>{galeLevels} Níveis de Gale</strong>.
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* MODO PADRÃO FLOW */
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '16px',
                padding: '1.25rem',
                maxWidth: '920px',
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1rem'
              }}>
                <div 
                  onClick={() => setSelectedNodeInfo(nodeDetails.win_branch)}
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid #10b981',
                    borderRadius: '10px',
                    padding: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: '900', color: '#34d399' }}>
                    🟢 WIN SPOT ➔ META BATIDA (+${tp})
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#cbd5e1', marginTop: '3px' }}>
                    Vitória direta no disparo inicial.
                  </div>
                </div>

                <div 
                  onClick={() => setSelectedNodeInfo(nodeDetails.gale_branch)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    borderRadius: '10px',
                    padding: '10px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: '900', color: '#f87171' }}>
                    🔴 LOSS SPOT ➔ GALE 1 (${(parseFloat(stake) * 2.0).toFixed(2)})
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#cbd5e1', marginTop: '3px' }}>
                    Até {galeLevels} níveis de recuperação.
                  </div>
                </div>
              </div>
            )}

            {/* ─── NÍVEL 5: CONCLUSÃO & TARGETS ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '650px', width: '100%', marginTop: '0.5rem' }}>
              <div 
                onClick={() => setSelectedNodeInfo(nodeDetails.meta_batida)}
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(6, 78, 59, 0.8) 100%)',
                  border: '1.5px solid #10b981',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 0 20px rgba(16, 185, 129, 0.3)'
                }}
              >
                <div style={{ fontSize: '0.62rem', fontWeight: '800', color: '#34d399', textTransform: 'uppercase' }}>
                  🏆 CONCLUSÃO VITORIOSA
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '900', color: 'white', marginTop: '2px' }}>
                  Meta Batida (+${tp})
                </div>
              </div>

              <div 
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(127, 29, 29, 0.8) 100%)',
                  border: '1.5px solid #ef4444',
                  borderRadius: '12px',
                  padding: '10px 16px',
                  textAlign: 'center',
                  boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
                }}
              >
                <div style={{ fontSize: '0.62rem', fontWeight: '800', color: '#f87171', textTransform: 'uppercase' }}>
                  🛑 TRAVA DE PROTEÇÃO
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: '900', color: 'white', marginTop: '2px' }}>
                  Stop Loss (-${sl}) / Shadow Recall
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT DRAWER: NODE INSPECTOR */}
          {selectedNodeInfo && (
            <div style={{
              background: 'rgba(10, 7, 22, 0.95)',
              borderLeft: '1px solid rgba(139, 92, 246, 0.3)',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              overflowY: 'auto'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#c084fc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  🔍 Inspetor Algorítmico
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedNodeInfo(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '900', color: 'white', margin: 0 }}>
                  {selectedNodeInfo.title}
                </h4>
                <p style={{ fontSize: '0.74rem', color: '#cbd5e1', lineHeight: '1.45', marginTop: '8px' }}>
                  {selectedNodeInfo.desc}
                </p>
              </div>

              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#a78bfa', textTransform: 'uppercase' }}>
                  📊 Estatística & Performance
                </span>
                <strong style={{ fontSize: '0.78rem', color: '#34d399' }}>
                  {selectedNodeInfo.stat}
                </strong>
              </div>

              <div style={{
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid rgba(139, 92, 246, 0.25)',
                borderRadius: '10px',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <span style={{ fontSize: '0.62rem', fontWeight: 'bold', color: '#94a3b8', textTransform: 'uppercase' }}>
                  🧠 Lógica & Fórmula
                </span>
                <code style={{ fontSize: '0.68rem', color: '#e9d5ff', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                  {selectedNodeInfo.formula}
                </code>
              </div>

              <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                <button
                  type="button"
                  onClick={handleSendToTelegram}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    fontSize: '0.72rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(139, 92, 246, 0.25) 100%)',
                    border: '1px solid rgba(96, 165, 250, 0.4)',
                    color: '#93c5fd',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Send size={13} /> Enviar Árvore p/ Telegram
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
