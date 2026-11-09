import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiPort = 4000

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${apiPort}`,
        changeOrigin: true,
      },
    },
  },
})
