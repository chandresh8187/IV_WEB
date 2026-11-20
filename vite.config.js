import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        // Keep PDF.js module exports intact, but use the .js MIME mapping on static hosts.
        assetFileNames: asset => asset.names.some(name => name.endsWith('pdf.worker.min.mjs'))
          ? 'assets/pdf.worker.min-[hash].js'
          : 'assets/[name]-[hash][extname]',
        codeSplitting: {
          groups: [
            // Keep the 3D engine lazy-loaded, with its core separate from the renderer.
            { name: 'three-core', test: /[\\/]three[\\/]build[\\/]three\.core\.js$/, priority: 20 },
            { name: 'three-renderer', test: /[\\/]node_modules[\\/]three[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
  server: { proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true }, '/socket.io': { target: 'http://localhost:5000', changeOrigin: true } } },
})
