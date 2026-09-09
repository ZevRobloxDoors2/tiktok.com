import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getDeviceId() {
  const key = 'centraltok_device_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const deviceId = `device_${crypto.randomUUID()}`;
  localStorage.setItem(key, deviceId);
  return deviceId;
}
