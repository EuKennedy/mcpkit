# __PROJECT_NAME__

An MCP server over HTTP (streamable transport), scaffolded with
[mcpkit](https://github.com/EuKennedy/mcpkit).

Use this template when you want your server reachable over the network — for
hosted deployments, multi-tenant agents, or simply because stdio is awkward in
a given environment.

## Run it

```bash
npm install
npm run dev
```

The server listens on `http://127.0.0.1:3333/mcp`. Set `PORT` or `HOST` to
override.

## Add a tool

Same API as the stdio template — drop a `defineTool({...})` into the `tools`
array in `src/index.ts`. The transport is the only thing that differs.

## Notes

- The streamable HTTP transport is the official replacement for the older
  HTTP+SSE flavor. Most modern clients support it.
- Sessions are tracked via the `Mcp-Session-Id` header, which the SDK handles
  for you.
- Don't expose this directly to the public internet without an auth layer in
  front. Reverse-proxy, OAuth, or an API-key middleware are all reasonable.
