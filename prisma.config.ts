import { defineConfig, env } from "prisma/config";
import "./loadEnv.ts";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
