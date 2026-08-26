import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const dist = join(dirname(dirname(fileURLToPath(import.meta.url))), 'dist');
const port = Number(process.env.PORT ?? 8080);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const COMPRESSIBLE = /^text\/|\+xml|\/javascript|\/json|\/svg/;
const compressed = new Map();

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const rel = normalize(path.endsWith('/') ? `${path}index.html` : path).replace(/^(\.\.[/\\])+/, '');
  const file = join(dist, rel);

  if (!file.startsWith(dist)) {
    res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' }).end('Forbidden');
    return;
  }

  let body;
  try {
    body = await readFile(file);
  } catch {
    res
      .writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
      .end('Not found. Run `npm run build` first.');
    return;
  }

  const type = TYPES[extname(file)] ?? 'application/octet-stream';
  const headers = { 'content-type': type, 'cache-control': 'no-cache' };

  // GitHub Pages gzips text responses. Without the same here a local audit
  // measures a transfer size production never sends.
  if (COMPRESSIBLE.test(type) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) {
    const stamp = (await stat(file)).mtimeMs;
    const hit = compressed.get(file);
    body = hit?.stamp === stamp ? hit.body : gzipSync(body, { level: 9 });
    compressed.set(file, { stamp, body });
    headers['content-encoding'] = 'gzip';
    headers.vary = 'Accept-Encoding';
  }

  res.writeHead(200, { ...headers, 'content-length': body.length }).end(body);
}).listen(port, () => console.log(`http://localhost:${port}`));
