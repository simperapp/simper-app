import React, { useState } from 'react';
import { Tv, Plus, Trash2, Sliders, Check, Smartphone, X } from 'lucide-react';
import type { Device, Playlist, TransitionType } from '../types/database';

interface Props {
  devices: Device[];
  playlists: Playlist[];
  onAddDevice: (code: string, name: string, location: string, orientation: 'landscape' | 'portrait', playlistId: string) => void;
  onDeleteDevice: (id: string) => void;
  onUpdateTransition: (id: string, transition: TransitionType) => void;
  onAssignPlaylist: (id: string, playlistId: string) => void;
  onUpdateRotation: (id: string, orientation: 'landscape' | 'portrait', rotation: 0 | 90 | 180 | 270) => void;
}

export const DevicesView: React.FC<Props> = ({
  devices,
  playlists,
  onAddDevice,
  onDeleteDevice,
  onUpdateTransition,
  onAssignPlaylist,
  onUpdateRotation
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
            Gerencie o pareamento, a playlist atribuída, o estilo de transição e a orientação de cada TV da rede.
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
          {devices.map((device) => (
            <div
              key={device.id}
              className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border rounded-3xl p-6 shadow-card-light dark:shadow-card-dark hover:border-slate-300 dark:hover:border-simper-navy-border/80 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header do Card */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border flex items-center justify-center text-slate-800 dark:text-simper-gold shrink-0">
                      {device.orientation === 'portrait' ? <Smartphone className="w-6 h-6" /> : <Tv className="w-6 h-6" />}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {device.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
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

                {/* Controles de Configuração da TV */}
                <div className="mt-6 space-y-4 pt-4 border-t border-slate-100 dark:border-simper-navy-border">
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

              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-simper-navy-border flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Sincronizada via Nuvem
                </span>
                <span>{device.screen_resolution}</span>
              </div>
            </div>
          ))}
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
