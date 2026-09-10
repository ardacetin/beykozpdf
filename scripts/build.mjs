import { execFileSync } from "node:child_process";
import {
  readdirSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const base = new URL(
  process.env.APP_URL || "https://my.beykoz.edu.tr/pdf",
).pathname.replace(/\/$/, "");
execFileSync("npm", ["run", "build:docker", "--prefix", "engine"], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    BASE_URL: `${base}/engine/`,
    SIMPLE_MODE: "true",
    COMPRESSION_MODE: "o",
    VITE_DEFAULT_LANGUAGE: "tr",
    VITE_BRAND_NAME: "PDF Düzenle",
    VITE_BRAND_LOGO: "beykoz-brand.svg",
    VITE_FOOTER_TEXT: "Beykoz Üniversitesi · PDF Düzenle",
    NODE_OPTIONS: "--max-old-space-size=6144",
    VITE_WASM_PYMUPDF_URL:
      "https://cdn.jsdelivr.net/npm/@bentopdf/pymupdf-wasm@0.11.16/",
    VITE_WASM_GS_URL:
      "https://cdn.jsdelivr.net/npm/@bentopdf/gs-wasm@0.1.1/assets/",
    VITE_WASM_CPDF_URL: "https://cdn.jsdelivr.net/npm/coherentpdf@2.5.5/dist/",
  },
});
const dist = path.join(root, "engine/dist");
copyFileSync(
  path.join(root, "web/public/brand.svg"),
  path.join(dist, "beykoz-brand.svg"),
);
copyFileSync(
  path.join(root, "web/private/engine-theme.css"),
  path.join(dist, "beykoz-theme.css"),
);
writeFileSync(
  path.join(dist, "beykoz-theme.js"),
  `document.documentElement.classList.add('theme-light');document.documentElement.lang='tr';localStorage.setItem('i18nextLng','tr');`,
);
function visit(dir) {
  for (const file of readdirSync(dir, { withFileTypes: true })) {
    const name = path.join(dir, file.name);
    if (file.isDirectory()) visit(name);
    else if (file.name.endsWith(".html")) {
      let html = readFileSync(name, "utf8");
      html = html
        .replace(
          /<head>/i,
          `<head><script src="${base}/engine/beykoz-theme.js"></script>`,
        )
        .replace(
          /<\/head>/i,
          `<link rel="stylesheet" href="${base}/engine/beykoz-theme.css"></head>`,
        )
        .replace(
          /<title>[\s\S]*?<\/title>/i,
          "<title>PDF Düzenle · Beykoz Üniversitesi</title>",
        )
        .replace(
          /<meta\s+name="robots"[\s\S]*?>/gi,
          '<meta name="robots" content="noindex,nofollow">',
        );
      writeFileSync(name, html);
    }
  }
}
visit(dist);
mkdirSync(path.join(root, "dist"), { recursive: true });
writeFileSync(
  path.join(root, "dist/build.json"),
  JSON.stringify({ base, builtAt: new Date().toISOString() }),
);
console.info(`PDF Düzenle hazır: ${base}`);
await import('./package-php.mjs');
