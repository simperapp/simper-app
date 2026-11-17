import type { Device, DeviceStatus } from '../types/database';

/**
 * Retorna se o dispositivo está efetivamente online com base no status cadastrado
 * e no batimento cardíaco (last_ping) recebido da Smart TV.
 * Se a TV não enviou sinal há mais de 150 segundos (2.5 minutos), é considerada desligada/desconectada.
 */
export function isDeviceOnline(device?: Partial<Device> | null): boolean {
  if (!device) return false;
  if (device.status === 'offline') return false;
  if (!device.last_ping) return false;

  const pingTime = new Date(device.last_ping).getTime();
  if (isNaN(pingTime)) return false;

  const diffMs = Date.now() - pingTime;
  // Limite de tolerância de 2.5 minutos (150.000 ms)
  return diffMs < 150000;
}

export function getEffectiveStatus(device?: Partial<Device> | null): DeviceStatus {
  return isDeviceOnline(device) ? 'online' : 'offline';
}

/**
 * Retorna texto descritivo amigável para o status de conexão da TV.
 */
export function formatLastPing(lastPing?: string): string {
  if (!lastPing) return 'Sem sinal registrado';
  const pingTime = new Date(lastPing).getTime();
  if (isNaN(pingTime)) return 'Horário desconhecido';

  const diffSec = Math.max(0, Math.floor((Date.now() - pingTime) / 1000));
  if (diffSec < 15) return 'Sinal ao vivo agora';
  if (diffSec < 60) return `Há ${diffSec}s atrás`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Há ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;

  const diffDays = Math.floor(diffHours / 24);
  return `Há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
}
