/* RIVER V12.7.1 — Configuración profesional + branding */
(() => {
  const cfg=window.RIVER_CONFIG||{};
  const db=window.riverSupabase ||
    (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
      ? window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY)
      : null);
  if(!db)return;
  window.riverSupabase=db;

  const $=id=>document.getElementById(id);

  function normalizeNetworkInput(network, value){
    let raw=String(value||"").trim();
    if(!raw)return "";
    if(/^https?:\/\//i.test(raw))return raw;
    if(/^\/\//.test(raw))return "https:"+raw;
    if(raw.includes(".") && !raw.startsWith("@")){
      return "https://"+raw.replace(/^\/+/,"");
    }
    raw=raw.replace(/^@/,"").replace(/^\/+/,"");
    const bases={
      instagram:"https://www.instagram.com/",
      facebook:"https://www.facebook.com/",
      tiktok:"https://www.tiktok.com/@",
      youtube:"https://www.youtube.com/@"
    };
    return (bases[network]||"")+raw;
  }


  const form=$("storeSettingsForm");
  if(!form)return;

  let currentLogoUrl="";
  let currentCoverUrl="";
  let pendingLogoFile=null;
  let pendingCoverFile=null;
  let logoObjectUrl="";
  let coverObjectUrl="";

  function clearObjectUrl(type){
    if(type==="logo" && logoObjectUrl){URL.revokeObjectURL(logoObjectUrl);logoObjectUrl="";}
    if(type==="cover" && coverObjectUrl){URL.revokeObjectURL(coverObjectUrl);coverObjectUrl="";}
  }

  function renderBrandingPreview(){
    const logo=$("settingLogoPreview");
    const cover=$("settingCoverPreview");

    clearObjectUrl("logo");
    clearObjectUrl("cover");

    if(pendingLogoFile){
      logoObjectUrl=URL.createObjectURL(pendingLogoFile);
      logo.src=logoObjectUrl; logo.style.display="block";
    }else if(currentLogoUrl){
      logo.src=currentLogoUrl; logo.style.display="block";
    }else{
      logo.removeAttribute("src"); logo.style.display="none";
    }

    if(pendingCoverFile){
      coverObjectUrl=URL.createObjectURL(pendingCoverFile);
      cover.src=coverObjectUrl; cover.style.display="block";
    }else if(currentCoverUrl){
      cover.src=currentCoverUrl; cover.style.display="block";
    }else{
      cover.removeAttribute("src"); cover.style.display="none";
    }
  }

  function validateImage(file,label){
    if(!file)return false;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
      alert(`${label}: usa JPG, PNG o WEBP.`);
      return false;
    }
    if(file.size>5*1024*1024){
      alert(`${label}: el archivo supera 5 MB.`);
      return false;
    }
    return true;
  }

  $("settingLogoFile").addEventListener("change",()=>{
    const file=$("settingLogoFile").files?.[0];
    if(file && validateImage(file,"Logo"))pendingLogoFile=file;
    $("settingLogoFile").value="";
    renderBrandingPreview();
  });

  $("settingCoverFile").addEventListener("change",()=>{
    const file=$("settingCoverFile").files?.[0];
    if(file && validateImage(file,"Portada"))pendingCoverFile=file;
    $("settingCoverFile").value="";
    renderBrandingPreview();
  });

  async function uploadBranding(file,kind){
    if(!file)return null;
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
    const path=`${kind}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const {error}=await db.storage.from("store-branding").upload(path,file,{
      cacheControl:"3600",
      upsert:false,
      contentType:file.type
    });
    if(error)throw error;
    const {data}=db.storage.from("store-branding").getPublicUrl(path);
    if(!data?.publicUrl)throw new Error("No se pudo obtener la URL pública.");
    return data.publicUrl;
  }

  async function loadSettings(){
    const {data,error}=await db.from("store_settings").select("*").eq("id",1).maybeSingle();
    if(error){ console.error(error); return; }
    if(!data)return;

    $("settingStoreName").value=data.store_name||"";
    $("settingOwnerName").value=data.owner_name||"";
    $("settingTagline").value=data.tagline||"";
    $("settingWhatsapp").value=data.whatsapp||"";
    $("settingEmail").value=data.email||"";
    $("settingAddress").value=data.address||"";
    $("settingCity").value=data.city||"";
    $("settingCurrency").value=data.currency||"MXN";
    $("settingInstagram").value=data.instagram||"";
    $("settingFacebook").value=data.facebook||"";
    $("settingTiktok").value=data.tiktok||"";
    $("settingYoutube").value=data.youtube||"";
    $("settingPickup").checked=data.pickup_enabled!==false;
    $("settingShipping").checked=data.shipping_enabled!==false;
    $("settingTransfer").checked=data.payment_transfer!==false;
    $("settingCash").checked=data.payment_cash!==false;
    $("settingFooter").value=data.footer_text||"";

    currentLogoUrl=data.logo_url||"";
    currentCoverUrl=data.cover_url||"";
    renderBrandingPreview();
  }

  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const msg=$("settingsSavedMessage");
    msg.textContent="Guardando…";

    try{
      if(pendingLogoFile){
        msg.textContent="Subiendo logo…";
        currentLogoUrl=await uploadBranding(pendingLogoFile,"logo");
        pendingLogoFile=null;
      }
      if(pendingCoverFile){
        msg.textContent="Subiendo portada…";
        currentCoverUrl=await uploadBranding(pendingCoverFile,"cover");
        pendingCoverFile=null;
      }

      msg.textContent="Guardando datos…";

      const payload={
        id:1,
        store_name:$("settingStoreName").value.trim(),
        owner_name:$("settingOwnerName").value.trim(),
        tagline:$("settingTagline").value.trim(),
        whatsapp:$("settingWhatsapp").value.trim().replace(/[^\d]/g,""),
        email:$("settingEmail").value.trim(),
        address:$("settingAddress").value.trim(),
        city:$("settingCity").value.trim(),
        currency:$("settingCurrency").value,
        instagram:normalizeNetworkInput("instagram",$("settingInstagram").value),
        facebook:normalizeNetworkInput("facebook",$("settingFacebook").value),
        tiktok:normalizeNetworkInput("tiktok",$("settingTiktok").value),
        youtube:normalizeNetworkInput("youtube",$("settingYoutube").value),
        logo_url:currentLogoUrl,
        cover_url:currentCoverUrl,
        pickup_enabled:$("settingPickup").checked,
        shipping_enabled:$("settingShipping").checked,
        payment_transfer:$("settingTransfer").checked,
        payment_cash:$("settingCash").checked,
        footer_text:$("settingFooter").value.trim(),
        updated_at:new Date().toISOString()
      };

      const {error}=await db.from("store_settings").upsert(payload,{onConflict:"id"});
      if(error)throw error;

      renderBrandingPreview();
      msg.textContent="Configuración guardada correctamente.";
      document.querySelectorAll("[data-admin-store-name]").forEach(el=>el.textContent=payload.store_name||"RIVER Store");
    }catch(error){
      console.error(error);
      msg.textContent="No se pudo guardar.";
      alert("No se pudo guardar la configuración. Si intentaste subir logo o portada, verifica que hayas creado el bucket store-branding y ejecutado V12_7_1_STORE_BRANDING.sql.");
    }
  });

  loadSettings();
})();