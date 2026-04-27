import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { c, log } from '../utils/log.js';
import { run } from '../utils/run.js';

export interface DevOptions {
  entry?: string;
}

export async function devCommand(options: DevOptions): Promise<void> {
  const entry = options.entry ?? findEntry();
  if (!entry) {
    log.error('no entry file found. expected src/index.ts (override with --entry).');
    process.exit(1);
  }

  log.info(`hot-reloading ${c.bold(entry)}`);
  const tsxBin = resolveTsxBin();
  const code = await run(process.execPath, [tsxBin, 'watch', entry]);
  process.exit(code);
}

function findEntry(): string | undefined {
  const candidates = ['src/index.ts', 'src/index.mts', 'src/server.ts', 'index.ts'];
  for (const candidate of candidates) {
    if (existsSync(resolve(process.cwd(), candidate))) return candidate;
  }
  return undefined;
}

function resolveTsxBin(): string {
  // First try a peer install in the consumer project.
  const local = resolve(process.cwd(), 'node_modules/tsx/dist/cli.mjs');
  if (existsSync(local)) return local;
  // Fall back to the copy bundled with mcpkit itself.
  const cwd = process.cwd();
  let dir = cwd;
  for (let i = 0; i < 8; i++) {
    const candidate = resolve(dir, 'node_modules/mcpkit/node_modules/tsx/dist/cli.mjs');
    if (existsSync(candidate)) return candidate;
    const parent = resolve(dir, '..');
    if (parent === dir) break;
    dir = parent;
  }
  // Last resort: assume tsx is on PATH (require.resolve from the kit itself).
  try {
    const resolved = new URL('../../../../tsx/dist/cli.mjs', import.meta.url).pathname;
    if (existsSync(resolved)) return resolved;
  } catch {
    // ignore
  }
  log.error(
    'tsx not found. it should be installed transitively via mcpkit; run `npm install` in your project.',
  );
  process.exit(1);
}
