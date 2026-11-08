import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const disableHmr = process.env.DISABLE_HMR === 'true';
const tauriDevHost = process.env.TAURI_DEV_HOST;

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    // Relative asset URLs so the production bundle loads inside the Tauri webview.
    base: './',
    clearScreen: false,
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      port: 3000,
      strictPort: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: disableHmr
        ? false
        : tauriDevHost
          ? {
              protocol: 'ws',
              host: tauriDevHost,
              port: 3001,
            }
          : true,
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: disableHmr
        ? null
        : {
            ignored: ['**/src-tauri/**'],
          },
    },
  };
});
