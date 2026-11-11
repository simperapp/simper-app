import type { Device, MediaItem, Playlist, TransitionType } from '../types/database';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const STORAGE_PREFIX = 'simper_v4_';

function getStored<T>(key: string, initial: T): T {
  try {
    const data = localStorage.getItem(STORAGE_PREFIX + key);
    return data ? JSON.parse(data) : initial;
  } catch {
    return initial;
  }
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('Falha ao salvar no storage local', e);
  }
}

async function safeRemote(fn: () => PromiseLike<any> | Promise<any>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.warn('Supabase sync warning:', err);
  }
}

// Mídias iniciais padrão
const initialMedia: MediaItem[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    title: 'Menu Especial Pratos Gourmet',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1280&auto=format&fit=crop&q=80',
    file_size_bytes: 420000,
    duration_seconds: 10,
    created_at: new Date().toISOString()
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    title: 'Bebidas & Drinks Especiais',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1280&auto=format&fit=crop&q=80',
    file_size_bytes: 380000,
    duration_seconds: 8,
    created_at: new Date().toISOString()
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    title: 'Sobremesas da Casa & Cafés',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1280&auto=format&fit=crop&q=80',
    file_size_bytes: 510000,
    duration_seconds: 12,
    created_at: new Date().toISOString()
  }
];

const initialPlaylists: Playlist[] = [
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    name: 'Grade Comercial Principal',
    description: 'Sequência contínua de anúncios comerciais',
    media_ids: [
      'a0000000-0000-0000-0000-000000000001',
      'a0000000-0000-0000-0000-000000000002',
      'a0000000-0000-0000-0000-000000000003'
    ],
    created_at: new Date().toISOString()
  }
];

const initialDevices: Device[] = [
  {
    id: 'edbc6a0c-b469-4859-b00c-3885133d290e',
    pairing_code: 'SMPX5S',
    name: 'TV Aiwa 32 (SMPX5S)',
    location: 'Hall de Entrada',
    status: 'online',
    orientation: 'portrait',
    rotation_degrees: 90,
    screen_resolution: '1366x768',
    assigned_playlist_id: '',
    transition_type: 'fade',
    playback_state: 'playing',
    current_media_index: 0,
    last_ping: new Date().toISOString(),
    storage_free_mb: 1982,
    storage_total_mb: 4107,
    created_at: new Date().toISOString()
  }
];

type SyncListener = () => void;
const listeners: SyncListener[] = [];

export const api = {
  subscribe(fn: SyncListener) {
    listeners.push(fn);
    return () => {
      const idx = listeners.indexOf(fn);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },

  notify() {
    listeners.forEach(fn => fn());
  },

  // SINCRONIZAÇÃO NUVEM COM SUPABASE
  async syncWithSupabase() {
    if (!isSupabaseConfigured) return;

    try {
      // 1. Carrega Mídias
      const { data: mediaRows, error: mErr } = await supabase.from('media_items').select('*').order('created_at', { ascending: false });
      if (!mErr && mediaRows && mediaRows.length > 0) {
        const syncedMedia: MediaItem[] = mediaRows.map(row => ({
          id: row.id,
          title: row.title,
          type: row.type,
          url: row.public_url,
          duration_seconds: row.duration_seconds || 10,
          file_size_bytes: row.file_size_bytes || 0,
          created_at: row.created_at
        }));
        setStored('media', syncedMedia);
      }

      // 2. Carrega Playlists e seus itens
      const { data: plRows, error: pErr } = await supabase.from('playlists').select('*, playlist_items(*)').order('created_at', { ascending: false });
      if (!pErr && plRows && plRows.length > 0) {
        const syncedPlaylists: Playlist[] = plRows.map(row => {
          const items = (row.playlist_items || []).sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
          return {
            id: row.id,
            name: row.name,
            description: row.description || '',
            media_ids: items.map((it: any) => it.media_item_id),
            created_at: row.created_at
          };
        });
        setStored('playlists', syncedPlaylists);
      }

      // 3. Carrega Dispositivos / TVs
      const { data: devRows, error: dErr } = await supabase.from('devices').select('*').order('created_at', { ascending: false });
      if (!dErr && devRows && devRows.length > 0) {
        const syncedDevices: Device[] = devRows.map(row => ({
          id: row.id,
          pairing_code: row.pairing_code,
          name: row.name,
          location: row.location || 'Localização não definida',
          status: row.status || 'online',
          orientation: row.orientation || 'landscape',
          rotation_degrees: row.rotation_degrees || 0,
          screen_resolution: row.orientation === 'portrait' ? '768x1366' : '1366x768',
          assigned_playlist_id: row.current_playlist_id || '',
          transition_type: row.transition || 'fade',
          playback_state: row.is_playing ? 'playing' : 'paused',
          current_media_index: row.current_media_index || 0,
          last_ping: row.last_ping || new Date().toISOString(),
          storage_free_mb: 3200,
          storage_total_mb: 4096,
          created_at: row.created_at
        }));
        setStored('devices', syncedDevices);
      }

      this.notify();
    } catch (e) {
      console.warn('Sincronização em segundo plano:', e);
    }
  },

  // DISPOSITIVOS / SMART TVS
  getDevices(): Device[] {
    return getStored('devices', initialDevices);
  },

  createDevice(pairingCode: string, name: string, location: string, orientation: 'landscape' | 'portrait', playlistId: string): Device {
    const devices = this.getDevices();
    const newId = crypto.randomUUID();
    const code = pairingCode.trim().toUpperCase();

    const newDevice: Device = {
      id: newId,
      pairing_code: code,
      name,
      location,
      status: 'online',
      orientation,
      rotation_degrees: orientation === 'portrait' ? 90 : 0,
      screen_resolution: orientation === 'portrait' ? '768x1366' : '1366x768',
      assigned_playlist_id: playlistId,
      transition_type: 'fade',
      playback_state: 'playing',
      current_media_index: 0,
      last_ping: new Date().toISOString(),
      storage_free_mb: 3200,
      storage_total_mb: 4096,
      created_at: new Date().toISOString()
    };

    const updated = [newDevice, ...devices];
    setStored('devices', updated);

    if (isSupabaseConfigured) {
      safeRemote(() => supabase.from('devices').upsert({
        id: newId,
        pairing_code: code,
        name,
        location,
        status: 'online',
        orientation,
        rotation_degrees: orientation === 'portrait' ? 90 : 0,
        transition: 'fade',
        current_playlist_id: playlistId || null,
        current_media_index: 0,
        is_playing: true
      }));
    }

    return newDevice;
  },

  deleteDevice(id: string): void {
    const devices = this.getDevices();
    setStored('devices', devices.filter(d => d.id !== id));

    if (isSupabaseConfigured) {
      safeRemote(() => supabase.from('devices').delete().eq('id', id));
    }
  },

  updateDeviceConfig(id: string, updates: Partial<Device>): void {
    const devices = this.getDevices();
    const target = devices.find(d => d.id === id);
    const updated = devices.map(d => d.id === id ? { ...d, ...updates } : d);
    setStored('devices', updated);
    this.notify();

    if (isSupabaseConfigured) {
      const payload: any = {};
      if (updates.orientation !== undefined) payload.orientation = updates.orientation;
      if (updates.rotation_degrees !== undefined) payload.rotation_degrees = updates.rotation_degrees;
      if (updates.transition_type !== undefined) payload.transition = updates.transition_type;
      if (updates.assigned_playlist_id !== undefined) payload.current_playlist_id = updates.assigned_playlist_id;
      if (updates.current_media_index !== undefined) payload.current_media_index = updates.current_media_index;
      if (updates.playback_state !== undefined) payload.is_playing = updates.playback_state === 'playing';

      safeRemote(async () => {
        const code = target?.pairing_code || 'SMPX5S';
        await supabase.from('devices').update(payload).eq('pairing_code', code);
        await supabase.from('devices').update(payload).eq('id', id);
      });
    }
  },

  // CONTROLES DE REPRODUÇÃO EM TEMPO REAL
  nextMedia(deviceId: string, maxItems: number): void {
    const devices = this.getDevices();
    const target = devices.find(d => d.id === deviceId);
    let nextIdx = 0;
    const updated = devices.map(d => {
      if (d.id === deviceId) {
        nextIdx = (d.current_media_index + 1) % (maxItems || 1);
        return { ...d, current_media_index: nextIdx };
      }
      return d;
    });
    setStored('devices', updated);
    this.notify();

    if (isSupabaseConfigured) {
      safeRemote(async () => {
        const code = target?.pairing_code || 'SMPX5S';
        await supabase.from('devices').update({ current_media_index: nextIdx }).eq('pairing_code', code);
        await supabase.from('devices').update({ current_media_index: nextIdx }).eq('id', deviceId);
      });
    }
  },

  prevMedia(deviceId: string, maxItems: number): void {
    const devices = this.getDevices();
    const target = devices.find(d => d.id === deviceId);
    let prevIdx = 0;
    const updated = devices.map(d => {
      if (d.id === deviceId) {
        prevIdx = d.current_media_index <= 0 ? (maxItems - 1) : (d.current_media_index - 1);
        return { ...d, current_media_index: Math.max(0, prevIdx) };
      }
      return d;
    });
    setStored('devices', updated);
    this.notify();

    if (isSupabaseConfigured) {
      safeRemote(async () => {
        const code = target?.pairing_code || 'SMPX5S';
        await supabase.from('devices').update({ current_media_index: prevIdx }).eq('pairing_code', code);
        await supabase.from('devices').update({ current_media_index: prevIdx }).eq('id', deviceId);
      });
    }
  },

  skipToMedia(deviceId: string, targetIndex: number): void {
    const devices = this.getDevices();
    const target = devices.find(d => d.id === deviceId);
    const updated = devices.map(d => {
      if (d.id === deviceId) {
        return { ...d, current_media_index: targetIndex };
      }
      return d;
    });
    setStored('devices', updated);
    this.notify();

    if (isSupabaseConfigured) {
      safeRemote(async () => {
        const code = target?.pairing_code || 'SMPX5S';
        await supabase.from('devices').update({ current_media_index: targetIndex }).eq('pairing_code', code);
        await supabase.from('devices').update({ current_media_index: targetIndex }).eq('id', deviceId);
      });
    }
  },

  togglePlayPause(deviceId: string): void {
    const devices = this.getDevices();
    const target = devices.find(d => d.id === deviceId);
    let isPlaying = true;
    const updated = devices.map(d => {
      if (d.id === deviceId) {
        isPlaying = d.playback_state !== 'playing';
        return { ...d, playback_state: isPlaying ? 'playing' : 'paused' };
      }
      return d;
    });
    setStored('devices', updated);
    this.notify();

    if (isSupabaseConfigured) {
      safeRemote(async () => {
        const code = target?.pairing_code || 'SMPX5S';
        await supabase.from('devices').update({ is_playing: isPlaying }).eq('pairing_code', code);
        await supabase.from('devices').update({ is_playing: isPlaying }).eq('id', deviceId);
      });
    }
  },

  updateTransition(deviceId: string, transition: TransitionType): void {
    this.updateDeviceConfig(deviceId, { transition_type: transition });
  },

  assignPlaylist(deviceId: string, playlistId: string): void {
    this.updateDeviceConfig(deviceId, { assigned_playlist_id: playlistId, current_media_index: 0 });
  },

  // MÍDIAS
  getMedia(): MediaItem[] {
    return getStored('media', initialMedia);
  },

  addMedia(title: string, type: 'image' | 'video', url: string, durationSeconds: number, fileSizeBytes: number): MediaItem {
    const media = this.getMedia();
    const newId = crypto.randomUUID();
    const newItem: MediaItem = {
      id: newId,
      title,
      type,
      url,
      duration_seconds: durationSeconds,
      file_size_bytes: fileSizeBytes,
      created_at: new Date().toISOString()
    };
    const updated = [newItem, ...media];
    setStored('media', updated);

    // Adiciona automaticamente à primeira playlist
    const playlists = this.getPlaylists();
    if (playlists.length > 0) {
      playlists[0].media_ids.push(newItem.id);
      setStored('playlists', playlists);

      if (isSupabaseConfigured) {
        safeRemote(() => supabase.from('playlist_items').insert({
          playlist_id: playlists[0].id,
          media_item_id: newId,
          display_order: playlists[0].media_ids.length
        }));
      }
    }

    if (isSupabaseConfigured) {
      safeRemote(() => supabase.from('media_items').insert({
        id: newId,
        title,
        type,
        public_url: url,
        duration_seconds: durationSeconds,
        file_size_bytes: fileSizeBytes
      }));
    }

    return newItem;
  },

  deleteMedia(id: string): void {
    const media = this.getMedia();
    setStored('media', media.filter(m => m.id !== id));

    const playlists = this.getPlaylists();
    const updatedPlaylists = playlists.map(pl => ({
      ...pl,
      media_ids: pl.media_ids.filter(mId => mId !== id)
    }));
    setStored('playlists', updatedPlaylists);

    if (isSupabaseConfigured) {
      safeRemote(() => supabase.from('media_items').delete().eq('id', id));
    }
  },

  updateMediaDuration(id: string, durationSeconds: number): void {
    const media = this.getMedia();
    const updated = media.map(m => m.id === id ? { ...m, duration_seconds: durationSeconds } : m);
    setStored('media', updated);
    this.notify();

    if (isSupabaseConfigured) {
      safeRemote(() => supabase.from('media_items').update({ duration_seconds: durationSeconds }).eq('id', id));
    }
  },

  // PLAYLISTS
  getPlaylists(): Playlist[] {
    return getStored('playlists', initialPlaylists);
  },

  createPlaylist(name: string, description: string, mediaIds: string[]): Playlist {
    const playlists = this.getPlaylists();
    const newId = crypto.randomUUID();
    const newPlaylist: Playlist = {
      id: newId,
      name,
      description,
      media_ids: mediaIds,
      created_at: new Date().toISOString()
    };
    const updated = [...playlists, newPlaylist];
    setStored('playlists', updated);

    if (isSupabaseConfigured) {
      safeRemote(async () => {
        await supabase.from('playlists').insert({ id: newId, name, description });
        if (mediaIds.length > 0) {
          const items = mediaIds.map((mId, idx) => ({
            playlist_id: newId,
            media_item_id: mId,
            display_order: idx + 1
          }));
          await supabase.from('playlist_items').insert(items);
        }
      });
    }

    return newPlaylist;
  },

  deletePlaylist(id: string): void {
    const playlists = this.getPlaylists();
    setStored('playlists', playlists.filter(p => p.id !== id));

    if (isSupabaseConfigured) {
      safeRemote(() => supabase.from('playlists').delete().eq('id', id));
    }
  },

  updatePlaylistItems(id: string, mediaIds: string[]): void {
    const playlists = this.getPlaylists();
    const updated = playlists.map(p => p.id === id ? { ...p, media_ids: mediaIds } : p);
    setStored('playlists', updated);

    if (isSupabaseConfigured) {
      safeRemote(async () => {
        await supabase.from('playlist_items').delete().eq('playlist_id', id);
        if (mediaIds.length > 0) {
          const items = mediaIds.map((mId, idx) => ({
            playlist_id: id,
            media_item_id: mId,
            display_order: idx + 1
          }));
          await supabase.from('playlist_items').insert(items);
        }
      });
    }
  }
};
