import React, { useState } from 'react';
import { Plus, Trash2, Image, Tag, Pin, Send, AlertCircle, CheckCircle, X, FileText } from 'lucide-react';

const TAG_OPTIONS = [
  { value: 'patch', label: '🔧 Patch Notes', color: '#8b5cf6' },
  { value: 'novidade', label: '✨ Novidade', color: '#22c55e' },
  { value: 'aviso', label: '⚠️ Aviso', color: '#f59e0b' },
  { value: 'manutencao', label: '🔴 Manutenção', color: '#ef4444' },
];

function getTagInfo(value) {
  return TAG_OPTIONS.find(t => t.value === value) || TAG_OPTIONS[1];
}

// Simple Base64 image helper
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
  });
}

export default function NewsEditor({ posts = [], onPostsChange, isAdmin }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [tag, setTag] = useState('novidade');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const getApiBase = () => {
    const isLocalOrElectron = window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:' ||
      (window.process && window.process.type === 'renderer');
    return isLocalOrElectron ? 'https://astrobot-seven.vercel.app/api' : '/api';
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setCoverImage(b64);
  };

  const insertImageInContent = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const b64 = await fileToBase64(file);
    setContent(prev => prev + `\n![imagem](${b64})\n`);
    e.target.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/posts?admin_token=lucas_astro_admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, coverImage, tag, pinned })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitMsg({ type: 'success', text: 'Publicação criada com sucesso!' });
        setTitle(''); setContent(''); setCoverImage(''); setTag('novidade'); setPinned(false);
        onPostsChange();
      } else {
        throw new Error(data.error || 'Erro ao publicar.');
      }
    } catch (err) {
      console.warn('Falha ao enviar ao servidor. Salvando localmente:', err);
      try {
        const cached = localStorage.getItem('astrobot_cached_posts');
        const postsList = cached ? JSON.parse(cached) : [];
        const newPost = {
          id: 'local_' + Date.now(),
          title: title.trim(),
          content,
          coverImage: coverImage || null,
          tag: tag || 'novidade',
          pinned: pinned || false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        const updatedList = [newPost, ...postsList];
        localStorage.setItem('astrobot_cached_posts', JSON.stringify(updatedList));
        setSubmitMsg({ type: 'success', text: 'Publicação salva localmente com sucesso!' });
        setTitle(''); setContent(''); setCoverImage(''); setTag('novidade'); setPinned(false);
        onPostsChange();
      } catch (storageErr) {
        setSubmitMsg({ type: 'error', text: 'Erro ao salvar localmente.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (postId) => {
    if (!confirm('Excluir esta publicação permanentemente?')) return;
    setDeleting(postId);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/posts?admin_token=lucas_astro_admin&post_id=${postId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('API delete failed');
      onPostsChange();
    } catch (err) {
      console.warn('Falha ao excluir no servidor. Removendo localmente:', err);
      try {
        const cached = localStorage.getItem('astrobot_cached_posts');
        if (cached) {
          const postsList = JSON.parse(cached);
          const updatedList = postsList.filter(p => p.id !== postId);
          localStorage.setItem('astrobot_cached_posts', JSON.stringify(updatedList));
        }
        onPostsChange();
      } catch (storageErr) {
        // ignore
      }
    } finally {
      setDeleting(null);
    }
  };

  // Render markdown-like content
  const renderContent = (text) => {
    const parts = text.split(/(!\[.*?\]\(.*?\))/g);
    return parts.map((part, i) => {
      const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
      if (imgMatch) {
        return <img key={i} src={imgMatch[2]} alt={imgMatch[1]} style={{ maxWidth: '100%', borderRadius: '8px', margin: '0.5rem 0' }} />;
      }
      return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
    });
  };

  if (!isAdmin) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', height: '100%' }}>
      {/* Left: Editor */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <FileText size={18} style={{ color: 'var(--primary-light)' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'white', letterSpacing: '0.5px' }}>NOVA PUBLICAÇÃO</h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Tag + Pin row */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>TAG</label>
              <select value={tag} onChange={e => setTag(e.target.value)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem', height: '34px', width: '100%' }}>
                {TAG_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1.2rem' }}>
              <label className="switch" style={{ width: '34px', height: '18px' }}>
                <input type="checkbox" checked={pinned} onChange={e => setPinned(e.target.checked)} />
                <span className="slider" style={{ borderRadius: '18px' }}></span>
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Pin size={12} /> Fixar
              </span>
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>TÍTULO</label>
            <input
              type="text"
              placeholder="Ex: ASTROBOT v2.6 - Novos recursos..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ fontSize: '0.9rem', padding: '0.5rem 0.75rem', width: '100%', fontWeight: 'bold' }}
              required
            />
          </div>

          {/* Cover Image */}
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>IMAGEM DE CAPA</label>
            {coverImage ? (
              <div style={{ position: 'relative' }}>
                <img src={coverImage} alt="Capa" style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
                <button type="button" onClick={() => setCoverImage('')} style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer', fontSize: '0.7rem' }}>
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '0.75rem', border: '1px dashed rgba(139, 92, 246, 0.4)', borderRadius: '8px', cursor: 'pointer', color: 'var(--primary-light)', fontSize: '0.78rem', background: 'rgba(139, 92, 246, 0.04)' }}>
                <Image size={16} /> Clique para fazer upload da capa
                <input type="file" accept="image/*" onChange={handleCoverUpload} style={{ display: 'none' }} />
              </label>
            )}
          </div>

          {/* Content */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)' }}>CONTEÚDO</label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--primary-light)', cursor: 'pointer', padding: '2px 8px', background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: '4px' }}>
                <Image size={11} /> Inserir Imagem
                <input type="file" accept="image/*" onChange={insertImageInContent} style={{ display: 'none' }} />
              </label>
            </div>
            <textarea
              placeholder="Escreva o conteúdo da publicação... Suporte a texto com imagens inseridas."
              value={content}
              onChange={e => setContent(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '0.6rem 0.75rem', width: '100%', minHeight: '160px', resize: 'vertical', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', outline: 'none', fontFamily: 'inherit' }}
              required
            />
          </div>

          {submitMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 'bold', background: submitMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: submitMsg.type === 'success' ? 'var(--success)' : 'var(--danger)', border: `1px solid ${submitMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              {submitMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {submitMsg.text}
            </div>
          )}

          <button type="submit" className="primary" disabled={submitting} style={{ padding: '0.6rem', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Send size={15} /> {submitting ? 'PUBLICANDO...' : 'PUBLICAR AGORA'}
          </button>
        </form>
      </div>

      {/* Right: Manage existing posts */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <Tag size={16} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'white', letterSpacing: '0.5px' }}>GERENCIAR PUBLICAÇÕES</h3>
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{posts.length} publicações</span>
        </div>

        {posts.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', gap: '0.5rem' }}>
            <FileText size={28} strokeWidth={1.5} />
            <span style={{ fontSize: '0.8rem' }}>Nenhuma publicação ainda.</span>
          </div>
        ) : (
          posts.map(post => {
            const tagInfo = getTagInfo(post.tag);
            const date = new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <div key={post.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                {post.coverImage && (
                  <img src={post.coverImage} alt="" style={{ width: '56px', height: '56px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    {post.pinned && <Pin size={10} style={{ color: 'var(--warning)' }} />}
                    <span style={{ fontSize: '0.6rem', fontWeight: 'bold', color: tagInfo.color, background: `${tagInfo.color}18`, border: `1px solid ${tagInfo.color}40`, padding: '1px 6px', borderRadius: '10px' }}>
                      {tagInfo.label}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{date}</span>
                  </div>
                  <strong style={{ fontSize: '0.8rem', color: 'white', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{post.title}</strong>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {post.content.replace(/!\[.*?\]\(.*?\)/g, '[imagem]').substring(0, 80)}...
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(post.id)}
                  disabled={deleting === post.id}
                  style={{ padding: '4px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer', flexShrink: 0 }}
                  title="Excluir publicação"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
