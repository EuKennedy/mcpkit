import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { defineServer, defineTool } from 'mcp-kit';
import { z } from 'zod';

const mcp = defineServer({
  name: '__PROJECT_NAME__',
  version: '0.1.0',
  tools: [
    defineTool({
      name: 'ping',
      description: 'Return a pong with a server-side timestamp.',
      input: z.object({}),
      handler: () => `pong @ ${new Date().toISOString()}`,
    }),

    defineTool({
      name: 'random_uuid',
      description: 'Generate a v4 UUID.',
      input: z.object({}),
      handler: () => randomUUID(),
    }),
  ],
});

const transport = new StreamableHTTPServerTransport({
  sessionIdGenerator: () => randomUUID(),
});

await mcp.connect(transport as never);

const port = Number(process.env.PORT ?? 3333);
const host = process.env.HOST ?? '127.0.0.1';

const httpServer = createServer((req, res) => {
  void transport.handleRequest(req, res);
});

httpServer.listen(port, host, () => {
  console.error(`mcp http server listening on http://${host}:${port}/mcp`);
});

process.on('SIGINT', async () => {
  await mcp.stop();
  httpServer.close();
  process.exit(0);
});
