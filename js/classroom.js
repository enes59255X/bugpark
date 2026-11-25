/**
 * Sınıf paneli: sunucu yok. Öğrenci rapor kodlarını (bağlantı ya da çıplak kod)
 * öğretmen yapıştırır; panel kodları çözer, tek tabloda toplar ve özet üretir.
 */
import { decodeReport } from './report.js';

export const MAX_CLASS_SIZE = 120;

const CODE_PATTERN = /[A-Za-z0-9_-]{20,}/g;
const LINK_PATTERN = /#rapor=([A-Za-z0-9_-]+)/g;

/** Metinden rapor kodlarını çıkarır (satır, boşluk, virgül veya tam bağlantı). */
export function extractCodes(text) {
  const source = String(text || '');
  const found = [];

  for (const match of source.matchAll(LINK_PATTERN)) found.push(match[1]);
  if (found.length === 0) {
    for (const match of source.matchAll(CODE_PATTERN)) found.push(match[0]);
  }

  return [...new Set(found)];
}

/**
 * Yeni yapıştırılan metni mevcut raporlarla birleştirir.
 * @param {Array<{code: string, data: object}>} existing
 */
export function addReports(existing, text) {
  const codes = extractCodes(text);
  const known = new Set(existing.map((report) => report.code));
  const added = [];
  let duplicate = 0;
  let invalid = 0;

  for (const code of codes) {
    if (known.has(code)) {
      duplicate += 1;
      continue;
    }

    const data = decodeReport(code);
    if (!data) {
      invalid += 1;
      continue;
    }

    known.add(code);
    added.push({ code, data });
  }

  return {
    reports: [...existing, ...added].slice(0, MAX_CLASS_SIZE),
    added: added.length,
    duplicate,
    invalid,
  };
}

/**
 * Öğrenci listesinden sınıf özeti üretir.
 * @param {Array<object>} levels
 * @param {Array<{code: string, data: object}>} reports
 */
export function summarize(levels, reports) {
  const total = levels.length;
  const perLevel = levels.map((level) => ({
    id: level.id,
    title: level.title,
    concept: level.concept,
    solved: 0,
    revealed: 0,
    missing: 0,
  }));
  const byId = new Map(perLevel.map((row) => [row.id, row]));

  let completedSum = 0;
  let correctSum = 0;

  for (const report of reports) {
    completedSum += report.data.completed.length;
    correctSum += report.data.predictionsCorrect;

    const statuses = new Map(report.data.completed.map((item) => [item.id, item.outcome]));
    for (const row of perLevel) {
      const outcome = statuses.get(row.id);
      if (outcome === 'solved') row.solved += 1;
      else if (outcome === 'revealed') row.revealed += 1;
      else row.missing += 1;
    }
  }

  let hardest = null;
  for (const row of perLevel) {
    if (row.revealed === 0) continue;
    const participants = row.solved + row.revealed;
    const score = row.revealed * 10000 + participants;
    if (!hardest || score > hardest.score) {
      hardest = { id: row.id, title: row.title, revealed: row.revealed, score };
    }
  }

  const count = reports.length;
  return {
    students: count,
    total,
    perLevel,
    hardest: hardest ? { id: hardest.id, title: hardest.title, revealed: hardest.revealed } : null,
    avgCompleted: count === 0 ? null : completedSum / count,
    avgCorrect: count === 0 ? null : correctSum / count,
    rows: reports.map((report) => ({
      code: report.code,
      name: report.data.name || 'İsimsiz',
      date: report.data.date,
      mode: report.data.mode,
      solved: report.data.completed.filter((item) => item.outcome === 'solved').length,
      revealed: report.data.completed.filter((item) => item.outcome === 'revealed').length,
      correct: report.data.predictionsCorrect,
      badges: report.data.achievements.length,
      completed: report.data.completed.length,
    })),
  };
}

function csvField(value) {
  const text = String(value ?? '');
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const MODE_LABEL = { guided: 'Sıralı', free: 'Serbest' };

/** Excel'in Türkçe yerel ayarına uygun, noktalı virgüllü CSV. */
export function toCsv(summary) {
  const lines = [
    ['Ad', 'Tarih', 'Mod', 'Tamamlanan', 'Çözülen', 'Gösterilen', 'Doğru tahmin', 'Rozet'],
  ];

  for (const row of summary.rows) {
    lines.push([
      csvField(row.name),
      row.date || '',
      MODE_LABEL[row.mode] || 'Sıralı',
      `${row.completed}/${summary.total}`,
      row.solved,
      row.revealed,
      row.correct,
      row.badges,
    ]);
  }

  return `\uFEFF${lines.map((cells) => cells.join(';')).join('\r\n')}\r\n`;
}
