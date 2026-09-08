import { SAML } from "@node-saml/node-saml";
export function createSaml(config, redis) {
  if (!config.configured) return null;
  const ttl = 300_000;
  const cacheProvider = redis
    ? {
        async saveAsync(key, value) {
          const record = { createdAt: Date.now(), value };
          const saved = await redis.set(
            `pdf:saml:${key}`,
            JSON.stringify(record),
            { PX: ttl, NX: true },
          );
          return saved ? record : null;
        },
        async getAsync(key) {
          const record = await redis.get(`pdf:saml:${key}`);
          return record ? JSON.parse(record).value : null;
        },
        async removeAsync(key) {
          return redis.getDel(`pdf:saml:${key}`);
        },
      }
    : undefined;
  return new SAML({
    callbackUrl: `${config.appUrl}/auth/saml/acs`,
    issuer: config.issuer,
    audience: config.issuer,
    entryPoint: config.entryPoint,
    idpIssuer: config.idpIssuer,
    idpCert: config.cert,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: true,
    validateInResponseTo: "always",
    requestIdExpirationPeriodMs: ttl,
    maxAssertionAgeMs: ttl,
    acceptedClockSkewMs: 30_000,
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    disableRequestedAuthnContext: true,
    signatureAlgorithm: "sha256",
    digestAlgorithm: "sha256",
    ...(cacheProvider ? { cacheProvider } : {}),
  });
}

// Validate the recipient from the assertion already verified by node-saml.
export function validateRecipient(profile, callback) {
  const assertion = profile?.getAssertion?.()?.Assertion;
  const confirmations = assertion?.Subject?.[0]?.SubjectConfirmation;
  if (
    !Array.isArray(confirmations) ||
    confirmations.length !== 1 ||
    assertion?.Conditions?.length !== 1
  )
    return false;
  const confirmation = confirmations[0];
  const data = confirmation.SubjectConfirmationData?.[0]?.$;
  return (
    confirmation.$?.Method === "urn:oasis:names:tc:SAML:2.0:cm:bearer" &&
    data?.Recipient === callback &&
    typeof data.InResponseTo === "string" &&
    Number.isFinite(Date.parse(data.NotOnOrAfter))
  );
}
