import React, { useState, useEffect } from 'react';
import { 
  Users, MessageSquare, Heart, Share2, Globe, Lock, Plus, Search, 
  Award, Sparkles, Clock, Coins, ChevronDown, ChevronUp, Trash, 
  Flame, Rocket, ThumbsUp, Gem, ShieldAlert, TrendingUp, TrendingDown,
  CheckCircle2, Send, MoreHorizontal, User, Trophy, Star, Eye, Info
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
  const [shareComment, setShareComment] = useState('');
  const [shareIsPublic, setShareIsPublic] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Custom manual post sharing modal states
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
        
        // Dynamic clipboard content copying
        const post = posts.find(p => p.id === postId);
        const shareText = `🚀 ASTROBOT • Resultado Compartilhado!\n👤 Usuário: ${post?.userName}\n📈 Lucro da Sessão: ${post?.profit >= 0 ? '+' : ''}$${post?.profit.toFixed(2)}\n🎯 Win Rate: ${post?.winRate.toFixed(1)}%\n🤖 Estratégia: ${post?.strategy}\n📊 Ativo: ${post?.symbol}\nConsulte na plataforma!`;
        
        navigator.clipboard.writeText(shareText);
        alert('Dados do resultado copiados com sucesso! Compartilhe onde desejar.');
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

  const getRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const now = Date.now();
    const diff = now - new Date(timestamp).getTime();
    const secs = Math.floor(diff / 1000);
    const mins = Math.floor(secs / 60);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (secs < 60) return 'Agora mesmo';
    if (mins < 60) return `há ${mins} min`;
    if (hours < 24) return `há ${hours} h`;
    return `há ${days} dias`;
  };

  // Modern Avatar background generator
  const getAvatarGradient = (name) => {
    const colors = [
      'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
      'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
      'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      'linear-gradient(135deg, #10b981 0%, #047857 100%)',
      'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
    ];
    let hash = 0;
    const cleanName = name || 'User';
    for (let i = 0; i < cleanName.length; i++) {
      hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

  return (
    <div style={{ padding: '0 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', color: 'white', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* CSS Stylesheet Injector for smooth transitions, micro-animations, and glassmorphism */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes feedCardEntrance {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .feed-card {
          animation: feedCardEntrance 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          background: rgba(15, 11, 28, 0.45);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
        }
        .feed-card:hover {
          border-color: rgba(139, 92, 246, 0.3);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          transform: translateY(-2px);
        }
        .reaction-pill {
          transition: transform 0.2s, background-color 0.2s;
        }
        .reaction-pill:hover {
          transform: scale(1.1);
          background-color: rgba(255, 255, 255, 0.08) !important;
        }
        .action-btn {
          transition: color 0.2s, transform 0.15s;
        }
        .action-btn:hover {
          color: white !important;
        }
        .action-btn:active {
          transform: scale(0.95);
        }
        .discord-comment {
          transition: background-color 0.15s;
        }
        .discord-comment:hover {
          background-color: rgba(255, 255, 255, 0.02) !important;
        }
        .ranking-card {
          background: rgba(15, 11, 28, 0.35);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 16px;
          padding: 1.25rem;
          transition: all 0.25s;
        }
        .ranking-card:hover {
          border-color: rgba(139, 92, 246, 0.2);
          transform: translateY(-3px);
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
        }
      `}} />

      {/* HEADER SECTION (Futuristic Banner Style) */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(217, 70, 239, 0.05) 100%)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '20px',
        padding: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ 
            background: 'rgba(139, 92, 246, 0.15)', 
            padding: '0.8rem', 
            borderRadius: '16px', 
            color: 'var(--primary-light)',
            boxShadow: 'inset 0 0 12px rgba(139, 92, 246, 0.3)'
          }}>
            <Users size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: '900', margin: 0, letterSpacing: '-0.5px' }}>ASTROBOT Social</h2>
              <span style={{ 
                fontSize: '0.55rem', 
                background: 'linear-gradient(90deg, #a855f7, #ec4899)', 
                color: 'white', 
                padding: '2px 8px', 
                borderRadius: '8px', 
                fontWeight: 'bold', 
                letterSpacing: '0.5px'
              }}>
                BETA
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              A rede social exclusiva para compartilhamento de estratégias, metas e resultados diários.
            </p>
          </div>
        </div>

        {/* Action Button: Share session result */}
        <button 
          onClick={() => setShowShareModal(true)}
          className="action-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'linear-gradient(90deg, var(--primary) 0%, #7c3aed 100%)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '0.8rem',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(124, 58, 237, 0.3)',
            borderTop: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          <Plus size={16} /> Compartilhar Resultado
        </button>
      </div>

      {/* TABS SWITCHER (Twitter/Discord Hybrid Navigation) */}
      <div style={{ 
        display: 'flex', 
        background: 'rgba(0, 0, 0, 0.2)', 
        borderRadius: '14px', 
        padding: '4px',
        alignSelf: 'flex-start',
        border: '1px solid rgba(255, 255, 255, 0.03)'
      }}>
        <button 
          onClick={() => setActiveSubTab('feed')}
          style={{
            background: activeSubTab === 'feed' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            border: 'none',
            color: activeSubTab === 'feed' ? 'var(--primary-light)' : 'var(--text-secondary)',
            padding: '8px 18px',
            borderRadius: '10px',
            fontWeight: '800',
            cursor: 'pointer',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          📰 Feed Global
        </button>
        <button 
          onClick={() => setActiveSubTab('ranking')}
          style={{
            background: activeSubTab === 'ranking' ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
            border: 'none',
            color: activeSubTab === 'ranking' ? 'var(--primary-light)' : 'var(--text-secondary)',
            padding: '8px 18px',
            borderRadius: '10px',
            fontWeight: '800',
            cursor: 'pointer',
            fontSize: '0.78rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
        >
          🏆 Liga & Rankings
        </button>
      </div>

      {activeSubTab === 'feed' && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 320px', 
          gap: '1.5rem',
          alignItems: 'start'
        }}>
          
          {/* LEFT SIDE: FEED FEED STREAM */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Filter chips bar (X/Twitter inspired) */}
            <div style={{ 
              display: 'flex', 
              gap: '6px', 
              overflowX: 'auto',
              paddingBottom: '2px',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: '900', letterSpacing: '0.5px', textTransform: 'uppercase', marginRight: '6px' }}>
                Filtros:
              </span>
              {[
                { id: 'all', label: 'Tudo' },
                { id: 'only_mine', label: 'Minhas Sessões' },
                { id: 'biggest_profits', label: 'Maiores Lucros 💰' },
                { id: 'most_recent', label: 'Recentes 🕒' },
                { id: 'meta_hit', label: 'Meta Batida 🎯' },
                { id: 'positive_sessions', label: 'Lucrativos 👍' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  style={{
                    background: filter === f.id ? 'var(--primary)' : 'rgba(255,255,255,0.03)',
                    color: filter === f.id ? 'white' : 'var(--text-secondary)',
                    border: '1px solid ' + (filter === f.id ? 'transparent' : 'rgba(255,255,255,0.05)'),
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Posts List */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(139,92,246,0.1)', borderTopColor: 'var(--primary-light)', animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.8rem' }}>Carregando feed de publicações...</span>
              </div>
            ) : posts.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                padding: '5rem 2rem', 
                background: 'rgba(15, 11, 28, 0.2)', 
                borderRadius: '16px',
                border: '1px dashed rgba(255,255,255,0.08)'
              }}>
                <span style={{ fontSize: '2.5rem' }}>📭</span>
                <h3 style={{ margin: '15px 0 5px 0', fontSize: '0.95rem' }}>Nada por aqui</h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                  Nenhum trader publicou resultados com esses filtros ainda. Seja o primeiro a postar!
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {posts.map((post) => {
                  const profitColor = post.profit >= 0 ? '#10b981' : '#ef4444';
                  const hasLiked = post.likes?.includes(userEmail.toLowerCase());
                  const commentsList = post.comments || [];
                  const isExpanded = expandedComments[post.id];
                  
                  // Setup custom avatar details
                  const avatarBg = post.profileImage ? 'none' : getAvatarGradient(post.userName);

                  return (
                    <div 
                      key={post.id} 
                      className="feed-card"
                      style={{
                        borderRadius: '16px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      {/* 1. CARD HEADER (X/Facebook Inspired) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          
                          {/* Avatar Circle with Online indicator ring */}
                          <div style={{ 
                            width: '44px', 
                            height: '44px', 
                            borderRadius: '50%', 
                            background: avatarBg,
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            position: 'relative',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                          }}>
                            {post.profileImage ? (
                              <img src={post.profileImage} alt={post.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '0.85rem', fontWeight: '950', color: 'white' }}>
                                {post.userName?.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>

                          {/* Meta profile description */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: '850', color: 'white' }}>{post.userName}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>@{post.email?.split('@')[0]}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '1px' }}>
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>{getRelativeTime(post.timestamp)}</span>
                              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>•</span>
                              {post.isPublic ? (
                                <span style={{ fontSize: '0.6rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '2px' }} title="Público">
                                  <Globe size={10} />
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.6rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '2px' }} title="Apenas eu">
                                  <Lock size={10} />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Top-Right Badges */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {post.metaHit && (
                            <span style={{
                              background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)',
                              border: '1px solid rgba(234, 179, 8, 0.4)',
                              color: '#facc15',
                              fontSize: '0.58rem',
                              fontWeight: '900',
                              padding: '3px 8px',
                              borderRadius: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              boxShadow: '0 0 10px rgba(234, 179, 8, 0.1)'
                            }}>
                              <Trophy size={10} /> META DIÁRIA BATIDA
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 2. OPTIONAL COMMENT (LinkedIn inspired body text) */}
                      {post.comment && (
                        <p style={{ 
                          margin: '2px 0 4px 0', 
                          fontSize: '0.85rem', 
                          lineHeight: '1.45', 
                          color: '#e2e8f0',
                          fontWeight: '400',
                          wordBreak: 'break-word'
                        }}>
                          {post.comment}
                        </p>
                      )}

                      {/* 3. SESSION PARAMETRIC DASHBOARD (X/Twitter inspired high-tech widget grid) */}
                      <div style={{
                        background: 'rgba(9, 9, 15, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        borderRadius: '12px',
                        padding: '1rem',
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 1fr 1fr',
                        gap: '12px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        
                        {/* Glow effect for positive payouts */}
                        {post.profit >= 0 && (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#10b981' }} />
                        )}
                        {post.profit < 0 && (
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: '#ef4444' }} />
                        )}

                        {/* Col 1: Net Profit */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Retorno Líquido</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: '950', color: profitColor, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {post.profit >= 0 ? '+' : ''}${post.profit.toFixed(2)}
                            {post.profit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          </span>
                        </div>

                        {/* Col 2: Win Rate with stylized bar */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Taxa de Vitória</span>
                          <span style={{ fontSize: '1.25rem', fontWeight: '900', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>
                            {post.winRate.toFixed(1)}%
                          </span>
                        </div>

                        {/* Col 3: Operations Count */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ordens</span>
                          <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'white' }}>
                            {post.tradesTotal} ordens
                          </span>
                        </div>

                        {/* Strategy and Symbol tags (Horizontal bottom drawer inside widget) */}
                        <div style={{ 
                          gridColumn: '1 / -1', 
                          borderTop: '1px solid rgba(255, 255, 255, 0.04)', 
                          paddingTop: '10px', 
                          display: 'flex', 
                          gap: '6px', 
                          flexWrap: 'wrap' 
                        }}>
                          <span style={{ 
                            fontSize: '0.62rem', 
                            background: 'rgba(139, 92, 246, 0.08)', 
                            border: '1px solid rgba(139, 92, 246, 0.15)',
                            padding: '2px 8px', 
                            borderRadius: '6px',
                            color: 'var(--primary-light)',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            🤖 {post.strategy}
                          </span>
                          <span style={{ 
                            fontSize: '0.62rem', 
                            background: 'rgba(255, 255, 255, 0.03)', 
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            padding: '2px 8px', 
                            borderRadius: '6px',
                            color: '#cbd5e1',
                            fontWeight: 'bold'
                          }}>
                            📈 {post.symbol}
                          </span>
                          <span style={{ 
                            fontSize: '0.62rem', 
                            background: 'rgba(255, 255, 255, 0.03)', 
                            padding: '2px 8px', 
                            borderRadius: '6px',
                            color: 'var(--text-secondary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginLeft: 'auto'
                          }}>
                            <Clock size={10} /> {formatTime(post.sessionTime)}
                          </span>
                        </div>
                      </div>

                      {/* 4. SOCIAL INTERACTION TOOLBAR (Twitter style metrics + LinkedIn actions) */}
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        borderTop: '1px solid rgba(255, 255, 255, 0.04)', 
                        paddingTop: '10px',
                        flexWrap: 'wrap',
                        gap: '10px'
                      }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                          
                          {/* Like Action */}
                          <button 
                            onClick={() => handleLike(post.id)}
                            className="action-btn"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: hasLiked ? '#ef4444' : 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              padding: '2px 0'
                            }}
                          >
                            <Heart size={16} fill={hasLiked ? '#ef4444' : 'none'} style={{ transition: 'transform 0.15s' }} /> 
                            <span>{post.likes?.length || 0}</span>
                          </button>

                          {/* Comment Toggle Action */}
                          <button 
                            onClick={() => toggleCommentsExpansion(post.id)}
                            className="action-btn"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: isExpanded ? 'var(--primary-light)' : 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              padding: '2px 0'
                            }}
                          >
                            <MessageSquare size={16} /> 
                            <span>{commentsList.length}</span>
                          </button>

                          {/* Internal Share Action */}
                          <button 
                            onClick={() => handleShare(post.id)}
                            className="action-btn"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 'bold',
                              padding: '2px 0'
                            }}
                          >
                            <Share2 size={16} /> 
                            <span>{post.shares || 0}</span>
                          </button>
                        </div>

                        {/* Custom Reactions emojis selector (Floating style) */}
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '4px', 
                          background: 'rgba(0, 0, 0, 0.25)', 
                          padding: '3px 8px', 
                          borderRadius: '20px', 
                          border: '1px solid rgba(255, 255, 255, 0.04)' 
                        }}>
                          {[
                            { emoji: '🔥', label: 'Gostei' },
                            { emoji: '🚀', label: 'Foguete' },
                            { emoji: '👏', label: 'Palmas' },
                            { emoji: '💎', label: 'Brilhante' }
                          ].map((r) => {
                            const usersReacted = post.reactions?.[r.emoji] || [];
                            const hasReacted = usersReacted.includes(userEmail.toLowerCase());
                            return (
                              <button
                                key={r.emoji}
                                onClick={() => handleReact(post.id, r.emoji)}
                                title={r.label}
                                className="reaction-pill"
                                style={{
                                  background: hasReacted ? 'rgba(139, 92, 246, 0.15)' : 'transparent',
                                  border: 'none',
                                  borderRadius: '50%',
                                  cursor: 'pointer',
                                  fontSize: '0.78rem',
                                  padding: '4px 6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                <span>{r.emoji}</span>
                                <span style={{ fontSize: '0.55rem', color: hasReacted ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: '900' }}>
                                  {usersReacted.length}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* 5. DISCORD CHAT STYLE COMMENT STREAM */}
                      {isExpanded && (
                        <div style={{ 
                          borderTop: '1px solid rgba(255, 255, 255, 0.04)', 
                          paddingTop: '12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          marginTop: '2px'
                        }}>
                          {/* Write Comment Box */}
                          <form onSubmit={(e) => handleComment(e, post.id)} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              placeholder="Escreva sua resposta..."
                              value={commentInputs[post.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                              style={{
                                flex: 1,
                                background: 'rgba(0, 0, 0, 0.25)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '8px',
                                padding: '8px 12px',
                                fontSize: '0.78rem',
                                color: 'white',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                              }}
                              onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                              onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.06)'}
                            />
                            <button 
                              type="submit"
                              style={{
                                background: 'rgba(139, 92, 246, 0.15)',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                color: 'var(--primary-light)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <Send size={14} />
                            </button>
                          </form>

                          {/* Comments Feed List */}
                          {commentsList.length === 0 ? (
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 2px' }}>
                              Ainda sem comentários. Diga o que achou da sessão!
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', background: 'rgba(0, 0, 0, 0.15)', borderRadius: '10px', overflow: 'hidden' }}>
                              {commentsList.map((c) => (
                                <div 
                                  key={c.id} 
                                  className="discord-comment"
                                  style={{ 
                                    display: 'flex', 
                                    gap: '10px', 
                                    padding: '8px 10px',
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.02)'
                                  }}
                                >
                                  {/* Compact Comment Avatar */}
                                  <div style={{ 
                                    width: '28px', 
                                    height: '28px', 
                                    borderRadius: '50%', 
                                    background: c.profileImage ? 'none' : getAvatarGradient(c.userName),
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    fontSize: '0.62rem',
                                    fontWeight: 'bold',
                                    flexShrink: 0,
                                    border: '1px solid rgba(255,255,255,0.04)'
                                  }}>
                                    {c.profileImage ? (
                                      <img src={c.profileImage} alt={c.userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                      <span>{c.userName?.slice(0, 2).toUpperCase()}</span>
                                    )}
                                  </div>

                                  {/* Discord-style body structure */}
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'white' }}>{c.userName}</span>
                                        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{getRelativeTime(c.timestamp)}</span>
                                      </div>
                                      
                                      {/* Allow deleting own comments */}
                                      {c.email.toLowerCase() === userEmail.toLowerCase() && (
                                        <button 
                                          onClick={() => handleDeleteComment(post.id, c.id)}
                                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                                          title="Deletar comentário"
                                        >
                                          <Trash size={11} />
                                        </button>
                                      )}
                                    </div>
                                    <p style={{ margin: '3px 0 0 0', fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.4' }}>{c.text}</p>
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

          {/* RIGHT SIDEBAR: HIGH STATS & CHALLENGES (LinkedIn/Facebook Style) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* User Personal Stats Panel */}
            <div style={{ 
              background: 'rgba(15, 11, 28, 0.45)', 
              border: '1px solid rgba(139, 92, 246, 0.2)',
              borderRadius: '16px',
              padding: '1.25rem',
              textAlign: 'center'
            }}>
              <div style={{ 
                width: '60px', 
                height: '60px', 
                borderRadius: '50%', 
                background: profileImage ? 'none' : getAvatarGradient(userName),
                border: '2px solid var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                margin: '0 auto 10px auto'
              }}>
                {profileImage ? (
                  <img src={profileImage} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{userName?.slice(0, 2).toUpperCase()}</span>
                )}
              </div>
              <h4 style={{ margin: '0 0 2px 0', fontSize: '0.9rem', fontWeight: '800' }}>{userName}</h4>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>{userEmail}</span>
              
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: '8px', 
                borderTop: '1px solid rgba(255,255,255,0.05)', 
                paddingTop: '12px',
                fontSize: '0.72rem'
              }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.55rem' }}>PUBLICAÇÕES</span>
                  <strong style={{ fontSize: '0.9rem', color: 'white' }}>
                    {posts.filter(p => p.email.toLowerCase() === userEmail.toLowerCase()).length}
                  </strong>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.55rem' }}>TOTAL CURTIDAS</span>
                  <strong style={{ fontSize: '0.9rem', color: '#ef4444' }}>
                    {posts.filter(p => p.email.toLowerCase() === userEmail.toLowerCase()).reduce((sum, p) => sum + (p.likes?.length || 0), 0)} ❤️
                  </strong>
                </div>
              </div>
            </div>

            {/* Smart News Panel (Discord inspired) */}
            <div style={{ 
              background: 'rgba(15, 11, 28, 0.25)', 
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '16px',
              padding: '1.25rem'
            }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '0.78rem', fontWeight: '900', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📢 Diretrizes da Liga
              </h4>
              <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.72rem', color: '#cbd5e1' }}>
                <li>Seus resultados gerados por ciclos agendados são compartilhados automaticamente se ativado no painel.</li>
                <li>Mantenha um diálogo respeitoso com outros traders parceiros.</li>
                <li>Troque configurações de estratégias eficientes na área de comentários.</li>
              </ul>
            </div>

          </div>
        </div>
      )}

      {/* TABS SWITCHER: RANKINGS (League Leaderboard redesigned) */}
      {activeSubTab === 'ranking' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {rankingLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              Carregando dados da liga...
            </div>
          ) : !rankingData ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              Liga inativa ou nenhum dado computado.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              
              {/* Card 1: Top Weekly Profits */}
              <div className="ranking-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '12px' }}>
                  <Trophy style={{ color: '#fbbf24' }} size={18} />
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '900', margin: 0 }}>Maiores Lucros (Semanal)</h3>
                </div>
                {rankingData.topWeeklyProfits?.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhum lucro registrado.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rankingData.topWeeklyProfits.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '950', fontSize: '0.8rem', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : 'var(--text-secondary)' }}>
                            #{idx+1}
                          </span>
                          <span style={{ fontWeight: 'bold' }}>{item.userName}</span>
                        </div>
                        <strong style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>+${item.profit.toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 2: Top Monthly Profits */}
              <div className="ranking-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '12px' }}>
                  <Award style={{ color: '#a855f7' }} size={18} />
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '900', margin: 0 }}>Titãs do Mês (Acumulado)</h3>
                </div>
                {rankingData.topMonthlyProfits?.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem dados acumulados.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rankingData.topMonthlyProfits.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '950', fontSize: '0.8rem', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : 'var(--text-secondary)' }}>
                            #{idx+1}
                          </span>
                          <span style={{ fontWeight: 'bold' }}>{item.userName}</span>
                        </div>
                        <strong style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>+${item.profit.toFixed(2)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 3: Best Streak (Goals) */}
              <div className="ranking-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '12px' }}>
                  <Gem style={{ color: '#06b6d4' }} size={18} />
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '900', margin: 0 }}>Sequência de Metas Batidas</h3>
                </div>
                {rankingData.bestStreaks?.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem dados de consistência.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rankingData.bestStreaks.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '950', fontSize: '0.8rem', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : 'var(--text-secondary)' }}>
                            #{idx+1}
                          </span>
                          <span style={{ fontWeight: 'bold' }}>{item.userName}</span>
                        </div>
                        <strong style={{ color: '#22d3ee' }}>{item.score} dias seguidos</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 4: Most Active Users */}
              <div className="ranking-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '12px' }}>
                  <Flame style={{ color: '#f97316' }} size={18} />
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '900', margin: 0 }}>Guerreiros de Tráfego (Sessões)</h3>
                </div>
                {rankingData.mostActiveUsers?.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nenhuma sessão computada.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rankingData.mostActiveUsers.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '950', fontSize: '0.8rem', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : 'var(--text-secondary)' }}>
                            #{idx+1}
                          </span>
                          <span style={{ fontWeight: 'bold' }}>{item.userName}</span>
                        </div>
                        <strong style={{ color: '#f97316' }}>{item.score} sessões</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Card 5: Most Popular Users */}
              <div className="ranking-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '10px', marginBottom: '12px' }}>
                  <Heart style={{ color: '#ec4899' }} size={18} fill="#ec4899" />
                  <h3 style={{ fontSize: '0.85rem', fontWeight: '900', margin: 0 }}>Líderes Populares (Curtidas)</h3>
                </div>
                {rankingData.mostLikedUsers?.length === 0 ? (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sem curtidas acumuladas.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {rankingData.mostLikedUsers.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '950', fontSize: '0.8rem', color: idx === 0 ? '#fbbf24' : idx === 1 ? '#cbd5e1' : idx === 2 ? '#b45309' : 'var(--text-secondary)' }}>
                            #{idx+1}
                          </span>
                          <span style={{ fontWeight: 'bold' }}>{item.userName}</span>
                        </div>
                        <strong style={{ color: '#f472b6' }}>{item.score} ❤️</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      )}

      {/* 6. MOCK SHARING MODAL (LinkedIn inspired dialogue overlay) */}
      {showShareModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 9, 11, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2000,
          backdropFilter: 'blur(10px)',
          padding: '1rem'
        }}>
          <div style={{
            background: '#151128',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            borderRadius: '24px',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '540px',
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
            color: 'white',
            animation: 'feedCardEntrance 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Share2 size={20} style={{ color: 'var(--primary-light)' }} /> Compartilhar Resultado da Sessão
              </h3>
            </div>

            {/* Custom Commentary Text Area */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Comentário da Publicação</label>
              <textarea 
                rows={3} 
                placeholder="Como foi sua experiência operando hoje? Estratégias novas? Dificuldades? Comente aqui..."
                value={shareComment}
                onChange={(e) => setShareComment(e.target.value)}
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '10px',
                  padding: '10px 14px',
                  fontSize: '0.8rem',
                  color: 'white',
                  resize: 'none',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={(e) => e.target.style.borderColor = 'var(--primary-light)'}
                onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)'}
              />
            </div>

            {/* Session Parameters Input Widgets */}
            <div style={{ 
              background: 'rgba(0,0,0,0.18)', 
              borderRadius: '12px', 
              padding: '12px', 
              border: '1px solid rgba(255,255,255,0.04)',
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '12px'
            }}>
              <div>
                <label style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Lucro Acumulado ($)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={shareSessionData.profit} 
                  onChange={(e) => setShareSessionData(prev => ({ ...prev, profit: parseFloat(e.target.value || 0) }))}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.8rem', padding: '4px 0', outline: 'none' }}
                />
              </div>
              
              <div>
                <label style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Assertividade / Win Rate (%)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={shareSessionData.winRate} 
                  onChange={(e) => setShareSessionData(prev => ({ ...prev, winRate: parseFloat(e.target.value || 0) }))}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.8rem', padding: '4px 0', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Quantidade de Ordens</label>
                <input 
                  type="number" 
                  value={shareSessionData.tradesTotal} 
                  onChange={(e) => setShareSessionData(prev => ({ ...prev, tradesTotal: parseInt(e.target.value || 0) }))}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.8rem', padding: '4px 0', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Duração da Operação (Segundos)</label>
                <input 
                  type="number" 
                  value={shareSessionData.sessionTime} 
                  onChange={(e) => setShareSessionData(prev => ({ ...prev, sessionTime: parseInt(e.target.value || 0) }))}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.8rem', padding: '4px 0', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Estratégia Utilizada</label>
                <input 
                  type="text" 
                  value={shareSessionData.strategy} 
                  onChange={(e) => setShareSessionData(prev => ({ ...prev, strategy: e.target.value }))}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.8rem', padding: '4px 0', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.55rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Ativo Operado (Index)</label>
                <input 
                  type="text" 
                  value={shareSessionData.symbol} 
                  onChange={(e) => setShareSessionData(prev => ({ ...prev, symbol: e.target.value }))}
                  style={{ width: '100%', background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '0.8rem', padding: '4px 0', outline: 'none' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  🎯 Meta Batida do Dia?
                </span>
                <input 
                  type="checkbox" 
                  checked={shareSessionData.metaHit}
                  onChange={(e) => setShareSessionData(prev => ({ ...prev, metaHit: e.target.checked }))}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                />
              </div>
            </div>

            {/* Visibility Selector */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Quem poderá visualizar:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  onClick={() => setShareIsPublic(true)}
                  style={{
                    background: shareIsPublic ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid ' + (shareIsPublic ? '#10b981' : 'rgba(255,255,255,0.08)'),
                    color: shareIsPublic ? '#10b981' : 'var(--text-secondary)',
                    fontSize: '0.7rem',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🌐 Todo Mundo
                </button>
                <button 
                  onClick={() => setShareIsPublic(false)}
                  style={{
                    background: !shareIsPublic ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.02)',
                    border: '1px solid ' + (!shareIsPublic ? '#f59e0b' : 'rgba(255,255,255,0.08)'),
                    color: !shareIsPublic ? '#f59e0b' : 'var(--text-secondary)',
                    fontSize: '0.7rem',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  🔒 Apenas Eu
                </button>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
              <button 
                onClick={() => setShowShareModal(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
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
                  background: 'linear-gradient(90deg, var(--primary) 0%, #7c3aed 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  padding: '8px 20px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(124, 58, 237, 0.2)'
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
