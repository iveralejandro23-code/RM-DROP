/* RIVER STORE V12.11.3 — CATEGORÍAS ADMIN EN SUPABASE */
(async()=>{
  const cfg=window.RIVER_CONFIG||{};
  const db=window.riverSupabase ||
    (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
      ? window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY)
      : null);
  if(!db)return;

  window.riverSupabase=db;
  let syncing=false;

  function toDbCategory(c){
    return {
      id:Number(c.id),
      name:String(c.name||"").trim(),
      type:c.type==="collection"?"collection":"category",
      active:c.active!==false,
      description:c.description||"",
      updated_at:new Date().toISOString()
    };
  }

  function fromDbCategory(row){
    return {
      id:Number(row.id),
      name:row.name,
      type:row.type||"category",
      active:row.active!==false,
      description:row.description||""
    };
  }

  async function syncCategoriesToSupabase(categories){
    if(syncing)return;
    syncing=true;
    try{
      const local=Array.isArray(categories)?categories:[];
      const rows=local.map(toDbCategory);

      const {data:remote,error:readError}=await db
        .from("categories")
        .select("id");
      if(readError)throw readError;

      const localIds=new Set(rows.map(r=>Number(r.id)));
      const removeIds=(remote||[])
        .map(r=>Number(r.id))
        .filter(id=>!localIds.has(id));

      if(removeIds.length){
        const {error:deleteError}=await db
          .from("categories")
          .delete()
          .in("id",removeIds);
        if(deleteError)throw deleteError;
      }

      if(rows.length){
        const {error:upsertError}=await db
          .from("categories")
          .upsert(rows,{onConflict:"id"});
        if(upsertError)throw upsertError;
      }
    }catch(err){
      console.error("No se pudieron sincronizar categorías:",err);
    }finally{
      syncing=false;
    }
  }

  async function loadCategoriesFromSupabase(){
    const {data,error}=await db
      .from("categories")
      .select("id,name,type,active,description,updated_at")
      .order("id",{ascending:true});

    if(error){
      console.error("No se pudieron leer categorías:",error);
      return;
    }

    // Primera migración: si Supabase aún no tiene categorías,
    // sube las que ya existen en esta computadora.
    if(!data.length){
      const local=loadCategories();
      if(local.length){
        await syncCategoriesToSupabase(local);
      }
      return;
    }

    const categories=data.map(fromDbCategory);
    localStorage.setItem("river_categories",JSON.stringify(categories));
    populateCategorySelects();
    renderCategories();
    renderProducts();
  }

  const localSaveCategories=saveCategories;
  saveCategories=function(categories){
    localSaveCategories(categories);
    syncCategoriesToSupabase(categories);
  };

  window.refreshCategoriesFromSupabase=loadCategoriesFromSupabase;
  setTimeout(loadCategoriesFromSupabase,400);
})();
