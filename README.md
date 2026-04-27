# mcpkit

[![ci](https://github.com/EuKennedy/mcpkit/actions/workflows/ci.yml/badge.svg)](https://github.com/EuKennedy/mcpkit/actions/workflows/ci.yml)
[![release](https://img.shields.io/github/v/release/EuKennedy/mcpkit?label=release&color=blue)](https://github.com/EuKennedy/mcpkit/releases)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D18.17-brightgreen.svg)](package.json)

**The TypeScript toolkit for building MCP servers without the boilerplate.**

Define a tool with a Zod schema and a handler. Get a working
[Model Context Protocol](https://modelcontextprotocol.io) server back —
schema generation, input validation, error envelopes, transport wiring,
all done.

```ts
import { defineServer, defineTool } from 'mcpkit';
import { z } from 'zod';

const server = defineServer({
  name: 'demo',
  version: '0.1.0',
  tools: [
    defineTool({
      name: 'add',
      description: 'Add two numbers.',
      input: z.object({ a: z.number(), b: z.number() }),
      handler: ({ a, b }) => `${a + b}`,
    }),
  ],
});

await server.start();
```

That's a real, functioning MCP server. Run it with `mcpkit dev` and point any
MCP-aware client at it.

---

## why this exists

Writing an MCP server with the official SDK is fine, but you end up doing the
same plumbing every time:

- declaring the tool list in one place
- declaring a separate JSON Schema for each tool
- writing a switch over tool names in the call handler
- coercing handler returns into the protocol's content envelope
- wiring up a transport
- catching errors and converting them into the right `isError` shape

`mcpkit` collapses all of that into `defineTool` + `defineServer`. The schema
is generated from your Zod type, validation runs before your handler, errors
turn into proper protocol responses, and a string return becomes a text
content block. You stay in the layer that actually matters — what the tool
does — and skip the layer that doesn't.

## with vs without

Same tool, written against the bare SDK and against `mcpkit`:

<table>
<tr>
<th>bare sdk</th>
<th>mcpkit</th>
</tr>
<tr>
<td>

```ts
const server = new Server(
  { name: 'demo', version: '0.1.0' },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(
  ListToolsRequestSchema,
  async () => ({
    tools: [
      {
        name: 'add',
        description: 'Add two numbers.',
        inputSchema: {
          type: 'object',
          properties: {
            a: { type: 'number' },
            b: { type: 'number' },
          },
          required: ['a', 'b'],
        },
      },
    ],
  }),
);

server.setRequestHandler(
  CallToolRequestSchema,
  async (req) => {
    if (req.params.name === 'add') {
      const { a, b } = req.params.arguments as {
        a: number; b: number;
      };
      return {
        content: [{ type: 'text', text: `${a + b}` }],
      };
    }
    throw new Error('unknown tool');
  },
);

await server.connect(new StdioServerTransport());
```

</td>
<td>

```ts
const server = defineServer({
  name: 'demo',
  version: '0.1.0',
  tools: [
    defineTool({
      name: 'add',
      description: 'Add two numbers.',
      input: z.object({
        a: z.number(),
        b: z.number(),
      }),
      handler: ({ a, b }) => `${a + b}`,
    }),
  ],
});

await server.start();
```

</td>
</tr>
</table>

The right column has the same wire-level behavior, plus input validation,
plus typed handler arguments, plus an `isError` envelope on uncaught throws.

## install

```bash
npm install mcpkit zod
```

Or scaffold a fresh project (recommended for a first server):

```bash
npx mcpkit create my-server
cd my-server
npm run dev
```

You'll get a small project with a working stdio server, three example tools,
and a `tsconfig.json` set up for strict mode. Replace the example tools with
yours and ship.

## the cli

```
mcpkit create [target]   scaffold a new server from a template
mcpkit dev               run with hot reload (uses tsx under the hood)
mcpkit build             compile to dist/
mcpkit inspect           launch the official inspector against your server
```

`create` ships with four templates today:

| template          | what you get                                                              |
| ----------------- | ------------------------------------------------------------------------- |
| `stdio-basic`     | local MCP server over stdio. most clients want this.                      |
| `http-streaming`  | network-reachable server over the streamable HTTP transport.              |
| `with-fetch`      | stdio server with HTTP-fetching tools (timeouts wired in).                |
| `with-sqlite`     | stdio server with a SQLite-backed CRUD example (better-sqlite3, WAL).     |

## the api

### `defineTool`

```ts
defineTool({
  name: string,            // [a-zA-Z0-9_-]+
  description: string,     // shown to the client / LLM
  input: z.ZodType,        // Zod schema; converted to JSON Schema for you
  handler: (input) => string | ToolContent | ToolContent[] | { content, isError? }
})
```

The handler input is fully typed via `z.infer`. Returning a string wraps it
as a single text content block — that's the common case. Throwing inside a
handler turns into an `isError: true` response automatically; if you want to
shape the error message, pass an `onToolError` handler to `defineServer`.

### `defineServer`

```ts
defineServer({
  name: string,
  version: string,
  description?: string,
  tools?: ToolDefinition[],
  resources?: ResourceDefinition[],
  prompts?: PromptDefinition[],
  onToolError?: (err, toolName) => ToolResult,
  onEvent?: (event: ServerEvent) => void,
})
```

Returns a `DefinedServer` with:

- `.start({ transport: 'stdio' })` — connect a transport and serve.
- `.connect(transport)` — connect a transport instance you constructed
  yourself (HTTP, custom, anything that quacks like a `Transport`).
- `.stop()` — close the active transport and the underlying server.
- `.raw` — the underlying SDK `Server` if you need to do something exotic.

### resources and prompts

Same declarative shape:

```ts
defineResource({
  uri: 'file:///etc/hosts',
  name: 'hosts',
  mimeType: 'text/plain',
  read: async () => ({ text: await fs.readFile('/etc/hosts', 'utf8') }),
});

definePrompt({
  name: 'summarize',
  description: 'Summarize a chunk of text.',
  arguments: z.object({ text: z.string() }),
  build: ({ text }) => ({
    messages: [{ role: 'user', content: { type: 'text', text: `Summarize:\n${text}` } }],
  }),
});
```

### observability

`onEvent` gets a structured callback for every tool call, resource read, and
prompt fetch — start time, end time, latency, error, a per-call `requestId`
to correlate. You can plug it into anything: `pino`, `console`, OpenTelemetry,
your homemade aggregator. There's also a built-in for the simple case:

```ts
import { defineServer, consoleLogger, jsonLogger } from 'mcpkit';

const server = defineServer({
  name: 'demo',
  version: '0.1.0',
  onEvent: consoleLogger(),    // → pretty stderr lines
  // or: onEvent: jsonLogger() // → one JSON object per line, on stderr
  tools: [...]
});
```

Logging always goes to stderr — stdout is reserved for protocol traffic on
stdio transports.

## testing

`mcpkit/testing` exposes an in-process client that talks to your server
over an in-memory transport — no subprocess, no stdio piping, no flaky
process teardown. Same client a real consumer would use, just routed through
RAM.

```ts
import { describe, it, expect } from 'vitest';
import { createTestClient, expectToolError, snapshotTools } from 'mcpkit/testing';
import { server } from '../src/index.js';

describe('add', () => {
  it('adds', async () => {
    const client = await createTestClient(server);
    const result = await client.callTool('add', { a: 2, b: 3 });
    expect(result.text).toBe('5');
    expect(result.isError).toBe(false);
    await client.close();
  });

  it('rejects bad input', async () => {
    const client = await createTestClient(server);
    const text = await expectToolError(client, 'add', { a: 'nope', b: 1 });
    expect(text).toMatch(/invalid/i);
    await client.close();
  });

  it("doesn't drift its public surface", () => {
    expect(snapshotTools(server)).toMatchSnapshot();
  });
});
```

## design choices worth knowing

**Zod, not raw JSON Schema.** You write the type once. Validation, generated
JSON Schema for the protocol, and TypeScript inference for the handler all
fall out of the same source. Trying to keep three definitions in sync is the
boilerplate this project exists to delete.

**Errors are values, not exceptions.** A handler that throws becomes an
`isError: true` content envelope. The client sees a sensible response instead
of a transport-level failure. If you'd rather format the error yourself,
override `onToolError`.

**Transport-agnostic core.** The same `defineServer` works over stdio, the
streamable HTTP transport, the in-memory test transport, or anything else
that implements the SDK's `Transport` interface. The `http-streaming`
template shows the wiring.

**Strict mode by default.** Templates ship with `strict: true` and
`noUncheckedIndexedAccess`. The library itself compiles under the same
settings. If you find a hole in the types, that's a bug.

**Listener errors are swallowed.** If your `onEvent` handler throws, your
tool calls keep working. Observability bugs shouldn't be load-bearing.

## faq

**Does this lock me into mcpkit forever?**
No. Every helper has an escape hatch — `server.raw` gives you the underlying
SDK `Server`, and you can `setRequestHandler` on it directly if you need
something the kit doesn't model yet. The kit is a layer on top, not a
replacement.

**Why Zod 3 and not 4?**
Zod 4 is great but the ecosystem (notably `zod-to-json-schema`) is still
catching up. We'll move when it's stable in production. If you're already
on Zod 4, the schema interfaces are compatible enough — file an issue if you
hit a wall.

**Does it support resources and prompts, not just tools?**
Yes. `defineResource` and `definePrompt` are first-class. They're less
commonly used than tools, so most examples lead with tools — but the wiring
is identical.

**Streamable HTTP, SSE, both?**
Streamable HTTP. The older HTTP+SSE flavor is still in the SDK but is being
phased out — if you have a reason to need it, `defineServer` is transport-
agnostic and you can pass any `Transport` instance via `.connect()`.

**Production-ready?**
The library is small and the surface is intentionally narrow. The official
SDK does the heavy lifting underneath. Pin a version, write tests for your
tools (the in-process client makes this easy), and you're set.

## what this is not

- not a hosted service. you build, you deploy.
- not an agent framework. it builds the server side of MCP, not the client.
- not opinionated about your domain. tools are functions; what they do is
  your problem.

## roadmap

- more templates (oauth-protected, edge runtime, drizzle/postgres).
- a `mcpkit publish` command that lints + packages + tags a release.
- richer testing helpers (fuzz a tool's input, schema diff against a baseline).
- optional OpenTelemetry adapter for `onEvent`.

If something's missing, [open an issue](https://github.com/EuKennedy/mcpkit/issues)
with a sketch of the API you'd want.

## license

MIT.
