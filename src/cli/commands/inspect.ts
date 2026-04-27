import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { c, log } from '../utils/log.js';
import { run } from '../utils/run.js';

export interface InspectOptions {
  entry?: string;
}

/**
 * Launch the official MCP inspector against the local server. Builds first if
 * a dist/ artifact is missing, otherwise runs from source via tsx so the
 * iteration loop stays tight.
 */
export async function inspectCommand(options: InspectOptions): Promise<void> {
  const cwd = process.cwd();
  let cmd: string;
  let cmdArgs: string[];

  if (options.entry) {
    cmd = process.execPath;
    cmdArgs = [resolve(cwd, options.entry)];
  } else if (existsSync(resolve(cwd, 'dist/index.js'))) {
    cmd = process.execPath;
    cmdArgs = [resolve(cwd, 'dist/index.js')];
  } else if (existsSync(resolve(cwd, 'src/index.ts'))) {
    cmd = 'npx';
    cmdArgs = ['-y', 'tsx', resolve(cwd, 'src/index.ts')];
  } else {
    log.error('no entry file found. build first or pass --entry.');
    process.exit(1);
  }

  log.info(`launching inspector against ${c.bold(cmdArgs[cmdArgs.length - 1] ?? '')}`);
  const code = await run('npx', ['-y', '@modelcontextprotocol/inspector', cmd, ...cmdArgs]);
  process.exit(code);
}
