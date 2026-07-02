module.exports = {
  apps: [
    {
      name: "qrmenu",
      script: "node",
      args: "--enable-source-maps artifacts/api-server/dist/index.mjs",
      cwd: "/var/www/qryeni",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      env: {
        NODE_ENV: "production",
        PORT: "1951",
        DATABASE_URL: "postgresql://qrmenu:SIFRE_BURAYA@localhost:5432/qrmenu_db",
        SESSION_SECRET: "BURAYA_EN_AZ_32_KARAKTER_RANDOM_STRING",
      },
    },
  ],
};
