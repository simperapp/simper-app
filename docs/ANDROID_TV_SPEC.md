# Especificação Técnica Android TV & Limitações de Hardware

Estudo técnico aprofundado do dispositivo de referência: **Aiwa AWS-TV-32-BL-02-A (32 polegadas)** e ambiente de execução **Android TV 14 (API 34)**.

---

## 1. Perfil de Hardware da TV de Referência

| Componente | Especificação Típica (Aiwa 32") | Impacto no Simper TV Player |
| :--- | :--- | :--- |
| **Painel / Resolução** | 1366x768 (HD Widescreen) | Mídias devem ser renderizadas em 720p ou 1080p máximo. Evitar mídias 4K. |
| **Memória RAM** | 1.0 GB a 1.5 GB | Risco elevado de Out Of Memory (OOM) com múltiplos codecs ativos. |
| **Processador / GPU** | Quad-Core ARM Cortex-A53 / Mali G31 | Decodificador de hardware suporta H.264 (AVC) e H.265 (HEVC) em até 1080p@60fps. |
| **Armazenamento Interno** | 8 GB eMMC (~3 GB livres para dados) | Cache local deve ter teto fixo (ex: 2.0 GB) e expulsão por política LRU. |
| **Conectividade** | Wi-Fi 2.4GHz / Ethernet 10/100 | Sincronizações de download devem ser espaçadas e não travar o loop de renderização. |

---

## 2. Limitações Críticas do Android TV 14 (API 34)

### A. Restrição de Inicialização em Segundo Plano (Background Activity Start)
- **Problema**: O Android 14 proíbe que BroadcastReceivers iniciem Activities em segundo plano sem que a aplicação se enquadre em exceções específicas.
- **Solução Simper**:
  1. Declaração do app com `<category android:name="android.intent.category.LEANBACK_LAUNCHER" />` e suporte a Home Launcher alternativo.
  2. Tratamento dos eventos `BOOT_COMPLETED` e `QUICKBOOT_POWERON` (usado por chipsets de Smart TVs que entram em modo standby em vez de desligamento a frio).
  3. Adição das flags `FLAG_ACTIVITY_NEW_TASK`, `FLAG_ACTIVITY_CLEAR_TOP` e `FLAG_ACTIVITY_SINGLE_TOP`.

### B. Bloqueio de Orientação em Nível de Driver (Landscape Fixo)
- **Problema**: Muitas Smart TVs de entrada possuem o driver de vídeo (`SurfaceFlinger`) travado em modo Landscape. Invocar `setRequestedOrientation(SCREEN_ORIENTATION_PORTRAIT)` é simplesmente ignorado pelo firmware da fabricante.
- **Solução Simper**:
  - Implementação de **rotação por matriz gráfica (TextureView / View Rotation)**.
  - O `OrientationController` do Simper TV detecta a orientação solicitada no painel web (0°, 90°, 180°, 270°) e, além de solicitar ao SO, rotaciona a raiz visual e recalcula as dimensões de layout (`translationX`, `translationY`, inversão de largura e altura) para que o vídeo e as imagens sejam renderizados na vertical mesmo em monitores travados em horizontal.

### C. Gerenciamento de Memória e Prevenção de Vazamento (Memory Leaks)
- **Problema**: Em operações 24/7 de Digital Signage, trocar dezenas de imagens e vídeos por hora pode saturar a memória Heap e provocar encerramento do processo pelo SO.
- **Soluções Implementadas**:
  1. `android:largeHeap="true"` habilitado no `AndroidManifest.xml`.
  2. AndroidX Media3 / ExoPlayer configurado para liberar o `MediaItem` e codecs anteriores antes de transicionar.
  3. Biblioteca **Coil** configurada com limite estrito de cache em memória Bitmap (`maxSizePercent(0.15)`), limpando referências automaticamente.

### D. Modo Tela Cheia Imersiva & Proteção de Queima de Tela (Burn-in)
- O app oculta permanentemente barras de navegação com `WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`.
- Mantém a tela ligada permanentemente com `FLAG_KEEP_SCREEN_ON`.
