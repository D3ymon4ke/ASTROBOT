import React, { useState } from 'react';
import { Award, Plus, Trash2, Edit3, ShieldCheck, Sparkles, Check } from 'lucide-react';
import { DEFAULT_BADGES, DEFAULT_ACHIEVEMENTS } from '../utils/gamification';

export default function AdminGamificationEditor() {
  const [badges, setBadges] = useState(DEFAULT_BADGES);
  const [achievements, setAchievements] = useState(DEFAULT_ACHIEVEMENTS);

  // New Badge Form State
  const [newBadgeName, setNewBadgeName] = useState('');
  const [newBadgeIcon, setNewBadgeIcon] = useState('🏆');
  const [newBadgeColor, setNewBadgeColor] = useState('linear-gradient(135deg, #8b5cf6 0%, #d946ef 100%)');
  const [newBadgeDesc, setNewBadgeDesc] = useState('');
  const [newBadgeCriteria, setNewBadgeCriteria] = useState('');

  // New Achievement Form State
  const [newAchName, setNewAchName] = useState('');
  const [newAchIcon, setNewAchIcon] = useState('🟢');
  const [newAchDesc, setNewAchDesc] = useState('');
  const [newAchTarget, setNewAchTarget] = useState(10);

  const handleAddBadge = (e) => {
    e.preventDefault();
    if (!newBadgeName) return;

    const b = {
      id: `badge_${Date.now()}`,
      name: newBadgeName,
      icon: newBadgeIcon || '🏆',
      color: newBadgeColor,
      description: newBadgeDesc || 'Selo de Reconhecimento VIP',
      criteria: newBadgeCriteria || 'Atribuição Admin'
    };

    setBadges([...badges, b]);
    setNewBadgeName('');
    setNewBadgeDesc('');
    setNewBadgeCriteria('');
    alert('Selo criado com sucesso no painel administrativo!');
  };

  const handleAddAchievement = (e) => {
    e.preventDefault();
    if (!newAchName) return;

    const a = {
      id: `ach_${Date.now()}`,
      name: newAchName,
      icon: newAchIcon || '🟢',
      description: newAchDesc,
      target: parseInt(newAchTarget) || 1,
      category: 'custom'
    };

    setAchievements([...achievements, a]);
    setNewAchName('');
    setNewAchDesc('');
    alert('Conquista criada com sucesso!');
  };

  const handleDeleteBadge = (id) => {
    setBadges(badges.filter(b => b.id !== id));
  };

  const handleDeleteAchievement = (id) => {
    setAchievements(achievements.filter(a => a.id !== id));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', color: 'white' }}>
      {/* BADGES MANAGEMENT SECTION */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(15, 11, 28, 0.55)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Award size={20} style={{ color: 'var(--primary-light)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Gerenciador de Selos (Badges)</h3>
          </div>
        </div>

        {/* Create Badge Form */}
        <form onSubmit={handleAddBadge} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
          <div>
            <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 'bold' }}>Nome do Selo</label>
            <input type="text" placeholder="Ex: 🏆 Mestre dos Ticks" value={newBadgeName} onChange={e => setNewBadgeName(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 'bold' }}>Ícone / Emoji</label>
            <input type="text" placeholder="Ex: 🏆" value={newBadgeIcon} onChange={e => setNewBadgeIcon(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 'bold' }}>Descrição</label>
            <input type="text" placeholder="Ex: Batida a meta por 10 dias" value={newBadgeDesc} onChange={e => setNewBadgeDesc(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" style={{ width: '100%', padding: '0.6rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Plus size={14} /> Criar Selo
            </button>
          </div>
        </form>

        {/* Existing Badges Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.85rem' }}>
          {badges.map(b => (
            <div key={b.id} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>{b.icon}</span>
                <div>
                  <strong style={{ fontSize: '0.8rem', color: 'white', display: 'block' }}>{b.name}</strong>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{b.description}</span>
                </div>
              </div>
              <button onClick={() => handleDeleteBadge(b.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ACHIEVEMENTS MANAGEMENT SECTION */}
      <div className="glass-panel" style={{ padding: '1.5rem', borderRadius: '16px', background: 'rgba(15, 11, 28, 0.55)', border: '1px solid rgba(139, 92, 246, 0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} style={{ color: '#f59e0b' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', margin: 0 }}>Módulo de Conquistas (Achievements)</h3>
          </div>
        </div>

        {/* Create Achievement Form */}
        <form onSubmit={handleAddAchievement} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
          <div>
            <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 'bold' }}>Nome da Conquista</label>
            <input type="text" placeholder="Ex: 🎯 50 Meta Batida" value={newAchName} onChange={e => setNewAchName(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }} />
          </div>

          <div>
            <label style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', display: 'block', fontWeight: 'bold' }}>Meta Alvo (Meta/Trades)</label>
            <input type="number" placeholder="Ex: 50" value={newAchTarget} onChange={e => setNewAchTarget(e.target.value)} style={{ width: '100%', padding: '0.55rem', background: '#09090f', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'white' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button type="submit" style={{ width: '100%', padding: '0.6rem', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <Plus size={14} /> Criar Conquista
            </button>
          </div>
        </form>

        {/* Existing Achievements Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.85rem' }}>
          {achievements.map(a => (
            <div key={a.id} style={{ padding: '0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>{a.icon}</span>
                <div>
                  <strong style={{ fontSize: '0.8rem', color: 'white', display: 'block' }}>{a.name}</strong>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Alvo: {a.target}</span>
                </div>
              </div>
              <button onClick={() => handleDeleteAchievement(a.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
