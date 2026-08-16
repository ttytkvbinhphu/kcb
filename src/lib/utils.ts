import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getBustedPhotoURL(url?: string, token?: string) {
  if (!url) return null;
  if (!token) return url;
  // Only bust if it's a known avatar service or we want to be aggressive
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${token}`;
}

export function formatDateSafe(
  val: any,
  options?: Intl.DateTimeFormatOptions,
  fallback = ''
): string {
  if (!val) return fallback;
  let date: Date | null = null;
  if (val instanceof Date) {
    date = val;
  } else if (typeof val === 'string' || typeof val === 'number') {
    date = new Date(val);
  } else if (typeof val === 'object' && val !== null) {
    if (typeof val.toDate === 'function') {
      try { date = val.toDate(); } catch {}
    } else if (typeof val.seconds === 'number') {
      date = new Date(val.seconds * 1000);
    }
  }
  if (date && !isNaN(date.getTime())) {
    try {
      return new Intl.DateTimeFormat('vi-VN', options || {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return date.toLocaleDateString('vi-VN');
    }
  }
  return typeof val === 'string' ? val : fallback;
}

export function sanitizeFirestoreData<T = any>(data: T): T {
  if (data === null || data === undefined) return data;

  if (typeof data === 'object') {
    const obj = data as any;
    // Check for FieldValue sentinel objects (e.g. serverTimestamp, increment, arrayUnion, deleteField)
    if (
      '_methodName' in obj ||
      'Fc' in obj ||
      'methodName' in obj ||
      (obj.constructor && typeof obj.constructor.name === 'string' && obj.constructor.name.includes('FieldValue')) ||
      (obj._delegate?.constructor && typeof obj._delegate.constructor.name === 'string' && obj._delegate.constructor.name.includes('FieldValue'))
    ) {
      return undefined as any;
    }
    if (typeof obj.toDate === 'function') {
      try {
        return obj.toDate().toISOString() as any;
      } catch {
        return new Date().toISOString() as any;
      }
    }
    if (typeof obj.seconds === 'number') {
      return new Date(obj.seconds * 1000).toISOString() as any;
    }
    if (Array.isArray(data)) {
      return data
        .map((item) => sanitizeFirestoreData(item))
        .filter((item) => item !== undefined) as any;
    }
    if (Object.prototype.toString.call(data) === '[object Object]') {
      const result: Record<string, any> = {};
      for (const key of Object.keys(obj)) {
        const cleaned = sanitizeFirestoreData(obj[key]);
        if (cleaned !== undefined) {
          result[key] = cleaned;
        }
      }
      return result as any;
    }
  }

  return data;
}
