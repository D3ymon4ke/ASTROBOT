import React, { useState, useEffect } from 'react';
import { 
  User, Award, Shield, Zap, Sparkles, CheckCircle, Clock, 
  TrendingUp, TrendingDown, Target, Lock, Globe, Users, 
  UserPlus, UserCheck, MessageSquare, Edit3, Camera, Check, 
  X, Layers, Cpu, Star, Flame, Trophy, Share2, Eye, Upload, Image as ImageIcon
} from 'lucide-react';
import { 
  DEFAULT_BADGES, 
  DEFAULT_ACHIEVEMENTS, 
  calculateUserLevel, 
  evaluateUserAchievements 
} from '../utils/gamification';

export default function UserProfile({ 
  currentUserEmail = 'demo@astrobot.com', 
  profileData = {}, 
  dbTrades = [], 
  onSaveProfile,
  onSendFriendRequest,
  onRespondFriendRequest,
  allUsers = []
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'badges' | 'friends' | 'settings'
  const [isEditing, setIsEditing] = useState(false);

  // Edit States initialized from profileData or localStorage
  const [name, setName] = useState(() => {
    return profileData?.name || localStorage.getItem('astrobot_custom_name') || currentUserEmail.split('@')[0];
  });
  const [bio, setBio] = useState(() => {
    return profileData?.bio || localStorage.getItem('astrobot_custom_bio') || 'Trader focado em consistência e automação com inteligência de dados.';
  });
  const [bannerUrl, setBannerUrl] = useState(() => {
    return profileData?.bannerUrl || localStorage.getItem('astrobot_custom_banner') || '';
  });
  const [profileImage, setProfileImage] = useState(() => {
    return profileData?.profileImage || localStorage.getItem('astrobot_profile_image') || localStorage.getItem('astrobot_user_avatar') || '';
  });

  // Sync state if profileData or localStorage changes
  useEffect(() => {
    const savedAvatar = profileData?.profileImage || localStorage.getItem('astrobot_profile_image') || localStorage.getItem('astrobot_user_avatar') || '';
    const savedBanner = profileData?.bannerUrl || localStorage.getItem('astrobot_custom_banner') || '';
    const savedName = profileData?.name || localStorage.getItem('astrobot_custom_name') || '';
    const savedBio = profileData?.bio || localStorage.getItem('astrobot_custom_bio') || '';

    if (savedAvatar) setProfileImage(savedAvatar);
    if (savedBanner) setBannerUrl(savedBanner);
    if (savedName) setName(savedName);
    if (savedBio) setBio(savedBio);
  }, [profileData]);
  const [privacy, setPrivacy] = useState(() => {
    return profileData?.privacy || 'public';
  });

  // Presets Banners
  const presetBanners = [
    'linear-gradient(135deg, #1e1b4b 0%, #311b92 50%, #4a148c 100%)',
    'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f766e 100%)',
    'linear-gradient(135deg, #450a0a 0%, #7f1d1d 50%, #991b1b 100%)',
    'linear-gradient(135deg, #14532d 0%, #065f46 50%, #047857 100%)'
  ];

  // Image Upload Handlers
  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setProfileImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBannerUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setBannerUrl(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  // Calculate Gamification Metrics
  const totalEarned = dbTrades.reduce((sum, t) => sum + (t.profit || 0), 0);
  const winsCount = dbTrades.filter(t => t.result === 'WIN').length;
  const lossesCount = dbTrades.filter(t => t.result === 'LOSS').length;
  const totalTrades = dbTrades.length;
  const winrate = totalTrades > 0 ? (winsCount / totalTrades) * 100 : 0;

  let maxWin = 0;
  let currentStreak = 0;
  let maxStreak = 0;
  dbTrades.forEach(t => {
    if (t.profit && t.profit > maxWin) maxWin = t.profit;
    if (t.result === 'WIN') {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  });

  const levelInfo = calculateUserLevel(dbTrades, totalEarned);
  const achievements = evaluateUserAchievements(dbTrades, totalEarned);

  // User Badges List
  const userBadgeIds = profileData?.badges || ['beta_tester', 'premium_member'];
  const userBadges = DEFAULT_BADGES.filter(b => userBadgeIds.includes(b.id));

  // User Friends List
  const friendsList = profileData?.friends || [];
  const pendingRequests = profileData?.pendingRequests || [];

  const handleSave = (e) => {
    if (e) e.preventDefault();
    const updated = {
      name,
      bio,
      bannerUrl,
      profileImage,
      privacy,
      badges: userBadgeIds
    };

    // Save to LocalStorage
    localStorage.setItem('astrobot_custom_name', name);
    localStorage.setItem('astrobot_custom_bio', bio);
    localStorage.setItem('astrobot_custom_banner', bannerUrl);
    localStorage.setItem('astrobot_profile_image', profileImage);
    localStorage.setItem('astrobot_user_avatar', profileImage);
    localStorage.setItem('astrobot_user_profile', JSON.stringify(updated));

    if (onSaveProfile) onSaveProfile(updated);
    setIsEditing(false);
    alert('Perfil atualizado e salvo com sucesso!');
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
      color: 'var(--text-primary)',
      paddingBottom: '2rem'
    }}>
      {/* HEADER BANNER & PROFILE CARD */}
      <div className="glass-panel" style={{
        position: 'relative',
        borderRadius: '20px',
        overflow: 'hidden',
        background: 'rgba(15, 11, 28, 0.75)',
        border: '1px solid rgba(139, 92, 246, 0.25)',
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Banner */}
        <div style={{
          height: '190px',
          width: '100%',
          background: bannerUrl ? (bannerUrl.startsWith('data:') || bannerUrl.startsWith('http') ? `url(${bannerUrl}) center/cover no-repeat` : bannerUrl) : presetBanners[0],
          position: 'relative',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          {isEditing && (
            <div style={{
              position: 'absolute',
              top: '15px',
              right: '15px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: 'rgba(9, 6, 18, 0.8)',
              padding: '6px 12px',
              borderRadius: '20px',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Alterar Capa:</span>
              <label htmlFor="upload-banner-input" style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                color: 'white',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.68rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Upload size={12} /> Carregar Imagem
              </label>
              <input
                type="file"
                id="upload-banner-input"
                accept="image/*"
                onChange={handleBannerUpload}
                style={{ display: 'none' }}
              />

              <div style={{ display: 'flex', gap: '5px', marginLeft: '5px' }}>
                {presetBanners.map((b, idx) => (
                  <button
                    key={idx}
                    onClick={() => setBannerUrl(b)}
                    style={{ width: '18px', height: '18px', borderRadius: '50%', background: b, border: '1px solid white', cursor: 'pointer' }}
                    title="Preset de Gradiente"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile Details Container */}
        <div style={{ padding: '0 2rem 1.5rem 2rem', position: 'relative' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: '-55px',
            marginBottom: '1rem',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            {/* Avatar & User Info */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem' }}>
              <div style={{ position: 'relative' }}>
                <div style={{
                  width: '105px',
                  height: '105px',
                  borderRadius: '50%',
                  border: '3px solid var(--primary-light)',
                  boxShadow: '0 0 25px rgba(139, 92, 246, 0.5)',
                  background: '#09090f',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {profileImage ? (
                    <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={50} style={{ color: 'var(--primary-light)' }} />
                  )}
                </div>

                {/* Avatar Camera File Upload Button */}
                {isEditing && (
                  <>
                    <label htmlFor="upload-avatar-input" style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                      border: '2px solid #09090f',
                      borderRadius: '50%',
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                      zIndex: 20
                    }}>
                      <Camera size={15} style={{ color: 'white' }} />
                    </label>
                    <input
                      type="file"
                      id="upload-avatar-input"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      style={{ display: 'none' }}
                    />
                  </>
                )}

                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '-5px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)',
                  color: 'white',
                  fontSize: '0.62rem',
                  fontWeight: '800',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  border: '2px solid #09090f',
                  boxShadow: '0 0 10px rgba(139, 92, 246, 0.6)'
                }}>
                  Lvl {levelInfo.level}
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {!isEditing ? (
                    <h2 style={{ fontSize: '1.45rem', fontWeight: '800', margin: 0, color: 'white' }}>
                      {name}
                    </h2>
                  ) : (
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu Nome VIP"
                      style={{ padding: '0.4rem 0.65rem', fontSize: '1.1rem', fontWeight: 'bold', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }}
                    />
                  )}

                  <span style={{
                    background: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
                    color: '#1E1B4B',
                    fontSize: '0.6rem',
                    fontWeight: '800',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    boxShadow: '0 0 10px rgba(251, 191, 36, 0.3)'
                  }}>
                    VIP ASTROBOT
                  </span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {currentUserEmail}
                </span>
              </div>
            </div>

            {/* Profile Action Buttons */}
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)'
                  }}
                >
                  <Edit3 size={14} /> Editar Foto & Capa
                </button>
              ) : (
                <button
                  onClick={handleSave}
                  style={{
                    padding: '0.55rem 1.1rem',
                    borderRadius: '10px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Check size={14} /> Salvar Perfil
                </button>
              )}
            </div>
          </div>

          {/* Bio & XP Bar */}
          {!isEditing ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1.25rem 0', lineHeight: '1.5' }}>
              {bio}
            </p>
          ) : (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 'bold', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                Biografia do Perfil
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                placeholder="Escreva algo sobre sua trajetória no trading..."
                style={{ width: '100%', padding: '0.65rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', fontSize: '0.85rem' }}
              />
            </div>
          )}

          {/* Level Progress Bar */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '0.85rem 1rem', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 'bold', marginBottom: '6px' }}>
              <span style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flame size={14} style={{ color: '#f59e0b' }} /> Nível {levelInfo.level} — Trader Consistente
              </span>
              <span style={{ color: 'var(--primary-light)', fontFamily: 'var(--font-mono)' }}>
                {levelInfo.totalXp} XP / {levelInfo.nextLevelXp} XP
              </span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${levelInfo.progressInLevel}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #8b5cf6, #d946ef)',
                borderRadius: '4px',
                transition: 'width 0.5s ease'
              }} />
            </div>

            {/* XP Breakdown & Rules */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.65rem', marginTop: '0.85rem', paddingTop: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
              <div style={{ background: 'rgba(255,255,255,0.01)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', display: 'block' }}>Entradas (+25 XP)</span>
                <strong style={{ fontSize: '0.82rem', color: 'white', fontFamily: 'var(--font-mono)' }}>+{levelInfo.xpBreakdown?.entryXp || 0} XP</strong>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.04)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <span style={{ fontSize: '0.6rem', color: '#34d399', display: 'block' }}>WINs (+50 XP)</span>
                <strong style={{ fontSize: '0.82rem', color: '#10b981', fontFamily: 'var(--font-mono)' }}>+{levelInfo.xpBreakdown?.winXp || 0} XP</strong>
              </div>

              <div style={{ background: 'rgba(239, 68, 68, 0.04)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                <span style={{ fontSize: '0.6rem', color: '#f87171', display: 'block' }}>LOSS (+10 XP)</span>
                <strong style={{ fontSize: '0.82rem', color: '#ef4444', fontFamily: 'var(--font-mono)' }}>+{levelInfo.xpBreakdown?.lossXp || 0} XP</strong>
              </div>

              <div style={{ background: 'rgba(139, 92, 246, 0.04)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.15)' }}>
                <span style={{ fontSize: '0.6rem', color: '#a78bfa', display: 'block' }}>Gale Win (+40 XP)</span>
                <strong style={{ fontSize: '0.82rem', color: '#c084fc', fontFamily: 'var(--font-mono)' }}>+{levelInfo.xpBreakdown?.galeXp || 0} XP</strong>
              </div>

              <div style={{ background: 'rgba(245, 158, 11, 0.04)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                <span style={{ fontSize: '0.6rem', color: '#fbbf24', display: 'block' }}>Metas (+250 XP)</span>
                <strong style={{ fontSize: '0.82rem', color: '#f59e0b', fontFamily: 'var(--font-mono)' }}>+{levelInfo.xpBreakdown?.metaXp || 0} XP</strong>
              </div>

              <div style={{ background: 'rgba(56, 189, 248, 0.04)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.15)' }}>
                <span style={{ fontSize: '0.6rem', color: '#38bdf8', display: 'block' }}>Lucro (+2 XP/$)</span>
                <strong style={{ fontSize: '0.82rem', color: '#38bdf8', fontFamily: 'var(--font-mono)' }}>+{levelInfo.xpBreakdown?.profitXp || 0} XP</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '0 1.5rem 0.85rem 1.5rem',
          borderTop: '1px solid rgba(255,255,255,0.04)',
          background: 'rgba(9, 9, 15, 0.3)'
        }}>
          {[
            { id: 'overview', label: 'Visão Geral & Stats', icon: <TrendingUp size={14} /> },
            { id: 'badges', label: `Selos & Conquistas (${userBadges.length})`, icon: <Award size={14} /> },
            { id: 'friends', label: `Amigos (${friendsList.length})`, icon: <Users size={14} /> },
            { id: 'settings', label: 'Privacidade & Preferências', icon: <Lock size={14} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.55rem 1rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                border: 'none',
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONTENT VIEWPORT */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(15, 11, 28, 0.4)' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assertividade Geral</span>
            <strong style={{ fontSize: '1.6rem', color: '#10b981', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px' }}>
              {winrate.toFixed(1)}%
            </strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              {winsCount} WINs / {lossesCount} LOSSes
            </span>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(15, 11, 28, 0.4)' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lucro Total Acumulado</span>
            <strong style={{ fontSize: '1.6rem', color: totalEarned >= 0 ? '#10b981' : '#ef4444', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px' }}>
              ${totalEarned.toFixed(2)}
            </strong>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Em {totalTrades} operações
            </span>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(15, 11, 28, 0.4)' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Maior Operação Vencedora</span>
            <strong style={{ fontSize: '1.6rem', color: '#38bdf8', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px' }}>
              +${maxWin.toFixed(2)}
            </strong>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Maior ganho único registrado
            </span>
          </div>

          <div className="glass-panel" style={{ padding: '1.25rem', borderRadius: '16px', background: 'rgba(15, 11, 28, 0.4)' }}>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Maior Sequência WIN</span>
            <strong style={{ fontSize: '1.6rem', color: '#f59e0b', fontFamily: 'var(--font-mono)', display: 'block', marginTop: '4px' }}>
              {maxStreak} WINs Seguidos
            </strong>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
              Recorde de vitórias em sequência
            </span>
          </div>

          {/* ACTIVE STRATEGY & FAVORITE SETUP WIDGET */}
          <div className="glass-panel" style={{
            gridColumn: '1 / -1',
            padding: '1.25rem 1.5rem',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(15, 11, 28, 0.6) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.25)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{
                background: 'rgba(139, 92, 246, 0.15)',
                padding: '0.75rem',
                borderRadius: '12px',
                color: 'var(--primary-light)',
                boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)'
              }}>
                <Cpu size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.65rem', color: 'var(--primary-light)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ⚡ Setup Preferido do Robô
                </span>
                <h4 style={{ margin: '2px 0 0 0', fontSize: '1.05rem', fontWeight: '800', color: 'white' }}>
                  {localStorage.getItem('astrobot_imported_strategy') ? (
                    JSON.parse(localStorage.getItem('astrobot_imported_strategy')).strategy + ' • ' + JSON.parse(localStorage.getItem('astrobot_imported_strategy')).symbol
                  ) : (
                    'AI Autopilot PRO • Volatility 10 (1s) Index'
                  )}
                </h4>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  Estratégia configurada para automação de entradas inteligentes
                </span>
              </div>
            </div>

            <button
              onClick={() => alert('Para alterar a estratégia do seu robô, acesse a aba Análise & Estratégias ou Automação.')}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Configurar Setup
            </button>
          </div>
        </div>
      )}

      {activeTab === 'badges' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* BADGES SECTION */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(15, 11, 28, 0.4)' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: '800', color: 'white', margin: '0 0 1rem 0' }}>
              Selos Oficiais Conquistados
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {userBadges.map(badge => (
                <div key={badge.id} style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.85rem'
                }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: badge.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.3rem',
                    boxShadow: '0 0 15px rgba(139, 92, 246, 0.3)'
                  }}>
                    {badge.icon}
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.82rem', color: 'white', display: 'block' }}>{badge.name}</strong>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '2px', display: 'block' }}>{badge.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ACHIEVEMENTS SECTION */}
          <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(15, 11, 28, 0.4)' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: '800', color: 'white', margin: '0 0 1rem 0' }}>
              Módulo de Conquistas (Achievements)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
              {achievements.map(ach => (
                <div key={ach.id} style={{
                  padding: '1rem',
                  borderRadius: '12px',
                  background: ach.unlocked ? 'rgba(16, 185, 129, 0.04)' : 'rgba(255,255,255,0.01)',
                  border: `1px solid ${ach.unlocked ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.04)'}`,
                  opacity: ach.unlocked ? 1 : 0.6
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '1.4rem' }}>{ach.icon}</span>
                    <div>
                      <strong style={{ fontSize: '0.82rem', color: 'white', display: 'block' }}>{ach.name}</strong>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{ach.description}</span>
                    </div>
                  </div>
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>Progresso</span>
                      <span>{ach.currentVal} / {ach.target}</span>
                    </div>
                    <div style={{ width: '100%', height: '5px', background: 'rgba(0,0,0,0.4)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${ach.progress}%`, height: '100%', background: ach.unlocked ? '#10b981' : 'var(--primary)' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(15, 11, 28, 0.4)' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: '800', color: 'white', margin: '0 0 1rem 0' }}>
            Rede de Amigos & Solicitações
          </h3>
          {pendingRequests.length > 0 && (
            <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#f59e0b', textTransform: 'uppercase' }}>Solicitações Pendentes</span>
              {pendingRequests.map((req, idx) => (
                <div key={idx} style={{ padding: '0.75rem 1rem', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'white', fontWeight: 'bold' }}>{req.from}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => onRespondFriendRequest && onRespondFriendRequest(req.from, true)} style={{ padding: '4px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>Aceitar</button>
                    <button onClick={() => onRespondFriendRequest && onRespondFriendRequest(req.from, false)} style={{ padding: '4px 10px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 'bold', cursor: 'pointer' }}>Recusar</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {friendsList.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Nenhum amigo adicionado ainda. Pesquise por outros traders na comunidade!</div>
            ) : (
              friendsList.map((fEmail, idx) => (
                <div key={idx} style={{ padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={16} style={{ color: 'var(--primary-light)' }} />
                  </div>
                  <div>
                    <strong style={{ fontSize: '0.8rem', color: 'white', display: 'block' }}>{(fEmail || 'trader').split('@')[0]}</strong>
                    <span style={{ fontSize: '0.62rem', color: '#10b981' }}>🟢 Amigo Conectado</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(15, 11, 28, 0.4)' }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: '800', color: 'white', margin: '0 0 1rem 0' }}>
            Configurações de Privacidade do Perfil
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem', fontWeight: 'bold' }}>
                Visibilidade do Perfil
              </label>
              <select
                value={privacy}
                onChange={(e) => setPrivacy(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
              >
                <option value="public">🌐 Público (Todos podem ver estatísticas e selos)</option>
                <option value="friends">👥 Apenas Amigos (Somente sua lista de amigos acessa)</option>
                <option value="private">🔒 Privado (Ocultar dados públicos)</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', background: 'var(--primary)', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Salvar Privacidade
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
