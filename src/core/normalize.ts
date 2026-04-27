import type { ToolContent, ToolResult } from './types.js';

/**
 * Coerce whatever a tool handler returned into the spec-shaped
 * `{ content: ToolContent[], isError?: boolean }` envelope. Strings become
 * text content. Single content objects get wrapped in an array.
 */
export function normalizeToolResult(result: ToolResult): {
  content: ToolContent[];
  isError?: boolean;
} {
  if (typeof result === 'string') {
    return { content: [{ type: 'text', text: result }] };
  }
  if (Array.isArray(result)) {
    return { content: result };
  }
  if ('type' in result) {
    return { content: [result] };
  }
  return { content: result.content, isError: result.isError };
}

export function errorToToolResult(err: unknown): {
  content: ToolContent[];
  isError: true;
} {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}
