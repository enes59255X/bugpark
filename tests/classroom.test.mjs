import test from 'node:test';
import assert from 'node:assert/strict';

import { addReports, extractCodes, summarize, toCsv } from '../js/classroom.js';
import { encodeReport } from '../js/report.js';

const levels = [
  { id: 'a', title: 'A', concept: 'x' },
  { id: 'b', title: 'B', concept: 'y' },
  { id: 'c', title: 'C', concept: 'z' },
];

const code = (name, completed, extra = {}) => encodeReport({
  name,
  completed,
  predictionsCorrect: extra.correct ?? 1,
  hintUsedEver: false,
  achievements: extra.achievements ?? ['ilk-adim'],
  mode: extra.mode ?? 'guided',
  date: '2026-11-25',
});

test('extractCodes bağlantıdan kodu ayıklar', () => {
  const first = code('Ece', [{ id: 'a', outcome: 'solved' }]);
  const text = `Merhaba, raporun: https://ornek.test/bugpark/#rapor=${first}`;
  assert.deepEqual(extractCodes(text), [first]);
});

test('extractCodes birden çok kodu ve tekrarları yönetir', () => {
  const one = code('Ece', [{ id: 'a', outcome: 'solved' }]);
  const two = code('Ali', [{ id: 'a', outcome: 'revealed' }]);
  const text = `${one}\n${two}\n${one}`;
  assert.deepEqual(extractCodes(text), [one, two]);
});

test('extractCodes bağlantı ve çıplak kodu aynı metinde bulur', () => {
  const linked = code('Ece', [{ id: 'a', outcome: 'solved' }]);
  const bare = code('Ali', [{ id: 'b', outcome: 'solved' }]);
  const text = `https://ornek.test/#rapor=${linked}\n${bare}`;
  assert.deepEqual(extractCodes(text), [linked, bare]);
});

test('extractCodes geçersiz metinde boş dizi verir', () => {
  assert.deepEqual(extractCodes(''), []);
  assert.deepEqual(extractCodes('kısa'), []);
  assert.deepEqual(extractCodes(null), []);
});

test('addReports geçerli kodu ekler, geçersizi sayar', () => {
  const one = code('Ece', [{ id: 'a', outcome: 'solved' }]);
  const result = addReports([], `${one}\nbozukkodbozukkodbozuk`);

  assert.equal(result.added, 1);
  assert.equal(result.invalid >= 1, true);
  assert.equal(result.reports.length, 1);
  assert.equal(result.reports[0].data.name, 'Ece');
});

test('addReports aynı kodu ikinci kez eklemez', () => {
  const one = code('Ece', [{ id: 'a', outcome: 'solved' }]);
  const first = addReports([], one);
  const second = addReports(first.reports, one);

  assert.equal(second.added, 0);
  assert.equal(second.duplicate, 1);
  assert.equal(second.reports.length, 1);
});

test('summarize öğrenci ve görev bazında sayar', () => {
  const reports = [
    { code: 'x1', data: { name: 'Ece', date: '2026-11-25', mode: 'guided', predictionsCorrect: 2, achievements: ['a'], completed: [{ id: 'a', outcome: 'solved' }, { id: 'b', outcome: 'revealed' }] } },
    { code: 'x2', data: { name: 'Ali', date: '2026-11-24', mode: 'free', predictionsCorrect: 3, achievements: ['a', 'b'], completed: [{ id: 'a', outcome: 'solved' }] } },
  ];
  const summary = summarize(levels, reports);

  assert.equal(summary.students, 2);
  assert.deepEqual(summary.perLevel.map((row) => [row.id, row.solved, row.revealed, row.missing]), [
    ['a', 2, 0, 0],
    ['b', 0, 1, 1],
    ['c', 0, 0, 2],
  ]);
  assert.equal(summary.hardest.title, 'B');
  assert.equal(summary.avgCompleted, 1.5);
  assert.equal(summary.avgCorrect, 2.5);
  assert.equal(summary.rows[1].mode, 'free');
});

test('summarize boş sınıfta güvenli', () => {
  const summary = summarize(levels, []);
  assert.equal(summary.students, 0);
  assert.equal(summary.hardest, null);
  assert.equal(summary.avgCompleted, null);
  assert.equal(summary.rows.length, 0);
});

test('toCsv başlık, satır ve kaçış üretir', () => {
  const summary = summarize(levels, [
    { code: 'x1', data: { name: 'Ece; "Y."', date: '2026-11-25', mode: 'guided', predictionsCorrect: 2, achievements: ['a'], completed: [{ id: 'a', outcome: 'solved' }] } },
  ]);
  const csv = toCsv(summary);

  assert.equal(csv.startsWith('\uFEFFAd;Tarih;Mod;'), true);
  assert.equal(csv.includes('"Ece; ""Y."""'), true);
  assert.equal(csv.includes('2026-11-25;Sıralı;1/3;1;0;2;1'), true);
  assert.equal(csv.endsWith('\r\n'), true);
});
