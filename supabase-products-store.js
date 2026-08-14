/* RIVER STORE V12.4.2 — CATÁLOGO ESTABLE DESDE SUPABASE */
(async () => {
  const cfg = window.RIVER_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    console.error("Supabase no disponible para catálogo.");
    return;
  }

  const db = window.riverStoreDb ||
    window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  window.riverStoreDb = db;

  let lastGoodProducts = [];

  function mapProducts(data) {
    return (data || []).map(row => {
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
        categoryId: row.category_id ?? null,
        promoActive: !!row.promo_active,
        promoType: row.promo_type || "percent",
        promoPercent: row.promo_percent == null ? null : Number(row.promo_percent),
        promoPrice: row.promo_price == null ? null : Number(row.promo_price),
        promoLabel: row.promo_label || "",
        promoStart: row.promo_start || null,
        promoEnd: row.promo_end || null
      };
    });
  }

  async function loadOnlineCatalog() {
    const { data, error } = await db
      .from("products")
      .select("id,name,price,stock,color,active,description,image_url,images,video_url,category_id,promo_active,promo_type,promo_percent,promo_price,promo_label,promo_start,promo_end,updated_at")
      .eq("active", true)
      .order("id", { ascending: true });

    if (error) {
      console.error("No se pudo cargar el catálogo online:", error);
      // Nunca borra el catálogo si hubo un fallo temporal.
      if (lastGoodProducts.length) {
        PRODUCTS = [...lastGoodProducts];
        renderStoreProducts();
        renderCart();
      }
      return false;
    }

    const onlineProducts = mapProducts(data);

    // Supabase es la fuente real. Incluso si no hay productos, el resultado es válido.
    PRODUCTS = onlineProducts;
    lastGoodProducts = [...onlineProducts];

    // Caché secundaria únicamente; no vuelve a mandar sobre Supabase.
    localStorage.setItem("river_products", JSON.stringify(onlineProducts));

    // Ajustar carrito al catálogo/stock online.
    cart = cart.filter(item => {
      const product = PRODUCTS.find(p => Number(p.id) === Number(item.id));
      if (!product || product.active === false || Number(product.stock) <= 0) return false;

      item.name = product.name;
      item.price = typeof effectivePriceStore === "function"
        ? effectivePriceStore(product)
        : product.price;
      item.stock = product.stock;
      item.image = product.image;
      item.qty = Math.min(Number(item.qty) || 1, Number(product.stock));
      return item.qty > 0;
    });

    saveCart();
    renderStoreProducts();
    renderCart();
    return true;
  }

  window.refreshStoreProductsFromSupabase = loadOnlineCatalog;

  await loadOnlineCatalog();

  // Refresco suave cada minuto para mantener catálogo/stock actualizados.
  // Si falla la red, conserva el último catálogo correcto.
  setInterval(loadOnlineCatalog, 60000);
})();