
/* ==========================================================
   RIVER STORE V12.2 — PRODUCTOS EN SUPABASE
   Mantiene temporalmente localStorage como caché visual.
   Supabase es la copia compartida de productos/stock.
   ========================================================== */
(() => {
  const cfg = window.RIVER_CONFIG || {};
  const db = window.riverSupabase ||
    (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
      ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
      : null);

  if (!db) {
    console.error("RIVER V12.2: Supabase no disponible.");
    return;
  }

  window.riverSupabase = db;
  let syncing = false;

  function toDbProduct(p) {
    const images = Array.isArray(p.images) && p.images.length
      ? p.images
      : [p.image || "assets/gorra_collage.jpg"];

    return {
      id: Number(p.id),
      name: String(p.name || "").trim(),
      price: Number(p.price) || 0,
      stock: Math.max(0, Number(p.stock) || 0),
      color: p.color || null,
      active: p.active !== false,
      description: p.description || null,
      image_url: p.image || images[0] || "assets/gorra_collage.jpg",
      images,
      video_url: p.video || null,
      category_id: p.categoryId ? Number(p.categoryId) : null
    };
  }

  function fromDbProduct(row) {
    let cachedCategoryId = null;
    try{
      const cached = JSON.parse(localStorage.getItem("river_products") || "[]");
      const prior = Array.isArray(cached) ? cached.find(p => Number(p.id) === Number(row.id)) : null;
      cachedCategoryId = prior?.categoryId ?? null;
    }catch(e){}

    const images = Array.isArray(row.images) && row.images.length
      ? row.images
      : [row.image_url || "assets/gorra_collage.jpg"];

    return {
      id: Number(row.id),
      name: row.name,
      price: Number(row.price),
      stock: Number(row.stock),
      color: row.color || "",
      active: row.active !== false,
      description: row.description || "",
      image: row.image_url || images[0] || "assets/gorra_collage.jpg",
      images,
      video: row.video_url || "",
      categoryId: row.category_id ?? cachedCategoryId ?? null
    };
  }

  function setOnlineStatus(text, type = "") {
    const el = document.getElementById("onlineProductStatus");
    if (!el) return;
    el.textContent = text;
    el.className = `online-product-status ${type}`;
  }

  async function replaceCacheFromSupabase() {
    setOnlineStatus("Conectando productos con Supabase…");
    const { data, error } = await db
      .from("products")
      .select("id,name,price,stock,color,active,description,image_url,images,video_url,category_id,created_at,updated_at")
      .order("id", { ascending: true });

    if (error) {
      console.error(error);
      setOnlineStatus("No se pudieron leer productos de Supabase.", "error");
      return false;
    }

    // Primera conexión: si la tabla está vacía, migra los productos locales actuales.
    if (!data.length) {
      const local = getProducts();
      if (local.length) {
        const rows = local.map(toDbProduct);
        const { error: migrateError } = await db.from("products").upsert(rows, { onConflict: "id" });
        if (migrateError) {
          console.error(migrateError);
          setOnlineStatus("Error al migrar productos locales.", "error");
          return false;
        }
        setOnlineStatus(`${rows.length} producto(s) iniciales migrados a Supabase.`, "ok");
        return true;
      }
    }

    const products = data.map(fromDbProduct);
    localStorage.setItem("river_products", JSON.stringify(products));
    // Si category_id aún estaba vacío en Supabase pero existía localmente,
    // lo preservamos y lo subimos para no perder la clasificación ya hecha.
    const hasLocalCategories = products.some(p => p.categoryId);
    if(hasLocalCategories){
      const rowsToSync = products.map(toDbProduct);
      await db.from("products").upsert(rowsToSync, { onConflict: "id" });
    }
    renderProducts();
    setOnlineStatus(`Supabase conectado · ${products.length} producto(s)`, "ok");
    return true;
  }

  async function syncProductsToSupabase(products) {
    if (syncing) return;
    syncing = true;
    setOnlineStatus("Guardando en Supabase…");

    try {
      const rows = products.map(toDbProduct);
      if (rows.length) {
        const { error } = await db.from("products").upsert(rows, { onConflict: "id" });
        if (error) throw error;
      }
      setOnlineStatus("Productos sincronizados con Supabase.", "ok");
      return true;
    } catch (err) {
      console.error(err);
      setOnlineStatus("No se pudo guardar en Supabase. Revisa conexión.", "error");
      return false;
    } finally {
      syncing = false;
    }
  }

  // Conservamos la lógica existente y añadimos sincronización remota.
  const localSaveProducts = saveProducts;
  saveProducts = function(products) {
    localSaveProducts(products);
    syncProductsToSupabase(products);
  };

  // Eliminación real de Supabase.
  deleteProduct = async function(id) {
    const products = getProducts();
    const product = products.find(p => Number(p.id) === Number(id));
    if (!product) return;
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;

    setOnlineStatus("Eliminando producto…");
    const { error } = await db.from("products").delete().eq("id", Number(id));
    if (error) {
      console.error(error);
      setOnlineStatus("No se pudo eliminar el producto de Supabase.", "error");
      alert("No se pudo eliminar el producto. Intenta de nuevo.");
      return;
    }

    localSaveProducts(products.filter(p => Number(p.id) !== Number(id)));
    renderProducts();
    resetForm();
    setOnlineStatus("Producto eliminado de Supabase.", "ok");
  };

  window.refreshProductsFromSupabase = replaceCacheFromSupabase;

  // Espera a que auth-guard haya establecido la sesión.
  setTimeout(replaceCacheFromSupabase, 250);
})();
