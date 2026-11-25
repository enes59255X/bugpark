import test from 'node:test';
import assert from 'node:assert/strict';

import {
  decodeReport,
  encodeReport,
  readReportCode,
  reportLink,
} from '../js/report.js';

const sample = {
  name: 'Ece',
  completed: [
    { id: 'loop-boundary', outcome: 'solved' },
    { id: 'first-fruit', outcome: 'revealed' },
  ],
  predictionsCorrect: 1,
  hintUsedEver: true,
  achievements: ['ilk-adim'],
  mode: 'guided',
  date: '2026-11-25',
};

test('rapor kodu gidiş dönüşte aynı veriyi verir', () => {
  const code = encodeReport(sample);
  const decoded = decodeReport(code);

  assert.ok(decoded);
  assert.equal(decoded.name, 'Ece');
  assert.equal(decoded.predictionsCorrect, 1);
  assert.equal(decoded.hintUsedEver, true);
  assert.deepEqual(decoded.achievements, ['ilk-adim']);
  assert.equal(decoded.mode, 'guided');
  assert.equal(decoded.date, '2026-11-25');
  assert.deepEqual(decoded.completed, sample.completed);
});

test('Türkçe karakterli ad korunur', () => {
  const decoded = decodeReport(encodeReport({ ...sample, name: 'Şükrü Çağ' }));
  assert.equal(decoded.name, 'Şükrü Çağ');
});

test('Ayırıcı karakterler addan temizlenir', () => {
  const decoded = decodeReport(encodeReport({ ...sample, name: 'a|b;c:d' }));
  assert.equal(decoded.name, 'a b c d');
});

test('Serbest mod ve tarih taşınır', () => {
  const decoded = decodeReport(encodeReport({ ...sample, mode: 'free', date: '2026-01-02' }));
  assert.equal(decoded.mode, 'free');
  assert.equal(decoded.date, '2026-01-02');
});

test('Bozuk kod null döndürür', () => {
  assert.equal(decodeReport(''), null);
  assert.equal(decodeReport('!!!'), null);
  assert.equal(decodeReport('abc'), null);
  assert.equal(decodeReport(null), null);
});

test('Yanlış sürüm reddedilir', () => {
  const payload = Buffer.from('v2|Ece|0|0||guided|2026-11-25|', 'utf8').toString('base64url');
  assert.equal(decodeReport(payload), null);
});

test('Hash içinden kod okunur', () => {
  const code = encodeReport(sample);
  assert.equal(readReportCode(`#rapor=${code}`), code);
  assert.equal(readReportCode('#rapor='), null);
  assert.equal(readReportCode('#baska'), null);
  assert.equal(readReportCode(''), null);
  assert.equal(reportLink('https://ornek.test/', code), `https://ornek.test/#rapor=${code}`);
});
