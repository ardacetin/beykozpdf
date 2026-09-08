import { test, expect } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "node:fs";
async function signIn(page) {
  await page.goto("/pdf/");
  await page
    .getByRole("link", { name: "Google Workspace ile giriş yap" })
    .click();
  await page.getByRole("button", { name: "Test hesabıyla devam et" }).click();
  await expect(page).toHaveURL(/\/pdf\/app$/);
  await expect(page.locator(".tool-card")).toHaveCount(24);
}
test("desktop landing, workspace search, favorites, dialogs and logout", async ({
  page,
}) => {
  await page.goto("/pdf/");
  await expect(
    page.getByRole("heading", { name: "Hoş geldiniz." }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/login-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Yardım alın" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await signIn(page);
  await page.screenshot({
    path: "test-results/workspace-desktop.png",
    fullPage: true,
  });
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
  await page.goto("/pdf/engine/merge-pdf.html");
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
  await expect(page.locator(".tool-card")).toHaveCount(24);
});
