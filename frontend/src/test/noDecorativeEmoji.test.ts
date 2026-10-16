/**
 * Guard: no decorative emojis in the web UI (components, pages, data catalogs, i18n JSON).
 *
 * Icons come from @mui/icons-material; catalogs store semantic keys drawn by `components/ui/CatalogIcon.tsx`
 * (whose legacy map of old database emojis is written with \u{...} escapes, so it passes this scan).
 *
 * To allow a typographic symbol, add it to ALLOWED_SYMBOLS. To exempt a whole file (only for files that
 * intentionally show content written by users, e.g. an emoji picker for chat messages), add its path relative
 * to frontend/src to ALLOWED_FILES with a comment explaining why.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

/** Typographic symbols that are fine in text (they are not "emoji style" decorations). Editable. */
export const ALLOWED_SYMBOLS: readonly string[] = ['★', '☆', '✔', '✓', '☑', '☐', '↔', '▶', 'ℹ', '©', '®', '™', '←', '→', '↑', '↓', '•', '·'];

/** Files exempt from the scan, relative to frontend/src (forward slashes). Keep empty unless strictly needed. */
export const ALLOWED_FILES: readonly string[] = [];

const SRC = resolve(__dirname, '..');
const EXTENSIONS = /\.(ts|tsx|js|jsx|json)$/;
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'fixtures', '__fixtures__']);
const SKIP_FILE = /\.(test|spec)\.[a-z]+$/;

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const VS16 = '\u{FE0F}';

export interface EmojiHit {
  line: number;
  column: number;
  char: string;
}

/** Pure scanner: every decorative emoji (pictographic char not allowed, or an allowed symbol forced to emoji presentation). */
export function findDecorativeEmoji(text: string, allowed: readonly string[] = ALLOWED_SYMBOLS): EmojiHit[] {
  const ok = new Set(allowed);
  const hits: EmojiHit[] = [];
  text.split(/\r?\n/).forEach((lineText, i) => {
    const chars = Array.from(lineText);
    let col = 1;
    chars.forEach((ch, j) => {
      if (PICTOGRAPHIC.test(ch) && !ok.has(ch)) hits.push({ line: i + 1, column: col, char: ch });
      else if (ok.has(ch) && chars[j + 1] === VS16) hits.push({ line: i + 1, column: col, char: ch + VS16 });
      col += ch.length;
    });
  });
  return hits;
}

function listFiles(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) listFiles(p, out);
    } else if (EXTENSIONS.test(e.name) && !SKIP_FILE.test(e.name)) out.push(p);
  }
  return out;
}

describe('findDecorativeEmoji (pure)', () => {
  it('flags decorative emojis with their position', () => {
    const hits = findDecorativeEmoji("ok\n<span>{'\u{1F3C5}'} Logros</span>");
    expect(hits).toEqual([{ line: 2, column: 9, char: '\u{1F3C5}' }]);
  });

  it('accepts plain text and allowed typographic symbols, but not their emoji presentation', () => {
    expect(findDecorativeEmoji('Calificación ★ 4.5 · © LaCase ™ → siguiente ✔ ℹ')).toEqual([]);
    expect(findDecorativeEmoji('listo ✔\u{FE0F}')).toHaveLength(1);
  });
});

describe('web sin emojis decorativos', () => {
  it('frontend/src (UI, catálogos e i18n) no contiene emojis decorativos', () => {
    const files = listFiles(SRC);
    expect(files.length).toBeGreaterThan(50);
    const problems: string[] = [];
    for (const file of files) {
      const rel = relative(SRC, file).split(sep).join('/');
      if (ALLOWED_FILES.includes(rel)) continue;
      for (const h of findDecorativeEmoji(readFileSync(file, 'utf8'))) problems.push(`${rel}:${h.line}:${h.column} ${h.char}`);
    }
    expect(problems).toEqual([]);
  });
});
