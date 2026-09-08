import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { readConfig, authorizedUser } from "../server/config.mjs";
import { createSaml } from "../server/saml.mjs";
import { createApp } from "../server/app.mjs";
import { cert, idpIssuer, requestInfo, responseXml } from "./saml-fixture.mjs";
const config = {
  ...readConfig({
    APP_URL: "http://localhost:3000/pdf",
    SESSION_SECRET: "a".repeat(48),
  }),
  configured: true,
  cert,
  idpIssuer,
  entryPoint: "https://test-idp.invalid/sso",
};
function setup() {
  const saml = createSaml(config);
  const app = createApp({ config, saml });
  return { app, agent: request.agent(app) };
}
async function login(agent, changes = {}) {
  const initiation = await agent.get("/pdf/auth/saml/login").expect(302);
  const { id, relay } = requestInfo(initiation.headers.location);
  const xml = responseXml({
    id,
    callback: config.appUrl + "/auth/saml/acs",
    audience: config.issuer,
    ...changes,
  });
  const body = {
    RelayState: relay,
    SAMLResponse: Buffer.from(xml).toString("base64"),
  };
  return {
    response: await agent.post("/pdf/auth/saml/acs").type("form").send(body),
    body,
  };
}
test("all workspace routes and engine assets are protected under /pdf", async () => {
  const { agent } = setup();
  for (const route of [
    "/app",
    "/app/workspace.js",
    "/engine/merge-pdf.html",
    "/engine/qpdf.wasm",
    "/source",
  ])
    await agent
      .get("/pdf" + route)
      .expect(302)
      .expect("Location", "/pdf/");
  await agent.get("/pdf/api/me").expect(401);
  await agent.get("/engine/merge-pdf.html").expect(404);
  const landing = await agent.get("/pdf/").expect(200);
  assert.match(landing.text, /\/pdf\/auth\/saml\/login/);
  assert.equal(landing.headers["cache-control"], "no-store");
});
test("signed SAML login creates session, regenerates cookie, and logout revokes it", async () => {
  const { agent } = setup();
  const { response, body } = await login(agent);
  assert.equal(response.headers.location, "/pdf/app");
  const sessionCookie = response.headers["set-cookie"];
  assert.ok(sessionCookie.some((c) => c.includes("HttpOnly")));
  const me = await agent.get("/pdf/api/me").expect(200);
  assert.equal(me.body.email, "arda@beykoz.edu.tr");
  await agent.get("/pdf/app").expect(200);
  await agent
    .post("/pdf/auth/saml/acs")
    .type("form")
    .send(body)
    .expect(302)
    .expect("Location", "/pdf/?error=session");
  await agent
    .post("/pdf/auth/logout")
    .set("Origin", "https://attacker.invalid")
    .type("form")
    .send({ csrf: me.body.csrf })
    .expect(403);
  await agent
    .post("/pdf/auth/logout")
    .set("Origin", config.origin)
    .type("form")
    .send({ csrf: "wrong" })
    .expect(403);
  await agent
    .post("/pdf/auth/logout")
    .set("Origin", config.origin)
    .type("form")
    .send({ csrf: me.body.csrf })
    .expect(302);
  await agent.get("/pdf/api/me").expect(401);
});
for (const [name, changes, error] of [
  ["foreign domain", { email: "arda@gmail.com" }, "domain"],
  ["suffix spoofing", { email: "arda@beykoz.edu.tr.evil.com" }, "domain"],
  ["subdomain", { email: "arda@students.beykoz.edu.tr" }, "domain"],
  ["wrong issuer", { issuer: "https://attacker.invalid" }, "domain"],
  ["wrong recipient", { recipient: "https://attacker.invalid/acs" }, "domain"],
  [
    "wrong audience",
    { audience: "https://other.invalid/sp" },
    "authentication",
  ],
  ["expired assertion", { expired: true }, "authentication"],
  ["unsigned assertion", { unsigned: true }, "authentication"],
])
  test(`rejects ${name}`, async () => {
    const { agent } = setup();
    const { response } = await login(agent, changes);
    assert.equal(response.headers.location, `/pdf/?error=${error}`);
    await agent.get("/pdf/api/me").expect(401);
  });
test("rejects unsolicited, missing and mismatched RelayState, and cross-browser login CSRF", async () => {
  const { agent, app } = setup();
  await agent
    .post("/pdf/auth/saml/acs")
    .type("form")
    .send({ SAMLResponse: "invalid" })
    .expect(302)
    .expect("Location", "/pdf/?error=session");
  const start = await agent.get("/pdf/auth/saml/login");
  const { id, relay } = requestInfo(start.headers.location);
  const SAMLResponse = Buffer.from(
    responseXml({
      id,
      callback: config.appUrl + "/auth/saml/acs",
      audience: config.issuer,
    }),
  ).toString("base64");
  await request(app)
    .post("/pdf/auth/saml/acs")
    .type("form")
    .send({ RelayState: relay, SAMLResponse })
    .expect(302)
    .expect("Location", "/pdf/?error=session");
  await agent
    .post("/pdf/auth/saml/acs")
    .type("form")
    .send({ RelayState: "🧪".repeat(32), SAMLResponse })
    .expect(302)
    .expect("Location", "/pdf/?error=session");
});
test("rejects tampered signatures and unknown request IDs", async () => {
  for (const tamper of [true, false]) {
    const { agent } = setup();
    const start = await agent.get("/pdf/auth/saml/login");
    const { id, relay } = requestInfo(start.headers.location);
    let xml = responseXml({
      id: tamper ? id : "_unknown",
      callback: config.appUrl + "/auth/saml/acs",
      audience: config.issuer,
    });
    if (tamper) xml = xml.replace("arda@beykoz.edu.tr", "evil@beykoz.edu.tr");
    await agent
      .post("/pdf/auth/saml/acs")
      .type("form")
      .send({
        RelayState: relay,
        SAMLResponse: Buffer.from(xml).toString("base64"),
      })
      .expect(302)
      .expect("Location", "/pdf/?error=authentication");
    await agent.get("/pdf/api/me").expect(401);
  }
});
test("metadata advertises the exact /pdf ACS and entity ID", async () => {
  const { agent } = setup();
  const res = await agent.get("/pdf/auth/saml/metadata").expect(200);
  assert.ok(res.text.includes(config.appUrl + "/auth/saml/acs"));
  assert.ok(res.text.includes(config.issuer));
});
test("unconfigured SAML serves landing only, with no development bypass", async () => {
  const app = createApp({ config, saml: null });
  await request(app).get("/pdf/").expect(200);
  await request(app)
    .get("/pdf/auth/saml/login")
    .expect(302)
    .expect("Location", "/pdf/?error=configuration");
  await request(app).get("/pdf/auth/saml/metadata").expect(503);
  await request(app).get("/pdf/app").expect(302);
});
test("production requires HTTPS, a strong session secret and Redis", () => {
  assert.throws(
    () =>
      readConfig({ NODE_ENV: "production", APP_URL: "http://example.com/pdf" }),
    /HTTPS/,
  );
  assert.throws(
    () =>
      readConfig({
        NODE_ENV: "production",
        APP_URL: "https://example.com/pdf",
      }),
    /SESSION_SECRET/,
  );
  assert.throws(
    () =>
      readConfig({
        NODE_ENV: "production",
        APP_URL: "https://example.com/pdf",
        SESSION_SECRET: "a".repeat(48),
      }),
    /REDIS/,
  );
  assert.equal(
    readConfig({
      NODE_ENV: "production",
      APP_URL: "https://my.beykoz.edu.tr/pdf",
      SESSION_SECRET: "a".repeat(48),
      REDIS_URL: "redis://localhost",
    }).configured,
    false,
  );
});
test("email attribute cannot override a foreign signed NameID", () => {
  assert.equal(
    authorizedUser(
      {
        issuer: idpIssuer,
        nameID: "evil@gmail.com",
        email: "valid@beykoz.edu.tr",
      },
      idpIssuer,
    ),
    null,
  );
  assert.equal(
    authorizedUser(
      { issuer: idpIssuer, nameID: "ARDA@BEYKOZ.EDU.TR" },
      idpIssuer,
    ).email,
    "arda@beykoz.edu.tr",
  );
});

test("production proxy issues a secure host-only cross-site SAML cookie", async () => {
  const productionConfig = {
    ...config,
    production: true,
    trustProxy: 1,
    appUrl: "https://my.beykoz.edu.tr/pdf",
    origin: "https://my.beykoz.edu.tr",
  };
  const app = createApp({
    config: productionConfig,
    saml: createSaml(productionConfig),
  });
  const res = await request(app)
    .get("/pdf/auth/saml/login")
    .set("X-Forwarded-Proto", "https")
    .expect(302);
  const cookie = res.headers["set-cookie"][0];
  assert.match(cookie, /^__Host-pdf\.sid=/);
  assert.match(cookie, /; Secure/);
  assert.match(cookie, /; HttpOnly/);
  assert.match(cookie, /; SameSite=None/);
  assert.doesNotMatch(cookie, /Domain=/);
  assert.match(cookie, /Path=\//);
});
