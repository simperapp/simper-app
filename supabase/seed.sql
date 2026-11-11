-- ==============================================================================
-- SIMPER.APP - DADOS INICIAIS DE TESTE (SEED)
-- ==============================================================================

-- 1. Anunciantes de exemplo
INSERT INTO public.companies (id, name, document_number, contact_email, contact_phone)
VALUES
    ('c1111111-1111-1111-1111-111111111111', 'Restaurante Sabor & Arte', '12.345.678/0001-90', 'contato@saborearte.com', '(11) 98765-4321'),
    ('c2222222-2222-2222-2222-222222222222', 'Academia IronFit', '98.765.432/0001-10', 'marketing@ironfit.com.br', '(11) 91234-5678')
ON CONFLICT (id) DO NOTHING;

-- 2. Dispositivo / Smart TV de exemplo (TV Aiwa 32")
INSERT INTO public.devices (id, pairing_code, name, location, device_fingerprint, status, orientation, rotation_degrees, screen_resolution, os_info)
VALUES
    ('d1111111-1111-1111-1111-111111111111', 'SMP782', 'TV Recepção Principal', 'Hall de Entrada - Bloco A', 'AIWA-AWS32-FINGERPRINT-001', 'online', 'landscape', 0, '1366x768', 'Android TV 14 (API 34) - Aiwa AWS-TV-32-BL-02-A')
ON CONFLICT (id) DO NOTHING;

-- 3. Campanhas
INSERT INTO public.campaigns (id, company_id, name, description, start_date, end_date, status, priority)
VALUES
    ('ca111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111', 'Campanha Almoço Executivo', 'Divulgação do menu executivo', now() - interval '2 days', now() + interval '28 days', 'active', 1),
    ('ca222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222', 'Promoção Verão Fit', 'Matrícula com 50% de desconto', now() - interval '5 days', now() + interval '25 days', 'active', 2)
ON CONFLICT (id) DO NOTHING;

-- 4. Playlist principal
INSERT INTO public.playlists (id, name, description, is_default)
VALUES
    ('p1111111-1111-1111-1111-111111111111', 'Programação Padrão - Recepção', 'Playlist contínua de anúncios comerciais', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Vincular TV à Playlist
INSERT INTO public.device_playlists (device_id, playlist_id, schedule_start_time, schedule_end_time, days_of_week, is_active)
VALUES
    ('d1111111-1111-1111-1111-111111111111', 'p1111111-1111-1111-1111-111111111111', '06:00:00', '23:00:00', '{0,1,2,3,4,5,6}', true)
ON CONFLICT (device_id, playlist_id) DO NOTHING;
