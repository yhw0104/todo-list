import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TodoDb, loadSqlJs } from './db';
import { TodoPanel } from './webview/panel';

let db: TodoDb | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  fs.mkdirSync(context.globalStorageUri.fsPath, { recursive: true });
  const dbPath = path.join(context.globalStorageUri.fsPath, 'todos.db');
  const wasmDir = path.join(context.extensionPath, 'out');
  const SQL = await loadSqlJs(wasmDir);
  db = new TodoDb(SQL, dbPath);

  context.subscriptions.push(
    vscode.commands.registerCommand('todoList.open', () => {
      if (!db) return;
      TodoPanel.createOrShow(context, db);
    })
  );
}

export function deactivate(): void {
  db?.close();
  db = undefined;
}
