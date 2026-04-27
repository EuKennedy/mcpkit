import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import pc from 'picocolors';
import { buildCommand } from './commands/build.js';
import { createCommand } from './commands/create.js';
import { devCommand } from './commands/dev.js';
import { inspectCommand } from './commands/inspect.js';
import { resolvePackageRoot } from './utils/paths.js';

function readVersion(): string {
  try {
    const raw = readFileSync(resolve(resolvePackageRoot(), 'package.json'), 'utf8');
    return (JSON.parse(raw) as { version: string }).version;
  } catch {
    return '0.0.0';
  }
}

const program = new Command();

program
  .name('mcpkit')
  .description('Build MCP servers in TypeScript without the boilerplate.')
  .version(readVersion(), '-v, --version', 'print version and exit')
  .showHelpAfterError();

program
  .command('create [target]')
  .description('scaffold a new MCP server from a template')
  .option('-t, --template <id>', 'template id (stdio-basic | http-streaming)')
  .option('--no-install', 'skip dependency install')
  .option('-y, --yes', 'accept all defaults, no prompts')
  .action(async (target, options) => {
    await createCommand(target, options);
  });

program
  .command('dev')
  .description('run the server with hot reload')
  .option('-e, --entry <path>', 'override entry file (default: src/index.ts)')
  .action(async (options) => {
    await devCommand(options);
  });

program
  .command('build')
  .description('compile the server to dist/')
  .option('-p, --project <path>', 'tsconfig path (default: tsconfig.json)')
  .action(async (options) => {
    await buildCommand(options);
  });

program
  .command('inspect')
  .description('launch the official MCP inspector against this server')
  .option('-e, --entry <path>', 'override entry file')
  .action(async (options) => {
    await inspectCommand(options);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(pc.red('✖'), err instanceof Error ? err.message : err);
  process.exit(1);
});
