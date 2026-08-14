/* ROCKSTAR V17.9 — notificaciones de pedidos en Admin */
(() => {
  const cfg=window.RIVER_CONFIG||{};
  const db=window.riverSupabase ||
    (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
      ? window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY)
      : null);
  if(!db)return;
  window.riverSupabase=db;

  const $=id=>document.getElementById(id);
  const badge=$("adminNotificationBadge");
  const list=$("adminNotificationsList");
  const KEY="rockstar_orders_last_seen_at";
  let recent=[];

  const money=n=>new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(Number(n)||0);
  const dateText=v=>{
    try{return new Intl.DateTimeFormat("es-MX",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));}
    catch{return v||"";}
  };
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function lastSeen(){return localStorage.getItem(KEY)||"1970-01-01T00:00:00.000Z";}
  function unreadCount(){
    const seen=new Date(lastSeen()).getTime();
    return recent.filter(o=>new Date(o.created_at).getTime()>seen).length;
  }
  function updateBadge(){
    if(!badge)return;
    const n=unreadCount();
    badge.textContent=String(n);
    badge.hidden=n===0;
  }
  function render(){
    if(!list)return;
    if(!recent.length){
      list.innerHTML='<div class="empty-list">Todavía no hay pedidos.</div>';
      updateBadge(); return;
    }
    const seen=new Date(lastSeen()).getTime();
    list.innerHTML=recent.slice(0,15).map(o=>{
      const fresh=new Date(o.created_at).getTime()>seen;
      return `<article class="admin-notification-item ${fresh?"is-unread":""}">
        <div class="admin-notification-icon">🛍️</div>
        <div class="admin-notification-body">
          <div class="admin-notification-title">
            <strong>${esc(o.folio||"Pedido nuevo")}</strong>
            ${fresh?'<span class="admin-notification-new">NUEVO</span>':""}
          </div>
          <div>${esc(o.customer_name||"Cliente")} · ${money(o.total)}</div>
          <small>${dateText(o.created_at)}</small>
        </div>
      </article>`;
    }).join("");
    updateBadge();
  }

  async function loadRecent(){
    const {data,error}=await db.from("orders")
      .select("id,folio,customer_name,total,status,created_at")
      .order("created_at",{ascending:false}).limit(15);
    if(error){console.warn("Notificaciones:",error);return;}
    recent=data||[];
    render();
  }

  $("markNotificationsReadBtn")?.addEventListener("click",()=>{
    const newest=recent[0]?.created_at||new Date().toISOString();
    localStorage.setItem(KEY,newest);
    render();
  });

  document.querySelectorAll('a[href="#notificationsPanel"]').forEach(link=>{
    link.addEventListener("click",()=>{
      setTimeout(()=>{
        const newest=recent[0]?.created_at||new Date().toISOString();
        localStorage.setItem(KEY,newest);
        render();
      },800);
    });
  });

  const channel=db.channel("rockstar-admin-orders")
    .on("postgres_changes",
      {event:"INSERT",schema:"public",table:"orders"},
      payload=>{
        recent=[payload.new,...recent.filter(x=>x.id!==payload.new.id)].slice(0,15);
        render();
        try{
          const title=`Nuevo pedido ${payload.new.folio||""}`;
          if("Notification" in window && Notification.permission==="granted"){
            new Notification(title,{body:`${payload.new.customer_name||"Cliente"} · ${money(payload.new.total)}`});
          }
        }catch(_){}
      })
    .subscribe();

  // Ask only after the user opens Notifications, not on page load.
  $("notificationsPanel")?.addEventListener("click",()=>{
    if("Notification" in window && Notification.permission==="default"){
      Notification.requestPermission().catch(()=>{});
    }
  },{once:true});

  window.addEventListener("beforeunload",()=>{try{db.removeChannel(channel)}catch(_){}});
  loadRecent();
})();
