import React from 'react';
import { 
  Tv, 
  Smartphone, 
  SkipBack, 
  SkipForward, 
  Play, 
  Pause, 
  Radio, 
  RotateCw,
  Clock,
  Layers,
  Activity,
  CheckCircle2
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

  const totalCycleSeconds = media.reduce((acc, m) => acc + (m.duration_seconds || 15), 0);
  const onlineCount = devices.filter(d => d.status === 'online').length;

  return (
    <div className="space-y-6">
      {/* KPI METRICS BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Terminais Online</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {onlineCount} <span className="text-sm font-normal text-slate-400">/ {devices.length}</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Rede em operação normal
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Mídias em Rotação</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {media.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">anúncios ativos</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Imagens e vídeos cadastrados</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tempo do Ciclo</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {Math.floor(totalCycleSeconds / 60)}m {totalCycleSeconds % 60}s
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Duração de 1 volta completa</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sincronização</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Nuvem Supabase</span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
            Tempo real ativo (0 delay)
          </p>
        </div>
      </div>

      {/* TOTEM PREVIEW + CONTROLE PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Coluna da Esquerda: Totem Vertical (9:16) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-col items-center">
          <div className="w-full flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Totem Vertical (9:16)
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              Terminal: {activeDevice?.pairing_code || '---'}
            </span>
          </div>

          {/* Gabinete do Totem */}
          <div className="w-64 sm:w-72 bg-slate-950 p-3 rounded-3xl shadow-xl border-4 border-slate-800">
            <div className="relative aspect-[9/16] w-full bg-black rounded-2xl overflow-hidden flex items-center justify-center">
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
                <span className="text-xs text-slate-500">Sem anúncio</span>
              )}

              <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-bold text-white flex items-center gap-1.5 tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                AO VIVO
              </div>

              <div className="absolute bottom-2.5 left-2.5 right-2.5 bg-black/80 backdrop-blur-md px-3 py-2 rounded-xl text-white">
                <p className="font-semibold truncate text-[11px]">{activeMedia?.title || 'Carregando...'}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-300 mt-0.5">
                  <span className="font-mono text-amber-400 font-bold">{activeMedia?.duration_seconds || 15}s</span>
                  <span className="capitalize">{activeDevice?.transition_type || 'Fade'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pedestal do Totem */}
          <div className="w-36 h-3 bg-slate-300 dark:bg-slate-700 rounded-b-xl mt-1" />
          <div className="w-48 h-1 bg-slate-200 dark:bg-slate-800 rounded-full mt-1" />

          {/* Controles Rápidos da TV Ativa */}
          {activeDevice && (
            <div className="w-full mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-2">
              <button
                onClick={() => onPrevMedia(activeDevice.id, getMediaCountForDevice(activeDevice))}
                title="Voltar Anúncio"
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => onTogglePlayPause(activeDevice.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs text-white ${
                  activeDevice.playback_state === 'playing'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {activeDevice.playback_state === 'playing' ? (
                  <><Pause className="w-4 h-4" /> Pausar TV</>
                ) : (
                  <><Play className="w-4 h-4 fill-white" /> Reproduzir TV</>
                )}
              </button>

              <button
                onClick={() => onNextMedia(activeDevice.id, getMediaCountForDevice(activeDevice))}
                title="Avançar Anúncio"
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  let nextRot: 0 | 90 | 180 | 270 = 90;
                  if (activeDevice.rotation_degrees === 0) nextRot = 90;
                  else if (activeDevice.rotation_degrees === 90) nextRot = 270;
                  else nextRot = 0;
                  const nextOri = (nextRot === 90 || nextRot === 270) ? 'portrait' : 'landscape';
                  onUpdateRotation(activeDevice.id, nextOri, nextRot);
                }}
                title="Girar Orientação da Tela"
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <RotateCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          )}
        </div>

        {/* Coluna da Direita: Lista de Terminais e Grade de Programação */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Terminais Smart TV
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aparelhos conectados recebendo a programação via nuvem.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                {devices.length} {devices.length === 1 ? 'dispositivo' : 'dispositivos'}
              </span>
            </div>

            <div className="space-y-3">
              {devices.map((device) => {
                const devMedia = getActiveMediaForDevice(device);
                const mediaCount = getMediaCountForDevice(device);
                const isPlaying = device.playback_state === 'playing';

                return (
                  <div
                    key={device.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-2xs shrink-0">
                        {device.orientation === 'portrait' ? <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Tv className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {device.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded">
                            {device.pairing_code}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                          <span>Anúncio atual: <strong className="text-slate-700 dark:text-slate-200">{devMedia?.title || 'Nenhum'}</strong></span>
                          <span>•</span>
                          <span>{(device.current_media_index % mediaCount) + 1}/{mediaCount}</span>
                          <span>•</span>
                          <span className="capitalize">{device.transition_type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        onClick={() => onPrevMedia(device.id, mediaCount)}
                        title="Anúncio Anterior"
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onTogglePlayPause(device.id)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 transition-all text-white ${
                          isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                      </button>
                      <button
                        onClick={() => onNextMedia(device.id, mediaCount)}
                        title="Próximo Anúncio"
                        className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Grade de Rotação Rápida */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Ordem de Exibição Atual
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Sequência contínua transmitida para as telas.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {media.length} itens
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {media.map((item, idx) => {
                const isCurrentlyPlaying = activeMedia?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`relative rounded-xl overflow-hidden border p-2 flex flex-col transition-all ${
                      isCurrentlyPlaying
                        ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-600/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
                    }`}
                  >
                    <div className="aspect-[9/16] rounded-lg overflow-hidden bg-slate-900 relative">
                      {item.type === 'video' ? (
                        <video src={item.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={item.url} alt={item.title} className="w-full h-full object-cover" />
                      )}
                      <span className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                        #{idx + 1}
                      </span>
                      <span className="absolute bottom-1.5 right-1.5 bg-black/70 backdrop-blur-xs text-amber-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                        {item.duration_seconds}s
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-400 capitalize">
                        {item.type === 'video' ? 'Vídeo MP4' : 'Imagem'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
