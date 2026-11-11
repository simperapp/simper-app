# Guia de Instalação e Configuração — Simper TV Player (Android TV)

Este documento detalha o processo de compilação, instalação (*sideloading*) e parametrização do aplicativo **Simper TV Player** em Smart TVs com Android TV / Google TV, com foco no modelo **Aiwa AWS-TV-32-BL-02-A 32" HD** e equipamentos compatíveis (Android 9+).

---

## 1. Pré-Requisitos na Smart TV

Antes de iniciar a instalação do APK, execute as configurações iniciais na TV:

### 1.1 Habilitar o Modo Desenvolvedor
1. Na Smart TV, acesse **Configurações (Ícone de Engrenagem)** > **Preferências do Dispositivo** > **Sobre**.
2. Desça até a opção **Número da Versão (Build)** e pressione o botão **OK** do controle remoto **7 vezes seguidas** até surgir a mensagem: *"Você agora é um desenvolvedor!"*.

### 1.2 Ativar Depuração USB / Rede
1. Volte ao menu anterior e acesse **Opções do Desenvolvedor**.
2. Ative as opções:
   - **Depuração USB** (permite comandos ADB via cabo ou rede).
   - **Instalar apps de fontes desconhecidas** ou **Verificar apps via USB** (conforme a versão do Android).

### 1.3 Conectar a TV na Mesma Rede Wi-Fi / Ethernet
- Certifique-se de que a Smart TV e o computador de desenvolvimento/servidor estejam conectados na mesma rede local (ex: `192.168.1.x`).
- Anote o endereço IP da TV em **Configurações** > **Rede e Internet** > **Status da Conexão**.

---

## 2. Compilação do APK

No computador de desenvolvimento (com JDK 17 e Android SDK instalados):

```bash
# Acesse o diretório do projeto Android
cd tv-player

# Compile o pacote de debug
./gradlew assembleDebug

# O arquivo compilado estará disponível em:
# tv-player/app/build/outputs/apk/debug/app-debug.apk
```

---

## 3. Métodos de Instalação (Sideloading)

Escolha o método mais conveniente para o seu cenário:

### Método A: Via ADB pela Rede Local (Recomendado para Desenvolvimento)

1. No terminal do seu computador, conecte à Smart TV pelo IP anotado:
   ```bash
   adb connect 192.168.1.X:5555
   ```
2. Na tela da TV, surgirá um diálogo de autorização: *"Permitir depuração USB?"*. Marque a opção *"Sempre permitir a partir deste computador"* e clique em **OK**.
3. Confirme a conexão no terminal:
   ```bash
   adb devices
   # Deve listar: 192.168.1.X:5555 device
   ```
4. Instale o APK diretamente:
   ```bash
   adb install -r tv-player/app/build/outputs/apk/debug/app-debug.apk
   ```
5. Inicie o aplicativo remotamente para validar:
   ```bash
   adb shell am start -n app.simper.tvplayer/.ui.MainActivity
   ```

---

### Método B: Via Pendrive USB

1. Copie o arquivo `app-debug.apk` para a raiz de um pendrive formatado em **FAT32**.
2. Conecte o pendrive na porta USB da Smart TV.
3. Na TV, abra um aplicativo gerenciador de arquivos (ex: *FX File Explorer*, *AnExplorer* ou o explorador padrão da TV).
4. Localize o arquivo `app-debug.apk` no pendrive e pressione **OK** para instalar.
5. Se solicitado, conceda permissão de *"Fontes Desconhecidas"* para o gerenciador de arquivos utilizado.

---

### Método C: Via Aplicativo "Downloader by AFTVnews"

Caso não tenha cabo nem pendrive no local da instalação:

1. Na Google Play Store da Smart TV, pesquise e instale o aplicativo gratuito **Downloader by AFTVnews**.
2. Abra o *Downloader* e permita acesso aos arquivos da TV.
3. No campo de URL do Downloader, digite o endereço de download do servidor local ou GitHub Pages:
   ```text
   http://192.168.1.11:8080/simper-tv.apk
   # ou
   https://simperapp.github.io/simper-app/downloads/simper-tv-player.apk
   ```
4. O download será iniciado e, ao término, selecione **Install**.

---

## 4. Configurações Essenciais pós-Instalação (Modo Quiosque)

Para garantir operação autônoma ininterrupta (o sistema inicia sozinho e não desliga):

### 4.1 Permissão de Inicialização Automática no Boot
O aplicativo possui o `BootReceiver` registrado para os intents:
- `android.intent.action.BOOT_COMPLETED`
- `android.intent.action.QUICKBOOT_POWERON`
- `android.intent.action.REBOOT`

Ao reiniciar a TV (seja por desligamento físico ou queda de energia), o app é iniciado automaticamente sem intervenção humana.

### 4.2 Desativar Otimização de Bateria para o Simper
Em algumas TVs Android, o sistema encerra processos em segundo plano após horas de exibição contínua. Para desativar:
1. Vá em **Configurações** > **Apps** > **Acesso especial a apps** > **Otimização de Bateria**.
2. Localize **Simper TV Player** e marque como **Não otimizar**.

### 4.3 Desativar Modo Soneca / Protetor de Tela da TV
1. Em **Configurações** > **Preferências do Dispositivo** > **Protetor de tela**, defina para **Desativado** ou **Nunca iniciar**.
2. Em **Configurações de Energia**, defina o tempo de desligamento automático por inatividade para **Desligado**.

### 4.4 Definir como Aplicativo Inicial (Launcher Padrão) — Opcional
O manifesto do Simper TV Player inclui a categoria `android.intent.category.HOME`. Caso deseje que a TV nunca exiba a tela inicial do Android ao ligar:
- Pressione o botão **Home** no controle remoto da TV.
- Selecione **Simper TV Player** e marque a opção **Sempre**.

---

## 5. Vinculação da Tela ao Painel Administrativo

1. Ao abrir o aplicativo pela primeira vez, a tela exibirá uma mensagem de boas-vindas com o **Código de Pareamento de 6 Dígitos** (ex: `A8F3K2`).
2. Acesse o Painel Web em [simperapp.github.io/simper-app](https://simperapp.github.io/simper-app/).
3. Faça login com as credenciais administrativas.
4. Navegue até a aba **Smart TVs** e clique em **Cadastrar Nova TV**.
5. Digite o código de 6 dígitos exibido na TV, dê um nome (ex: *"Totem Entrada Principal"*) e selecione a Playlist inicial.
6. Em até 3 segundos, a Smart TV receberá a programação via nuvem, baixará os arquivos de mídia para o armazenamento local e iniciará a rotação contínua.

---

## 6. Comandos pelo Controle Remoto Físico da TV

O aplicativo intercepta os eventos de teclado e controle remoto da TV:

| Tecla no Controle Remoto | Ação no Simper TV Player |
| :--- | :--- |
| **D-Pad Direita** / **Mídia Próximo (⏭️)** | Avança imediatamente para o próximo anúncio. |
| **D-Pad Esquerda** / **Mídia Anterior (⏮️)** | Retorna para o anúncio anterior. |
| **Play/Pause (⏯️)** | Pausa ou retoma o ciclo de rotação. |
| **OK / Centro do D-Pad** | Exibe brevemente (6 segundos) a barra informativa com o código da tela e status da nuvem, ocultando-se em seguida para manter os anúncios 100% limpos. |
