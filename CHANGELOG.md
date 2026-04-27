# changelog

all notable changes will land here. dates are ISO-8601, format follows
[keep a changelog](https://keepachangelog.com).

## [0.1.1] — 2026-04-27

### changed

- package and repo renamed from `mcp-kit` to `mcpkit` (the dashed name was
  taken on npm). github redirects from the old slug, but please update any
  imports: `from 'mcp-kit'` → `from 'mcpkit'`.

## [0.1.0] — 2026-04-27

### added

- `defineServer`, `defineTool`, `defineResource`, `definePrompt` —
  declarative server building blocks, validated at construction time.
- `createTestClient(server)` — in-process client over `InMemoryTransport`,
  no subprocess needed.
- `snapshotTools(server)` and `getToolSchema(server, name)` for
  surface-stability tests.
- `expectToolError(client, name, args)` assertion helper.
- `onEvent` lifecycle hook on `defineServer` (tool.start / tool.end /
  tool.error / resource.read / prompt.get) with per-call `requestId` and
  duration in ms.
- `consoleLogger()` and `jsonLogger()` ready-made event listeners writing
  to stderr (so stdout stays free for stdio protocol traffic).
- cli: `create`, `dev`, `build`, `inspect`.
- starter templates: `stdio-basic`, `http-streaming`, `with-fetch`,
  `with-sqlite`.
- ci matrix on node 18/20/22 × ubuntu/macos with end-to-end scaffold checks.
- release workflow that publishes to npm with provenance on `v*.*.*` tags
  and asserts package version matches the tag.
- dependabot config (weekly npm + monthly actions).
