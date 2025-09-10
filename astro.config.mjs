import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  adapter: vercel(),
  vite: {
    resolve: {
      alias: {
        '@db': fileURLToPath(new URL('./src/db', import.meta.url)),
      },
    },
  },
});
