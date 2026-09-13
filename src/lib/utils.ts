import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { User } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isFriend(userA?: User | null, userB?: User | null): boolean {
  if (!userA || !userB) return false;
  if (userA.id === userB.id) return true;
  return (
    Array.isArray(userA.following) &&
    userA.following.includes(userB.id) &&
    Array.isArray(userB.following) &&
    userB.following.includes(userA.id)
  );
}

export function getDeviceId() {
  const key = 'centraltok_device_id';
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const deviceId = `device_${crypto.randomUUID()}`;
  localStorage.setItem(key, deviceId);
  return deviceId;
}
