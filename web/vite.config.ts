import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// HTTPS=1 npm run dev:web → self-signed HTTPS so phones on the LAN get a secure context
// (camera and Web NFC only work on https:// or localhost).
const https = process.env.HTTPS === '1';

export default defineConfig({
  plugins: [
    react(),
    ...(https ? [basicSsl()] : []),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'One-Cup-Community',
        short_name: 'One-Cup',
        description: 'Tái sử dụng cốc tại VGU — quét QR hoặc chạm NFC',
        theme_color: '#4fc16b',
        background_color: '#f2fcf4',
        display: 'standalone',
        start_url: '/me',
        icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }],
      },
      workbox: { navigateFallbackDenylist: [/^\/api\//] },
    }),
  ],
  server: {
    host: true,
    proxy: { '/api': 'http://localhost:3000' },
  },
});
