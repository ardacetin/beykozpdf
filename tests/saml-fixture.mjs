// Ephemeral test IdP. No certificate or key is shared with a deployed server.
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { inflateRawSync } from "node:zlib";
import { randomUUID } from "node:crypto";
import { SignedXml } from "xml-crypto";
const dir = mkdtempSync(join(tmpdir(), "pdf-test-idp-"));
execFileSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-keyout",
    join(dir, "key.pem"),
    "-out",
    join(dir, "cert.pem"),
    "-nodes",
    "-days",
    "1",
    "-subj",
    "/CN=PDF Test Only",
  ],
  { stdio: "ignore" },
);
export const cert = readFileSync(join(dir, "cert.pem"), "utf8");
const key = readFileSync(join(dir, "key.pem"), "utf8");
rmSync(dir, { recursive: true });
export const idpIssuer = "https://test-idp.invalid/entity";
const c14n = "http://www.w3.org/2001/10/xml-exc-c14n#";
const escape = (x) =>
  String(x)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
export function requestInfo(location) {
  const url = new URL(location);
  const xml = inflateRawSync(
    Buffer.from(url.searchParams.get("SAMLRequest"), "base64"),
  ).toString();
  return {
    id: xml.match(/\bID="([^"]+)"/)[1],
    relay: url.searchParams.get("RelayState"),
  };
}
export function responseXml({
  id,
  callback,
  audience,
  email = "arda@beykoz.edu.tr",
  issuer = idpIssuer,
  expired = false,
  recipient = callback,
  unsigned = false,
  transform = (xml) => xml,
  signTags = ["Assertion", "Response"],
}) {
  const now = Date.now();
  const start = new Date(now - 60_000).toISOString();
  const end = new Date(now + (expired ? -60_000 : 240_000)).toISOString();
  const issue = new Date(now).toISOString();
  const assertionId = "_" + randomUUID();
  let xml = `<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_${randomUUID()}" Version="2.0" IssueInstant="${issue}" Destination="${escape(callback)}" InResponseTo="${escape(id)}"><saml:Issuer>${escape(issuer)}</saml:Issuer><samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status><saml:Assertion ID="${assertionId}" Version="2.0" IssueInstant="${issue}"><saml:Issuer>${escape(issuer)}</saml:Issuer><saml:Subject><saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${escape(email)}</saml:NameID><saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer"><saml:SubjectConfirmationData InResponseTo="${escape(id)}" Recipient="${escape(recipient)}" NotOnOrAfter="${end}"/></saml:SubjectConfirmation></saml:Subject><saml:Conditions NotBefore="${start}" NotOnOrAfter="${end}"><saml:AudienceRestriction><saml:Audience>${escape(audience)}</saml:Audience></saml:AudienceRestriction></saml:Conditions><saml:AuthnStatement AuthnInstant="${issue}" SessionIndex="_${randomUUID()}"><saml:AuthnContext><saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef></saml:AuthnContext></saml:AuthnStatement></saml:Assertion></samlp:Response>`;
  xml = transform(xml);
  if (unsigned) return xml;
  for (const tag of signTags) {
    const sig = new SignedXml({
      privateKey: key,
      publicCert: cert,
      signatureAlgorithm: "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
      canonicalizationAlgorithm: c14n,
    });
    sig.addReference({
      xpath: `//*[local-name()='${tag}']`,
      transforms: [
        "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
        c14n,
      ],
      digestAlgorithm: "http://www.w3.org/2001/04/xmlenc#sha256",
    });
    sig.computeSignature(xml, {
      location: {
        reference: `//*[local-name()='${tag}']/*[local-name()='Issuer']`,
        action: "after",
      },
    });
    xml = sig.getSignedXml();
  }
  return xml;
}
