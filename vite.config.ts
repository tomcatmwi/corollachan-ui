import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  assetsInclude: ['**/*.vrm'],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
      '@components': fileURLToPath(new URL('./src/components', import.meta.url)),
      '@style': fileURLToPath(new URL('./src/style', import.meta.url)),
      '@router': fileURLToPath(new URL('./src/router', import.meta.url)),
      '@views': fileURLToPath(new URL('./src/views', import.meta.url)),
    }
  }

});
