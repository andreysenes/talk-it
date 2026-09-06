import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages serves this repo at /talk-it/
  base: process.env.GITHUB_PAGES === '1' ? '/talk-it/' : '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 4521,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 4521,
    strictPort: true,
  },
})
