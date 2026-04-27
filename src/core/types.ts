import type { z } from 'zod';

/**
 * Anything a tool handler can return. Strings get wrapped as text content
 * automatically, so the common case stays one-liner.
 */
export type ToolResult =
  | string
  | { content: ToolContent[]; isError?: boolean }
  | ToolContent
  | ToolContent[];

export type ToolContent =
  | { type: 'text'; text: string }
  | { type: 'image'; data: string; mimeType: string }
  | { type: 'resource'; resource: { uri: string; mimeType?: string; text?: string } };

export interface ToolDefinition<TInput extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  input: TInput;
  handler: (input: z.infer<TInput>) => ToolResult | Promise<ToolResult>;
}

export interface ResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  read: () => Promise<{ text?: string; blob?: string; mimeType?: string }>;
}

export interface PromptDefinition<TArgs extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  arguments?: TArgs;
  build: (args: z.infer<TArgs>) => {
    messages: Array<{
      role: 'user' | 'assistant';
      content: { type: 'text'; text: string };
    }>;
  };
}

export interface ServerOptions {
  name: string;
  version: string;
  description?: string;
  tools?: ToolDefinition[];
  resources?: ResourceDefinition[];
  prompts?: PromptDefinition[];
  /** Called when a tool throws. Defaults to returning the error as text content with isError=true. */
  onToolError?: (err: unknown, toolName: string) => ToolResult;
}

export type TransportKind = 'stdio' | 'http';

export interface StartOptions {
  /** Transport to use. Default: 'stdio'. */
  transport?: TransportKind;
  /** Port for http transport. Default: 3333. */
  port?: number;
  /** Host for http transport. Default: '127.0.0.1'. */
  host?: string;
}
