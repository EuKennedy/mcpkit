# __PROJECT_NAME__

An MCP server scaffolded with [mcp-kit](https://github.com/EuKennedy/mcp-kit).

It exposes three example tools (`add`, `reverse`, `now`) over stdio. Use it
as a starting point and replace the tools with whatever your server should
actually do.

## Run it

```bash
npm install
npm run dev      # hot reload
npm run build    # produce dist/
npm run start    # run the built server
```

## Wire it into a client

Most MCP clients accept a stdio command. Point them at:

```bash
node /absolute/path/to/__PROJECT_NAME__/dist/index.js
```

…or during development:

```bash
npx mcp-kit dev
```

## Add a tool

Open `src/index.ts` and drop a new entry into the `tools` array:

```ts
defineTool({
  name: 'greet',
  description: 'Greet someone by name.',
  input: z.object({ name: z.string() }),
  handler: ({ name }) => `Hello, ${name}!`,
}),
```

The input schema is type-safe — your handler gets a fully-typed `name: string`
without casts. Throwing inside the handler turns into an `isError` response
the client can reason about.

## Inspect

```bash
npm run inspect
```

That launches the official MCP inspector against this server so you can poke
at it with a UI before wiring it to a real client.
