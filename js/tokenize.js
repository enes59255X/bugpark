/**
 * Küçük ve güvenli sözdizimi ayırıcı.
 * DOM'a yazmaz; yalnızca { text, type } listesi üretir.
 * Değişmez (test edilir): token metinleri birleşince girdi metnini birebir verir.
 */

const KEYWORDS =
  'const|let|var|function|return|if|else|for|while|of|in|new|typeof|true|false|null|undefined';

const KEYWORD_RE = new RegExp(`^(?:${KEYWORDS})$`);

const PATTERN = new RegExp(
  [
    String.raw`\/\/[^\n]*`,
    String.raw`'(?:\\.|[^'\\])*'`,
    String.raw`"(?:\\.|[^"\\])*"`,
    '`(?:\\\\.|[^`\\\\])*`',
    String.raw`\b\d+(?:\.\d+)?\b`,
    String.raw`\b(?:` + KEYWORDS + String.raw`)\b`,
    String.raw`[A-Za-z_$][\w$]*(?=\s*\()`,
  ].join('|'),
  'g'
);

function classify(token) {
  if (token.startsWith('//') || token.startsWith('/*')) return 'comment';
  if (token[0] === "'" || token[0] === '"' || token[0] === '`') return 'str';
  if (/^\d/.test(token)) return 'num';
  if (KEYWORD_RE.test(token)) return 'kw';
  return 'name';
}

/**
 * @param {string} line
 * @returns {Array<{text: string, type: 'plain'|'comment'|'str'|'num'|'kw'|'name'}>}
 */
export function tokenize(line) {
  const tokens = [];
  if (typeof line !== 'string' || line.length === 0) return tokens;

  let cursor = 0;
  PATTERN.lastIndex = 0;

  let match;
  while ((match = PATTERN.exec(line)) !== null) {
    if (match[0].length === 0) {
      PATTERN.lastIndex += 1;
      continue;
    }
    if (match.index > cursor) {
      tokens.push({ text: line.slice(cursor, match.index), type: 'plain' });
    }
    tokens.push({ text: match[0], type: classify(match[0]) });
    cursor = match.index + match[0].length;
  }

  if (cursor < line.length) {
    tokens.push({ text: line.slice(cursor), type: 'plain' });
  }
  return tokens;
}
