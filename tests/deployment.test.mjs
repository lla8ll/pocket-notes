import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const dist = path.resolve('dist');
const html = await readFile(path.join(dist, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(path.join(dist, 'manifest.webmanifest'), 'utf8'));
const worker = await readFile(path.join(dist, 'sw.js'), 'utf8');

async function localFile(url, scope) {
  assert.equal(url.origin, scope.origin);
  assert.ok(url.pathname.startsWith(scope.pathname), `Outside application scope: ${url.href}`);
  const relative = decodeURIComponent(url.pathname.slice(scope.pathname.length)) || 'index.html';
  const file = path.resolve(dist, relative);
  assert.ok(file.startsWith(dist + path.sep));
  assert.ok((await stat(file)).isFile(), `Missing build asset: ${relative}`);
  return file;
}

function workerHarness(scopeHref) {
  const listeners = new Map();
  const stores = new Map();
  const added = [];
  let online = true;
  let claimed = false;
  const scope = new URL(scopeHref);
  const fetch = async (request) => {
    if (!online) throw new TypeError('Offline');
    return new Response('network:' + (request.url ?? request));
  };
  const caches = {
    async keys() { return [...stores.keys()]; },
    async delete(key) { return stores.delete(key); },
    async open(key) {
      if (!stores.has(key)) stores.set(key, new Map());
      const entries = stores.get(key);
      return {
        async addAll(urls) {
          for (const href of urls) {
            const file = await localFile(new URL(href), scope);
            entries.set(href, new Response(await readFile(file)));
            added.push(href);
          }
        },
        async match(url) { return entries.get(url)?.clone(); },
      };
    },
  };
  vm.runInNewContext(worker, {
    URL, Response, caches, fetch,
    self: {
      registration: { scope: scope.href },
      clients: { async claim() { claimed = true; } },
      addEventListener(name, listener) { listeners.set(name, listener); },
    },
  });
  return {
    added, stores,
    setOnline(value) { online = value; },
    claimed() { return claimed; },
    async lifecycle(name) {
      let completion;
      listeners.get(name)({ waitUntil(promise) { completion = promise; } });
      await completion;
    },
    request(url, { mode = 'cors', method = 'GET' } = {}) {
      let response;
      listeners.get('fetch')({
        request: { url, mode, method },
        respondWith(promise) { response = promise; },
      });
      return response;
    },
  };
}

for (const base of ['https://example.test/', 'https://example.test/pocket-notes/', 'https://example.test/classic-pocket-notes/', 'https://example.test/apps/renamed-notes/']) {
  test(`HTML, manifest, fonts and service worker resolve under ${new URL(base).pathname}`, async () => {
    const scope = new URL(base);
    const references = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(references.some((url) => url.endsWith('.js')));
    assert.ok(references.some((url) => url.endsWith('.css')));
    for (const reference of references) {
      assert.ok(reference.startsWith('./'), `Expected a portable URL: ${reference}`);
      const url = new URL(reference, scope);
      const file = await localFile(url, scope);
      if (file.endsWith('.css')) {
        const css = await readFile(file, 'utf8');
        for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
          const font = match[1].replaceAll(/["']/g, '');
          if (!font.startsWith('data:')) await localFile(new URL(font, url), scope);
        }
      }
    }
    const manifestURL = new URL('manifest.webmanifest', scope);
    for (const field of ['id', 'scope', 'start_url']) assert.equal(new URL(manifest[field], manifestURL).href, scope.href);
    for (const icon of manifest.icons) await localFile(new URL(icon.src, manifestURL), scope);
    await localFile(new URL('sw.js', scope), scope);
  });
}

test('deployed metadata and icon formats identify Pocket Notes', async () => {
  assert.match(html, /<title>Pocket Notes<\/title>/);
  assert.match(html, /name="apple-mobile-web-app-title" content="Pocket Notes"/);
  assert.equal(manifest.name, 'Pocket Notes');
  assert.equal(manifest.short_name, 'Pocket Notes');
  assert.ok(manifest.icons.some((icon) => icon.purpose === 'maskable'));
  const icons = [
    ...manifest.icons.map((icon) => [icon.src.replace(/^\.\//, ''), Number(icon.sizes.split('x')[0])]),
    ['icons/apple-touch-icon.png', 180],
    ...[16, 32, 48].map((size) => [`icons/favicon-${size}.png`, size]),
  ];
  for (const [file, size] of icons) {
    const bytes = await readFile(path.join(dist, file));
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], `Invalid PNG: ${file}`);
    assert.equal(bytes.readUInt32BE(16), size, `Wrong width: ${file}`);
    assert.equal(bytes.readUInt32BE(20), size, `Wrong height: ${file}`);
    if (file.includes('maskable') || file.includes('apple-touch')) {
      assert.equal(bytes[25], 2, `Home-screen icons should have an opaque RGB canvas: ${file}`);
    }
  }
  const favicon = await readFile(path.join(dist, 'favicon.ico'));
  assert.equal(favicon.readUInt16LE(0), 0);
  assert.equal(favicon.readUInt16LE(2), 1);
  assert.equal(favicon.readUInt16LE(4), 3);
  assert.deepEqual([0, 1, 2].map((index) => favicon[6 + index * 16]), [16, 32, 48]);
});

test('offline installation caches every deployed file under the repository path', async () => {
  const harness = workerHarness('https://example.test/pocket-notes/');
  await harness.lifecycle('install');
  const files = (await readdir(dist, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name !== 'sw.js');
  assert.equal(harness.added.length, files.length);
  assert.ok(harness.added.every((url) => url.startsWith('https://example.test/pocket-notes/')));
});

test('offline navigation and bundled assets use this application cache; online navigation fetches fresh HTML', async () => {
  const base = 'https://example.test/pocket-notes/';
  const harness = workerHarness(base);
  await harness.lifecycle('install');
  const online = await harness.request(base, { mode: 'navigate' });
  assert.equal(await online.text(), 'network:' + base);
  harness.setOnline(false);
  const offline = await harness.request(base, { mode: 'navigate' });
  assert.equal(await offline.text(), html);
  const script = harness.added.find((url) => url.endsWith('.js'));
  assert.ok(script);
  const cachedScript = await harness.request(script + '?v=1');
  assert.equal(await cachedScript.text(), await readFile(await localFile(new URL(script), new URL(base)), 'utf8'));
});

test('worker activation removes only obsolete caches from its own repository scope', async () => {
  const harness = workerHarness('https://example.test/classic-pocket-notes/');
  const ownOld = 'classic-pocket-notes:' + encodeURIComponent('/classic-pocket-notes/') + ':old';
  const otherApp = 'classic-pocket-notes:' + encodeURIComponent('/another-notebook/') + ':old';
  const unrelated = 'unrelated-site-cache';
  harness.stores.set(ownOld, new Map());
  harness.stores.set(otherApp, new Map());
  harness.stores.set(unrelated, new Map());
  await harness.lifecycle('install');
  await harness.lifecycle('activate');
  assert.ok(!harness.stores.has(ownOld));
  assert.ok(harness.stores.has(otherApp));
  assert.ok(harness.stores.has(unrelated));
  assert.equal(harness.stores.size, 3);
  assert.ok(harness.claimed());
});

test('worker leaves other paths, external URLs, writes and unknown resources alone', () => {
  const harness = workerHarness('https://example.test/classic-pocket-notes/');
  for (const url of ['https://other.test/classic-pocket-notes/', 'https://example.test/another-app/',
    'https://example.test/classic-pocket-notes-other/', 'https://example.test/classic-pocket-notes/unknown.json']) {
    assert.equal(harness.request(url), undefined);
  }
  assert.equal(harness.request('https://example.test/classic-pocket-notes/', { mode: 'navigate', method: 'POST' }), undefined);
});

test('missing offline cache returns an explicit response rather than an invalid fetch result', async () => {
  const harness = workerHarness('https://example.test/classic-pocket-notes/');
  harness.setOnline(false);
  const response = await harness.request('https://example.test/classic-pocket-notes/', { mode: 'navigate' });
  assert.equal(response.status, 503);
  assert.match(await response.text(), /online once/);
});
