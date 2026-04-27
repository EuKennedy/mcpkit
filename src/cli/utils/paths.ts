import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Resolve the templates directory from any code location inside the package.
 * Works when invoked via the bin shim, via node directly, or from tests.
 */
export function resolveTemplatesDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  // After build: dist/cli.js -> ../templates
  // In dev (tsx): src/cli/utils/paths.ts -> ../../../templates
  const candidates = [
    resolve(here, '../templates'),
    resolve(here, '../../templates'),
    resolve(here, '../../../templates'),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  throw new Error('Could not locate the templates directory inside mcp-kit.');
}

export function resolvePackageRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [resolve(here, '..'), resolve(here, '../..'), resolve(here, '../../..')];
  for (const candidate of candidates) {
    if (existsSync(resolve(candidate, 'package.json'))) return candidate;
  }
  throw new Error('Could not locate the mcp-kit package root.');
}
