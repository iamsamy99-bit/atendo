import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'node:path'

// SPA del dashboard: se sirve en atendo.lat/admin-dashboard/
export default defineConfig({
  root: __dirname,
  base: '/admin-dashboard/',
  plugins: [react()],
  build: {
    outDir: resolve(__dirname, '../dist/admin-dashboard'),
    emptyOutDir: true,
  },
})
