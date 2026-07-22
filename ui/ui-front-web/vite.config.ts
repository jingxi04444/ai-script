import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devPort = Number(env.VITE_DEV_PORT || 5190);
  const previewPort = Number(env.VITE_PREVIEW_PORT || 5191);
  const tunnelHost = env.VITE_TUNNEL_HOST?.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const tunnelProtocol = env.VITE_TUNNEL_PROTOCOL === 'http' ? 'http' : 'https';

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: devPort,
      strictPort: true,
      allowedHosts: true,
      hmr: tunnelHost
        ? {
            protocol: tunnelProtocol === 'http' ? 'ws' : 'wss',
            host: tunnelHost,
            clientPort: Number(env.VITE_TUNNEL_CLIENT_PORT || (tunnelProtocol === 'http' ? 80 : 443)),
          }
        : undefined,
    },
    preview: {
      host: '0.0.0.0',
      port: previewPort,
      strictPort: true,
      allowedHosts: true,
    },
  };
});
