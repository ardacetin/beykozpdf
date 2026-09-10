import { cpSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const release = path.join(root, 'dist/php-release');
const publicDir = path.join(release, 'htdocs/my.beykoz.edu.tr/pdf');
const privateDir = path.join(release, 'pdf-duzenle-private');
if (!existsSync(path.join(root, 'vendor/autoload.php'))) throw new Error('Önce composer install --no-dev çalıştırın.');
rmSync(release, { recursive: true, force: true });
mkdirSync(publicDir, { recursive: true });
mkdirSync(privateDir, { recursive: true });
cpSync(path.join(root, 'php'), path.join(privateDir, 'php'), { recursive: true });
cpSync(path.join(root, 'vendor'), path.join(privateDir, 'vendor'), { recursive: true });
cpSync(path.join(root, 'web'), path.join(privateDir, 'web'), { recursive: true });
cpSync(path.join(root, '.env.example'), path.join(privateDir, '.env.example'));
mkdirSync(path.join(privateDir, 'certs'));
cpSync(path.join(root, 'php/public/index.php'), path.join(publicDir, 'index.php'));
for (const [file, route] of Object.entries({
  'app': 'app', 'login': 'login', 'saml-acs': 'acs', 'metadata': 'metadata',
  'logout': 'logout', 'me': 'me', 'healthz': 'health', 'auth-status': 'status', 'source': 'source',
})) writeFileSync(path.join(publicDir, file + '.php'), `<?php\ndeclare(strict_types=1);\ndefine('PDF_ROUTE', '${route}');\nrequire __DIR__ . '/index.php';\n`);
cpSync(path.join(root, 'web/public'), path.join(publicDir, 'public'), { recursive: true, filter: p => !p.endsWith('.html') });
cpSync(path.join(root, 'web/private'), path.join(publicDir, 'app-assets'), { recursive: true, filter: p => !p.endsWith('.html') });

// Preserve native browser module/worker URLs. Only static code/assets are public;
// every HTML document, including nested PDF viewers, has an authenticated PHP entry.
const engine = path.join(root, 'engine/dist');
const files = readdirSync(engine, { recursive: true, withFileTypes: true }).filter(f => f.isFile())
  .map(f => path.relative(engine, path.join(f.parentPath, f.name)));
const htmlNames = [...new Set(files.filter(f => f.endsWith('.html')).map(f => path.basename(f)))];
const workerNames = [...new Set(files.filter(f => f.startsWith(`workers${path.sep}`) && f.endsWith('.js')).map(f => path.basename(f)))];
function rewriteLinks(text) {
  for (const name of htmlNames) text = text.replaceAll(name, name.slice(0, -5) + '.php');
  for (const name of workerNames) text = text.replaceAll(name, name.slice(0, -3) + '.php');
  // CloudPanel's default Nginx MIME map serves .mjs as
  // application/octet-stream. Module scripts/workers are rejected by browsers
  // with that MIME type, so publish the same ES modules with a .js extension.
  text = text.replaceAll('.mjs', '.js');
  return text;
}
for (const rel of files) {
  if (rel.endsWith('.map')) continue;
  const src = path.join(engine, rel);
  const publishedRel = rel.endsWith('.mjs') ? rel.slice(0, -4) + '.js' : rel;
  const target = path.join(publicDir, 'engine', publishedRel);
  mkdirSync(path.dirname(target), { recursive: true });
  if (rel.endsWith('.html')) {
    const hidden = path.join(privateDir, 'engine-pages', rel);
    mkdirSync(path.dirname(hidden), { recursive: true });
    writeFileSync(hidden, rewriteLinks(readFileSync(src, 'utf8')));
    const depth = rel.split(path.sep).length;
    writeFileSync(target.slice(0, -5) + '.php', `<?php\ndeclare(strict_types=1);\ndefine('PDF_ROUTE', 'engine');\ndefine('PDF_ENGINE_FILE', '${rel}');\nrequire dirname(__DIR__, ${depth}) . '/index.php';\n`);
  } else if (rel.startsWith(`workers${path.sep}`) && rel.endsWith('.js')) {
    const hidden = path.join(privateDir, 'engine-assets', rel);
    mkdirSync(path.dirname(hidden), { recursive: true });
    writeFileSync(hidden, rewriteLinks(readFileSync(src, 'utf8')));
    const depth = rel.split(path.sep).length;
    writeFileSync(target.slice(0, -3) + '.php', `<?php\ndeclare(strict_types=1);\ndefine('PDF_ROUTE', 'engine-asset');\ndefine('PDF_ENGINE_FILE', '${rel}');\nrequire dirname(__DIR__, ${depth}) . '/index.php';\n`);
  } else if (/\.(?:m?js|css)$/.test(rel)) {
    writeFileSync(target, rewriteLinks(readFileSync(src, 'utf8')));
  } else cpSync(src, target);
}
for (const name of ['composer.json', 'composer.lock', 'LICENSE', 'LICENSE-AGPL', 'THIRD_PARTY_NOTICES.md'])
  cpSync(path.join(root, name), path.join(privateDir, name));
cpSync(path.join(root, 'docs/cloudpanel.md'), path.join(release, 'KURULUM.md'));
const archive = path.join(root, 'dist/pdf-duzenle-php.zip');
rmSync(archive, { force: true });
execFileSync('zip', ['-qr', archive, 'htdocs', 'pdf-duzenle-private', 'KURULUM.md'], { cwd: release });
console.info(`PHP yükleme paketi: ${archive}`);
