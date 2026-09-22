import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PDFDocument, StandardFonts } from 'pdf-lib';

const DOCX = Buffer.from(
  'UEsDBAoAAAAIAOQ2K115bjPX6AAAAK0BAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH1QyU7DMBD9FWuuKHHggBCK0wPLETiUDxjZk8SqN3nc0v49Tlt6QIXjzFv1+tXeO7GjzDYGBbdtB4KCjsaGScHn+rV5AMEFg0EXAyk4EMNq6NeHRCyqNrCCuZT0KCXrmTxyGxOFiowxeyz1zJNMqDc4kbzrunupYygUSlMWDxj6Zxpx64p42df3qUcmxyCeTsQlSwGm5KzGUnG5C+ZXSnNOaKvyyOHZJr6pBJBXExbk74Cz7r0Ok60h8YG5vKGvLPkVs5Em6q2vyvZ/mys94zhaTRf94pZy1MRcF/euvSAebfjpL49zD99QSwMECgAAAAAA5DYrXQAAAAAAAAAAAAAAAAYAAABfcmVscy9QSwMECgAAAAgA5DYrXZv9N+qtAAAAKQEAAAsAAABfcmVscy8ucmVsc43POw7CMAwG4KtE3mlaBoRQ0y4IqSsqB7ASN61oHkrCo7cnAwNFDIy2f3+W6/ZpZnanECdnBVRFCYysdGqyWsClP232wGJCq3B2lgQsFKFt6jPNmPJKHCcfWTZsFDCm5A+cRzmSwVg4TzZPBhcMplwGzT3KK2ri27Lc8fBpwNpknRIQOlUB6xdP/9huGCZJRydvhmz6ceIrkWUMmpKAhwuKq3e7yCzwpuarF5sXUEsDBAoAAAAAAOQ2K10AAAAAAAAAAAAAAAAFAAAAd29yZC9QSwMECgAAAAgA5DYrXdjeUL3XAAAAJgEAABEAAAB3b3JkL2RvY3VtZW50LnhtbEWPX0rEMBDGrxLy7qZVKLW0XZBlnxfUA8RkbIPNTEiitT2LR/FtL2YSWHz55v+Pb/rjt13YF/hgCAdeHyrOABVpg9PAX1/Ody1nIUrUciGEgW8Q+HHs106T+rSAkSUAhm4d+Byj64QIagYrw4EcYJq9k7cyptJPYiWvnScFISS+XcR9VTXCSoM8I99Ibzm6LD5LHJ9g+6CdXX/QFJcRgmGX05mdrr874AIsdaLpRV7O6osWRAAVL4XjpuedrdlkXT9WDU/5nPKmfWi5KAe3XXGzIf5fHP8AUEsBAhQACgAAAAgA5DYrXXluM9foAAAArQEAABMAAAAAAAAAAAAAAAAAAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAAKAAAAAADkNitdAAAAAAAAAAAAAAAABgAAAAAAAAAAABAAAAAZAQAAX3JlbHMvUEsBAhQACgAAAAgA5DYrXZv9N+qtAAAAKQEAAAsAAAAAAAAAAAAAAAAAPQEAAF9yZWxzLy5yZWxzUEsBAhQACgAAAAAA5DYrXQAAAAAAAAAAAAAAAAUAAAAAAAAAAAAQAAAAEwIAAHdvcmQvUEsBAhQACgAAAAgA5DYrXdjeUL3XAAAAJgEAABEAAAAAAAAAAAAAAAAANgIAAHdvcmQvZG9jdW1lbnQueG1sUEsFBgAAAAAFAAUAIAEAADwDAAAAAA==',
  'base64',
);

async function signIn(page) {
  await page.goto('/pdf/');
  await page.getByRole('link', { name: 'Google Workspace ile giriş yap' }).click();
  await page.getByRole('button', { name: 'Test hesabıyla devam et' }).click();
}

test('Word belgesini tarayıcıda PDF dosyasına dönüştürür', async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  await page.goto('/pdf/app.php?tool=word-to-pdf');
  const frame = page.frameLocator('#engine-frame');
  await frame.locator('#file-input').setInputFiles({
    name: 'beykoz-test.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    buffer: DOCX,
  });
  const downloadPromise = page.waitForEvent('download', { timeout: 150_000 });
  await frame.locator('#process-btn').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('beykoz-test.pdf');
  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-');
});

test('PDF belgesini tarayıcıda Word dosyasına dönüştürür', async ({ page }) => {
  test.setTimeout(180_000);
  const source = await PDFDocument.create();
  const font = await source.embedFont(StandardFonts.Helvetica);
  const sourcePage = source.addPage([595, 842]);
  sourcePage.drawText('Beykoz University PDF to Word test', {
    x: 72,
    y: 770,
    size: 18,
    font,
  });

  await signIn(page);
  await page.goto('/pdf/app.php?tool=pdf-to-docx');
  const frame = page.frameLocator('#engine-frame');
  await frame.locator('#file-input').setInputFiles({
    name: 'beykoz-pdf-test.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from(await source.save()),
  });
  await expect(frame.locator('#process-btn')).toBeVisible();
  const downloadPromise = page.waitForEvent('download', { timeout: 150_000 });
  await frame.locator('#process-btn').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe('beykoz-pdf-test.docx');
  const bytes = readFileSync(await download.path());
  expect(bytes.subarray(0, 2).toString()).toBe('PK');
  expect(bytes.includes(Buffer.from('word/document.xml'))).toBe(true);
});
