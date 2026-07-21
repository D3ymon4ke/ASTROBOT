import React, { useState, useEffect } from 'react';
import { 
  Users, MessageSquare, Heart, Share2, Globe, Lock, Plus, Search, 
  Award, Sparkles, Clock, Coins, ChevronDown, ChevronUp, Trash, 
  Flame, Rocket, ThumbsUp, Gem, ShieldAlert
} from 'lucide-react';

const getBaseRestUrl = () => {
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  return isLocal ? 'http://localhost:8080' : 'https://187-127-40-228.sslip.io';
};

export default function CommunityFeed({ userEmail, userName, profileImage }) {
  const [activeSubTab, setActiveSubTab] = useState('feed'); // 'feed' | 'ranking'
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [rankingData, setRankingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [commentInputs, setCommentInputs] = useState({}); // { postId: string }
  const [expandedComments, setExpandedComments] = useState({}); // { postId: boolean }
  const [commentText, setCommentText] = useState('');
  
  // Custom manual post sharing modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareComment, setShareComment] = useState('');
  const [shareIsPublic, setShareIsPublic] = useState(true);
  const [shareSessionData, setShareSessionData] = useState({
    profit: 15.50,
    tradesTotal: 8,
    winRate: 87.5,
    strategy: 'AI Autopilot PRO',
    symbol: 'Volatility 10 (1s) Index',
    sessionTime: 420, // 7 minutes
    metaHit: true
  });

  const REST_URL = getBaseRestUrl();

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${REST_URL}/api/community/posts?filter=${filter}&email=${encodeURIComponent(userEmail)}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Error fetching community posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRanking = async () => {
    setRankingLoading(true);
    try {
      const res = await fetch(`${REST_URL}/api/community/ranking`);
      if (res.ok) {
        const data = await res.json();
        setRankingData(data);
      }
    } catch (err) {
      console.error('Error fetching social rankings:', err);
    } finally {
      setRankingLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'feed') {
      fetchPosts();
    } else {
      fetchRanking();
    }
  }, [activeSubTab, filter]);

  const handleLike = async (postId) => {
    try {
      const res = await fetch(`${REST_URL}/api/community/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: data.likes } : p));
      }
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleReact = async (postId, reaction) => {
    try {
      const res = await fetch(`${REST_URL}/api/community/posts/${postId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, reaction })
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, reactions: data.reactions } : p));
      }
    } catch (err) {
      console.error('Error reacting to post:', err);
    }
  };

  const handleComment = async (e, postId) => {
    e.preventDefault();
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    try {
      const res = await fetch(`${REST_URL}/api/community/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, text })
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: data.comments } : p));
        setCommentInputs(prev => ({ ...prev, [postId]: '' }));
      }
    } catch (err) {
      console.error('Error commenting on post:', err);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await fetch(`${REST_URL}/api/community/posts/${postId}/comment/${commentId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: data.comments } : p));
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleShare = async (postId) => {
    try {
      const res = await fetch(`${REST_URL}/api/community/posts/${postId}/share`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setPosts(prev => prev.map(p => p.id === postId ? { ...p, shares: data.shares } : p));
        // Copy to clipboard placeholder
        navigator.clipboard.writeText(`Resultado ASTROBOT compartilhado! Confira no feed.`);
        alert('Link copiado para a área de transferência!');
      }
    } catch (err) {
      console.error('Error sharing post:', err);
    }
  };

  const handleCreatePost = async () => {
    try {
      const res = await fetch(`${REST_URL}/api/community/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          comment: shareComment,
          isPublic: shareIsPublic,
          sessionData: shareSessionData
        })
      });
      if (res.ok) {
        setShowShareModal(false);
        setShareComment('');
        fetchPosts();
      }
    } catch (err) {
      console.error('Error sharing session result:', err);
    }
  };

  const toggleCommentsExpansion = (postId) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const formatTime = (seconds) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const date = new Date(ts);
    return date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  };

  return (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'white' }}>
      
      {/* Header with Beta Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users style={{ color: 'var(--primary-light)' }} /> Feed da Comunidade
          </h2>
          <span style={{ 
            fontSize: '0.6rem', 
            background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)', 
            color: 'white', 
            padding: '2px 8px', 
            borderRadius: '10px', 
            fontWeight: 'bold', 
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            BETA EXPERIMENTAL
          </span>
        </div>

        {/* Action button to post session manual */}
        <button 
          onClick={() => setShowShareModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--primary)',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: '600',
            fontSize: '0.8rem',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = 'var(--primary-light)'}
          onMouseOut={(e) => e.target.style.background = 'var(--primary)'}
        >
          <Plus size={16} /> Compartilhar Resultado
        </button>
      </div>

      {/* Main Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)', 
        paddingBottom: '2px',
        gap: '20px'
      }}>
        <button 
          onClick={() => setActiveSubTab('feed')}
          style={{
            background: 'none',
            border: 'none',
            color: activeSubTab === 'feed' ? 'var(--primary-light)' : 'var(--text-muted)',
            borderBottom: activeSubTab === 'feed' ? '2px solid var(--primary-light)' : '2px solid transparent',
            padding: '8px 12px',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          📰 Publicações da Comunidade
        </button>
        <button 
          onClick={() => setActiveSubTab('ranking')}
          style={{
            background: 'none',
            border: 'none',
            color: activeSubTab === 'ranking' ? 'var(--primary-light)' : 'var(--text-muted)',
            borderBottom: activeSubTab === 'ranking' ? '2px solid var(--primary-light)' : '2px solid transparent',
            padding: '8px 12px',
            fontWeight: '700',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          🏆 Rankings Sociais
        </button>
      </div>

      {activeSubTab === 'feed' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          {/* Filters Bar */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            flexWrap: 'wrap', 
            background: 'rgba(255, 255, 255, 0.02)', 
            padding: '10px', 
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            alignItems: 'center'
          }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 'bold', marginRight: '6px' }}>
              FILTRAR FEED:
            </span>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'my_friends', label: 'Amigos' },
              { id: 'only_mine', label: 'Minhas Sessões' },
              { id: 'biggest_profits', label: 'Maiores Lucros' },
              { id: 'most_recent', label: 'Mais Recentes' },
              { id: 'most_liked', label: 'Mais Relevantes' },
              { id: 'meta_hit', label: 'Meta Batida' },
              { id: 'positive_sessions', label: 'Apenas Positivos' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                style={{
                  background: filter === f.id ? 'var(--primary-light)' : 'rgba(255,255,255,0.04)',
                  color: filter === f.id ? 'white' : 'var(--text-muted)',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Loader or Posts List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Carregando feed da comunidade...
            </div>
          ) : posts.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '4rem 2rem', 
              background: 'rgba(255, 255, 255, 0.01)', 
              borderRadius: '12px',
              border: '1px dashed rgba(255,255,255,0.06)'
            }}>
              <span style={{ fontSize: '2rem' }}>🤔</span>
              <p style={{ margin: '10px 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Nenhuma publicação encontrada para este filtro.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {posts.map((post) => {
                const profitColor = post.profit >= 0 ? '#10b981' : '#ef4444';
                const hasLiked = post.likes?.includes(userEmail.toLowerCase());
                const commentsList = post.comments || [];
                const isExpanded = expandedComments[post.id];

                return (
                  <div 
                    key={post.id} 
                    style={{
                      background: 'var(--card-bg)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
                      backdropFilter: 'blur(4px)'
                    }}
                  >
                    
                    {/* Post Author info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%', 
                          background: 'rgba(255,255,255,0.05)', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          {post.profileImage ? (
                            <img src={post.profileImage} alt={post.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{post.userName?.slice(0,2).toUpperCase()}</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '700' }}>{post.userName}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{formatDate(post.timestamp)}</div>
                        </div>
                      </div>
                      
                      {/* Privacy Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {post.isPublic ? (
                          <span style={{ fontSize: '0.62rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '20px' }}>
                            <Globe size={10} /> Público
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.62rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(245, 158, 17, 0.1)', padding: '2px 8px', borderRadius: '20px' }}>
                            <Lock size={10} /> Privado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Optional User Commentary */}
                    {post.comment && (
                      <p style={{ margin: '4px 0', fontSize: '0.85rem', lineHeight: '1.4', color: '#cbd5e1' }}>
                        "{post.comment}"
                      </p>
                    )}

                    {/* Operational Session Stats Card */}
                    <div style={{ 
                      background: 'rgba(9, 9, 15, 0.45)', 
                      border: '1px solid rgba(255, 255, 255, 0.03)',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>RESULTADO DA SESSÃO</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '800', color: profitColor }}>
                          {post.profit >= 0 ? '+' : ''}${post.profit.toFixed(2)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>ASSERTIVIDADE</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#38bdf8' }}>
                          {post.winRate.toFixed(1)}%
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>OPERAÇÕES</span>
                        <span style={{ fontSize: '1.05rem', fontWeight: '800' }}>
                          {post.tradesTotal} trades
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>ESTRATÉGIA</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--primary-light)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={post.strategy}>
                          {post.strategy}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>ATIVO</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={post.symbol}>
                          {post.symbol}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>DURAÇÃO</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: '700' }}>
                          {formatTime(post.sessionTime)}
                        </span>
                      </div>
                      {post.metaHit && (
                        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ 
                            background: 'rgba(16, 185, 129, 0.15)', 
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#10b981', 
                            fontSize: '0.62rem', 
                            fontWeight: 'bold', 
                            padding: '1px 8px', 
                            borderRadius: '4px',
                            textTransform: 'uppercase'
                          }}>
                            🎯 META BATIDA DO DIA!
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Social Interactions Bar */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      borderTop: '1px solid rgba(255,255,255,0.04)', 
                      paddingTop: '10px',
                      flexWrap: 'wrap',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                        
                        {/* Like button */}
                        <button 
                          onClick={() => handleLike(post.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: hasLiked ? '#ef4444' : 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: '600'
                          }}
                        >
                          <Heart size={15} fill={hasLiked ? '#ef4444' : 'none'} /> {post.likes?.length || 0} Curtidas
                        </button>

                        {/* Collapsible comment button */}
                        <button 
                          onClick={() => toggleCommentsExpansion(post.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            fontSize: '0.78rem',
                            fontWeight: '600'
                          }}
                        >
                          <MessageSquare size={15} /> {commentsList.length} Comentários
                        </button>
                      </div>

                      {/* Custom Reactions (🔥 🚀 👏 💎) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.02)', padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        {[
                          { emoji: '🔥', label: 'Quente' },
                          { emoji: '🚀', label: 'Foguete' },
                          { emoji: '👏', label: 'Palmas' },
                          { emoji: '💎', label: 'Diamante' }
                        ].map((r) => {
                          const usersReacted = post.reactions?.[r.emoji] || [];
                          const hasReacted = usersReacted.includes(userEmail.toLowerCase());
                          return (
                            <button
                              key={r.emoji}
                              onClick={() => handleReact(post.id, r.emoji)}
                              title={r.label}
                              style={{
                                background: hasReacted ? 'rgba(139, 92, 246, 0.2)' : 'none',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                padding: '3px 6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                transition: 'background 0.2s'
                              }}
                            >
                              <span>{r.emoji}</span>
                              <span style={{ fontSize: '0.62rem', color: hasReacted ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                                {usersReacted.length}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Share button */}
                      <button 
                        onClick={() => handleShare(post.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: '600'
                        }}
                      >
                        <Share2 size={15} /> Compartilhar
                      </button>
                    </div>

                    {/* Comments Section */}
                    {isExpanded && (
                      <div style={{ 
                        borderTop: '1px solid rgba(255,255,255,0.03)', 
                        paddingTop: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}>
                        {/* Add Comment Input */}
                        <form onSubmit={(e) => handleComment(e, post.id)} style={{ display: 'flex', gap: '8px' }}>
                          <input 
                            type="text" 
                            placeholder="Escreva um comentário..."
                            value={commentInputs[post.id] || ''}
                            onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                            style={{
                              flex: 1,
                              background: 'rgba(255,255,255,0.03)',
                              border: '1px solid var(--border)',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              fontSize: '0.78rem',
                              color: 'white',
                              outline: 'none'
                            }}
                          />
                          <button 
                            type="submit"
                            style={{
                              background: 'var(--primary-light)',
                              color: 'white',
                              border: 'none',
                              padding: '8px 14px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                          >
                            Comentar
                          </button>
                        </form>

                        {/* List of comments */}
                        {commentsList.length === 0 ? (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>
                            Nenhum comentário ainda. Seja o primeiro a comentar!
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                            {commentsList.map((c) => (
                              <div key={c.id} style={{ 
                                display: 'flex', 
                                gap: '8px', 
                                background: 'rgba(255,255,255,0.01)', 
                                padding: '8px', 
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.02)'
                              }}>
                                <div style={{ 
                                  width: '24px', 
                                  height: '24px', 
                                  borderRadius: '50%', 
                                  background: 'rgba(255,255,255,0.05)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  overflow: 'hidden',
                                  fontSize: '0.6rem'
                                }}>
                                  {c.profileImage ? (
                                    <img src={c.profileImage} alt={c.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  ) : (
                                    <span>{c.userName?.slice(0,2).toUpperCase()}</span>
                                  )}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>{c.userName}</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{formatDate(c.timestamp)}</span>
                                      {c.email.toLowerCase() === userEmail.toLowerCase() && (
                                        <button 
                                          onClick={() => handleDeleteComment(post.id, c.id)}
                                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                        >
                                          <Trash size={11} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#cbd5e1' }}>{c.text}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeSubTab === 'ranking' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          
          {rankingLoading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Carregando rankings da comunidade...
            </div>
          ) : !rankingData ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              Sem dados de ranking disponíveis.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              
              {/* Card: Maiores Lucros da Semana */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award style={{ color: '#eab308' }} size={16} /> 🚀 Maiores Lucros (Semana)
                </h3>
                {rankingData.topWeeklyProfits?.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum lucro registrado nesta semana.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rankingData.topWeeklyProfits.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : '#b45309' }}>#{idx+1}</span>
                          <span style={{ fontWeight: '600' }}>{item.userName}</span>
                        </div>
                        <span style={{ fontWeight: '800', color: '#10b981' }}>+${item.profit.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card: Maiores Lucros do Mês */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award style={{ color: '#eab308' }} size={16} /> 🏆 Maiores Lucros (Mês)
                </h3>
                {rankingData.topMonthlyProfits?.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum lucro registrado neste mês.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rankingData.topMonthlyProfits.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : '#b45309' }}>#{idx+1}</span>
                          <span style={{ fontWeight: '600' }}>{item.userName}</span>
                        </div>
                        <span style={{ fontWeight: '800', color: '#10b981' }}>+${item.profit.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card: Mais Curtidos */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Heart style={{ color: '#ef4444' }} size={16} fill="#ef4444" /> ❤️ Líderes de Curtidas
                </h3>
                {rankingData.mostLikedUsers?.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem curtidas registradas.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rankingData.mostLikedUsers.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : '#b45309' }}>#{idx+1}</span>
                          <span style={{ fontWeight: '600' }}>{item.userName}</span>
                        </div>
                        <span style={{ fontWeight: '700', color: '#cbd5e1' }}>{item.score} ❤️</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card: Mais Ativos */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Flame style={{ color: '#f97316' }} size={16} /> 🔥 Usuários Mais Ativos
                </h3>
                {rankingData.mostActiveUsers?.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem atividade registrada.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rankingData.mostActiveUsers.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : '#b45309' }}>#{idx+1}</span>
                          <span style={{ fontWeight: '600' }}>{item.userName}</span>
                        </div>
                        <span style={{ fontWeight: '700', color: '#cbd5e1' }}>{item.score} sessões</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card: Sequência de Metas */}
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: '800', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Gem style={{ color: '#06b6d4' }} size={16} /> 🎯 Maior Sequência de Metas
                </h3>
                {rankingData.bestStreaks?.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem metas sequenciais registradas.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rankingData.bestStreaks.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '6px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 'bold', color: idx === 0 ? '#eab308' : idx === 1 ? '#94a3b8' : '#b45309' }}>#{idx+1}</span>
                          <span style={{ fontWeight: '600' }}>{item.userName}</span>
                        </div>
                        <span style={{ fontWeight: '800', color: '#06b6d4' }}>{item.score} dias seguidos</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* Manual Share Session Modal Overlay */}
      {showShareModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(5px)'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '1.5rem',
            width: '90%',
            maxWidth: '500px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800' }}>📤 Compartilhar Sessão na Comunidade</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>COMENTÁRIO OPCIONAL</label>
              <textarea 
                rows={3} 
                placeholder="Ex: Meta batida rápido com o bot hoje! Excelente assertividade! 🚀"
                value={shareComment}
                onChange={(e) => setShareComment(e.target.value)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '0.8rem',
                  color: 'white',
                  resize: 'none',
                  outline: 'none'
                }}
              />
            </div>

            {/* Simulating session data values for manually testing post creation */}
            <div style={{ 
              background: 'rgba(255,255,255,0.02)', 
              borderRadius: '8px', 
              padding: '10px', 
              border: '1px solid rgba(255,255,255,0.05)',
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '10px'
            }}>
              <div>
                <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Lucro ($)</label>
                <input 
                  type="number" 
                  value={shareSessionData.profit} 
                  onChange={(e) => setShareSessionData(prev => ({ ...prev, profit: parseFloat(e.target.value || 0) }))}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Assertividade (%)</label>
                <input 
                  type="number" 
                  value={shareSessionData.winRate} 
                  onChange={(e) => setShareSessionData(prev => ({ ...prev, winRate: parseFloat(e.target.value || 0) }))}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Total Operações</label>
                <input 
                  type="number" 
                  value={shareSessionData.tradesTotal} 
                  onChange={(e) => setShareSessionData(prev => ({ ...prev, tradesTotal: parseInt(e.target.value || 0) }))}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', fontSize: '0.78rem' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Duração (Segundos)</label>
                <input 
                  type="number" 
                  value={shareSessionData.sessionTime} 
                  onChange={(e) => setShareSessionData(prev => ({ ...prev, sessionTime: parseInt(e.target.value || 0) }))}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', color: 'white', fontSize: '0.78rem' }}
                />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Meta Batida?</span>
                <input 
                  type="checkbox" 
                  checked={shareSessionData.metaHit}
                  onChange={(e) => setShareSessionData(prev => ({ ...prev, metaHit: e.target.checked }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Visibilidade:</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={() => setShareIsPublic(true)}
                  style={{
                    background: shareIsPublic ? 'rgba(16, 185, 129, 0.2)' : 'none',
                    border: '1px solid ' + (shareIsPublic ? '#10b981' : 'var(--border)'),
                    color: shareIsPublic ? '#10b981' : 'var(--text-muted)',
                    fontSize: '0.7rem',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Público
                </button>
                <button 
                  onClick={() => setShareIsPublic(false)}
                  style={{
                    background: !shareIsPublic ? 'rgba(245, 158, 11, 0.2)' : 'none',
                    border: '1px solid ' + (!shareIsPublic ? '#f59e0b' : 'var(--border)'),
                    color: !shareIsPublic ? '#f59e0b' : 'var(--text-muted)',
                    fontSize: '0.7rem',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Privado
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button 
                onClick={() => setShowShareModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreatePost}
                style={{
                  background: 'var(--primary-light)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  padding: '8px 16px',
                  cursor: 'pointer'
                }}
              >
                Publicar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
