const CACHE='wos-guide-site-v29';
const ASSETS=["./","./index.html","./manifest.webmanifest","./assets/css/shell.css?v=24","./assets/css/content.css?v=24","./assets/js/search-index.js?v=28","./assets/js/app.js?v=24","./assets/icons/favicon.svg","./assets/icons/icon-192.png","./assets/icons/icon-512.png","./tools/construction/index.html","./guides/events/ice-mine.html","./guides/events/snowbusters.html","./guides/events/crazy-joe.html","./guides/events/wandering-theater.html","./guides/events/foundry.html","./guides/combat/combat-system.html","./guides/combat/heroes-gear.html","./guides/development/account-development.html","./guides/development/shops-currencies.html","./guides/svs/first-svs.html","./guides/buildings/furnace.html","./guides/combat/hero-generations.html","./guides/buildings/buildings.html","./assets/guides/foundry/score.webp","./assets/guides/foundry/foundry.webp","./assets/guides/foundry/prototype.webp","./assets/guides/foundry/repair.webp","./assets/guides/foundry/warehouse.webp","./assets/guides/foundry/boiler.webp","./assets/guides/foundry/transit.webp","./assets/guides/foundry/merc.webp","./assets/guides/foundry/workshop.webp","./assets/guides/foundry/merc-mail.webp","./tools/research/index.html","./tools/research/research.css?v=24","./tools/research/research-data.js?v=24","./tools/research/research-app.js?v=24","./guides/events/bear-hunt.html","./assets/guides/bear/jessie.webp","./assets/guides/bear/jasser.webp","./assets/guides/bear/seo-yoon.webp"];

self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.allSettled(ASSETS.map(url=>cache.add(url)))));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith('wos-guide-site-')&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith((async()=>{
    try{
      const fresh=await fetch(req,{cache:'no-store'});
      if(fresh&&fresh.ok){const cache=await caches.open(CACHE);cache.put(req,fresh.clone()).catch(()=>{});}
      return fresh;
    }catch(err){
      const cached=await caches.match(req,{ignoreSearch:false})||await caches.match(req,{ignoreSearch:true});
      if(cached)return cached;
      if(req.mode==='navigate')return (await caches.match('./index.html'))||Response.error();
      throw err;
    }
  })());
});
