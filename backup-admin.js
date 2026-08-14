/* ROCKSTAR V17 — Respaldo completo */
(() => {
  const cfg=window.RIVER_CONFIG||{};
  const db=window.riverSupabase ||
    (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
      ? window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY)
      : null);
  if(!db)return;
  window.riverSupabase=db;

  const btn=document.getElementById("downloadFullBackupBtn");
  const status=document.getElementById("backupStatus");

  async function safeTable(table, select="*"){
    try{
      const {data,error}=await db.from(table).select(select);
      if(error) return {ok:false,error:error.message,data:[]};
      return {ok:true,data:data||[]};
    }catch(error){
      return {ok:false,error:String(error?.message||error),data:[]};
    }
  }

  function deriveClients(orders){
    const map=new Map();
    (orders||[]).forEach(order=>{
      const c=order.customer||{};
      const key=String(c.email||c.phone||c.name||"").trim().toLowerCase();
      if(!key)return;
      const existing=map.get(key)||{
        name:c.name||"",
        phone:c.phone||"",
        email:c.email||"",
        orders:0,
        total:0
      };
      existing.orders+=1;
      existing.total+=Number(order.total)||0;
      map.set(key,existing);
    });
    return Array.from(map.values());
  }

  btn?.addEventListener("click",async()=>{
    btn.disabled=true;
    if(status)status.textContent="Preparando respaldo…";

    const [products,orders,movements,notes,settings,categories]=await Promise.all([
      safeTable("products"),
      safeTable("orders"),
      safeTable("inventory_movements"),
      safeTable("order_notes"),
      safeTable("store_settings"),
      safeTable("categories")
    ]);

    const backup={
      product:"ROCKSTAR Store",
      backup_version:"17",
      created_at:new Date().toISOString(),
      warning:"Este respaldo no contiene contraseñas ni claves privadas.",
      products:products.data,
      orders:orders.data,
      inventory_movements:movements.data,
      order_notes:notes.data,
      store_settings:settings.data,
      categories:categories.data,
      clients:deriveClients(orders.data),
      table_status:{
        products:products.ok,
        orders:orders.ok,
        inventory_movements:movements.ok,
        order_notes:notes.ok,
        store_settings:settings.ok,
        categories:categories.ok
      }
    };

    const blob=new Blob([JSON.stringify(backup,null,2)],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    const date=new Date().toISOString().slice(0,10);
    a.href=url;
    a.download=`ROCKSTAR_Respaldo_Completo_${date}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    if(status)status.textContent="Respaldo descargado.";
    btn.disabled=false;
  });
})();
