import { createClient } from "redis";
import { RedisStore } from "connect-redis";
import { readConfig } from "./config.mjs";
import { createSaml } from "./saml.mjs";
import { createApp } from "./app.mjs";
const config = readConfig();
let redis;
if (config.redisUrl) {
  redis = createClient({ url: config.redisUrl });
  redis.on("error", () => console.error("Redis bağlantı hatası"));
  await redis.connect();
}
const store = redis
  ? new RedisStore({
      client: redis,
      prefix: "pdf:session:",
      disableTouch: true,
    })
  : undefined;
if (!config.production)
  console.info(
    "Geliştirme ortamı. SAML ayarları olmadan yalnızca giriş ekranı açıktır.",
  );
const app = createApp({ config, saml: createSaml(config, redis), store });
const server = app.listen(config.port, "127.0.0.1", () =>
  console.info(`PDF Düzenle: ${config.appUrl}`),
);
for (const signal of ["SIGTERM", "SIGINT"])
  process.on(signal, () =>
    server.close(async () => {
      if (redis) await redis.quit();
      process.exit(0);
    }),
  );
