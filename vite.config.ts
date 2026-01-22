import { defineConfig } from 'vite';
import { resolve } from 'path';
import { promises as fs } from 'fs';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  plugins: [
    {
      name: 'level-save-endpoint',
      configureServer(server) {
        server.middlewares.use('/api/levels/save', async (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end('Method Not Allowed');
            return;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}') as { name?: string; data?: string };
              const levelName = (payload.name || 'level').trim();
              const levelData = payload.data || '';
              const safeName = levelName.replace(/[^\w\-]+/g, '_').toLowerCase() || 'level';
              const levelsDir = resolve(__dirname, 'public', 'levels');
              const filePath = resolve(levelsDir, `${safeName}.json`);

              await fs.mkdir(levelsDir, { recursive: true });
              await fs.writeFile(filePath, levelData, 'utf-8');

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, file: `/levels/${safeName}.json` }));
            } catch (error) {
              res.statusCode = 500;
              res.end(String(error));
            }
          });
        });
      }
    }
  ],
  server: {
    port: 3000,
    open: '/editor.html'
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'public/index.html'),
        editor: resolve(__dirname, 'public/editor.html')
      }
    }
  }
});

