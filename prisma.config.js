// Prisma config for production (no TypeScript/dotenv needed)
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { defineConfig } = require('prisma/config');

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
