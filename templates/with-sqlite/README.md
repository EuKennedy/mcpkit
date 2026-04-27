# __PROJECT_NAME__

An MCP server backed by SQLite. Scaffolded with
[mcpkit](https://github.com/EuKennedy/mcpkit).

A working CRUD example over a `notes` table — create, get, list, search,
update, delete. Use it as a reference for wiring real persistence into an
MCP server.

## Run it

```bash
npm install
npm run dev
```

The database lives at `./data/notes.db` by default. Override with `DB_PATH`:

```bash
DB_PATH=/tmp/scratch.db npm run dev
```

## Schema

```sql
CREATE TABLE notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  body       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
```

WAL mode is on, foreign keys are enforced. Migrations are inline (one
`CREATE TABLE IF NOT EXISTS`) — for a real project, swap in your migrator of
choice.

## Why better-sqlite3

Synchronous API maps cleanly onto MCP's request/response shape — no need to
`await` for a query that's already resolved by the time the call returns.
The performance ceiling is high enough that you'll notice your network
roundtrips before you notice SQLite.

## Adapting this

- Replace `notes` with your domain (`tasks`, `bookmarks`, `events`, …).
- Add migrations (`drizzle-kit`, `prisma`, raw SQL — your call).
- For multi-tenant scenarios, partition by `account_id` or move to a
  per-tenant database file.
