import React, { useState } from 'react';
import { 
  Sun, 
  Moon, 
  Laptop, 
  User, 
  Mail, 
  Lock, 
  Sliders, 
  Clock, 
  Radio, 
  Server, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Save
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { TransitionType, Device, MediaItem, Playlist } from '../types/database';

interface Props {
  darkMode: boolean;
  onThemeChange: (isDark: boolean) => void;
  devices: Device[];
  media: MediaItem[];
  playlists: Playlist[];
  onForceSync: () => void;
  adminName: string;
  onAdminNameChange: (name: string) => void;
}

export const SettingsView: React.FC<Props> = ({
  darkMode,
  onThemeChange,
  devices,
  media,
  playlists,
  onForceSync,
  adminName,
  onAdminNameChange
}) => {
  // 1. Estado da Seção Aparência
  const [selectedThemeMode, setSelectedThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    const saved = localStorage.getItem('simper_theme_mode');
    return (saved as 'light' | 'dark' | 'system') || (darkMode ? 'dark' : 'light');
  });

  // 2. Estado da Seção Perfil
  const [nameInput, setNameInput] = useState(adminName);
  const [emailInput, setEmailInput] = useState(() => localStorage.getItem('simper_admin_email') || 'dono@simper.app');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 3. Estado da Seção Reprodução
  const [defaultDuration, setDefaultDuration] = useState<number>(() => {
    const saved = localStorage.getItem('simper_default_duration');
    return saved ? parseInt(saved, 10) : 10;
  });
  const [defaultTransition, setDefaultTransition] = useState<TransitionType>(() => {
    const saved = localStorage.getItem('simper_default_transition');
    return (saved as TransitionType) || 'fade';
  });
  const [continuousLoop, setContinuousLoop] = useState<boolean>(() => {
    const saved = localStorage.getItem('simper_continuous_loop');
    return saved !== null ? saved === 'true' : true;
  });
  const [playbackSavedNotice, setPlaybackSavedNotice] = useState(false);

  // 4. Estado da Seção Sistema & Diagnóstico
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => new Date().toLocaleTimeString('pt-BR'));
  const [systemNotice, setSystemNotice] = useState<string | null>(null);

  // Manipulador de Tema
  const handleSelectTheme = (mode: 'light' | 'dark' | 'system') => {
    setSelectedThemeMode(mode);
    localStorage.setItem('simper_theme_mode', mode);

    if (mode === 'system') {
      const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      onThemeChange(systemIsDark);
    } else {
      onThemeChange(mode === 'dark');
    }
  };

  // Salvar Informações de Perfil e Senha
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsSavingProfile(true);

    try {
      // 1. Atualiza Nome e Email
      const cleanName = nameInput.trim() || 'Dono';
      const cleanEmail = emailInput.trim();
      onAdminNameChange(cleanName);
      localStorage.setItem('simper_admin_name', cleanName);
      localStorage.setItem('simper_admin_email', cleanEmail);

      // 2. Se informou nova senha, valida e aplica
      if (newPassword.trim()) {
        if (newPassword.trim().length < 4) {
          throw new Error('A nova senha deve ter no mínimo 4 caracteres.');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('A confirmação da senha não confere com a nova senha digitada.');
        }

        // Tenta atualizar no Supabase se houver conexão autenticada
        if (isSupabaseConfigured) {
          try {
            await supabase.auth.updateUser({ password: newPassword });
          } catch (err) {
            console.warn('Nota: Atualização no Supabase Auth em fallback local:', err);
          }
        }

        // Salva a credencial atualizada para a tela de login local
        localStorage.setItem('simper_custom_password', newPassword.trim());
        setNewPassword('');
        setConfirmPassword('');
      }

      setProfileMessage({ text: 'Perfil e preferências de segurança salvos com sucesso!', type: 'success' });
      setTimeout(() => setProfileMessage(null), 4000);
    } catch (err: any) {
      setProfileMessage({ text: err.message || 'Erro ao salvar perfil.', type: 'error' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Salvar Padrões de Reprodução
  const handleSavePlayback = () => {
    localStorage.setItem('simper_default_duration', defaultDuration.toString());
    localStorage.setItem('simper_default_transition', defaultTransition);
    localStorage.setItem('simper_continuous_loop', continuousLoop.toString());
    setPlaybackSavedNotice(true);
    setTimeout(() => setPlaybackSavedNotice(false), 3000);
  };

  // Teste de Ping com Supabase em Tempo Real
  const handleTestConnection = async () => {
    setIsPinging(true);
    setPingLatency(null);
    const start = performance.now();
    try {
      if (isSupabaseConfigured) {
        await supabase.from('devices').select('id').limit(1);
      } else {
        // Ping simulado de rede local caso não haja supabase online
        await new Promise(res => setTimeout(res, 80));
      }
      const end = performance.now();
      const latencyMs = Math.round(end - start);
      setPingLatency(latencyMs);
      setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.warn('Ping error:', err);
      setPingLatency(-1);
    } finally {
      setIsPinging(false);
    }
  };

  const handleManualSync = () => {
    onForceSync();
    setLastSyncTime(new Date().toLocaleTimeString('pt-BR'));
    setSystemNotice('Sincronização com a nuvem solicitada com sucesso!');
    setTimeout(() => setSystemNotice(null), 3000);
  };

  // Cálculos de Diagnóstico
  const totalStorageKb = media.reduce((acc, m) => acc + (m.file_size_bytes || 450000), 0) / 1024;
  const totalCycleSeconds = media.reduce((acc, m) => acc + (m.duration_seconds || 10), 0);
  const onlineCount = devices.filter(d => d.status === 'online').length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-simper-gold" />
            Configurações da Plataforma
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Gerencie aparência, credenciais administrativas, padrões de reprodução e diagnósticos técnicos.
          </p>
        </div>

        <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-simper-gold/10 text-simper-gold border border-simper-gold/30 self-start sm:self-auto flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Painel SaaS v2.4.0
        </span>
      </div>

      {/* SEÇÃO 1: APARÊNCIA & TEMA */}
      <section className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border rounded-3xl p-6 sm:p-8 shadow-card-light dark:shadow-card-dark transition-all">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-simper-gold/10 text-simper-gold flex items-center justify-center">
            {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Aparência e Modo de Exibição
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Escolha como o sistema se apresenta no computador e no celular. As preferências são salvas no seu navegador.
            </p>
          </div>
        </div>

        {/* Seletores de Tema em Cards com Prévia */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card Modo Claro */}
          <div 
            onClick={() => handleSelectTheme('light')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              selectedThemeMode === 'light'
                ? 'border-simper-gold bg-simper-gold/5 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sun className="w-4 h-4 text-amber-500" /> Modo Claro
                </span>
                {selectedThemeMode === 'light' && (
                  <CheckCircle2 className="w-4 h-4 text-simper-gold" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Fundo branco e cinza suave com tipografia de alto contraste para ambientes iluminados.
              </p>
            </div>

            {/* Mini preview do Modo Claro */}
            <div className="mt-4 p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5 pointer-events-none">
              <div className="h-2 w-16 bg-slate-200 rounded" />
              <div className="h-4 w-full bg-slate-100 rounded flex items-center px-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-simper-gold" />
              </div>
            </div>
          </div>

          {/* Card Modo Escuro */}
          <div 
            onClick={() => handleSelectTheme('dark')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              selectedThemeMode === 'dark'
                ? 'border-simper-gold bg-simper-gold/5 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Moon className="w-4 h-4 text-blue-400" /> Modo Escuro
                </span>
                {selectedThemeMode === 'dark' && (
                  <CheckCircle2 className="w-4 h-4 text-simper-gold" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tons profundos de azul-marinho e preto com detalhes em dourado metálico.
              </p>
            </div>

            {/* Mini preview do Modo Escuro */}
            <div className="mt-4 p-2.5 rounded-xl bg-[#060B18] border border-[#1E2C4A] shadow-2xs space-y-1.5 pointer-events-none">
              <div className="h-2 w-16 bg-[#101B37] rounded" />
              <div className="h-4 w-full bg-[#0C1427] rounded flex items-center px-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
              </div>
            </div>
          </div>

          {/* Card Automático (Sistema) */}
          <div 
            onClick={() => handleSelectTheme('system')}
            className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              selectedThemeMode === 'system'
                ? 'border-simper-gold bg-simper-gold/5 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900/40'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-slate-400" /> Automático
                </span>
                {selectedThemeMode === 'system' && (
                  <CheckCircle2 className="w-4 h-4 text-simper-gold" />
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Acompanha automaticamente a configuração do seu computador ou smartphone.
              </p>
            </div>

            <div className="mt-4 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-500">
              Sincronizado com o SO
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO 2: PERFIL ADMINISTRATIVO & SEGURANÇA */}
      <section className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border rounded-3xl p-6 sm:p-8 shadow-card-light dark:shadow-card-dark transition-all">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Perfil e Segurança da Conta
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Atualize as informações do operador e a senha de acesso à área administrativa.
            </p>
          </div>
        </div>

        {profileMessage && (
          <div className={`mb-6 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border ${
            profileMessage.type === 'success' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300'
          }`}>
            {profileMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{profileMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Nome do Administrador
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Nome do Dono"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                E-mail da Conta
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="admin@simper.app"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-simper-gold" />
              Alterar Senha de Acesso (Opcional)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nova senha (deixe vazio para não alterar)"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                />
              </div>

              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmar nova senha"
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="bg-simper-navy-dark dark:bg-simper-gold text-white dark:text-slate-950 font-bold px-5 py-2.5 rounded-xl text-xs flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingProfile ? 'Salvando...' : 'Salvar Alterações de Perfil'}</span>
            </button>
          </div>
        </form>
      </section>

      {/* SEÇÃO 3: PADRÕES DE REPRODUÇÃO & EXIBIÇÃO */}
      <section className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border rounded-3xl p-6 sm:p-8 shadow-card-light dark:shadow-card-dark transition-all">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Parâmetros Padrão de Reprodução
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Defina os comportamentos que serão aplicados por padrão em novos anúncios e Smart TVs.
            </p>
          </div>
        </div>

        {playbackSavedNotice && (
          <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Padrões de reprodução gravados com sucesso!</span>
          </div>
        )}

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Duração Padrão */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Duração Padrão para Novas Imagens
              </label>
              <select
                value={defaultDuration}
                onChange={(e) => setDefaultDuration(parseInt(e.target.value, 10))}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold"
              >
                <option value={5}>5 segundos (Rápido)</option>
                <option value={10}>10 segundos (Recomendado)</option>
                <option value={15}>15 segundos (Padrão)</option>
                <option value={20}>20 segundos (Prolongado)</option>
                <option value={30}>30 segundos (Institucional)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Ao fazer upload de novas imagens, esse tempo será preenchido automaticamente.
              </p>
            </div>

            {/* Transição Padrão */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Transição Padrão para Novas TVs
              </label>
              <select
                value={defaultTransition}
                onChange={(e) => setDefaultTransition(e.target.value as TransitionType)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-simper-gold capitalize"
              >
                <option value="fade">Desvanecer (Fade Suave)</option>
                <option value="cut">Corte Seco (Troca Imediata)</option>
                <option value="slide">Deslizar (Slide Lateral)</option>
                <option value="zoom">Zoom Dinâmico (Ken Burns)</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Estilo de passagem aplicado ao cadastrar novas Smart TVs na rede.
              </p>
            </div>
          </div>

          {/* Toggle de Looping Contínuo */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
            <div>
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                Looping Contínuo Ininterrupto (24/7)
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Ao atingir o último anúncio da playlist, o player reinicia imediatamente do primeiro sem tela preta.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setContinuousLoop(!continuousLoop)}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                continuousLoop ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <span className={`block w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                continuousLoop ? 'right-1' : 'left-1'
              }`} />
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSavePlayback}
              className="bg-slate-900 dark:bg-simper-gold text-white dark:text-slate-950 font-bold px-4 py-2 rounded-xl text-xs hover:opacity-90 transition-opacity cursor-pointer"
            >
              Aplicar Padrões de Reprodução
            </button>
          </div>
        </div>
      </section>

      {/* SEÇÃO 4: SISTEMA & DIAGNÓSTICO EM TEMPO REAL */}
      <section className="bg-white dark:bg-simper-navy-card border border-slate-200 dark:border-simper-navy-border rounded-3xl p-6 sm:p-8 shadow-card-light dark:shadow-card-dark transition-all">
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Status do Sistema e Diagnóstico
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Métricas técnicas de rede, armazenamento e sincronização com o backend.
              </p>
            </div>
          </div>

          <button
            onClick={handleManualSync}
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Sincronizar com a Nuvem agora"
          >
            <RefreshCw className="w-3.5 h-3.5 text-simper-gold" />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>
        </div>

        {systemNotice && (
          <div className="mb-5 p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl text-xs font-semibold text-blue-800 dark:text-blue-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{systemNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400">Versão da Plataforma</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-1">v2.4.0 SaaS</p>
            <span className="text-[10px] text-emerald-500 font-semibold">Build Atualizada</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400">Terminais Ativos</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{onlineCount} de {devices.length}</p>
            <span className="text-[10px] text-slate-500">Conexões ativas</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400">Armazenamento Total</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{totalStorageKb > 1024 ? `${(totalStorageKb / 1024).toFixed(1)} MB` : `${Math.round(totalStorageKb)} KB`}</p>
            <span className="text-[10px] text-slate-500">{media.length} arquivos ({playlists.length} playlists)</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <span className="text-[11px] font-semibold text-slate-400">Volta Completa</span>
            <p className="text-base font-bold text-slate-900 dark:text-white mt-1">{Math.floor(totalCycleSeconds / 60)}m {totalCycleSeconds % 60}s</p>
            <span className="text-[10px] text-amber-500 font-semibold">Ciclo total da grade</span>
          </div>
        </div>

        {/* Teste de Conexão com Supabase */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-500" />
              <span className="font-bold text-xs text-slate-900 dark:text-white">
                Infraestrutura em Nuvem (Supabase Realtime)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/30">
                Ativo
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Última sincronização realizada às <strong className="text-slate-700 dark:text-slate-300">{lastSyncTime}</strong>.
              {pingLatency !== null && (
                <span className="ml-2 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  (Latência: {pingLatency}ms)
                </span>
              )}
            </p>
          </div>

          <button
            onClick={handleTestConnection}
            disabled={isPinging}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer disabled:opacity-50"
          >
            <Radio className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
            <span>{isPinging ? 'Testando...' : 'Testar Conexão em Tempo Real'}</span>
          </button>
        </div>
      </section>
    </div>
  );
};
