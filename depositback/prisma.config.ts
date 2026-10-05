import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("db", "schema.prisma"),
  datasource: {
    url: (process.env.DATABASE_URL ?? process.env.NILEDB_POSTGRES_URL)!,
  },
});
