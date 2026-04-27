import { type SpawnOptions, spawn } from 'node:child_process';

export interface RunOptions extends SpawnOptions {
  /** Forward signals (SIGINT/SIGTERM) from this process to the child. Default: true. */
  forwardSignals?: boolean;
}

export function run(command: string, args: string[], options: RunOptions = {}): Promise<number> {
  return new Promise((resolve, reject) => {
    const { forwardSignals = true, ...spawnOptions } = options;
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: false,
      ...spawnOptions,
    });

    const forward = (signal: NodeJS.Signals) => {
      if (!child.killed) child.kill(signal);
    };

    if (forwardSignals) {
      process.on('SIGINT', forward);
      process.on('SIGTERM', forward);
    }

    child.on('error', (err) => {
      cleanup();
      reject(err);
    });

    child.on('exit', (code) => {
      cleanup();
      resolve(code ?? 0);
    });

    function cleanup() {
      if (forwardSignals) {
        process.off('SIGINT', forward);
        process.off('SIGTERM', forward);
      }
    }
  });
}

export function detectPackageManager(): 'npm' | 'pnpm' | 'yarn' | 'bun' {
  const ua = process.env.npm_config_user_agent ?? '';
  if (ua.startsWith('pnpm')) return 'pnpm';
  if (ua.startsWith('yarn')) return 'yarn';
  if (ua.startsWith('bun')) return 'bun';
  return 'npm';
}
