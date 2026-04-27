# mcp-kit

**The TypeScript toolkit for building MCP servers without the boilerplate.**

Define a tool with a Zod schema and a handler. Get a working
[Model Context Protocol](https://modelcontextprotocol.io) server back —
schema generation, input validation, error envelopes, transport wiring,
all done.

```ts
import { defineServer, defineTool } from 'mcp-kit';
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

That's a real, functioning MCP server. Run it with `mcp-kit dev` and point any
client at it.

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

`mcp-kit` collapses all of that into `defineTool` + `defineServer`. The schema
is generated from your Zod type, validation runs before your handler, errors
turn into proper protocol responses, and a string return becomes a text
content block. You stay in the layer that actually matters — what the tool
does — and skip the layer that doesn't.

## install

```bash
npm install mcp-kit zod
```

Or scaffold a fresh project (recommended for a first server):

```bash
npx mcp-kit create my-server
cd my-server
npm run dev
```

You'll get a small project with a working stdio server, three example tools,
and a `tsconfig.json` set up for strict mode. Replace the example tools with
yours and ship.

## the cli

```
mcp-kit create [target]   scaffold a new server from a template
mcp-kit dev               run with hot reload (uses tsx under the hood)
mcp-kit build             compile to dist/
mcp-kit inspect           launch the official inspector against your server
```

`create` ships with two templates today:

- **stdio-basic** — a local server over stdio. Most clients want this.
- **http-streaming** — a network-reachable server over the streamable HTTP
  transport. Use it when stdio isn't a fit (hosted deployments, multi-tenant).

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

## testing

`mcp-kit/testing` exposes an in-process client that talks to your server
over an in-memory transport — no subprocess, no stdio piping, no flaky
process teardown. Same client a real consumer would use, just routed through
RAM.

```ts
import { describe, it, expect } from 'vitest';
import { createTestClient } from 'mcp-kit/testing';
import { server } from '../src/index.js';

describe('add', () => {
  it('adds', async () => {
    const client = await createTestClient(server);
    const result = await client.callTool('add', { a: 2, b: 3 });
    expect(result.text).toBe('5');
    expect(result.isError).toBe(false);
    await client.close();
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

## what this is not

- not a hosted service. you build, you deploy.
- not an agent framework. it builds the server side of MCP, not the client.
- not opinionated about your domain. tools are functions; what they do is
  your problem.

## roadmap

- more templates (database-backed, oauth-protected, edge runtime).
- a `mcp-kit publish` command that lints + packages + tags a release.
- richer testing helpers (snapshot of the tool list, schema diff against a
  baseline).
- optional structured logging hook.

If something's missing, [open an issue](https://github.com/EuKennedy/mcp-kit/issues)
with a sketch of the API you'd want.

## license

MIT.
