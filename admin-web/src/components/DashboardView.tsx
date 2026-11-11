import React from 'react';
import { 
  Tv, 
  Smartphone, 
  SkipBack, 
  SkipForward, 
  Play, 
  Pause, 
  Radio, 
  RotateCw
} from 'lucide-react';
import type { Device, MediaItem, Playlist } from '../types/database';

interface Props {
  devices: Device[];
  media: MediaItem[];
  playlists: Playlist[];
  onNextMedia: (deviceId: string, maxItems: number) => void;
  onPrevMedia: (deviceId: string, maxItems: number) => void;
  onTogglePlayPause: (deviceId: string) => void;
  onUpdateRotation: (deviceId: string, orientation: 'landscape' | 'portrait', rotation: 0 | 90 | 180 | 270) => void;
}

export const DashboardView: React.FC<Props> = ({
  devices,
  media,
  playlists,
  onNextMedia,
  onPrevMedia,
  onTogglePlayPause,
  onUpdateRotation
}) => {
  // Encontra o dispositivo ativo para o preview vertical do totem
  const activeDevice = devices.find(d => d.status === 'online') || devices[0];

  const getActiveMediaForDevice = (device?: Device): MediaItem | null => {
    if (!device) return null;
    const pl = playlists.find(p => p.id === device.assigned_playlist_id) || playlists[0];
    if (!pl || pl.media_ids.length === 0) return media[0] || null;
    const activeMediaId = pl.media_ids[device.current_media_index % pl.media_ids.length];
    return media.find(m => m.id === activeMediaId) || media[0] || null;
  };

  const activeMedia = getActiveMediaForDevice(activeDevice);

  const getMediaCountForDevice = (device?: Device): number => {
    if (!device) return 1;
    const pl = playlists.find(p => p.id === device.assigned_playlist_id);
    return pl?.media_ids.length || media.length || 1;
  };

  return (
    <div className="space-y-8">
      {/* SEÇÃO 1: LIVE PREVIEW DO TOTEM VERTICAL (9:16) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-500 animate-pulse" />
              Live Preview do Totem Vertical (9:16)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Visualização em tempo real de como os anúncios estão sendo exibidos na tela da TV em pé.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 self-start sm:self-auto flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {devices.filter(d => d.status === 'online').length} TV Conectada ({activeDevice?.pairing_code || '---'})
          </span>
        </div>

        {/* MOCKUP DO TOTEM VERTICAL CENTRALIZADO */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="bg-slate-900 dark:bg-black p-3 rounded-3xl shadow-2xl border-4 border-slate-800 w-64 sm:w-72">
            <div className="relative aspect-[9/16] w-full bg-slate-950 rounded-2xl overflow-hidden flex items-center justify-center">
              {activeMedia ? (
                activeMedia.type === 'video' ? (
                  <video 
                    src={activeMedia.url} 
                    className="w-full h-full object-cover" 
                    autoPlay 
                    loop 
                    muted 
                  />
                ) : (
                  <img 
                    src={activeMedia.url} 
                    alt={activeMedia.title} 
                    className={`w-full h-full object-cover ${
                      activeDevice?.transition_type === 'zoom' ? 'scale-105 transition-transform duration-1000' : ''
                    }`} 
                  />
                )
              ) : (
                <span className="text-xs text-slate-500">Nenhum anúncio ativo</span>
              )}

              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-white flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                AO VIVO NA TV
              </div>

              <div className="absolute bottom-3 left-3 right-3 bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl text-xs text-white flex flex-col gap-1">
                <span className="font-semibold truncate text-[11px]">{activeMedia?.title}</span>
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <span className="text-simper-gold font-mono font-bold">{activeMedia?.duration_seconds}s por anúncio</span>
                  <span className="capitalize">{activeDevice?.transition_type || 'Fade'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Base elegante do Totem */}
          <div className="w-40 h-3.5 bg-slate-400 dark:bg-slate-700 rounded-b-2xl mt-1 shadow-md" />
          <div className="w-52 h-1.5 bg-slate-300 dark:bg-slate-800 rounded-full mt-1" />
        </div>
      </div>

      {/* SEÇÃO 2: LISTA DE SMART TVS COM CONTROLES EM TEMPO REAL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Painel de Controle em Tempo Real das TVs
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Passe, pause ou alterne a orientação das telas conectadas instantaneamente.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {devices.map((device) => {
            const activeMedia = getActiveMediaForDevice(device);
            const mediaCount = getMediaCountForDevice(device);
            const isPlaying = device.playback_state === 'playing';

            return (
              <div
                key={device.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 gap-4 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
              >
                {/* Info da TV */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-simper-gold shadow-sm shrink-0">
                    {device.orientation === 'portrait' ? <Smartphone className="w-6 h-6" /> : <Tv className="w-6 h-6" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {device.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                        {device.pairing_code}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-3">
                      <span>Exibindo: <strong className="text-slate-700 dark:text-slate-200">{activeMedia?.title || 'Sem anúncio'}</strong></span>
                      <span>•</span>
                      <span>Item {(device.current_media_index % mediaCount) + 1} de {mediaCount}</span>
                      <span>•</span>
                      <span className="capitalize">Transição: {device.transition_type}</span>
                    </div>
                  </div>
                </div>

                {/* Botões de Ação em Tempo Real */}
                <div className="flex items-center gap-2 self-end md:self-auto">
                  <button
                    onClick={() => onPrevMedia(device.id, mediaCount)}
                    title="Anúncio Anterior"
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <SkipBack className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onTogglePlayPause(device.id)}
                    title={isPlaying ? 'Pausar Reprodução' : 'Continuar Reprodução'}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm ${
                      isPlaying
                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {isPlaying ? <><Pause className="w-4 h-4" /> Pausar</> : <><Play className="w-4 h-4 fill-white" /> Reproduzir</>}
                  </button>

                  <button
                    onClick={() => onNextMedia(device.id, mediaCount)}
                    title="Próximo Anúncio"
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => {
                      let nextRot: 0 | 90 | 180 | 270 = 90;
                      if (device.rotation_degrees === 0) nextRot = 90;
                      else if (device.rotation_degrees === 90) nextRot = 270;
                      else nextRot = 0;
                      const nextOri = (nextRot === 90 || nextRot === 270) ? 'portrait' : 'landscape';
                      onUpdateRotation(device.id, nextOri, nextRot);
                    }}
                    title={`Girar Orientação (${device.rotation_degrees || 0}° -> Clique para alternar)`}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shadow-sm"
                  >
                    <RotateCw className="w-4 h-4 text-simper-gold" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
