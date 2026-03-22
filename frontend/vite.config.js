import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const isTauri = !!process.env.TAURI_ENV_PLATFORM

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Prevent vite from obscuring Rust errors
  clearScreen: false,
  server: {
    port: 5173,
    host: true,
    // Tauri expects a fixed port
    strictPort: true,
    watch: {
      usePolling: true,
    },
    proxy: isTauri ? {} : {
      '/api': {
        target: 'http://backend:8080',
        changeOrigin: true,
      },
    },
  },
  // Env variables starting with VITE_ or TAURI_ are exposed to the frontend
  envPrefix: ['VITE_', 'TAURI_'],
})
