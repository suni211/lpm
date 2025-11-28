import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3003,
    proxy: {
      '/api': {
        target: 'http://localhost:5003',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5003',
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // 캐시 방지: 빌드마다 파일명에 해시 추가
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  }
})
