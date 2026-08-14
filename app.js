

/* ==========================================================
   RIVER STORE V12.11.3 — FILTRO PÚBLICO CON SUPABASE
   ========================================================== */
let RIVER_ACTIVE_CATEGORY="all";

function riverGetCategories(){
  if(Array.isArray(window.RIVER_PUBLIC_CATEGORIES)){
    return window.RIVER_PUBLIC_CATEGORIES.filter(c=>c.active!==false);
  }
  try{
    const cached=JSON.parse(localStorage.getItem("river_categories")||"[]");
    return Array.isArray(cached)?cached.filter(c=>c.active!==false):[];
  }catch(e){
    return [];
  }
}

function riverProductMatchesCategory(product){
  return RIVER_ACTIVE_CATEGORY==="all" ||
    Number(product.categoryId)===Number(RIVER_ACTIVE_CATEGORY);
}

function riverVisibleCategories(){
  const categories=riverGetCategories();
  const products=Array.isArray(PRODUCTS)?PRODUCTS.filter(p=>p.active!==false):[];
  return categories.filter(category=>
    products.some(product=>Number(product.categoryId)===Number(category.id))
  );
}

function riverRenderCategoryFilters(){
  const box=document.getElementById("storeCategoryFilters");
  const wrap=document.getElementById("storeCategoryFilterWrap");
  if(!box)return;

  const categories=riverVisibleCategories();

  if(!categories.length){
    if(wrap)wrap.hidden=true;
    box.innerHTML="";
    return;
  }

  if(wrap)wrap.hidden=false;

  box.innerHTML=`
    <button type="button"
      class="${RIVER_ACTIVE_CATEGORY==="all"?"active":""}"
      data-river-category="all">Todos</button>
    ${categories.map(category=>`
      <button type="button"
        class="${String(RIVER_ACTIVE_CATEGORY)===String(category.id)?"active":""}"
        data-river-category="${category.id}">
        ${String(category.name||"")}
      </button>
    `).join("")}
  `;

  box.querySelectorAll("[data-river-category]").forEach(button=>{
    button.addEventListener("click",()=>{
      RIVER_ACTIVE_CATEGORY=button.dataset.riverCategory;
      renderStoreProducts();
    });
  });
}

const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Desde La Tía Hasta Donde Tope",
    price: 749,
    stock: 10,
    color: "Negro / rojo",
    active: true,
    description: "Gorra negra con detalles rojos, aplicaciones decorativas y gráficos inspirados en Tijuana.",
    image: "assets/gorra_collage.jpg",
    images: ["assets/gorra_collage.jpg"]
  }
];

function loadProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem("river_products"));
    if (Array.isArray(saved)) return saved;

    const legacy = JSON.parse(localStorage.getItem("river_product_1"));
    if (legacy && typeof legacy === "object") {
      const migrated = [{...DEFAULT_PRODUCTS[0], ...legacy, image:"assets/gorra_collage.jpg"}];
      localStorage.setItem("river_products", JSON.stringify(migrated));
      return migrated;
    }
  } catch(e) {}
  localStorage.setItem("river_products", JSON.stringify(DEFAULT_PRODUCTS));
  return [...DEFAULT_PRODUCTS];
}

let PRODUCTS = loadProducts();
let cart = JSON.parse(localStorage.getItem("jr_cart") || "[]");
let viewerImages=[]; let viewerIndex=0;

const DEFAULT_STORE_PHONE = "526648169323";
function getStorePhone(){
  const configured = window.RIVER_STORE_SETTINGS?.whatsapp || window.RIVER_STORE_PHONE || "";
  return String(configured || DEFAULT_STORE_PHONE).replace(/\D/g,"");
}
const storeProductGrid = document.getElementById("storeProductGrid");
const cartDrawer = document.getElementById("cartDrawer");
const drawerBackdrop = document.getElementById("drawerBackdrop");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const cartCount = document.getElementById("cartCount");
const checkoutModal = document.getElementById("checkoutModal");
const checkoutItems = document.getElementById("checkoutItems");
const checkoutTotal = document.getElementById("checkoutTotal");
const shippingFields = document.getElementById("shippingFields");
const confirmOrderBtn = document.getElementById("confirmOrderBtn");
const orderSuccess = document.getElementById("orderSuccess");
const orderSuccessFolio = document.getElementById("orderSuccessFolio");
let checkoutSubmitted = false;

function money(value) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0
  }).format(value);
}

function loadOrders() {
  try {
    const saved = JSON.parse(localStorage.getItem("river_orders"));
    return Array.isArray(saved) ? saved : [];
  } catch (e) {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem("river_orders", JSON.stringify(orders));
}

function nextOrderFolio() {
  let sequence = Number(localStorage.getItem("river_order_sequence") || "0");
  sequence += 1;
  localStorage.setItem("river_order_sequence", String(sequence));
  return `JR-${String(sequence).padStart(4, "0")}`;
}

function registerOrder(order) {
  const orders = loadOrders();
  orders.unshift(order);
  saveOrders(orders);
}


function getProductMedia(product){
  const images = Array.isArray(product.images) && product.images.length
    ? [...new Set(product.images.filter(Boolean))]
    : [product.image || "assets/gorra_collage.jpg"];

  const imageMedia = images.map(src => ({type:"image", src}));

  // V18.1: mantener la foto principal primero, pero poner el video enseguida
  // para que siempre quede visible en la fila horizontal de miniaturas.
  if(product.video){
    return [imageMedia[0], {type:"video", src:product.video}, ...imageMedia.slice(1)].filter(Boolean);
  }

  return imageMedia;
}

function escapeAttr(value){
  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll('"',"&quot;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}

function selectCardMedia(productId, mediaIndex){
  const product = PRODUCTS.find(p => Number(p.id) === Number(productId));
  if(!product) return;

  const media = getProductMedia(product);
  const item = media[Number(mediaIndex)];
  if(!item) return;

  const card = document.querySelector(`.store-product-card[data-product-id="${productId}"]`);
  if(!card) return;

  card.querySelectorAll(".store-media-thumb").forEach((btn,index)=>{
    btn.classList.toggle("active", index === Number(mediaIndex));
  });

  const image = card.querySelector(".store-product-card-main-image");
  const video = card.querySelector(".store-product-card-main-video");
  const mediaLabel = card.querySelector(".store-product-media-label");

  if(item.type === "video"){
    // Hay reglas antiguas con !important que forzaban la imagen a seguir visible.
    // Usamos prioridad important para que el video realmente sustituya a la foto.
    image.style.setProperty("display", "none", "important");
    video.style.setProperty("display", "block", "important");
    video.style.setProperty("visibility", "visible", "important");
    video.style.setProperty("opacity", "1", "important");
    video.src = item.src;
    video.load();
    mediaLabel.textContent = "VIDEO";

    const playPromise = video.play();
    if(playPromise && typeof playPromise.catch === "function"){
      playPromise.catch(()=>{});
    }
  }else{
    try{ video.pause(); }catch(_){}
    video.style.setProperty("display", "none", "important");
    video.removeAttribute("src");
    video.load();

    image.style.setProperty("display", "block", "important");
    image.style.setProperty("visibility", "visible", "important");
    image.style.setProperty("opacity", "1", "important");
    image.src = item.src;
    mediaLabel.textContent = "VER PRODUCTO";
  }
}

function openCardSelectedMedia(productId){
  const product = PRODUCTS.find(p => Number(p.id) === Number(productId));
  if(!product) return;

  const card = document.querySelector(`.store-product-card[data-product-id="${productId}"]`);
  const active = card?.querySelector(".store-media-thumb.active");
  const selectedIndex = Number(active?.dataset.mediaIndex ?? 0);
  const media = getProductMedia(product);

  // ROCKSTAR V17.3:
  // VER PRODUCTO usa exclusivamente el visor fijo nuevo de V17.2.
  if(typeof window.ROCKSTAR_OPEN_MEDIA_VIEWER === "function"){
    window.ROCKSTAR_OPEN_MEDIA_VIEWER(media, selectedIndex);
    return;
  }

  // Fallback únicamente si el script nuevo no cargara.
  openProductViewer(productId);
}


/* ==========================================================
   ROCKSTAR V17.8.1 — MOTOR DE PROMOCIONES
   ========================================================== */
function promoIsLiveStore(product, now = new Date()){
  if(!product || product.promoActive !== true) return false;

  const start = product.promoStart ? new Date(product.promoStart) : null;
  const end = product.promoEnd ? new Date(product.promoEnd) : null;

  if(start && !Number.isNaN(start.getTime()) && now < start) return false;
  if(end && !Number.isNaN(end.getTime()) && now > end) return false;

  return true;
}

function effectivePriceStore(product){
  const base = Math.max(0, Number(product?.price) || 0);

  if(!promoIsLiveStore(product)) return base;

  if(product.promoType === "price"){
    const offer = Number(product.promoPrice);
    if(Number.isFinite(offer) && offer >= 0 && offer < base){
      return offer;
    }
    return base;
  }

  const percent = Number(product.promoPercent) || 0;
  if(percent > 0 && percent < 100){
    return Math.max(0, base * (1 - percent / 100));
  }

  return base;
}

function promoLabelStore(product){
  if(!promoIsLiveStore(product)) return "";
  if(effectivePriceStore(product) >= Number(product.price)) return "";

  const custom = String(product.promoLabel || "").trim();
  if(custom) return custom;

  if(product.promoType === "percent" && Number(product.promoPercent) > 0){
    return `${Number(product.promoPercent)}% OFF`;
  }

  return "OFERTA";
}

function renderStoreProducts() {
  const activeProducts = PRODUCTS.filter(p =>
    p.active !== false && riverProductMatchesCategory(p)
  );

  riverRenderCategoryFilters();

  if (!activeProducts.length) {
    storeProductGrid.innerHTML = `<div class="store-empty">No hay productos disponibles por el momento.</div>`;
    return;
  }

  storeProductGrid.innerHTML = activeProducts.map(product => {
    const media = getProductMedia(product);
    const initial = media[0] || {type:"image",src:"assets/gorra_collage.jpg"};

    const thumbs = media.map((item,index)=>`
      <button
        class="store-media-thumb ${index===0?"active":""} ${item.type==="video"?"video":""}"
        type="button"
        data-media-index="${index}"
        onclick="event.stopPropagation();selectCardMedia(${product.id},${index})"
        aria-label="${item.type==="video"?"Ver video":"Ver foto "+(index+1)}"
        title="${item.type==="video"?"Ver video":"Ver foto "+(index+1)}"
      >
        ${
          item.type==="video"
            ? `<span class="store-video-thumb-icon">▶</span><span>VIDEO</span>`
            : `<img src="${escapeAttr(item.src)}" alt="Foto ${index+1} de ${escapeAttr(product.name)}">`
        }
      </button>
    `).join("");

    return `
      <article class="store-product-card" data-product-id="${product.id}">
        <div class="store-product-media-column">
          <button class="store-product-image" type="button" onclick="openCardSelectedMedia(${product.id})">
            <img
              class="store-product-card-main-image"
              src="${escapeAttr(initial.type==="image" ? initial.src : (product.image || "assets/gorra_collage.jpg"))}"
              alt="${escapeAttr(product.name)}"
            >
            <video
              class="store-product-card-main-video"
              controls
              playsinline
              preload="metadata"
              style="display:none"
              onclick="event.stopPropagation()"
            ></video>
            <span class="store-product-media-label">VER PRODUCTO</span>
          </button>

          <div class="store-product-media-selector" aria-label="Fotos y video de ${escapeAttr(product.name)}">
            ${thumbs}
          </div>
        </div>

        <div class="store-product-info">
          <small>COLECCIÓN OFICIAL</small>
          <h3>${product.name}</h3>
          ${promoIsLiveStore(product)&&effectivePriceStore(product)<Number(product.price)
 ? `<div class="store-promo-badge">${promoLabelStore(product)}</div><div class="store-product-price store-product-price-promo"><span class="store-old-price">${money(product.price)}</span><span class="store-new-price">${money(effectivePriceStore(product))} MXN</span></div>`
 : `<div class="store-product-price">${money(product.price)} MXN</div>`}
          <p>${product.description || ""}</p>
          <div class="store-product-meta">
            <span>Color <strong>${product.color || "Sin especificar"}</strong></span>
            <span>Disponibilidad <strong>${product.stock > 0 ? `${product.stock} disponibles` : "Agotado"}</strong></span>
          </div>
          ${Number(product.stock)<=0
            ? `<div class="store-stock-badge stock-out-badge">AGOTADO</div>`
            : Number(product.stock)<=3
              ? `<div class="store-stock-badge stock-low-badge">ÚLTIMAS ${Number(product.stock)} PIEZAS</div>`
              : ""}
          <button class="btn btn-primary full" ${product.stock <= 0 ? "disabled" : ""} onclick="addToCart(${product.id})">
            ${product.stock > 0 ? "Agregar al carrito" : "Agotado"}
          </button>
          <a class="btn btn-secondary full product-whatsapp" href="https://wa.me/${getStorePhone()}?text=${encodeURIComponent("Hola, quiero información sobre " + product.name)}" target="_blank" rel="noopener">Preguntar por WhatsApp</a>
        </div>
      </article>
    `;
  }).join("");
}

function addToCart(id) {
  const product = PRODUCTS.find(p => p.id === id);
  if (!product || product.active === false) return;

  const maxStock = Number(product.stock) || 0;
  const existing = cart.find(i => i.id === id);
  const currentQty = existing ? existing.qty : 0;

  if (maxStock <= 0) return alert("Este producto está agotado.");
  if (currentQty >= maxStock) return alert(`Solo hay ${maxStock} disponibles de este producto.`);

  if (existing) {
    existing.qty += 1;
    existing.price = effectivePriceStore(product);
  } else {
    cart.push({...product, price:effectivePriceStore(product), qty:1});
  }

  saveCart();
  openCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
}

function changeQuantity(id, change) {
  const item = cart.find(i => i.id === id);
  if (!item) return;

  const product = PRODUCTS.find(p => p.id === id) || item;
  const maxStock = Number(product.stock) || 0;
  const nextQty = item.qty + change;

  if (nextQty <= 0) {
    cart = cart.filter(i => i.id !== id);
    return saveCart();
  }

  if (nextQty > maxStock) return alert(`Solo hay ${maxStock} disponibles de este producto.`);

  item.qty = nextQty;
  saveCart();
}

function saveCart() {
  localStorage.setItem("jr_cart", JSON.stringify(cart));
  renderCart();
}

function renderCart() {
  const count = cart.reduce((sum,item) => sum + item.qty, 0);
  const total = cart.reduce((sum,item) => sum + item.price * item.qty, 0);
  cartCount.textContent = count;
  cartTotal.textContent = `${money(total)} MXN`;

  if (!cart.length) {
    cartItems.innerHTML = `<div class="empty-cart">Tu carrito está vacío.</div>`;
    return;
  }

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item-thumb"><img src="${item.image || "assets/gorra_collage.jpg"}" alt=""></div>
      <div class="cart-item-content">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-meta">${money(item.price)} MXN c/u</div>
        <div class="quantity-control">
          <button type="button" class="quantity-btn" onclick="changeQuantity(${item.id},-1)">−</button>
          <span class="quantity-value">${item.qty}</span>
          <button type="button" class="quantity-btn" onclick="changeQuantity(${item.id},1)">+</button>
        </div>
        <div class="cart-item-subtotal">Subtotal: <strong>${money(item.price * item.qty)} MXN</strong></div>
      </div>
      <button class="remove-item" onclick="removeFromCart(${item.id})">✕</button>
    </div>
  `).join("");
}

function openCart() {
  cartDrawer.classList.add("open");
  drawerBackdrop.classList.add("show");
  cartDrawer.setAttribute("aria-hidden","false");
}
function closeCart() {
  cartDrawer.classList.remove("open");
  drawerBackdrop.classList.remove("show");
  cartDrawer.setAttribute("aria-hidden","true");
}

document.getElementById("cartButton").addEventListener("click",openCart);
document.getElementById("closeCart").addEventListener("click",closeCart);
drawerBackdrop.addEventListener("click",closeCart);

document.getElementById("menuToggle").addEventListener("click",() => {
  document.getElementById("mainNav").classList.toggle("open");
});

function renderCheckoutSummary() {
  const total = cart.reduce((sum,item) => sum + item.price * item.qty,0);
  checkoutItems.innerHTML = cart.map(item => `
    <div class="checkout-summary-item">
      <span>${item.name} × ${item.qty}</span>
      <strong>${money(item.price * item.qty)} MXN</strong>
    </div>
  `).join("");
  checkoutTotal.textContent = `${money(total)} MXN`;
}

function openCheckout() {
  if (!cart.length) return alert("Agrega al menos un producto al carrito.");

  checkoutSubmitted = false;
  confirmOrderBtn.disabled = false;
  confirmOrderBtn.textContent = "Confirmar por WhatsApp";
  orderSuccess.hidden = true;

  closeCart();
  renderCheckoutSummary();
  checkoutModal.classList.add("open");
  checkoutModal.setAttribute("aria-hidden","false");
}
function closeCheckout() {
  checkoutModal.classList.remove("open");
  checkoutModal.setAttribute("aria-hidden","true");
}

document.getElementById("whatsappCheckout").addEventListener("click",openCheckout);
document.getElementById("closeCheckout").addEventListener("click",closeCheckout);
document.getElementById("finishCheckout")?.addEventListener("click",closeCheckout);

checkoutModal.addEventListener("click",(e) => {
  if (e.target === checkoutModal) closeCheckout();
});

document.querySelectorAll('input[name="deliveryType"]').forEach(input => {
  input.addEventListener("change",() => {
    document.querySelectorAll('input[name="deliveryType"]').forEach(i => {
      i.closest(".option-card").classList.toggle("selected",i.checked);
    });
    shippingFields.classList.toggle("show", input.value === "Envío" && input.checked);
  });
});

document.querySelectorAll('input[name="paymentType"]').forEach(input => {
  input.addEventListener("change",() => {
    document.querySelectorAll('input[name="paymentType"]').forEach(i => {
      i.closest(".option-card").classList.toggle("selected",i.checked);
    });
  });
});

document.getElementById("checkoutForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (checkoutSubmitted) return;

  const cfg = window.RIVER_CONFIG || {};
  if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
    alert("No se pudo conectar con la tienda. Intenta nuevamente.");
    return;
  }

  const db = window.riverStoreDb ||
    window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  window.riverStoreDb = db;

  const name = document.getElementById("customerName").value.trim();
  const phoneCustomer = document.getElementById("customerPhone").value.trim();
  const email = document.getElementById("customerEmail").value.trim();
  const delivery = document.querySelector('input[name="deliveryType"]:checked').value;
  const payment = document.querySelector('input[name="paymentType"]:checked').value;
  const address = document.getElementById("customerAddress").value.trim();
  const city = document.getElementById("customerCity").value.trim();
  const zip = document.getElementById("customerZip").value.trim();
  const notes = document.getElementById("customerNotes").value.trim();

  if (!name || !phoneCustomer) return alert("Completa nombre y teléfono.");
  if (delivery === "Envío" && !address) return alert("Ingresa la dirección de envío.");
  if (!cart.length) return alert("Tu carrito está vacío.");

  confirmOrderBtn.disabled = true;
  confirmOrderBtn.textContent = "Registrando pedido…";

  const rpcItems = cart.map(item => ({
    product_id: Number(item.id),
    qty: Number(item.qty)
  }));

  const { data, error } = await db.rpc("create_store_order", {
    p_customer: {
      name,
      phone: phoneCustomer,
      email
    },
    p_delivery: {
      type: delivery,
      address: delivery === "Envío" ? address : "",
      city: delivery === "Envío" ? city : "",
      zip: delivery === "Envío" ? zip : ""
    },
    p_payment: payment,
    p_notes: notes || "",
    p_items: rpcItems
  });

  if (error) {
    console.error("Error create_store_order:", error);
    confirmOrderBtn.disabled = false;
    confirmOrderBtn.textContent = "Confirmar por WhatsApp";

    const msg = String(error.message || "");
    if (msg.toLowerCase().includes("stock insuficiente")) {
      alert("Uno de los productos ya no tiene suficiente existencia. Actualiza la tienda y revisa tu carrito.");
    } else {
      alert("No se pudo registrar el pedido. Intenta nuevamente.");
    }
    return;
  }

  const folio = data?.folio || "JR-PENDIENTE";
  const total = Number(data?.total) || cart.reduce((sum,item) => sum + item.price * item.qty,0);

  const lines = cart.map(item =>
    `• ${item.name} x${item.qty} - ${money(item.price * item.qty)} MXN`
  );

  const message = [
    `PEDIDO ${folio}`,
    "Tienda oficial de Julian Reynoso",
    "",
    "DATOS DEL CLIENTE",
    `Nombre: ${name}`,
    `Teléfono: ${phoneCustomer}`,
    email ? `Correo: ${email}` : null,
    "",
    "PEDIDO",
    ...lines,
    `Total productos: ${money(total)} MXN`,
    "",
    `Entrega: ${delivery}`,
    delivery === "Envío" ? `Dirección: ${address}` : null,
    delivery === "Envío" && city ? `Ciudad: ${city}` : null,
    delivery === "Envío" && zip ? `CP: ${zip}` : null,
    `Pago: ${payment}`,
    notes ? `Notas: ${notes}` : null,
    "",
    `Folio: ${folio}`,
    "Quedo pendiente de confirmación, costo de envío (si aplica) y datos de pago."
  ].filter(Boolean).join("\n");

  checkoutSubmitted = true;
  confirmOrderBtn.textContent = "Pedido registrado";
  orderSuccessFolio.textContent = folio;
  orderSuccess.hidden = false;

  window.open(`https://wa.me/${getStorePhone()}?text=${encodeURIComponent(message)}`,"_blank");

  cart = [];
  saveCart();
});



let viewerMedia = [];
let zoomScale = 1;
let zoomX = 0;
let zoomY = 0;
let zoomDragging = false;
let zoomDragStartX = 0;
let zoomDragStartY = 0;
let zoomOriginX = 0;
let zoomOriginY = 0;
let pinchStartDistance = 0;
let pinchStartScale = 1;

function currentViewerItem(){
  return viewerMedia[viewerIndex] || null;
}

function resetZoom(){
  zoomScale=1;
  zoomX=0;
  zoomY=0;
  applyZoom();
}

function applyZoom(){
  const image=document.getElementById("lightboxImage");
  if(!image)return;

  zoomScale=Math.max(1,Math.min(4,zoomScale));

  if(zoomScale===1){
    zoomX=0;
    zoomY=0;
  }

  image.style.transform=`translate(${zoomX}px,${zoomY}px) scale(${zoomScale})`;
  document.getElementById("zoomLevel").textContent=`${Math.round(zoomScale*100)}%`;
  image.classList.toggle("zoomed",zoomScale>1);
}

function changeZoom(delta){
  const item=currentViewerItem();
  if(!item || item.type!=="image")return;

  zoomScale=Math.max(1,Math.min(4,zoomScale+delta));
  applyZoom();
}

function renderProductViewer(){
  const viewerImage=document.getElementById("lightboxImage");
  const viewerVideo=document.getElementById("lightboxVideo");
  const counter=document.getElementById("lightboxCounter");
  const thumbs=document.getElementById("lightboxThumbs");
  const zoomControls=document.getElementById("zoomControls");

  if(!viewerMedia.length){
    viewerImage.src="";
    viewerVideo.removeAttribute("src");
    viewerVideo.load();
    counter.textContent="";
    thumbs.innerHTML="";
    return;
  }

  viewerIndex=Math.max(0,Math.min(viewerIndex,viewerMedia.length-1));
  const item=viewerMedia[viewerIndex];

  viewerVideo.pause();

  if(item.type==="video"){
    viewerImage.style.display="none";
    viewerVideo.style.display="block";
    viewerVideo.src=item.src;
    viewerVideo.load();
    zoomControls.style.display="none";
  }else{
    viewerVideo.style.display="none";
    viewerVideo.removeAttribute("src");
    viewerVideo.load();

    viewerImage.style.display="block";
    viewerImage.src=item.src;
    zoomControls.style.display="flex";
    resetZoom();
  }

  counter.textContent=viewerMedia.length>1
    ? `${viewerIndex+1} / ${viewerMedia.length}`
    : "";

  thumbs.innerHTML=viewerMedia.map((media,index)=>`
    <button
      type="button"
      class="gallery-thumb ${index===viewerIndex?"active":""} ${media.type==="video"?"video-thumb":""}"
      data-gallery-index="${index}"
      aria-label="${media.type==="video"?"Ver video":"Ver foto"} ${index+1}"
    >
      ${
        media.type==="video"
          ? `<span class="video-thumb-icon">▶</span><span class="video-thumb-label">VIDEO</span>`
          : `<img src="${media.src}" alt="Foto ${index+1} del producto">`
      }
    </button>
  `).join("");

  thumbs.querySelectorAll(".gallery-thumb").forEach(btn=>{
    btn.addEventListener("click",()=>{
      viewerIndex=Number(btn.dataset.galleryIndex);
      renderProductViewer();
    });
  });

  const showNav=viewerMedia.length>1;
  document.getElementById("lightboxPrev").style.display=showNav?"":"none";
  document.getElementById("lightboxNext").style.display=showNav?"":"none";
}

function openProductViewer(id){
  const product=PRODUCTS.find(p=>Number(p.id)===Number(id));
  if(!product)return;

  const media=getProductMedia(product);

  // Compatibilidad: cualquier llamada antigua se redirige al visor fijo V17.2/V17.3.
  if(typeof window.ROCKSTAR_OPEN_MEDIA_VIEWER==="function"){
    window.ROCKSTAR_OPEN_MEDIA_VIEWER(media,0);
    return;
  }
}


function nextViewerImage(step){
  if(viewerMedia.length<=1)return;
  viewerIndex=(viewerIndex+step+viewerMedia.length)%viewerMedia.length;
  renderProductViewer();
}

document.getElementById("lightboxPrev").addEventListener("click",(e)=>{
  e.stopPropagation();
  nextViewerImage(-1);
});

document.getElementById("lightboxNext").addEventListener("click",(e)=>{
  e.stopPropagation();
  nextViewerImage(1);
});

document.getElementById("lightboxImage").addEventListener("dblclick",(e)=>{
  e.stopPropagation();
  zoomScale=zoomScale===1?2.5:1;
  applyZoom();
});

document.getElementById("zoomIn").addEventListener("click",(e)=>{
  e.stopPropagation();
  changeZoom(.5);
});

document.getElementById("zoomOut").addEventListener("click",(e)=>{
  e.stopPropagation();
  changeZoom(-.5);
});

document.getElementById("zoomReset").addEventListener("click",(e)=>{
  e.stopPropagation();
  resetZoom();
});

document.getElementById("galleryMediaStage").addEventListener("wheel",(e)=>{
  const item=currentViewerItem();
  if(!item || item.type!=="image")return;
  e.preventDefault();
  changeZoom(e.deltaY<0?.25:-.25);
},{passive:false});

const stage=document.getElementById("galleryMediaStage");

stage.addEventListener("pointerdown",(e)=>{
  const item=currentViewerItem();
  if(!item || item.type!=="image" || zoomScale<=1)return;

  zoomDragging=true;
  zoomDragStartX=e.clientX;
  zoomDragStartY=e.clientY;
  zoomOriginX=zoomX;
  zoomOriginY=zoomY;
  stage.setPointerCapture?.(e.pointerId);
});

stage.addEventListener("pointermove",(e)=>{
  if(!zoomDragging)return;
  zoomX=zoomOriginX+(e.clientX-zoomDragStartX);
  zoomY=zoomOriginY+(e.clientY-zoomDragStartY);
  applyZoom();
});

function endZoomDrag(e){
  zoomDragging=false;
  try{stage.releasePointerCapture?.(e.pointerId);}catch(_){}
}
stage.addEventListener("pointerup",endZoomDrag);
stage.addEventListener("pointercancel",endZoomDrag);

stage.addEventListener("touchstart",(e)=>{
  if(e.touches.length===2){
    const dx=e.touches[0].clientX-e.touches[1].clientX;
    const dy=e.touches[0].clientY-e.touches[1].clientY;
    pinchStartDistance=Math.hypot(dx,dy);
    pinchStartScale=zoomScale;
  }
},{passive:true});

stage.addEventListener("touchmove",(e)=>{
  const item=currentViewerItem();
  if(!item || item.type!=="image" || e.touches.length!==2)return;

  const dx=e.touches[0].clientX-e.touches[1].clientX;
  const dy=e.touches[0].clientY-e.touches[1].clientY;
  const distance=Math.hypot(dx,dy);

  if(pinchStartDistance>0){
    zoomScale=pinchStartScale*(distance/pinchStartDistance);
    applyZoom();
  }
},{passive:true});

document.getElementById("lightboxClose").addEventListener("click",()=>{
  const video=document.getElementById("lightboxVideo");
  video.pause();
  document.getElementById("lightbox").classList.remove("open");
});

document.getElementById("lightbox").addEventListener("click",(e)=>{
  if(e.target.id==="lightbox"){
    document.getElementById("lightboxVideo").pause();
    e.currentTarget.classList.remove("open");
  }
});

document.addEventListener("keydown",(e)=>{
  const viewer=document.getElementById("lightbox");
  if(!viewer.classList.contains("open"))return;

  if(e.key==="ArrowLeft")nextViewerImage(-1);
  if(e.key==="ArrowRight")nextViewerImage(1);
  if(e.key==="+")changeZoom(.5);
  if(e.key==="-")changeZoom(-.5);
  if(e.key==="Escape"){
    document.getElementById("lightboxVideo").pause();
    viewer.classList.remove("open");
  }
});

// Ajusta un carrito viejo al stock actual.
cart = cart.filter(item => {
  const product = PRODUCTS.find(p => p.id === item.id);
  if (!product || product.active === false || Number(product.stock) <= 0) return false;
  item.name = product.name;
  item.price = product.price;
  item.stock = product.stock;
  item.image = product.image;
  item.qty = Math.min(item.qty,Number(product.stock));
  return item.qty > 0;
});
localStorage.setItem("jr_cart",JSON.stringify(cart));

renderStoreProducts();
renderCart();


window.addEventListener("river:store-settings-loaded", () => {
  try{
    if(typeof renderStoreProducts === "function") renderStoreProducts();
  }catch(error){
    console.warn("No se pudo refrescar el catálogo después de cargar configuración:", error);
  }
});


/* ROCKSTAR V15: navegación fija / menú móvil */
document.querySelectorAll("#mainNav a").forEach(link=>{
  link.addEventListener("click",()=>{
    document.getElementById("mainNav")?.classList.remove("open");
  });
});


/* ROCKSTAR V16.1 — mantener carrito y checkout en el viewport actual */
(function(){
  const originalOpenCart = window.openCart;
  if(typeof originalOpenCart === "function"){
    window.openCart = function(){
      const y = window.scrollY;
      originalOpenCart();
      window.scrollTo({top:y,left:0,behavior:"auto"});
    };
  }

  const originalOpenCheckout = window.openCheckout;
  if(typeof originalOpenCheckout === "function"){
    window.openCheckout = function(){
      const y = window.scrollY;
      originalOpenCheckout();
      window.scrollTo({top:y,left:0,behavior:"auto"});
    };
  }
})();
