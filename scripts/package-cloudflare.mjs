// Turns the PHP release into a Cloudflare Workers static-asset tree. Public
// files keep their paths; protected pages and engine files move under
// _private/, which only the Worker can read (see wrangler.jsonc).
import { cpSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, openSync, readSync, closeSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const release = path.join(root, 'dist/php-release');
const appUrl = new URL(process.env.APP_URL || 'https://pdf.beykoz.edu.tr');
const base = appUrl.pathname.replace(/\/$/, '');
const publicDir = path.join(release, 'htdocs', appUrl.hostname, base);
const privateDir = path.join(release, 'pdf-duzenle-private');
const assets = path.join(root, 'dist/cloudflare/assets');
const hidden = path.join(assets, '_private');
// Workers static assets accept files up to 25 MiB.
const PART_SIZE = 24 * 1024 * 1024;

rmSync(path.join(root, 'dist/cloudflare'), { recursive: true, force: true });
mkdirSync(hidden, { recursive: true });
cpSync(publicDir, path.join(assets, base), {
  recursive: true,
  filter: (src) => !src.endsWith('.php') && path.basename(src) !== 'maintenance.html',
});
cpSync(path.join(privateDir, 'web/public/login.html'), path.join(hidden, 'web/public/login.html'));
cpSync(path.join(privateDir, 'web/private/index.html'), path.join(hidden, 'web/private/index.html'));

function split(source, target) {
  const size = statSync(source).size;
  if (size <= PART_SIZE) {
    cpSync(source, path.join(hidden, target));
    return { file: target };
  }
  const parts = [];
  const fd = openSync(source, 'r');
  const buffer = Buffer.alloc(PART_SIZE);
  for (let offset = 0, index = 0; offset < size; offset += PART_SIZE, index++) {
    const read = readSync(fd, buffer, 0, PART_SIZE, offset);
    const part = `${target}.part${index}`;
    mkdirSync(path.dirname(path.join(hidden, part)), { recursive: true });
    writeFileSync(path.join(hidden, part), buffer.subarray(0, read));
    parts.push(part);
  }
  closeSync(fd);
  return { parts, size };
}

// Route table from the generated PHP entry points, so both targets expose
// exactly the same protected URLs.
const routes = {};
const engineDir = path.join(publicDir, 'engine');
for (const entry of readdirSync(engineDir, { recursive: true, withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.php')) continue;
  const stub = readFileSync(path.join(entry.parentPath, entry.name), 'utf8');
  const route = stub.match(/define\('PDF_ROUTE', '([^']+)'\)/)?.[1];
  const file = stub.match(/define\('PDF_ENGINE_FILE', '([^']+)'\)/)?.[1];
  if (!route || !file) throw new Error(`Unrecognised entry point ${entry.name}`);
  const type = route === 'engine' && file.endsWith('.html') ? 'html'
    : route === 'engine-asset' && file.endsWith('.js') ? 'javascript'
    : route === 'engine-asset' && file.endsWith('.wasm.gz') ? 'wasm-gzip'
    : route === 'engine-asset' && file.endsWith('.data.gz') ? 'data-gzip'
    : null;
  if (!type) throw new Error(`Unsupported engine file ${file}`);
  const directory = route === 'engine' ? 'engine-pages' : 'engine-assets';
  const url = '/' + path.relative(publicDir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/');
  routes[url] = { type, ...split(path.join(privateDir, directory, file), `${directory}/${file}`) };
}
writeFileSync(path.join(hidden, 'manifest.json'), JSON.stringify({
  version: String(Math.floor(Date.now() / 1000)),
  routes,
}));
console.info(`Cloudflare paketi: dist/cloudflare/assets (${Object.keys(routes).length} korumalı adres)`);
