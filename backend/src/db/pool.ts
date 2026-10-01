import { Pool } from "pg";
import { config } from "@/config";

export const pool = new Pool({
  connectionString: config.db.url,
});

pool.on("error", (err) => {
  // A truly unhandled idle-client error should not crash silently.
  console.error("Unexpected error on idle PostgreSQL client", err);
});
