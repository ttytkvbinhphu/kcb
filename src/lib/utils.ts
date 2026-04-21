import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBustedPhotoURL(url?: string, token?: string) {
  if (!url) return '';
  if (!token) return url;
  // Only bust if it's a known avatar service or we want to be aggressive
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${token}`;
}
