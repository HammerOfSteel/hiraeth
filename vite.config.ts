import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@engine': resolve(__dirname, 'src/engine'),
      '@camera': resolve(__dirname, 'src/camera'),
      '@world': resolve(__dirname, 'src/world'),
      '@sim': resolve(__dirname, 'src/simulation'),
      '@characters': resolve(__dirname, 'src/characters'),
      '@atmosphere': resolve(__dirname, 'src/atmosphere'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@utils': resolve(__dirname, 'src/utils'),
    },
  },
  optimizeDeps: {
    // Babylon.js is ESM-native; exclude from pre-bundling for faster dev startup
    exclude: ['@babylonjs/core'],
  },
})
