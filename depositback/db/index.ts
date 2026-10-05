import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Derive SSL config from the connection string rather than hardcoding.
 * - Cloud providers (Neon, Supabase): connection strings
 *   include sslmode=require or similar — SSL is enabled automatically.
 * - Local development: no sslmode param → SSL is disabled, no breakage.
 * - Explicit override: set DATABASE_SSL=true/false to force behavior.
 */
function sslConfig(connectionString: string): boolean | undefined {
  const override = process.env.DATABASE_SSL;
  if (override === "true") return true;
  if (override === "false") return false;
  // Enable SSL if the connection string contains any sslmode except "disable"
  if (/sslmode=(?!disable)\w+/.test(connectionString)) return true;
  return undefined; // let pg decide (defaults to no SSL)
}

function createPrismaClient() {
  // Upgrade sslmode=require → verify-full to silence pg v8 deprecation
  // warning. Only upgrade "require" — don't touch "prefer" (different
  // semantics) or "verify-ca" (intentional intermediate mode).
  const connectionString = (
    process.env.DATABASE_URL ?? process.env.NILEDB_POSTGRES_URL ?? ""
  ).replace(
    /sslmode=require\b/,
    "sslmode=verify-full",
  );

  const pool = new Pool({
    connectionString,
    ssl: sslConfig(connectionString),
    // Serverless-friendly pool size. Each Vercel function instance gets
    // its own pool — keep it small to avoid exhausting connection limits
    // on Supabase (60) or Neon shared compute (100).
    // Override with DATABASE_POOL_SIZE if needed.
    max: parseInt(process.env.DATABASE_POOL_SIZE ?? "5", 10),
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
