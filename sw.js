const CACHE='nusadata-v10-investment-intelligence';

const CORE=[
  './',
  './index.html',
  './styles.css',
  './app.js',
  './data/apis.json',
  './manifest.webmanifest',
  './assets/icon.svg'
];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE)
      .then(c=>c.addAll(CORE))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;

  if(url.pathname.includes('/live/')){
    event.respondWith(fetch(event.request,{cache:'no-store'}));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(res=>{
        const copy=res.clone();
        caches.open(CACHE).then(c=>c.put(event.request,copy));
        return res;
      })
      .catch(()=>caches.match(event.request).then(hit=>hit||caches.match('./index.html')))
  );
});