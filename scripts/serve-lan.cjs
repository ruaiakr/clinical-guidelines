const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {spawn} = require('node:child_process');
const {URL} = require('node:url');

const HOST = process.env.SERVE_HOST || '0.0.0.0';
const PORT = Number(process.env.SERVE_PORT || 3000);
const API_HOST = process.env.ADMIN_API_HOST || '127.0.0.1';
const API_PORT = Number(process.env.ADMIN_API_PORT || 8787);
const BUILD_DIR = path.join(__dirname, '..', 'build');
const PROJECT_ROOT = path.join(__dirname, '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

let adminProcess = null;

function startAdminApi() {
  return new Promise((resolve, reject) => {
    adminProcess = spawn(
      process.execPath,
      [path.join(__dirname, 'admin-api-server.cjs')],
      {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {...process.env},
      },
    );

    adminProcess.stdout.on('data', (chunk) => {
      process.stdout.write(chunk);
      if (String(chunk).includes('Admin API running')) {
        resolve();
      }
    });

    adminProcess.stderr.on('data', (chunk) => {
      process.stderr.write(chunk);
    });

    adminProcess.on('error', reject);

    setTimeout(() => {
      checkAdminHealth()
        .then((ok) => (ok ? resolve() : reject(new Error('Admin API failed to start'))))
        .catch(reject);
    }, 2500);
  });
}

function checkAdminHealth() {
  return new Promise((resolve) => {
    const request = http.get(
      `http://${API_HOST}:${API_PORT}/health.php`,
      (response) => {
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          resolve(response.statusCode === 200 && body.includes('"ok":true'));
        });
      },
    );
    request.on('error', () => resolve(false));
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function proxyApi(req, res) {
  const targetPath = req.url.replace(/^\/api/, '') || '/';
  const headers = {...req.headers, host: `${API_HOST}:${API_PORT}`};

  const proxyReq = http.request(
    {
      hostname: API_HOST,
      port: API_PORT,
      path: targetPath,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on('error', () => {
    sendText(
      res,
      502,
      'Admin API unavailable. Restart with: npm run serve:lan',
    );
  });

  req.pipe(proxyReq);
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, {'Content-Type': 'text/plain; charset=utf-8'});
  res.end(message);
}

function resolveStaticPath(urlPath) {
  const safePath = decodeURIComponent(urlPath.split('?')[0]);
  const normalized = path.normalize(safePath).replace(/^(\.\.[/\\])+/, '');

  const candidates = [];

  if (normalized.endsWith('/') || normalized === '') {
    candidates.push(path.join(BUILD_DIR, normalized, 'index.html'));
  } else {
    candidates.push(path.join(BUILD_DIR, normalized));
    if (!path.extname(normalized)) {
      candidates.push(path.join(BUILD_DIR, normalized, 'index.html'));
      candidates.push(`${path.join(BUILD_DIR, normalized)}.html`);
    }
  }

  for (const candidate of candidates) {
    if (candidate.startsWith(BUILD_DIR) && fs.existsSync(candidate)) {
      const stat = fs.statSync(candidate);
      if (stat.isFile()) {
        return candidate;
      }
    }
  }

  return null;
}

function serveStatic(req, res) {
  const urlPath = new URL(req.url, `http://${req.headers.host}`).pathname;
  const filePath = resolveStaticPath(urlPath);

  if (filePath) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {'Content-Type': contentType});
      fs.createReadStream(filePath).pipe(res);
      return;
    } catch {
      // fall through to 404
    }
  }

  const fallback404 = path.join(BUILD_DIR, '404.html');
  if (fs.existsSync(fallback404)) {
    try {
      res.writeHead(404, {'Content-Type': 'text/html; charset=utf-8'});
      fs.createReadStream(fallback404).pipe(res);
      return;
    } catch {
      // fall through
    }
  }

  sendText(res, 404, 'Not found');
}

function shutdown() {
  if (adminProcess && !adminProcess.killed) {
    adminProcess.kill();
  }
  process.exit(0);
}

async function main() {
  if (!fs.existsSync(BUILD_DIR)) {
    console.error('Build folder not found. Run: npm run build');
    process.exit(1);
  }

  require('./print-lan-urls.cjs');

  try {
    await startAdminApi();
  } catch (error) {
    console.error(error.message || error);
    process.exit(1);
  }

  const server = http.createServer((req, res) => {
    if (req.url.startsWith('/api/')) {
      proxyApi(req, res);
      return;
    }

    serveStatic(req, res);
  });

  server.listen(PORT, HOST, () => {
    console.log(`Serving build + admin API at http://${HOST}:${PORT}/`);
    console.log(`Admin page: http://${HOST}:${PORT}/admin`);
    console.log(`Admin API proxy: http://${HOST}:${PORT}/api/health.php`);
  });

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
