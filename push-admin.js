/* ROCKSTAR V22 — PWA + Web Push para Admin */
(() => {
  const cfg=window.RIVER_CONFIG||{};
  const $=id=>document.getElementById(id);
  const status=$("pushDeviceStatus");
  const enableBtn=$("enablePushBtn");
  const disableBtn=$("disablePushBtn");

  const db=()=>window.riverSupabase || (
    window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
      ? (window.riverSupabase=window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY))
      : null
  );

  const setStatus=(text,type="")=>{
    if(!status)return;
    status.textContent=text;
    status.className=`push-device-status ${type}`.trim();
  };

  function b64ToUint8Array(base64String){
    const padding="=".repeat((4-base64String.length%4)%4);
    const base64=(base64String+padding).replace(/-/g,"+").replace(/_/g,"/");
    const raw=atob(base64);
    return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
  }

  async function serviceWorker(){
    if(!("serviceWorker" in navigator)) throw new Error("Este navegador no admite Service Worker.");
    return navigator.serviceWorker.register("./service-worker.js",{scope:"./"});
  }

  async function publicKey(){
    const client=db();
    if(!client) throw new Error("No hay conexión con Supabase.");
    const {data,error}=await client.from("store_settings")
      .select("push_vapid_public_key").eq("id",1).maybeSingle();
    if(error) throw error;
    const key=String(data?.push_vapid_public_key||"").trim();
    if(!key) throw new Error("Falta configurar la clave pública Push en Datos de la tienda.");
    return key;
  }

  async function saveSubscription(subscription){
    const client=db();
    const raw=subscription.toJSON();
    const payload={
      endpoint:raw.endpoint,
      p256dh:raw.keys?.p256dh||"",
      auth:raw.keys?.auth||"",
      user_agent:navigator.userAgent,
      active:true,
      last_seen_at:new Date().toISOString()
    };
    const {error}=await client.from("push_subscriptions").upsert(payload,{onConflict:"endpoint"});
    if(error) throw error;
  }

  async function current(){
    const reg=await navigator.serviceWorker.getRegistration("./");
    if(!reg)return null;
    return reg.pushManager.getSubscription();
  }

  async function refresh(){
    if(!window.isSecureContext){
      setStatus("Las notificaciones Push requieren HTTPS. GitHub Pages sí cumple este requisito.","bad");
      return;
    }
    if(!("Notification" in window) || !("PushManager" in window)){
      setStatus("Este navegador no admite notificaciones Push.","bad");return;
    }
    try{
      const sub=await current();
      if(Notification.permission==="granted" && sub){
        setStatus("✓ Notificaciones activadas en este dispositivo.","ok");
      }else if(Notification.permission==="denied"){
        setStatus("Las notificaciones están bloqueadas en los ajustes del navegador.","bad");
      }else{
        const ios=/iPad|iPhone|iPod/.test(navigator.userAgent);
        const standalone=window.matchMedia("(display-mode: standalone)").matches || navigator.standalone===true;
        if(ios && !standalone){
          setStatus("En iPhone: Compartir → Agregar a pantalla de inicio → abre ROCKSTAR Admin desde el icono → Activar notificaciones.","warn");
        }else{
          setStatus("Notificaciones todavía no activadas en este dispositivo.","warn");
        }
      }
    }catch(e){setStatus(e.message||"No se pudo comprobar Push.","bad")}
  }

  enableBtn?.addEventListener("click",async()=>{
    try{
      if(!window.isSecureContext) throw new Error("Abre ROCKSTAR desde HTTPS/GitHub Pages.");
      const reg=await serviceWorker();
      const permission=await Notification.requestPermission();
      if(permission!=="granted") throw new Error("No se concedió permiso para notificaciones.");
      let sub=await reg.pushManager.getSubscription();
      if(!sub){
        sub=await reg.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:b64ToUint8Array(await publicKey())
        });
      }
      await saveSubscription(sub);
      setStatus("✓ Este celular quedó registrado para recibir pedidos.","ok");
    }catch(e){
      console.error("Push:",e);
      setStatus(e.message||"No se pudieron activar las notificaciones.","bad");
    }
  });

  disableBtn?.addEventListener("click",async()=>{
    try{
      const sub=await current();
      if(sub){
        const endpoint=sub.endpoint;
        await sub.unsubscribe();
        const client=db();
        if(client) await client.from("push_subscriptions").update({active:false,last_seen_at:new Date().toISOString()}).eq("endpoint",endpoint);
      }
      setStatus("Notificaciones desactivadas en este dispositivo.","warn");
    }catch(e){setStatus(e.message||"No se pudieron desactivar.","bad")}
  });

  window.addEventListener("load",()=>{serviceWorker().catch(()=>{}).finally(refresh)});
})();
