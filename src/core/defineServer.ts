import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  GetPromptRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { errorToToolResult, normalizeToolResult } from './normalize.js';
import type {
  PromptDefinition,
  ResourceDefinition,
  ServerOptions,
  StartOptions,
  ToolDefinition,
} from './types.js';

export interface DefinedServer {
  /** Underlying MCP SDK server. Escape hatch for advanced use. */
  raw: Server;
  /** Connect a transport and start handling requests. */
  start: (options?: StartOptions) => Promise<void>;
  /** Close the active transport and release resources. */
  stop: () => Promise<void>;
  /** Connect a transport instance directly. Useful for tests. */
  connect: (transport: ConnectableTransport) => Promise<void>;
  readonly tools: ToolDefinition[];
  readonly resources: ResourceDefinition[];
  readonly prompts: PromptDefinition[];
  readonly name: string;
  readonly version: string;
}

interface ConnectableTransport {
  start?: () => Promise<void>;
  close?: () => Promise<void>;
}

/**
 * Build a fully-wired MCP server from declarative tool, resource and prompt
 * definitions. Handles the protocol plumbing — schema generation, input
 * validation, error envelopes — so the surface stays declarative.
 */
export function defineServer(options: ServerOptions): DefinedServer {
  if (!options.name) throw new Error('defineServer: `name` is required.');
  if (!options.version) throw new Error('defineServer: `version` is required.');

  const tools = options.tools ?? [];
  const resources = options.resources ?? [];
  const prompts = options.prompts ?? [];

  assertUniqueNames(tools, 'tool');
  assertUniqueNames(prompts, 'prompt');
  assertUniqueUris(resources);

  const capabilities: Record<string, Record<string, unknown>> = {};
  if (tools.length > 0) capabilities.tools = {};
  if (resources.length > 0) capabilities.resources = {};
  if (prompts.length > 0) capabilities.prompts = {};

  const server = new Server({ name: options.name, version: options.version }, { capabilities });

  if (tools.length > 0) registerTools(server, tools, options.onToolError);
  if (resources.length > 0) registerResources(server, resources);
  if (prompts.length > 0) registerPrompts(server, prompts);

  let activeTransport: ConnectableTransport | undefined;

  return {
    raw: server,
    name: options.name,
    version: options.version,
    tools,
    resources,
    prompts,
    async start(startOptions = {}) {
      const transport = await pickTransport(startOptions);
      activeTransport = transport;
      await server.connect(transport as never);
    },
    async connect(transport) {
      activeTransport = transport;
      await server.connect(transport as never);
    },
    async stop() {
      if (activeTransport?.close) {
        await activeTransport.close();
      }
      await server.close();
      activeTransport = undefined;
    },
  };
}

function registerTools(
  server: Server,
  tools: ToolDefinition[],
  onToolError?: ServerOptions['onToolError'],
): void {
  const byName = new Map(tools.map((t) => [t.name, t] as const));

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: zodToJsonSchema(t.input, {
        target: 'jsonSchema7',
        $refStrategy: 'none',
      }) as Record<string, unknown>,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = byName.get(request.params.name);
    if (!tool) {
      return {
        content: [{ type: 'text' as const, text: `Unknown tool: ${request.params.name}` }],
        isError: true,
      };
    }

    const parsed = tool.input.safeParse(request.params.arguments ?? {});
    if (!parsed.success) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Invalid arguments for "${tool.name}":\n${formatZodError(parsed.error)}`,
          },
        ],
        isError: true,
      };
    }

    try {
      const raw = await tool.handler(parsed.data);
      return normalizeToolResult(raw);
    } catch (err) {
      if (onToolError) {
        return normalizeToolResult(onToolError(err, tool.name));
      }
      return errorToToolResult(err);
    }
  });
}

function registerResources(server: Server, resources: ResourceDefinition[]): void {
  const byUri = new Map(resources.map((r) => [r.uri, r] as const));

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: resources.map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    })),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resource = byUri.get(request.params.uri);
    if (!resource) {
      throw new Error(`Unknown resource: ${request.params.uri}`);
    }
    const result = await resource.read();
    return {
      contents: [
        {
          uri: resource.uri,
          mimeType: result.mimeType ?? resource.mimeType ?? 'text/plain',
          ...(result.text !== undefined ? { text: result.text } : {}),
          ...(result.blob !== undefined ? { blob: result.blob } : {}),
        },
      ],
    };
  });
}

function registerPrompts(server: Server, prompts: PromptDefinition[]): void {
  const byName = new Map(prompts.map((p) => [p.name, p] as const));

  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: prompts.map((p) => ({
      name: p.name,
      description: p.description,
      arguments: p.arguments ? extractArgumentsSchema(p.arguments) : undefined,
    })),
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const prompt = byName.get(request.params.name);
    if (!prompt) {
      throw new Error(`Unknown prompt: ${request.params.name}`);
    }
    const args = prompt.arguments ? prompt.arguments.parse(request.params.arguments ?? {}) : {};
    const result = prompt.build(args);
    return {
      description: prompt.description,
      messages: result.messages,
    };
  });
}

async function pickTransport(options: StartOptions): Promise<ConnectableTransport> {
  const kind = options.transport ?? 'stdio';
  if (kind === 'stdio') {
    return new StdioServerTransport() as unknown as ConnectableTransport;
  }
  if (kind === 'http') {
    throw new Error(
      'http transport is not bundled by default. Install ' +
        '@modelcontextprotocol/sdk and pass a custom transport via .connect().',
    );
  }
  throw new Error(`Unknown transport: ${kind as string}`);
}

function assertUniqueNames(items: { name: string }[], label: string): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.name)) {
      throw new Error(`Duplicate ${label} name: "${item.name}"`);
    }
    seen.add(item.name);
  }
}

function assertUniqueUris(items: { uri: string }[]): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.uri)) {
      throw new Error(`Duplicate resource uri: "${item.uri}"`);
    }
    seen.add(item.uri);
  }
}

function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => `  • ${e.path.join('.') || '(root)'}: ${e.message}`).join('\n');
}

function extractArgumentsSchema(
  schema: z.ZodTypeAny,
): Array<{ name: string; description?: string; required: boolean }> {
  if (!(schema instanceof z.ZodObject)) return [];
  const shape = schema.shape as Record<string, z.ZodTypeAny>;
  return Object.entries(shape).map(([name, value]) => ({
    name,
    description: value.description,
    required: !value.isOptional(),
  }));
}
