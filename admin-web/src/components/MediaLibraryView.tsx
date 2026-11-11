import React, { useState } from 'react';
import { Film, Image as ImageIcon, Plus, Trash2, Clock, UploadCloud, Eye, Link2, Loader2, X, Cloud } from 'lucide-react';
import type { MediaItem } from '../types/database';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface Props {
  media: MediaItem[];
  onAddMedia: (title: string, type: 'image' | 'video', url: string, durationSeconds: number, fileSizeBytes: number) => void;
  onDeleteMedia: (id: string) => void;
  onUpdateDuration: (id: string, durationSeconds: number) => void;
}

export const MediaLibraryView: React.FC<Props> = ({
  media,
  onAddMedia,
  onDeleteMedia,
  onUpdateDuration
}) => {
  const [showModal, setShowModal] = useState(false);
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [title, setTitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [duration, setDuration] = useState<number>(() => {
    const saved = localStorage.getItem('simper_default_duration');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video'>('image');
  const [fileSize, setFileSize] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const isVideo = file.type.startsWith('video');
      setFileType(isVideo ? 'video' : 'image');
      setFileSize(file.size);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ''));
      }

      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Informe um título para o anúncio.');
      return;
    }

    let finalUrl = '';
    setIsUploading(true);

    try {
      if (uploadMode === 'url') {
        if (!urlInput.trim()) {
          alert('Informe a URL da imagem ou vídeo.');
          setIsUploading(false);
          return;
        }
        finalUrl = urlInput.trim();
        const isVideo = finalUrl.match(/\.(mp4|webm|m4v)(\?.*)?$/i) !== null;
        setFileType(isVideo ? 'video' : 'image');
      } else {
        if (!selectedFile && !filePreview) {
          alert('Selecione um arquivo de foto ou vídeo.');
          setIsUploading(false);
          return;
        }

        // 1. Tenta Upload na Nuvem Global Supabase Storage
        if (selectedFile && isSupabaseConfigured) {
          try {
            const cleanName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const uniquePath = `uploads/${Date.now()}_${cleanName}`;

            const { data: uploadData, error: uploadErr } = await supabase.storage
              .from('media')
              .upload(uniquePath, selectedFile, {
                contentType: selectedFile.type,
                upsert: true
              });

            if (!uploadErr && uploadData) {
              const { data: urlData } = supabase.storage
                .from('media')
                .getPublicUrl(uniquePath);
              if (urlData?.publicUrl) {
                finalUrl = urlData.publicUrl;
              }
            } else if (uploadErr) {
              console.warn('Supabase storage aviso:', uploadErr.message);
            }
          } catch (cloudErr) {
            console.warn('Erro ao enviar para Supabase Storage:', cloudErr);
          }
        }

        // 2. Se o bucket da nuvem não estiver criado, tenta o servidor local como contingência
        if (!finalUrl && filePreview) {
          const serverHost = window.location.hostname || '192.168.1.11';
          try {
            const res = await fetch(`http://${serverHost}:8080/api/upload-media`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                base64: filePreview,
                title: title.trim(),
                type: fileType,
                durationSeconds: duration
              })
            });
            if (res.ok) {
              const resData = await res.json();
              if (resData.url) {
                finalUrl = resData.url;
              }
            }
          } catch (localErr) {
            console.warn('Servidor local offline:', localErr);
          }
        }

        // 3. Contingência base64 direta caso offline
        if (!finalUrl && filePreview) {
          finalUrl = filePreview;
        }
      }

      onAddMedia(title.trim(), fileType, finalUrl, duration, fileSize || 450000);
      setTitle('');
      setUrlInput('');
      setFilePreview(null);
      setSelectedFile(null);
      setShowModal(false);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            Biblioteca de Mídias
            <span className="text-xs font-mono font-bold bg-simper-gold/10 text-simper-gold border border-simper-gold/30 px-2.5 py-0.5 rounded-full">
              {media.length} {media.length === 1 ? 'anúncio' : 'anúncios'}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Carregue fotos e vídeos de alta qualidade para sincronizar com as Smart TVs da rede.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-slate-900 hover:bg-slate-800 dark:bg-simper-gold dark:hover:bg-simper-gold-hover text-white dark:text-slate-950 px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Adicionar Foto ou Vídeo
        </button>
      </div>

      {media.length === 0 ? (
        <div className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border rounded-3xl p-12 text-center shadow-card-light dark:shadow-card-dark">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-simper-navy-deep flex items-center justify-center mx-auto mb-4 text-slate-400">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Nenhum anúncio cadastrado</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-6">
            Adicione fotos ou vídeos em formato MP4 para compor suas grades de reprodução.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="bg-simper-gold text-slate-950 font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" /> Adicionar Primeiro Anúncio
          </button>
        </div>
      ) : (
        /* Grid de Mídias */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {media.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border rounded-3xl overflow-hidden shadow-card-light dark:shadow-card-dark hover:border-slate-300 dark:hover:border-simper-navy-border/80 transition-all flex flex-col justify-between group"
            >
              {/* Visualização com proporção 16:9 */}
              <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                {item.type === 'video' ? (
                  <video
                    src={item.url}
                    className="w-full h-full object-cover"
                    controls={false}
                    autoPlay
                    loop
                    muted
                  />
                ) : (
                  <img
                    src={item.url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}

                {/* Tag de Tipo */}
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                  {item.type === 'video' ? <Film className="w-3 h-3 text-simper-gold" /> : <ImageIcon className="w-3 h-3 text-sky-400" />}
                  <span>{item.type === 'video' ? 'Vídeo MP4' : 'Foto'}</span>
                </div>

                {/* Tag de Duração */}
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold text-simper-gold flex items-center gap-1 border border-white/10 font-mono">
                  <Clock className="w-3 h-3" /> {item.duration_seconds}s
                </div>
              </div>

              {/* Informações e Controles */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                      {item.title}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate max-w-[220px]">
                      {item.url}
                    </p>
                  </div>
                  <button
                    onClick={() => onDeleteMedia(item.id)}
                    className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    title="Excluir Mídia"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Ajuste de Duração */}
                <div className="pt-3 border-t border-slate-100 dark:border-simper-navy-border flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    Tempo de tela:
                  </span>
                  <select
                    value={item.duration_seconds}
                    onChange={(e) => onUpdateDuration(item.id, Number(e.target.value))}
                    className="bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-simper-gold cursor-pointer"
                  >
                    <option value={5}>5 seg</option>
                    <option value={8}>8 seg</option>
                    <option value={10}>10 seg</option>
                    <option value={15}>15 seg</option>
                    <option value={20}>20 seg</option>
                    <option value={30}>30 seg</option>
                    <option value={60}>60 seg</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Adicionar Mídia */}
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
              Adicionar Foto ou Vídeo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Envie fotos ou vídeos do computador para sincronizar com as Smart TVs.
            </p>

            {/* Alternador de Método: Arquivo vs Link */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-simper-navy-deep p-1 rounded-2xl mb-3 border border-slate-200 dark:border-simper-navy-border">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  uploadMode === 'file'
                    ? 'bg-white dark:bg-simper-navy-card text-slate-900 dark:text-white shadow-xs border border-slate-200/50 dark:border-simper-navy-border'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" /> Do Computador
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  uploadMode === 'url'
                    ? 'bg-white dark:bg-simper-navy-card text-slate-900 dark:text-white shadow-xs border border-slate-200/50 dark:border-simper-navy-border'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" /> Link da Web
              </button>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] mb-4">
              <Cloud className="w-4 h-4 shrink-0" />
              <span>Sincronização em Nuvem Global: suas mídias são acessadas pela TV em qualquer Wi-Fi ou 4G/5G.</span>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {uploadMode === 'file' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Arquivo de Mídia
                  </label>
                  <label className="border-2 border-dashed border-slate-300 dark:border-simper-navy-border rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-simper-gold dark:hover:border-simper-gold transition-colors bg-slate-50 dark:bg-simper-navy-deep/40">
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {filePreview ? 'Arquivo Selecionado (Clique para trocar)' : 'Clique para Escolher Foto ou Vídeo'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1">Formatos: JPG, PNG, WebP, MP4</span>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    URL Direta da Imagem ou Vídeo
                  </label>
                  <input
                    type="url"
                    required
                    value={urlInput}
                    onChange={(e) => {
                      setUrlInput(e.target.value);
                      setFilePreview(e.target.value);
                    }}
                    placeholder="https://exemplo.com/foto.jpg"
                    className="w-full bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                  />
                </div>
              )}

              {/* Preview */}
              {filePreview && (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-simper-navy-border bg-black">
                  {fileType === 'video' ? (
                    <video src={filePreview} className="w-full h-full object-cover" autoPlay loop muted />
                  ) : (
                    <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-bold flex items-center gap-1 border border-white/10">
                    <Eye className="w-3 h-3 text-simper-gold" /> Prévia
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Anúncio
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Promoção do Dia"
                  className="w-full bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Duração de Exibição na TV (segundos)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                >
                  <option value={5}>5 segundos</option>
                  <option value={8}>8 segundos</option>
                  <option value={10}>10 segundos</option>
                  <option value={15}>15 segundos</option>
                  <option value={20}>20 segundos</option>
                  <option value={30}>30 segundos</option>
                </select>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isUploading}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-simper-navy-border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-simper-navy-deep cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading || (!filePreview && !urlInput)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-simper-gold hover:bg-slate-800 text-white dark:text-slate-950 text-xs font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Enviando...
                    </>
                  ) : (
                    'Salvar e Enviar para TV'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
