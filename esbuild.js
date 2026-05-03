const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
const watch = args.includes('--watch');
const production = args.includes('--production');

const extensionConfig = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'out/extension.js',
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  external: ['vscode'],
  sourcemap: !production,
  minify: production,
  logLevel: 'info'
};

function copyWebviewAssets() {
  const srcDir = path.join(__dirname, 'src', 'webview');
  const outDir = path.join(__dirname, 'out', 'webview');
  fs.mkdirSync(outDir, { recursive: true });
  for (const file of ['index.html', 'styles.css', 'main.js']) {
    fs.copyFileSync(path.join(srcDir, file), path.join(outDir, file));
  }
}

function copySqlWasm() {
  const src = path.join(__dirname, 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
  const dest = path.join(__dirname, 'out', 'sql-wasm.wasm');
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

async function run() {
  if (watch) {
    const ctx = await esbuild.context(extensionConfig);
    copyWebviewAssets();
    copySqlWasm();
    await ctx.watch();
    console.log('watching...');
  } else {
    await esbuild.build(extensionConfig);
    copyWebviewAssets();
    copySqlWasm();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
