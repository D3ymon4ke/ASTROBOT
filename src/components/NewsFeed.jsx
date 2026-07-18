import React, { useState } from 'react';
import { Newspaper, Pin, ChevronDown, ChevronUp, Calendar, Tag } from 'lucide-react';
import desktopIcon from '../assets/icon.png';

const TAG_INFO = {
  patch: { label: '🔧 Patch Notes', color: '#8b5cf6' },
  novidade: { label: '✨ Novidade', color: '#22c55e' },
  aviso: { label: '⚠️ Aviso', color: '#f59e0b' },
  manutencao: { label: '🔴 Manutenção', color: '#ef4444' },
};

// Render inline images from markdown-like syntax
function renderContent(text) {
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);
  return parts.map((part, i) => {
    const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      return (
        <img
          key={i}
          src={imgMatch[2]}
          alt={imgMatch[1]}
          style={{ maxWidth: '100%', borderRadius: '10px', margin: '0.75rem 0', display: 'block' }}
        />
      );
    }
    return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
  });
}

function PostCard({ post, isRead, onMarkRead }) {
  const [expanded, setExpanded] = useState(false);
  const tagInfo = TAG_INFO[post.tag] || TAG_INFO.novidade;
  const date = new Date(post.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric'
  });
  
  const isVersionPost = post.tag === 'patch' || 
    /v\d+/i.test(post.title) || 
    /vers[ãa]o/i.test(post.title) || 
    post.title.toLowerCase().includes('desktop');

  const handleExpand = () => {
    setExpanded(v => !v);
    if (!isRead) onMarkRead(post.id);
  };

  return (
    <div style={{
      background: isRead ? 'rgba(255,255,255,0.01)' : 'rgba(139,92,246,0.04)',
      border: isRead ? '1px solid rgba(255,255,255,0.05)' : '1px solid rgba(139,92,246,0.25)',
      borderRadius: '14px',
      overflow: 'hidden',
      transition: 'all 0.2s',
      boxShadow: isRead ? 'none' : '0 0 15px rgba(139,92,246,0.08)'
    }}>
      {/* Cover image */}
      {post.coverImage && (
        <div style={{ position: 'relative' }}>
          <img
            src={post.coverImage}
            alt={post.title}
            style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }}
          />
          {!isRead && (
            <span style={{
              position: 'absolute', top: '10px', right: '10px',
              background: 'rgba(139,92,246,0.9)', color: 'white',
              fontSize: '0.62rem', fontWeight: '800', padding: '2px 8px', borderRadius: '10px',
              backdropFilter: 'blur(4px)', letterSpacing: '0.5px'
            }}>
              NOVO
            </span>
          )}
          {post.pinned && (
            <span style={{
              position: 'absolute', top: '10px', left: '10px',
              background: 'rgba(245,158,11,0.85)', color: 'white',
              fontSize: '0.62rem', fontWeight: '800', padding: '2px 8px', borderRadius: '10px',
              backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              <Pin size={10} /> FIXADO
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
          {!post.coverImage && !isRead && (
            <span style={{ background: 'rgba(139,92,246,0.9)', color: 'white', fontSize: '0.6' + 'rem', fontWeight: '800', padding: '2px 8px', borderRadius: '10px', letterSpacing: '0.5px' }}>
              NOVO
            </span>
          )}
          {!post.coverImage && post.pinned && (
            <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.6rem', fontWeight: 'bold', padding: '2px 6px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Pin size={9} /> Fixado
            </span>
          )}
          <span style={{
            fontSize: '0.62rem', fontWeight: 'bold',
            color: tagInfo.color,
            background: `${tagInfo.color}18`,
            border: `1px solid ${tagInfo.color}40`,
            padding: '2px 8px', borderRadius: '10px'
          }}>
            {tagInfo.label}
          </span>
          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
            <Calendar size={10} /> {date}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'white', margin: '0 0 0.4rem 0', lineHeight: '1.3', flex: 1 }}>
            {post.title}
          </h3>
          {isVersionPost && (
            <img 
              src={desktopIcon} 
              alt="ASTROBOT Desktop" 
              style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '8px', 
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: '0 0 10px rgba(139, 92, 246, 0.2)',
                flexShrink: 0 
              }} 
            />
          )}
        </div>

        {!expanded && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {post.content.replace(/!\[.*?\]\(.*?\)/g, '').substring(0, 200)}
          </p>
        )}

        {expanded && (
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginTop: '0.5rem' }}>
            {renderContent(post.content)}
          </div>
        )}

        <button
          onClick={handleExpand}
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--primary-light)', fontSize: '0.75rem', fontWeight: 'bold',
            cursor: 'pointer', padding: '0.5rem 0 0 0', display: 'flex', alignItems: 'center', gap: '4px'
          }}
        >
          {expanded ? <><ChevronUp size={14} /> Recolher</> : <><ChevronDown size={14} /> Ler mais</>}
        </button>
      </div>
    </div>
  );
}

export default function NewsFeed({ posts = [], loading = false }) {
  const STORAGE_KEY = 'astrobot_read_posts';

  const getReadIds = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch { return []; }
  };

  const [readIds, setReadIds] = useState(getReadIds);
  const [filterTag, setFilterTag] = useState('all');

  const handleMarkRead = (postId) => {
    const updated = [...new Set([...readIds, postId])];
    setReadIds(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const handleMarkAllRead = () => {
    const allIds = posts.map(p => p.id);
    const updated = [...new Set([...readIds, ...allIds])];
    setReadIds(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const pinnedPosts = posts.filter(p => p.pinned);
  const regularPosts = posts.filter(p => !p.pinned);
  const allSorted = [...pinnedPosts, ...regularPosts];

  const filtered = filterTag === 'all' ? allSorted : allSorted.filter(p => p.tag === filterTag);
  const unreadCount = posts.filter(p => !readIds.includes(p.id)).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Newspaper size={20} style={{ color: 'var(--primary-light)' }} />
          <h2 style={{ fontSize: '1rem', fontWeight: '800', color: 'white', margin: 0 }}>NOVIDADES & PATCH NOTES</h2>
          {unreadCount > 0 && (
            <span style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem', fontWeight: '800', padding: '2px 7px', borderRadius: '10px', minWidth: '18px', textAlign: 'center' }}>
              {unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Tag filter */}
          {['all', 'patch', 'novidade', 'aviso', 'manutencao'].map(t => {
            const info = t === 'all' ? { label: 'Todos', color: '#94a3b8' } : (TAG_INFO[t] || {});
            return (
              <button
                key={t}
                onClick={() => setFilterTag(t)}
                style={{
                  padding: '3px 10px', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '20px', cursor: 'pointer',
                  background: filterTag === t ? (t === 'all' ? 'rgba(255,255,255,0.1)' : `${info.color}20`) : 'rgba(255,255,255,0.03)',
                  border: filterTag === t ? `1px solid ${t === 'all' ? 'rgba(255,255,255,0.2)' : `${info.color}60`}` : '1px solid rgba(255,255,255,0.05)',
                  color: filterTag === t ? (t === 'all' ? 'white' : info.color) : 'var(--text-muted)',
                  transition: 'all 0.15s'
                }}
              >
                {t === 'all' ? 'Todos' : info.label}
              </button>
            );
          })}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              style={{ padding: '3px 10px', fontSize: '0.7rem', fontWeight: 'bold', borderRadius: '20px', cursor: 'pointer', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: 'var(--success)' }}
            >
              Marcar tudo como lido
            </button>
          )}
        </div>
      </div>

      {/* Feed */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '0.85rem' }}>Carregando publicações...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', gap: '0.75rem', textAlign: 'center' }}>
          <Newspaper size={40} strokeWidth={1.2} />
          <strong style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>Nenhuma publicação ainda</strong>
          <span style={{ fontSize: '0.82rem' }}>As novidades e atualizações do ASTROBOT aparecerão aqui.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filtered.map(post => (
            <PostCard
              key={post.id}
              post={post}
              isRead={readIds.includes(post.id)}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Export unread count helper for badge in nav
export function getUnreadCount(posts) {
  try {
    const readIds = JSON.parse(localStorage.getItem('astrobot_read_posts') || '[]');
    return posts.filter(p => !readIds.includes(p.id)).length;
  } catch { return 0; }
}
