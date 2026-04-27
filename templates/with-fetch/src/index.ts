import { defineServer, defineTool } from 'mcp-kit';
import { z } from 'zod';

const DEFAULT_TIMEOUT_MS = 10_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const server = defineServer({
  name: '__PROJECT_NAME__',
  version: '0.1.0',
  tools: [
    defineTool({
      name: 'http_get',
      description:
        'Fetch a URL with GET and return its body. Truncates after 100KB.',
      input: z.object({
        url: z.string().url(),
        headers: z.record(z.string()).optional(),
        timeoutMs: z.number().int().positive().max(60_000).optional(),
      }),
      handler: async ({ url, headers, timeoutMs }) => {
        const response = await fetchWithTimeout(url, { headers, timeoutMs });
        const text = await response.text();
        const truncated =
          text.length > 100_000 ? `${text.slice(0, 100_000)}\n…[truncated]` : text;
        return [
          {
            type: 'text' as const,
            text: `HTTP ${response.status} ${response.statusText}\n${truncated}`,
          },
        ];
      },
    }),

    defineTool({
      name: 'http_get_json',
      description: 'Fetch a URL and parse the body as JSON.',
      input: z.object({
        url: z.string().url(),
        timeoutMs: z.number().int().positive().max(60_000).optional(),
      }),
      handler: async ({ url, timeoutMs }) => {
        const response = await fetchWithTimeout(url, { timeoutMs });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }
        const json = (await response.json()) as unknown;
        return JSON.stringify(json, null, 2);
      },
    }),

    defineTool({
      name: 'public_ip',
      description: 'Return the public IP address of this server.',
      input: z.object({}),
      handler: async () => {
        const response = await fetchWithTimeout('https://api.ipify.org?format=json');
        const json = (await response.json()) as { ip: string };
        return json.ip;
      },
    }),
  ],
});

await server.start({ transport: 'stdio' });
