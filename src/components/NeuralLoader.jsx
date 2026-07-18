import React, { useState, useEffect } from 'react';
import { Brain, Cpu, Radio, ShieldCheck, Zap } from 'lucide-react';

export default function NeuralLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    { label: 'Inicializando núcleo do ASTROBOT...', minProgress: 0 },
    { label: 'Conectando ao barramento de dados Deriv...', minProgress: 20 },
    { label: 'Carregando pesos neurais e sinapses...', minProgress: 45 },
    { label: 'Calculando estatísticas históricas dos ativos...', minProgress: 65 },
    { label: 'Calibrando motores probabilísticos...', minProgress: 85 },
    { label: 'Testando latência de execução (12ms)...', minProgress: 95 },
    { label: 'SISTEMA OPERACIONAL ESTÁVEL E ATIVO!', minProgress: 100 }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            onComplete();
          }, 600);
          return 100;
        }
        
        // Increase progress randomly for organic loading feel
        const inc = Math.floor(Math.random() * 8) + 4;
        const next = Math.min(100, prev + inc);
        
        // Determine active step based on progress
        let currentStep = 0;
        for (let i = 0; i < steps.length; i++) {
          if (next >= steps[i].minProgress) {
            currentStep = i;
          }
        }
        setActiveStep(currentStep);
        
        return next;
      });
    }, 180);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(9, 9, 15, 0.95)',
      backdropFilter: 'blur(20px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      flexDirection: 'column',
      color: 'white',
      fontFamily: 'var(--font-sans)'
    }}>
      {/* Decorative Neon Grid Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px)`,
        backgroundSize: '30px 30px',
        pointerEvents: 'none'
      }} />

      {/* Main Core Scanner */}
      <div style={{
        position: 'relative',
        width: '130px',
        height: '130px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '2rem'
      }}>
        {/* Outer Pulsing Glow */}
        <div style={{
          position: 'absolute',
          width: '130px',
          height: '130px',
          borderRadius: '50%',
          border: '1px solid rgba(139, 92, 246, 0.15)',
          animation: 'spin 10s linear infinite',
          boxShadow: '0 0 20px rgba(139, 92, 246, 0.1)'
        }} />
        
        {/* Middle Orbiting Ring */}
        <div style={{
          position: 'absolute',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          border: '2px dashed var(--primary)',
          animation: 'spin-reverse 6s linear infinite',
          opacity: 0.6
        }} />

        {/* Inner Glowing Core */}
        <div style={{
          width: '70px',
          height: '70px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, rgba(217, 70, 239, 0.1) 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          boxShadow: '0 0 30px rgba(139, 92, 246, 0.5)',
          animation: 'pulse-glow 2s infinite ease-in-out'
        }}>
          <Brain size={32} style={{ color: 'white', animation: 'pulse 2s infinite' }} />
        </div>
      </div>

      {/* Title */}
      <h2 style={{
        fontSize: '1.25rem',
        fontWeight: '900',
        letterSpacing: '2px',
        marginBottom: '0.5rem',
        color: 'white',
        textShadow: '0 0 10px rgba(139, 92, 246, 0.3)'
      }}>
        INICIALIZANDO MOTOR NEURAL
      </h2>
      
      <span style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        color: 'var(--primary-light)',
        marginBottom: '2rem',
        display: 'block'
      }}>
        QUANTUM CORE PROCESSOR // STEP {activeStep + 1} OF {steps.length}
      </span>

      {/* Progress container */}
      <div style={{
        width: '320px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        alignItems: 'center',
        marginBottom: '2.5rem'
      }}>
        <div style={{
          width: '100%',
          height: '6px',
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {/* Progress bar fill */}
          <div style={{
            width: `${progress}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--primary) 0%, var(--accent) 100%)',
            borderRadius: '10px',
            transition: 'width 0.15s ease',
            boxShadow: '0 0 10px rgba(139, 92, 246, 0.5)'
          }} />
        </div>

        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '0.7rem',
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-secondary)'
        }}>
          <span>STATUS: SYNCING</span>
          <strong style={{ color: 'white' }}>{progress}%</strong>
        </div>
      </div>

      {/* Typing Steps Console */}
      <div style={{
        width: '450px',
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        borderRadius: '8px',
        padding: '1rem',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.68rem',
        height: '140px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
      }}>
        {steps.slice(0, activeStep + 1).map((step, idx) => {
          const isCurrent = idx === activeStep;
          const isDone = idx < activeStep;
          return (
            <div key={idx} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              color: isDone ? 'var(--text-muted)' : (isCurrent ? 'white' : 'var(--text-secondary)'),
              transition: 'all 0.2s'
            }}>
              {isDone ? (
                <span style={{ color: 'var(--success)' }}>[OK]</span>
              ) : isCurrent && progress === 100 ? (
                <span style={{ color: 'var(--success)' }}>[OK]</span>
              ) : (
                <span style={{ color: 'var(--primary-light)', animation: 'pulse 1s infinite' }}>{"[>>]"}</span>
              )}
              <span>{step.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
