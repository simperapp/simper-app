import React, { useState } from 'react';
import { 
  ListVideo, 
  Plus, 
  Pencil, 
  Trash2, 
  Clock, 
  Check, 
  Film, 
  Image as ImageIcon, 
  X, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Layers
} from 'lucide-react';
import type { Playlist, MediaItem } from '../types/database';

interface Props {
  playlists: Playlist[];
  media: MediaItem[];
  onCreatePlaylist: (name: string, description: string, mediaIds: string[]) => void;
  onDeletePlaylist: (id: string) => void;
  onUpdatePlaylistItems: (id: string, mediaIds: string[]) => void;
  onUpdatePlaylist?: (id: string, name: string, description: string, mediaIds: string[]) => void;
}

export const PlaylistsView: React.FC<Props> = ({
  playlists,
  media,
  onCreatePlaylist,
  onDeletePlaylist,
  onUpdatePlaylistItems,
  onUpdatePlaylist
}) => {
  // Modal Criar Nova Playlist
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createSelectedMediaIds, setCreateSelectedMediaIds] = useState<string[]>([]);

  // Modal Editar Playlist
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editMediaIds, setEditMediaIds] = useState<string[]>([]);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  // Manipulador de Seleção no Modal Criar
  const handleToggleCreateMedia = (mediaId: string) => {
    setCreateSelectedMediaIds(prev => 
      prev.includes(mediaId) 
        ? prev.filter(id => id !== mediaId)
        : [...prev, mediaId]
    );
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || createSelectedMediaIds.length === 0) {
      alert('Por favor, informe o nome e selecione pelo menos 1 mídia para a playlist.');
      return;
    }
    onCreatePlaylist(createName.trim(), createDescription.trim(), createSelectedMediaIds);
    setCreateName('');
    setCreateDescription('');
    setCreateSelectedMediaIds([]);
    setShowCreateModal(false);
  };

  // Abrir Modal de Edição
  const handleOpenEditModal = (pl: Playlist) => {
    setEditingPlaylist(pl);
    setEditName(pl.name);
    setEditDescription(pl.description || '');
    setEditMediaIds([...pl.media_ids]);
    setSaveSuccessNotice(false);
  };

  // Reordenação de Itens na Edição (Mover para Cima)
  const handleMoveItemUp = (index: number) => {
    if (index <= 0) return;
    setEditMediaIds(prev => {
      const copy = [...prev];
      const temp = copy[index - 1];
      copy[index - 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Reordenação de Itens na Edição (Mover para Baixo)
  const handleMoveItemDown = (index: number) => {
    if (index >= editMediaIds.length - 1) return;
    setEditMediaIds(prev => {
      const copy = [...prev];
      const temp = copy[index + 1];
      copy[index + 1] = copy[index];
      copy[index] = temp;
      return copy;
    });
  };

  // Remover Item da Edição
  const handleRemoveItem = (index: number) => {
    setEditMediaIds(prev => prev.filter((_, i) => i !== index));
  };

  // Adicionar Item à Edição
  const handleAddMediaToEdit = (mediaId: string) => {
    setEditMediaIds(prev => [...prev, mediaId]);
  };

  // Salvar Alterações da Edição
  const handleSaveEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlaylist) return;
    if (!editName.trim()) {
      alert('O nome da playlist não pode ficar vazio.');
      return;
    }

    if (onUpdatePlaylist) {
      onUpdatePlaylist(editingPlaylist.id, editName.trim(), editDescription.trim(), editMediaIds);
    } else {
      onUpdatePlaylistItems(editingPlaylist.id, editMediaIds);
    }

    setSaveSuccessNotice(true);
    setTimeout(() => {
      setSaveSuccessNotice(false);
      setEditingPlaylist(null);
    }, 700);
  };

  const getMediaDurationSum = (mediaIds: string[]): number => {
    return mediaIds.reduce((total, id) => {
      const item = media.find(m => m.id === id);
      return total + (item?.duration_seconds || 0);
    }, 0);
  };

  return (
    <div className="space-y-6">
      {/* Header com Botão de Criação */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            Playlists de Reprodução
            <span className="text-xs font-mono font-bold bg-simper-gold/10 text-simper-gold border border-simper-gold/30 px-2.5 py-0.5 rounded-full">
              {playlists.length} {playlists.length === 1 ? 'grade' : 'grades'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Crie, edite a sequência e gerencie os anúncios exibidos em cada Smart TV.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateSelectedMediaIds(media.map(m => m.id));
            setShowCreateModal(true);
          }}
          className="bg-slate-900 hover:bg-slate-800 dark:bg-simper-gold dark:hover:bg-simper-gold-hover text-white dark:text-slate-950 px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Criar Nova Playlist
        </button>
      </div>

      {playlists.length === 0 ? (
        <div className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border rounded-3xl p-12 text-center shadow-card-light dark:shadow-card-dark">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-simper-navy-deep flex items-center justify-center mx-auto mb-4 text-slate-400">
            <ListVideo className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Nenhuma playlist criada</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Organize seus anúncios em sequências personalizadas para veiculação nas Smart TVs.
          </p>
          <button
            onClick={() => {
              setCreateSelectedMediaIds(media.map(m => m.id));
              setShowCreateModal(true);
            }}
            className="bg-simper-gold text-slate-950 font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Criar Primeira Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {playlists.map((pl) => {
            const totalLoopTime = getMediaDurationSum(pl.media_ids);

            return (
              <div
                key={pl.id}
                className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border rounded-3xl p-6 shadow-card-light dark:shadow-card-dark hover:border-slate-300 dark:hover:border-simper-navy-border/80 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border flex items-center justify-center text-slate-800 dark:text-simper-gold shrink-0">
                        <ListVideo className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          {pl.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                          {pl.description || 'Sem descrição cadastrada'}
                        </p>
                      </div>
                    </div>

                    {/* Botões de Ação: Editar e Excluir */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(pl)}
                        className="p-2 text-slate-600 dark:text-slate-300 hover:text-simper-gold dark:hover:text-simper-gold rounded-xl hover:bg-slate-100 dark:hover:bg-simper-navy-deep transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                        title="Editar Nome, Descrição e Ordem das Mídias"
                      >
                        <Pencil className="w-4 h-4 text-simper-gold" />
                        <span className="hidden sm:inline">Editar</span>
                      </button>

                      {playlists.length > 1 && (
                        <button
                          onClick={() => {
                            if (confirm(`Excluir permanentemente a playlist "${pl.name}"?`)) {
                              onDeletePlaylist(pl.id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                          title="Excluir Playlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Lista de Mídias na Playlist */}
                  <div className="mt-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-simper-gold" />
                        Ordem de Exibição ({pl.media_ids.length} itens):
                      </span>
                      <button
                        onClick={() => handleOpenEditModal(pl)}
                        className="text-[11px] font-bold text-simper-gold hover:underline cursor-pointer"
                      >
                        Gerenciar Ordem
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                      {pl.media_ids.map((mediaId, idx) => {
                        const item = media.find(m => m.id === mediaId);
                        if (!item) return null;

                        return (
                          <div
                            key={mediaId + idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-simper-navy-deep/60 border border-slate-200 dark:border-simper-navy-border text-xs group/item hover:border-slate-300 dark:hover:border-slate-700"
                          >
                            <div className="flex items-center gap-2.5 truncate max-w-[220px] sm:max-w-[260px]">
                              <span className="font-mono text-slate-400 font-bold text-[11px] w-4">
                                #{idx + 1}
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
                              <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px] font-bold">
                                {item.duration_seconds}s
                              </span>
                              <button
                                onClick={() => {
                                  const newIds = pl.media_ids.filter((_, i) => i !== idx);
                                  onUpdatePlaylistItems(pl.id, newIds);
                                }}
                                className="text-slate-400 hover:text-rose-500 p-1 cursor-pointer transition-colors"
                                title="Remover desta playlist"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {pl.media_ids.length === 0 && (
                        <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 dark:bg-simper-navy-deep/30 rounded-xl border border-dashed border-slate-200 dark:border-simper-navy-border">
                          Nenhuma mídia adicionada. Clique em "Editar" para adicionar anúncios.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-simper-navy-border flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-simper-gold" />
                    Tempo total da volta: <strong className="text-slate-800 dark:text-white">{totalLoopTime}s</strong>
                  </span>
                  <button
                    onClick={() => handleOpenEditModal(pl)}
                    className="font-bold text-simper-gold hover:underline flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    Editar Playlist
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: EDITAR PLAYLIST EXISTENTE (NOME, DESCRIÇÃO, ORDEM E MÍDIAS)     */}
      {/* ========================================================================= */}
      {editingPlaylist && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border w-full max-w-2xl rounded-3xl p-6 sm:p-7 shadow-2xl relative max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setEditingPlaylist(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-9 h-9 rounded-xl bg-simper-gold/15 text-simper-gold flex items-center justify-center">
                <Pencil className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Editar Playlist: <span className="text-simper-gold">{editingPlaylist.name}</span>
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Altere o título, a descrição e organize a ordem sequencial dos anúncios na TV.
            </p>

            {saveSuccessNotice && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                Playlist atualizada com sucesso! Sincronizando com as Smart TVs...
              </div>
            )}

            <form onSubmit={handleSaveEditSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome da Playlist
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Ex: Grade Principal Restaurante"
                    className="w-full bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Descrição (Opcional)
                  </label>
                  <input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Ex: Rotação contínua 24/7 para totens"
                    className="w-full bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                  />
                </div>
              </div>

              {/* Seção 1: Ordem Sequencial dos Anúncios com Subir / Descer */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-simper-navy-border">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Sequência de Reprodução na TV ({editMediaIds.length} anúncios):
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    Use ▲ e ▼ para reordenar
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1 border border-slate-200 dark:border-simper-navy-border rounded-2xl p-2.5 bg-slate-50 dark:bg-simper-navy-deep/40">
                  {editMediaIds.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                      Nenhuma mídia nesta playlist. Adicione anúncios na lista abaixo.
                    </div>
                  ) : (
                    editMediaIds.map((mediaId, idx) => {
                      const item = media.find(m => m.id === mediaId);
                      if (!item) return null;

                      return (
                        <div
                          key={mediaId + idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border text-xs shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 truncate max-w-[280px]">
                            <span className="font-mono text-simper-gold font-bold text-xs w-6 text-center bg-simper-gold/10 rounded-md py-0.5">
                              #{idx + 1}
                            </span>
                            {item.type === 'video' ? (
                              <Film className="w-4 h-4 text-simper-gold shrink-0" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                            )}
                            <div className="truncate">
                              <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                                {item.title}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {item.type === 'video' ? 'Vídeo MP4' : 'Imagem'} • {item.duration_seconds}s
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Botão Mover para Cima */}
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => handleMoveItemUp(idx)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-simper-navy-border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-simper-navy-hover disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Mover anúncio para antes"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>

                            {/* Botão Mover para Baixo */}
                            <button
                              type="button"
                              disabled={idx === editMediaIds.length - 1}
                              onClick={() => handleMoveItemDown(idx)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-simper-navy-border text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-simper-navy-hover disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                              title="Mover anúncio para depois"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Botão Remover */}
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer transition-colors"
                              title="Remover desta playlist"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Seção 2: Adicionar Mídias da Biblioteca */}
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-simper-navy-border">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Adicionar Outros Anúncios da Biblioteca:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
                  {media.map((item) => {
                    const countInPlaylist = editMediaIds.filter(id => id === item.id).length;

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-xl border border-slate-200 dark:border-simper-navy-border bg-slate-50 dark:bg-simper-navy-deep/50 hover:bg-slate-100 dark:hover:bg-simper-navy-deep transition-all text-xs"
                      >
                        <div className="flex items-center gap-2 truncate max-w-[190px]">
                          {item.type === 'video' ? (
                            <Film className="w-3.5 h-3.5 text-simper-gold shrink-0" />
                          ) : (
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                            {item.title}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleAddMediaToEdit(item.id)}
                          className="px-2 py-1 rounded-lg bg-simper-gold/15 text-simper-gold hover:bg-simper-gold hover:text-slate-950 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                          title="Inserir mais uma cópia na sequência"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Adicionar {countInPlaylist > 0 ? `(${countInPlaylist})` : ''}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resumo do Loop Calculado */}
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-simper-navy-deep/80 border border-slate-200 dark:border-simper-navy-border flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-simper-gold" />
                  Tempo total do ciclo: <strong className="text-slate-900 dark:text-white">{getMediaDurationSum(editMediaIds)} segundos</strong>
                </span>
                <span className="font-bold text-simper-gold">
                  {editMediaIds.length} anúncios no loop
                </span>
              </div>

              {/* Botões do Rodapé */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPlaylist(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-simper-navy-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-simper-navy-deep cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-simper-gold hover:bg-slate-800 text-white dark:text-slate-950 text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CRIAR NOVA PLAYLIST                                              */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
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
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ex: Programação Horário Nobre / Restaurante"
                  className="w-full bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="Ex: Loop contínuo para TVs do salão"
                  className="w-full bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Selecione as mídias desta playlist ({createSelectedMediaIds.length} selecionadas):
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 border border-slate-200 dark:border-simper-navy-border rounded-2xl p-2.5 bg-slate-50 dark:bg-simper-navy-deep/40">
                  {media.map((item) => {
                    const isSelected = createSelectedMediaIds.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleCreateMedia(item.id)}
                        className={`flex items-center justify-between p-2 rounded-xl cursor-pointer transition-all border ${
                          isSelected
                            ? 'bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 border-transparent shadow-xs'
                            : 'bg-white dark:bg-simper-navy-card border-slate-200 dark:border-simper-navy-border text-slate-700 dark:text-slate-300 hover:border-slate-300'
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
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-simper-navy-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-simper-navy-deep cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-simper-gold hover:bg-slate-800 text-white dark:text-slate-950 text-xs font-bold shadow-md cursor-pointer"
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
