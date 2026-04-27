import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { c, log } from '../utils/log.js';
import { run } from '../utils/run.js';

export interface BuildOptions {
  project?: string;
}

export async function buildCommand(options: BuildOptions): Promise<void> {
  const project = options.project ?? 'tsconfig.json';
  if (!existsSync(resolve(process.cwd(), project))) {
    log.error(`tsconfig not found: ${project}`);
    process.exit(1);
  }

  const tscBin = resolveTscBin();
  if (!tscBin) {
    log.error('typescript not found. install it as a devDependency: npm i -D typescript');
    process.exit(1);
  }

  log.info(`building with ${c.bold(`tsc -p ${project}`)}`);
  const code = await run(process.execPath, [tscBin, '-p', project]);
  if (code === 0) {
    log.success('build complete');
  }
  process.exit(code);
}

function resolveTscBin(): string | undefined {
  const local = resolve(process.cwd(), 'node_modules/typescript/bin/tsc');
  if (existsSync(local)) return local;
  return undefined;
}
