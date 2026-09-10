import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist');
const files = (await readdir(root, { recursive: true, withFileTypes: true }))
  .filter((file) => file.isFile() && file.name !== 'sw.js')
  .map((file) => path.relative(root, path.join(file.parentPath, file.name)).replaceAll('\\', '/'))
  .sort();
const hash = createHash('sha256');
for (const file of files) hash.update(file).update(await readFile(path.join(root, file)));
const version = hash.digest('hex').slice(0, 14);

await writeFile(path.join(root, 'sw.js'), `/* Generated from this build's exact asset list. */
const SCOPE = new URL(self.registration.scope);
// Retain the original cache namespace so upgrades retire obsolete caches.
const PREFIX = 'classic-pocket-notes:' + encodeURIComponent(SCOPE.pathname) + ':';
const CACHE = PREFIX + '${version}';
const ASSETS = ${JSON.stringify(files)}.map((file) => new URL(file, SCOPE).href);
const INDEX = new URL('index.html', SCOPE).href;
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith(PREFIX) && key !== CACHE)
      .map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== SCOPE.origin || !url.pathname.startsWith(SCOPE.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => {
      const cached = await (await caches.open(CACHE)).match(INDEX);
      return cached || new Response('Open Pocket Notes online once to enable offline access.', { status: 503 });
    }));
  } else {
    const asset = new URL(url.pathname, SCOPE.origin).href;
    if (ASSETS.includes(asset)) {
      event.respondWith(caches.open(CACHE).then(async (cache) => (await cache.match(asset)) || fetch(request)));
    }
  }
});
`);
console.log(`Offline shell prepared (${files.length} local assets).`);
