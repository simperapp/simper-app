import React, { useState } from 'react';
import { Tv, Plus, Trash2, Sliders, Check } from 'lucide-react';
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
    onAddDevice(code, name, location, orientation, selectedPlaylistId);
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
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            Smart TVs Cadastradas
            <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-simper-gold">
              {devices.length} {devices.length === 1 ? 'tela' : 'telas'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Configure a playlist atribuída, a orientação física e o estilo de transição de cada TV.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-slate-900 dark:bg-simper-gold hover:bg-slate-800 dark:hover:bg-simper-gold-hover text-white dark:text-slate-950 px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Cadastrar Nova TV
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {devices.map((device) => (
          <div
            key={device.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Header do Card */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-simper-gold">
                    <Tv className="w-6 h-6" />
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
                  className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Controles de Configuração da TV */}
              <div className="mt-6 space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {/* 1. Escolher Playlist Atribuída */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-simper-gold" />
                    Playlist de Anúncios Atribuída:
                  </label>
                  <select
                    value={device.assigned_playlist_id || ''}
                    onChange={(e) => onAssignPlaylist(device.id, e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-simper-gold"
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
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          device.transition_type === opt.value
                            ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-slate-900 dark:border-simper-gold shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
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
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        (device.rotation_degrees ?? (device.orientation === 'portrait' ? 90 : 0)) === 0
                          ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-slate-900 dark:border-simper-gold'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Horizontal (0°)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateRotation(device.id, 'portrait', 90)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        device.rotation_degrees === 90
                          ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-slate-900 dark:border-simper-gold'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Vertical (90°)
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateRotation(device.id, 'portrait', 270)}
                      className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                        device.rotation_degrees === 270
                          ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-slate-900 dark:border-simper-gold'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      Vertical (270°)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Sincronizada
              </span>
              <span>{device.screen_resolution}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Cadastro de TV */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
              Cadastrar Nova Smart TV
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Insira o código de 6 caracteres que está aparecendo na tela da TV.
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 font-mono text-xl font-extrabold text-center text-simper-gold uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
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
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      orientation === 'landscape'
                        ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-transparent shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Horizontal (16:9)
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrientation('portrait')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      orientation === 'portrait'
                        ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-transparent shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
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
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-simper-gold hover:bg-slate-800 text-white dark:text-slate-950 text-xs font-extrabold shadow-md"
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
