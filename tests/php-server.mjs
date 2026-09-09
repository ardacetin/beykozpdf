// Local integration harness only. Production consists solely of PHP and static files.
if (process.env.NODE_ENV !== 'test') throw new Error('Test harness requires NODE_ENV=test.');
import http from 'node:http';
import { spawn } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { cert, idpIssuer, requestInfo, responseXml } from './saml-fixture.mjs';

const root = path.resolve(import.meta.dirname, '..');
const release = path.join(root, 'dist/php-release');
const siteRoot = path.join(release, 'htdocs/my.beykoz.edu.tr');
const privateDir = path.join(release, 'pdf-duzenle-private');
mkdirSync(path.join(privateDir, 'certs'), { recursive: true });
writeFileSync(path.join(privateDir, 'certs/test.pem'), cert, { mode: 0o600 });
writeFileSync(path.join(privateDir, '.env'), [
  'APP_URL=http://127.0.0.1:3100/pdf',
  'SAML_ENTRY_POINT=http://127.0.0.1:3101/sso',
  `SAML_IDP_ISSUER=${idpIssuer}`,
  'SAML_IDP_CERT_PATH=./certs/test.pem',
  'SAML_SP_ENTITY_ID=http://127.0.0.1:3100/pdf/metadata.php',
].join('\n') + '\n', { mode: 0o600 });

const idp = http.createServer((req, res) => {
  if (!req.url?.startsWith('/sso')) { res.writeHead(404).end(); return; }
  const { id, relay } = requestInfo(`http://127.0.0.1:3101${req.url}`);
  const xml = responseXml({
    id, callback: 'http://127.0.0.1:3100/pdf/saml-acs.php',
    audience: 'http://127.0.0.1:3100/pdf/metadata.php',
  });
  const encoded = Buffer.from(xml).toString('base64');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(`<html lang="tr"><title>Yerel test kimlik sağlayıcısı</title><form method="post" action="http://127.0.0.1:3100/pdf/saml-acs.php"><input type="hidden" name="RelayState" value="${relay}"><input type="hidden" name="SAMLResponse" value="${encoded}"><button>Test hesabıyla devam et</button></form></html>`);
});
await new Promise(resolve => idp.listen(3101, '127.0.0.1', resolve));
const php = spawn('php', ['-S', '127.0.0.1:3100', '-t', siteRoot], {
  cwd: root,
  env: { ...process.env, PDF_TESTING: '1', PDF_PRIVATE_DIR: privateDir },
  stdio: ['ignore', 'inherit', 'inherit'],
});
const close = () => { idp.close(); php.kill('SIGTERM'); };
process.once('SIGTERM', close);
process.once('SIGINT', close);
process.once('exit', close);
await new Promise((resolve, reject) => {
  php.once('exit', code => reject(new Error(`PHP test server stopped (${code})`)));
});
