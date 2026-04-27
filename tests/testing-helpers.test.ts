import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineServer, defineTool } from '../src/index.js';
import {
  createTestClient,
  expectToolError,
  getToolSchema,
  snapshotTools,
} from '../src/testing/index.js';

describe('snapshotTools', () => {
  it('returns name, description, inputSchema for each tool', () => {
    const server = defineServer({
      name: 't',
      version: '0',
      tools: [
        defineTool({
          name: 'add',
          description: 'add',
          input: z.object({ a: z.number(), b: z.number() }),
          handler: () => 'x',
        }),
      ],
    });
    const snap = snapshotTools(server);
    expect(snap).toHaveLength(1);
    expect(snap[0]?.name).toBe('add');
    expect(snap[0]?.description).toBe('add');
    expect(snap[0]?.inputSchema).toBeTypeOf('object');
  });
});

describe('getToolSchema', () => {
  it('returns the schema for a single tool', () => {
    const server = defineServer({
      name: 't',
      version: '0',
      tools: [
        defineTool({
          name: 'echo',
          description: 'echo',
          input: z.object({ msg: z.string() }),
          handler: ({ msg }) => msg,
        }),
      ],
    });
    const schema = getToolSchema(server, 'echo') as {
      type: string;
      properties: { msg: { type: string } };
    };
    expect(schema.type).toBe('object');
    expect(schema.properties.msg.type).toBe('string');
  });

  it('throws for an unknown tool', () => {
    const server = defineServer({ name: 't', version: '0', tools: [] });
    expect(() => getToolSchema(server, 'nope')).toThrow(/not registered/);
  });
});

describe('expectToolError', () => {
  it('returns the error text when the call fails', async () => {
    const server = defineServer({
      name: 't',
      version: '0',
      tools: [
        defineTool({
          name: 'boom',
          description: 'boom',
          input: z.object({}),
          handler: () => {
            throw new Error('kaboom');
          },
        }),
      ],
    });
    const client = await createTestClient(server);
    try {
      const text = await expectToolError(client, 'boom');
      expect(text).toContain('kaboom');
    } finally {
      await client.close();
    }
  });

  it('throws when the call unexpectedly succeeds', async () => {
    const server = defineServer({
      name: 't',
      version: '0',
      tools: [
        defineTool({
          name: 'ok',
          description: 'ok',
          input: z.object({}),
          handler: () => 'ok',
        }),
      ],
    });
    const client = await createTestClient(server);
    try {
      await expect(expectToolError(client, 'ok')).rejects.toThrow(/expected/);
    } finally {
      await client.close();
    }
  });
});
