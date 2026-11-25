/**
 * Komut satırı doğrulaması: node tests/validate-levels.mjs
 * Hata varsa çıkış kodu 1 olur (CI için).
 */
import { readFileSync } from 'node:fs';
import { validateLevels } from '../js/game.js';

const url = new URL('../data/levels.json', import.meta.url);

let data;
try {
  data = JSON.parse(readFileSync(url, 'utf8'));
} catch (error) {
  console.error(`levels.json okunamadı: ${error.message}`);
  process.exit(1);
}

const result = validateLevels(data);

if (!result.ok) {
  console.error(`levels.json geçersiz (${result.errors.length} hata):`);
  for (const error of result.errors) console.error(`  · ${error}`);
  process.exit(1);
}

const total = data.levels.reduce((sum, level) => sum + level.prediction.choices.length + level.fix.choices.length, 0);
console.log(`levels.json geçerli · ${data.levels.length} bölüm · ${total} seçenek`);
