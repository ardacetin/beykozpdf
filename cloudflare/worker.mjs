// PDF Düzenle on Cloudflare Workers. Mirrors php/app.php: the same .php
// URLs, Google Workspace SAML sign-in, and the same protected engine files.
// Sessions are HMAC-signed cookies, so no database or KV store is needed.
import maintenancePage from "../php/public/maintenance.html";
import { SamlError, loginRedirect, metadata, randomId, verifyResponse } from "./saml.mjs";

const SESSION_SECONDS = 28800;
const FLOW_SECONDS = 300;
const CSP =
  "default-src 'self'; script-src 'self' 'wasm-unsafe-eval' 'unsafe-eval' blob: https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self' blob: https://cdn.jsdelivr.net https://tessdata.projectnaptha.com https://fonts.gstatic.com; frame-src 'self' blob:; frame-ancestors 'self'; object-src 'none'; form-action 'self'";
const ROUTES = {
  "/": "home", "/index.php": "home", "/app.php": "app", "/login.php": "login",
  "/saml-acs.php": "acs", "/metadata.php": "metadata", "/logout.php": "logout",
  "/me.php": "me", "/healthz.php": "health", "/auth-status.php": "status",
  "/source.php": "source",
};
const CONTENT_TYPES = {
  html: "text/html; charset=utf-8",
  javascript: "application/javascript; charset=utf-8",
  "wasm-gzip": "application/wasm",
  "data-gzip": "application/octet-stream",
};

class ConfigError extends Error {}

function loadConfig(env) {
  const url = (env.APP_URL || "https://pdf.beykoz.edu.tr").replace(/\/+$/, "");
  const parsed = new URL(url);
  const testing = env.PDF_TESTING === "1" && parsed.hostname === "127.0.0.1";
  if (parsed.search || parsed.hash || parsed.username || parsed.password ||
      !/^\/[a-zA-Z0-9/_-]*$/.test(parsed.pathname) ||
      (!testing && parsed.protocol !== "https:")) {
    throw new ConfigError("Invalid APP_URL");
  }
  const entry = (env.SAML_ENTRY_POINT || "").trim();
  const issuer = (env.SAML_IDP_ISSUER || "").trim();
  const cert = (env.SAML_IDP_CERT || "").trim();
  const configured = entry !== "" && issuer !== "" && cert !== "";
  if ((entry || issuer) && !cert) throw new ConfigError("Incomplete SAML configuration: SAML_IDP_CERT is empty");
  if ((entry || issuer) && !configured) throw new ConfigError("Incomplete SAML configuration: SAML_ENTRY_POINT and SAML_IDP_ISSUER are both required");
  if (entry && new URL(entry).protocol !== "https:" && !(testing && new URL(entry).hostname === "127.0.0.1")) {
    throw new ConfigError("SSO requires HTTPS");
  }
  if ((env.SESSION_SECRET || "").length < 32) throw new ConfigError("SESSION_SECRET must be at least 32 characters");
  return {
    url, base: parsed.pathname.replace(/\/+$/, ""), origin: parsed.origin, secure: !testing,
    configured, entry, issuer, cert,
    entity: env.SAML_SP_ENTITY_ID || url + "/metadata.php",
    acs: url + "/saml-acs.php",
    secret: env.SESSION_SECRET,
  };
}

// --- Signed cookies --------------------------------------------------------

const encoder = new TextEncoder();
const b64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (text) =>
  Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
const keys = new Map();
function hmacKey(secret) {
  if (!keys.has(secret)) {
    keys.set(secret, crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]));
  }
  return keys.get(secret);
}
async function seal(config, purpose, data, seconds) {
  const body = b64url(encoder.encode(JSON.stringify({ ...data, purpose, exp: Math.floor(Date.now() / 1000) + seconds })));
  const mac = await crypto.subtle.sign("HMAC", await hmacKey(config.secret), encoder.encode(body));
  return `${body}.${b64url(mac)}`;
}
async function unseal(config, purpose, value) {
  try {
    const [body, mac] = (value || "").split(".");
    if (!body || !mac) return null;
    if (!(await crypto.subtle.verify("HMAC", await hmacKey(config.secret), unb64url(mac), encoder.encode(body)))) return null;
    const data = JSON.parse(new TextDecoder().decode(unb64url(body)));
    return data.purpose === purpose && data.exp > Date.now() / 1000 ? data : null;
  } catch {
    return null;
  }
}
function cookieName(config, name) {
  return config.secure ? `__Host-pdf_${name}` : `pdf_test_${name}`;
}
function readCookie(request, name) {
  for (const part of (request.headers.get("Cookie") || "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}
function setCookie(config, name, value, seconds) {
  const flags = config.secure ? "Secure; HttpOnly; SameSite=None" : "HttpOnly; SameSite=Lax";
  return `${cookieName(config, name)}=${value}; Path=/; Max-Age=${seconds}; ${flags}`;
}

// --- Responses -------------------------------------------------------------

// Every dynamic response is constructed here, so its headers are mutable.
function secure(response) {
  const headers = response.headers;
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "SAMEORIGIN");
  headers.set("Referrer-Policy", "same-origin");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  headers.set("Content-Security-Policy", CSP);
  return response;
}
const redirect = (location, cookies = []) => {
  const headers = new Headers({ Location: location });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
};
const text = (status, message, headers = {}) =>
  new Response(message, { status, headers: { "Content-Type": "text/plain; charset=utf-8", ...headers } });
const json = (data, status = 200) => Response.json(data, { status });

function maintenance(route, error) {
  const headers = { "Retry-After": "300", "Cache-Control": "no-store" };
  if (["me", "status", "health"].includes(route)) {
    const body = { error: "maintenance" };
    // Config messages name the missing setting, never its value; the health
    // check shows it so a misconfiguration can be diagnosed without log access.
    if (route === "health" && error instanceof ConfigError) body.reason = error.message;
    return new Response(JSON.stringify(body), { status: 503, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });
  }
  return new Response(maintenancePage.replaceAll("{{YEAR}}", String(new Date().getFullYear())), {
    status: 503, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" },
  });
}

// --- Packaged files --------------------------------------------------------

let manifestPromise = null;
async function manifest(env, origin) {
  manifestPromise ??= env.ASSETS.fetch(new URL("/_private/manifest.json", origin)).then((r) => {
    if (!r.ok) throw new ConfigError("Package manifest missing");
    return r.json();
  });
  try {
    return await manifestPromise;
  } catch (error) {
    manifestPromise = null;
    throw error;
  }
}
async function privateFile(env, origin, file) {
  const response = await env.ASSETS.fetch(new URL(`/_private/${file}`, origin));
  if (!response.ok) throw new ConfigError(`Packaged file missing: ${file}`);
  return response;
}
async function template(env, origin, file, config, version) {
  const html = await (await privateFile(env, origin, file)).text();
  return new Response(html.replaceAll("{{BASE}}", config.base).replaceAll("{{VERSION}}", version), {
    headers: { "Content-Type": CONTENT_TYPES.html },
  });
}
async function engineFile(env, origin, entry) {
  const headers = { "Content-Type": CONTENT_TYPES[entry.type] };
  if (entry.type.endsWith("-gzip")) headers["Content-Encoding"] = "gzip";
  if (!entry.parts) {
    const response = await privateFile(env, origin, entry.file);
    return new Response(response.body, { headers, encodeBody: "manual" });
  }
  // Files above the 25 MiB static asset limit are packaged as ordered parts.
  const { readable, writable } = new TransformStream();
  (async () => {
    try {
      for (const part of entry.parts) {
        await (await privateFile(env, origin, part)).body.pipeTo(writable, { preventClose: true });
      }
      await writable.close();
    } catch (error) {
      await writable.abort(error);
    }
  })();
  headers["Content-Length"] = String(entry.size);
  return new Response(readable, { headers, encodeBody: "manual" });
}

// --- Routes ----------------------------------------------------------------

async function handle(request, env, config, route, path) {
  const origin = new URL(request.url).origin;
  const base = config.base;
  const method = request.method;
  if (route === "acs" && (method === "GET" || method === "HEAD")) {
    console.warn(`PDF Düzenle: SAML ACS received ${method} instead of POST; check that Google ACS URL is exactly ${config.acs}`);
    return redirect(`${base}/?error=session`);
  }
  const expected = route === "acs" || route === "logout" ? "POST" : "GET";
  if (method !== expected && !(expected === "GET" && method === "HEAD")) {
    return text(405, "Bu yöntem desteklenmiyor.", { Allow: expected });
  }
  if (Number(request.headers.get("Content-Length") || 0) > 262144) return text(413, "İstek çok büyük.");

  const pkg = await manifest(env, origin);
  const session = await unseal(config, "session", readCookie(request, cookieName(config, "session")));

  if (route === "health") return json({ status: "ok", runtime: "cloudflare" });
  if (route === "status") return json({ configured: config.configured });
  if (route === "home") {
    if (session) return redirect(`${base}/app.php`);
    return template(env, origin, "web/public/login.html", config, pkg.version);
  }
  if (route === "login" || route === "acs" || route === "metadata") {
    if (!config.configured) {
      if (route === "login") return redirect(`${base}/?error=configuration`);
      return text(503, "Google Workspace SAML yapılandırması henüz tamamlanmadı.");
    }
    if (route === "metadata") {
      return new Response(metadata(config), { headers: { "Content-Type": "application/samlmetadata+xml; charset=utf-8" } });
    }
    if (route === "login") {
      const relay = randomId(32);
      const { id, location } = await loginRedirect(config, relay);
      const flow = await seal(config, "saml", { relay, id }, FLOW_SECONDS);
      return redirect(location, [setCookie(config, "saml", flow, FLOW_SECONDS)]);
    }
    // Single use: the flow cookie is cleared on every outcome.
    const clearFlow = setCookie(config, "saml", "", 0);
    const flow = await unseal(config, "saml", readCookie(request, cookieName(config, "saml")));
    const form = await request.formData();
    const relay = form.get("RelayState");
    if (!flow || typeof relay !== "string" || relay !== flow.relay) {
      return redirect(`${base}/?error=session`, [clearFlow]);
    }
    let email;
    try {
      email = verifyResponse(form.get("SAMLResponse"), config, flow.id);
    } catch (error) {
      if (!(error instanceof SamlError)) throw error;
      console.warn(`PDF Düzenle: SAML authentication rejected; ${error.message}`);
      return redirect(`${base}/?error=authentication`, [clearFlow]);
    }
    if (!/^[^@\s]+@beykoz\.edu\.tr$/.test(email)) return redirect(`${base}/?error=domain`, [clearFlow]);
    const user = {
      email,
      name: email.split("@")[0].replace(/[._-]+/g, " "),
      csrf: randomId(32),
    };
    const sealed = await seal(config, "session", user, SESSION_SECONDS);
    return redirect(`${base}/app.php`, [clearFlow, setCookie(config, "session", sealed, SESSION_SECONDS)]);
  }

  if (!session) {
    if (route === "me") return json({ error: "Oturum açmanız gerekiyor." }, 401);
    return redirect(`${base}/`);
  }
  if (route === "me") return json({ email: session.email, name: session.name, csrf: session.csrf });
  if (route === "logout") {
    const form = await request.formData();
    const csrf = form.get("csrf");
    if (request.headers.get("Origin") !== config.origin || typeof csrf !== "string" || csrf !== session.csrf) {
      return text(403, "İstek doğrulanamadı.");
    }
    return redirect(`${base}/`, [setCookie(config, "session", "", 0)]);
  }
  if (route === "app") return template(env, origin, "web/private/index.html", config, pkg.version);
  if (route === "source") return redirect("https://github.com/ardacetin/beykozpdf");
  if (route === "engine") {
    const entry = pkg.routes[path];
    if (!entry) return text(404, "Araç bulunamadı.");
    return engineFile(env, origin, entry);
  }
  return text(404, "Sayfa bulunamadı.");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Known before config loads, so a broken config still answers JSON routes with JSON.
    let route = ROUTES["/" + url.pathname.split("/").pop()] || "home";
    try {
      const config = loadConfig(env);
      let path = url.pathname;
      if (config.base) {
        if (path === config.base) return redirect(`${config.base}/`);
        if (!path.startsWith(config.base + "/")) return text(404, "Sayfa bulunamadı.");
        path = path.slice(config.base.length);
      }
      if (path.startsWith("/_private/")) return text(404, "Sayfa bulunamadı.");
      route = ROUTES[path] || (path.startsWith("/engine/") && path.endsWith(".php") ? "engine" : null);
      // Everything else is a public static file (login styles, engine bundles).
      if (!route) return env.ASSETS.fetch(request);
      return secure(await handle(request, env, config, route, path));
    } catch (error) {
      console.error(`PDF Düzenle: ${error?.name}: ${String(error?.message).slice(0, 500)}`);
      return maintenance(route, error);
    }
  },
};
