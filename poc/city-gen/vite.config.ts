import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5210 },
  resolve: {
    alias: {
      '@geom':   resolve(__dirname, 'src/geom'),
      '@model':  resolve(__dirname, 'src/model'),
      '@wards':  resolve(__dirname, 'src/wards'),
      '@r2d':    resolve(__dirname, 'src/render2d'),
      '@r3d':    resolve(__dirname, 'src/render3d'),
      '@export': resolve(__dirname, 'src/export'),
      '@ui':     resolve(__dirname, 'src/ui'),
    }
  }
})
