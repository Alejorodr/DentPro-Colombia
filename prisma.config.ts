import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Para deploy (migrate deploy) necesita SI o SI una url aquí:
    url: env("DATABASE_URL"),
  },
});
