/**
 * Guard: no decorative emojis in backend source, catalogs, seeds or user-facing strings.
 *
 * Catalogs store semantic icon keys (e.g. 'grain', 'delivery') that the web/mobile clients draw with
 * their icon libraries. Pure filesystem scan: no database needed.
 *
 * To allow a typographic symbol, add it to ALLOWED_SYMBOLS. To exempt a whole file (only for files that
 * intentionally echo content written by users, e.g. an emoji picker for chat messages), add its path
 * relative to backend/ to ALLOWED_FILES with a comment explaining why.
 */
import fs from 'fs';
import path from 'path';

/** Typographic symbols that are fine in text (they are not "emoji style" decorations). Editable. */
export const ALLOWED_SYMBOLS: readonly string[] = ['★', '☆', '✔', '✓', '☑', '☐', '↔', '▶', 'ℹ', '©', '®', '™', '←', '→', '↑', '↓', '•', '·'];

/** Files exempt from the scan, relative to backend/ (forward slashes). Keep empty unless strictly needed. */
export const ALLOWED_FILES: readonly string[] = [];

const ROOT = path.resolve(__dirname, '..');
const SCAN: Array<{ dir: string; recursive: boolean }> = [
  { dir: 'src', recursive: true },
  { dir: 'prisma', recursive: false }, // seeds (prisma/*.ts)
];
const EXTENSIONS = /\.(ts|tsx|js|jsx|mjs|cjs|json)$/;
const SKIP_DIRS = new Set(['node_modules', '__tests__', 'fixtures', '__fixtures__', 'dist']);
const SKIP_FILE = /\.(test|spec)\.[a-z]+$/;

const PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const VS16 = '\u{FE0F}';

export interface EmojiHit {
  line: number;
  column: number;
  char: string;
}

/** Pure scanner: returns every decorative emoji (pictographic char not allowed, or an allowed symbol forced to emoji presentation). */
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

function listFiles(dir: string, recursive: boolean, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (recursive && !SKIP_DIRS.has(e.name)) listFiles(p, recursive, out);
    } else if (EXTENSIONS.test(e.name) && !SKIP_FILE.test(e.name)) out.push(p);
  }
  return out;
}

describe('findDecorativeEmoji (pure)', () => {
  it('flags decorative emojis with their position', () => {
    const hits = findDecorativeEmoji("ok\nconst icon = '\u{1F4E6}'; // \u{1F389}");
    expect(hits.map((h) => [h.line, h.char])).toEqual([
      [2, '\u{1F4E6}'],
      [2, '\u{1F389}'],
    ]);
  });

  it('accepts plain text and allowed typographic symbols, but not their emoji presentation', () => {
    expect(findDecorativeEmoji('Calificación ★ 4.5 · © LaCase ™ → siguiente ✔ ℹ')).toEqual([]);
    expect(findDecorativeEmoji('listo ✔\u{FE0F}')).toHaveLength(1);
  });
});

describe('backend sin emojis decorativos', () => {
  it('src/ y prisma/*.ts no contienen emojis decorativos', () => {
    const files = SCAN.flatMap((s) => listFiles(path.join(ROOT, s.dir), s.recursive));
    expect(files.length).toBeGreaterThan(10);
    const problems: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      if (ALLOWED_FILES.includes(rel)) continue;
      for (const h of findDecorativeEmoji(fs.readFileSync(file, 'utf8'))) problems.push(`${rel}:${h.line}:${h.column} ${h.char}`);
    }
    expect(problems).toEqual([]);
  });
});
