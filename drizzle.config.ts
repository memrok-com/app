import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/database/schema/*',
  out: './server/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.MEMROK_DB_HOST || 'localhost',
    port: Number(process.env.MEMROK_DB_PORT) || 5432,
    user: process.env.MEMROK_DB_USER || 'memrok',
    password: process.env.MEMROK_DB_PASSWORD || '',
    database: process.env.MEMROK_DB_NAME || 'memrok',
  },
  verbose: true,
  strict: true,
})