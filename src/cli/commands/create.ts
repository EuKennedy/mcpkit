import { readFile } from 'node:fs/promises';
import { basename, isAbsolute, resolve } from 'node:path';
import prompts from 'prompts';
import { copyTemplate, ensureEmptyOrNew } from '../utils/copy.js';
import { c, log } from '../utils/log.js';
import { resolvePackageRoot, resolveTemplatesDir } from '../utils/paths.js';
import { detectPackageManager, run } from '../utils/run.js';

const TEMPLATES = [
  {
    id: 'stdio-basic',
    title: 'stdio (basic)',
    description: 'Local MCP server over stdio. Most clients want this.',
  },
  {
    id: 'http-streaming',
    title: 'http (streamable)',
    description: 'Network-reachable MCP server over streamable HTTP.',
  },
] as const;

export interface CreateOptions {
  template?: string;
  install?: boolean;
  yes?: boolean;
}

export async function createCommand(
  rawTarget: string | undefined,
  options: CreateOptions,
): Promise<void> {
  const cancelled = () => {
    log.warn('cancelled.');
    process.exit(1);
  };

  let target = rawTarget;
  if (!target) {
    const answer = await prompts(
      {
        type: 'text',
        name: 'target',
        message: 'project name',
        initial: 'my-mcp-server',
        validate: (v: string) => (v.trim().length > 0 ? true : 'required'),
      },
      { onCancel: cancelled },
    );
    target = answer.target as string;
  }

  const targetPath = isAbsolute(target) ? target : resolve(process.cwd(), target);
  const projectName = sanitizeName(basename(targetPath));

  const state = await ensureEmptyOrNew(targetPath);
  if (state === 'not-empty') {
    if (!options.yes) {
      const answer = await prompts(
        {
          type: 'confirm',
          name: 'overwrite',
          message: `${c.yellow(targetPath)} is not empty. continue anyway?`,
          initial: false,
        },
        { onCancel: cancelled },
      );
      if (!answer.overwrite) cancelled();
    }
  }

  let templateId = options.template;
  if (!templateId) {
    const answer = await prompts(
      {
        type: 'select',
        name: 'template',
        message: 'pick a template',
        choices: TEMPLATES.map((t) => ({
          title: t.title,
          description: t.description,
          value: t.id,
        })),
        initial: 0,
      },
      { onCancel: cancelled },
    );
    templateId = answer.template as string;
  }

  if (!TEMPLATES.some((t) => t.id === templateId)) {
    log.error(`unknown template: ${templateId}`);
    log.info(`available: ${TEMPLATES.map((t) => t.id).join(', ')}`);
    process.exit(1);
  }

  let install = options.install;
  if (install === undefined) {
    if (options.yes) {
      install = true;
    } else {
      const answer = await prompts(
        {
          type: 'confirm',
          name: 'install',
          message: 'install dependencies now?',
          initial: true,
        },
        { onCancel: cancelled },
      );
      install = answer.install as boolean;
    }
  }

  const templatesDir = resolveTemplatesDir();
  const sourceDir = `${templatesDir}/${templateId}`;

  const packageRoot = resolvePackageRoot();
  const ourPkgRaw = await readFile(`${packageRoot}/package.json`, 'utf8');
  const ourVersion = (JSON.parse(ourPkgRaw) as { version: string }).version;

  log.blank();
  log.info(`scaffolding ${c.bold(projectName)} into ${c.dim(targetPath)}`);
  await copyTemplate(sourceDir, targetPath, {
    __PROJECT_NAME__: projectName,
    __MCP_KIT_VERSION__: `^${ourVersion}`,
  });
  log.success('files written');

  if (install) {
    const pm = detectPackageManager();
    log.info(`installing dependencies with ${c.bold(pm)}`);
    const code = await run(pm, ['install'], { cwd: targetPath });
    if (code !== 0) {
      log.error('install failed. you can retry manually.');
      process.exit(code);
    }
    log.success('dependencies installed');
  }

  log.blank();
  log.success('done. next steps:');
  log.blank();
  console.log(`  cd ${basename(targetPath)}`);
  if (!install) console.log('  npm install');
  console.log('  npm run dev');
  log.blank();
}

function sanitizeName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || 'mcp-server'
  );
}
