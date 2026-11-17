-- ==============================================================================
-- SIMPER.APP - ESQUELETO LIMPO PARA NOVO PROJETO SUPABASE (sem dados)
-- Cole tudo no SQL Editor do projeto novo e clique em RUN.
-- ==============================================================================

-- 1. PLAYLISTS
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. MÍDIAS (FOTOS E VÍDEOS)
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('video', 'image')),
    storage_path TEXT,
    public_url TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    checksum_sha256 VARCHAR(64) DEFAULT '',
    duration_seconds INT NOT NULL DEFAULT 10,
    width INT,
    height INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Proteção: impede salvar base64 no banco (foi o que estourou a cota)
    CONSTRAINT media_url_nao_base64 CHECK (public_url NOT LIKE 'data:%')
);

-- 3. ITENS DA PLAYLIST
CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SMART TVS (todas as colunas que o app da TV e o painel usam)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pairing_code VARCHAR(10) UNIQUE,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    device_fingerprint VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'pairing')),
    orientation VARCHAR(20) NOT NULL DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait')),
    rotation_degrees INT NOT NULL DEFAULT 0 CHECK (rotation_degrees IN (0, 90, 180, 270)),
    transition VARCHAR(20) NOT NULL DEFAULT 'fade' CHECK (transition IN ('fade', 'cut', 'slide', 'zoom')),
    current_playlist_id UUID REFERENCES public.playlists(id) ON DELETE SET NULL,
    current_media_index INT NOT NULL DEFAULT 0,
    is_playing BOOLEAN NOT NULL DEFAULT true,
    screen_resolution VARCHAR(20),
    app_version VARCHAR(20),
    os_info VARCHAR(100),
    storage_free_mb BIGINT,
    storage_total_mb BIGINT,
    last_ping TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. COMPROVANTES DE EXIBIÇÃO (PROOF OF PLAY)
CREATE TABLE IF NOT EXISTS public.playback_proofs (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE,
    media_item_id UUID REFERENCES public.media_items(id) ON DELETE CASCADE,
    played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    duration_played_seconds INT NOT NULL DEFAULT 10
);

-- ==============================================================================
-- PERMISSÕES (painel web e TV usam a anon key)
-- ==============================================================================
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_proofs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Acesso total publico playlists" ON public.playlists;
DROP POLICY IF EXISTS "Acesso total publico media_items" ON public.media_items;
DROP POLICY IF EXISTS "Acesso total publico playlist_items" ON public.playlist_items;
DROP POLICY IF EXISTS "Acesso total publico devices" ON public.devices;
DROP POLICY IF EXISTS "Acesso total publico playback_proofs" ON public.playback_proofs;

CREATE POLICY "Acesso total publico playlists" ON public.playlists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico media_items" ON public.media_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico playlist_items" ON public.playlist_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico devices" ON public.devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total publico playback_proofs" ON public.playback_proofs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- STORAGE: bucket público "media" (upload de fotos/vídeos pelo painel, limite 15 MB por arquivo)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('media', 'media', true, 15728640)
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 15728640;

DROP POLICY IF EXISTS "Public media access" ON storage.objects;
CREATE POLICY "Public media access" ON storage.objects
FOR ALL USING (bucket_id = 'media') WITH CHECK (bucket_id = 'media');

-- ==============================================================================
-- REALTIME (painel atualiza sozinho)
-- ==============================================================================
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['playlists','media_items','playlist_items','devices'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- ==============================================================================
-- PLAYLIST INICIAL VAZIA (o painel adiciona as mídias novas nela)
-- ==============================================================================
INSERT INTO public.playlists (name, description)
SELECT 'Grade Principal de Anúncios', 'Sequência contínua de anúncios comerciais na Smart TV'
WHERE NOT EXISTS (SELECT 1 FROM public.playlists);
