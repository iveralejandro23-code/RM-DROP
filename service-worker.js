/* ROCKSTAR V22 — Service Worker */
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil(self.clients.claim()));

self.addEventListener("push",event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch(_){data={body:event.data?.text()||""}}
  const title=data.title||"ROCKSTAR";
  const options={
    body:data.body||"Tienes una nueva notificación.",
    icon:data.icon||"./assets/icons/icon-192.png",
    badge:data.badge||"./assets/icons/badge-96.png",
    tag:data.tag||"rockstar-order",
    renotify:true,
    data:{url:data.url||"./admin.html#ordersPanel",...(data.data||{})}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=new URL(event.notification.data?.url||"./admin.html#ordersPanel",self.location.origin).href;
  event.waitUntil((async()=>{
    const list=await clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of list){
      if("focus" in client){
        try{await client.navigate(url)}catch(_){}
        return client.focus();
      }
    }
    if(clients.openWindow)return clients.openWindow(url);
  })());
});
