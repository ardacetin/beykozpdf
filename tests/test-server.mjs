// Local integration harness only: a test IdP plus the app built for
// PDF_TARGET=php (php -S) or PDF_TARGET=cloudflare (wrangler dev).
if (process.env.NODE_ENV !== 'test') throw new Error('Test harness requires NODE_ENV=test.');
import http from 'node:http';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { cert, idpIssuer, requestInfo, responseXml } from './saml-fixture.mjs';

const root = path.resolve(import.meta.dirname, '..');
const target = process.env.PDF_TARGET || 'php';
const release = path.join(root, 'dist/php-release');
const siteRoot = path.join(release, 'htdocs/pdf.beykoz.edu.tr');
const privateDir = path.join(release, 'pdf-duzenle-private');
const settings = {
  APP_URL: 'http://127.0.0.1:3100',
  SAML_ENTRY_POINT: 'http://127.0.0.1:3101/sso',
  SAML_IDP_ISSUER: idpIssuer,
  SAML_SP_ENTITY_ID: 'http://127.0.0.1:3100/metadata.php',
};
let server;
if (target === 'cloudflare') {
  const envFile = path.join(root, 'dist/cloudflare/test.env');
  writeFileSync(envFile, Object.entries({
    ...settings, PDF_TESTING: '1', SAML_IDP_CERT: cert, SESSION_SECRET: 'test-only-secret-'.padEnd(48, 'x'),
  }).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
  server = spawn('npx', ['wrangler', 'dev', '--ip', '127.0.0.1', '--port', '3100', '--env-file', envFile,
    '--local-upstream', '127.0.0.1:3100', '--show-interactive-dev-session=false'], { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] });
} else {
  mkdirSync(path.join(privateDir, 'certs'), { recursive: true });
  writeFileSync(path.join(privateDir, 'certs/test.pem'), cert, { mode: 0o600 });
  writeFileSync(path.join(privateDir, '.env'), [
    ...Object.entries(settings).map(([key, value]) => `${key}=${value}`),
    'SAML_IDP_CERT_PATH=./certs/test.pem',
  ].join('\n') + '\n', { mode: 0o600 });
  server = spawn('php', ['-S', '127.0.0.1:3100', '-t', siteRoot], {
    cwd: root,
    env: { ...process.env, PDF_TESTING: '1', PDF_PRIVATE_DIR: privateDir },
    stdio: ['ignore', 'inherit', 'inherit'],
  });
}

const idp = http.createServer((req, res) => {
  if (!req.url?.startsWith('/sso')) { res.writeHead(404).end(); return; }
  const { id, relay } = requestInfo(`http://127.0.0.1:3101${req.url}`);
  const xml = responseXml({
    id, callback: 'http://127.0.0.1:3100/saml-acs.php',
    audience: 'http://127.0.0.1:3100/metadata.php',
  });
  const encoded = Buffer.from(xml).toString('base64');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<html lang="tr"><title>Yerel test kimlik sağlayıcısı</title><form method="post" action="http://127.0.0.1:3100/saml-acs.php"><input type="hidden" name="RelayState" value="${relay}"><input type="hidden" name="SAMLResponse" value="${encoded}"><button>Test hesabıyla devam et</button></form></html>`);
});
await new Promise(resolve => idp.listen(3101, '127.0.0.1', resolve));
const close = () => { idp.close(); server.kill('SIGTERM'); };
process.once('SIGTERM', close);
process.once('SIGINT', close);
process.once('exit', close);
await new Promise((resolve, reject) => {
  server.once('exit', code => reject(new Error(`${target} test server stopped (${code})`)));
});
