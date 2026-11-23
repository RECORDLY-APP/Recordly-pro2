const C='recordly-v3',F=['./','index.html','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','privacy.html','terms.html'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET'||new URL(e.request.url).origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request)));
});
self.addEventListener('push',e=>{
  let p={title:'Recordly',body:'You have a new payment update.',url:'#/notifications',tag:'rc-push'};
  try{if(e.data){const d=e.data.json();if(d&&typeof d==='object')p=Object.assign(p,d);}}catch(err){try{p.body=e.data.text()||p.body;}catch(x){}}
  e.waitUntil(self.registration.showNotification(p.title,{
    body:p.body,
    icon:'icon-192.png',
    badge:'icon-192.png',
    tag:p.tag||'rc-push',
    data:{url:p.url||'#/notifications'}
  }));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const target=(e.notification&&e.notification.data&&e.notification.data.url)||'#/notifications';
  e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){
      if('focus' in c){
        c.focus();
        c.postMessage({type:'goto',hash:target});
        return;
      }
    }
    if(clients.openWindow)return clients.openWindow('./'+target);
  }));
});
