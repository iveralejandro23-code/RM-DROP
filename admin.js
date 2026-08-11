const DEFAULT_PRODUCTS = [
  {
    id: 1,
    name: "Desde La Tía Hasta Donde Tope",
    price: 749,
    stock: 10,
    color: "Negro / rojo",
    active: true,
    description: "Gorra negra con detalles rojos, aplicaciones decorativas y gráficos inspirados en Tijuana.",
    image: "assets/gorra_collage.jpg"
  }
];

const form = document.getElementById("productForm");
const productId = document.getElementById("productId");
const fieldName = document.getElementById("name");
const fieldPrice = document.getElementById("price");
const fieldStock = document.getElementById("stock");
const fieldColor = document.getElementById("color");
const fieldCategory = document.getElementById("category");
const fieldActive = document.getElementById("active");
const fieldDescription = document.getElementById("description");
const savedMessage = document.getElementById("savedMessage");
const productList = document.getElementById("productList");
const statProducts = document.getElementById("statProducts");
const statStock = document.getElementById("statStock");
const statActive = document.getElementById("statActive");
const editorMode = document.getElementById("editorMode");
const editorTitle = document.getElementById("editorTitle");
const orderList = document.getElementById("orderList");
const statOrders = document.getElementById("statOrders");
const statNewOrders = document.getElementById("statNewOrders");
const statSales = document.getElementById("statSales");
const statCancelled = document.getElementById("statCancelled");
const statCancelledAmount = document.getElementById("statCancelledAmount");
const orderStatusFilter = document.getElementById("orderStatusFilter");
const orderSearchInput = document.getElementById("orderSearchInput");
const orderSortSelect = document.getElementById("orderSortSelect");
const clearOrderSearchBtn = document.getElementById("clearOrderSearchBtn");
const exportOrdersCsvBtn = document.getElementById("exportOrdersCsvBtn");
const orderResultsInfo = document.getElementById("orderResultsInfo");
const orderVisibleAmount = document.getElementById("orderVisibleAmount");
const orderStatusSummary = document.getElementById("orderStatusSummary");

const orderCountAll = document.getElementById("orderCountAll");
const orderCountNew = document.getElementById("orderCountNew");
const orderCountConfirmed = document.getElementById("orderCountConfirmed");
const orderCountPaid = document.getElementById("orderCountPaid");
const orderCountSent = document.getElementById("orderCountSent");
const orderCountDelivered = document.getElementById("orderCountDelivered");
const orderCountCancelled = document.getElementById("orderCountCancelled");
const clearOrdersBtn = document.getElementById("clearOrdersBtn");
const fieldPhotos = document.getElementById("photos");
const fieldVideo = document.getElementById("productVideo");
const videoPreview = document.getElementById("videoPreview");
const clearVideoBtn = document.getElementById("clearVideo");
const photoPreview = document.getElementById("photoPreview");
let workingImages = [];
let mainImageIndex = 0;
let pendingPhotoFiles = [];
let pendingVideoFile = null;
let workingVideoUrl = "";
let videoPreviewObjectUrl = "";

const DEMO_PRODUCTS = [
  {name:"Gorra Trucker Café",price:699,stock:8,color:"Café / beige",active:true,description:"Producto de prueba para visualizar un modelo trucker diferente.",image:"assets/demo_trucker_cafe.jpg",images:["assets/demo_trucker_cafe.jpg"]},
  {name:"Gorra Urban Verde",price:649,stock:12,color:"Verde olivo",active:true,description:"Producto de prueba para visualizar un modelo casual en color verde.",image:"assets/demo_urban_verde.jpg",images:["assets/demo_urban_verde.jpg"]},
  {name:"Gorra LA Cream",price:749,stock:6,color:"Crema / azul",active:true,description:"Producto de prueba para visualizar un modelo claro con visera en contraste.",image:"assets/demo_la_cream.jpg",images:["assets/demo_la_cream.jpg"]}
];


const ORDER_STATUSES = ["Nuevo","Confirmado","Pagado","Enviado","Entregado","Cancelado"];

function loadOrders(){
  try{
    const saved=JSON.parse(localStorage.getItem("river_orders"));
    return Array.isArray(saved)?saved:[];
  }catch(e){
    return [];
  }
}

function saveOrders(orders){
  localStorage.setItem("river_orders",JSON.stringify(orders));
}

function adminMoney(value){
  return new Intl.NumberFormat("es-MX",{
    style:"currency",
    currency:"MXN",
    maximumFractionDigits:0
  }).format(Number(value)||0);
}

function formatOrderDate(iso){
  try{
    return new Intl.DateTimeFormat("es-MX",{
      dateStyle:"medium",
      timeStyle:"short"
    }).format(new Date(iso));
  }catch(e){
    return iso||"";
  }
}

function escapeHtml(value){
  return String(value??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function statusClass(status){
  return {
    "Nuevo":"status-new",
    "Confirmado":"status-confirmed",
    "Pagado":"status-paid",
    "Enviado":"status-sent",
    "Entregado":"status-delivered",
    "Cancelado":"status-cancelled"
  }[status]||"";
}

const INVENTORY_COMMIT_STATUSES = ["Confirmado","Pagado","Enviado","Entregado"];

function orderUsesInventory(status){
  return INVENTORY_COMMIT_STATUSES.includes(status);
}


const INVENTORY_MOVEMENTS_KEY="river_inventory_movements";

function loadInventoryMovements(){
  try{
    const data=JSON.parse(localStorage.getItem(INVENTORY_MOVEMENTS_KEY));
    return Array.isArray(data)?data:[];
  }catch(e){return [];}
}

function saveInventoryMovements(movements){
  localStorage.setItem(INVENTORY_MOVEMENTS_KEY,JSON.stringify(movements));
}

function registerInventoryMovement({type,product,qty,before,after,reason,folio=""}){
  const movements=loadInventoryMovements();
  movements.unshift({
    id:`MOV-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    date:new Date().toISOString(),
    type,
    productId:product?.id??"",
    productName:product?.name||"Producto",
    qty:Number(qty)||0,
    before:Number(before)||0,
    after:Number(after)||0,
    reason:reason||"",
    folio:folio||""
  });
  saveInventoryMovements(movements.slice(0,1000));
}

function renderInventoryMovements(){
  const box=document.getElementById("inventoryMovementList");
  const filter=document.getElementById("inventoryMovementFilter");
  if(!box)return;
  let rows=loadInventoryMovements();
  renderBusinessReports();
  const selected=filter?.value||"Todos";
  if(selected!=="Todos") rows=rows.filter(m=>m.type===selected);
  if(!rows.length){
    box.innerHTML='<div class="order-empty">Todavía no hay movimientos de inventario.</div>';
    return;
  }
  box.innerHTML=rows.map(m=>`
    <article class="inventory-movement-row">
      <div><strong>${escapeHtml(m.productName)}</strong><small>${formatOrderDate(m.date)}${m.folio?` · ${escapeHtml(m.folio)}`:""}</small></div>
      <div><span class="movement-badge ${m.type==="Entrada"?"movement-in":"movement-out"}">${escapeHtml(m.type)}</span><b>${m.type==="Entrada"?"+":"-"}${Math.abs(Number(m.qty)||0)}</b></div>
      <div><span>Stock</span><b>${m.before} → ${m.after}</b></div>
      <div><span>Motivo</span><b>${escapeHtml(m.reason||"Sin detalle")}</b></div>
    </article>`).join("");
}

function applyInventoryForOrder(order){
  if(order.inventoryApplied === true) return {ok:true};

  const products=getProducts();
  const items=Array.isArray(order.items)?order.items:[];

  // Primero revisa todas las existencias para no descontar parcialmente.
  for(const item of items){
    const product=products.find(p=>Number(p.id)===Number(item.id));
    if(!product){
      return {ok:false,message:`No se encontró el producto "${item.name}" en el catálogo.`};
    }

    const requested=Number(item.qty)||0;
    const available=Number(product.stock)||0;

    if(requested > available){
      return {
        ok:false,
        message:`No hay suficiente existencia de "${product.name}". Pedido: ${requested}. Disponible: ${available}.`
      };
    }
  }

  // Descuenta solo después de validar todo el pedido.
  items.forEach(item=>{
    const product=products.find(p=>Number(p.id)===Number(item.id));
    const before=Number(product.stock)||0;
    const qty=Number(item.qty)||0;
    product.stock=Math.max(0,before-qty);
    registerInventoryMovement({type:"Salida",product,qty,before,after:product.stock,reason:"Pedido confirmado",folio:order.folio});
  });

  saveProducts(products);
  order.inventoryApplied=true;
  order.inventoryAppliedAt=new Date().toISOString();
  return {ok:true};
}

function restoreInventoryForOrder(order){
  if(order.inventoryApplied !== true) return;

  const products=getProducts();
  const items=Array.isArray(order.items)?order.items:[];

  items.forEach(item=>{
    const product=products.find(p=>Number(p.id)===Number(item.id));
    if(product){
      const before=Number(product.stock)||0;
      const qty=Number(item.qty)||0;
      product.stock=before+qty;
      registerInventoryMovement({type:"Entrada",product,qty,before,after:product.stock,reason:"Devolución por cambio/cancelación",folio:order.folio});
    }
  });

  saveProducts(products);
  order.inventoryApplied=false;
  order.inventoryRestoredAt=new Date().toISOString();
}

function updateOrderStatus(folio,status){
  const orders=loadOrders();
  const order=orders.find(o=>o.folio===folio);
  if(!order)return;

  const oldStatus=order.status||"Nuevo";
  const oldUsesInventory=orderUsesInventory(oldStatus);
  const newUsesInventory=orderUsesInventory(status);

  // Nuevo/Cancelado -> Confirmado/Pagado/Enviado/Entregado:
  // intenta descontar una sola vez.
  if(!oldUsesInventory && newUsesInventory){
    const result=applyInventoryForOrder(order);
    if(!result.ok){
      alert(result.message);
      renderOrders();
      return;
    }
  }

  // Si se cancela, pide y conserva el motivo antes de mover inventario.
  if(status==="Cancelado" && oldStatus!=="Cancelado"){
    const reason=prompt(
      "Motivo de cancelación:\n\nEjemplos: Cliente desistió, falta de pago, producto agotado, pedido duplicado u otro.",
      order.cancellationReason||""
    );
    if(reason===null){
      renderOrders();
      return;
    }
    order.cancellationReason=(reason.trim()||"Sin motivo especificado");
    order.cancelledAt=new Date().toISOString();
  }

  // Estado que comprometía inventario -> Nuevo o Cancelado:
  // devuelve las existencias.
  if(oldUsesInventory && !newUsesInventory){
    restoreInventoryForOrder(order);
  }

  if(oldStatus==="Cancelado" && status!=="Cancelado"){
    order.reopenedAt=new Date().toISOString();
  }

  order.status=status;
  order.updatedAt=new Date().toISOString();
  saveOrders(orders);

  renderProducts();
  renderOrders();
  renderInventoryMovements();
}

function buildStatusMessage(order){
  const customer=order.customer||{};
  const items=Array.isArray(order.items)?order.items:[];
  const itemLines=items.map(item=>`• ${item.name} × ${Number(item.qty)||0}`).join("\n");
  const status=order.status||"Nuevo";
  const messages={
    "Nuevo":`Hola ${customer.name||""} 👋\nRecibimos tu pedido *${order.folio}* en JULIAN REYNOSO STORE. En breve lo revisaremos para confirmarlo.`,
    "Confirmado":`Hola ${customer.name||""} 👋\nTu pedido *${order.folio}* ha sido *CONFIRMADO*.\n\n${itemLines}\n\nTotal: ${adminMoney(order.total)} MXN\n\nGracias por tu compra.`,
    "Pagado":`Hola ${customer.name||""} 👋\nEl pago de tu pedido *${order.folio}* ha sido registrado como *PAGADO*. ✅\n\n${itemLines}\n\nTotal: ${adminMoney(order.total)} MXN\n\nGracias por tu compra.`,
    "Enviado":`Hola ${customer.name||""} 👋\nTu pedido *${order.folio}* ya fue marcado como *ENVIADO*. 📦\n\n${itemLines}\n\nTe mantendremos informado sobre la entrega.`,
    "Entregado":`Hola ${customer.name||""} 👋\nTu pedido *${order.folio}* ha sido marcado como *ENTREGADO*. ✅\n\nMuchas gracias por comprar en JULIAN REYNOSO STORE.`,
    "Cancelado":`Hola ${customer.name||""}.
Tu pedido *${order.folio}* ha sido marcado como *CANCELADO*.

*Motivo:* ${order.cancellationReason||"Sin motivo especificado"}.

Si consideras que se trata de un error o necesitas ayuda con tu pedido, responde a este mensaje y con gusto te atenderemos.`
  };
  return messages[status]||`Hola ${customer.name||""}, hay una actualización en tu pedido ${order.folio}: ${status}.`;
}

function notifyOrderCustomer(folio){
  const order=loadOrders().find(o=>o.folio===folio);
  if(!order)return;
  const customer=order.customer||{};
  const digits=String(customer.phone||"").replace(/\D/g,"");
  if(!digits){alert("Este pedido no tiene un teléfono registrado.");return;}
  const phone=digits.startsWith("52")?digits:`52${digits}`;
  const url=`https://wa.me/${phone}?text=${encodeURIComponent(buildStatusMessage(order))}`;
  window.open(url,"_blank","noopener");
}

function addInternalOrderNote(folio){
  const orders=loadOrders();
  const order=orders.find(o=>o.folio===folio);
  if(!order)return;
  const note=prompt("Agregar nota interna para "+folio+":","");
  if(note===null || !note.trim())return;
  if(!Array.isArray(order.internalNotes))order.internalNotes=[];
  order.internalNotes.unshift({text:note.trim(),date:new Date().toISOString()});
  order.updatedAt=new Date().toISOString();
  saveOrders(orders);
  renderOrders();
}


function normalizeOrderSearch(value){
  return String(value||"")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function orderMatchesSearch(order,query){
  if(!query)return true;

  const customer=order.customer||{};
  const delivery=order.delivery||{};
  const items=Array.isArray(order.items)?order.items:[];

  const haystack=[
    order.folio,
    order.status,
    customer.name,
    customer.phone,
    customer.email,
    delivery.type,
    delivery.address,
    delivery.city,
    delivery.zip,
    order.payment,
    order.notes,
    order.cancellationReason,
    ...items.map(item=>item.name)
  ].map(normalizeOrderSearch).join(" ");

  return haystack.includes(query);
}

function sortAdminOrders(orders,mode){
  const list=[...orders];

  if(mode==="oldest"){
    return list.sort((a,b)=>new Date(a.createdAt||0)-new Date(b.createdAt||0));
  }
  if(mode==="highest"){
    return list.sort((a,b)=>(Number(b.total)||0)-(Number(a.total)||0));
  }
  if(mode==="lowest"){
    return list.sort((a,b)=>(Number(a.total)||0)-(Number(b.total)||0));
  }
  if(mode==="customer"){
    return list.sort((a,b)=>String(a.customer?.name||"").localeCompare(String(b.customer?.name||""),"es",{sensitivity:"base"}));
  }

  return list.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
}

function updateOrderProfessionalSummary(allOrders,visibleOrders){
  const count=status=>allOrders.filter(order=>(order.status||"Nuevo")===status).length;

  if(orderCountAll) orderCountAll.textContent=allOrders.length;
  if(orderCountNew) orderCountNew.textContent=count("Nuevo");
  if(orderCountConfirmed) orderCountConfirmed.textContent=count("Confirmado");
  if(orderCountPaid) orderCountPaid.textContent=count("Pagado");
  if(orderCountSent) orderCountSent.textContent=count("Enviado");
  if(orderCountDelivered) orderCountDelivered.textContent=count("Entregado");
  if(orderCountCancelled) orderCountCancelled.textContent=count("Cancelado");

  if(orderResultsInfo){
    const total=visibleOrders.length;
    orderResultsInfo.textContent=`${total} pedido${total===1?"":"s"} mostrado${total===1?"":"s"}`;
  }

  if(orderVisibleAmount){
    const amount=visibleOrders.reduce((sum,order)=>sum+(Number(order.total)||0),0);
    orderVisibleAmount.textContent=`Total visible: ${adminMoney(amount)}`;
  }

  orderStatusSummary?.querySelectorAll("[data-order-filter]").forEach(btn=>{
    btn.classList.toggle("active",btn.dataset.orderFilter===(orderStatusFilter?.value||"Todos"));
  });
}

function getVisibleOrders(){
  const allOrders=loadOrders();
  const filter=orderStatusFilter?.value||"Todos";
  const query=normalizeOrderSearch(orderSearchInput?.value);
  const sortMode=orderSortSelect?.value||"newest";

  let visible=allOrders.filter(order=>{
    const statusOk=filter==="Todos" || (order.status||"Nuevo")===filter;
    return statusOk && orderMatchesSearch(order,query);
  });

  visible=sortAdminOrders(visible,sortMode);
  return {allOrders,visible};
}

function csvEscape(value){
  const text=String(value??"");
  return `"${text.replace(/"/g,'""')}"`;
}

function exportVisibleOrdersCsv(){
  const {visible}=getVisibleOrders();

  if(!visible.length){
    alert("No hay pedidos visibles para exportar.");
    return;
  }

  const rows=[
    ["Folio","Fecha","Estado","Cliente","Teléfono","Correo","Entrega","Dirección","Pago","Productos","Total","Inventario","Motivo cancelación"]
  ];

  visible.forEach(order=>{
    const customer=order.customer||{};
    const delivery=order.delivery||{};
    const products=(Array.isArray(order.items)?order.items:[])
      .map(item=>`${item.name} x${Number(item.qty)||0}`)
      .join(" | ");

    rows.push([
      order.folio||"",
      formatOrderDate(order.createdAt),
      order.status||"Nuevo",
      customer.name||"",
      customer.phone||"",
      customer.email||"",
      delivery.type||"",
      [delivery.address,delivery.city,delivery.zip].filter(Boolean).join(", "),
      order.payment||"",
      products,
      Number(order.total)||0,
      order.inventoryApplied===true?"Descontado":"Sin descontar",
      order.cancellationReason||""
    ]);
  });

  const csv="\uFEFF"+rows.map(row=>row.map(csvEscape).join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download=`RIVER_Pedidos_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}




/* ==========================================================
   RIVER STORE V12.11 — CATEGORÍAS Y COLECCIONES
   ========================================================== */
const CATEGORY_KEY="river_categories";

function loadCategories(){
  try{
    const saved=JSON.parse(localStorage.getItem(CATEGORY_KEY));
    if(Array.isArray(saved))return saved;
  }catch(e){}
  const defaults=[
    {id:1,name:"Gorras",type:"category",active:true,description:"Gorras y accesorios de cabeza"},
    {id:2,name:"Merch oficial",type:"category",active:true,description:"Mercancía oficial"},
    {id:3,name:"El Callejón",type:"collection",active:true,description:"Colección inspirada en El Callejón"}
  ];
  localStorage.setItem(CATEGORY_KEY,JSON.stringify(defaults));
  return defaults;
}
function saveCategories(categories){localStorage.setItem(CATEGORY_KEY,JSON.stringify(categories));}
function nextCategoryId(categories){return categories.length?Math.max(...categories.map(c=>Number(c.id)||0))+1:1;}
function categoryNameById(id){
  const c=loadCategories().find(c=>Number(c.id)===Number(id));
  return c?.name||"Sin categoría";
}
function populateCategorySelects(){
  const categories=loadCategories().filter(c=>c.active!==false);
  if(fieldCategory){
    const current=String(fieldCategory.value||"");
    fieldCategory.innerHTML='<option value="">Sin categoría</option>'+
      categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}${c.type==="collection"?" · Colección":""}</option>`).join("");
    fieldCategory.value=current;
  }
  const filter=document.getElementById("productCategoryFilter");
  if(filter){
    const current=filter.value||"all";
    filter.innerHTML='<option value="all">Todas</option><option value="uncategorized">Sin categoría</option>'+
      categories.map(c=>`<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");
    if([...filter.options].some(o=>o.value===current))filter.value=current;
  }
}
function resetCategoryForm(){
  document.getElementById("categoryId").value="";
  document.getElementById("categoryName").value="";
  document.getElementById("categoryType").value="category";
  document.getElementById("categoryActive").value="true";
  document.getElementById("categoryDescription").value="";
  document.getElementById("categoryEditor").hidden=true;
}
function openCategoryEditor(category=null){
  const editor=document.getElementById("categoryEditor");
  editor.hidden=false;
  document.getElementById("categoryId").value=category?.id||"";
  document.getElementById("categoryName").value=category?.name||"";
  document.getElementById("categoryType").value=category?.type||"category";
  document.getElementById("categoryActive").value=String(category?.active!==false);
  document.getElementById("categoryDescription").value=category?.description||"";
  editor.scrollIntoView({behavior:"smooth",block:"nearest"});
}
function editCategory(id){
  const c=loadCategories().find(c=>Number(c.id)===Number(id));
  if(c)openCategoryEditor(c);
}
function toggleCategoryActive(id){
  const categories=loadCategories();
  const c=categories.find(c=>Number(c.id)===Number(id));
  if(!c)return;
  c.active=c.active===false;
  saveCategories(categories);
  renderCategories();
  populateCategorySelects();
  renderProducts();
}
function deleteCategory(id){
  const assigned=getProducts().filter(p=>Number(p.categoryId)===Number(id));
  if(assigned.length){
    alert(`No puedes eliminar esta categoría porque tiene ${assigned.length} producto(s) asignado(s). Puedes ocultarla o mover los productos primero.`);
    return;
  }
  const categories=loadCategories();
  const c=categories.find(c=>Number(c.id)===Number(id));
  if(!c)return;
  if(!confirm(`¿Eliminar "${c.name}"?`))return;
  saveCategories(categories.filter(c=>Number(c.id)!==Number(id)));
  renderCategories();
  populateCategorySelects();
  renderProducts();
}
function renderCategories(){
  const box=document.getElementById("categoryList");
  if(!box)return;
  const categories=loadCategories();
  const products=getProducts();
  const set=(id,value)=>{const el=document.getElementById(id);if(el)el.textContent=value;};
  set("categoryCountTotal",categories.length);
  set("categoryCountActive",categories.filter(c=>c.active!==false).length);
  set("collectionCountTotal",categories.filter(c=>c.type==="collection").length);
  set("uncategorizedCount",products.filter(p=>!p.categoryId).length);
  box.innerHTML=categories.map(c=>{
    const count=products.filter(p=>Number(p.categoryId)===Number(c.id)).length;
    return `<article class="category-card ${c.active===false?"category-hidden":""}">
      <div>
        <div class="category-card-title">
          <strong>${escapeHtml(c.name)}</strong>
          <span class="category-type-badge ${c.type==="collection"?"collection":""}">${c.type==="collection"?"Colección":"Categoría"}</span>
          <span class="category-status-badge">${c.active===false?"Oculta":"Activa"}</span>
        </div>
        <p>${escapeHtml(c.description||"Sin descripción")}</p>
        <small>${count} producto${count===1?"":"s"}</small>
      </div>
      <div class="category-card-actions">
        <button class="secondary" type="button" onclick="editCategory(${c.id})">Editar</button>
        <button class="secondary" type="button" onclick="toggleCategoryActive(${c.id})">${c.active===false?"Activar":"Ocultar"}</button>
        <button class="danger" type="button" onclick="deleteCategory(${c.id})">Eliminar</button>
      </div>
    </article>`;
  }).join("");
}
function initCategoriesModule(){
  populateCategorySelects();
  renderCategories();
  document.getElementById("newCategoryBtn")?.addEventListener("click",()=>openCategoryEditor());
  document.getElementById("cancelCategoryBtn")?.addEventListener("click",resetCategoryForm);
  document.getElementById("categoryForm")?.addEventListener("submit",event=>{
    event.preventDefault();
    const categories=loadCategories();
    const editingId=Number(document.getElementById("categoryId").value);
    const category={
      id:editingId||nextCategoryId(categories),
      name:document.getElementById("categoryName").value.trim(),
      type:document.getElementById("categoryType").value,
      active:document.getElementById("categoryActive").value==="true",
      description:document.getElementById("categoryDescription").value.trim()
    };
    if(!category.name)return alert("Escribe un nombre para la categoría.");
    if(editingId){
      const i=categories.findIndex(c=>Number(c.id)===editingId);
      if(i>=0)categories[i]=category;
    }else categories.push(category);
    saveCategories(categories);
    resetCategoryForm();
    renderCategories();
    populateCategorySelects();
    renderProducts();
  });
  document.getElementById("productCategoryFilter")?.addEventListener("change",renderProducts);
  document.getElementById("productSearchInput")?.addEventListener("input",renderProducts);
}

/* ==========================================================
   RIVER STORE V12.10 — CLIENTES E HISTORIAL DE COMPRAS
   Los clientes se construyen automáticamente a partir de pedidos.
   ========================================================== */
const CLIENT_SALE_STATUSES=["Confirmado","Pagado","Enviado","Entregado"];

function clientNormalize(value){
  return String(value||"")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim();
}

function clientDigits(value){
  return String(value||"").replace(/\D/g,"");
}

function clientIdentityKey(customer){
  const email=clientNormalize(customer?.email);
  const phone=clientDigits(customer?.phone);
  const name=clientNormalize(customer?.name);

  if(email)return `email:${email}`;
  if(phone)return `phone:${phone}`;
  if(name)return `name:${name}`;
  return `unknown:${Math.random().toString(36).slice(2)}`;
}

function buildClientsFromOrders(){
  const orders=loadOrders();
  const map=new Map();

  orders.forEach(order=>{
    const customer=order.customer||{};
    const key=clientIdentityKey(customer);

    if(!map.has(key)){
      map.set(key,{
        key,
        name:customer.name||"Cliente sin nombre",
        phone:customer.phone||"",
        email:customer.email||"",
        orders:[],
        orderCount:0,
        saleOrderCount:0,
        deliveredCount:0,
        cancelledCount:0,
        totalSpent:0,
        firstOrderAt:null,
        lastOrderAt:null
      });
    }

    const client=map.get(key);

    // Completa datos faltantes con pedidos posteriores.
    if(!client.name && customer.name)client.name=customer.name;
    if(!client.phone && customer.phone)client.phone=customer.phone;
    if(!client.email && customer.email)client.email=customer.email;

    client.orders.push(order);
    client.orderCount++;

    if(CLIENT_SALE_STATUSES.includes(order.status)){
      client.saleOrderCount++;
      client.totalSpent+=(Number(order.total)||0);
    }
    if(order.status==="Entregado")client.deliveredCount++;
    if(order.status==="Cancelado")client.cancelledCount++;

    const date=new Date(order.createdAt||0);
    if(Number.isFinite(date.getTime())){
      if(!client.firstOrderAt || date<client.firstOrderAt)client.firstOrderAt=date;
      if(!client.lastOrderAt || date>client.lastOrderAt)client.lastOrderAt=date;
    }
  });

  return [...map.values()].map(client=>{
    client.orders.sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0));
    client.averageTicket=client.saleOrderCount?client.totalSpent/client.saleOrderCount:0;
    return client;
  });
}

function clientSearchMatch(client,query){
  if(!query)return true;
  const haystack=[
    client.name,
    client.phone,
    client.email,
    ...client.orders.map(o=>o.folio),
    ...client.orders.flatMap(o=>(Array.isArray(o.items)?o.items:[]).map(i=>i.name))
  ].map(clientNormalize).join(" ");
  return haystack.includes(query);
}

function getVisibleClients(){
  const all=buildClientsFromOrders();
  const query=clientNormalize(document.getElementById("clientSearchInput")?.value);
  const filter=document.getElementById("clientFilterSelect")?.value||"all";
  const sort=document.getElementById("clientSortSelect")?.value||"recent";

  let visible=all.filter(client=>{
    if(!clientSearchMatch(client,query))return false;
    if(filter==="buyers" && client.saleOrderCount<1)return false;
    if(filter==="repeat" && client.orderCount<2)return false;
    if(filter==="cancelled" && client.cancelledCount<1)return false;
    return true;
  });

  if(sort==="spent"){
    visible.sort((a,b)=>b.totalSpent-a.totalSpent);
  }else if(sort==="orders"){
    visible.sort((a,b)=>b.orderCount-a.orderCount || b.totalSpent-a.totalSpent);
  }else if(sort==="name"){
    visible.sort((a,b)=>String(a.name).localeCompare(String(b.name),"es",{sensitivity:"base"}));
  }else{
    visible.sort((a,b)=>(b.lastOrderAt?.getTime()||0)-(a.lastOrderAt?.getTime()||0));
  }

  return {all,visible};
}

function clientLastDate(client){
  return client.lastOrderAt?formatOrderDate(client.lastOrderAt.toISOString()):"Sin fecha";
}

function clientInitials(name){
  const parts=String(name||"C").trim().split(/\s+/).filter(Boolean);
  return (parts.slice(0,2).map(x=>x[0]).join("")||"C").toUpperCase();
}

function toggleClientHistory(key){
  const safe=String(key).replace(/[^a-zA-Z0-9_-]/g,"_");
  const target=document.getElementById(`clientHistory_${safe}`);
  if(target)target.hidden=!target.hidden;
}

function clientHistoryHtml(client){
  if(!client.orders.length)return '<div class="client-history-empty">Sin pedidos.</div>';

  return client.orders.map(order=>{
    const items=(Array.isArray(order.items)?order.items:[])
      .map(item=>`${escapeHtml(item.name)} × ${Number(item.qty)||0}`)
      .join(" · ");

    return `
      <div class="client-order-row">
        <div>
          <strong>${escapeHtml(order.folio||"Sin folio")}</strong>
          <small>${escapeHtml(formatOrderDate(order.createdAt))}</small>
        </div>
        <div class="client-order-products">${items||"Sin productos"}</div>
        <span class="order-state-pill ${statusClass(order.status)}">${escapeHtml(order.status||"Nuevo")}</span>
        <strong>${adminMoney(order.total)}</strong>
      </div>
    `;
  }).join("");
}

function renderClients(){
  const box=document.getElementById("clientList");
  if(!box)return;

  const {all,visible}=getVisibleClients();
  const buyers=all.filter(c=>c.saleOrderCount>0);
  const repeats=all.filter(c=>c.orderCount>=2);
  const totalSales=all.reduce((sum,c)=>sum+c.totalSpent,0);
  const visibleSales=visible.reduce((sum,c)=>sum+c.totalSpent,0);

  const set=(id,value)=>{
    const el=document.getElementById(id);
    if(el)el.textContent=value;
  };

  set("clientCountTotal",String(all.length));
  set("clientCountBuyers",String(buyers.length));
  set("clientCountRepeat",String(repeats.length));
  set("clientTotalSales",adminMoney(totalSales));
  set("clientResultsInfo",`${visible.length} cliente${visible.length===1?"":"s"} mostrado${visible.length===1?"":"s"}`);
  set("clientResultsSales",`${adminMoney(visibleSales)} en ventas visibles`);

  if(!visible.length){
    box.innerHTML='<div class="client-empty">No hay clientes para mostrar con estos filtros.</div>';
    return;
  }

  box.innerHTML=visible.map(client=>{
    const safe=String(client.key).replace(/[^a-zA-Z0-9_-]/g,"_");
    const phoneDigits=clientDigits(client.phone);
    const waPhone=phoneDigits ? (phoneDigits.startsWith("52")?phoneDigits:`52${phoneDigits}`) : "";

    return `
      <article class="client-card">
        <div class="client-card-main">
          <div class="client-avatar">${escapeHtml(clientInitials(client.name))}</div>

          <div class="client-identity">
            <div class="client-name">${escapeHtml(client.name)}</div>
            <div class="client-contact">
              ${client.phone?`<span>📱 ${escapeHtml(client.phone)}</span>`:""}
              ${client.email?`<span>✉ ${escapeHtml(client.email)}</span>`:""}
            </div>
            <small>Última compra: ${escapeHtml(clientLastDate(client))}</small>
          </div>

          <div class="client-stat"><span>PEDIDOS</span><strong>${client.orderCount}</strong></div>
          <div class="client-stat"><span>COMPRA</span><strong>${adminMoney(client.totalSpent)}</strong></div>
          <div class="client-stat"><span>TICKET PROM.</span><strong>${adminMoney(client.averageTicket)}</strong></div>

          <div class="client-card-actions">
            <button type="button" class="secondary" onclick="toggleClientHistory('${escapeHtml(client.key)}')">Ver historial</button>
            ${waPhone?`<a class="client-whatsapp-btn" href="https://wa.me/${waPhone}?text=${encodeURIComponent(`Hola ${client.name||""}, te contactamos de la tienda.`)}" target="_blank" rel="noopener">WhatsApp</a>`:""}
          </div>
        </div>

        <div class="client-badges">
          ${client.orderCount>=2?'<span class="client-badge repeat">Cliente recurrente</span>':""}
          ${client.deliveredCount>0?`<span class="client-badge delivered">${client.deliveredCount} entregado${client.deliveredCount===1?"":"s"}</span>`:""}
          ${client.cancelledCount>0?`<span class="client-badge cancelled">${client.cancelledCount} cancelado${client.cancelledCount===1?"":"s"}</span>`:""}
        </div>

        <div id="clientHistory_${safe}" class="client-history" hidden>
          <div class="client-history-head">
            <strong>Historial de pedidos</strong>
            <span>${client.orderCount} pedido${client.orderCount===1?"":"s"}</span>
          </div>
          ${clientHistoryHtml(client)}
        </div>
      </article>
    `;
  }).join("");
}

function clientCsvEscape(value){
  return `"${String(value??"").replace(/"/g,'""')}"`;
}

function exportClientsCsv(){
  const {visible}=getVisibleClients();
  if(!visible.length){
    alert("No hay clientes visibles para exportar.");
    return;
  }

  const rows=[
    ["Cliente","Teléfono","Correo","Pedidos","Pedidos con venta","Entregados","Cancelados","Total comprado","Ticket promedio","Última compra"]
  ];

  visible.forEach(client=>{
    rows.push([
      client.name,
      client.phone,
      client.email,
      client.orderCount,
      client.saleOrderCount,
      client.deliveredCount,
      client.cancelledCount,
      client.totalSpent,
      client.averageTicket,
      client.lastOrderAt?client.lastOrderAt.toLocaleString("es-MX"):""
    ]);
  });

  const csv="\uFEFF"+rows.map(r=>r.map(clientCsvEscape).join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download=`RIVER_Clientes_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function initClientsModule(){
  const search=document.getElementById("clientSearchInput");
  const sort=document.getElementById("clientSortSelect");
  const filter=document.getElementById("clientFilterSelect");
  const clear=document.getElementById("clearClientFiltersBtn");
  const exportBtn=document.getElementById("exportClientsCsvBtn");

  search?.addEventListener("input",renderClients);
  sort?.addEventListener("change",renderClients);
  filter?.addEventListener("change",renderClients);

  clear?.addEventListener("click",()=>{
    if(search)search.value="";
    if(sort)sort.value="recent";
    if(filter)filter.value="all";
    renderClients();
  });

  exportBtn?.addEventListener("click",exportClientsCsv);
  renderClients();
}

/* ==========================================================
   RIVER STORE V12.9 — REPORTES Y RESUMEN DEL NEGOCIO
   Usa la caché sincronizada con Supabase.
   ========================================================== */
const REPORT_SALE_STATUSES=["Confirmado","Pagado","Enviado","Entregado"];
const REPORT_LOW_STOCK_LIMIT=3;

function reportStartDate(period){
  const now=new Date();
  if(period==="all") return null;

  if(period==="today"){
    return new Date(now.getFullYear(),now.getMonth(),now.getDate());
  }

  if(period==="month"){
    return new Date(now.getFullYear(),now.getMonth(),1);
  }

  const days=Number(period);
  if(Number.isFinite(days) && days>0){
    const date=new Date(now);
    date.setDate(date.getDate()-(days-1));
    date.setHours(0,0,0,0);
    return date;
  }
  return null;
}

function reportOrdersForPeriod(){
  const period=document.getElementById("reportPeriod")?.value||"all";
  const start=reportStartDate(period);
  const orders=loadOrders();

  if(!start) return orders;

  return orders.filter(order=>{
    const date=new Date(order.createdAt||0);
    return Number.isFinite(date.getTime()) && date>=start;
  });
}

function reportDateKey(value){
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return "";
  const y=date.getFullYear();
  const m=String(date.getMonth()+1).padStart(2,"0");
  const d=String(date.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

function reportShortDate(key){
  if(!key)return "";
  const [y,m,d]=key.split("-").map(Number);
  return new Intl.DateTimeFormat("es-MX",{day:"2-digit",month:"short"})
    .format(new Date(y,m-1,d))
    .replace(".","");
}

function reportPercent(part,total){
  if(!total)return 0;
  return Math.round((part/total)*100);
}

function reportEmpty(message){
  return `<div class="report-empty">${escapeHtml(message)}</div>`;
}

function buildReportData(){
  const orders=reportOrdersForPeriod();
  const products=getProducts();
  const movements=loadInventoryMovements();
  const salesOrders=orders.filter(order=>REPORT_SALE_STATUSES.includes(order.status));
  const delivered=orders.filter(order=>order.status==="Entregado");
  const cancelled=orders.filter(order=>order.status==="Cancelado");

  const confirmedSales=salesOrders.reduce((sum,o)=>sum+(Number(o.total)||0),0);
  const deliveredSales=delivered.reduce((sum,o)=>sum+(Number(o.total)||0),0);
  const cancelledAmount=cancelled.reduce((sum,o)=>sum+(Number(o.total)||0),0);
  const unitsSold=salesOrders.reduce((sum,order)=>
    sum+(Array.isArray(order.items)?order.items:[])
      .reduce((itemSum,item)=>itemSum+(Number(item.qty)||0),0),0
  );

  const productMap=new Map();
  salesOrders.forEach(order=>{
    (Array.isArray(order.items)?order.items:[]).forEach(item=>{
      const id=String(item.id??item.name??"");
      const current=productMap.get(id)||{
        id:item.id,
        name:item.name||"Producto",
        qty:0,
        sales:0
      };
      current.qty+=Number(item.qty)||0;
      current.sales+=Number(item.subtotal)||((Number(item.qty)||0)*(Number(item.price)||0));
      productMap.set(id,current);
    });
  });

  const topProducts=[...productMap.values()]
    .sort((a,b)=>b.qty-a.qty || b.sales-a.sales)
    .slice(0,10);

  const lowStock=products
    .filter(p=>p.active!==false && (Number(p.stock)||0)<=REPORT_LOW_STOCK_LIMIT)
    .sort((a,b)=>(Number(a.stock)||0)-(Number(b.stock)||0));

  const period=document.getElementById("reportPeriod")?.value||"all";
  const periodStart=reportStartDate(period);
  const filteredMovements=periodStart
    ? movements.filter(m=>new Date(m.date||0)>=periodStart)
    : movements;

  return {
    orders,
    products,
    movements:filteredMovements,
    salesOrders,
    delivered,
    cancelled,
    confirmedSales,
    deliveredSales,
    cancelledAmount,
    unitsSold,
    averageTicket:salesOrders.length?confirmedSales/salesOrders.length:0,
    topProducts,
    lowStock
  };
}

function renderReportSalesChart(data){
  const box=document.getElementById("reportSalesChart");
  if(!box)return;

  const dayMap=new Map();
  data.salesOrders.forEach(order=>{
    const key=reportDateKey(order.createdAt);
    if(!key)return;
    dayMap.set(key,(dayMap.get(key)||0)+(Number(order.total)||0));
  });

  let rows=[...dayMap.entries()].sort((a,b)=>a[0].localeCompare(b[0]));

  // Para historial completo se muestran los últimos 14 días que tengan movimiento.
  if(rows.length>14)rows=rows.slice(-14);

  if(!rows.length){
    box.innerHTML=reportEmpty("Todavía no hay ventas confirmadas en este período.");
    return;
  }

  const max=Math.max(...rows.map(([,value])=>value),1);
  box.innerHTML=rows.map(([key,value])=>`
    <div class="sales-chart-column" title="${escapeHtml(reportShortDate(key))}: ${escapeHtml(adminMoney(value))}">
      <div class="sales-chart-value">${escapeHtml(adminMoney(value))}</div>
      <div class="sales-chart-track">
        <div class="sales-chart-bar" style="height:${Math.max(8,(value/max)*100)}%"></div>
      </div>
      <div class="sales-chart-label">${escapeHtml(reportShortDate(key))}</div>
    </div>
  `).join("");
}

function renderReportStatusBars(data){
  const box=document.getElementById("reportStatusBars");
  if(!box)return;

  const statuses=ORDER_STATUSES.map(status=>({
    status,
    count:data.orders.filter(o=>(o.status||"Nuevo")===status).length
  }));

  const total=data.orders.length;
  if(!total){
    box.innerHTML=reportEmpty("No hay pedidos en este período.");
    return;
  }

  box.innerHTML=statuses.map(item=>`
    <div class="report-status-row">
      <div class="report-status-label">
        <span>${escapeHtml(item.status)}</span>
        <strong>${item.count}</strong>
      </div>
      <div class="report-status-track">
        <div class="report-status-fill ${statusClass(item.status)}" style="width:${reportPercent(item.count,total)}%"></div>
      </div>
      <small>${reportPercent(item.count,total)}%</small>
    </div>
  `).join("");
}

function renderReportTopProducts(data){
  const box=document.getElementById("reportTopProducts");
  if(!box)return;

  if(!data.topProducts.length){
    box.innerHTML=reportEmpty("Todavía no hay productos vendidos en este período.");
    return;
  }

  box.innerHTML=`
    <table class="report-table">
      <thead><tr><th>#</th><th>Producto</th><th>Unidades</th><th>Importe</th></tr></thead>
      <tbody>
        ${data.topProducts.map((item,index)=>`
          <tr>
            <td>${index+1}</td>
            <td><strong>${escapeHtml(item.name)}</strong></td>
            <td>${item.qty}</td>
            <td>${adminMoney(item.sales)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderReportLowStock(data){
  const box=document.getElementById("reportLowStock");
  if(!box)return;

  if(!data.lowStock.length){
    box.innerHTML=reportEmpty("No hay productos activos con stock bajo.");
    return;
  }

  box.innerHTML=`
    <table class="report-table">
      <thead><tr><th>Producto</th><th>Stock</th><th>Precio</th><th>Estado</th></tr></thead>
      <tbody>
        ${data.lowStock.map(product=>`
          <tr>
            <td><strong>${escapeHtml(product.name)}</strong></td>
            <td><span class="stock-alert">${Number(product.stock)||0}</span></td>
            <td>${adminMoney(product.price)}</td>
            <td>${(Number(product.stock)||0)===0?"Agotado":"Reponer"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderReportRecentMovements(data){
  const box=document.getElementById("reportRecentMovements");
  if(!box)return;

  const rows=[...data.movements]
    .sort((a,b)=>new Date(b.date||0)-new Date(a.date||0))
    .slice(0,10);

  const count=document.getElementById("reportMovementCount");
  if(count)count.textContent=`${data.movements.length} movimiento${data.movements.length===1?"":"s"}`;

  if(!rows.length){
    box.innerHTML=reportEmpty("No hay movimientos de inventario en este período.");
    return;
  }

  box.innerHTML=`
    <table class="report-table">
      <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Stock</th></tr></thead>
      <tbody>
        ${rows.map(m=>`
          <tr>
            <td>${escapeHtml(formatOrderDate(m.date))}</td>
            <td><strong>${escapeHtml(m.productName)}</strong>${m.folio?`<small>${escapeHtml(m.folio)}</small>`:""}</td>
            <td><span class="movement-badge ${m.type==="Entrada"?"movement-in":"movement-out"}">${escapeHtml(m.type)}</span></td>
            <td>${m.type==="Entrada"?"+":"-"}${Math.abs(Number(m.qty)||0)}</td>
            <td>${Number(m.before)||0} → ${Number(m.after)||0}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderOperationalSummary(data){
  const box=document.getElementById("reportOperationalSummary");
  if(!box)return;

  const totalOrders=data.orders.length;
  const completed=data.delivered.length;
  const cancellationRate=reportPercent(data.cancelled.length,totalOrders);
  const deliveryRate=reportPercent(completed,totalOrders);
  const activeProducts=data.products.filter(p=>p.active!==false).length;
  const stockTotal=data.products.reduce((sum,p)=>sum+(Number(p.stock)||0),0);

  box.innerHTML=`
    <div><span>Pedidos del período</span><strong>${totalOrders}</strong></div>
    <div><span>Tasa de entrega</span><strong>${deliveryRate}%</strong></div>
    <div><span>Tasa de cancelación</span><strong>${cancellationRate}%</strong></div>
    <div><span>Productos activos</span><strong>${activeProducts}</strong></div>
    <div><span>Stock total actual</span><strong>${stockTotal}</strong></div>
    <div><span>Productos vendidos distintos</span><strong>${data.topProducts.length}</strong></div>
  `;
}

function renderBusinessReports(){
  const panel=document.getElementById("reportsPanel");
  if(!panel)return;

  const data=buildReportData();

  const set=(id,value)=>{
    const el=document.getElementById(id);
    if(el)el.textContent=value;
  };

  set("reportConfirmedSales",adminMoney(data.confirmedSales));
  set("reportConfirmedOrders",`${data.salesOrders.length} pedido${data.salesOrders.length===1?"":"s"}`);
  set("reportDeliveredSales",adminMoney(data.deliveredSales));
  set("reportDeliveredOrders",`${data.delivered.length} pedido${data.delivered.length===1?"":"s"}`);
  set("reportAverageTicket",adminMoney(data.averageTicket));
  set("reportUnitsSold",String(data.unitsSold));
  set("reportLowStockCount",String(data.lowStock.length));
  set("reportCancelledAmount",adminMoney(data.cancelledAmount));
  set("reportCancelledOrders",`${data.cancelled.length} pedido${data.cancelled.length===1?"":"s"}`);
  set("reportSalesChartTotal",adminMoney(data.confirmedSales));
  set("reportOrdersTotal",`${data.orders.length} pedidos`);
  set("reportGeneratedAt",`Actualizado ${new Intl.DateTimeFormat("es-MX",{hour:"2-digit",minute:"2-digit"}).format(new Date())}`);

  renderReportSalesChart(data);
  renderReportStatusBars(data);
  renderReportTopProducts(data);
  renderReportLowStock(data);
  renderReportRecentMovements(data);
  renderOperationalSummary(data);
}

function reportCsvEscape(value){
  return `"${String(value??"").replace(/"/g,'""')}"`;
}

function exportBusinessReportCsv(){
  const data=buildReportData();
  const period=document.getElementById("reportPeriod")?.selectedOptions?.[0]?.textContent||"Todo el historial";
  const rows=[];

  rows.push(["RIVER STORE - REPORTE DEL NEGOCIO"]);
  rows.push(["Período",period]);
  rows.push(["Generado",new Date().toLocaleString("es-MX")]);
  rows.push([]);
  rows.push(["INDICADORES"]);
  rows.push(["Venta confirmada",data.confirmedSales]);
  rows.push(["Pedidos con venta",data.salesOrders.length]);
  rows.push(["Venta entregada",data.deliveredSales]);
  rows.push(["Pedidos entregados",data.delivered.length]);
  rows.push(["Ticket promedio",data.averageTicket]);
  rows.push(["Unidades vendidas",data.unitsSold]);
  rows.push(["Cancelado",data.cancelledAmount]);
  rows.push(["Pedidos cancelados",data.cancelled.length]);
  rows.push(["Productos con stock bajo",data.lowStock.length]);
  rows.push([]);

  rows.push(["PRODUCTOS MÁS VENDIDOS"]);
  rows.push(["Producto","Unidades","Importe"]);
  data.topProducts.forEach(item=>rows.push([item.name,item.qty,item.sales]));
  rows.push([]);

  rows.push(["STOCK BAJO"]);
  rows.push(["Producto","Stock","Precio"]);
  data.lowStock.forEach(product=>rows.push([product.name,Number(product.stock)||0,Number(product.price)||0]));
  rows.push([]);

  rows.push(["PEDIDOS DEL PERÍODO"]);
  rows.push(["Folio","Fecha","Estado","Cliente","Total"]);
  data.orders.forEach(order=>rows.push([
    order.folio||"",
    formatOrderDate(order.createdAt),
    order.status||"Nuevo",
    order.customer?.name||"",
    Number(order.total)||0
  ]));

  const csv="\uFEFF"+rows.map(row=>row.map(reportCsvEscape).join(",")).join("\r\n");
  const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const link=document.createElement("a");
  link.href=url;
  link.download=`RIVER_Reporte_Negocio_${new Date().toISOString().slice(0,10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function renderOrders(){
  const {allOrders,visible:orders}=getVisibleOrders();

  statOrders.textContent=allOrders.length;
  statNewOrders.textContent=allOrders.filter(o=>o.status==="Nuevo").length;
  const SALES_STATUSES=["Confirmado","Pagado","Enviado","Entregado"];
  const sales=allOrders
    .filter(o=>SALES_STATUSES.includes(o.status))
    .reduce((sum,o)=>sum+(Number(o.total)||0),0);
  statSales.textContent=adminMoney(sales);
  const cancelledOrders=allOrders.filter(o=>o.status==="Cancelado");
  if(statCancelled) statCancelled.textContent=cancelledOrders.length;
  if(statCancelledAmount) statCancelledAmount.textContent=adminMoney(
    cancelledOrders.reduce((sum,o)=>sum+(Number(o.total)||0),0)
  );

  updateOrderProfessionalSummary(allOrders,orders);
  renderBusinessReports();
  renderClients();

  if(!orders.length){
    orderList.innerHTML='<div class="order-empty">No hay pedidos para mostrar.</div>';
    return;
  }

  orderList.innerHTML=orders.map(order=>{
    const items=Array.isArray(order.items)?order.items:[];
    const customer=order.customer||{};
    const delivery=order.delivery||{};
    const whatsappDigits=String(customer.phone||"").replace(/\D/g,"");
    const waPhone=whatsappDigits.startsWith("52")?whatsappDigits:`52${whatsappDigits}`;

    return `
      <article class="admin-order-card ${statusClass(order.status)}">
        <div class="order-card-head">
          <div>
            <div class="order-folio">${escapeHtml(order.folio)}</div>
            <div class="order-date">${escapeHtml(formatOrderDate(order.createdAt))}</div>
          </div>
          <div class="order-head-actions">
            <span class="order-state-pill ${statusClass(order.status)}">${escapeHtml(order.status||"Nuevo")}</span>
            <select class="order-status-select" onchange="updateOrderStatus('${escapeHtml(order.folio)}',this.value)">
              ${ORDER_STATUSES.map(status=>`<option value="${status}" ${order.status===status?"selected":""}>${status}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="order-card-body">
          <div class="order-customer">
            <div class="order-block-title">CLIENTE</div>
            <strong>${escapeHtml(customer.name)}</strong>
            <span>${escapeHtml(customer.phone)}</span>
            ${customer.email?`<span>${escapeHtml(customer.email)}</span>`:""}
            <span>${escapeHtml(delivery.type||"")}</span>
            ${delivery.address?`<span>${escapeHtml(delivery.address)}, ${escapeHtml(delivery.city||"")} ${escapeHtml(delivery.zip||"")}</span>`:""}
          </div>

          <div>
            <div class="order-block-title">PRODUCTOS</div>
            <div class="order-items">
              ${items.map(item=>`
                <div class="order-item-row">
                  <span>${escapeHtml(item.name)} × ${Number(item.qty)||0}</span>
                  <strong>${adminMoney(item.subtotal)}</strong>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="order-summary-block">
            <div class="order-block-title">TOTAL</div>
            <div class="order-total">${adminMoney(order.total)}</div>
            <div class="order-payment">
              Pago: ${escapeHtml(order.payment||"")}<br>
              Estado: ${escapeHtml(order.status||"Nuevo")}<br>
              <span class="inventory-order-state ${order.inventoryApplied===true?"inventory-applied":"inventory-pending"}">
                ${order.inventoryApplied===true?"Inventario descontado":"Inventario sin descontar"}
              </span>
            </div>
            <div class="order-actions">
              ${whatsappDigits?`<button type="button" class="notify-customer-btn" onclick="notifyOrderCustomer('${escapeHtml(order.folio)}')">Notificar cliente</button><a href="https://wa.me/${waPhone}?text=${encodeURIComponent(`Hola ${customer.name||""}, te contacto por tu pedido ${order.folio}.`)}" target="_blank" rel="noopener">WhatsApp</a>`:""}
              <button type="button" class="internal-note-btn" onclick="addInternalOrderNote('${escapeHtml(order.folio)}')">+ Nota interna</button>
            </div>
          </div>

          ${order.status==="Cancelado"?`
            <div class="order-cancel-box">
              <strong>Pedido cancelado</strong>
              <span><b>Fecha:</b> ${order.cancelledAt?formatOrderDate(order.cancelledAt):"Sin fecha registrada"}</span>
              <span><b>Motivo:</b> ${escapeHtml(order.cancellationReason||"Sin motivo registrado")}</span>
            </div>`:""}
          ${order.notes?`<div class="order-notes"><strong>Notas del cliente:</strong> ${escapeHtml(order.notes)}</div>`:""}
          ${Array.isArray(order.internalNotes)&&order.internalNotes.length?`
            <div class="internal-notes-box">
              <strong>Seguimiento / notas internas</strong>
              ${order.internalNotes.map(n=>`<div class="internal-note-entry"><span>${formatOrderDate(n.date)}</span>${escapeHtml(n.text)}</div>`).join("")}
            </div>`:""}
        </div>
      </article>
    `;
  }).join("");
}

function renderPhotoPreview(){
  if(!workingImages.length){photoPreview.innerHTML='<div class="no-photo">Sin fotografías seleccionadas</div>';return;}
  photoPreview.innerHTML=workingImages.map((src,i)=>`<button type="button" class="photo-thumb ${i===mainImageIndex?'main-photo':''}" data-index="${i}" title="Usar como principal"><img src="${src}" alt="Foto ${i+1}"><span>${i===mainImageIndex?'PRINCIPAL':'Elegir'}</span></button>`).join('');
  photoPreview.querySelectorAll('.photo-thumb').forEach(btn=>btn.addEventListener('click',()=>{mainImageIndex=Number(btn.dataset.index);renderPhotoPreview();}));
}

function readFiles(files){
  const incoming=[...files];
  if(!incoming.length)return;

  const available=Math.max(0,6-workingImages.length);
  if(available<=0){
    alert("Ya tienes 6 fotografías. Quita alguna antes de agregar otra.");
    fieldPhotos.value="";
    return;
  }

  let selected=incoming.slice(0,available);

  if(incoming.length>available){
    alert(`Solo se pueden tener hasta 6 fotografías. Se agregarán ${available}.`);
  }

  const accepted=[];

  for(const file of selected){
    const allowed=["image/jpeg","image/png","image/webp"];

    if(!allowed.includes(file.type)){
      alert(`"${file.name}" no es JPG, PNG o WEBP y no se agregará.`);
      continue;
    }

    if(file.size > 5 * 1024 * 1024){
      alert(`"${file.name}" supera el límite de 5 MB y no se agregará.`);
      continue;
    }

    // Evita agregar dos veces el mismo archivo en la misma sesión.
    const duplicate=pendingPhotoFiles.some(existing =>
      existing.name===file.name &&
      existing.size===file.size &&
      existing.lastModified===file.lastModified
    );

    if(!duplicate){
      accepted.push(file);
    }
  }

  if(!accepted.length){
    fieldPhotos.value="";
    return;
  }

  pendingPhotoFiles.push(...accepted);

  Promise.all(
    accepted.map(file=>new Promise((resolve,reject)=>{
      const r=new FileReader();
      r.onload=()=>resolve(r.result);
      r.onerror=reject;
      r.readAsDataURL(file);
    }))
  ).then(imgs=>{
    const wasEmpty=workingImages.length===0;
    workingImages.push(...imgs);

    if(wasEmpty){
      mainImageIndex=0;
    }

    renderPhotoPreview();

    // Permite volver a elegir archivos y agregar otra tanda,
    // incluso si posteriormente se selecciona el mismo nombre.
    fieldPhotos.value="";
  });
}

fieldPhotos.addEventListener('change',()=>readFiles(fieldPhotos.files));

document.getElementById('clearPhotos').addEventListener('click',()=>{
  workingImages=[];
  pendingPhotoFiles=[];
  mainImageIndex=0;
  fieldPhotos.value='';
  renderPhotoPreview();
});


function clearVideoPreviewObjectUrl(){
  if(videoPreviewObjectUrl){
    URL.revokeObjectURL(videoPreviewObjectUrl);
    videoPreviewObjectUrl="";
  }
}

function renderVideoPreview(){
  if(!videoPreview)return;

  clearVideoPreviewObjectUrl();

  let src="";
  let label="";

  if(pendingVideoFile){
    videoPreviewObjectUrl=URL.createObjectURL(pendingVideoFile);
    src=videoPreviewObjectUrl;
    label=`Nuevo video: ${pendingVideoFile.name}`;
  }else if(workingVideoUrl){
    src=workingVideoUrl;
    label="Video guardado";
  }

  if(!src){
    videoPreview.innerHTML='<div class="video-empty">Sin video</div>';
    return;
  }

  videoPreview.innerHTML=`
    <div class="admin-video-card">
      <video src="${src}" controls playsinline preload="metadata"></video>
      <div>${label}</div>
    </div>
  `;
}

function selectVideoFile(file){
  if(!file)return;

  if(file.type!=="video/mp4"){
    alert("El video debe ser formato MP4.");
    fieldVideo.value="";
    return;
  }

  if(file.size > 30 * 1024 * 1024){
    alert("El video supera el límite de 30 MB.");
    fieldVideo.value="";
    return;
  }

  pendingVideoFile=file;
  
const reportPeriod=document.getElementById("reportPeriod");
const refreshReportsBtn=document.getElementById("refreshReportsBtn");
const exportReportCsvBtn=document.getElementById("exportReportCsvBtn");

reportPeriod?.addEventListener("change",renderBusinessReports);
refreshReportsBtn?.addEventListener("click",renderBusinessReports);
exportReportCsvBtn?.addEventListener("click",exportBusinessReportCsv);

renderBusinessReports();

renderVideoPreview();
  fieldVideo.value="";
}

fieldVideo.addEventListener("change",()=>selectVideoFile(fieldVideo.files?.[0]));

clearVideoBtn.addEventListener("click",()=>{
  pendingVideoFile=null;
  workingVideoUrl="";
  fieldVideo.value="";
  renderVideoPreview();
});

async function uploadProductVideoToStorage(productId){
  if(!pendingVideoFile)return null;

  const db=window.riverSupabase;
  if(!db)throw new Error("Supabase no está disponible.");

  const objectPath=`products/${productId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.mp4`;

  const {error:uploadError}=await db.storage
    .from("product-videos")
    .upload(objectPath,pendingVideoFile,{
      cacheControl:"3600",
      upsert:false,
      contentType:"video/mp4"
    });

  if(uploadError)throw uploadError;

  const {data:publicData}=db.storage
    .from("product-videos")
    .getPublicUrl(objectPath);

  if(!publicData?.publicUrl){
    throw new Error("No se pudo obtener la URL pública del video.");
  }

  return publicData.publicUrl;
}

function loadProducts() {
  try {
    const saved = JSON.parse(localStorage.getItem("river_products"));
    if (Array.isArray(saved) && saved.length) return saved;

    const legacy = JSON.parse(localStorage.getItem("river_product_1"));
    if (legacy && typeof legacy === "object") {
      const migrated = [{...DEFAULT_PRODUCTS[0], ...legacy, image: "assets/gorra_collage.jpg"}];
      saveProducts(migrated);
      return migrated;
    }
  } catch (e) {}
  saveProducts(DEFAULT_PRODUCTS);
  return [...DEFAULT_PRODUCTS];
}

function saveProducts(products) {
  localStorage.setItem("river_products", JSON.stringify(products));
}

function getProducts() {
  return loadProducts();
}

function nextId(products) {
  return products.length ? Math.max(...products.map(p => Number(p.id) || 0)) + 1 : 1;
}

function resetForm() {
  productId.value = "";
  fieldName.value = "";
  fieldPrice.value = "";
  fieldStock.value = "";
  fieldColor.value = "";
  if(fieldCategory)fieldCategory.value = "";
  fieldActive.value = "true";
  fieldDescription.value = "";
  editorMode.textContent = "NUEVO PRODUCTO";
  editorTitle.textContent = "Agregar producto";
  savedMessage.textContent = "";
  workingImages = [];
  pendingPhotoFiles = [];
  mainImageIndex = 0;
  fieldPhotos.value = "";
  pendingVideoFile = null;
  workingVideoUrl = "";
  fieldVideo.value = "";
  renderPhotoPreview();
  renderVideoPreview();

  // Quita cualquier mensaje nativo/autocompletado visual del navegador.
  setTimeout(() => {
    fieldName.focus();
  }, 0);
}

function editProduct(id) {
  const product = getProducts().find(p => p.id === id);
  if (!product) return;

  productId.value = product.id;
  fieldName.value = product.name;
  fieldPrice.value = product.price;
  fieldStock.value = product.stock;
  fieldColor.value = product.color || "";
  populateCategorySelects();
  if(fieldCategory)fieldCategory.value = product.categoryId ? String(product.categoryId) : "";
  fieldActive.value = String(product.active !== false);
  fieldDescription.value = product.description || "";
  workingImages = Array.isArray(product.images) && product.images.length ? [...product.images] : [product.image || "assets/gorra_collage.jpg"];
  pendingPhotoFiles = [];
  mainImageIndex = Math.max(0, workingImages.indexOf(product.image));
  pendingVideoFile = null;
  workingVideoUrl = product.video || "";
  renderPhotoPreview();
  renderVideoPreview();
  editorMode.textContent = "EDITAR PRODUCTO";
  editorTitle.textContent = product.name;
  document.getElementById("editorPanel").scrollIntoView({behavior:"smooth"});
}

function deleteProduct(id) {
  const products = getProducts();
  const product = products.find(p => p.id === id);
  if (!product) return;
  if (!confirm(`¿Eliminar "${product.name}"?`)) return;

  saveProducts(products.filter(p => p.id !== id));
  renderProducts();
  resetForm();
}

function renderProducts() {
  const allProducts = getProducts();
  const filter=document.getElementById("productCategoryFilter")?.value||"all";
  const query=clientNormalize(document.getElementById("productSearchInput")?.value||"");

  statProducts.textContent = allProducts.length;
  statStock.textContent = allProducts.reduce((sum,p) => sum + (Number(p.stock) || 0), 0);
  statActive.textContent = allProducts.filter(p => p.active !== false).length;
  renderBusinessReports();
  renderCategories();

  const products=allProducts.filter(p=>{
    const catName=categoryNameById(p.categoryId);
    const searchOk=!query || clientNormalize([p.name,p.color,catName].join(" ")).includes(query);
    let filterOk=true;
    if(filter==="uncategorized")filterOk=!p.categoryId;
    else if(filter!=="all")filterOk=Number(p.categoryId)===Number(filter);
    return searchOk && filterOk;
  });

  if (!products.length) {
    productList.innerHTML = `<div class="empty-list">No hay productos para mostrar con estos filtros.</div>`;
    return;
  }

  productList.innerHTML = products.map(p => `
    <article class="admin-product-card">
      <div>
        <h3>${escapeHtml(p.name)}</h3>
        <div class="admin-product-meta">
          <span>$${Number(p.price).toLocaleString("es-MX")} MXN</span>
          <span>Stock: ${p.stock}</span>
          <span>${escapeHtml(p.color || "Sin color")}</span>
          <span>${escapeHtml(categoryNameById(p.categoryId))}</span>
          <span class="status-badge ${p.active !== false ? "status-active" : "status-hidden"}">
            ${p.active !== false ? "Activo" : "Oculto"}
          </span>
        </div>
      </div>
      <div class="admin-product-actions">
        <button class="secondary" type="button" onclick="editProduct(${p.id})">Editar</button>
        <button class="danger" type="button" onclick="deleteProduct(${p.id})">Eliminar</button>
      </div>
    </article>
  `).join("");
}

async function uploadProductPhotosToStorage(productId){
  if(!pendingPhotoFiles.length){
    return null;
  }

  const db=window.riverSupabase;
  if(!db){
    throw new Error("Supabase no está disponible.");
  }

  const uploadedUrls=[];

  for(let i=0;i<pendingPhotoFiles.length;i++){
    const file=pendingPhotoFiles[i];
    const extension=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
    const safeExtension=extension||"jpg";
    const objectPath=`products/${productId}/${Date.now()}-${i}-${Math.random().toString(36).slice(2,8)}.${safeExtension}`;

    const {error:uploadError}=await db.storage
      .from("product-images")
      .upload(objectPath,file,{
        cacheControl:"3600",
        upsert:false,
        contentType:file.type
      });

    if(uploadError){
      throw uploadError;
    }

    const {data:publicData}=db.storage
      .from("product-images")
      .getPublicUrl(objectPath);

    if(!publicData?.publicUrl){
      throw new Error("No se pudo obtener la URL pública de la imagen.");
    }

    uploadedUrls.push(publicData.publicUrl);
  }

  return uploadedUrls;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const products = getProducts();
  const editingId = Number(productId.value);
  const resolvedId = editingId || nextId(products);

  let uploadedImages = null;
  let uploadedVideoUrl = null;

  if(pendingPhotoFiles.length){
    const originalSavedText=savedMessage.textContent;
    savedMessage.textContent="Subiendo fotografías…";

    try{
      uploadedImages=await uploadProductPhotosToStorage(resolvedId);

      let uploadedIndex=0;
      workingImages=workingImages.map(img=>{
        if(typeof img==="string" && img.startsWith("data:")){
          const uploaded=uploadedImages[uploadedIndex];
          uploadedIndex++;
          return uploaded || img;
        }
        return img;
      });

      mainImageIndex=Math.min(mainImageIndex,Math.max(0,workingImages.length-1));
      renderPhotoPreview();
    }catch(error){
      console.error("Error al subir fotografías:",error);
      savedMessage.textContent=originalSavedText;
      alert("No se pudieron subir las fotografías a Supabase Storage. El producto no fue guardado.");
      return;
    }
  }

  if(pendingVideoFile){
    const beforeVideoMessage=savedMessage.textContent;
    savedMessage.textContent="Subiendo video…";

    try{
      uploadedVideoUrl=await uploadProductVideoToStorage(resolvedId);
      workingVideoUrl=uploadedVideoUrl;
      pendingVideoFile=null;
      renderVideoPreview();
    }catch(error){
      console.error("Error al subir video:",error);
      savedMessage.textContent=beforeVideoMessage;
      alert("No se pudo subir el video. Verifica que ya creaste el bucket product-videos y ejecutaste V12_5_MIGRATION.sql.");
      return;
    }
  }

  const product = {
    id: resolvedId,
    name: fieldName.value.trim(),
    price: Number(fieldPrice.value),
    stock: Number(fieldStock.value),
    color: fieldColor.value.trim(),
    categoryId: fieldCategory?.value ? Number(fieldCategory.value) : null,
    active: fieldActive.value === "true",
    description: fieldDescription.value.trim(),
    images: workingImages.length ? [...workingImages] : (editingId ? (products.find(p => p.id === editingId)?.images || [products.find(p => p.id === editingId)?.image || "assets/gorra_collage.jpg"]) : ["assets/gorra_collage.jpg"]),
    image: workingImages.length ? workingImages[mainImageIndex] : (editingId ? (products.find(p => p.id === editingId)?.image || "assets/gorra_collage.jpg") : "assets/gorra_collage.jpg"),
    video: workingVideoUrl || ""
  };

  if (!product.name) return alert("Escribe el nombre del producto.");
  if (!Number.isFinite(product.price) || product.price < 0) return alert("Ingresa un precio válido.");
  if (!Number.isFinite(product.stock) || product.stock < 0) return alert("Ingresa existencias válidas.");

  if (editingId) {
    const index = products.findIndex(p => p.id === editingId);
    if (index >= 0) {
      const previousStock=Number(products[index].stock)||0;
      const nextStock=Number(product.stock)||0;
      products[index] = product;
      if(nextStock!==previousStock){
        registerInventoryMovement({
          type:nextStock>previousStock?"Entrada":"Salida",
          product,
          qty:Math.abs(nextStock-previousStock),
          before:previousStock,
          after:nextStock,
          reason:"Ajuste manual desde administrador"
        });
      }
    }
  } else {
    products.push(product);
    if(Number(product.stock)>0){
      registerInventoryMovement({type:"Entrada",product,qty:Number(product.stock),before:0,after:Number(product.stock),reason:"Stock inicial del producto"});
    }
  }

  saveProducts(products);
  renderProducts();
  renderInventoryMovements();
  resetForm();
  savedMessage.textContent = "✓ Producto guardado";
  setTimeout(() => savedMessage.textContent = "", 1800);
});

document.getElementById("newProductBtn").addEventListener("click", () => {
  resetForm();
  document.getElementById("editorPanel").scrollIntoView({behavior:"smooth"});
});

document.getElementById("cancelEdit").addEventListener("click", resetForm);
document.getElementById("loadDemoBtn").addEventListener("click",()=>{
  const products=getProducts();
  const existing=new Set(products.map(p=>p.name));
  let id=nextId(products);
  DEMO_PRODUCTS.forEach(d=>{if(!existing.has(d.name)) products.push({...d,id:id++});});
  saveProducts(products);renderProducts();alert("Productos de prueba cargados. Abre la tienda para verlos.");
});

orderStatusFilter?.addEventListener("change",renderOrders);
orderSearchInput?.addEventListener("input",renderOrders);
orderSortSelect?.addEventListener("change",renderOrders);

clearOrderSearchBtn?.addEventListener("click",()=>{
  if(orderSearchInput) orderSearchInput.value="";
  if(orderStatusFilter) orderStatusFilter.value="Todos";
  if(orderSortSelect) orderSortSelect.value="newest";
  renderOrders();
});

orderStatusSummary?.addEventListener("click",event=>{
  const button=event.target.closest("[data-order-filter]");
  if(!button)return;
  if(orderStatusFilter) orderStatusFilter.value=button.dataset.orderFilter;
  renderOrders();
});

exportOrdersCsvBtn?.addEventListener("click",exportVisibleOrdersCsv);
clearOrdersBtn.addEventListener("click",()=>{
  if(!loadOrders().length)return;
  if(!confirm("¿Borrar todos los pedidos de prueba guardados en este navegador?"))return;
  localStorage.removeItem("river_orders");
  localStorage.setItem("river_order_sequence","0");
  renderOrders();
});

initCategoriesModule();
initClientsModule();
renderProducts();
renderOrders();
resetForm();

const inventoryMovementFilter=document.getElementById("inventoryMovementFilter");
if(inventoryMovementFilter) inventoryMovementFilter.addEventListener("change",renderInventoryMovements);
renderInventoryMovements();

renderVideoPreview();
