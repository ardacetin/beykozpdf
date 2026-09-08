// Local test harness only. Production entry point never imports this file.
if (process.env.NODE_ENV !== "test")
  throw new Error("The fixture IdP requires NODE_ENV=test.");
import express from "express";
import { readConfig } from "../server/config.mjs";
import { createSaml } from "../server/saml.mjs";
import { createApp } from "../server/app.mjs";
import { cert, idpIssuer, requestInfo, responseXml } from "./saml-fixture.mjs";
const config = {
  ...readConfig({
    APP_URL: "http://127.0.0.1:3100/pdf",
    SESSION_SECRET: "test-only-".repeat(8),
  }),
  configured: true,
  cert,
  idpIssuer,
  entryPoint: "http://127.0.0.1:3100/pdf/test-idp",
};
const server = express();
server.get("/pdf/test-idp", (req, res) => {
  const { id, relay } = requestInfo(`http://127.0.0.1:3100${req.originalUrl}`);
  const response = Buffer.from(
    responseXml({
      id,
      callback: config.appUrl + "/auth/saml/acs",
      audience: config.issuer,
    }),
  ).toString("base64");
  res.send(
    `<html lang="tr"><title>Yerel test kimlik sağlayıcısı</title><form method="post" action="/pdf/auth/saml/acs"><input type="hidden" name="RelayState" value="${relay}"><input type="hidden" name="SAMLResponse" value="${response}"><button>Test hesabıyla devam et</button></form></html>`,
  );
});
server.use(createApp({ config, saml: createSaml(config) }));
server.listen(3100, "127.0.0.1");
