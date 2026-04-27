import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { DefinedServer } from '../core/defineServer.js';

export interface TestClientOptions {
  /** Name advertised by the test client. Default: "mcp-kit-test". */
  name?: string;
  /** Version advertised by the test client. Default: "0.0.0". */
  version?: string;
}

export interface TestCallResult {
  /** Concatenated text from all text content blocks. */
  text: string;
  /** Whether the tool call returned isError: true. */
  isError: boolean;
  /** Raw content array as returned by the server. */
  content: Array<{ type: string; [key: string]: unknown }>;
}

export interface TestClient {
  callTool: (name: string, args?: Record<string, unknown>) => Promise<TestCallResult>;
  listTools: () => Promise<Array<{ name: string; description?: string }>>;
  listResources: () => Promise<Array<{ uri: string; name: string }>>;
  readResource: (uri: string) => Promise<{ text?: string; blob?: string; mimeType?: string }>;
  listPrompts: () => Promise<Array<{ name: string; description?: string }>>;
  getPrompt: (
    name: string,
    args?: Record<string, string>,
  ) => Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }>;
  close: () => Promise<void>;
  /** Underlying SDK client. Escape hatch for advanced assertions. */
  raw: Client;
}

/**
 * Spin up an in-process client connected to the given server. Lets you call
 * tools and read resources from a test without a subprocess or stdio.
 *
 * @example
 * const client = await createTestClient(server);
 * const result = await client.callTool('add', { a: 2, b: 3 });
 * expect(result.text).toBe('5');
 * await client.close();
 */
export async function createTestClient(
  server: DefinedServer,
  options: TestClientOptions = {},
): Promise<TestClient> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client(
    { name: options.name ?? 'mcp-kit-test', version: options.version ?? '0.0.0' },
    { capabilities: {} },
  );

  await Promise.all([server.connect(serverTransport as never), client.connect(clientTransport)]);

  return {
    raw: client,
    async callTool(name, args = {}) {
      const result = (await client.callTool({ name, arguments: args })) as {
        content: Array<{ type: string; text?: string; [key: string]: unknown }>;
        isError?: boolean;
      };
      const text = result.content
        .filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('');
      return {
        text,
        isError: result.isError === true,
        content: result.content,
      };
    },
    async listTools() {
      const result = await client.listTools();
      return result.tools.map((t) => ({ name: t.name, description: t.description }));
    },
    async listResources() {
      const result = await client.listResources();
      return result.resources.map((r) => ({ uri: r.uri, name: r.name }));
    },
    async readResource(uri) {
      const result = await client.readResource({ uri });
      const first = result.contents[0] as
        | { text?: string; blob?: string; mimeType?: string }
        | undefined;
      if (!first) return {};
      return {
        text: typeof first.text === 'string' ? first.text : undefined,
        blob: typeof first.blob === 'string' ? first.blob : undefined,
        mimeType: typeof first.mimeType === 'string' ? first.mimeType : undefined,
      };
    },
    async listPrompts() {
      const result = await client.listPrompts();
      return result.prompts.map((p) => ({ name: p.name, description: p.description }));
    },
    async getPrompt(name, args) {
      const result = await client.getPrompt({ name, arguments: args });
      return {
        messages: result.messages as Array<{
          role: string;
          content: { type: string; text: string };
        }>,
      };
    },
    async close() {
      await client.close();
      await server.stop();
    },
  };
}
