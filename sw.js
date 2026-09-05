const CACHE='wos-guide-site-v42';
const ASSETS=["./","./index.html","./manifest.webmanifest","./assets/css/shell.css?v=24","./assets/css/content.css?v=24","./assets/js/search-index.js?v=34","./assets/js/app.js?v=24","./assets/icons/favicon.svg","./assets/icons/icon-192.png","./assets/icons/icon-512.png","./tools/construction/index.html","./guides/events/ice-mine.html","./guides/events/snowbusters.html","./guides/events/crazy-joe.html","./guides/events/wandering-theater.html","./guides/events/foundry.html","./guides/combat/combat-system.html","./guides/combat/heroes-gear.html","./guides/combat/heroes.html","./guides/combat/hero-gear.html","./assets/guides/heroes/natalia-expedition.webp","./assets/guides/heroes/flint-expedition.webp","./assets/guides/heroes/alonso-four-stars.webp","./assets/guides/heroes/alonso-skills-5.webp","./assets/guides/heroes/philly-star-upgrade.webp","./assets/guides/heroes/philly-summary.webp","./assets/guides/heroes/philly-skills.webp","./guides/development/account-development.html","./guides/development/shops-currencies.html","./guides/svs/first-svs.html","./guides/buildings/furnace.html","./guides/combat/hero-generations.html","./guides/buildings/buildings.html","./assets/guides/foundry/score.webp","./assets/guides/foundry/foundry.webp","./assets/guides/foundry/prototype.webp","./assets/guides/foundry/repair.webp","./assets/guides/foundry/warehouse.webp","./assets/guides/foundry/boiler.webp","./assets/guides/foundry/transit.webp","./assets/guides/foundry/merc.webp","./assets/guides/foundry/workshop.webp","./assets/guides/foundry/merc-mail.webp","./tools/research/index.html","./tools/research/research.css?v=24","./tools/research/research-data.js?v=24","./tools/research/research-app.js?v=24","./guides/events/bear-hunt.html","./assets/guides/bear/jessie.webp","./assets/guides/bear/jasser.webp","./assets/guides/bear/seo-yoon.webp","./guides/combat/pvp-objects.html","./assets/guides/pvp/refill-minimarches-collage.webp","./assets/guides/snowbusters/rockets-purchase.webp","./assets/guides/snowbusters/superplow-area13.webp","./assets/guides/snowbusters/coal-to-fuel.webp","./assets/guides/snowbusters/area14-start.webp","./assets/guides/snowbusters/gear-coat-boots.webp","./guides/events/alliance-mobilization.html","./assets/guides/mobilization/attempts-150.webp","./assets/guides/mobilization/personal-200-120.webp","./assets/guides/mobilization/personal-cooldowns.webp","./assets/guides/mobilization/alliance-monuments.webp","./assets/guides/hero-gear/flint-balanced.webp","./assets/guides/hero-gear/infantry-goggles.webp","./assets/guides/hero-gear/infantry-boots.webp","./assets/guides/hero-gear/infantry-gloves.webp","./assets/guides/hero-gear/infantry-belt.webp","./assets/guides/hero-gear/marksman-belt.webp","./assets/guides/hero-gear/marksman-goggles.webp","./assets/guides/hero-gear/marksman-boots.webp","./assets/guides/hero-gear/marksman-gloves.webp","./assets/guides/hero-gear/widget-flint-info.webp","./assets/guides/hero-gear/widget-flint-upgrade.webp","./assets/guides/hero-gear/widget-alonso-info.webp","./assets/guides/combat-system/march-setup.webp","./assets/guides/combat-system/report-overview.webp","./assets/guides/combat-system/report-force.webp","./assets/guides/combat-system/report-stats.webp","./assets/guides/combat-system/report-special.webp","./assets/guides/combat-system/report-skills.webp","./assets/guides/combat-system/report-losses.webp","./assets/guides/combat-system/report-gear-heroes.webp","./assets/guides/combat-system/bad-stats-collage.webp"];

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
