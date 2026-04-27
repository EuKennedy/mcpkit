# changelog

all notable changes will land here. dates are ISO-8601, format follows
[keep a changelog](https://keepachangelog.com).

## [unreleased]

### added

- `defineServer`, `defineTool`, `defineResource`, `definePrompt` — declarative
  server building blocks, validated at construction time.
- `createTestClient(server)` — in-process client over `InMemoryTransport`,
  no subprocess needed.
- cli: `create`, `dev`, `build`, `inspect`.
- starter templates: `stdio-basic`, `http-streaming`.
