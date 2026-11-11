-- ==============================================================================
-- SIMPER.APP - SCRIPT COMPLETO E UNIFICADO PARA O SUPABASE SQL EDITOR
-- Criação de tabelas, índices, permissões públicas (anon) e dados iniciais
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CRIAR TABELA DE PLAYLISTS PRIMEIRO (Evita erro de chave estrangeira)
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABELA DE MÍDIAS (FOTOS E VÍDEOS)
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('video', 'image')),
    storage_path TEXT,
    public_url TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    checksum_sha256 VARCHAR(64) DEFAULT '',
    duration_seconds INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABELA DE ITENS DA PLAYLIST
CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABELA DE SMART TVS (DEVICES)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pairing_code VARCHAR(10) UNIQUE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    device_fingerprint VARCHAR(255) UNIQUE,
    status VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'pairing')),
    orientation VARCHAR(20) NOT NULL DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),
    rotation_degrees INT NOT NULL DEFAULT 0 CHECK (rotation_degrees IN (0, 90, 180, 270)),
    transition VARCHAR(20) NOT NULL DEFAULT 'fade' CHECK (transition IN ('fade', 'cut', 'slide', 'zoom')),
    current_playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
    current_media_index INT NOT NULL DEFAULT 0,
    is_playing BOOLEAN NOT NULL DEFAULT true,
    last_ping TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABELA DE COMPROVANTES DE REPRODUÇÃO (AUDITORIA / PROOF OF PLAY)
CREATE TABLE IF NOT EXISTS public.playback_proofs (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    media_item_id UUID REFERENCES public.media_items(id) ON DELETE CASCADE,
    played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_played_seconds INT NOT NULL DEFAULT 10
);

-- ==============================================================================
-- DESABILITAR BLOQUEIOS DE RLS (Permite leitura/escrita do painel web e da TV)
-- ==============================================================================
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_proofs ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem para evitar duplicidade
DROP POLICY IF EXISTS "Acesso total publico playlists" ON public.playlists;
DROP POLICY IF EXISTS "Acesso total publico media_items" ON public.media_items;
DROP POLICY IF EXISTS "Acesso total publico playlist_items" ON public.playlist_items;
DROP POLICY IF EXISTS "Acesso total publico devices" ON public.devices;
DROP POLICY IF EXISTS "Acesso total publico playback_proofs" ON public.playback_proofs;

-- Criar políticas públicas completas (anônimo e autenticado podem ler e salvar)
CREATE POLICY "Acesso total publico playlists" ON public.playlists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico media_items" ON public.media_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico playlist_items" ON public.playlist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico devices" ON public.devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico playback_proofs" ON public.playback_proofs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- BUCKET DE MÍDIAS NO SUPABASE STORAGE (Para acesso e reprodução de qualquer Wi-Fi/4G)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media', 'media', true, 52428800)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public media access" ON storage.objects;
CREATE POLICY "Public media access" ON storage.objects
FOR ALL USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');

-- ==============================================================================
-- DADOS INICIAIS (SEED)
-- ==============================================================================

-- Inserir Mídias de Demonstração
INSERT INTO public.media_items (id, title, type, public_url, duration_seconds)
VALUES
    ('m1111111-1111-1111-1111-111111111111', 'Menu Especial Pratos Gourmet', 'image', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1920&q=80', 10),
    ('m2222222-2222-2222-2222-222222222222', 'Vídeo Promocional Bebidas Refrescantes', 'image', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1920&q=80', 8),
    ('m3333333-3333-3333-3333-333333333333', 'Sobremesas da Casa & Cafés', 'image', 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1920&q=80', 12)
ON CONFLICT (id) DO NOTHING;

-- Inserir Playlist Principal
INSERT INTO public.playlists (id, name, description)
VALUES
    ('p1111111-1111-1111-1111-111111111111', 'Programação Padrão - Restaurante', 'Playlist contínua de fotos e promoções')
ON CONFLICT (id) DO NOTHING;

-- Inserir Itens na Playlist
INSERT INTO public.playlist_items (playlist_id, media_item_id, display_order)
VALUES
    ('p1111111-1111-1111-1111-111111111111', 'm1111111-1111-1111-1111-111111111111', 1),
    ('p1111111-1111-1111-1111-111111111111', 'm2222222-2222-2222-2222-222222222222', 2),
    ('p1111111-1111-1111-1111-111111111111', 'm3333333-3333-3333-3333-333333333333', 3)
ON CONFLICT DO NOTHING;

-- Inserir Smart TV Aiwa
INSERT INTO public.devices (id, pairing_code, name, location, orientation, rotation_degrees, transition, current_playlist_id)
VALUES
    ('d1111111-1111-1111-1111-111111111111', 'SMP782', 'TV Aiwa 32 Recepção', 'Hall de Entrada', 'landscape', 0, 'fade', 'p1111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;
