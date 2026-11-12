import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tv, 
  Smartphone, 
  SkipBack, 
  SkipForward, 
  Play, 
  Pause, 
  RotateCw,
  Clock,
  Layers,
  Activity,
  CheckCircle2,
  Sparkles
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
  onSkipToMedia: (deviceId: string, targetIndex: number) => void;
}

export const DashboardView: React.FC<Props> = ({
  devices,
  media,
  playlists,
  onNextMedia,
  onPrevMedia,
  onTogglePlayPause,
  onUpdateRotation,
  onSkipToMedia
}) => {
  // Dispositivo selecionado para o preview ao vivo
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(() => {
    return devices.find(d => d.status === 'online')?.id || devices[0]?.id || '';
  });

  const activeDevice = devices.find(d => d.id === selectedDeviceId) || devices[0];

  // 1. Obtém a lista real de anúncios da playlist vinculada a este terminal
  const currentDeviceMediaList = useMemo(() => {
    if (!activeDevice) return media;
    if (activeDevice.assigned_playlist_id) {
      const pl = playlists.find(p => p.id === activeDevice.assigned_playlist_id);
      if (pl && pl.media_ids && pl.media_ids.length > 0) {
        const list = pl.media_ids
          .map(id => media.find(m => m.id === id))
          .filter((m): m is MediaItem => Boolean(m));
        if (list.length > 0) return list;
      }
    }
    return media;
  }, [activeDevice, playlists, media]);

  const [playbackIndex, setPlaybackIndex] = useState<number>(() => {
    return activeDevice?.current_media_index ?? 0;
  });

  // Sincroniza o índice de reprodução sempre que o dispositivo atualizar
  useEffect(() => {
    if (activeDevice?.current_media_index !== undefined) {
      setPlaybackIndex(activeDevice.current_media_index);
    }
  }, [activeDevice?.current_media_index, activeDevice?.id]);

  const isCurrentlyPlaying = activeDevice?.playback_state === 'playing';

  // Ciclo dinâmico de reprodução exatamente igual ao da Smart TV física (sem barras ou overlays na tela)
  useEffect(() => {
    if (!isCurrentlyPlaying || currentDeviceMediaList.length === 0) return;

    const safeIdx = ((playbackIndex % currentDeviceMediaList.length) + currentDeviceMediaList.length) % currentDeviceMediaList.length;
    const currentItem = currentDeviceMediaList[safeIdx];
    const duration = currentItem?.duration_seconds || 10;

    const timer = setTimeout(() => {
      setPlaybackIndex(old => (old + 1) % currentDeviceMediaList.length);
    }, duration * 1000);

    return () => clearTimeout(timer);
  }, [isCurrentlyPlaying, playbackIndex, currentDeviceMediaList]);

  const count = currentDeviceMediaList.length;
  const currentSafeIndex = count > 0 ? ((playbackIndex % count) + count) % count : 0;
  const activeMedia = currentDeviceMediaList[currentSafeIndex] || null;

  const getActiveMediaForDevice = (device?: Device): MediaItem | null => {
    if (!device || media.length === 0) return null;
    if (device.id === activeDevice?.id) return activeMedia;
    const c = media.length;
    const idx = ((device.current_media_index ?? 0) % c + c) % c;
    return media[idx] || media[0] || null;
  };

  const getMediaCountForDevice = (_device?: Device): number => {
    return currentDeviceMediaList.length || 1;
  };

  const totalCycleSeconds = currentDeviceMediaList.reduce((acc, m) => acc + (m.duration_seconds || 10), 0);
  const onlineCount = devices.filter(d => d.status === 'online').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. SELETOR DE TERMINAL ATIVO & KPI METRICS BAR */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Terminais Online */}
        <div className="bg-white/80 dark:bg-simper-navy-card/90 backdrop-blur-xl border border-slate-200/80 dark:border-simper-navy-border rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-simper-gold/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Terminais Conectados</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Activity className="w-4 h-4 animate-pulse" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {onlineCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">/ {devices.length} online</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            Transmissão contínua ativa
          </div>
        </div>

        {/* KPI: Mídias no Catálogo */}
        <div className="bg-white/80 dark:bg-simper-navy-card/90 backdrop-blur-xl border border-slate-200/80 dark:border-simper-navy-border rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-simper-gold/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Anúncios no Loop</span>
            <div className="w-9 h-9 rounded-xl bg-simper-gold/10 text-simper-gold flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {media.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">arquivos ativos</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-simper-gold" />
            Alta definição 1080p
          </div>
        </div>

        {/* KPI: Tempo de 1 Ciclo */}
        <div className="bg-white/80 dark:bg-simper-navy-card/90 backdrop-blur-xl border border-slate-200/80 dark:border-simper-navy-border rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-simper-gold/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Tempo de 1 Volta</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {Math.floor(totalCycleSeconds / 60)}m {totalCycleSeconds % 60}s
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Duração total da programação
          </div>
        </div>

        {/* KPI: Supabase Cloud */}
        <div className="bg-white/80 dark:bg-simper-navy-card/90 backdrop-blur-xl border border-slate-200/80 dark:border-simper-navy-border rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-simper-gold/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nuvem Supabase</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              Online 
              <span className="text-xs font-normal text-emerald-500 font-mono">(0 delay)</span>
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Sincronização imediata
          </div>
        </div>
      </div>

      {/* 2. GRADE PRINCIPAL: TOTEM VERTICAL (9:16) + CONTROLES + ORDEM DE EXIBIÇÃO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* COLUNA ESQUERDA: GABINETE TOTEM VERTICAL REALISTA (9:16) */}
        <div className="lg:col-span-5 bg-white/90 dark:bg-simper-navy-card/95 backdrop-blur-2xl border border-slate-200/80 dark:border-simper-navy-border rounded-3xl p-6 sm:p-7 shadow-lg flex flex-col items-center relative overflow-hidden transition-all">
          
          {/* Header do Card Totem */}
          <div className="w-full flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-simper-navy-border">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isCurrentlyPlaying ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isCurrentlyPlaying ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </span>
              <div>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                  Totem Vertical (9:16)
                </h2>
                <span className="text-[10px] text-slate-400">
                  {isCurrentlyPlaying ? 'Transmitindo ao vivo' : 'Reprodução em Pausa'}
                </span>
              </div>
            </div>

            {/* Dropdown de Seleção de TV se houver mais de uma */}
            {devices.length > 1 ? (
              <select
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="text-xs font-mono font-bold bg-slate-100 dark:bg-simper-navy-deep text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-simper-navy-border rounded-xl px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-simper-gold"
              >
                {devices.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.pairing_code})
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-mono font-bold text-simper-gold bg-simper-gold/10 border border-simper-gold/30 px-3 py-1 rounded-xl">
                Cód: {activeDevice?.pairing_code || 'SMPX5S'}
              </span>
            )}
          </div>

          {/* GABINETE METÁLICO OBSIDIAN DO TOTEM COM REFLEXO E TELA 9:16 */}
          <div className="w-64 sm:w-72 bg-gradient-to-b from-slate-900 via-[#0A0F1D] to-black p-3.5 rounded-[2.5rem] shadow-2xl border-4 border-slate-800 dark:border-slate-700/80 relative">
            
            {/* Câmera / Sensor superior do totem */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-slate-700 border border-slate-600/50" />

            {/* DISPLAY INTERNO VERTICAL 9:16 */}
            <div className="relative aspect-[9/16] w-full bg-black rounded-2xl overflow-hidden flex items-center justify-center shadow-inner group">
              {activeMedia ? (
                activeMedia.type === 'video' ? (
                  <video 
                    src={activeMedia.url} 
                    className="w-full h-full object-cover" 
                    autoPlay={isCurrentlyPlaying}
                    loop 
                    muted 
                  />
                ) : (
                  <img 
                    src={activeMedia.url} 
                    alt={activeMedia.title} 
                    className={`w-full h-full object-cover transition-transform duration-700 ${
                      activeDevice?.transition_type === 'zoom' ? 'scale-105' : 'scale-100'
                    }`} 
                  />
                )
              ) : (
                <div className="p-4 text-center">
                  <Tv className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                  <span className="text-xs text-slate-400">Nenhum anúncio na playlist</span>
                </div>
              )}

              {/* OVERLAY: EM PAUSA (QUANDO O USUÁRIO PAUSA A TV) */}
              {!isCurrentlyPlaying && (
                <div className="absolute inset-0 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-20 animate-fadeIn">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mb-3 shadow-lg">
                    <Pause className="w-7 h-7 fill-amber-400" />
                  </div>
                  <span className="text-sm font-extrabold text-white tracking-wider uppercase">
                    TV Em Pausa
                  </span>
                  <p className="text-[11px] text-slate-300 mt-1 max-w-[180px]">
                    A tela da Smart TV está pausada no quadro atual.
                  </p>
                </div>
              )}

              {/* Tag AO VIVO no canto superior */}
              <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-[9px] font-extrabold text-white flex items-center gap-1.5 tracking-wider border border-white/10 z-10">
                <span className={`w-1.5 h-1.5 rounded-full ${isCurrentlyPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {isCurrentlyPlaying ? 'AO VIVO' : 'PAUSADO'}
              </div>

              {/* Tag 9:16 HD no canto superior direito */}
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-mono font-bold text-slate-300 border border-white/10 z-10">
                9:16 HD
              </div>

              {/* Barra de Informações do Anúncio no rodapé da tela */}
              <div className="absolute bottom-3 left-3 right-3 bg-black/85 backdrop-blur-md p-2.5 rounded-xl text-white border border-white/10 z-10">
                <p className="font-bold truncate text-xs leading-tight">{activeMedia?.title || 'Sem título'}</p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span className="font-mono text-simper-gold font-bold">
                    #{currentSafeIndex + 1} de {currentDeviceMediaList.length} ({activeMedia?.duration_seconds || 10}s)
                  </span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ao Vivo na TV
                  </span>
                </div>
              </div>
            </div>

            {/* Logo discreto na moldura inferior */}
            <div className="text-center mt-2">
              <span className="text-[8px] font-extrabold tracking-[0.2em] text-slate-500 uppercase">
                SIMPER TOTEM PRO
              </span>
            </div>
          </div>

          {/* Pedestal Metálico e Base de Chão */}
          <div className="w-32 h-3.5 bg-gradient-to-b from-slate-400 to-slate-600 dark:from-slate-700 dark:to-slate-900 rounded-b-xl shadow-md" />
          <div className="w-48 h-1.5 bg-slate-300 dark:bg-slate-800 rounded-full mt-0.5 shadow-sm" />

          {/* PAINEL DE CONTROLE RÁPIDO DO TOTEM (PLAY/PAUSE / VOLTAR / AVANÇAR / GIRAR) */}
          {activeDevice && (
            <div className="w-full mt-6 pt-5 border-t border-slate-100 dark:border-simper-navy-border flex flex-col gap-3">
              <div className="flex items-center justify-center gap-2">
                {/* Voltar Anúncio */}
                <button
                  onClick={() => {
                    onPrevMedia(activeDevice.id, getMediaCountForDevice(activeDevice));
                    setPlaybackIndex(old => (old - 1 + currentDeviceMediaList.length) % currentDeviceMediaList.length);
                  }}
                  title="Anúncio Anterior"
                  className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-simper-navy-deep dark:hover:bg-simper-navy-hover border border-slate-200 dark:border-simper-navy-border text-slate-700 dark:text-slate-200 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* BOTÃO PRINCIPAL PLAY / PAUSE COM FEEDBACK VISUAL CLARO */}
                <button
                  onClick={() => onTogglePlayPause(activeDevice.id)}
                  title={isCurrentlyPlaying ? 'Pausar Reprodução na TV' : 'Retomar Reprodução na TV'}
                  className={`px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 transition-all shadow-md text-white cursor-pointer hover:scale-105 active:scale-95 ${
                    isCurrentlyPlaying
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  }`}
                >
                  {isCurrentlyPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-white" /> 
                      <span>Pausar TV</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" /> 
                      <span>Reproduzir TV</span>
                    </>
                  )}
                </button>

                {/* Avançar Anúncio */}
                <button
                  onClick={() => {
                    onNextMedia(activeDevice.id, getMediaCountForDevice(activeDevice));
                    setPlaybackIndex(old => (old + 1) % currentDeviceMediaList.length);
                  }}
                  title="Próximo Anúncio"
                  className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-simper-navy-deep dark:hover:bg-simper-navy-hover border border-slate-200 dark:border-simper-navy-border text-slate-700 dark:text-slate-200 transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Girar Orientação da Tela */}
                <button
                  onClick={() => {
                    let nextRot: 0 | 90 | 180 | 270 = 90;
                    if (activeDevice.rotation_degrees === 0) nextRot = 90;
                    else if (activeDevice.rotation_degrees === 90) nextRot = 270;
                    else nextRot = 0;
                    const nextOri = (nextRot === 90 || nextRot === 270) ? 'portrait' : 'landscape';
                    onUpdateRotation(activeDevice.id, nextOri, nextRot);
                  }}
                  title="Girar Orientação da Tela (0° / 90° / 270°)"
                  className="p-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-simper-navy-deep dark:hover:bg-simper-navy-hover border border-slate-200 dark:border-simper-navy-border text-simper-gold transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Os comandos são transmitidos via Nuvem Supabase para a TV física em tempo real.
              </p>
            </div>
          )}
        </div>

        {/* COLUNA DIREITA: ORDEM DE EXIBIÇÃO INTERATIVA + LISTA DE TERMINAIS */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* SEÇÃO 1: ORDEM DE EXIBIÇÃO ATUAL (FILMSTRIP INTERATIVO CLICÁVEL) */}
          <div className="bg-white/90 dark:bg-simper-navy-card/95 backdrop-blur-2xl border border-slate-200/80 dark:border-simper-navy-border rounded-3xl p-6 shadow-sm transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-simper-navy-border gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Ordem de Exibição Atual</span>
                  <span className="text-[10px] font-bold bg-simper-gold/15 text-simper-gold border border-simper-gold/30 px-2 py-0.5 rounded-full">
                    Clique para trocar
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Clique em qualquer anúncio abaixo para alternar a exibição da TV imediatamente.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-400 shrink-0">
                {currentDeviceMediaList.length} itens na rotação
              </span>
            </div>

            {/* GRADE INTERATIVA DE MÍDIAS COM ONCLICK */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {currentDeviceMediaList.map((item, idx) => {
                const isPlayingThis = currentSafeIndex === idx;

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (activeDevice) {
                        onSkipToMedia(activeDevice.id, idx);
                        setPlaybackIndex(idx);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title={`Clique para exibir "${item.title}" agora`}
                    className={`group relative rounded-2xl overflow-hidden border p-2 flex flex-col cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${
                      isPlayingThis
                        ? 'border-simper-gold bg-simper-gold/10 ring-2 ring-simper-gold/50 shadow-md'
                        : 'border-slate-200 dark:border-simper-navy-border bg-slate-50/80 dark:bg-simper-navy-deep/60 hover:border-slate-300 dark:hover:border-simper-navy-border/80'
                    }`}
                  >
                    {/* Thumbnail 9:16 da mídia */}
                    <div className="aspect-[9/16] rounded-xl overflow-hidden bg-black relative">
                      {item.type === 'video' ? (
                        <video src={item.url} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      )}

                      {/* Tag do Número da Ordem */}
                      <span className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border border-white/15">
                        #{idx + 1}
                      </span>

                      {/* Tag de Duração */}
                      <span className="absolute bottom-2 right-2 bg-black/75 backdrop-blur-xs text-simper-gold text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border border-white/15">
                        {item.duration_seconds}s
                      </span>

                      {/* Badge "AO VIVO" se estiver tocando este */}
                      {isPlayingThis && (
                        <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          NO AR
                        </div>
                      )}

                      {/* Hover Overlay com Ícone de Play */}
                      <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 backdrop-blur-2xs transition-opacity flex flex-col items-center justify-center text-white">
                        <div className="w-10 h-10 rounded-full bg-simper-gold text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 fill-slate-950 ml-0.5" />
                        </div>
                        <span className="text-[10px] font-extrabold mt-2 uppercase tracking-wider">
                          Tocar Agora
                        </span>
                      </div>
                    </div>

                    {/* Metadados da Mídia */}
                    <div className="mt-2.5 px-0.5">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {item.title}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                        <span className="capitalize">{item.type === 'video' ? 'Vídeo' : 'Imagem'}</span>
                        <span className="text-simper-gold font-medium">Posição {idx + 1}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO 2: TERMINAIS SMART TV CADASTRADOS */}
          <div className="bg-white/90 dark:bg-simper-navy-card/95 backdrop-blur-2xl border border-slate-200/80 dark:border-simper-navy-border rounded-3xl p-6 shadow-sm transition-all">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-simper-navy-border">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Terminais Smart TV Ativos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aparelhos conectados recebendo a programação via nuvem.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 dark:bg-simper-navy-deep px-2.5 py-1 rounded-xl border border-slate-200 dark:border-simper-navy-border">
                {devices.length} {devices.length === 1 ? 'display' : 'displays'}
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
                    className="p-4 rounded-2xl bg-slate-50/80 dark:bg-simper-navy-deep/60 border border-slate-200/80 dark:border-simper-navy-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-300 dark:hover:border-simper-gold/30 transition-all"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border flex items-center justify-center text-slate-700 dark:text-slate-300 shadow-xs shrink-0">
                        {device.orientation === 'portrait' ? <Smartphone className="w-5 h-5 text-simper-gold" /> : <Tv className="w-5 h-5 text-simper-gold" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {device.name}
                          </span>
                          <span className="text-[10px] font-mono font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-md">
                            {device.pairing_code}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                          <span>Tocando: <strong className="text-slate-700 dark:text-slate-200">{devMedia?.title || 'Nenhum'}</strong></span>
                          <span>•</span>
                          <span>{(device.current_media_index % mediaCount) + 1} de {mediaCount}</span>
                          <span>•</span>
                          <span className="capitalize">{device.transition_type}</span>
                          <span>•</span>
                          <span className="font-semibold text-simper-gold">{device.rotation_degrees}°</span>
                        </div>
                      </div>
                    </div>

                    {/* Controles de Reprodução Específicos para este Terminal */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        onClick={() => onPrevMedia(device.id, mediaCount)}
                        title="Anúncio Anterior"
                        className="p-2.5 rounded-xl bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-simper-navy-hover transition-colors cursor-pointer"
                      >
                        <SkipBack className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onTogglePlayPause(device.id)}
                        title={isPlaying ? 'Pausar Reprodução' : 'Retomar Reprodução'}
                        className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all text-white cursor-pointer shadow-xs ${
                          isPlaying ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-white" />
                            <span>Pausar</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-white" />
                            <span>Play</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => onNextMedia(device.id, mediaCount)}
                        title="Próximo Anúncio"
                        className="p-2.5 rounded-xl bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-simper-navy-hover transition-colors cursor-pointer"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
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
