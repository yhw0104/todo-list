import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TodoDb } from '../db';

type InboundMessage =
  | { type: 'load' }
  | { type: 'add'; text: string }
  | { type: 'toggle'; id: number }
  | { type: 'update'; id: number; text: string }
  | { type: 'remove'; id: number };

export class TodoPanel {
  public static current: TodoPanel | undefined;
  private static readonly viewType = 'todoList.panel';

  private readonly panel: vscode.WebviewPanel;
  private readonly disposables: vscode.Disposable[] = [];

  static createOrShow(context: vscode.ExtensionContext, db: TodoDb): void {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;
    if (TodoPanel.current) {
      TodoPanel.current.panel.reveal(column);
      return;
    }
    const panel = vscode.window.createWebviewPanel(
      TodoPanel.viewType,
      'Todo',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'out', 'webview')]
      }
    );
    TodoPanel.current = new TodoPanel(panel, context, db);
  }

  private constructor(
    panel: vscode.WebviewPanel,
    context: vscode.ExtensionContext,
    private readonly db: TodoDb
  ) {
    this.panel = panel;
    this.panel.webview.html = this.buildHtml(context);

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);
    this.panel.webview.onDidReceiveMessage(
      (msg: InboundMessage) => this.handleMessage(msg),
      null,
      this.disposables
    );
  }

  private handleMessage(msg: InboundMessage): void {
    switch (msg.type) {
      case 'load':
        break;
      case 'add':
        if (msg.text.trim()) {
          this.db.add(msg.text.trim());
        }
        break;
      case 'toggle':
        this.db.toggle(msg.id);
        break;
      case 'update':
        if (msg.text.trim()) {
          this.db.update(msg.id, msg.text.trim());
        }
        break;
      case 'remove':
        this.db.remove(msg.id);
        break;
    }
    this.pushTodos();
  }

  private pushTodos(): void {
    this.panel.webview.postMessage({ type: 'todos', items: this.db.list() });
  }

  private buildHtml(context: vscode.ExtensionContext): string {
    const webviewDir = vscode.Uri.joinPath(context.extensionUri, 'out', 'webview');
    const htmlPath = path.join(webviewDir.fsPath, 'index.html');
    let html = fs.readFileSync(htmlPath, 'utf8');

    const styleUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(webviewDir, 'styles.css')
    );
    const scriptUri = this.panel.webview.asWebviewUri(
      vscode.Uri.joinPath(webviewDir, 'main.js')
    );
    const nonce = createNonce();
    const cspSource = this.panel.webview.cspSource;
    const csp = [
      `default-src 'none'`,
      `style-src ${cspSource} 'unsafe-inline'`,
      `script-src 'nonce-${nonce}'`,
      `img-src ${cspSource} data:`,
      `font-src ${cspSource}`
    ].join('; ');

    return html
      .replace(/{{csp}}/g, csp)
      .replace(/{{styleUri}}/g, styleUri.toString())
      .replace(/{{scriptUri}}/g, scriptUri.toString())
      .replace(/{{nonce}}/g, nonce);
  }

  dispose(): void {
    TodoPanel.current = undefined;
    this.panel.dispose();
    while (this.disposables.length) {
      this.disposables.pop()?.dispose();
    }
  }
}

function createNonce(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) {
    out += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return out;
}
