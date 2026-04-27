# __PROJECT_NAME__

An MCP server that wraps `fetch` for use as agent tools. Scaffolded with
[mcpkit](https://github.com/EuKennedy/mcpkit).

It ships three tools out of the box:

- `http_get` — fetch a URL and return the raw body (truncated at 100KB).
- `http_get_json` — fetch and parse JSON, throwing on non-2xx.
- `public_ip` — quick sanity check that network egress works.

All three use a wrapped `fetch` with an `AbortController` timeout, so a hung
upstream can't hang your agent.

## Run it

```bash
npm install
npm run dev
```

## What to change

Replace these example tools with the actual integrations your agent should
have access to: a search API, your CMS, an internal HTTP service. The pattern
stays the same — declare a Zod input schema, write a handler, return a
string or content blocks.

## Heads up

If you're connecting an LLM-driven agent to this server, don't expose
arbitrary `http_get` to untrusted prompts. Constrain `url` with an allowlist
or move to a domain-specific tool (e.g. `search_docs(query)`) instead of a
generic HTTP gateway.
