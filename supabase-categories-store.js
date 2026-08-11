/* RIVER STORE V12.11.3 — CATEGORÍAS PÚBLICAS DESDE SUPABASE */
(async()=>{
  const cfg=window.RIVER_CONFIG||{};
  if(!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY)return;

  const db=window.riverStoreDb ||
    window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
  window.riverStoreDb=db;

  async function loadPublicCategories(){
    const {data,error}=await db
      .from("categories")
      .select("id,name,type,active,description")
      .eq("active",true)
      .order("id",{ascending:true});

    if(error){
      console.error("No se pudieron cargar categorías públicas:",error);
      return false;
    }

    window.RIVER_PUBLIC_CATEGORIES=(data||[]).map(row=>({
      id:Number(row.id),
      name:row.name,
      type:row.type||"category",
      active:row.active!==false,
      description:row.description||""
    }));

    localStorage.setItem("river_categories",JSON.stringify(window.RIVER_PUBLIC_CATEGORIES));

    if(typeof riverRenderCategoryFilters==="function"){
      riverRenderCategoryFilters();
    }
    return true;
  }

  window.refreshStoreCategoriesFromSupabase=loadPublicCategories;
  await loadPublicCategories();
})();
