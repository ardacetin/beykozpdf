import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";
async function signIn(page) {
  await page.goto("/pdf/");
  await page
    .getByRole("link", { name: "Google Workspace ile giriş yap" })
    .click();
  await page.getByRole("button", { name: "Test hesabıyla devam et" }).click();
  await expect(page).toHaveURL(/\/pdf\/app\.php$/);
  await expect(page.locator(".tool-card")).toHaveCount(35);
}
test("desktop landing, workspace search, favorites, dialogs and logout", async ({
  page,
}) => {
  await page.goto("/pdf/");
  await expect(
    page.getByRole("heading", { name: "Hoş geldiniz." }),
  ).toBeVisible();
  await expect(page.locator(".landing-footer")).toContainText(
    "Beykoz Üniversitesi Bilgi İşlem Direktörlüğü",
  );
  await expect(page.locator('script[src*="/public/login.js"]')).toHaveAttribute(
    "src",
    /login\.js\?v=\d+$/,
  );
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Yardım alın" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await signIn(page);
  for (const id of [
    "pdf-to-excel",
    "pdf-to-text",
    "extract-images",
    "repair-pdf",
    "remove-blank-pages",
    "deskew-pdf",
    "compare-pdfs",
    "form-filler",
    "header-footer",
    "table-of-contents",
  ]) {
    await expect(page.locator(`.tool-link[href="?tool=${id}"]`)).toBeVisible();
  }
  await expect(page.locator(".workspace-footer")).toContainText(
    "Beykoz Üniversitesi Bilgi İşlem Direktörlüğü",
  );
  await expect(
    page.locator('script[src*="/app-assets/workspace.js"]'),
  ).toHaveAttribute("src", /workspace\.js\?v=\d+$/);
  await page.getByRole("button", { name: "Uygulama hakkında" }).click();
  await expect(
    page.getByRole("link", { name: /Kaynak kodu GitHub’da görüntüle/ }),
  ).toHaveAttribute("href", "https://github.com/ardacetin/beykozpdf");
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: "test-results/workspace-desktop.png",
    fullPage: true,
  });
  await page
    .locator("#filter-pills")
    .getByRole("button", { name: "Dönüştür", exact: true })
    .click();
  await expect(page.locator(".tool-card")).toHaveCount(11);
  await expect(
    page.getByRole("link", { name: /PDF’den Word’e/ }),
  ).toBeVisible();
  await page
    .locator("#filter-pills")
    .getByRole("button", { name: "Tüm araçlar", exact: true })
    .click();
  await page.getByRole("searchbox").fill("sikistir");
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page.getByRole("searchbox").fill("bulunmayan");
  await expect(page.locator("#empty-state")).toBeVisible();
  await page.getByRole("button", { name: "Tüm araçları göster" }).click();
  await page
    .getByRole("button", {
      name: "PDF birleştir: favorilere ekle",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Favorilerim", exact: true }).click();
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page.reload();
  await page.getByRole("button", { name: "Favorilerim", exact: true }).click();
  await expect(page.locator(".tool-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Hesap menüsünü aç" }).click();
  await page.getByRole("button", { name: "Oturumu kapat" }).click();
  await expect(page).toHaveURL(/\/pdf\/$/);
  await page.goto("/pdf/engine/merge-pdf.php");
  await expect(page).toHaveURL(/\/pdf\/$/);
});
test("mobile views have no horizontal overflow and navigation works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/pdf/");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/login-mobile.png",
    fullPage: true,
  });
  await signIn(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: "test-results/workspace-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await page
    .locator("#category-nav")
    .getByRole("button", { name: "Güvenlik", exact: true })
    .click();
  await expect(page.locator(".tool-card")).toHaveCount(4);
});
test("real PDF merge downloads a valid three-page PDF without file uploads", async ({
  page,
}) => {
  await signIn(page);
  expect(await page.evaluate(() => window.crossOriginIsolated)).toBe(true);
  const writes = [];
  page.on("request", (r) => {
    if (["POST", "PUT", "PATCH"].includes(r.method())) writes.push(r.url());
  });
  await page.locator('.tool-link[href="?tool=merge-pdf"]').click();
  const frame = page.frameLocator("#engine-frame");
  await expect(frame.locator("#file-input")).toBeAttached();
  const a = await PDFDocument.create();
  a.addPage([300, 400]);
  const b = await PDFDocument.create();
  b.addPage([400, 500]);
  b.addPage([500, 600]);
  await frame.locator("#file-input").setInputFiles([
    {
      name: "ders-notu.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(await a.save()),
    },
    {
      name: "rapor.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from(await b.save()),
    },
  ]);
  await expect(frame.locator("#process-btn")).toBeEnabled();
  const downloadPromise = page.waitForEvent("download");
  await frame.locator("#process-btn").click();
  const download = await downloadPromise;
  const result = await PDFDocument.load(readFileSync(await download.path()));
  expect(result.getPageCount()).toBe(3);
  expect(result.getPage(0).getWidth()).toBe(300);
  expect(result.getPage(2).getHeight()).toBe(600);
  expect(writes).toEqual([]);
  await frame.locator("#alert-ok").click();
  expect(
    await page
      .locator("#engine-frame")
      .evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThan(1200);
  await page.screenshot({
    path: "test-results/merge-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Tüm araçlar", exact: true }).click();
  await expect(page.locator(".tool-card")).toHaveCount(35);
});

test("PDF.js tools load, split and convert a real PDF to JPG and PNG", async ({
  page,
}) => {
  await signIn(page);
  const document = await PDFDocument.create();
  document.addPage([320, 240]);
  const input = {
    name: "ornek.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await document.save()),
  };

  for (const [tool, extension] of [
    ["pdf-to-jpg", ".jpg"],
    ["pdf-to-png", ".png"],
  ]) {
    await page.locator(`.tool-link[href="?tool=${tool}"]`).click();
    const frame = page.frameLocator("#engine-frame");
    await frame.locator("#file-input").setInputFiles(input);
    const downloadPromise = page.waitForEvent("download");
    await frame.locator("#process-btn").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(new RegExp(`\\${extension}$`));
    await page.locator("#back-to-tools").click();
  }

  await page.locator('.tool-link[href="?tool=split-pdf"]').click();
  const splitFrame = page.frameLocator("#engine-frame");
  await splitFrame.locator("#file-input").setInputFiles(input);
  await expect(splitFrame.locator("#split-options")).toBeVisible();
  await expect(splitFrame.locator("#file-display-area")).toContainText(
    "1 sayfa",
  );
});

test("tool controls, help copy and messages are localized in Turkish", async ({
  page,
}) => {
  await signIn(page);
  const cases = [
    ["compress-pdf", "Sıkıştırma Algoritması", "Compression Algorithm"],
    ["split-pdf", "Bölme Modu", "Split Mode"],
    ["word-to-pdf", "Word'den PDF'ye", "Word to PDF"],
    ["pdf-to-docx", "PDF'den Word'e", "PDF to Word"],
    ["pdf-to-excel", "PDF'den Excel'e", "PDF to Excel"],
    ["pdf-to-text", "PDF'den Metne", "PDF to Text"],
    ["extract-images", "Görüntüleri Çıkar", "Extract Images"],
    ["repair-pdf", "PDF'yi Onar", "Repair PDF"],
    ["remove-blank-pages", "Boş Sayfaları Kaldır", "Remove Blank Pages"],
    ["deskew-pdf", "PDF Eğriliğini Düzelt", "Deskew PDF"],
    ["compare-pdfs", "PDF'leri Karşılaştır", "Compare PDFs"],
    ["form-filler", "PDF Form Doldurucu", "PDF Form Filler"],
    ["header-footer", "Üst Bilgi ve Alt Bilgi", "Header & Footer"],
    ["table-of-contents", "İçindekiler", "Table of Contents"],
    ["ocr-pdf", "Belgedeki Diller", "Languages in Document"],
    ["edit-metadata", "Belge Bilgilerini Düzenle", "Edit Metadata"],
  ];

  for (const [tool, translated, english] of cases) {
    await page.goto(`/pdf/app.php?tool=${tool}`);
    const frame = page.frameLocator("#engine-frame");
    await expect(frame.locator("#tool-uploader")).toContainText(translated);
    await expect(frame.locator("#tool-uploader")).not.toContainText(english);
  }

  await page.goto("/pdf/app.php?tool=ocr-pdf");
  const ocrFrame = page.frameLocator("#engine-frame");
  await expect(ocrFrame.locator("#lang-list")).toContainText("İngilizce");
  await expect(ocrFrame.locator("#lang-list")).toContainText("Türkçe");

  await page.goto("/pdf/app.php?tool=compress-pdf");
  const compressFrame = page.frameLocator("#engine-frame");
  await compressFrame.locator("#process-btn").dispatchEvent("click");
  await expect(compressFrame.locator("#alert-title")).toHaveText("Dosya Yok");
  await expect(compressFrame.locator("#alert-message")).toHaveText(
    "Lütfen en az bir PDF dosyası seçin.",
  );
});

test("new tool screens accept real PDF files", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  const document = await PDFDocument.create();
  document.addPage([595, 842]);
  const input = {
    name: "beykoz-arac-testi.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from(await document.save()),
  };
  const cases = [
    ["pdf-to-excel", "#options-panel"],
    ["pdf-to-text", "#extract-options"],
    ["extract-images", "#extract-options"],
    ["repair-pdf", "#process-btn"],
    ["remove-blank-pages", "#options-panel"],
    ["deskew-pdf", "#deskew-options"],
    ["form-filler", "#form-filler-options"],
    ["header-footer", "#options-panel"],
    ["table-of-contents", "#file-display-area"],
  ];

  for (const [tool, readySelector] of cases) {
    await page.goto(`/pdf/app.php?tool=${tool}`);
    const frame = page.frameLocator("#engine-frame");
    await frame.locator("#file-input").setInputFiles(input);
    await expect(frame.locator(readySelector)).toBeVisible();
  }

  await page.goto("/pdf/app.php?tool=compare-pdfs");
  const compareFrame = page.frameLocator("#engine-frame");
  await compareFrame.locator("#file-input-1").setInputFiles(input);
  await compareFrame.locator("#file-input-2").setInputFiles(input);
  await expect(compareFrame.locator("#compare-viewer")).toBeVisible();
});
