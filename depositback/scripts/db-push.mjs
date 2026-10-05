// Auto-push Prisma schema to database (if DATABASE_URL is set).
// This ensures the database tables exist on first deploy without manual steps.
// Used by both `pnpm build` and `pnpm dev`.
import { execSync } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL || process.env.NILEDB_POSTGRES_URL;

if (databaseUrl) {
  try {
    console.log("Pushing database schema...");
    execSync(`prisma db push --schema db/schema.prisma --url "${databaseUrl}"`, {
      stdio: "inherit",
    });
  } catch {
    // During `pnpm dev`, a failed push shouldn't block startup —
    // the setup wizard's step 0 will show the user what's wrong.
    // During `pnpm build`, the build will still fail later if the DB is broken.
    console.warn("Warning: database schema push failed. The setup wizard will help you fix this.");
  }
} else {
  console.log("Skipping db push: DATABASE_URL not set");
}
