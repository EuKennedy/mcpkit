import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineServer, defineTool } from '../src/index.js';
import { createTestClient } from '../src/testing/index.js';

describe('smoke', () => {
  it('routes a tool call end-to-end', async () => {
    const server = defineServer({
      name: 'smoke',
      version: '0.0.0',
      tools: [
        defineTool({
          name: 'echo',
          description: 'echo input',
          input: z.object({ msg: z.string() }),
          handler: ({ msg }) => msg,
        }),
      ],
    });

    const client = await createTestClient(server);
    try {
      const tools = await client.listTools();
      expect(tools.map((t) => t.name)).toEqual(['echo']);

      const result = await client.callTool('echo', { msg: 'hello' });
      expect(result.text).toBe('hello');
      expect(result.isError).toBe(false);
    } finally {
      await client.close();
    }
  });
});
