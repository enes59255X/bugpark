/**
 * Öğretmen raporu: sunucu yok, veritabanı yok.
 * Sonuç, bağlantının hash kısmına sıkıştırılmış bir metne dönüşür;
 * öğretmen bağlantıyı açtığında rapor tarayıcıda çözülür.
 */

const VERSION = 'v1';
const MAX_NAME = 24;

function toBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code) {
  const normalized = code.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function cleanName(name) {
  return String(name || '')
    .replace(/[|;:]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_NAME);
}

const STATUS_CODE = { solved: '1', revealed: '2' };
const CODE_STATUS = { 1: 'solved', 2: 'revealed' };

/**
 * @param {{name?: string, completed: Array<{id: string, outcome: string}>, predictionsCorrect: number,
 *          hintUsedEver: boolean, achievements: string[], mode?: string, date?: string}} report
 */
export function encodeReport(report) {
  const statuses = report.completed
    .filter((item) => item && STATUS_CODE[item.outcome])
    .map((item) => `${item.id}=${STATUS_CODE[item.outcome]}`)
    .join(';');

  const payload = [
    VERSION,
    cleanName(report.name),
    String(report.predictionsCorrect || 0),
    report.hintUsedEver ? '1' : '0',
    (report.achievements || []).join(','),
    report.mode === 'free' ? 'free' : 'guided',
    report.date || new Date().toISOString().slice(0, 10),
    statuses,
  ].join('|');

  return toBase64Url(payload);
}

/**
 * @returns {{name: string, predictionsCorrect: number, hintUsedEver: boolean,
 *            achievements: string[], mode: string, date: string,
 *            completed: Array<{id: string, outcome: string}>} | null}
 */
export function decodeReport(code) {
  if (typeof code !== 'string' || code.length === 0 || code.length > 2000) return null;

  let payload;
  try {
    payload = fromBase64Url(code);
  } catch {
    return null;
  }

  const parts = payload.split('|');
  if (parts.length !== 8 || parts[0] !== VERSION) return null;

  const [, name, correct, hint, achievements, mode, date, statuses] = parts;
  const completed = [];

  if (statuses) {
    for (const entry of statuses.split(';')) {
      const [id, status] = entry.split('=');
      if (!id || !CODE_STATUS[status]) return null;
      completed.push({ id, outcome: CODE_STATUS[status] });
    }
  }

  const predictionsCorrect = Number.parseInt(correct, 10);
  if (!Number.isInteger(predictionsCorrect) || predictionsCorrect < 0) return null;

  return {
    name: cleanName(name),
    predictionsCorrect,
    hintUsedEver: hint === '1',
    achievements: achievements ? achievements.split(',').filter(Boolean) : [],
    mode: mode === 'free' ? 'free' : 'guided',
    date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : '',
    completed,
  };
}

export function reportLink(baseUrl, code) {
  return `${baseUrl}#rapor=${code}`;
}

export function readReportCode(hash) {
  const match = /^#rapor=([A-Za-z0-9_-]+)$/.exec(hash || '');
  return match ? match[1] : null;
}
