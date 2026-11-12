import { useState, useEffect } from 'react';
import { 
  Tv, 
  Film, 
  ListVideo,
  Sun,
  Moon,
  LayoutDashboard,
  LogOut,
  UserCheck,
  Settings,
  ChevronRight,
  Radio,
  Menu,
  X
} from 'lucide-react';
import { api } from './services/api';
import type { Device, MediaItem, Playlist, TransitionType } from './types/database';

import { DashboardView } from './components/DashboardView';
import { DevicesView } from './components/DevicesView';
import { PlaylistsView } from './components/PlaylistsView';
import { MediaLibraryView } from './components/MediaLibraryView';
import { SettingsView } from './components/SettingsView';
import { LoginView } from './components/LoginView';
import logoImg from './assets/logo.png';
import logoDarkImg from './assets/logo_dark_theme.png';

type Tab = 'dashboard' | 'tvs' | 'playlists' | 'media' | 'settings';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const session = localStorage.getItem('simper_session');
      if (!session) return false;
      const parsed = JSON.parse(session);
      return parsed?.user === 'dono';
    } catch {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Nome do Administrador customizável na aba Configurações
  const [adminName, setAdminName] = useState<string>(() => {
    return localStorage.getItem('simper_admin_name') || 'dono';
  });

  // Tema inicial com persistência e detecção de SO
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('simper_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [devices, setDevices] = useState<Device[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const loadData = () => {
    setDevices(api.getDevices());
    setMedia(api.getMedia());
    setPlaylists(api.getPlaylists());
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadData();
    api.syncWithSupabase();
    const unsubscribe = api.subscribe(loadData);

    // Polling contínuo com Supabase a cada 4s para refletir o estado exato da TV em tempo real
    const pollInterval = setInterval(() => {
      api.syncWithSupabase();
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [isAuthenticated]);

  // Aplicação estrita do tema em toda a hierarquia HTML
  const applyTheme = (isDark: boolean) => {
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.style.colorScheme = 'dark';
      localStorage.setItem('simper_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.style.colorScheme = 'light';
      localStorage.setItem('simper_theme', 'light');
    }
  };

  useEffect(() => {
    applyTheme(darkMode);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('simper_session');
    setIsAuthenticated(false);
  };

  // Se não estiver logado, exibe a tela de login
  if (!isAuthenticated) {
    return (
      <LoginView 
        onLoginSuccess={() => setIsAuthenticated(true)} 
        darkMode={darkMode}
        onToggleDarkMode={() => applyTheme(!darkMode)}
      />
    );
  }

  // Controles de TVs
  const handleNextMedia = (deviceId: string, maxItems: number) => {
    api.nextMedia(deviceId, maxItems);
    setDevices(api.getDevices());
  };

  const handlePrevMedia = (deviceId: string, maxItems: number) => {
    api.prevMedia(deviceId, maxItems);
    setDevices(api.getDevices());
  };

  const handleSkipToMedia = (deviceId: string, targetIndex: number) => {
    api.skipToMedia(deviceId, targetIndex);
    setDevices(api.getDevices());
  };

  const handleTogglePlayPause = (deviceId: string) => {
    api.togglePlayPause(deviceId);
    setDevices(api.getDevices());
  };

  const handleUpdateRotation = (deviceId: string, orientation: 'landscape' | 'portrait', rotation: 0 | 90 | 180 | 270) => {
    api.updateDeviceConfig(deviceId, { orientation, rotation_degrees: rotation });
    setDevices(api.getDevices());
  };

  const handleAddDevice = (code: string, name: string, location: string, orientation: 'landscape' | 'portrait', playlistId: string) => {
    api.createDevice(code, name, location, orientation, playlistId);
    setDevices(api.getDevices());
  };

  const handleDeleteDevice = (id: string) => {
    api.deleteDevice(id);
    setDevices(api.getDevices());
  };

  const handleUpdateTransition = (id: string, transition: TransitionType) => {
    api.updateTransition(id, transition);
    setDevices(api.getDevices());
  };

  const handleAssignPlaylist = (id: string, playlistId: string) => {
    api.assignPlaylist(id, playlistId);
    setDevices(api.getDevices());
  };

  // Controles de Playlists
  const handleCreatePlaylist = (name: string, description: string, mediaIds: string[]) => {
    api.createPlaylist(name, description, mediaIds);
    setPlaylists(api.getPlaylists());
  };

  const handleDeletePlaylist = (id: string) => {
    api.deletePlaylist(id);
    setPlaylists(api.getPlaylists());
  };

  const handleUpdatePlaylistItems = (id: string, mediaIds: string[]) => {
    api.updatePlaylistItems(id, mediaIds);
    setPlaylists(api.getPlaylists());
  };

  // Controles de Mídias
  const handleAddMedia = (title: string, type: 'image' | 'video', url: string, durationSeconds: number, fileSizeBytes: number) => {
    api.addMedia(title, type, url, durationSeconds, fileSizeBytes);
    loadData();
  };

  const handleDeleteMedia = (id: string) => {
    api.deleteMedia(id);
    loadData();
  };

  const handleUpdateDuration = (id: string, durationSeconds: number) => {
    api.updateMediaDuration(id, durationSeconds);
    setMedia(api.getMedia());
  };

  const navItems = [
    { id: 'dashboard' as Tab, label: 'Dashboard', icon: LayoutDashboard, badge: null },
    { id: 'tvs' as Tab, label: 'Smart TVs', icon: Tv, badge: devices.length },
    { id: 'playlists' as Tab, label: 'Playlists', icon: ListVideo, badge: playlists.length },
    { id: 'media' as Tab, label: 'Biblioteca Mídias', icon: Film, badge: media.length },
    { id: 'settings' as Tab, label: 'Configurações', icon: Settings, badge: null }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/90 to-slate-200/70 dark:from-[#050A18] dark:via-[#091228] dark:to-[#030610] text-slate-900 dark:text-slate-100 flex flex-col md:flex-row font-sans transition-colors duration-200">
      
      {/* 1. SIDEBAR LATERAL FIXA (DESKTOP) */}
      <aside className="hidden md:flex flex-col w-64 bg-white/95 dark:bg-[#080E20]/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-simper-navy-border shrink-0 z-30 select-none shadow-xl">
        {/* Brand / Logo Area */}
        <div className="h-20 px-5 flex items-center justify-between border-b border-slate-100 dark:border-simper-navy-border/60">
          <div 
            onClick={() => setActiveTab('dashboard')} 
            className="flex items-center gap-2.5 cursor-pointer group py-1"
            title="Ir para o Dashboard"
          >
            <img 
              src={darkMode ? logoDarkImg : logoImg} 
              alt="Simper" 
              className="h-10 w-auto max-w-[150px] object-contain transition-transform group-hover:scale-105 drop-shadow-xs" 
            />
            <span className="text-[10px] font-mono font-extrabold bg-simper-gold/15 text-simper-gold border border-simper-gold/30 px-1.5 py-0.5 rounded uppercase tracking-wider">
              PRO
            </span>
          </div>
        </div>

        {/* Live Network Status Capsule */}
        <div className="px-5 pt-5 pb-2">
          <div className="bg-slate-50 dark:bg-simper-navy-deep/80 border border-slate-200/80 dark:border-simper-navy-border rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                Nuvem Ativa
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-slate-400">
              Supabase
            </span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-3 mb-2">
            Gestão Comercial
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-semibold text-xs transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-simper-gold dark:text-slate-950 shadow-sm font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-simper-navy-hover hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${
                    isActive 
                      ? 'text-simper-gold dark:text-slate-950' 
                      : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                  }`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isActive 
                      ? 'bg-white/20 text-white dark:bg-black/20 dark:text-slate-950' 
                      : 'bg-slate-200/80 dark:bg-simper-navy-deep text-slate-600 dark:text-slate-400'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer: Theme Switcher & Admin Card */}
        <div className="p-4 border-t border-slate-100 dark:border-simper-navy-border/60 space-y-3">
          {/* Alternador de Tema Claro / Escuro Rápido */}
          <div className="flex items-center justify-between bg-slate-100 dark:bg-simper-navy-deep p-1 rounded-xl border border-slate-200/70 dark:border-simper-navy-border">
            <button
              onClick={() => applyTheme(false)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                !darkMode 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>Claro</span>
            </button>
            <button
              onClick={() => applyTheme(true)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                darkMode 
                  ? 'bg-simper-navy-card text-white shadow-xs border border-simper-gold/30' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-simper-gold" />
              <span>Escuro</span>
            </button>
          </div>

          {/* User Profile Card */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-simper-navy-deep/60 rounded-2xl border border-slate-200/70 dark:border-simper-navy-border">
            <div 
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-2.5 cursor-pointer overflow-hidden group"
              title="Configurações de Conta"
            >
              <div className="w-8 h-8 rounded-xl bg-simper-gold/15 text-simper-gold flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate capitalize group-hover:text-simper-gold transition-colors">
                  {adminName}
                </span>
                <span className="block text-[10px] text-slate-400">
                  Administrador
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sair do Sistema"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. HEADER MOBILE (CELULAR / TABLET) */}
      <header className="md:hidden bg-white/95 dark:bg-[#080E20]/95 backdrop-blur-md border-b border-slate-200 dark:border-simper-navy-border px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2">
          <img src={darkMode ? logoDarkImg : logoImg} alt="Simper" className="h-8 w-auto object-contain" />
          <span className="text-[10px] font-mono font-bold bg-simper-gold/15 text-simper-gold px-1.5 py-0.2 rounded uppercase">
            PRO
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Alternador de Tema */}
          <button
            onClick={() => applyTheme(!darkMode)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border text-slate-700 dark:text-slate-200"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Menu Hambúrguer */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-simper-navy-deep border border-slate-200 dark:border-simper-navy-border text-slate-700 dark:text-slate-200"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Menu Gaveta Mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-black/60 z-30 backdrop-blur-xs flex flex-col justify-between p-4">
          <div className="bg-white dark:bg-simper-navy-card rounded-3xl p-4 border border-slate-200 dark:border-simper-navy-border space-y-1 shadow-2xl">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl font-bold text-sm ${
                    isActive 
                      ? 'bg-slate-900 text-white dark:bg-simper-gold dark:text-slate-950' 
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && (
                    <span className="text-xs font-mono font-bold bg-white/20 dark:bg-black/20 px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={handleLogout}
            className="w-full bg-rose-600 text-white font-bold p-3.5 rounded-2xl flex items-center justify-center gap-2 shadow-lg"
          >
            <LogOut className="w-4 h-4" /> Sair da Plataforma
          </button>
        </div>
      )}

      {/* 3. ÁREA DE CONTEÚDO PRINCIPAL (MAIN FLUID AREA) */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* TOP COMMAND BAR (DESKTOP BREADCRUMB + TERMINAL QUICK STATUS) */}
        <header className="hidden md:flex h-16 bg-white/60 dark:bg-[#090F20]/60 backdrop-blur-md border-b border-slate-200/80 dark:border-simper-navy-border/60 px-8 items-center justify-between sticky top-0 z-20">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-400">Simper</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-bold text-slate-900 dark:text-white capitalize">
              {activeTab === 'dashboard' ? 'Painel de Controle' : activeTab === 'tvs' ? 'Smart TVs' : activeTab === 'playlists' ? 'Playlists' : activeTab === 'media' ? 'Mídias' : 'Configurações'}
            </span>
          </div>

          {/* Top Actions: Totem Live Signal + Active Device Indicator */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-simper-navy-deep px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-simper-navy-border text-xs font-semibold text-slate-700 dark:text-slate-300">
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Totem Principal: <strong>{devices[0]?.pairing_code || 'SMPX5S'}</strong></span>
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              v2.4 Pro
            </span>
          </div>
        </header>

        {/* MAIN BODY CONTAINER */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              devices={devices}
              media={media}
              playlists={playlists}
              onNextMedia={handleNextMedia}
              onPrevMedia={handlePrevMedia}
              onTogglePlayPause={handleTogglePlayPause}
              onUpdateRotation={handleUpdateRotation}
              onSkipToMedia={handleSkipToMedia}
            />
          )}

          {activeTab === 'tvs' && (
            <DevicesView
              devices={devices}
              playlists={playlists}
              onAddDevice={handleAddDevice}
              onDeleteDevice={handleDeleteDevice}
              onUpdateTransition={handleUpdateTransition}
              onAssignPlaylist={handleAssignPlaylist}
              onUpdateRotation={handleUpdateRotation}
              onTogglePlayPause={handleTogglePlayPause}
            />
          )}

          {activeTab === 'playlists' && (
            <PlaylistsView
              playlists={playlists}
              media={media}
              onCreatePlaylist={handleCreatePlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              onUpdatePlaylistItems={handleUpdatePlaylistItems}
            />
          )}

          {activeTab === 'media' && (
            <MediaLibraryView
              media={media}
              onAddMedia={handleAddMedia}
              onDeleteMedia={handleDeleteMedia}
              onUpdateDuration={handleUpdateDuration}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              darkMode={darkMode}
              onThemeChange={applyTheme}
              devices={devices}
              media={media}
              playlists={playlists}
              onForceSync={() => {
                api.syncWithSupabase();
                loadData();
              }}
              adminName={adminName}
              onAdminNameChange={(newName) => setAdminName(newName)}
            />
          )}
        </main>

        {/* CLEAN MINIMAL FOOTER */}
        <footer className="border-t border-slate-200/80 dark:border-simper-navy-border/60 py-6 px-8 text-xs text-slate-500 dark:text-slate-400 bg-white/40 dark:bg-simper-navy-card/40 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <p className="font-medium text-slate-600 dark:text-slate-400">
              Simper Sistemas &copy; {new Date().getFullYear()} — Plataforma de Gestão de Mídia Indoor
            </p>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Totens 9:16 e Telas 16:9
              </span>
              <span>•</span>
              <span>Sincronização Nuvem Supabase</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
