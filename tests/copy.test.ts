import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { copyTemplate } from '../src/cli/utils/copy.js';

describe('copyTemplate', () => {
  let scratch: string;

  beforeEach(async () => {
    scratch = await mkdtemp(join(tmpdir(), 'mcp-kit-test-'));
  });

  afterEach(async () => {
    // best-effort, don't fail on teardown
    try {
      const { rm } = await import('node:fs/promises');
      await rm(scratch, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('replaces placeholders inside text files', async () => {
    const sourceDir = join(scratch, 'src');
    const destDir = join(scratch, 'out');

    const { writeFile, mkdir } = await import('node:fs/promises');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(
      join(sourceDir, 'package.json'),
      '{"name":"__PROJECT_NAME__","version":"__VER__"}',
    );

    await copyTemplate(sourceDir, destDir, {
      __PROJECT_NAME__: 'my-thing',
      __VER__: '1.2.3',
    });

    const result = await readFile(join(destDir, 'package.json'), 'utf8');
    expect(result).toBe('{"name":"my-thing","version":"1.2.3"}');
  });
});
