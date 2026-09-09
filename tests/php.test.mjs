import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
test('PHP sources pass syntax checks', () => {
  for (const file of ['php/app.php', 'php/config.php', 'php/public/index.php']) {
    const result = execFileSync('php', ['-l', file], { cwd: root, encoding: 'utf8' });
    assert.match(result, /No syntax errors/);
  }
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
    'pdf-duzenle-private/vendor/autoload.php', 'pdf-duzenle-private/.env']) {
    assert.ok(statSync(path.join(release, file)).isFile(), file);
  }
  assert.equal(readdirSync(release).includes('ecosystem.config.cjs'), false);
  assert.match(readFileSync(path.join(release, 'htdocs/my.beykoz.edu.tr/pdf/app.php'), 'utf8'), /PDF_ROUTE.*app/);
});
