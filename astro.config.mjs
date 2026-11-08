// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  base: './',
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      target: 'es2020',
      assetsInlineLimit: 4096,
    },
  },
});
