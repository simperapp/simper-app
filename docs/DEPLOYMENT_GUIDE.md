# Guia de Instalação, Deploy e Testes — simper.app

Instruções para deploy do Painel Web, configuração do banco Supabase e instalação do Player APK na Smart TV Aiwa (ou emulador Android TV).

---

## 1. Painel Web Administrativo (`admin-web/`)

### Execução Local:
```bash
cd admin-web
npm install
npm run dev
```
O painel estará disponível em `http://localhost:5173`.

### Configuração com Supabase Real:
Crie um arquivo `.env` dentro de `admin-web/`:
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima-publica
```
*Nota: Mesmo sem configurar variáveis de ambiente, o painel roda em modo interativo com cache local, permitindo testar pareamento, rotação, campanhas e playlists imediatamente.*

### Build de Produção:
```bash
npm run build
```
Os arquivos estáticos otimizados serão gerados na pasta `admin-web/dist/`, prontos para hospedagem no Vercel, Netlify, Cloudflare Pages ou Supabase Storage.

---

## 2. Banco de Dados Supabase (`supabase/`)

1. No painel do seu projeto Supabase, acesse o **SQL Editor**.
2. Execute o conteúdo de `supabase/migrations/20260210000000_initial_schema.sql`.
   - Cria as tabelas `devices`, `companies`, `campaigns`, `media_items`, `playlists`, `playlist_items`, `device_playlists` e `playback_proofs`.
   - Habilita e configura as regras de **Row Level Security (RLS)**.
3. (Opcional) Execute o script `supabase/seed.sql` para carregar dados de demonstração.
4. Crie um Bucket no Supabase Storage:
   - Nome: `media-assets`
   - Acesso: **Public** (leitura pública para download das TVs).

---

## 3. Aplicativo Smart TV (`tv-player/`)

### Compilação do APK:
Abra a pasta `tv-player/` no **Android Studio** (Koala ou Ladybug) ou compile via terminal:
```bash
cd tv-player
./gradlew assembleDebug
```
O APK será gerado em: `tv-player/app/build/outputs/apk/debug/app-debug.apk`.

### Instalação na TV de Referência (Aiwa AWS-TV-32-BL-02-A):
1. **Ativar Modo Desenvolvedor na TV**:
   - Acesse **Configurações da TV** -> **Preferências do Dispositivo** -> **Sobre**.
   - Desça até **Número da Versão / Build** e pressione o botão central do controle remoto **7 vezes**.
2. **Ativar Depuração USB / Rede**:
   - Acesse **Configurações** -> **Opções do Desenvolvedor** -> Ative **Depuração USB / Rede**.
3. **Obter o IP da TV**:
   - Em **Configurações de Rede**, anote o endereço IP (ex: `192.168.1.150`).
4. **Instalar via ADB pelo Computador**:
   ```bash
   adb connect 192.168.1.150:5555
   adb install -r tv-player/app/build/outputs/apk/debug/app-debug.apk
   ```
5. **Executar**:
   ```bash
   adb shell monkey -p app.simper.tvplayer -c android.intent.category.LAUNCHER 1
   ```

---

## 4. Teste de Pareamento e Funcionamento Offline

1. Ao abrir o aplicativo na TV, o código de 6 caracteres (ex: `SMP782`) aparecerá na tela.
2. No painel web (`admin-web`), clique em **+ Vincular TV**, digite o código, informe a orientação desejada (Horizontal 0° ou Vertical 90°) e confirme.
3. A TV automaticamente:
   - Identifica o pareamento.
   - Baixa os vídeos e fotos para o cache local interno (`/data/data/app.simper.tvplayer/files/media_cache/`).
   - Inicia o loop contínuo de exibição.
4. **Teste de Resiliência Offline**:
   - Desconecte o cabo de rede ou desligue o Wi-Fi da TV.
   - O loop continuará rodando ininterruptamente a partir dos arquivos salvos em cache.
