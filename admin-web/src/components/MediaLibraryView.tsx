import React, { useState } from 'react';
import { Film, Image as ImageIcon, Plus, Trash2, Clock, UploadCloud, Eye, Link2, Loader2 } from 'lucide-react';
import type { MediaItem } from '../types/database';

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
  const [duration, setDuration] = useState(10);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video'>('image');
  const [fileSize, setFileSize] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
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
        if (!filePreview) {
          alert('Selecione um arquivo de foto ou vídeo.');
          setIsUploading(false);
          return;
        }

        // Faz o upload para o servidor local que a TV alcança na rede
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
          const resData = await res.json();
          if (resData.url) {
            finalUrl = resData.url;
          } else {
            finalUrl = filePreview;
          }
        } catch (err) {
          console.warn('Falha no upload direto para porta 8080:', err);
          finalUrl = filePreview;
        }
      }

      onAddMedia(title.trim(), fileType, finalUrl, duration, fileSize || 450000);
      setTitle('');
      setUrlInput('');
      setFilePreview(null);
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
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            Biblioteca de Mídias
            <span className="text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-simper-gold">
              {media.length} itens cadastrados
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Adicione fotos e vídeos do seu computador ou via link para sincronizar automaticamente com a TV.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-semibold text-xs flex items-center gap-2 shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Adicionar Foto ou Vídeo
        </button>
      </div>

      {/* Grid de Mídias */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {media.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between group"
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
              <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold text-white flex items-center gap-1 border border-white/10">
                {item.type === 'video' ? <Film className="w-3 h-3 text-simper-gold" /> : <ImageIcon className="w-3 h-3 text-sky-400" />}
                {item.type === 'video' ? 'Vídeo MP4' : 'Foto'}
              </div>

              {/* Tag de Duração */}
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold text-amber-300 flex items-center gap-1 border border-white/10">
                <Clock className="w-3 h-3" /> {item.duration_seconds}s
              </div>
            </div>

            {/* Informações e Controles */}
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-white line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5 truncate max-w-[200px]">
                    {item.url}
                  </p>
                </div>
                <button
                  onClick={() => onDeleteMedia(item.id)}
                  className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Excluir Mídia"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Ajuste de Duração */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Tempo na tela:
                </span>
                <select
                  value={item.duration_seconds}
                  onChange={(e) => onUpdateDuration(item.id, Number(e.target.value))}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
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

      {/* Modal Adicionar Mídia */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
              Adicionar Foto ou Vídeo
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Envie fotos do computador ou use links diretos para sincronizar com as Smart TVs.
            </p>

            {/* Alternador de Método: Arquivo vs Link */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-4">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  uploadMode === 'file'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" /> Do Computador
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('url')}
                className={`py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                  uploadMode === 'url'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Link2 className="w-3.5 h-3.5" /> Link da Web
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {uploadMode === 'file' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Arquivo de Mídia
                  </label>
                  <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 transition-colors bg-slate-50 dark:bg-slate-800/50">
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              )}

              {/* Preview */}
              {filePreview && (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-black">
                  {fileType === 'video' ? (
                    <video src={filePreview} className="w-full h-full object-cover" autoPlay loop muted />
                  ) : (
                    <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-white font-bold flex items-center gap-1">
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Duração de Exibição na TV (segundos)
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none"
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
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading || (!filePreview && !urlInput)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-900 dark:bg-simper-gold hover:bg-slate-800 text-white dark:text-slate-950 text-xs font-extrabold shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
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
