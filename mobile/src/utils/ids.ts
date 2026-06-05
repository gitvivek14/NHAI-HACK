export function makeId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${random}`;
}

export function isoNow() {
  return new Date().toISOString();
}

export function formatTime(value?: string) {
  if (!value) {
    return 'Never';
  }

  return new Date(value).toLocaleString();
}
