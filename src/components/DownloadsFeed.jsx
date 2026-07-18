import React, { useState } from 'react';
import { Download, Monitor, History, Cpu, Shield, ArrowRight, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import desktopIcon from '../assets/icon.png';

function parseInlineStyle(text) {
  if (!text) return '';
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} style={{ color: '#ffffff', fontWeight: 'bold' }}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} style={{
          background: 'rgba(255, 255, 255, 0.08)',
          color: '#f43f5e',
          padding: '2px 4px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          fontSize: '0.72rem'
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function renderChangelog(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, idx) => {
    if (line.startsWith('* ') || line.startsWith('- ')) {
      return (
        <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start', margin: '4px 0', fontSize: '0.75rem', color: '#cbd5e1' }}>
          <span style={{ color: '#a78bfa', marginTop: '2px' }}>•</span>
          <span>{parseInlineStyle(line.substring(2))}</span>
        </div>
      );
    }
    if (line.startsWith('### ')) {
      return (
        <h4 key={idx} style={{ fontSize: '0.8rem', fontWeight: 800, color: 'white', margin: '10px 0 4px 0' }}>
          {parseInlineStyle(line.substring(4))}
        </h4>
      );
    }
    return <p key={idx} style={{ margin: '4px 0', fontSize: '0.75rem', color: '#94a3b8' }}>{parseInlineStyle(line)}</p>;
  });
}

function ReleaseCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const date = new Date(item.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <div style={{
      background: 'rgba(255,255,255,0.01)',
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '12px',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      transition: 'all 0.2s'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src={desktopIcon} alt="Icon" style={{ width: '20px', height: '20px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }} />
          <strong style={{ fontSize: '0.85rem', color: 'white', fontFamily: 'monospace' }}>v{item.version}</strong>
          <span style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#cbd5e1',
            fontSize: '0.58rem',
            fontWeight: 'bold',
            padding: '1px 6px',
            borderRadius: '8px'
          }}>
            {item.os}
          </span>
        </div>
        <span style={{ fontSize: '0.62rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Calendar size={10} /> {date}
        </span>
      </div>

      {expanded && (
        <div style={{ 
          background: 'rgba(0,0,0,0.15)', 
          padding: '0.75rem', 
          borderRadius: '8px', 
          border: '1px solid rgba(255,255,255,0.02)',
          marginTop: '0.25rem' 
        }}>
          {renderChangelog(item.changelog)}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem' }}>
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#a78bfa',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {expanded ? <><ChevronUp size={12} /> Ocultar Changelog</> : <><ChevronDown size={12} /> Ver Changelog</>}
        </button>

        <a
          href={item.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '0.35rem 0.75rem',
            borderRadius: '6px',
            color: 'white',
            fontSize: '0.65rem',
            fontWeight: 'bold',
            textDecoration: 'none',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
        >
          <Download size={11} /> Baixar
        </a>
      </div>
    </div>
  );
}

export default function DownloadsFeed({ downloads = [], loading = false }) {
  const activeDownloads = downloads.filter(d => d.active);
  const latest = activeDownloads.length > 0 ? activeDownloads[0] : null;
  const history = activeDownloads.length > 1 ? activeDownloads.slice(1) : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(139, 92, 246, 0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(139, 92, 246, 0.15)', overflow: 'hidden' }}>
          <img src={desktopIcon} alt="ASTROBOT Desktop" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: '800', color: 'white', margin: 0 }}>ASTROBOT DESKTOP</h2>
          <p style={{ fontSize: '0.65rem', color: '#64748b', margin: '2px 0 0 0' }}>Baixe a versão nativa de alta performance e aproveite recursos exclusivos de automação.</p>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: '0.8rem' }}>Carregando links de downloads...</div>
        </div>
      ) : !latest ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <Monitor size={42} style={{ opacity: 0.2 }} />
          <h4 style={{ color: 'white', margin: 0 }}>Nenhum instalador publicado</h4>
          <p style={{ fontSize: '0.75rem', margin: 0 }}>Nenhum instalador da versão desktop foi publicado pela administração ainda.</p>
        </div>
      ) : (
        <>
          {/* Recommended Latest version banner card */}
          <div className="glass-panel" style={{
            position: 'relative',
            padding: '2rem',
            background: 'radial-gradient(circle at top right, rgba(139, 92, 246, 0.12) 0%, rgba(14, 11, 24, 0.7) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '2rem',
            overflow: 'hidden'
          }}>
            {/* Ambient light glow decorator */}
            <div style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '180px',
              height: '180px',
              background: '#8b5cf6',
              filter: 'blur(75px)',
              opacity: 0.35,
              pointerEvents: 'none'
            }} />

            <div style={{ flex: 1, minWidth: '280px', zIndex: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  fontSize: '0.6rem',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  letterSpacing: '0.5px'
                }}>
                  VERSÃO RECOMENDADA
                </span>
                <span style={{
                  background: 'rgba(167, 139, 250, 0.1)',
                  border: '1px solid rgba(167, 139, 250, 0.3)',
                  color: '#cbd5e1',
                  fontSize: '0.6rem',
                  fontWeight: 'bold',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <Monitor size={10} /> {latest.os}
                </span>
              </div>

              <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'white', margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <img src={desktopIcon} alt="Icon" style={{ width: '38px', height: '38px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 0 10px rgba(139, 92, 246, 0.2)' }} />
                ASTROBOT <span style={{ color: '#a78bfa', fontSize: '1.15rem', fontFamily: 'monospace' }}>v{latest.version}</span>
              </h2>
              
              <p style={{ fontSize: '0.7rem', color: '#64748b', margin: '0 0 1.25rem 0' }}>
                Lançado em {new Date(latest.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>

              <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
                <strong style={{ fontSize: '0.68rem', color: '#a78bfa', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Destaques da Atualização</strong>
                <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  {renderChangelog(latest.changelog)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', minWidth: '220px', zIndex: 2 }}>
              <a
                href={latest.downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '0.9rem 1.5rem',
                  background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                  color: 'white',
                  fontWeight: '900',
                  fontSize: '0.8rem',
                  borderRadius: '10px',
                  textDecoration: 'none',
                  boxShadow: '0 4px 15px rgba(139, 92, 246, 0.4)',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <Download size={15} /> BAIXAR INSTALADOR (.EXE)
              </a>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.6rem', color: '#64748b' }}>
                <Shield size={11} style={{ color: '#10b981' }} />
                <span>Arquivo verificado e seguro para instalação.</span>
              </div>
            </div>
          </div>

          {/* Historical Versions releases */}
          {history.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                <History size={14} style={{ color: '#64748b' }} />
                <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#cbd5e1', letterSpacing: '0.04em', margin: 0 }}>HISTÓRICO DE VERSÕES ANTERIORES</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {history.map(item => (
                  <ReleaseCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
