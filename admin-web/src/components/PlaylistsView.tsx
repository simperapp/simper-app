import React, { useState } from 'react';
import { ListVideo, Plus, Trash2, Clock, Check, Film, Image as ImageIcon } from 'lucide-react';
import type { Playlist, MediaItem } from '../types/database';

interface Props {
  playlists: Playlist[];
  media: MediaItem[];
  onCreatePlaylist: (name: string, description: string, mediaIds: string[]) => void;
  onDeletePlaylist: (id: string) => void;
  onUpdatePlaylistItems: (id: string, mediaIds: string[]) => void;
}

export const PlaylistsView: React.FC<Props> = ({
  playlists,
  media,
  onCreatePlaylist,
  onDeletePlaylist,
  onUpdatePlaylistItems
}) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);

  const handleToggleMedia = (mediaId: string) => {
    setSelectedMediaIds(prev => 
      prev.includes(mediaId) 
        ? prev.filter(id => id !== mediaId)
        : [...prev, mediaId]
    );
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || selectedMediaIds.length === 0) {
      alert('Por favor, informe o nome e selecione pelo menos 1 mídia para a playlist.');
      return;
    }
    onCreatePlaylist(name, description, selectedMediaIds);
    setName('');
    setDescription('');
    setSelectedMediaIds([]);
    setShowModal(false);
  };

  const getMediaDurationSum = (mediaIds: string[]): number => {
    return mediaIds.reduce((total, id) => {
      const item = media.find(m => m.id === id);
      return total + (item?.duration_seconds || 0);
    }, 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            Playlists de Reprodução
            <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-simper-gold">
              {playlists.length} ativas
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Crie coletâneas de fotos e vídeos para reproduzir nas Smart TVs da rede.
          </p>
        </div>

        <button
          onClick={() => {
            setSelectedMediaIds(media.map(m => m.id));
            setShowModal(true);
          }}
          className="bg-slate-900 dark:bg-simper-gold hover:bg-slate-800 text-white dark:text-slate-950 px-4 py-2.5 rounded-2xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Criar Nova Playlist
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {playlists.map((pl) => {
          const totalLoopTime = getMediaDurationSum(pl.media_ids);

          return (
            <div
              key={pl.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-simper-gold">
                      <ListVideo className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">
                        {pl.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {pl.description || 'Sem descrição'}
                      </p>
                    </div>
                  </div>

                  {playlists.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`Excluir a playlist "${pl.name}"?`)) {
                          onDeletePlaylist(pl.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="Excluir Playlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Lista de Mídias na Playlist */}
                <div className="mt-5 space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mídias na Coletânea ({pl.media_ids.length} itens):
                  </span>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {pl.media_ids.map((mediaId, idx) => {
                      const item = media.find(m => m.id === mediaId);
                      if (!item) return null;

                      return (
                        <div
                          key={mediaId + idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate max-w-[240px]">
                            <span className="font-mono text-slate-400 font-bold text-[11px] w-4">
                              {idx + 1}
                            </span>
                            {item.type === 'video' ? (
                              <Film className="w-4 h-4 text-simper-gold shrink-0" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                              {item.duration_seconds}s
                            </span>
                            <button
                              onClick={() => {
                                const newIds = pl.media_ids.filter((_, i) => i !== idx);
                                onUpdatePlaylistItems(pl.id, newIds);
                              }}
                              className="text-slate-400 hover:text-red-500 p-1"
                              title="Remover desta playlist"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {pl.media_ids.length === 0 && (
                      <div className="text-xs text-slate-400 text-center py-4">
                        Nenhuma mídia adicionada a esta playlist.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-simper-gold" />
                  Duração total do loop: <strong>{totalLoopTime} segundos</strong>
                </span>
                <span className="font-medium text-slate-600 dark:text-slate-300">
                  {pl.media_ids.length} anúncios
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Criar Playlist */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
              Criar Coletânea de Anúncios (Playlist)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Escolha quais fotos e vídeos farão parte desta programação.
            </p>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome da Playlist
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Programação Horário Nobre / Restaurante"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Loop contínuo para TVs do salão"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Selecione as fotos e vídeos desta playlist ({selectedMediaIds.length} selecionadas):
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 border border-slate-200 dark:border-slate-700 rounded-2xl p-2.5 bg-slate-50 dark:bg-slate-800/40">
                  {media.map((item) => {
                    const isSelected = selectedMediaIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleMedia(item.id)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-slate-900 dark:border-simper-gold shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border text-xs ${isSelected ? 'bg-white text-slate-950 border-white' : 'border-slate-300 dark:border-slate-600'}`}>
                            {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                          <span className="text-xs font-bold truncate max-w-[260px]">{item.title}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold opacity-80">{item.duration_seconds}s</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
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
                  Salvar Playlist
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
