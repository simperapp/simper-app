import { useState, useEffect } from 'react';
import { 
  Tv, 
  Film, 
  ListVideo,
  Sun,
  Moon,
  LayoutDashboard
} from 'lucide-react';
import { api } from './services/api';
import type { Device, MediaItem, Playlist, TransitionType } from './types/database';

import { DashboardView } from './components/DashboardView';
import { DevicesView } from './components/DevicesView';
import { PlaylistsView } from './components/PlaylistsView';
import { MediaLibraryView } from './components/MediaLibraryView';

type Tab = 'dashboard' | 'tvs' | 'playlists' | 'media';

export function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(false); // Padrão: Modo Claro (Branco)

  const [devices, setDevices] = useState<Device[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const loadData = () => {
    setDevices(api.getDevices());
    setMedia(api.getMedia());
    setPlaylists(api.getPlaylists());
  };

  useEffect(() => {
    loadData();
    api.syncWithSupabase();
    const unsubscribe = api.subscribe(loadData);
    return () => unsubscribe();
  }, []);

  // Alterna classe 'dark' no elemento raiz HTML
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Controles de TVs
  const handleNextMedia = (deviceId: string, maxItems: number) => {
    api.nextMedia(deviceId, maxItems);
    setDevices(api.getDevices());
  };

  const handlePrevMedia = (deviceId: string, maxItems: number) => {
    api.prevMedia(deviceId, maxItems);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Logo Oficial Simper */}
            <div 
              onClick={() => setActiveTab('dashboard')} 
              className="flex items-center gap-2.5 cursor-pointer select-none"
            >
              <img src="/logo.png" alt="Simper" className="h-10 w-auto object-contain rounded-lg shadow-2xs" />
            </div>

            {/* Nav Tabs */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'dashboard'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
              </button>
              <button
                onClick={() => setActiveTab('tvs')}
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'tvs'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Tv className="w-3.5 h-3.5" /> Smart TVs ({devices.length})
              </button>
              <button
                onClick={() => setActiveTab('playlists')}
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'playlists'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ListVideo className="w-3.5 h-3.5" /> Playlists ({playlists.length})
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                  activeTab === 'media'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" /> Mídias ({media.length})
              </button>
            </nav>
          </div>

          {/* Right: Dark Mode Toggle & Status */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Servidor Local Ativo
            </span>

            {/* Alternador de Modo Claro / Escuro */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs"
              title={darkMode ? 'Mudar para Modo Claro (Branco)' : 'Mudar para Modo Escuro'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden flex items-center overflow-x-auto px-4 py-2 gap-2 border-t border-slate-200 dark:border-slate-800 text-xs font-bold">
          <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-1 rounded-lg ${activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Dashboard</button>
          <button onClick={() => setActiveTab('tvs')} className={`px-3 py-1 rounded-lg ${activeTab === 'tvs' ? 'bg-slate-900 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Smart TVs</button>
          <button onClick={() => setActiveTab('playlists')} className={`px-3 py-1 rounded-lg ${activeTab === 'playlists' ? 'bg-slate-900 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Playlists</button>
          <button onClick={() => setActiveTab('media')} className={`px-3 py-1 rounded-lg ${activeTab === 'media' ? 'bg-slate-900 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Mídias</button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <DashboardView
            devices={devices}
            media={media}
            playlists={playlists}
            onNextMedia={handleNextMedia}
            onPrevMedia={handlePrevMedia}
            onTogglePlayPause={handleTogglePlayPause}
            onUpdateRotation={handleUpdateRotation}
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
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 mt-auto">
        <p>simper.app &copy; 2026 — Plataforma de Gerenciamento e Reprodução em Smart TVs.</p>
      </footer>
    </div>
  );
}

export default App;
