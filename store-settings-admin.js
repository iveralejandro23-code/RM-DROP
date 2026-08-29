/* ROCKSTAR V16.2 — Configuración + fondo + música desde Supabase */
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
    if(raw.includes(".") && !raw.startsWith("@")) return "https://"+raw.replace(/^\/+/,"");
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


  let currentBrandImageUrl="";
  let pendingBrandImageFile=null;
  let brandImageObjectUrl="";

  let currentEntryBackgroundUrl="";
  let pendingEntryBackgroundFile=null;
  let entryBackgroundObjectUrl="";

  let currentEntryProductImageUrl="";
  let pendingEntryProductImageFile=null;
  let entryProductImageObjectUrl="";

  let currentEntryCaptionImageUrl="";
  let pendingEntryCaptionImageFile=null;
  let entryCaptionImageObjectUrl="";

  let currentBackgroundUrl="";
  let currentBackgroundType="";
  let backgroundEnabled=true;
  let pendingBackgroundFile=null;
  let backgroundObjectUrl="";

  let currentMusicUrl="";
  let musicEnabled=true;
  let pendingMusicFile=null;
  let musicObjectUrl="";

  function revoke(which){
    if(which==="brand" && brandImageObjectUrl){URL.revokeObjectURL(brandImageObjectUrl);brandImageObjectUrl="";}
    if(which==="entryBackground" && entryBackgroundObjectUrl){URL.revokeObjectURL(entryBackgroundObjectUrl);entryBackgroundObjectUrl="";}
    if(which==="entryProduct" && entryProductImageObjectUrl){URL.revokeObjectURL(entryProductImageObjectUrl);entryProductImageObjectUrl="";}
    if(which==="entryCaption" && entryCaptionImageObjectUrl){URL.revokeObjectURL(entryCaptionImageObjectUrl);entryCaptionImageObjectUrl="";}
    if(which==="background" && backgroundObjectUrl){URL.revokeObjectURL(backgroundObjectUrl);backgroundObjectUrl="";}
    if(which==="music" && musicObjectUrl){URL.revokeObjectURL(musicObjectUrl);musicObjectUrl="";}
  }

  function validateVisual(file,label="Imagen",maxMb=8){
    if(!file)return false;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
      alert(`${label}: usa JPG, PNG o WEBP.`); return false;
    }
    if(file.size>maxMb*1024*1024){alert(`${label}: máximo ${maxMb} MB.`);return false;}
    return true;
  }

  function renderSimpleImage(previewId, currentUrl, pendingFile, which){
    const el=$(previewId);
    if(!el)return;
    revoke(which);
    let src="";
    if(pendingFile){
      const u=URL.createObjectURL(pendingFile);
      if(which==="brand") brandImageObjectUrl=u;
      if(which==="entryBackground") entryBackgroundObjectUrl=u;
      if(which==="entryProduct") entryProductImageObjectUrl=u;
      if(which==="entryCaption") entryCaptionImageObjectUrl=u;
      src=u;
    }else{
      src=currentUrl;
    }
    if(src){
      el.src=src; el.style.display="block";
    }else{
      el.removeAttribute("src"); el.style.display="none";
    }
  }


  function validateBackground(file){
    if(!file)return false;
    const image=["image/jpeg","image/png","image/webp"].includes(file.type);
    const video=["video/mp4","video/webm"].includes(file.type);
    if(!image && !video){
      alert("Fondo: usa JPG, PNG, WEBP, MP4 o WEBM."); return false;
    }
    if(file.size>40*1024*1024){
      alert("Fondo: máximo 40 MB."); return false;
    }
    return true;
  }

  function validateMusic(file){
    if(!file)return false;
    const ok=["audio/mpeg","audio/mp3","audio/wav","audio/x-wav","audio/mp4"].includes(file.type) ||
      /\.(mp3|wav|m4a)$/i.test(file.name||"");
    if(!ok){alert("Música: usa MP3, WAV o M4A.");return false;}
    if(file.size>15*1024*1024){alert("Música: máximo 15 MB.");return false;}
    return true;
  }

  function normalizeMusicUrl(value){
    const raw=String(value||"").trim();
    if(!raw)return "";
    if(/^https?:\/\//i.test(raw))return raw;
    return "https://"+raw.replace(/^\/+/,"");
  }

  function validateMusicUrl(value){
    const normalized=normalizeMusicUrl(value);
    if(!normalized)return "";
    try{
      const url=new URL(normalized);
      if(!/^https?:$/.test(url.protocol))throw new Error("protocol");
      return url.href;
    }catch(_){
      alert("Música: pega un enlace público válido que comience con https://");
      return "";
    }
  }

  function extractYouTubeId(value){
    const raw=String(value||"").trim();
    if(!raw)return "";
    try{
      const url=new URL(raw);
      const host=url.hostname.replace(/^www\./i,"").toLowerCase();
      if(host==="youtu.be")return (url.pathname.split("/").filter(Boolean)[0]||"").slice(0,11);
      if(host==="youtube.com" || host==="m.youtube.com" || host==="music.youtube.com"){
        if(url.pathname==="/watch")return (url.searchParams.get("v")||"").slice(0,11);
        const parts=url.pathname.split("/").filter(Boolean);
        if(["embed","shorts","live"].includes(parts[0]))return (parts[1]||"").slice(0,11);
      }
    }catch(_){}
    return "";
  }

  function inferBackgroundType(fileOrUrl, mime=""){
    if(mime.startsWith("video/")) return "video";
    if(mime.startsWith("image/")) return "image";
    const s=String(fileOrUrl||"").toLowerCase().split("?")[0];
    return /\.(mp4|webm)$/.test(s) ? "video" : "image";
  }


  function baseBackgroundType(type){
    return String(type||"").toLowerCase().startsWith("video") ? "video" : "image";
  }

  function is360BackgroundType(type){
    return /360$/i.test(String(type||""));
  }

  function composeBackgroundType(base, viewMode){
    const cleanBase=String(base||"image").toLowerCase().startsWith("video") ? "video" : "image";
    return viewMode==="360" ? `${cleanBase}360` : cleanBase;
  }

  function isPanoravenBackgroundType(type){
    return String(type||"").toLowerCase()==="panoraven360";
  }

  function normalizePanoravenUrl(value){
    const raw=String(value||"").trim();
    if(!raw)return "";
    try{
      const url=new URL(/^https?:\/\//i.test(raw)?raw:`https://${raw.replace(/^\/+/,"")}`);
      if(!/(^|\.)panoraven\.com$/i.test(url.hostname))return "";
      const parts=url.pathname.split("/").filter(Boolean);
      const modeIndex=parts.findIndex(x=>/^(slider|embed)$/i.test(x));
      if(modeIndex<0 || !parts[modeIndex+1])return "";
      const locale=modeIndex>0 ? parts[modeIndex-1] : "es";
      const id=parts[modeIndex+1].replace(/[^A-Za-z0-9_-]/g,"");
      if(!id)return "";
      return `https://panoraven.com/${locale}/embed/${id}`;
    }catch(_){ return ""; }
  }

  function syncBackgroundModeUi(){
    const mode=$("settingBackgroundViewMode")?.value||"normal";
    const box=$("settingPanoravenBox");
    const file=$("settingBackgroundFile");
    if(box) box.hidden=mode!=="panoraven";
    if(file) file.disabled=mode==="panoraven";
  }

  function renderBackground(){
    const img=$("settingBackgroundImagePreview");
    const video=$("settingBackgroundVideoPreview");
    const empty=$("settingBackgroundEmpty");
    const pano=$("settingPanoravenPreview");
    revoke("background");
    img.style.display="none";
    video.style.display="none";
    video.pause(); video.removeAttribute("src");
    if(pano){ pano.hidden=true; pano.removeAttribute("src"); }
    syncBackgroundModeUi();

    if(!backgroundEnabled){
      empty.textContent="Fondo desactivado. La tienda mostrará un fondo oscuro neutro.";
      empty.style.display="block";
      return;
    }

    let src="";
    let type=currentBackgroundType||"image";
    if(pendingBackgroundFile){
      backgroundObjectUrl=URL.createObjectURL(pendingBackgroundFile);
      src=backgroundObjectUrl;
      type=inferBackgroundType(pendingBackgroundFile.name,pendingBackgroundFile.type);
    }else{
      src=currentBackgroundUrl;
    }

    if(!src){
      empty.textContent="Sin fondo personalizado. Se usa el fondo incluido en la tienda.";
      empty.style.display="block";
      return;
    }

    if(extractYouTubeId(src)){
      empty.textContent="Enlace de YouTube listo. Se reproducirá desde el botón MÚSICA de la tienda publicada.";
      empty.style.display="block";
      return;
    }

    empty.style.display="none";
    if(isPanoravenBackgroundType(type)){
      const embed=normalizePanoravenUrl(src);
      if(pano && embed){ pano.src=embed; pano.hidden=false; }
      return;
    }
    if(baseBackgroundType(type)==="video"){
      video.src=src; video.style.display="block";
      video.load();
    }else{
      img.src=src; img.style.display="block";
    }
  }

  function renderMusic(){
    const audio=$("settingMusicPreview");
    const empty=$("settingMusicEmpty");
    revoke("music");
    audio.pause(); audio.removeAttribute("src"); audio.style.display="none";

    if(!musicEnabled){
      empty.textContent="Música desactivada. El botón MÚSICA no aparecerá en la tienda.";
      empty.style.display="block";
      return;
    }

    let src="";
    if(pendingMusicFile){
      musicObjectUrl=URL.createObjectURL(pendingMusicFile);
      src=musicObjectUrl;
    }else{
      src=currentMusicUrl;
    }

    if(!src){
      empty.textContent="Sin música personalizada. Se usa la pista incluida en la tienda.";
      empty.style.display="block";
      return;
    }

    empty.style.display="none";
    audio.src=src;
    audio.style.display="block";
    audio.load();
  }

  async function uploadMedia(file,kind){
    if(!file)return null;
    const ext=(file.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"")||"bin";
    const path=`${kind}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;
    const {error}=await db.storage.from("store-branding").upload(path,file,{
      cacheControl:"3600",
      upsert:false,
      contentType:file.type||undefined
    });
    if(error)throw error;
    const {data}=db.storage.from("store-branding").getPublicUrl(path);
    if(!data?.publicUrl)throw new Error("No se pudo obtener la URL pública.");
    return data.publicUrl;
  }

  $("settingBrandImageFile")?.addEventListener("change",()=>{
    const file=$("settingBrandImageFile").files?.[0];
    if(file && validateVisual(file,"Imagen de marca",8)) pendingBrandImageFile=file;
    $("settingBrandImageFile").value="";
    renderSimpleImage("settingBrandImagePreview",currentBrandImageUrl,pendingBrandImageFile,"brand");
  });
  $("settingBrandImageRemove")?.addEventListener("click",()=>{
    pendingBrandImageFile=null; currentBrandImageUrl="";
    renderSimpleImage("settingBrandImagePreview","","","brand");
  });

  $("settingEntryBackgroundFile")?.addEventListener("change",()=>{
    const file=$("settingEntryBackgroundFile").files?.[0];
    if(file && validateVisual(file,"Fondo de entrada",12)) pendingEntryBackgroundFile=file;
    $("settingEntryBackgroundFile").value="";
    renderSimpleImage("settingEntryBackgroundPreview",currentEntryBackgroundUrl,pendingEntryBackgroundFile,"entryBackground");
  });
  $("settingEntryBackgroundRemove")?.addEventListener("click",()=>{
    pendingEntryBackgroundFile=null; currentEntryBackgroundUrl="";
    renderSimpleImage("settingEntryBackgroundPreview","","","entryBackground");
  });

  $("settingEntryProductImageFile")?.addEventListener("change",()=>{
    const file=$("settingEntryProductImageFile").files?.[0];
    if(file && validateVisual(file,"Imagen flotante de entrada",8)) pendingEntryProductImageFile=file;
    $("settingEntryProductImageFile").value="";
    renderSimpleImage("settingEntryProductImagePreview",currentEntryProductImageUrl,pendingEntryProductImageFile,"entryProduct");
    renderSimpleImage("settingEntryCaptionImagePreview",currentEntryCaptionImageUrl,pendingEntryCaptionImageFile,"entryCaption");
  });
  $("settingEntryProductImageRemove")?.addEventListener("click",()=>{
    pendingEntryProductImageFile=null; currentEntryProductImageUrl="";
    renderSimpleImage("settingEntryProductImagePreview","","","entryProduct");
  });


  $("settingEntryCaptionImageFile")?.addEventListener("change",()=>{
    const file=$("settingEntryCaptionImageFile").files?.[0];
    if(file && validateVisual(file,"Imagen de la frase",8)) pendingEntryCaptionImageFile=file;
    $("settingEntryCaptionImageFile").value="";
    renderSimpleImage("settingEntryCaptionImagePreview",currentEntryCaptionImageUrl,pendingEntryCaptionImageFile,"entryCaption");
  });
  $("settingEntryCaptionImageRemove")?.addEventListener("click",()=>{
    pendingEntryCaptionImageFile=null; currentEntryCaptionImageUrl="";
    renderSimpleImage("settingEntryCaptionImagePreview","","","entryCaption");
  });

  $("settingBackgroundFile")?.addEventListener("change",()=>{
    const file=$("settingBackgroundFile").files?.[0];
    if(file && validateBackground(file)){
      pendingBackgroundFile=file;
      currentBackgroundType=composeBackgroundType(
        inferBackgroundType(file.name,file.type),
        $("settingBackgroundViewMode")?.value||"normal"
      );
      backgroundEnabled=true;
    }
    $("settingBackgroundFile").value="";
    renderBackground();
  });

  $("settingBackgroundRemove")?.addEventListener("click",()=>{
    pendingBackgroundFile=null;
    currentBackgroundUrl="";
    currentBackgroundType="";
    backgroundEnabled=false;
    renderBackground();
  });

  $("settingBackgroundViewMode")?.addEventListener("change",()=>{
    const mode=$("settingBackgroundViewMode")?.value||"normal";
    if(mode==="panoraven"){
      pendingBackgroundFile=null;
      currentBackgroundType="panoraven360";
    }else{
      const base=baseBackgroundType(currentBackgroundType||inferBackgroundType(currentBackgroundUrl));
      currentBackgroundType=composeBackgroundType(base,mode);
    }
    syncBackgroundModeUi();
    renderBackground();
  });

  $("settingPanoravenUrl")?.addEventListener("input",()=>{
    if($("settingBackgroundViewMode")?.value!=="panoraven")return;
    const normalized=normalizePanoravenUrl($("settingPanoravenUrl").value);
    const preview=$("settingPanoravenPreview");
    if(preview){
      if(normalized){ preview.src=normalized; preview.hidden=false; }
      else { preview.hidden=true; preview.removeAttribute("src"); }
    }
  });

  $("settingMusicFile")?.addEventListener("change",()=>{
    const file=$("settingMusicFile").files?.[0];
    if(file && validateMusic(file)){
      pendingMusicFile=file;
      musicEnabled=true;
      if($("settingMusicUrl")) $("settingMusicUrl").value="";
      if($("settingAudioModeMusic")) $("settingAudioModeMusic").checked=true;
    }
    $("settingMusicFile").value="";
    renderMusic();
  });

  $("settingMusicUrl")?.addEventListener("change",()=>{
    const input=$("settingMusicUrl");
    const url=validateMusicUrl(input?.value);
    if(!url)return;
    pendingMusicFile=null;
    currentMusicUrl=url;
    musicEnabled=true;
    if($("settingAudioModeMusic")) $("settingAudioModeMusic").checked=true;
    input.value=url;
    renderMusic();
  });

  $("settingMusicRemove")?.addEventListener("click",()=>{
    pendingMusicFile=null;
    currentMusicUrl="";
    musicEnabled=false;
    if($("settingMusicUrl")) $("settingMusicUrl").value="";
    renderMusic();
  });

  async function loadSettings(){
    const {data,error}=await db.from("store_settings").select("*").eq("id",1).maybeSingle();
    if(error){
      console.error(error);
      alert("No se pudo leer Configuración. Si acabas de instalar V16.2, ejecuta supabase/V16_2_ROCKSTAR_MEDIA_SETTINGS.sql.");
      return;
    }
    if(!data)return;

    $("settingStoreName").value=data.store_name||"";
    $("settingWhatsapp").value=data.whatsapp||"";
    $("settingEmail").value=data.email||"";
    $("settingAddress").value=data.address||"";
    $("settingCity").value=data.city||"";
    $("settingInstagram").value=data.instagram||"";
    $("settingFacebook").value=data.facebook||"";
    $("settingTiktok").value=data.tiktok||"";
    $("settingYoutube").value=data.youtube||"";
    $("settingPickup").checked=data.pickup_enabled!==false;
    $("settingShipping").checked=data.shipping_enabled!==false;
    $("settingTransfer").checked=data.payment_transfer!==false;
    $("settingCash").checked=data.payment_cash!==false;
    $("settingFooter").value=data.footer_text||"";
    if($("settingNotificationEmail")) $("settingNotificationEmail").value=data.notification_email||"";
    if($("settingAdminEmailNotifications")) $("settingAdminEmailNotifications").checked=data.admin_email_notifications!==false;
    if($("settingCustomerEmailNotifications")) $("settingCustomerEmailNotifications").checked=data.customer_email_notifications!==false;
    if($("settingPushVapidPublicKey")) $("settingPushVapidPublicKey").value=data.push_vapid_public_key||"";
    $("settingShippingPolicy").value=data.shipping_policy||"";
    $("settingReturnsPolicy").value=data.returns_policy||"";
    $("settingPrivacyPolicy").value=data.privacy_policy||"";
    $("settingTermsPolicy").value=data.terms_policy||"";

    if($("settingBrandGlowColor")) $("settingBrandGlowColor").value=data.brand_glow_color||"#e5bd70";
    if($("settingEntryProductGlowColor")) $("settingEntryProductGlowColor").value=data.entry_product_glow_color||"#e5bd70";
    if($("settingEntryCaptionGlowColor")) $("settingEntryCaptionGlowColor").value=data.entry_caption_glow_color||"#ff2028";
    if($("settingBrand3DLevel")) $("settingBrand3DLevel").value=data.brand_3d_level||"off";
    if($("settingEntryProduct3DLevel")) $("settingEntryProduct3DLevel").value=data.entry_product_3d_level||"off";
    if($("settingEntryCaption3DLevel")) $("settingEntryCaption3DLevel").value=data.entry_caption_3d_level||"off";

    currentBrandImageUrl=data.header_brand_image_url||"";
    currentEntryBackgroundUrl=data.entry_background_url||"";
    currentEntryProductImageUrl=data.entry_product_image_url||"";
    currentEntryCaptionImageUrl=data.entry_caption_image_url||"";
    renderSimpleImage("settingBrandImagePreview",currentBrandImageUrl,pendingBrandImageFile,"brand");
    renderSimpleImage("settingEntryBackgroundPreview",currentEntryBackgroundUrl,pendingEntryBackgroundFile,"entryBackground");
    renderSimpleImage("settingEntryProductImagePreview",currentEntryProductImageUrl,pendingEntryProductImageFile,"entryProduct");
    renderSimpleImage("settingEntryCaptionImagePreview",currentEntryCaptionImageUrl,pendingEntryCaptionImageFile,"entryCaption");

    currentBackgroundUrl=data.background_url||"";
    currentBackgroundType=data.background_type||inferBackgroundType(currentBackgroundUrl);
    if($("settingBackgroundViewMode")){
      $("settingBackgroundViewMode").value=isPanoravenBackgroundType(currentBackgroundType)?"panoraven":(is360BackgroundType(currentBackgroundType)?"360":"normal");
    }
    if($("settingPanoravenUrl")) $("settingPanoravenUrl").value=isPanoravenBackgroundType(currentBackgroundType)?currentBackgroundUrl:"";
    syncBackgroundModeUi();
    backgroundEnabled=data.background_enabled!==false;
    currentMusicUrl=data.music_url||"";
    musicEnabled=data.music_enabled!==false;
    if($("settingMusicUrl")) $("settingMusicUrl").value=currentMusicUrl;

    const audioMode=(data.audio_mode==="video") ? "video" : "music";
    if($("settingAudioModeVideo")) $("settingAudioModeVideo").checked=audioMode==="video";
    if($("settingAudioModeMusic")) $("settingAudioModeMusic").checked=audioMode==="music";

    renderBackground();
    renderMusic();
  }

  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const msg=$("settingsSavedMessage");
    msg.textContent="Guardando…";

    try{
      if(pendingBrandImageFile){
        msg.textContent="Subiendo imagen de marca…";
        currentBrandImageUrl=await uploadMedia(pendingBrandImageFile,"header-brand");
        pendingBrandImageFile=null;
      }
      if(pendingEntryBackgroundFile){
        msg.textContent="Subiendo fondo de entrada…";
        currentEntryBackgroundUrl=await uploadMedia(pendingEntryBackgroundFile,"entry-background");
        pendingEntryBackgroundFile=null;
      }
      if(pendingEntryProductImageFile){
        msg.textContent="Subiendo imagen flotante de entrada…";
        currentEntryProductImageUrl=await uploadMedia(pendingEntryProductImageFile,"entry-product");
        pendingEntryProductImageFile=null;
      }


      if(pendingEntryCaptionImageFile){
        msg.textContent="Subiendo imagen de la frase…";
        currentEntryCaptionImageUrl=await uploadMedia(pendingEntryCaptionImageFile,"entry-caption");
        pendingEntryCaptionImageFile=null;
      }

      const backgroundViewMode=$("settingBackgroundViewMode")?.value||"normal";
      if(backgroundViewMode==="panoraven"){
        const embedUrl=normalizePanoravenUrl($("settingPanoravenUrl")?.value||currentBackgroundUrl);
        if(!embedUrl) throw new Error("Pega un enlace válido de Panoraven (/slider/ o /embed/).");
        pendingBackgroundFile=null;
        currentBackgroundUrl=embedUrl;
        currentBackgroundType="panoraven360";
        backgroundEnabled=true;
      }else if(pendingBackgroundFile){
        msg.textContent="Subiendo fondo…";
        currentBackgroundUrl=await uploadMedia(pendingBackgroundFile,"background");
        currentBackgroundType=composeBackgroundType(
          inferBackgroundType(pendingBackgroundFile.name,pendingBackgroundFile.type),
          backgroundViewMode
        );
        pendingBackgroundFile=null;
        backgroundEnabled=true;
      }else if(isPanoravenBackgroundType(currentBackgroundType)){
        currentBackgroundUrl="";
        currentBackgroundType="image";
        backgroundEnabled=false;
      }
      if(pendingMusicFile){
        msg.textContent="Subiendo música…";
        currentMusicUrl=await uploadMedia(pendingMusicFile,"music");
        pendingMusicFile=null;
        musicEnabled=true;
      }else if($("settingMusicUrl")?.value.trim()){
        const linkedMusicUrl=validateMusicUrl($("settingMusicUrl").value);
        if(!linkedMusicUrl) throw new Error("El enlace de música no es válido.");
        currentMusicUrl=linkedMusicUrl;
        musicEnabled=true;
        $("settingMusicUrl").value=linkedMusicUrl;
      }else if(musicEnabled){
        currentMusicUrl="";
      }

      if($("settingAudioModeVideo")?.checked){
        const effectiveType = pendingBackgroundFile
          ? inferBackgroundType(pendingBackgroundFile.name,pendingBackgroundFile.type)
          : currentBackgroundType;
        if(!backgroundEnabled || baseBackgroundType(effectiveType)!=="video"){
          const proceed=confirm("Elegiste usar audio del video, pero el fondo actual no es un video. Puedes guardar así y subir un video después. ¿Deseas continuar?");
          if(!proceed){
            msg.textContent="";
            return;
          }
        }
      }

      if(!$("settingPickup")?.checked && !$("settingShipping")?.checked){
        throw new Error("Activa al menos una opción de entrega: Recoger pedido o Envío.");
      }
      if(!$("settingTransfer")?.checked && !$("settingCash")?.checked){
        throw new Error("Activa al menos una forma de pago: Transferencia o Efectivo.");
      }

      const storeNameValue=$("settingStoreName").value.trim();
      const payload={
        id:1,
        store_name:storeNameValue,
        whatsapp:$("settingWhatsapp").value.trim().replace(/[^\d]/g,""),
        email:$("settingEmail").value.trim(),
        address:$("settingAddress").value.trim(),
        city:$("settingCity").value.trim(),
        currency:"MXN",
        instagram:normalizeNetworkInput("instagram",$("settingInstagram").value),
        facebook:normalizeNetworkInput("facebook",$("settingFacebook").value),
        tiktok:normalizeNetworkInput("tiktok",$("settingTiktok").value),
        youtube:normalizeNetworkInput("youtube",$("settingYoutube").value),
        logo_url:"", // V22.4.40: corona eliminada de la tienda
        header_brand_mode:currentBrandImageUrl ? "image" : "text",
        header_brand_text:storeNameValue||"ROCKSTAR",
        header_brand_image_url:currentBrandImageUrl,
        brand_glow_color:$("settingBrandGlowColor")?.value||"#e5bd70",
        entry_product_glow_color:$("settingEntryProductGlowColor")?.value||"#e5bd70",
        entry_caption_glow_color:$("settingEntryCaptionGlowColor")?.value||"#ff2028",
        brand_3d_level:$("settingBrand3DLevel")?.value||"off",
        entry_product_3d_level:$("settingEntryProduct3DLevel")?.value||"off",
        entry_caption_3d_level:$("settingEntryCaption3DLevel")?.value||"off",
        entry_background_url:currentEntryBackgroundUrl,
        entry_caption_image_url:currentEntryCaptionImageUrl,
        entry_caption_mode:currentEntryCaptionImageUrl ? "image" : "none",
        entry_product_image_url:currentEntryProductImageUrl,
        background_url:currentBackgroundUrl,
        background_type:currentBackgroundType,
        background_enabled:backgroundEnabled,
        music_url:currentMusicUrl,
        music_enabled:musicEnabled,
        // Si existe una música personalizada, siempre se conecta al botón.
        // La opción de audio del video se usa únicamente cuando no hay música.
        audio_mode:(musicEnabled && currentMusicUrl) ? "music" : ($("settingAudioModeVideo")?.checked ? "video" : "music"),
        pickup_enabled:$("settingPickup").checked,
        shipping_enabled:$("settingShipping").checked,
        payment_transfer:$("settingTransfer").checked,
        payment_cash:$("settingCash").checked,
        footer_text:$("settingFooter").value.trim(),
        notification_email:$("settingNotificationEmail")?.value.trim()||"",
        admin_email_notifications:$("settingAdminEmailNotifications")?.checked!==false,
        customer_email_notifications:$("settingCustomerEmailNotifications")?.checked!==false,
        push_vapid_public_key:$("settingPushVapidPublicKey")?.value.trim()||"",
        shipping_policy:$("settingShippingPolicy").value.trim(),
        returns_policy:$("settingReturnsPolicy").value.trim(),
        privacy_policy:$("settingPrivacyPolicy").value.trim(),
        terms_policy:$("settingTermsPolicy").value.trim(),
        updated_at:new Date().toISOString()
      };

      msg.textContent="Guardando configuración…";
      const {error}=await db.from("store_settings").upsert(payload,{onConflict:"id"});
      if(error)throw error;

      // Verificación real: vuelve a leer los campos de la frase para confirmar
      // que Supabase guardó tanto la imagen como su color. Esto evita mostrar
      // "guardado" cuando la columna o la actualización no persistieron.
      const {data:captionSaved,error:captionVerifyError}=await db
        .from("store_settings")
        .select("entry_caption_image_url,entry_caption_glow_color,entry_caption_mode")
        .eq("id",1)
        .maybeSingle();
      if(captionVerifyError)throw captionVerifyError;
      const savedCaptionUrl=String(captionSaved?.entry_caption_image_url||"").trim();
      const wantedCaptionUrl=String(currentEntryCaptionImageUrl||"").trim();
      if(savedCaptionUrl!==wantedCaptionUrl){
        throw new Error("La imagen de la frase no quedó guardada en Supabase.");
      }
      currentEntryCaptionImageUrl=savedCaptionUrl;

      renderBackground(); renderMusic();
      renderSimpleImage("settingBrandImagePreview",currentBrandImageUrl,pendingBrandImageFile,"brand");
      renderSimpleImage("settingEntryBackgroundPreview",currentEntryBackgroundUrl,pendingEntryBackgroundFile,"entryBackground");
      renderSimpleImage("settingEntryProductImagePreview",currentEntryProductImageUrl,pendingEntryProductImageFile,"entryProduct");
      renderSimpleImage("settingEntryCaptionImagePreview",currentEntryCaptionImageUrl,pendingEntryCaptionImageFile,"entryCaption");
      msg.textContent="Configuración guardada correctamente.";
      document.querySelectorAll("[data-admin-store-name]").forEach(el=>el.textContent=storeNameValue||"ROCKSTAR");
    }catch(error){
      console.error(error);
      msg.textContent="No se pudo guardar.";
      const detail=String(error?.message||error||"");
      if(/Activa al menos una opción de entrega|Activa al menos una forma de pago|Panoraven/i.test(detail)){
        alert(detail);
      }else if(/background_url|background_type|background_enabled|music_url|music_enabled|column/i.test(detail)){
        alert("Supabase todavía no tiene todos los campos de la portada. Ejecuta el archivo supabase/PORTADA_EDITABLE.sql de ESTA versión y vuelve a guardar.");
      }else{
        alert("No se pudo guardar/subir el archivo. Verifica tu conexión, permisos del bucket store-branding y el tamaño del archivo.");
      }
    }
  });


  // ROCKSTAR V17.7 — pestañas del editor de políticas
  document.querySelectorAll("[data-policy-tab]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const key=btn.dataset.policyTab;
      document.querySelectorAll("[data-policy-tab]").forEach(x=>x.classList.toggle("is-active",x===btn));
      document.querySelectorAll("[data-policy-panel]").forEach(panel=>{
        panel.classList.toggle("is-active",panel.dataset.policyPanel===key);
      });
    });
  });

  loadSettings();
})();
