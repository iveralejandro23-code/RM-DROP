/* ROCKSTAR V17.7 — políticas editables desde Admin */
(async()=>{
  const cfg=window.RIVER_CONFIG||{};
  const db=window.riverSupabase ||
    (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
      ? window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY)
      : null);
  if(!db)return;

  const type=document.body.dataset.policyType;
  const column={
    shipping:"shipping_policy",
    returns:"returns_policy",
    privacy:"privacy_policy",
    terms:"terms_policy"
  }[type];
  if(!column)return;

  try{
    const {data,error}=await db.from("store_settings")
      .select(`store_name,${column},updated_at`).eq("id",1).maybeSingle();
    if(error||!data)return;

    document.querySelectorAll("[data-policy-store-name]").forEach(el=>{
      el.textContent=data.store_name||"ROCKSTAR";
    });

    const text=String(data[column]||"").trim();
    const target=document.getElementById("policyDynamicContent");
    if(text && target){
      target.innerHTML="";
      text.split(/\n{2,}/).map(x=>x.trim()).filter(Boolean).forEach(block=>{
        const p=document.createElement("p");
        p.textContent=block;
        target.appendChild(p);
      });
      document.getElementById("policyDefaultContent")?.setAttribute("hidden","");
    }

    if(data.updated_at){
      const d=new Date(data.updated_at);
      const el=document.getElementById("policyUpdatedAt");
      if(el && !Number.isNaN(d.getTime())){
        el.textContent="Última actualización: "+new Intl.DateTimeFormat("es-MX",{day:"numeric",month:"long",year:"numeric"}).format(d)+".";
      }
    }
  }catch(e){ console.warn("No se pudieron cargar políticas:",e); }
})();