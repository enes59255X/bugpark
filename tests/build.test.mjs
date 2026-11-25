import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { buildSingleFile } from '../tools/build-single.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const levels = JSON.parse(readFileSync(path.join(root, 'data/levels.json'), 'utf8'));

test('tek dosya: CSS, JS ve görevler gömülür', () => {
  const { html, stats } = buildSingleFile(root);

  assert.equal(html.includes('./styles.css'), false);
  assert.equal(html.includes('type="module"'), false);
  assert.equal(html.includes('src="./js/app.js"'), false);
  assert.equal(html.includes('window.__BUGPARK_LEVELS__ = {'), true);
  assert.equal(html.includes(`"order":${levels.levels.length}`), true);
  assert.equal(stats.levels, levels.levels.length);
  assert.equal(stats.modules, 7);
});

test('tek dosya: import/export kalıntısı yok, tek script var', () => {
  const { html } = buildSingleFile(root);
  const body = html.slice(html.indexOf('<script>'));

  assert.equal(/^\s*(?:import|export)\b/m.test(body), false);
  assert.equal((html.match(/<script>/g) || []).length, 1);
  assert.equal(html.includes('data:image/svg+xml;base64,'), true);
});

test('tek dosya: geçerli HTML kabuğu', () => {
  const { html } = buildSingleFile(root);
  assert.equal(html.trimEnd().endsWith('</html>'), true);
  assert.equal(html.includes('<html lang="tr"'), true);
  assert.equal((html.match(/<\/html>/g) || []).length, 1);
  assert.equal(html.includes('</style>'), true);
});
