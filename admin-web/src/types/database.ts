export type DeviceStatus = 'online' | 'offline' | 'pairing';
export type ScreenOrientation = 'landscape' | 'portrait';
export type MediaType = 'video' | 'image';
export type TransitionType = 'fade' | 'cut' | 'slide' | 'zoom';

export interface Device {
  id: string;
  pairing_code: string;
  name: string;
  location?: string;
  status: DeviceStatus;
  orientation: ScreenOrientation;
  rotation_degrees: 0 | 90 | 180 | 270;
  screen_resolution: string;
  assigned_playlist_id?: string;
  transition_type: TransitionType;
  playback_state: 'playing' | 'paused';
  current_media_index: number;
  last_ping?: string;
  storage_free_mb: number;
  storage_total_mb: number;
  created_at: string;
}

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  url: string; // Data URL ou URL remota
  file_size_bytes: number;
  duration_seconds: number;
  created_at: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  media_ids: string[]; // Lista ordenada de IDs de mídias
  created_at: string;
}
