import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { cert, idpIssuer, responseXml } from './saml-fixture.mjs';
import { SamlError, loginRedirect, verifyResponse } from '../cloudflare/saml.mjs';

const config = {
  entry: 'https://idp.test/sso?idpid=x',
  issuer: idpIssuer,
  cert,
  entity: 'https://pdf.beykoz.edu.tr/metadata.php',
  acs: 'https://pdf.beykoz.edu.tr/saml-acs.php',
};
const id = '_request';
const encode = (xml) => Buffer.from(xml).toString('base64');
const response = (options = {}) => encode(responseXml({ id, callback: config.acs, audience: config.entity, ...options }));
const rejects = (encoded, requestId = id) =>
  assert.throws(() => verifyResponse(encoded, config, requestId), SamlError);

test('login request uses the redirect binding with our ACS and entity', async () => {
  const { id: requestId, location } = await loginRedirect(config, 'relay-value');
  const url = new URL(location);
  assert.equal(url.origin + url.pathname, 'https://idp.test/sso');
  assert.equal(url.searchParams.get('idpid'), 'x');
  assert.equal(url.searchParams.get('RelayState'), 'relay-value');
  const xml = inflateRawSync(Buffer.from(url.searchParams.get('SAMLRequest'), 'base64')).toString();
  assert.match(xml, new RegExp(`ID="${requestId}"`));
  assert.match(xml, /AssertionConsumerServiceURL="https:\/\/pdf\.beykoz\.edu\.tr\/saml-acs\.php"/);
  assert.match(xml, /<saml:Issuer>https:\/\/pdf\.beykoz\.edu\.tr\/metadata\.php<\/saml:Issuer>/);
});

test('a signed Google-style response yields the e-mail address', () => {
  assert.equal(verifyResponse(response({ email: 'Arda@Beykoz.edu.tr' }), config, id), 'arda@beykoz.edu.tr');
});

test('tampering after signing is rejected', () => {
  rejects(encode(responseXml({ id, callback: config.acs, audience: config.entity })
    .replace('arda@beykoz.edu.tr', 'rektor@beykoz.edu.tr')));
});

test('unsigned and assertion-only signed responses are rejected', () => {
  rejects(response({ unsigned: true }));
  rejects(response({ signTags: ['Assertion'] }));
});

test('claims must match this request and service provider', () => {
  rejects(response(), '_another-request');
  rejects(response({ audience: 'https://evil.test/metadata.php' }));
  rejects(response({ recipient: 'https://evil.test/acs' }));
  rejects(response({ issuer: 'https://evil.test/idp' }));
  rejects(response({ expired: true }));
});

test('a second, unsigned assertion cannot be smuggled in', () => {
  const signed = responseXml({ id, callback: config.acs, audience: config.entity });
  const assertion = signed.match(/<saml:Assertion[\s\S]*<\/saml:Assertion>/)[0]
    .replace('arda@beykoz.edu.tr', 'rektor@beykoz.edu.tr')
    .replace(/ID="[^"]+"/, 'ID="_evil"');
  rejects(encode(signed.replace('</samlp:Response>', `${assertion}</samlp:Response>`)));
});

test('DTDs and malformed input are rejected', () => {
  rejects(response({ transform: (xml) => `<!DOCTYPE r [<!ENTITY x "y">]>${xml}` }));
  rejects('not base64 at all!');
  rejects(undefined);
});

test('Google responses that also sign the Assertion are accepted', () => {
  // Signing order matters: the Assertion first, then the enclosing Response.
  assert.equal(
    verifyResponse(response({ signTags: ['Assertion', 'Response'] }), config, id),
    'arda@beykoz.edu.tr',
  );
});

test('UNSPECIFIED NameID format is accepted, other formats are not', () => {
  const unspecified = 'urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified';
  const withFormat = (format) => response({
    transform: (xml) => xml.replace('urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress', format),
  });
  assert.equal(verifyResponse(withFormat(unspecified), config, id), 'arda@beykoz.edu.tr');
  rejects(withFormat('urn:oasis:names:tc:SAML:2.0:nameid-format:transient'));
});

test('a claims mismatch names the failing claim, not its value', () => {
  assert.throws(
    () => verifyResponse(response({ audience: 'https://evil.test/metadata.php' }), config, id),
    { message: 'Claims mismatch: Audience' },
  );
});
