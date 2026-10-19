import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isElectron = process.env.ELECTRON === 'true';

// Dynamically import vite-plugin-electron only for electron builds
const getPlugins = async () => {
  const plugins = [react()];
  if (isElectron) {
    const { default: electron } = await import('vite-plugin-electron');
    plugins.push(electron({ entry: 'electron/main.js' }));
  }
  return plugins;
};

// https://vite.dev/config/
export default defineConfig(async () => ({
  // Use './' only for Electron (file:// protocol); use '/' for browser/Vercel
  base: isElectron ? './' : '/',
  plugins: await getPlugins(),
  server: {
    port: 5173,
    // Proxy only used in local browser dev (not in Electron or Vercel)
    proxy: isElectron ? {} : {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
}))
