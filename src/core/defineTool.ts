import type { z } from 'zod';
import type { ToolDefinition } from './types.js';

/**
 * Define a tool with type-safe input.
 *
 * The handler receives validated, fully-typed input. Throw to signal an error;
 * the runtime wraps it as an `isError: true` tool result for the client.
 *
 * @example
 * defineTool({
 *   name: 'add',
 *   description: 'Add two numbers',
 *   input: z.object({ a: z.number(), b: z.number() }),
 *   handler: ({ a, b }) => `${a + b}`,
 * });
 */
export function defineTool<TInput extends z.ZodTypeAny>(
  definition: ToolDefinition<TInput>,
): ToolDefinition<TInput> {
  if (!definition.name || typeof definition.name !== 'string') {
    throw new Error('defineTool: `name` is required and must be a string.');
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(definition.name)) {
    throw new Error(
      `defineTool: \`name\` "${definition.name}" must match [a-zA-Z0-9_-]+ (no spaces or dots).`,
    );
  }
  if (!definition.description) {
    throw new Error(`defineTool: tool "${definition.name}" needs a description.`);
  }
  if (typeof definition.handler !== 'function') {
    throw new Error(`defineTool: tool "${definition.name}" needs a handler function.`);
  }
  return definition;
}
