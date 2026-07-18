import React, { useState } from 'react';
import { Plus, Trash2, Send, AlertCircle, CheckCircle, Monitor, FileText, Globe, ToggleLeft, ToggleRight } from 'lucide-react';

export default function DownloadsEditor({ downloads = [], onDownloadsChange, isAdmin }) {
  const [version, setVersion] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [changelog, setChangelog] = useState('');
  const [os, setOs] = useState('Windows');
  const [active, setActive] = useState(true);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!version.trim() || !downloadUrl.trim()) return;

    setSubmitting(true);
    setSubmitMsg(null);

    try {
      const base = getApiBase();
      const res = await fetch(`${base}/downloads?admin_token=lucas_astro_admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version, downloadUrl, changelog, os, active })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitMsg({ type: 'success', text: 'Download publicado com sucesso!' });
        setVersion('');
        setDownloadUrl('');
        setChangelog('');
        setOs('Windows');
        setActive(true);
        onDownloadsChange();
      } else {
        throw new Error(data.error || 'Erro ao publicar link.');
      }
    } catch (err) {
      console.warn('Falha ao enviar ao servidor. Salvando localmente:', err);
      try {
        const cached = localStorage.getItem('astrobot_cached_downloads');
        const downloadsList = cached ? JSON.parse(cached) : [];
        const newDownload = {
          id: 'local_' + Date.now(),
          version: version.trim(),
          downloadUrl: downloadUrl.trim(),
          changelog,
          os,
          active,
          createdAt: Date.now()
        };
        const updatedList = [newDownload, ...downloadsList];
        localStorage.setItem('astrobot_cached_downloads', JSON.stringify(updatedList));
        setSubmitMsg({ type: 'success', text: 'Salvo localmente com sucesso!' });
        setVersion('');
        setDownloadUrl('');
        setChangelog('');
        setOs('Windows');
        setActive(true);
        onDownloadsChange();
      } catch (storageErr) {
        setSubmitMsg({ type: 'error', text: 'Erro ao salvar localmente.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (downloadId, ver) => {
    if (!confirm(`Excluir a versão ${ver} permanentemente do histórico de downloads?`)) return;
    setDeleting(downloadId);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/downloads?admin_token=lucas_astro_admin&download_id=${downloadId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('API delete failed');
      onDownloadsChange();
    } catch (err) {
      console.warn('Falha ao excluir no servidor. Removendo localmente:', err);
      try {
        const cached = localStorage.getItem('astrobot_cached_downloads');
        if (cached) {
          const list = JSON.parse(cached);
          const updated = list.filter(d => d.id !== downloadId);
          localStorage.setItem('astrobot_cached_downloads', JSON.stringify(updated));
        }
        onDownloadsChange();
      } catch (storageErr) {
        // ignore
      }
    } finally {
      setDeleting(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', height: '100%' }}>
      
      {/* Left Column: Form Editor */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <FileText size={18} style={{ color: 'var(--primary-light)' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'white', letterSpacing: '0.5px', margin: 0 }}>PUBLICAR NOVO DOWNLOAD</h3>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {/* Version + OS Row */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>VERSÃO</label>
              <input
                type="text"
                placeholder="Ex: 2.5.0"
                value={version}
                onChange={e => setVersion(e.target.value)}
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
                required
              />
            </div>
            
            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>SO COMPATÍVEL</label>
              <select 
                value={os} 
                onChange={e => setOs(e.target.value)} 
                style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', height: '34px', width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', outline: 'none' }}
              >
                <option value="Windows">Windows (.exe)</option>
                <option value="MacOs">macOS (.dmg)</option>
                <option value="Linux">Linux (.AppImage)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1.2rem' }}>
              <label className="switch" style={{ width: '34px', height: '18px' }}>
                <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
                <span className="slider" style={{ borderRadius: '18px' }}></span>
              </label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Ativo</span>
            </div>
          </div>

          {/* Download URL Link */}
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>LINK DE DOWNLOAD DIRECTO</label>
            <input
              type="url"
              placeholder="Ex: https://github.com/releases/download/v2.5.0/Setup.exe"
              value={downloadUrl}
              onChange={e => setDownloadUrl(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '0.45rem 0.6rem', width: '100%', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white' }}
              required
            />
          </div>

          {/* Changelog text area */}
          <div>
            <label style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.3rem' }}>CHANGELOG (NOTAS DA VERSÃO)</label>
            <textarea
              placeholder="Descreva as modificações desta versão (Suporta formatação com * para itens e ### para títulos)."
              value={changelog}
              onChange={e => setChangelog(e.target.value)}
              style={{ fontSize: '0.82rem', padding: '0.6rem 0.75rem', width: '100%', minHeight: '160px', resize: 'vertical', background: 'rgba(15, 23, 42, 0.6)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'white', outline: 'none', fontFamily: 'inherit' }}
            />
          </div>

          {submitMsg && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.78rem', fontWeight: 'bold', background: submitMsg.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: submitMsg.type === 'success' ? 'var(--success)' : 'var(--danger)', border: `1px solid ${submitMsg.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
              {submitMsg.type === 'success' ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
              {submitMsg.text}
            </div>
          )}

          <button type="submit" className="primary" disabled={submitting} style={{ padding: '0.6rem', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Send size={15} /> {submitting ? 'PUBLICANDO...' : 'PUBLICAR VERSÃO'}
          </button>
        </form>
      </div>

      {/* Right Column: Manage Downloads List */}
      <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
          <Globe size={16} style={{ color: 'var(--accent)' }} />
          <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: 'white', letterSpacing: '0.5px', margin: 0 }}>HISTÓRICO DE LANÇAMENTOS</h3>
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{downloads.length} versões</span>
        </div>

        {downloads.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', gap: '0.5rem' }}>
            <FileText size={28} strokeWidth={1.5} />
            <span style={{ fontSize: '0.8rem' }}>Nenhum link publicado ainda.</span>
          </div>
        ) : (
          downloads.map(item => {
            const dateStr = new Date(item.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
            return (
              <div key={item.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.75rem 1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ background: 'rgba(167, 139, 250, 0.1)', padding: '0.5rem', borderRadius: '8px', color: '#a78bfa' }}>
                  <Monitor size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.8rem', color: 'white' }}>v{item.version}</strong>
                    <span style={{ fontSize: '0.58rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '4px' }}>{item.os}</span>
                    <span style={{ fontSize: '0.58rem', color: item.active ? '#10b981' : '#ef4444', background: item.active ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                      {item.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Link: {item.downloadUrl}
                  </span>
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>Lançado em: {dateStr}</span>
                </div>
                <button
                  onClick={() => handleDelete(item.id, item.version)}
                  disabled={deleting === item.id}
                  style={{ padding: '4px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', color: 'var(--danger)', cursor: 'pointer', flexShrink: 0 }}
                  title="Excluir instalador"
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
