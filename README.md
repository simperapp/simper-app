# simper.app — Plataforma de Publicidade Digital (Digital Signage)

Plataforma comercial para gerenciamento centralizado e reprodução contínua de anúncios em Smart TVs.

## Estrutura do Monorepo

```
simper-app/
├── admin-web/       # Painel Web Administrativo (React + TypeScript + Tailwind CSS)
├── tv-player/       # Aplicativo Android TV Nativo (Kotlin + AndroidX Media3 / ExoPlayer)
├── supabase/        # Migrações PostgreSQL, RLS e dados de seed
└── docs/            # Documentação arquitetural e especificações técnicas
```

## Status de Desenvolvimento

- [x] **FASE 1: Fundação, Arquitetura e Configuração**
- [ ] **FASE 2: Autenticação, Dashboard e Vinculação de TVs por Código**
- [ ] **FASE 3: Cadastro de Anunciantes, Mídias e Playlists**
- [ ] **FASE 4: Player Android TV, Cache Offline e Sincronização**
- [ ] **FASE 5: Inicialização Automática e Validação em Hardware Real (Aiwa 32")**

Para detalhes técnicos, consulte os documentos em `docs/`.
