import express from "express";
import session from "express-session";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { readFileSync } from "node:fs";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { validateRecipient } from "./saml.mjs";
import { authorizedUser } from "./config.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
const same = (a, b) =>
  typeof a === "string" &&
  typeof b === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
const save = (req) =>
  new Promise((resolve, reject) =>
    req.session.save((e) => (e ? reject(e) : resolve())),
  );
const regenerate = (req) =>
  new Promise((resolve, reject) =>
    req.session.regenerate((e) => (e ? reject(e) : resolve())),
  );

export function createApp({ config, saml, store }) {
  const app = express();
  const base = config.basePath || "";
  const html = (file) =>
    readFileSync(path.join(root, file), "utf8").replaceAll("{{BASE}}", base);
  app.disable("x-powered-by");
  app.set("trust proxy", config.trustProxy);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'wasm-unsafe-eval'",
            "'unsafe-eval'",
            "blob:",
            "https://cdn.jsdelivr.net",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
          ],
          fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "blob:"],
          workerSrc: ["'self'", "blob:"],
          connectSrc: [
            "'self'",
            "blob:",
            "https://cdn.jsdelivr.net",
            "https://tessdata.projectnaptha.com",
            "https://fonts.gstatic.com",
          ],
          frameSrc: ["'self'", "blob:"],
          frameAncestors: ["'self'"],
          objectSrc: ["'none'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: config.production ? [] : null,
        },
      },
      referrerPolicy: { policy: "same-origin" },
      strictTransportSecurity: config.production ? undefined : false,
      crossOriginEmbedderPolicy: { policy: "require-corp" },
    }),
  );
  app.use((_req, res, next) => {
    res.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    next();
  });
  app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
  app.get("/robots.txt", (_req, res) =>
    res.type("text").send("User-agent: *\nDisallow: /\n"),
  );
  app.use(
    "/public",
    express.static(path.join(root, "web/public"), {
      index: false,
      maxAge: "1h",
    }),
  );
  app.use(
    session({
      name: config.production ? "__Host-pdf.sid" : "pdf.sid",
      secret: config.sessionSecret,
      store,
      resave: false,
      saveUninitialized: false,
      rolling: false,
      cookie: {
        httpOnly: true,
        secure: config.production,
        sameSite: config.production ? "none" : "lax",
        maxAge: 8 * 60 * 60 * 1000,
        path: "/",
      },
    }),
  );
  app.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.get("/", (req, res) =>
    req.session.user
      ? res.redirect(`${base}/app`)
      : res.type("html").send(html("web/public/login.html")),
  );
  app.get("/auth/status", (_req, res) =>
    res.json({ configured: Boolean(saml) }),
  );
  const limiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 40,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: "Çok fazla giriş denemesi. Lütfen 15 dakika sonra tekrar deneyin.",
  });
  app.get("/auth/saml/login", limiter, async (req, res) => {
    if (!saml) return res.redirect(`${base}/?error=configuration`);
    const relay = randomBytes(32).toString("hex");
    req.session.samlFlow = { relay, started: Date.now() };
    const target = await saml.getAuthorizeUrlAsync(relay, undefined, {});
    await save(req);
    res.redirect(target);
  });
  app.get("/auth/saml/metadata", (_req, res) => {
    if (!saml)
      return res
        .status(503)
        .type("text")
        .send("SAML yapılandırması henüz tamamlanmadı.");
    res
      .type("application/samlmetadata+xml")
      .send(saml.generateServiceProviderMetadata(null, null));
  });
  app.post(
    "/auth/saml/acs",
    limiter,
    express.urlencoded({ extended: false, limit: "256kb" }),
    async (req, res) => {
      if (!saml) return res.status(503).send("SAML yapılandırması eksik.");
      const flow = req.session.samlFlow;
      if (
        !flow ||
        !same(req.body.RelayState, flow.relay) ||
        Date.now() - flow.started > 300_000
      )
        return res.redirect(`${base}/?error=session`);
      delete req.session.samlFlow;
      await save(req);
      try {
        const { profile, loggedOut } = await saml.validatePostResponseAsync({
          SAMLResponse: req.body.SAMLResponse,
        });
        const user =
          !loggedOut &&
          validateRecipient(profile, `${config.appUrl}/auth/saml/acs`) &&
          authorizedUser(profile, config.idpIssuer);
        if (!user) return res.redirect(`${base}/?error=domain`);
        await regenerate(req);
        req.session.user = user;
        req.session.csrf = randomBytes(32).toString("hex");
        await save(req);
        return res.redirect(`${base}/app`);
      } catch {
        // Never log assertions, certificates, account attributes or session tokens.
        console.warn("SAML authentication rejected");
        return res.redirect(`${base}/?error=authentication`);
      }
    },
  );
  app.use((req, res, next) => {
    if (req.session.user) return next();
    if (req.path.startsWith("/api/"))
      return res.status(401).json({ error: "Oturum açmanız gerekiyor." });
    return res.redirect(`${base}/`);
  });
  app.get("/api/me", (req, res) =>
    res.json({ ...req.session.user, csrf: req.session.csrf }),
  );
  app.post(
    "/auth/logout",
    express.urlencoded({ extended: false, limit: "2kb" }),
    (req, res, next) => {
      if (
        req.get("origin") !== config.origin ||
        !same(req.body.csrf, req.session.csrf)
      )
        return res.status(403).send("İstek doğrulanamadı.");
      req.session.destroy((error) => {
        if (error) return next(error);
        res.clearCookie(config.production ? "__Host-pdf.sid" : "pdf.sid", {
          path: "/",
          httpOnly: true,
          secure: config.production,
          sameSite: config.production ? "none" : "lax",
        });
        return res.redirect(`${base}/`);
      });
    },
  );
  app.get("/app", (_req, res) =>
    res.type("html").send(html("web/private/index.html")),
  );
  app.use(
    "/app",
    express.static(path.join(root, "web/private"), { index: false }),
  );
  app.get(["/engine", "/engine/", "/engine/index.html"], (_req, res) =>
    res.redirect(`${base}/app`),
  );
  app.use(
    "/engine",
    express.static(path.join(root, "engine/dist"), {
      extensions: ["html"],
      index: false,
      setHeaders: (res) => res.set("Cache-Control", "private, no-store"),
    }),
  );
  app.get("/source", (_req, res) =>
    res.download(path.join(root, "dist/pdf-duzenle-source.tar.gz")),
  );
  app.use((_req, res) =>
    res
      .status(404)
      .type("text")
      .send("Sayfa bulunamadı. Araçlara dönmek için /app adresini kullanın."),
  );
  app.use((error, _req, res, _next) => {
    console.error("Request failed:", error.code || "internal_error");
    res
      .status(error.type === "entity.too.large" ? 413 : 500)
      .type("text")
      .send("İşlem tamamlanamadı. Lütfen tekrar deneyin.");
  });
  if (!base) return app;
  const mounted = express();
  mounted.disable("x-powered-by");
  mounted.use(base, app);
  return mounted;
}
