# Convenção de Releases e Versionamento — simper.app

Este documento define o padrão de versionamento semântico, ciclo de lançamento e gestão de artefatos para a plataforma **simper.app**.

---

## 1. Padrão de Versionamento (SemVer 2.0.0)

Adotamos a estrutura `MAJOR.MINOR.PATCH`:

- **MAJOR (ex: v2.0.0)**: Mudanças arquiteturais que quebram compatibilidade retroativa (ex: alteração na estrutura de sincronização entre painel web e player Android).
- **MINOR (ex: v2.4.0)**: Novas funcionalidades adicionadas de forma retrocompatível (ex: nova aba de configurações, novos efeitos de transição, suporte a novos formatos de vídeo).
- **PATCH (ex: v2.4.1)**: Correções de bugs, ajustes cosméticos ou melhorias de estabilidade sem adição de novos recursos.

---

## 2. Componentes e Versionamento

O monorepo mantém versionamentos alinhados por tag:

| Componente | Localização | Identificador de Versão |
| :--- | :--- | :--- |
| **Painel Web (Admin)** | `/admin-web` | `package.json` (`"version": "2.4.0"`) |
| **TV Player (Android)** | `/tv-player` | `app/build.gradle.kts` (`versionCode`, `versionName`) |
| **Servidor de Download** | `/download-server.mjs` | Header do serviço |
| **Backend Database** | `/supabase/migrations` | Timestamp de migração (`YYYYMMDDHHMMSS`) |

---

## 3. Matriz de Status Atual das Funcionalidades

| Módulo | Funcionalidade | Status | Ambiente Validado |
| :--- | :--- | :---: | :--- |
| **Web Admin** | Autenticação com sessão persistente (`dono` / `1491`) | ✅ Implementado | Desktop & Mobile |
| **Web Admin** | Gestão de TVs (cadastro, renomear, exclusão) | ✅ Implementado | Desktop & Mobile |
| **Web Admin** | Biblioteca de Mídias (upload de fotos e vídeos MP4/WebM) | ✅ Implementado | Desktop & Mobile |
| **Web Admin** | Gerenciador de Playlists com cálculo de ciclo | ✅ Implementado | Desktop & Mobile |
| **Web Admin** | Live Preview de Totem Vertical (9:16) | ✅ Implementado | Desktop & Mobile |
| **Web Admin** | Controles Remotos em Tempo Real (Skip, Pause, Rotação) | ✅ Implementado | Desktop & Mobile |
| **Web Admin** | Modo Claro / Modo Escuro via Tokens | ✅ Implementado | Desktop & Mobile |
| **Web Admin** | Aba de Configurações do Sistema | ✅ Implementado | Desktop & Mobile |
| **TV Player** | Inicialização Automática no Boot (`BootReceiver`) | ✅ Implementado | Bancada de Testes Android |
| **TV Player** | Serviço Foreground de Kiosk (`KioskService`) | ✅ Implementado | Bancada de Testes Android |
| **TV Player** | Engine de Transições (`fade`, `cut`, `slide`, `zoom`) | ✅ Implementado | Bancada de Testes Android |
| **TV Player** | Reprodução Contínua com ExoPlayer / Media3 | ✅ Implementado | Bancada de Testes Android |
| **TV Player** | Comandos via Controle Remoto Físico da TV | ✅ Implementado | Bancada de Testes Android |
| **TV Player** | Rotação por Software (0°, 90°, 180°, 270°) | ✅ Implementado | Bancada de Testes Android |
| **TV Player** | Validação de Estresse Contínuo 24/7 | ⏳ Em Homologação | Testes de longa duração em andamento |
| **Nuvem** | Sincronização via Supabase (PostgreSQL + RLS) | ✅ Implementado | Cloud Supabase |
| **Local Sync** | Servidor de Mídias em Rede Local (porta 8080) | ✅ Implementado | Node.js Server |

---

## 4. Fluxo de Publicação de Release

1. **Testes de Integração**:
   - Compilação limpa do `admin-web` (`npm run build`).
   - Compilação limpa do `tv-player` (`./gradlew assembleRelease`).
2. **Atualização do Changelog**:
   - Registro das melhorias na seção correspondente.
3. **Criação da Tag Git**:
   ```bash
   git tag -a v2.4.0 -m "Release v2.4.0: Suporte a vídeo, controle remoto e painel administrativo"
   git push origin v2.4.0
   ```
4. **Deploy Web**:
   - Build estático publicado no branch `gh-pages` com base relativa (`./`).
