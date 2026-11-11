# Relatório de Execução — FASE 1: Fundação e Estrutura

**Projeto:** simper.app — Plataforma de Publicidade Digital (Digital Signage)  
**Data:** 10/11/2026  
**Responsável Técnico:** Arquiteto de Software & Engenheiro Sênior  

---

## 1. Status Geral da Fase 1

| Componente / Pilar | Status | Descrição |
| :--- | :---: | :--- |
| **Estrutura dos Projetos** | **Concluído** | Organização monorepo modular (`admin-web/`, `tv-player/`, `supabase/`, `docs/`). |
| **Painel Web Administrativo** | **Concluído** | React 19 + TypeScript + Tailwind CSS (Paleta institucional Navy `#0A1128` e Gold `#D4AF37`, cards SaaS inspirados em px-suite, visualização de planos comerciais, tabela de TVs e monitoramento). |
| **Arquitetura Android TV** | **Concluído** | Projeto nativo Kotlin, Media3 (ExoPlayer), Leanback, Coil, BootReceiver para inicialização automática no boot, suporte a rotação em tela vertical/horizontal (`OrientationController`). |
| **Modelagem de Banco de Dados** | **Concluído** | Migrations SQL do PostgreSQL/Supabase com RLS habilitado, índices compostos e script de seed com dados iniciais. |
| **Mapeamento de Hardware (Aiwa 32")** | **Concluído** | Análise de limitações do Android TV 14, mitigação de OOM via LargeHeap, cache local e rotação por View para firmwares com display fixo. |
| **Documentação Técnica** | **Concluído** | Arquitetura geral, especificação de banco de dados e runbook do Android TV. |

---

## 2. Decisões Arquiteturais Justificadas

1. **Abordagem de Rotação Híbrida no Android TV**:
   - Muitas Smart TVs (como a Aiwa AWS-TV-32-BL-02-A com chipset MediaTek) não implementam rotação de tela no driver de vídeo. O Simper TV Player aplica uma rotação a nível de View/Surface com recálculo de translation e layout para permitir telas verticais sem distorção.
2. **Resiliência Offline no Player**:
   - A TV baixa os arquivos de vídeo e imagem diretamente para o armazenamento interno (com verificação de hash SHA256) e toca continuamente a partir do cache local. Quedas de internet não interrompem os anúncios.
3. **Isolamento de Segurança**:
   - A chave `service_role` fica exclusivamente restrita a funções de backend ou dashboard autenticado. O player da TV se comunica através de políticas RLS públicas anônimas que permitem apenas a leitura de playlists ativas e inserção de comprovantes de reprodução.

---

## 3. Próximos Passos (Transição para a FASE 2)

Na Fase 2, serão implementados:
1. Autenticação completa no Painel Web via Supabase Auth (Login/Logout/Recuperação de Senha).
2. Interface administrativa para cadastro de novas Smart TVs.
3. Fluxo de vinculação em tempo real: a TV exibe o código de pareamento de 6 dígitos (ex: `SMP782`) e o painel web confirma a ativação.
