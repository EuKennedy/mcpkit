import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  definePrompt,
  defineResource,
  defineServer,
  defineTool,
} from '../src/index.js';
import { createTestClient } from '../src/testing/index.js';

describe('defineTool', () => {
  it('rejects empty names', () => {
    expect(() =>
      defineTool({
        name: '',
        description: 'x',
        input: z.object({}),
        handler: () => 'x',
      }),
    ).toThrow(/name/);
  });

  it('rejects names with disallowed characters', () => {
    expect(() =>
      defineTool({
        name: 'bad name',
        description: 'x',
        input: z.object({}),
        handler: () => 'x',
      }),
    ).toThrow(/match/);
  });

  it('requires a description', () => {
    expect(() =>
      defineTool({
        name: 'ok',
        description: '',
        input: z.object({}),
        handler: () => 'x',
      }),
    ).toThrow(/description/);
  });
});

describe('defineServer / tools', () => {
  it('detects duplicate tool names', () => {
    expect(() =>
      defineServer({
        name: 'dup',
        version: '0.0.0',
        tools: [
          defineTool({
            name: 'a',
            description: 'a',
            input: z.object({}),
            handler: () => 'x',
          }),
          defineTool({
            name: 'a',
            description: 'a',
            input: z.object({}),
            handler: () => 'x',
          }),
        ],
      }),
    ).toThrow(/duplicate/i);
  });

  it('routes a tool call and returns text', async () => {
    const server = defineServer({
      name: 't',
      version: '0',
      tools: [
        defineTool({
          name: 'add',
          description: 'add',
          input: z.object({ a: z.number(), b: z.number() }),
          handler: ({ a, b }) => `${a + b}`,
        }),
      ],
    });
    const client = await createTestClient(server);
    try {
      const result = await client.callTool('add', { a: 2, b: 3 });
      expect(result.text).toBe('5');
      expect(result.isError).toBe(false);
    } finally {
      await client.close();
    }
  });

  it('returns isError on invalid input', async () => {
    const server = defineServer({
      name: 't',
      version: '0',
      tools: [
        defineTool({
          name: 'add',
          description: 'add',
          input: z.object({ a: z.number(), b: z.number() }),
          handler: ({ a, b }) => `${a + b}`,
        }),
      ],
    });
    const client = await createTestClient(server);
    try {
      const result = await client.callTool('add', { a: 'not a number', b: 1 });
      expect(result.isError).toBe(true);
      expect(result.text).toMatch(/invalid/i);
    } finally {
      await client.close();
    }
  });

  it('catches handler exceptions and reports as isError', async () => {
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
      const result = await client.callTool('boom', {});
      expect(result.isError).toBe(true);
      expect(result.text).toContain('kaboom');
    } finally {
      await client.close();
    }
  });

  it('lists tools with their descriptions', async () => {
    const server = defineServer({
      name: 't',
      version: '0',
      tools: [
        defineTool({
          name: 'one',
          description: 'first',
          input: z.object({}),
          handler: () => 'a',
        }),
        defineTool({
          name: 'two',
          description: 'second',
          input: z.object({}),
          handler: () => 'b',
        }),
      ],
    });
    const client = await createTestClient(server);
    try {
      const tools = await client.listTools();
      expect(tools).toEqual([
        { name: 'one', description: 'first' },
        { name: 'two', description: 'second' },
      ]);
    } finally {
      await client.close();
    }
  });

  it('honors an onToolError override', async () => {
    const server = defineServer({
      name: 't',
      version: '0',
      onToolError: (err, name) => `${name}: handled "${(err as Error).message}"`,
      tools: [
        defineTool({
          name: 'boom',
          description: 'boom',
          input: z.object({}),
          handler: () => {
            throw new Error('x');
          },
        }),
      ],
    });
    const client = await createTestClient(server);
    try {
      const result = await client.callTool('boom', {});
      expect(result.text).toBe('boom: handled "x"');
    } finally {
      await client.close();
    }
  });
});

describe('resources', () => {
  it('lists and reads a resource', async () => {
    const server = defineServer({
      name: 't',
      version: '0',
      resources: [
        defineResource({
          uri: 'mem://hello',
          name: 'hello',
          mimeType: 'text/plain',
          read: async () => ({ text: 'hi there' }),
        }),
      ],
    });
    const client = await createTestClient(server);
    try {
      const list = await client.listResources();
      expect(list).toEqual([{ uri: 'mem://hello', name: 'hello' }]);
      const read = await client.readResource('mem://hello');
      expect(read.text).toBe('hi there');
    } finally {
      await client.close();
    }
  });
});

describe('prompts', () => {
  it('lists and renders a prompt', async () => {
    const server = defineServer({
      name: 't',
      version: '0',
      prompts: [
        definePrompt({
          name: 'greet',
          description: 'say hi',
          arguments: z.object({ name: z.string() }),
          build: ({ name }) => ({
            messages: [
              {
                role: 'user',
                content: { type: 'text', text: `say hi to ${name}` },
              },
            ],
          }),
        }),
      ],
    });
    const client = await createTestClient(server);
    try {
      const list = await client.listPrompts();
      expect(list).toEqual([{ name: 'greet', description: 'say hi' }]);
      const result = await client.getPrompt('greet', { name: 'Kennedy' });
      expect(result.messages[0]?.content.text).toBe('say hi to Kennedy');
    } finally {
      await client.close();
    }
  });
});
