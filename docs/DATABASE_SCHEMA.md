# Modelagem de Dados — simper.app

Modelagem relacional para PostgreSQL hospedado no Supabase com suporte a Row Level Security (RLS).

---

## 1. Diagrama Entidade-Relacionamento

```mermaid
erDiagram
    COMPANIES ||--o{ CAMPAIGNS : possui
    COMPANIES ||--o{ MEDIA_ITEMS : possui
    CAMPAIGNS ||--o{ PLAYLIST_ITEMS : inclui
    MEDIA_ITEMS ||--o{ PLAYLIST_ITEMS : referencia
    PLAYLISTS ||--o{ PLAYLIST_ITEMS : contem
    PLAYLISTS ||--o{ DEVICE_PLAYLISTS : vinculada
    DEVICES ||--o{ DEVICE_PLAYLISTS : reproduz
    DEVICES ||--o{ PLAYBACK_PROOFS : registra
    MEDIA_ITEMS ||--o{ PLAYBACK_PROOFS : contabiliza

    COMPANIES {
        uuid id PK
        varchar name
        varchar document_number
        varchar contact_email
        boolean is_active
    }

    DEVICES {
        uuid id PK
        varchar pairing_code UK
        varchar name
        varchar status
        varchar orientation
        int rotation_degrees
        varchar screen_resolution
        timestamptz last_ping
    }

    MEDIA_ITEMS {
        uuid id PK
        varchar title
        varchar type
        text public_url
        varchar checksum_sha256
        int duration_seconds
    }

    CAMPAIGNS {
        uuid id PK
        uuid company_id FK
        varchar name
        timestamptz start_date
        timestamptz end_date
        varchar status
    }

    PLAYLISTS {
        uuid id PK
        varchar name
        boolean is_default
    }

    PLAYLIST_ITEMS {
        uuid id PK
        uuid playlist_id FK
        uuid media_item_id FK
        uuid campaign_id FK
        int display_order
        int custom_duration_seconds
    }

    DEVICE_PLAYLISTS {
        uuid id PK
        uuid device_id FK
        uuid playlist_id FK
        time schedule_start_time
        time schedule_end_time
        int[] days_of_week
    }

    PLAYBACK_PROOFS {
        bigserial id PK
        uuid device_id FK
        uuid media_item_id FK
        uuid campaign_id FK
        timestamptz played_at
        int duration_played_seconds
    }
```

---

## 2. Regras de Integridade e Índices

- **`devices.pairing_code`**: Código de 6 caracteres alfanuméricos com índice único para consulta instantânea durante a vinculação na TV.
- **`media_items.checksum_sha256`**: Índice de busca para deduplicação de mídias e verificação de cache no player.
- **`playback_proofs`**: Tabela append-only com indexação composta em `(device_id, played_at)` e `(campaign_id, played_at)` para relatórios de auditoria e métricas de faturamento para os anunciantes.
- **Row Level Security (RLS)**:
  - Usuários autenticados no painel web (Role `authenticated`) têm permissão integral de CRUD.
  - O player de TV (Role `anon`) tem permissão de leitura restrita à sua própria playlist e permissão de inserção de pings e comprovantes de reprodução.
