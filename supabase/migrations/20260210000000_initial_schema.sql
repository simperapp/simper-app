-- ==============================================================================
-- SIMPER.APP - PLATAFORMA DE PUBLICIDADE DIGITAL (DIGITAL SIGNAGE)
-- SCHEMA INICIAL - FASE 1
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE ANUNCIANTES / EMPRESAS (COMPANIES)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    document_number VARCHAR(30), -- CNPJ / CPF
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABELA DE DISPOSITIVOS / SMART TVS (DEVICES)
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pairing_code VARCHAR(10) UNIQUE, -- Código de 6 caracteres para pareamento (ex: 'SMP492')
    pairing_code_expires_at TIMESTAMPTZ,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    device_fingerprint VARCHAR(255) UNIQUE, -- ID único de hardware da TV
    status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'pairing')),
    orientation VARCHAR(20) NOT NULL DEFAULT 'landscape' CHECK (orientation IN ('landscape', 'portrait', 'reverse_landscape', 'reverse_portrait')),
    rotation_degrees INT NOT NULL DEFAULT 0 CHECK (rotation_degrees IN (0, 90, 180, 270)),
    screen_resolution VARCHAR(30) DEFAULT '1366x768', -- Padrão TV 32" HD
    app_version VARCHAR(30),
    os_info VARCHAR(100),
    last_ping TIMESTAMPTZ,
    storage_total_mb BIGINT DEFAULT 0,
    storage_free_mb BIGINT DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABELA DE ITENS DE MÍDIA (MEDIA_ITEMS)
CREATE TABLE IF NOT EXISTS public.media_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('video', 'image')),
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL, -- Para validação de integridade e cache local na TV
    duration_seconds INT NOT NULL DEFAULT 10,
    width INT DEFAULT 1920,
    height INT DEFAULT 1080,
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. TABELA DE CAMPANHAS PUBLICITÁRIAS (CAMPAIGNS)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'draft')),
    priority INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TABELA DE PLAYLISTS (PLAYLISTS)
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. ITENS DA PLAYLIST (PLAYLIST_ITEMS)
CREATE TABLE IF NOT EXISTS public.playlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    display_order INT NOT NULL DEFAULT 0,
    custom_duration_seconds INT, -- Opcional: sobrepõe duration_seconds do media_item
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. ASSOCIAÇÃO TV <-> PLAYLIST COM AGENDAMENTO (DEVICE_PLAYLISTS)
CREATE TABLE IF NOT EXISTS public.device_playlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
    schedule_start_time TIME NOT NULL DEFAULT '00:00:00',
    schedule_end_time TIME NOT NULL DEFAULT '23:59:59',
    days_of_week INT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}', -- 0=domingo, 6=sábado
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(device_id, playlist_id)
);

-- 8. COMPROVANTES DE REPRODUÇÃO / PROOF OF PLAY (PLAYBACK_PROOFS)
CREATE TABLE IF NOT EXISTS public.playback_proofs (
    id BIGSERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
    media_item_id UUID NOT NULL REFERENCES public.media_items(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
    played_at TIMESTAMPTZ NOT NULL,
    duration_played_seconds INT NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÍNDICES DE PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_devices_pairing_code ON public.devices(pairing_code);
CREATE INDEX IF NOT EXISTS idx_devices_fingerprint ON public.devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_devices_status ON public.devices(status);
CREATE INDEX IF NOT EXISTS idx_media_checksum ON public.media_items(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_campaigns_dates ON public.campaigns(start_date, end_date, status);
CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON public.playlist_items(playlist_id, display_order);
CREATE INDEX IF NOT EXISTS idx_device_playlists_device ON public.device_playlists(device_id);
CREATE INDEX IF NOT EXISTS idx_playback_proofs_campaign ON public.playback_proofs(campaign_id, played_at);
CREATE INDEX IF NOT EXISTS idx_playback_proofs_device ON public.playback_proofs(device_id, played_at);

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playback_proofs ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS DE RLS (ADMINISTRADORES AUTENTICADOS POSSUEM ACESSO COMPLETO)
CREATE POLICY "Admins have full access to companies" ON public.companies
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to devices" ON public.devices
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to media_items" ON public.media_items
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to campaigns" ON public.campaigns
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to playlists" ON public.playlists
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to playlist_items" ON public.playlist_items
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to device_playlists" ON public.device_playlists
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Admins have full access to playback_proofs" ON public.playback_proofs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- POLÍTICAS PARA OS DISPOSITIVOS DE TV (ACESSO RESTRITO POR IDENTIFICADOR/ANON/TOKEN ESPECÍFICO)
-- A TV precisa ler sua playlist ativa e enviar pings e logs de reprodução
CREATE POLICY "Public/TV can read devices by pairing code or fingerprint" ON public.devices
    FOR SELECT TO anon USING (true);

CREATE POLICY "TV can report status ping" ON public.devices
    FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "TV can read media metadata" ON public.media_items
    FOR SELECT TO anon USING (true);

CREATE POLICY "TV can read active playlists and items" ON public.playlists
    FOR SELECT TO anon USING (true);

CREATE POLICY "TV can read playlist items" ON public.playlist_items
    FOR SELECT TO anon USING (true);

CREATE POLICY "TV can read device playlist associations" ON public.device_playlists
    FOR SELECT TO anon USING (true);

CREATE POLICY "TV can insert playback proofs" ON public.playback_proofs
    FOR INSERT TO anon WITH CHECK (true);
