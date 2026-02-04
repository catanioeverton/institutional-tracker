import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    // Aqui dizemos ao Prisma para ler o link do seu Supabase do arquivo .env
    url: process.env.DATABASE_URL,
  },
});