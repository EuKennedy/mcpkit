import { defineServer, defineTool } from 'mcpkit';
import { z } from 'zod';

const server = defineServer({
  name: '__PROJECT_NAME__',
  version: '0.1.0',
  tools: [
    defineTool({
      name: 'add',
      description: 'Add two numbers and return the sum.',
      input: z.object({
        a: z.number().describe('first addend'),
        b: z.number().describe('second addend'),
      }),
      handler: ({ a, b }) => `${a + b}`,
    }),

    defineTool({
      name: 'reverse',
      description: 'Reverse a string. Useful for sanity-checking the wiring.',
      input: z.object({ text: z.string() }),
      handler: ({ text }) => text.split('').reverse().join(''),
    }),

    defineTool({
      name: 'now',
      description: 'Return the current time as ISO-8601.',
      input: z.object({}),
      handler: () => new Date().toISOString(),
    }),
  ],
});

await server.start({ transport: 'stdio' });
