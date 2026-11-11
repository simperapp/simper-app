# Arquitetura do Sistema — simper.app

Plataforma comercial de **Digital Signage** (gerenciamento e reprodução contínua de anúncios em Smart TVs).

---

## 1. Visão Geral

O ecossistema **simper.app** é composto por três componentes principais:

```mermaid
flowchart TD
    subgraph WebAdmin ["Painel Web Administrativo"]
        UI["React + TypeScript + Tailwind CSS"]
        AuthAdmin["Supabase Auth"]
        StorageUpload["Upload de Imagens & Vídeos"]
    end

    subgraph Backend ["Backend Supabase"]
        DB[(PostgreSQL + RLS)]
        StorageBucket["Supabase Storage (media-assets)"]
        Realtime["Realtime Channels & Edge APIs"]
    end

    subgraph Devices ["Parque de Smart TVs (Android TV)"]
        TV1["TV 1 (Aiwa 32' Landscape)"]
        TV2["TV 2 (Totem Vertical 90°)"]
        TVN["TV N (Novas TVs)"]
    end

    UI -->|Gerencia TVs, Playlists e Campanhas| DB
    StorageUpload -->|Envia mídias originais| StorageBucket
    TV1 -->|1. Pareamento por código| DB
    TV1 -->|2. Sincroniza playlist| DB
    TV1 -->|3. Baixa mídias para cache local| StorageBucket
    TV1 -->|4. Envia Proof-of-Play & Ping| DB
    TV2 -.-> DB
    TVN -.-> DB
```

---

## 2. Princípios de Engenharia & Resiliência

1. **Offline-First Absoluto**:
   - A TV **nunca** depende de conexão ativa para reproduzir anúncios que já foram baixados.
   - Uma interrupção de rede não interrompe o loop do ExoPlayer nem escurece a tela.
   - Pings e relatórios de reprodução (*Proof-of-Play*) são enfileirados localmente no SQLite/Room do Android e sincronizados quando a rede for restabelecida.

2. **Evitar Downloads Repetidos**:
   - Cada mídia cadastrada possui um hash `checksum_sha256` gerado no momento do upload.
   - A TV só realiza o download de um arquivo caso o arquivo local não exista ou seu checksum não confira com o registro do banco.

3. **Isolamento de Segurança (Zero Secret Exposure)**:
   - O aplicativo da TV **nunca** armazena `service_role_key` ou credenciais com privilégios de escrita administrativa.
   - O player da TV acessa apenas a API pública anônima do Supabase através de políticas restritivas de **Row Level Security (RLS)**.

4. **Tratamento de Orientação e Hardware**:
   - Smart TVs com painéis fixos (sem suporte a rotação por SO) utilizam rotação interna no viewport gráfico (`View.setRotation` e matriz de layout).
