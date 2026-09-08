import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

export function readConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  const appUrl = (env.APP_URL || "http://localhost:3000/pdf").replace(
    /\/$/,
    "",
  );
  const url = new URL(appUrl);
  if (
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    !/^\/[a-zA-Z0-9/_-]*$/.test(url.pathname)
  )
    throw new Error("APP_URL geçerli bir uygulama adresi olmalıdır.");
  if (production && url.protocol !== "https:")
    throw new Error("Production için APP_URL HTTPS olmalıdır.");
  if (production && (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32))
    throw new Error("SESSION_SECRET en az 32 karakter olmalıdır.");
  const cert =
    env.SAML_IDP_CERT_PATH && env.SAML_ENTRY_POINT
      ? readFileSync(env.SAML_IDP_CERT_PATH, "utf8")
      : "";
  const configured = Boolean(
    env.SAML_ENTRY_POINT && env.SAML_IDP_ISSUER && cert,
  );
  if (
    env.SAML_ENTRY_POINT &&
    new URL(env.SAML_ENTRY_POINT).protocol !== "https:"
  )
    throw new Error("SAML SSO URL HTTPS olmalıdır.");
  if (
    production &&
    (env.SAML_ENTRY_POINT || env.SAML_IDP_ISSUER) &&
    !configured
  )
    throw new Error("Google Workspace SAML ayarları eksik.");
  if (production && !env.REDIS_URL)
    throw new Error("Production için REDIS_URL gereklidir.");
  const trustProxy = Number(env.TRUST_PROXY_HOPS || 0);
  if (!Number.isInteger(trustProxy) || trustProxy < 0 || trustProxy > 5)
    throw new Error("TRUST_PROXY_HOPS 0–5 arasında olmalıdır.");
  return {
    production,
    appUrl,
    origin: url.origin,
    basePath: url.pathname.replace(/\/$/, ""),
    port: Number(env.PORT || 3000),
    trustProxy,
    sessionSecret: env.SESSION_SECRET || randomBytes(48).toString("hex"),
    redisUrl: env.REDIS_URL,
    configured,
    cert,
    entryPoint: env.SAML_ENTRY_POINT,
    idpIssuer: env.SAML_IDP_ISSUER,
    issuer: env.SAML_SP_ENTITY_ID || `${appUrl}/auth/saml/metadata`,
  };
}

export function authorizedUser(profile, idpIssuer) {
  if (
    !profile ||
    profile.issuer !== idpIssuer ||
    typeof profile.nameID !== "string"
  )
    return null;
  // Only the signed NameID is the account identity. Never trust a request parameter or optional email attribute.
  const email = profile.nameID.trim().toLowerCase();
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@beykoz\.edu\.tr$/.test(email))
    return null;
  return { email, name: email.split("@")[0].replace(/[._-]+/g, " ") };
}
