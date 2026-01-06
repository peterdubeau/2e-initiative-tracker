import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: (() => {
      const certPath = path.join(__dirname, 'certs')
      const keyPath = path.join(certPath, 'key.pem')
      const certFilePath = path.join(certPath, 'cert.pem')
      
      if (fs.existsSync(keyPath) && fs.existsSync(certFilePath)) {
        return {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certFilePath),
        }
      }
      return false
    })(),
    host: true, // Allow access from LAN
  },
})
