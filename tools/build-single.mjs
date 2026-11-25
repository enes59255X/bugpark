/**
 * Tek dosyalık sürüm: CSS, JS ve levels.json'u BugPark.html içine gömer.
 * Böylece dosya çift tıklanınca (file://) sunucu olmadan da çalışır.
 *
 * Kullanım: node tools/build-single.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const MODULES = [
  'js/tokenize.js',
  'js/storage.js',
  'js/game.js',
  'js/report.js',
  'js/classroom.js',
  'js/ui.js',
  'js/app.js',
];

const DEFAULT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function stripModuleSyntax(source, file) {
  let out = source;

  out = out.replace(/import\s+[\w*\s{},]+\s+from\s+['"][^'"]+['"]\s*;?/g, '');
  out = out.replace(/import\s+['"][^'"]+['"]\s*;?/g, '');
  out = out.replace(/^export\s*\{[^}]*\}\s*;?/gm, '');
  out = out.replace(/^export\s+default\s+/gm, '');
  out = out.replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|var|class)\b)/gm, '');

  if (/^\s*(?:import|export)\b/m.test(out)) {
    throw new Error(`${file}: çözülemeyen import/export satırı var`);
  }

  return out;
}

function topLevelNames(source) {
  const names = [];
  const patterns = [
    /^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm,
    /^(?:const|let|var)\s+([A-Za-z_$][\w$]*)/gm,
    /^class\s+([A-Za-z_$][\w$]*)/gm,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) names.push(match[1]);
  }

  return names;
}

export function buildSingleFile(root = DEFAULT_ROOT) {
  const read = (file) => readFileSync(path.join(root, file), 'utf8');

  const css = read('styles.css');
  const data = JSON.parse(read('data/levels.json'));
  const favicon = read('assets/favicon.svg');

  const seen = new Map();
  const parts = [];

  for (const file of MODULES) {
    const stripped = stripModuleSyntax(read(file), file);
    for (const name of topLevelNames(stripped)) {
      if (seen.has(name)) {
        throw new Error(`Aynı üst düzey isim iki modülde: "${name}" (${seen.get(name)} ve ${file})`);
      }
      seen.set(name, file);
    }
    parts.push(`/* ---- ${file} ---- */\n${stripped.trim()}`);
  }

  const bundle = `(function () {\n'use strict';\n\n${parts.join('\n\n')}\n\n})();`;
  const payload = JSON.stringify(data).replace(/</g, '\\u003c');
  const faviconUri = `data:image/svg+xml;base64,${Buffer.from(favicon, 'utf8').toString('base64')}`;

  let html = read('index.html');
  html = html.replace(
    /<link rel="stylesheet" href="\.\/styles\.css">/,
    () => `<style>\n${css.trim()}\n</style>`,
  );
  html = html.replace(
    /<link rel="icon" href="\.\/assets\/favicon\.svg" type="image\/svg\+xml">/,
    () => `<link rel="icon" href="${faviconUri}" type="image/svg+xml">`,
  );
  html = html.replace(
    /<script type="module" src="\.\/js\/app\.js"><\/script>/,
    () => `<script>\nwindow.__BUGPARK_LEVELS__ = ${payload};\n\n${bundle}\n</script>`,
  );

  if (html.includes('./styles.css') || html.includes('type="module"')) {
    throw new Error('index.html içindeki stiller veya modül betiği gömülemedi');
  }

  return {
    html,
    stats: {
      modules: MODULES.length,
      levels: data.levels.length,
      bytes: Buffer.byteLength(html, 'utf8'),
    },
  };
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const { html, stats } = buildSingleFile(DEFAULT_ROOT);
  const target = path.join(DEFAULT_ROOT, 'BugPark.html');
  writeFileSync(target, html, 'utf8');
  console.log(`BugPark.html yazıldı · ${stats.modules} modül · ${stats.levels} bölüm · ${Math.round(stats.bytes / 1024)} KB`);
}
