import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://udrive-backend-1igb.vercel.app',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
