import * as fs from 'fs';
import * as path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

export type Todo = {
  id: number;
  text: string;
  done: boolean;
  createdAt: number;
};

let SQL: SqlJsStatic | undefined;

export async function loadSqlJs(wasmDir: string): Promise<SqlJsStatic> {
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: (file: string) => path.join(wasmDir, file)
    });
  }
  return SQL;
}

export class TodoDb {
  private db: Database;

  constructor(sql: SqlJsStatic, private readonly filePath: string) {
    if (fs.existsSync(filePath)) {
      const buf = fs.readFileSync(filePath);
      this.db = new sql.Database(new Uint8Array(buf));
    } else {
      this.db = new sql.Database();
    }
    this.db.run(`
      CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        done INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );
    `);
    this.persist();
  }

  private persist(): void {
    const data = this.db.export();
    fs.writeFileSync(this.filePath, Buffer.from(data));
  }

  list(): Todo[] {
    const stmt = this.db.prepare(
      'SELECT id, text, done, created_at FROM todos ORDER BY done ASC, created_at DESC'
    );
    const rows: Todo[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject() as {
        id: number;
        text: string;
        done: number;
        created_at: number;
      };
      rows.push({
        id: r.id,
        text: r.text,
        done: r.done === 1,
        createdAt: r.created_at
      });
    }
    stmt.free();
    return rows;
  }

  add(text: string): Todo {
    const createdAt = Date.now();
    this.db.run('INSERT INTO todos (text, done, created_at) VALUES (?, 0, ?)', [
      text,
      createdAt
    ]);
    const result = this.db.exec('SELECT last_insert_rowid() AS id');
    const id = Number(result[0].values[0][0]);
    this.persist();
    return { id, text, done: false, createdAt };
  }

  toggle(id: number): void {
    this.db.run('UPDATE todos SET done = CASE done WHEN 1 THEN 0 ELSE 1 END WHERE id = ?', [id]);
    this.persist();
  }

  update(id: number, text: string): void {
    this.db.run('UPDATE todos SET text = ? WHERE id = ?', [text, id]);
    this.persist();
  }

  remove(id: number): void {
    this.db.run('DELETE FROM todos WHERE id = ?', [id]);
    this.persist();
  }

  close(): void {
    this.db.close();
  }
}
