import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // api/ contains Vercel serverless functions — exclude from Vite entirely
  server: {
    watch: { ignored: ['**/api/**'] },
  },
  build: {
    rollupOptions: {
      external: [/^api\//],
    },
  },
})
