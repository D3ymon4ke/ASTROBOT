import { supabase } from './utils/supabase.js';

const CORS_HEADERS = {
  'Access-Control-Allow-Credentials': true,
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
};

export default async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!supabase) return res.status(500).json({ error: 'Supabase não inicializado.' });

  // ---- GET: list downloads (public) ----
  if (req.method === 'GET') {
    try {
      const { data: downloadsData, error } = await supabase
        .from('downloads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const downloads = downloadsData.map(row => ({
        id: row.id,
        version: row.version,
        downloadUrl: row.download_url,
        changelog: row.changelog,
        os: row.os,
        active: row.active,
        createdAt: row.created_at ? Number(row.created_at) : null
      }));

      return res.status(200).json({ success: true, downloads });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ---- POST: create or update download (admin only) ----
  if (req.method === 'POST') {
    const { admin_token } = req.query;
    if (admin_token !== 'lucas_astro_admin') {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }
    try {
      const { version, downloadUrl, changelog, os, active } = req.body;
      if (!version || !downloadUrl) {
        return res.status(400).json({ error: 'Versão e Link de download são obrigatórios.' });
      }

      const newDownload = {
        version: version.trim(),
        download_url: downloadUrl.trim(),
        changelog: changelog || '',
        os: os || 'Windows',
        active: active !== undefined ? active : true,
        created_at: Date.now()
      };

      const { data, error } = await supabase
        .from('downloads')
        .insert(newDownload)
        .select('id')
        .single();

      if (error) throw error;

      return res.status(200).json({ success: true, id: data.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ---- DELETE: delete download (admin only) ----
  if (req.method === 'DELETE') {
    const { admin_token, download_id } = req.query;
    if (admin_token !== 'lucas_astro_admin') {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }
    if (!download_id) return res.status(400).json({ error: 'download_id é obrigatório.' });
    try {
      const { error } = await supabase
        .from('downloads')
        .delete()
        .eq('id', download_id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
