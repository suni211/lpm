import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // UTF-8 인코딩 보장
        format: 'es',
      },
    },
  },
  server: {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  },
})
