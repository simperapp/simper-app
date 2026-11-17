import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';

const PORT = 8080;
const APK_PATH = path.resolve('tv-player/app/build/outputs/apk/debug/app-debug.apk');
const UPLOADS_DIR = path.resolve('uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '192.168.3.13';
}

const LOCAL_IP = getLocalIp();

// Estado compartilhado em memória e persistente para sincronização local e nuvem
let deviceState = {
  id: 'd5f8ef44-ab95-4927-89fe-d12d99986806',
  pairing_code: 'SMPSMX',
  name: 'TV Aiwa 32 (SMPSMX)',
  location: 'Hall de Entrada',
  status: 'online',
  orientation: 'portrait',
  rotation_degrees: 90,
  transition: 'fade',
  is_playing: true,
  current_media_index: 0,
  last_ping: new Date().toISOString(),
  media_items: [
    {
      id: '508dadac-c3ad-4475-9ed0-624fc9c091d7',
      title: 'Anuncie sua empresa com a Simper',
      type: 'image',
      public_url: 'https://raw.githubusercontent.com/simperapp/simper-app/main/admin-web/public/media/foto_tv_1794361335533.jpg',
      duration_seconds: 10
    },
    {
      id: '7f4e60e7-ad32-4875-b978-c4b02fa1eee6',
      title: 'Lua Nova Importados - Visite Nossa Loja',
      type: 'image',
      public_url: 'https://raw.githubusercontent.com/simperapp/simper-app/main/admin-web/public/media/foto_tv_1794370161556.jpg',
      duration_seconds: 10
    },
    {
      id: 'a7ac2f90-aa33-40e1-b627-5ff76a45687a',
      title: 'Anúncio Personalizado',
      type: 'image',
      public_url: 'https://raw.githubusercontent.com/simperapp/simper-app/main/admin-web/public/media/anuncio_novo_usuario.png',
      duration_seconds: 10
    },
    {
      id: '8d395421-8868-461c-bd0d-e4e0a7e0f32e',
      title: 'Salgadinhos e Pães de Queijo Mineiros',
      type: 'image',
      public_url: 'https://raw.githubusercontent.com/simperapp/simper-app/main/admin-web/public/media/foto_tv_1794370531160.jpg',
      duration_seconds: 10
    }
  ],
  updated_at: Date.now()
};

const server = http.createServer((req, res) => {
  // CORS universal para permitir chamadas do Vite (5173), Web Admin e Android TV
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const hostHeader = req.headers.host || `${LOCAL_IP}:${PORT}`;
  const baseUrl = `http://${hostHeader}`;

  // 1. Download do APK
  if (req.url === '/simper-tv.apk' || req.url === '/download' || req.url === '/downloads/simper-tv-player.apk' || req.url === '/simper-tv-player.apk') {
    if (!fs.existsSync(APK_PATH)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Arquivo APK ainda não foi compilado.');
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

  // 2. Servir arquivos de mídia locais (uploads)
  if (req.url.startsWith('/uploads/')) {
    const fileName = path.basename(req.url.split('?')[0]);
    const filePath = path.join(UPLOADS_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(fileName).toLowerCase();
      let contentType = 'application/octet-stream';
      if (ext === '.mp4') contentType = 'video/mp4';
      else if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    } else {
      res.writeHead(404);
      res.end('Arquivo não encontrado');
      return;
    }
  }

  // 3. API de Sincronização da TV: consulta rotação, play/pause e playlist
  if (req.url.startsWith('/api/device/sync')) {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(deviceState));
    return;
  }

  // 4. API para o Web Admin atualizar estado da TV (Rotação 90°, Play/Pause, etc.)
  if (req.url === '/api/device/update' && (req.method === 'POST' || req.method === 'PATCH')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        if (updates.rotation_degrees !== undefined) {
          deviceState.rotation_degrees = updates.rotation_degrees;
          deviceState.orientation = (updates.rotation_degrees === 90 || updates.rotation_degrees === 270) ? 'portrait' : 'landscape';
        }
        if (updates.orientation !== undefined) {
          deviceState.orientation = updates.orientation;
        }
        if (updates.is_playing !== undefined) {
          deviceState.is_playing = updates.is_playing;
        }
        if (updates.transition !== undefined) {
          deviceState.transition = updates.transition;
        }
        if (updates.current_media_index !== undefined) {
          deviceState.current_media_index = updates.current_media_index;
        }
        if (updates.playlist !== undefined && Array.isArray(updates.playlist)) {
          deviceState.media_items = updates.playlist;
        }
        deviceState.updated_at = Date.now();

        console.log(`[SIMPER SERVER] Atualização da TV: Rotação ${deviceState.rotation_degrees}°, Play: ${deviceState.is_playing}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, state: deviceState }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // 5. Heartbeat da Smart TV (indica TV online)
  if (req.url === '/api/device/heartbeat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        deviceState.last_ping = new Date().toISOString();
        deviceState.status = 'online';
        if (payload.pairing_code) deviceState.pairing_code = payload.pairing_code;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      }
    });
    return;
  }

  // 6. Lista de dispositivos e mídias
  if (req.url === '/api/devices' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([deviceState]));
    return;
  }

  if (req.url === '/api/media' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(deviceState.media_items));
    return;
  }

  // 7. API de Upload de Foto ou Vídeo
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

        const mediaUrl = `${baseUrl}/uploads/${filename}`;
        const newMediaItem = {
          id: `media_${Date.now()}`,
          title: data.title || (mediaType === 'video' ? 'Vídeo Comercial' : 'Foto Comercial'),
          type: mediaType,
          public_url: mediaUrl,
          duration_seconds: data.durationSeconds || (mediaType === 'video' ? 15 : 10)
        };

        deviceState.media_items.push(newMediaItem);
        deviceState.updated_at = Date.now();

        console.log(`[SIMPER SERVER] Nova mídia (${mediaType}) salva: ${mediaUrl}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, url: mediaUrl, type: mediaType, item: newMediaItem }));
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

  // Página inicial de status e download do APK
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Simper TV - Servidor Local</title>
  <style>
    body { background: #060B18; color: #FFF; font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; text-align: center; margin: 0; }
    .card { background: #101B37; border: 1px solid #233866; border-radius: 24px; padding: 40px; max-width: 520px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .logo { width: 120px; height: 120px; object-fit: contain; border-radius: 20px; margin-bottom: 16px; background: white; padding: 8px; }
    .btn { display: inline-block; background: #2563EB; color: #FFFFFF; text-decoration: none; font-weight: bold; padding: 14px 28px; border-radius: 14px; margin-top: 16px; font-size: 15px; }
    .btn:hover { background: #1D4ED8; }
    .status-badge { display: inline-block; background: #059669; color: white; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: bold; margin-bottom: 12px; }
    .info { font-size: 13px; color: #94A3B8; margin-top: 8px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <div class="status-badge">🟢 SERVIDOR LOCAL ATIVO</div>
    <h2 style="margin: 0 0 6px 0; font-size: 24px;">SIMPER TV PLAYER</h2>
    <p style="color: #94A3B8; font-size: 13px; margin: 0 0 16px 0;">Distribuição e Sincronização Local para Smart TVs</p>
    <div class="info">IP da Rede Local: <strong>${LOCAL_IP}:${PORT}</strong></div>
    <div class="info">Status da TV: <strong>${deviceState.rotation_degrees}° (${deviceState.orientation})</strong></div>
    <div class="info">Mídias Ativas: <strong>${deviceState.media_items.length} itens</strong></div>
    <a href="/simper-tv.apk" class="btn">⬇️ BAIXAR APK ATUALIZADO</a>
  </div>
</body>
</html>
  `);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[SIMPER] Servidor local e sincronização rodando em http://${LOCAL_IP}:${PORT}`);
});
