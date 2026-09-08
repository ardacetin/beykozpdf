module.exports = {
  apps: [
    {
      name: "pdf-duzenle",
      cwd: __dirname,
      script: "server/index.mjs",
      node_args: "--env-file=.env",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      time: true,
      env: { NODE_ENV: "production" },
    },
  ],
};
