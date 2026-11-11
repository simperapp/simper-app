import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 8080;
const APK_PATH = path.resolve('tv-player/app/build/outputs/apk/debug/app-debug.apk');
const UPLOADS_DIR = path.resolve('uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Estado compartilhado em memória para sincronização na rede local
let currentSyncState = {
  activeMediaUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1280&auto=format&fit=crop&q=80',
  title: 'Foto Inicial de Teste',
  type: 'image',
  durationSeconds: 10,
  rotation: 0,
  updatedAt: Date.now()
};

const server = http.createServer((req, res) => {
  // CORS para permitir chamadas do Vite na porta 5173
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // 1. Download do APK
  if (req.url === '/simper-tv.apk' || req.url === '/download' || req.url === '/downloads/simper-tv-player.apk' || req.url === '/simper-tv-player.apk') {
    if (!fs.existsSync(APK_PATH)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo APK não encontrado.');
      return;
    }
    const stat = fs.statSync(APK_PATH);
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="simper-tv.apk"',
      'Content-Length': stat.size,
    });
    fs.createReadStream(APK_PATH).pipe(res);
    return;
  }

  // 2. Servir arquivos de upload locais (para a TV buscar pela rede)
  if (req.url.startsWith('/uploads/')) {
    const fileName = path.basename(req.url);
    const filePath = path.join(UPLOADS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(fileName).toLowerCase();
      const contentType = ext === '.mp4' ? 'video/mp4' : 'image/jpeg';
      res.writeHead(200, { 'Content-Type': contentType });
      fs.createReadStream(filePath).pipe(res);
      return;
    } else {
      res.writeHead(404);
      res.end('Arquivo não encontrado');
      return;
    }
  }

  // 3. API para a TV consultar o anúncio ativo atual (Polling a cada 5s)
  if (req.url.startsWith('/api/device/sync')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(currentSyncState));
    return;
  }

  // 4. API de Upload de Foto do Painel Web para a TV
  if (req.url === '/api/upload-media' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        let rawBase64 = data.base64;
        let ext = '.jpg';
        let mediaType = data.type || 'image';

        const matches = rawBase64.match(/^data:([a-zA-Z0-9\/\-+.]+);base64,(.+)$/);
        if (matches) {
          const mime = matches[1];
          rawBase64 = matches[2];
          if (mime.includes('video') || mime.includes('mp4') || mime.includes('webm')) {
            ext = '.mp4';
            mediaType = 'video';
          } else if (mime.includes('png')) {
            ext = '.png';
          } else if (mime.includes('webp')) {
            ext = '.webp';
          }
        } else if (mediaType === 'video') {
          ext = '.mp4';
        }

        const buffer = Buffer.from(rawBase64, 'base64');
        const filename = `${mediaType}_tv_${Date.now()}${ext}`;
        const filePath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(filePath, buffer);

        // Atualiza o estado da TV para exibir a nova mídia imediatamente
        currentSyncState = {
          activeMediaUrl: `http://192.168.1.11:8080/uploads/${filename}`,
          title: data.title || (mediaType === 'video' ? 'Vídeo Comercial' : 'Foto Comercial'),
          type: mediaType,
          durationSeconds: data.durationSeconds || (mediaType === 'video' ? 15 : 10),
          rotation: data.rotation || 0,
          updatedAt: Date.now()
        };

        console.log(`[SIMPER] Nova mídia (${mediaType}) recebida e direcionada para a TV: ${currentSyncState.activeMediaUrl}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, url: currentSyncState.activeMediaUrl, type: mediaType }));
      } catch (err) {
        console.error('Erro ao processar upload:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Servir Logo
  if (req.url === '/logo.png') {
    const logoPath = path.resolve('admin-web/public/logo.png');
    if (fs.existsSync(logoPath)) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      fs.createReadStream(logoPath).pipe(res);
      return;
    }
  }

  // Página inicial de download
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Simper TV - Servidor de Instalação</title>
  <style>
    body { background: #060B18; color: #FFF; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; }
    .card { background: #101B37; border: 1px solid #233866; border-radius: 24px; padding: 40px; max-width: 480px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .logo { width: 140px; height: 140px; object-fit: contain; border-radius: 20px; margin-bottom: 20px; background: white; padding: 10px; }
    .btn { display: inline-block; background: #2563EB; color: #FFFFFF; text-decoration: none; font-weight: bold; padding: 16px 32px; border-radius: 16px; margin-top: 24px; font-size: 16px; }
    .btn:hover { background: #1D4ED8; }
  </style>
</head>
<body>
  <div class="card">
    <img src="/logo.png" alt="Simper Logo" class="logo" />
    <h2 style="margin: 0 0 8px 0; font-size: 26px;">SIMPER TV PLAYER</h2>
    <p style="color: #94A3B8; font-size: 14px; margin: 0;">Aplicativo Oficial para Smart TVs e Totens</p>
    <a href="/simper-tv.apk" class="btn">⬇️ BAIXAR APK ATUALIZADO (12.4 MB)</a>
  </div>
</body>
</html>
  `);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de sincronização e download ativo na porta ${PORT}`);
});
