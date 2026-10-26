// Service worker do "Como votar?": guarda só arquivos do próprio site para o
// jogo abrir sem internet. Firebase, IBGE e provedores de IA nunca passam pelo
// cache (a chave de IA do jogador nunca é armazenada aqui).
// Cada build registra o service worker com a sua versão (?v=), e os caches antigos são apagados.
const CACHE = `comovotar-${new URL(self.location.href).searchParams.get('v') ?? 'dev'}`
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/favicon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (c) => {
      await c.addAll(SHELL)
      // Todos os arquivos do build (lista gerada no build), para jogar sem internet.
      try {
        const list = await (await fetch('/precache.json', { cache: 'no-store' })).json()
        await c.addAll(list)
      } catch {
        // sem lista: os arquivos entram no cache conforme forem usados
      }
    }),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Páginas: rede primeiro (versão nova), cache se estiver sem internet.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/index.html', copy))
          return res
        })
        .catch(() => caches.match('/index.html', { ignoreVary: true })),
    )
    return
  }

  // Arquivos com hash no nome (/assets) e ícones: cache primeiro.
  event.respondWith(
    caches.match(req, { ignoreVary: true }).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok && (url.pathname.startsWith('/assets/') || /\.(png|svg|webmanifest|json)$/.test(url.pathname))) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(req, copy))
          }
          return res
        }),
    ),
  )
})
