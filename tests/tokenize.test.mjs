import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

import { tokenize } from '../js/tokenize.js';

const data = JSON.parse(readFileSync(new URL('../data/levels.json', import.meta.url), 'utf8'));

const lines = data.levels.flatMap((level) => level.code.split('\n'));

test('tokenizer girdiyi birebir korur', () => {
  for (const line of lines) {
    const rebuilt = tokenize(line).map((token) => token.text).join('');
    assert.equal(rebuilt, line, `bozulan satır: ${JSON.stringify(line)}`);
  }
});

test('anahtar kelime, string ve sayı sınıflandırılır', () => {
  const types = tokenize("const sayi = '5';").map((token) => token.type);
  assert.ok(types.includes('kw'), 'const anahtar kelime olmalı');
  assert.ok(types.includes('str'), 'string ayırt edilmeli');
});

test('yorum satırı tek token olur', () => {
  const tokens = tokenize('// burada hata var');
  assert.equal(tokens.length, 1);
  assert.equal(tokens[0].type, 'comment');
});

test('string içindeki // yorum sayılmaz', () => {
  const tokens = tokenize("const url = 'http://ornek';");
  assert.equal(tokens.some((token) => token.type === 'comment'), false);
  assert.equal(tokens.map((token) => token.text).join(''), "const url = 'http://ornek';");
});

test('boş satır boş dizi döndürür', () => {
  assert.deepEqual(tokenize(''), []);
});
