import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    charset: 'utf8',
    rollupOptions: {
      output: {
        charset: 'utf8',
      },
    },
  },
  server: {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  },
})
