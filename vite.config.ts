import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// No GitHub Pages o site fica em /<repositório>/. O workflow passa o caminho certo
// em BASE_PATH (vem do actions/configure-pages). Localmente usamos "/".
const API_PORT = Number(process.env.API_PORT ?? 8787);

export default defineConfig(({ command, isPreview }) => ({
  base: process.env.BASE_PATH ?? (command === 'build' || isPreview ? '/Educaflix/' : '/'),
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': `http://localhost:${API_PORT}`,
      '/content': `http://localhost:${API_PORT}`,
    },
    watch: { ignored: ['**/content/**'] },
  },
}));
