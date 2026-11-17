import React, { useState } from 'react';
import { 
  Tv, 
  MonitorOff, 
  Plus, 
  Trash2, 
  Sliders, 
  Check, 
  Smartphone, 
  X, 
  Play, 
  Pause,
  Power,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import type { Device, Playlist, TransitionType } from '../types/database';
import { isDeviceOnline, formatLastPing } from '../lib/deviceStatus';

interface Props {
  devices: Device[];
  playlists: Playlist[];
  onAddDevice: (code: string, name: string, location: string, orientation: 'landscape' | 'portrait', playlistId: string) => void;
  onDeleteDevice: (id: string) => void;
  onUpdateTransition: (id: string, transition: TransitionType) => void;
  onAssignPlaylist: (id: string, playlistId: string) => void;
  onUpdateRotation: (id: string, orientation: 'landscape' | 'portrait', rotation: 0 | 90 | 180 | 270) => void;
  onTogglePlayPause?: (id: string) => void;
  onToggleDeviceStatus?: (id: string) => void;
  onPingDevice?: (id: string) => void;
}

export const DevicesView: React.FC<Props> = ({
  devices,
  playlists,
  onAddDevice,
  onDeleteDevice,
  onUpdateTransition,
  onAssignPlaylist,
  onUpdateRotation,
  onTogglePlayPause,
  onToggleDeviceStatus,
  onPingDevice
}) => {
  const [showModal, setShowModal] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(playlists[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !name) return;
    onAddDevice(code.trim().toUpperCase(), name.trim(), location.trim(), orientation, selectedPlaylistId);
    setCode('');
    setName('');
    setLocation('');
    setShowModal(false);
  };

  const transitionOptions: { value: TransitionType; label: string; desc: string }[] = [
    { value: 'fade', label: 'Desvanecer (Fade)', desc: 'Transição suave esmaecendo entre os anúncios' },
    { value: 'cut', label: 'Corte Seco', desc: 'Troca instantânea sem efeito' },
    { value: 'slide', label: 'Deslizar (Slide)', desc: 'Desliza suavemente para o lado' },
    { value: 'zoom', label: 'Zoom Suave (Ken Burns)', desc: 'Efeito cinematográfico de aproximação' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            Smart TVs Cadastradas
            <span className="text-xs font-mono font-bold bg-simper-gold/10 text-simper-gold border border-simper-gold/30 px-2.5 py-0.5 rounded-full">
              {devices.length} {devices.length === 1 ? 'tela ativa' : 'telas ativas'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitore o estado de energia (Online / Desligada), pareamento, grade atribuída e orientação física.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-slate-900 hover:bg-slate-800 dark:bg-simper-gold dark:hover:bg-simper-gold-hover text-white dark:text-slate-950 px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Cadastrar Nova TV
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border rounded-3xl p-12 text-center shadow-card-light dark:shadow-card-dark">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-simper-navy-deep flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Tv className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Nenhuma Smart TV conectada</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Instale o app na sua TV Android e use o código de 6 dígitos exibido na tela para vincular seu primeiro display.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-simper-gold text-slate-950 font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Cadastrar Primeira TV
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {devices.map((device) => {
            const isOnline = isDeviceOnline(device);

            return (
              <div
                key={device.id}
                className={`bg-white dark:bg-simper-navy-card border rounded-3xl p-6 shadow-card-light dark:shadow-card-dark transition-all flex flex-col justify-between ${
                  isOnline 
                    ? 'border-slate-200 dark:border-simper-navy-border hover:border-slate-300 dark:hover:border-simper-navy-border/80' 
                    : 'border-rose-300 dark:border-rose-900/60 shadow-rose-950/10'
                }`}
              >
                <div>
                  {/* Header do Card com Status de Conexão */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                        isOnline 
                          ? 'bg-slate-100 dark:bg-simper-navy-deep border-slate-200 dark:border-simper-navy-border text-slate-800 dark:text-simper-gold' 
                          : 'bg-rose-100 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-600'
                      }`}>
                        {isOnline ? (
                          device.orientation === 'portrait' ? <Smartphone className="w-6 h-6" /> : <Tv className="w-6 h-6" />
                        ) : (
                          <MonitorOff className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 dark:text-white text-base">
                            {device.name}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {device.location || 'Sem localização'}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-xs font-bold text-simper-gold">
                            Código: {device.pairing_code}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Deseja realmente apagar a TV "${device.name}"?`)) {
                          onDeleteDevice(device.id);
                        }
                      }}
                      title="Apagar TV"
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* BANNER DE STATUS DE CONEXÃO DA TV (ONLINE vs DESLIGADA) */}
                  <div className={`mt-4 p-3 rounded-2xl border flex items-center justify-between gap-3 text-xs ${
                    isOnline 
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300' 
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                          isOnline ? 'bg-emerald-400' : 'bg-rose-400'
                        }`} />
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                          isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                        }`} />
                      </span>
                      <div>
                        <span className="font-bold">
                          {isOnline ? 'TV Ligada & Conectada ao Sistema' : 'TV Desligada / Não Conectada'}
                        </span>
                        <div className="text-[11px] opacity-80 mt-0.5">
                          Último sinal: <strong>{formatLastPing(device.last_ping)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Botões de Teste e Simulação */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {onToggleDeviceStatus && (
                        <button
                          type="button"
                          onClick={() => onToggleDeviceStatus(device.id)}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${
                            isOnline 
                              ? 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300' 
                              : 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                          }`}
                          title={isOnline ? 'Simular TV Desligada' : 'Ligar / Reconectar TV'}
                        >
                          <Power className="w-3 h-3" />
                          <span>{isOnline ? 'Desligar' : 'Ligar'}</span>
                        </button>
                      )}

                      {onPingDevice && !isOnline && (
                        <button
                          type="button"
                          onClick={() => onPingDevice(device.id)}
                          className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Atualizar Sinal de Ping"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ALERTA CASO A TV ESTEJA DESLIGADA */}
                  {!isOnline && (
                    <div className="mt-2.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <div className="leading-relaxed text-[11px]">
                        <strong>Aparelho Físico Desligado:</strong> A Smart TV não está enviando dados de batimento cardíaco (heartbeat). Verifique se está conectada à tomada e se o aplicativo Simper TV Player está ativo no Android TV.
                      </div>
                    </div>
                  )}

                  {/* Controles de Configuração da TV */}
                  <div className="mt-5 space-y-4 pt-4 border-t border-slate-100 dark:border-simper-navy-border">
                    {/* 1. Escolher Playlist Atribuída */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-simper-gold" />
                        Playlist de Anúncios Atribuída:
                      </label>
                      <select
                        value={device.assigned_playlist_id || ''}
                        onChange={(e) => onAssignPlaylist(device.id, e.target.value)}
                        className="w-full bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-simper-gold"
                      >
                        {playlists.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.name} ({pl.media_ids.length} mídias)
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 2. Escolher Estilo de Transição */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Forma de Passagem dos Anúncios (Transição):
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {transitionOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => onUpdateTransition(device.id, opt.value)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              device.transition_type === opt.value
                                ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-transparent shadow-xs'
                                : 'bg-slate-50 dark:bg-simper-navy-deep border-slate-200 dark:border-simper-navy-border text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-simper-navy-elevated'
                            }`}
                          >
                            <div className="text-xs font-bold flex items-center justify-between">
                              <span>{opt.label}</span>
                              {device.transition_type === opt.value && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <div className={`text-[10px] mt-0.5 ${device.transition_type === opt.value ? 'text-slate-300 dark:text-slate-900 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
                              {opt.desc}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 3. Orientação Física (Horizontal ou Vertical) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Orientação do Display:
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => onUpdateRotation(device.id, 'landscape', 0)}
                          className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            (device.rotation_degrees ?? (device.orientation === 'portrait' ? 90 : 0)) === 0
                              ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-transparent'
                              : 'bg-slate-50 dark:bg-simper-navy-deep border-slate-200 dark:border-simper-navy-border text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          Horizontal (0°)
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateRotation(device.id, 'portrait', 90)}
                          className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            device.rotation_degrees === 90
                              ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-transparent'
                              : 'bg-slate-50 dark:bg-simper-navy-deep border-slate-200 dark:border-simper-navy-border text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          Vertical (90°)
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateRotation(device.id, 'portrait', 270)}
                          className={`py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                            device.rotation_degrees === 270
                              ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-transparent'
                              : 'bg-slate-50 dark:bg-simper-navy-deep border-slate-200 dark:border-simper-navy-border text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          Vertical (270°)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-simper-navy-border flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span className={`flex items-center gap-1.5 font-semibold truncate ${
                    isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                  }`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`} /> 
                    {isOnline ? 'Nuvem Conectada' : 'Aparelho Desligado'}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    {onTogglePlayPause && (
                      <button
                        onClick={() => onTogglePlayPause(device.id)}
                        title={device.playback_state === 'playing' ? 'Pausar Reprodução' : 'Iniciar Reprodução'}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all text-white cursor-pointer shadow-xs ${
                          device.playback_state === 'playing' 
                            ? 'bg-amber-600 hover:bg-amber-700' 
                            : 'bg-emerald-600 hover:bg-emerald-700'
                        }`}
                      >
                        {device.playback_state === 'playing' ? (
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
                    )}
                    <span className="hidden sm:inline font-mono">{device.screen_resolution}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Cadastro de TV */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Cadastrar Nova Smart TV
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Insira o código de 6 caracteres que está sendo exibido na tela da TV.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Código de Pareamento
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: SMP782"
                  className="w-full bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-4 py-3 font-mono text-xl font-extrabold text-center text-simper-gold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-simper-gold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Televisão
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: TV Aiwa 32 Recepção"
                  className="w-full bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Localização Física
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Hall de Entrada"
                  className="w-full bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Orientação da Tela
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrientation('landscape')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      orientation === 'landscape'
                        ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-transparent shadow-xs'
                        : 'border-slate-200 dark:border-simper-navy-border text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-simper-navy-deep'
                    }`}
                  >
                    Horizontal (16:9)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      orientation === 'portrait'
                        ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-transparent shadow-xs'
                        : 'border-slate-200 dark:border-simper-navy-border text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-simper-navy-deep'
                    }`}
                  >
                    Vertical (9:16)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Playlist Inicial
                </label>
                <select
                  value={selectedPlaylistId}
                  onChange={(e) => setSelectedPlaylistId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                >
                  {playlists.map((pl) => (
                    <option key={pl.id} value={pl.id}>{pl.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-simper-navy-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-simper-navy-deep cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-simper-gold hover:bg-slate-800 text-white dark:text-slate-950 text-xs font-bold shadow-md cursor-pointer"
                >
                  Confirmar e Ativar TV
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
