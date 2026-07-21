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

  // ---- GET: list posts (public) ----
  if (req.method === 'GET') {
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const posts = postsData.map(row => ({
        id: row.id,
        title: row.title,
        content: row.content,
        coverImage: row.cover_image,
        tag: row.tag,
        pinned: row.pinned,
        createdAt: row.created_at ? (isNaN(Number(row.created_at)) ? new Date(row.created_at).getTime() : Number(row.created_at)) : null,
        updatedAt: row.updated_at ? (isNaN(Number(row.updated_at)) ? new Date(row.updated_at).getTime() : Number(row.updated_at)) : null,
        // Also support other community properties if they exist
        email: row.email,
        userName: row.user_name,
        profileImage: row.profile_image,
        comment: row.comment,
        isPublic: row.is_public,
        profit: row.profit ? parseFloat(row.profit) : 0,
        tradesTotal: row.trades_total,
        winRate: row.win_rate ? parseFloat(row.win_rate) : 0,
        strategy: row.strategy,
        symbol: row.symbol,
        sessionTime: row.session_time,
        metaHit: row.meta_hit,
        likes: row.likes || [],
        reactions: row.reactions || { '🔥': [], '🚀': [], '👏': [], '💎': [] },
        comments: row.comments || [],
        shares: row.shares || 0
      }));

      return res.status(200).json({ success: true, posts });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ---- POST: create post (admin only) ----
  if (req.method === 'POST') {
    const { admin_token } = req.query;
    if (admin_token !== 'lucas_astro_admin') {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }
    try {
      const { title, content, coverImage, tag, pinned } = req.body;
      if (!title || !content) return res.status(400).json({ error: 'Título e conteúdo são obrigatórios.' });

      const newPost = {
        title: title.trim(),
        content,
        cover_image: coverImage || null,
        tag: tag || 'novidade',
        pinned: pinned || false,
        created_at: Date.now(),
        updated_at: Date.now(),
        is_public: true
      };

      const { data, error } = await supabase
        .from('posts')
        .insert(newPost)
        .select('id')
        .single();

      if (error) throw error;

      return res.status(200).json({ success: true, id: data.id });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ---- DELETE: delete post (admin only) ----
  if (req.method === 'DELETE') {
    const { admin_token, post_id } = req.query;
    if (admin_token !== 'lucas_astro_admin') {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }
    if (!post_id) return res.status(400).json({ error: 'post_id é obrigatório.' });
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post_id);

      if (error) throw error;

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido.' });
}
