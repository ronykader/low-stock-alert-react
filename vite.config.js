import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,     // 👈 set your custom port here
    host: true,     // optional: allows access from network or Shopify iframe
  },
})
