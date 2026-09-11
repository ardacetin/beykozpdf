import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
test('PHP sources pass syntax checks', () => {
  for (const file of ['php/app.php', 'php/config.php', 'php/public/index.php']) {
    const result = execFileSync('php', ['-l', file], { cwd: root, encoding: 'utf8' });
    assert.match(result, /No syntax errors/);
  }
});

test('PHP config accepts dotenv-style comments', () => {
  const privateDir = mkdtempSync(path.join(tmpdir(), 'pdf-config-'));
  try {
    writeFileSync(path.join(privateDir, '.env'), [
      '# comment containing a home-relative ~/path',
      'APP_URL=https://my.beykoz.edu.tr/pdf',
      'SAML_ENTRY_POINT=',
      'SAML_IDP_ISSUER=',
      'SAML_IDP_CERT_PATH=./certs/google-workspace.pem',
      'SAML_SP_ENTITY_ID=https://my.beykoz.edu.tr/pdf/metadata.php',
    ].join('\n'));
    const code = `require ${JSON.stringify(path.join(root, 'php/config.php'))}; ` +
      `$config = pdf_config(${JSON.stringify(privateDir)}); echo $config['url'];`;
    assert.equal(execFileSync('php', ['-r', code], { encoding: 'utf8' }), 'https://my.beykoz.edu.tr/pdf');
  } finally {
    rmSync(privateDir, { recursive: true, force: true });
  }
});

test('SAML requires the Google Workspace signed-response profile', () => {
  const code = `require ${JSON.stringify(path.join(root, 'php/config.php'))}; ` +
    `$settings = pdf_saml_settings(['url' => 'https://my.beykoz.edu.tr/pdf', ` +
    `'entity' => 'https://my.beykoz.edu.tr/pdf/metadata.php', 'issuer' => 'https://accounts.google.com/o/saml2?idpid=test', ` +
    `'entry' => 'https://accounts.google.com/o/saml2/idp?idpid=test', 'cert' => 'test']); ` +
    `echo json_encode($settings['security']);`;
  const security = JSON.parse(execFileSync('php', ['-r', code], { encoding: 'utf8' }));
  assert.equal(security.wantMessagesSigned, true);
  assert.equal(security.wantAssertionsSigned, false);
});

test('release contains PHP entry points and no runtime service configuration', () => {
  const release = path.join(root, 'dist/php-release');
  for (const file of ['htdocs/my.beykoz.edu.tr/pdf/index.php',
    'htdocs/my.beykoz.edu.tr/pdf/app.php',
    'htdocs/my.beykoz.edu.tr/pdf/login.php',
    'htdocs/my.beykoz.edu.tr/pdf/saml-acs.php',
    'htdocs/my.beykoz.edu.tr/pdf/metadata.php',
    'htdocs/my.beykoz.edu.tr/pdf/engine/merge-pdf.php',
    'htdocs/my.beykoz.edu.tr/pdf/engine/workers/merge.worker.php',
    'pdf-duzenle-private/vendor/autoload.php', 'pdf-duzenle-private/.env.example']) {
    assert.ok(statSync(path.join(release, file)).isFile(), file);
  }
  assert.equal(readdirSync(release).includes('ecosystem.config.cjs'), false);
  assert.equal(readdirSync(path.join(release, 'pdf-duzenle-private')).includes('source.tar.gz'), false);
  assert.match(readFileSync(path.join(release, 'htdocs/my.beykoz.edu.tr/pdf/app.php'), 'utf8'), /PDF_ROUTE.*app/);
});

test('release publishes browser modules with CloudPanel-compatible JS paths', () => {
  const engineDir = path.join(root, 'dist/php-release/htdocs/my.beykoz.edu.tr/pdf/engine');
  const files = readdirSync(engineDir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.relative(engineDir, path.join(entry.parentPath, entry.name)));
  assert.equal(files.some(file => file.endsWith('.mjs')), false);
  assert.ok(files.some(file => /^assets\/pdf\.worker\.min-.+\.js$/.test(file)));
  for (const file of files.filter(file => /\.(?:js|php)$/.test(file))) {
    assert.doesNotMatch(readFileSync(path.join(engineDir, file), 'utf8'), /\.mjs\b/, file);
  }
  const splitPage = readFileSync(
    path.join(root, 'dist/php-release/pdf-duzenle-private/engine-pages/split-pdf.html'),
    'utf8',
  );
  assert.match(splitPage, /split-pdf-[^"']+\.js\?v=[a-z0-9]+/);
  const splitEntryName = splitPage.match(/assets\/(split-pdf-[^"'?]+\.js)\?v=/)?.[1];
  assert.ok(splitEntryName);
  const splitEntry = readFileSync(path.join(engineDir, 'assets', splitEntryName), 'utf8');
  assert.match(splitEntry, /\.\/main-[^"'`?]+\.js\?v=[a-z0-9]+/);
  assert.match(splitEntry, /\/pdf\/engine\/assets\/pdf\.worker[^"'`?]+\.js\?v=[a-z0-9]+/);
  assert.doesNotMatch(splitEntry, /["'`](?:\.\/|\/pdf\/)[^"'`?]+\.js["'`]/);
});

test('release serves LibreOffice runtime through authenticated PHP routes', () => {
  const publicRoot = path.join(root, 'dist/php-release/htdocs/my.beykoz.edu.tr/pdf');
  const privateRoot = path.join(root, 'dist/php-release/pdf-duzenle-private');
  for (const name of ['browser.worker.global', 'soffice', 'soffice.worker']) {
    const publicScript = path.join(publicRoot, 'engine', 'libreoffice-wasm', `${name}.php`);
    assert.equal(existsSync(publicScript), true, `${name}.php missing`);
    assert.match(readFileSync(publicScript, 'utf8'), /PDF_ROUTE', 'engine-asset/);
    assert.equal(
      existsSync(path.join(privateRoot, 'engine-assets', 'libreoffice-wasm', `${name}.js`)),
      true,
      `${name}.js private source missing`,
    );
  }
  for (const name of ['soffice.wasm', 'soffice.data']) {
    const publicAsset = path.join(publicRoot, 'engine', 'libreoffice-wasm', `${name}.php`);
    assert.equal(existsSync(publicAsset), true, `${name}.php missing`);
    assert.match(readFileSync(publicAsset, 'utf8'), /PDF_ROUTE', 'engine-asset/);
    assert.equal(
      existsSync(path.join(privateRoot, 'engine-assets', 'libreoffice-wasm', `${name}.gz`)),
      true,
      `${name}.gz private source missing`,
    );
  }
  const loader = readdirSync(path.join(publicRoot, 'engine', 'assets'))
    .find((name) => name.startsWith('libreoffice-loader-') && name.endsWith('.js'));
  assert.ok(loader, 'LibreOffice loader missing');
  const loaderSource = readFileSync(path.join(publicRoot, 'engine', 'assets', loader), 'utf8');
  assert.match(loaderSource, /browser\.worker\.global\.\$\{/);
  assert.match(loaderSource, /soffice\.wasm\.\$\{/);
  assert.match(loaderSource, /soffice\.data\.\$\{/);
  assert.match(loaderSource, /[`'"]php[`'"]/);
});
