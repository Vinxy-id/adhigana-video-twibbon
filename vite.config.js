import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const buildTime = Date.now()

function versionPlugin() {
  return {
    name: 'version-generator',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist')
      const configPath = path.resolve(__dirname, 'src/config.json')
      let cfg = {}
      if (fs.existsSync(configPath)) {
        try { cfg = JSON.parse(fs.readFileSync(configPath, 'utf8')) } catch (_) {}
      }
      if (fs.existsSync(distDir)) {
        fs.writeFileSync(
          path.join(distDir, 'version.json'),
          JSON.stringify({ buildTime, config: cfg }, null, 2)
        )
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), versionPlugin()],
  base: './',
  define: {
    __APP_BUILD_TIME__: buildTime,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      }
    }
  }
})
