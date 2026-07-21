-- 1. Tabela de Usuários (equivalente a coleção 'users')
CREATE TABLE IF NOT EXISTS public.users (
    email TEXT PRIMARY KEY,
    password TEXT NOT NULL,
    cdkey TEXT,
    expires_at BIGINT,
    settings JSONB DEFAULT '{}'::jsonb,
    telegram_config JSONB DEFAULT '{}'::jsonb,
    cycles JSONB DEFAULT '[]'::jsonb,
    profile JSONB DEFAULT '{"fullname": "", "profileImage": ""}'::jsonb,
    is_running BOOLEAN DEFAULT false,
    active_cycle_id TEXT,
    pending_command JSONB,
    scheduler_state BOOLEAN DEFAULT true,
    created_at BIGINT,
    updated_at BIGINT
);

-- 2. Tabela de Chaves de Licença (equivalente a coleção 'keys')
CREATE TABLE IF NOT EXISTS public.keys (
    cdkey TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    activated_at BIGINT,
    expires_at BIGINT,
    owner TEXT REFERENCES public.users(email) ON DELETE SET NULL,
    duration_days INTEGER DEFAULT 30,
    created_at BIGINT
);

-- 3. Tabela de Posts da Comunidade e Comunicados (equivalente a coleções 'posts' e 'community_posts')
CREATE TABLE IF NOT EXISTS public.posts (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    email TEXT,
    user_name TEXT,
    profile_image TEXT,
    comment TEXT,
    is_public BOOLEAN DEFAULT true,
    profit NUMERIC DEFAULT 0.0,
    trades_total INTEGER DEFAULT 0,
    win_rate NUMERIC DEFAULT 0.0,
    strategy TEXT,
    symbol TEXT,
    session_time INTEGER DEFAULT 0,
    meta_hit BOOLEAN DEFAULT false,
    likes JSONB DEFAULT '[]'::jsonb,
    reactions JSONB DEFAULT '{"🔥": [], "🚀": [], "👏": [], "💎": []}'::jsonb,
    comments JSONB DEFAULT '[]'::jsonb,
    shares INTEGER DEFAULT 0,
    title TEXT,
    content TEXT,
    cover_image TEXT,
    tag TEXT DEFAULT 'novidade',
    pinned BOOLEAN DEFAULT false,
    created_at BIGINT,
    updated_at BIGINT
);

-- 4. Tabela de Downloads de Atualizações (equivalente a coleção 'downloads')
CREATE TABLE IF NOT EXISTS public.downloads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    version TEXT NOT NULL,
    download_url TEXT NOT NULL,
    changelog TEXT,
    os TEXT DEFAULT 'Windows',
    active BOOLEAN DEFAULT true,
    created_at BIGINT
);

-- 5. Tabela de Histórico de Trades Operados (subcoleção 'trades' por usuário no Firestore)
CREATE TABLE IF NOT EXISTS public.trades (
    id TEXT PRIMARY KEY,
    user_email TEXT NOT NULL REFERENCES public.users(email) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    contract_type TEXT NOT NULL,
    stake NUMERIC NOT NULL,
    profit NUMERIC NOT NULL,
    result TEXT NOT NULL,
    strategy_name TEXT NOT NULL,
    gale_level INTEGER DEFAULT 0,
    timestamp BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Criar índices para performance de buscas comuns
CREATE INDEX IF NOT EXISTS idx_trades_user_email ON public.trades(user_email);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_downloads_created_at ON public.downloads(created_at DESC);
