// Google Workspace SAML for the Cloudflare Worker: the same profile the PHP
// version enforces (SP-initiated, signed Response, exact claims). Claims are
// read only from the XML the signature covers, never from the raw document.
import { DOMParser } from "@xmldom/xmldom";
import { SignedXml } from "xml-crypto";

const PROTOCOL = "urn:oasis:names:tc:SAML:2.0:protocol";
const ASSERTION = "urn:oasis:names:tc:SAML:2.0:assertion";
const DSIG = "http://www.w3.org/2000/09/xmldsig#";
const EMAIL_FORMAT = "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress";
const EXC_C14N = "http://www.w3.org/2001/10/xml-exc-c14n#";
const STRONG_ALGORITHMS = new Set([
  "http://www.w3.org/2001/04/xmldsig-more#rsa-sha256",
  "http://www.w3.org/2001/04/xmldsig-more#rsa-sha384",
  "http://www.w3.org/2001/04/xmldsig-more#rsa-sha512",
  "http://www.w3.org/2001/04/xmlenc#sha256",
  "http://www.w3.org/2001/04/xmldsig-more#sha384",
  "http://www.w3.org/2001/04/xmlenc#sha512",
]);
const ALLOWED_TRANSFORMS = new Set([
  "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
  EXC_C14N,
]);

export class SamlError extends Error {}
const fail = (reason) => {
  throw new SamlError(reason);
};

const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const base64 = (bytes) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

export function randomId(bytes = 32) {
  const buffer = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(buffer, (b) => b.toString(16).padStart(2, "0")).join("");
}

// HTTP-Redirect binding: raw DEFLATE, base64, query string.
export async function loginRedirect(config, relay) {
  const id = "_" + randomId(20);
  const xml =
    `<samlp:AuthnRequest xmlns:samlp="${PROTOCOL}" xmlns:saml="${ASSERTION}" ` +
    `ID="${id}" Version="2.0" IssueInstant="${new Date().toISOString()}" ` +
    `Destination="${escapeXml(config.entry)}" ` +
    `ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" ` +
    `AssertionConsumerServiceURL="${escapeXml(config.acs)}">` +
    `<saml:Issuer>${escapeXml(config.entity)}</saml:Issuer>` +
    `<samlp:NameIDPolicy Format="${EMAIL_FORMAT}" AllowCreate="true"/>` +
    `</samlp:AuthnRequest>`;
  const stream = new Blob([xml])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  const deflated = new Uint8Array(await new Response(stream).arrayBuffer());
  const target = new URL(config.entry);
  target.searchParams.set("SAMLRequest", base64(deflated));
  target.searchParams.set("RelayState", relay);
  return { id, location: target.toString() };
}

function children(parent, ns, name) {
  const found = [];
  for (let node = parent.firstChild; node; node = node.nextSibling) {
    if (node.nodeType === 1 && node.namespaceURI === ns && node.localName === name)
      found.push(node);
  }
  return found;
}

function one(parent, ns, name) {
  const found = children(parent, ns, name);
  if (found.length !== 1) fail(`Ambiguous claim ${name}`);
  return found[0];
}

function parse(xml) {
  // Google never sends a DTD; refusing it removes entity expansion entirely.
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) fail("Invalid XML");
  let error = null;
  const doc = new DOMParser({
    onError: (level, message) => {
      if (level !== "warning") error = message;
    },
  }).parseFromString(xml, "text/xml");
  if (error || !doc?.documentElement) fail("Invalid XML");
  return doc;
}

function time(element, attribute) {
  const value = Date.parse(element.getAttribute(attribute));
  if (!Number.isFinite(value)) fail(`Invalid ${attribute}`);
  return value / 1000;
}

// Returns the authenticated e-mail address or throws SamlError.
export function verifyResponse(encoded, config, requestId, now = Date.now() / 1000) {
  if (typeof encoded !== "string" || encoded.length > 262144) fail("Missing response");
  let xml;
  try {
    xml = new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(atob(encoded.replace(/\s+/g, "")), (c) => c.charCodeAt(0)),
    );
  } catch {
    fail("Invalid encoding");
  }
  const doc = parse(xml);
  const root = doc.documentElement;
  if (root.namespaceURI !== PROTOCOL || root.localName !== "Response") fail("Not a SAML Response");

  // "Signed response": exactly one signature, directly on the Response,
  // covering the Response by its ID.
  const signatures = doc.getElementsByTagNameNS(DSIG, "Signature");
  if (signatures.length !== 1 || signatures[0].parentNode !== root) fail("Response signature required");
  const signature = signatures[0];
  for (const tag of ["SignatureMethod", "DigestMethod"]) {
    const nodes = signature.getElementsByTagNameNS(DSIG, tag);
    if (!nodes.length) fail("Missing signature algorithm");
    for (const node of Array.from(nodes))
      if (!STRONG_ALGORITHMS.has(node.getAttribute("Algorithm"))) fail("Weak signature algorithm");
  }
  for (const node of Array.from(signature.getElementsByTagNameNS(DSIG, "Transform")))
    if (!ALLOWED_TRANSFORMS.has(node.getAttribute("Algorithm"))) fail("Unexpected transform");
  for (const node of Array.from(signature.getElementsByTagNameNS(DSIG, "CanonicalizationMethod")))
    if (node.getAttribute("Algorithm") !== EXC_C14N) fail("Unexpected canonicalization");

  const signed = new SignedXml({ publicCert: config.cert, getCertFromKeyInfo: () => null });
  signed.loadSignature(signature);
  const references = signed.getReferences();
  if (references.length !== 1 || references[0].uri !== "#" + root.getAttribute("ID") || !root.getAttribute("ID"))
    fail("Signature does not cover the Response");
  let valid = false;
  try {
    valid = signed.checkSignature(xml);
  } catch {
    valid = false;
  }
  const covered = signed.getSignedReferences();
  if (!valid || covered.length !== 1) fail("Invalid signature");

  // From here on, only the signed bytes are trusted.
  const response = parse(covered[0]).documentElement;
  if (response.namespaceURI !== PROTOCOL || response.localName !== "Response") fail("Signed node is not the Response");
  if (doc.getElementsByTagNameNS(ASSERTION, "EncryptedAssertion").length) fail("Encrypted assertions unsupported");
  const status = one(one(response, PROTOCOL, "Status"), PROTOCOL, "StatusCode");
  if (status.getAttribute("Value") !== "urn:oasis:names:tc:SAML:2.0:status:Success") fail("IdP returned an error");

  const assertion = one(response, ASSERTION, "Assertion");
  const subject = one(assertion, ASSERTION, "Subject");
  const confirmation = one(subject, ASSERTION, "SubjectConfirmation");
  const data = one(confirmation, ASSERTION, "SubjectConfirmationData");
  const conditions = one(assertion, ASSERTION, "Conditions");
  const audience = one(one(conditions, ASSERTION, "AudienceRestriction"), ASSERTION, "Audience");
  const nameId = one(subject, ASSERTION, "NameID");
  if (
    response.getAttribute("Version") !== "2.0" ||
    response.getAttribute("Destination") !== config.acs ||
    response.getAttribute("InResponseTo") !== requestId ||
    confirmation.getAttribute("Method") !== "urn:oasis:names:tc:SAML:2.0:cm:bearer" ||
    data.getAttribute("Recipient") !== config.acs ||
    data.getAttribute("InResponseTo") !== requestId ||
    audience.textContent.trim() !== config.entity ||
    one(response, ASSERTION, "Issuer").textContent.trim() !== config.issuer ||
    one(assertion, ASSERTION, "Issuer").textContent.trim() !== config.issuer
  )
    fail("Claims mismatch");
  for (const element of [response, assertion]) {
    const issued = time(element, "IssueInstant");
    if (issued < now - 300 || issued > now + 30) fail("Assertion age");
  }
  for (const element of [data, conditions]) {
    if (time(element, "NotOnOrAfter") <= now - 30) fail("Expired assertion");
    if (element.hasAttribute("NotBefore") && time(element, "NotBefore") > now + 30) fail("Future assertion");
  }
  if (nameId.hasAttribute("Format") && nameId.getAttribute("Format") !== EMAIL_FORMAT) fail("Unexpected NameID format");
  return nameId.textContent.trim().toLowerCase();
}

export function metadata(config) {
  return (
    `<?xml version="1.0"?>\n<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${escapeXml(config.entity)}">` +
    `<md:SPSSODescriptor AuthnRequestsSigned="false" WantAssertionsSigned="false" protocolSupportEnumeration="${PROTOCOL}">` +
    `<md:NameIDFormat>${EMAIL_FORMAT}</md:NameIDFormat>` +
    `<md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="${escapeXml(config.acs)}" index="1"/>` +
    `</md:SPSSODescriptor></md:EntityDescriptor>`
  );
}
