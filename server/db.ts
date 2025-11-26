import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

// Configure neon database to use WebSocket constructor
neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

/**
 * @const {Pool} pool
 * The database connection pool.
 */
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * @const {Drizzle} db
 * The Drizzle ORM instance, configured with the database pool and schema.
 */
export const db = drizzle({ client: pool, schema });
