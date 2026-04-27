import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

/**
 * Recursively copy a directory while replacing placeholder strings inside
 * file contents. Binary-ish files (anything we can't decode as utf-8) are
 * skipped from replacement and copied as-is.
 */
export async function copyTemplate(
  source: string,
  destination: string,
  replacements: Record<string, string>,
): Promise<string[]> {
  await mkdir(destination, { recursive: true });
  const files: string[] = [];

  for await (const file of walk(source)) {
    const rel = relative(source, file);
    const renamed = rel
      .split('/')
      .map((seg) => (seg === '_gitignore' ? '.gitignore' : seg))
      .join('/');
    const target = join(destination, renamed);
    await mkdir(dirname(target), { recursive: true });
    const content = await readFile(file);
    const replaced = applyReplacements(content, replacements);
    await writeFile(target, replaced);
    files.push(renamed);
  }

  return files;
}

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

function applyReplacements(buffer: Buffer, replacements: Record<string, string>): Buffer {
  // Heuristic: skip replacement for buffers that look binary.
  if (looksBinary(buffer)) return buffer;
  let text = buffer.toString('utf8');
  for (const [key, value] of Object.entries(replacements)) {
    text = text.split(key).join(value);
  }
  return Buffer.from(text, 'utf8');
}

function looksBinary(buffer: Buffer): boolean {
  const probe = buffer.subarray(0, Math.min(512, buffer.length));
  for (const byte of probe) {
    if (byte === 0) return true;
  }
  return false;
}

export async function ensureEmptyOrNew(dir: string): Promise<'new' | 'empty' | 'not-empty'> {
  try {
    const info = await stat(dir);
    if (!info.isDirectory()) return 'not-empty';
    const entries = await readdir(dir);
    return entries.length === 0 ? 'empty' : 'not-empty';
  } catch {
    return 'new';
  }
}
