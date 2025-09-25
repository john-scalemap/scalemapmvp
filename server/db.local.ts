import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '@shared/schema';

// Local development database configuration
// This file demonstrates the migration from Neon serverless to standard PostgreSQL client

const connectionString = process.env.DATABASE_URL || 'postgresql://allieandjohn@localhost:5432/scalemap_dev';

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to configure local database?",
  );
}

// Standard PostgreSQL connection pool (replaces Neon serverless)
export const pool = new Pool({
  connectionString,
  // SSL configuration for local development (no SSL needed)
  ssl: false
});

// Drizzle ORM with node-postgres adapter (replaces neon-serverless adapter)
export const db = drizzle(pool, { schema });

// Test function to verify database connectivity
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('✅ Database connection successful');
    console.log(`   Time: ${result.rows[0].current_time}`);
    console.log(`   Version: ${result.rows[0].pg_version.split(' ')[0]}`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeConnection() {
  await pool.end();
}