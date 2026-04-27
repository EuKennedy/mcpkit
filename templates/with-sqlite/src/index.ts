import { defineServer, defineTool } from 'mcpkit';
import { z } from 'zod';
import { type Note, openDatabase } from './db.js';

const db = openDatabase();

const insertStmt = db.prepare<[string, string]>(
  'INSERT INTO notes (title, body) VALUES (?, ?) RETURNING *',
);
const updateStmt = db.prepare<[string, string, number]>(
  "UPDATE notes SET title = ?, body = ?, updated_at = datetime('now') WHERE id = ? RETURNING *",
);
const deleteStmt = db.prepare<[number]>('DELETE FROM notes WHERE id = ?');
const getStmt = db.prepare<[number]>('SELECT * FROM notes WHERE id = ?');
const listStmt = db.prepare<[number, number]>(
  'SELECT * FROM notes ORDER BY updated_at DESC LIMIT ? OFFSET ?',
);
const searchStmt = db.prepare<[string, string, number]>(
  'SELECT * FROM notes WHERE title LIKE ? OR body LIKE ? ORDER BY updated_at DESC LIMIT ?',
);

const server = defineServer({
  name: '__PROJECT_NAME__',
  version: '0.1.0',
  tools: [
    defineTool({
      name: 'create_note',
      description: 'Create a new note. Returns the inserted row.',
      input: z.object({
        title: z.string().min(1).max(200),
        body: z.string().min(1),
      }),
      handler: ({ title, body }) => {
        const note = insertStmt.get(title, body) as Note;
        return JSON.stringify(note, null, 2);
      },
    }),

    defineTool({
      name: 'get_note',
      description: 'Fetch a single note by id.',
      input: z.object({ id: z.number().int().positive() }),
      handler: ({ id }) => {
        const note = getStmt.get(id) as Note | undefined;
        if (!note) throw new Error(`note ${id} not found`);
        return JSON.stringify(note, null, 2);
      },
    }),

    defineTool({
      name: 'list_notes',
      description: 'List notes, most recently updated first.',
      input: z.object({
        limit: z.number().int().positive().max(100).default(20),
        offset: z.number().int().nonnegative().default(0),
      }),
      handler: ({ limit, offset }) => {
        const notes = listStmt.all(limit, offset) as Note[];
        return JSON.stringify(notes, null, 2);
      },
    }),

    defineTool({
      name: 'search_notes',
      description: 'Search notes by substring in title or body. Case-sensitive (sqlite LIKE).',
      input: z.object({
        query: z.string().min(1),
        limit: z.number().int().positive().max(100).default(20),
      }),
      handler: ({ query, limit }) => {
        const pattern = `%${query}%`;
        const notes = searchStmt.all(pattern, pattern, limit) as Note[];
        return JSON.stringify(notes, null, 2);
      },
    }),

    defineTool({
      name: 'update_note',
      description: 'Update title and body of an existing note.',
      input: z.object({
        id: z.number().int().positive(),
        title: z.string().min(1).max(200),
        body: z.string().min(1),
      }),
      handler: ({ id, title, body }) => {
        const note = updateStmt.get(title, body, id) as Note | undefined;
        if (!note) throw new Error(`note ${id} not found`);
        return JSON.stringify(note, null, 2);
      },
    }),

    defineTool({
      name: 'delete_note',
      description: 'Delete a note by id.',
      input: z.object({ id: z.number().int().positive() }),
      handler: ({ id }) => {
        const result = deleteStmt.run(id);
        if (result.changes === 0) throw new Error(`note ${id} not found`);
        return `deleted ${id}`;
      },
    }),
  ],
});

await server.start({ transport: 'stdio' });
