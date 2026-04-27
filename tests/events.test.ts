import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { type ServerEvent, defineServer, defineTool, formatEvent } from '../src/index.js';
import { createTestClient } from '../src/testing/index.js';

describe('lifecycle events', () => {
  it('emits start + end around a successful tool call', async () => {
    const events: ServerEvent[] = [];
    const server = defineServer({
      name: 't',
      version: '0',
      onEvent: (e) => events.push(e),
      tools: [
        defineTool({
          name: 'noop',
          description: 'noop',
          input: z.object({}),
          handler: () => 'ok',
        }),
      ],
    });
    const client = await createTestClient(server);
    try {
      await client.callTool('noop', {});
    } finally {
      await client.close();
    }

    expect(events.map((e) => e.type)).toEqual(['tool.start', 'tool.end']);
    const end = events[1];
    if (end?.type !== 'tool.end') throw new Error('expected tool.end');
    expect(end.tool).toBe('noop');
    expect(end.isError).toBe(false);
    expect(end.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof end.requestId).toBe('string');
  });

  it('emits tool.error when the handler throws', async () => {
    const events: ServerEvent[] = [];
    const server = defineServer({
      name: 't',
      version: '0',
      onEvent: (e) => events.push(e),
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
      await client.callTool('boom', {});
    } finally {
      await client.close();
    }
    expect(events.map((e) => e.type)).toEqual(['tool.start', 'tool.error']);
    const err = events[1];
    if (err?.type !== 'tool.error') throw new Error('expected tool.error');
    expect(err.error.message).toBe('kaboom');
  });

  it('does not crash when the listener throws', async () => {
    const server = defineServer({
      name: 't',
      version: '0',
      onEvent: () => {
        throw new Error('listener exploded');
      },
      tools: [
        defineTool({
          name: 'noop',
          description: 'noop',
          input: z.object({}),
          handler: () => 'ok',
        }),
      ],
    });
    const client = await createTestClient(server);
    try {
      const result = await client.callTool('noop', {});
      expect(result.text).toBe('ok');
    } finally {
      await client.close();
    }
  });
});

describe('formatEvent', () => {
  it('formats tool.start', () => {
    expect(formatEvent({ type: 'tool.start', tool: 'a', input: {}, requestId: 'r' })).toBe(
      '→ a() [r]',
    );
  });
  it('formats successful tool.end', () => {
    expect(
      formatEvent({
        type: 'tool.end',
        tool: 'a',
        requestId: 'r',
        durationMs: 12,
        isError: false,
      }),
    ).toBe('✔ a() 12ms [r]');
  });
  it('formats tool.error', () => {
    expect(
      formatEvent({
        type: 'tool.error',
        tool: 'a',
        requestId: 'r',
        durationMs: 5,
        error: new Error('x'),
      }),
    ).toBe('✖ a() 5ms [r] — x');
  });
});
