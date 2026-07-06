const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {URL} = require('node:url');

const PORT = Number(process.env.ADMIN_API_PORT || 8787);
const HOST = process.env.ADMIN_API_HOST || '127.0.0.1';
const PROJECT_ROOT = path.join(__dirname, '..');
const DOCS_ROOT = path.join(PROJECT_ROOT, 'docs');
const BACKUP_DIR = path.join(PROJECT_ROOT, 'api', 'backups');
const sessions = new Map();

function readPassword() {
  const localConfig = path.join(PROJECT_ROOT, 'api', 'config.local.php');
  const exampleConfig = path.join(PROJECT_ROOT, 'api', 'config.example.php');
  const source = fs.existsSync(localConfig) ? localConfig : exampleConfig;
  const content = fs.readFileSync(source, 'utf8');
  const match = content.match(/'admin_password'\s*=>\s*'([^']*)'/);
  return match ? match[1].trim() : 'change-me';
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data));
}

function parseCookies(header) {
  const cookies = {};
  if (!header) {
    return cookies;
  }

  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    cookies[name] = decodeURIComponent(rest.join('='));
  }

  return cookies;
}

function getSessionToken(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.admin_token;
  return token && sessions.has(token) ? token : null;
}

function setSessionCookie(res) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, true);
  res.setHeader(
    'Set-Cookie',
    `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax`,
  );
}

function clearSessionCookie(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.admin_token) {
    sessions.delete(cookies.admin_token);
  }
  res.setHeader(
    'Set-Cookie',
    'admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
  );
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    return {meta: {}, body: content};
  }

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const parts = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (parts) {
      meta[parts[1]] = parts[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }

  return {meta, body: content.slice(match[0].length)};
}

function buildMarkdown(meta, body) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(meta)) {
    if (value !== '') {
      lines.push(`${key}: ${value}`);
    }
  }
  lines.push('---', '');
  return `${lines.join('\n')}${body.replace(/^\n*/, '')}`;
}

function deriveTitle(body) {
  const match = body.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled chapter';
}

function normalizeDocPath(relativePath) {
  let value = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!value.toLowerCase().endsWith('.md')) {
    value += '.md';
  }
  return value;
}

function resolveDocPath(relativePath) {
  const normalized = normalizeDocPath(relativePath);
  const fullPath = path.resolve(DOCS_ROOT, normalized);

  if (!fullPath.startsWith(DOCS_ROOT)) {
    return null;
  }

  if (!fullPath.toLowerCase().endsWith('.md')) {
    return null;
  }

  return fullPath;
}

function listChapters() {
  const chapters = [];

  function walk(currentDir) {
    for (const entry of fs.readdirSync(currentDir, {withFileTypes: true})) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      if (!entry.name.toLowerCase().endsWith('.md')) {
        continue;
      }

      const relativePath = path
        .relative(DOCS_ROOT, fullPath)
        .replace(/\\/g, '/');
      const content = fs.readFileSync(fullPath, 'utf8');
      const parsed = parseFrontmatter(content);
      const category = path.dirname(relativePath);
      const stat = fs.statSync(fullPath);

      chapters.push({
        path: relativePath,
        id: relativePath.replace(/\.md$/i, ''),
        title: parsed.meta.title || deriveTitle(parsed.body),
        category: category === '.' ? 'General' : category.replace(/\//g, ' / '),
        sidebar_position: parsed.meta.sidebar_position || '',
        modified: stat.mtime.toISOString(),
      });
    }
  }

  walk(DOCS_ROOT);
  chapters.sort((a, b) =>
    `${a.category}${a.title}`.localeCompare(`${b.category}${b.title}`),
  );
  return chapters;
}

function backupChapter(fullPath) {
  fs.mkdirSync(BACKUP_DIR, {recursive: true});
  const backupName = `${new Date()
    .toISOString()
    .replace(/[-:T]/g, '')
    .slice(0, 14)}__${path.basename(path.dirname(fullPath))}__${path.basename(fullPath)}`;
  fs.copyFileSync(fullPath, path.join(BACKUP_DIR, backupName));
}

async function handleAuth(req, res) {
  if (req.method === 'GET') {
    sendJson(res, 200, {authenticated: Boolean(getSessionToken(req))});
    return;
  }

  if (req.method === 'POST') {
    const body = await readBody(req);
    const password = String(body.password || '').trim();
    const expected = readPassword();

    if (!password || password !== expected) {
      sendJson(res, 401, {error: 'Invalid password'});
      return;
    }

    setSessionCookie(res);
    sendJson(res, 200, {authenticated: true});
    return;
  }

  if (req.method === 'DELETE') {
    clearSessionCookie(req, res);
    sendJson(res, 200, {authenticated: false});
    return;
  }

  sendJson(res, 405, {error: 'Method not allowed'});
}

async function handleChapters(req, res) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const chapterPath = requestUrl.searchParams.get('path') || '';

  if (req.method === 'GET' && !chapterPath) {
    sendJson(res, 200, {chapters: listChapters()});
    return;
  }

  if (req.method === 'GET' && chapterPath) {
    const fullPath = resolveDocPath(chapterPath);
    if (!fullPath || !fs.existsSync(fullPath)) {
      sendJson(res, 404, {error: 'Chapter not found'});
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const parsed = parseFrontmatter(content);
    const relativePath = path.relative(DOCS_ROOT, fullPath).replace(/\\/g, '/');

    sendJson(res, 200, {
      chapter: {
        path: relativePath,
        id: relativePath.replace(/\.md$/i, ''),
        title: parsed.meta.title || deriveTitle(parsed.body),
        sidebar_position: parsed.meta.sidebar_position || '',
        meta: parsed.meta,
        body: parsed.body,
        content,
        modified: fs.statSync(fullPath).mtime.toISOString(),
      },
    });
    return;
  }

  if (!getSessionToken(req)) {
    sendJson(res, 401, {error: 'Unauthorized'});
    return;
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    const body = await readBody(req);
    const relativeInput = String(body.path || '');
    const title = String(body.title || '').trim();
    const chapterBody = String(body.body || '');
    const sidebarPosition = String(body.sidebar_position || '').trim();

    if (!relativeInput) {
      sendJson(res, 400, {error: 'Chapter path is required'});
      return;
    }

    const fullPath = resolveDocPath(relativeInput);
    if (!fullPath) {
      sendJson(res, 400, {error: 'Invalid chapter path'});
      return;
    }

    if (fs.existsSync(fullPath)) {
      backupChapter(fullPath);
    }

    const meta = {};
    if (sidebarPosition) {
      meta.sidebar_position = sidebarPosition;
    }
    if (title) {
      meta.title = title;
    } else if (fs.existsSync(fullPath)) {
      Object.assign(meta, parseFrontmatter(fs.readFileSync(fullPath, 'utf8')).meta, meta);
    }

    let nextBody = chapterBody;
    if (!/^#\s+/m.test(nextBody) && title) {
      nextBody = `# ${title}\n\n${nextBody.replace(/^\n*/, '')}`;
    }

    fs.mkdirSync(path.dirname(fullPath), {recursive: true});
    fs.writeFileSync(fullPath, buildMarkdown(meta, nextBody), 'utf8');

    const relativePath = path.relative(DOCS_ROOT, fullPath).replace(/\\/g, '/');
    sendJson(res, 200, {
      success: true,
      chapter: {
        path: relativePath,
        id: relativePath.replace(/\.md$/i, ''),
        title: title || deriveTitle(nextBody),
        modified: fs.statSync(fullPath).mtime.toISOString(),
      },
      rebuild_required: true,
    });
    return;
  }

  sendJson(res, 405, {error: 'Method not allowed'});
}

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;

    if (pathname === '/health.php' || pathname === '/api/health.php') {
      sendJson(res, 200, {
        ok: true,
        service: 'clinical-guidelines-admin-api-node',
        authenticated: Boolean(getSessionToken(req)),
      });
      return;
    }

    if (pathname === '/auth.php' || pathname === '/api/auth.php') {
      await handleAuth(req, res);
      return;
    }

    if (pathname === '/chapters.php' || pathname === '/api/chapters.php') {
      await handleChapters(req, res);
      return;
    }

    sendJson(res, 404, {error: 'Not found'});
  } catch (error) {
    sendJson(res, 500, {error: error.message || 'Server error'});
  }
});

function checkExistingServer(callback) {
  const request = http.get(
    `http://${HOST}:${PORT}/health.php`,
    (response) => {
      let body = '';
      response.on('data', (chunk) => {
        body += chunk;
      });
      response.on('end', () => {
        callback(null, response.statusCode === 200 && body.includes('"ok":true'));
      });
    },
  );

  request.on('error', (error) => {
    callback(error);
  });

  request.setTimeout(1500, () => {
    request.destroy(new Error('timeout'));
  });
}

server.on('error', (error) => {
  if (error.code !== 'EADDRINUSE') {
    throw error;
  }

  checkExistingServer((checkError, isHealthy) => {
    if (!checkError && isHealthy) {
      console.log(`Admin API already running at http://${HOST}:${PORT}`);
      process.exit(0);
    }

    console.error(`Port ${PORT} is already in use.`);
    console.error('Stop the old process, then run npm start again:');
    console.error('  npm run stop:admin-api');
    process.exit(1);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Admin API running at http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health.php`);
});
