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

  let currentLogoUrl="";
  let pendingLogoFile=null;
  let logoObjectUrl="";

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
    if(which==="logo" && logoObjectUrl){URL.revokeObjectURL(logoObjectUrl);logoObjectUrl="";}
    if(which==="background" && backgroundObjectUrl){URL.revokeObjectURL(backgroundObjectUrl);backgroundObjectUrl="";}
    if(which==="music" && musicObjectUrl){URL.revokeObjectURL(musicObjectUrl);musicObjectUrl="";}
  }

  function validateLogo(file){
    if(!file)return false;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
      alert("Logo: usa JPG, PNG o WEBP."); return false;
    }
    if(file.size>5*1024*1024){alert("Logo: máximo 5 MB.");return false;}
    return true;
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

  function inferBackgroundType(fileOrUrl, mime=""){
    if(mime.startsWith("video/")) return "video";
    if(mime.startsWith("image/")) return "image";
    const s=String(fileOrUrl||"").toLowerCase().split("?")[0];
    return /\.(mp4|webm)$/.test(s) ? "video" : "image";
  }

  function renderLogo(){
    const el=$("settingLogoPreview");
    revoke("logo");
    if(pendingLogoFile){
      logoObjectUrl=URL.createObjectURL(pendingLogoFile);
      el.src=logoObjectUrl; el.style.display="block";
    }else if(currentLogoUrl){
      el.src=currentLogoUrl; el.style.display="block";
    }else{
      el.removeAttribute("src"); el.style.display="none";
    }
  }

  function renderBackground(){
    const img=$("settingBackgroundImagePreview");
    const video=$("settingBackgroundVideoPreview");
    const empty=$("settingBackgroundEmpty");
    revoke("background");
    img.style.display="none";
    video.style.display="none";
    video.pause(); video.removeAttribute("src");

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

    empty.style.display="none";
    if(type==="video"){
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

  $("settingLogoFile")?.addEventListener("change",()=>{
    const file=$("settingLogoFile").files?.[0];
    if(file && validateLogo(file)) pendingLogoFile=file;
    $("settingLogoFile").value="";
    renderLogo();
  });

  $("settingBackgroundFile")?.addEventListener("change",()=>{
    const file=$("settingBackgroundFile").files?.[0];
    if(file && validateBackground(file)){
      pendingBackgroundFile=file;
      currentBackgroundType=inferBackgroundType(file.name,file.type);
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

  $("settingMusicFile")?.addEventListener("change",()=>{
    const file=$("settingMusicFile").files?.[0];
    if(file && validateMusic(file)){
      pendingMusicFile=file;
      musicEnabled=true;
    }
    $("settingMusicFile").value="";
    renderMusic();
  });

  $("settingMusicRemove")?.addEventListener("click",()=>{
    pendingMusicFile=null;
    currentMusicUrl="";
    musicEnabled=false;
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
    if($("settingNotificationEmail")) $("settingNotificationEmail").value=data.notification_email||"";
    if($("settingAdminEmailNotifications")) $("settingAdminEmailNotifications").checked=data.admin_email_notifications!==false;
    if($("settingCustomerEmailNotifications")) $("settingCustomerEmailNotifications").checked=data.customer_email_notifications!==false;
    $("settingShippingPolicy").value=data.shipping_policy||"";
    $("settingReturnsPolicy").value=data.returns_policy||"";
    $("settingPrivacyPolicy").value=data.privacy_policy||"";
    $("settingTermsPolicy").value=data.terms_policy||"";

    currentLogoUrl=data.logo_url||"";
    currentBackgroundUrl=data.background_url||"";
    currentBackgroundType=data.background_type||inferBackgroundType(currentBackgroundUrl);
    backgroundEnabled=data.background_enabled!==false;
    currentMusicUrl=data.music_url||"";
    musicEnabled=data.music_enabled!==false;

    const audioMode=(data.audio_mode==="video") ? "video" : "music";
    if($("settingAudioModeVideo")) $("settingAudioModeVideo").checked=audioMode==="video";
    if($("settingAudioModeMusic")) $("settingAudioModeMusic").checked=audioMode==="music";

    renderLogo();
    renderBackground();
    renderMusic();
  }

  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const msg=$("settingsSavedMessage");
    msg.textContent="Guardando…";

    try{
      if(pendingLogoFile){
        msg.textContent="Subiendo logo…";
        currentLogoUrl=await uploadMedia(pendingLogoFile,"logo");
        pendingLogoFile=null;
      }
      if(pendingBackgroundFile){
        msg.textContent="Subiendo fondo…";
        currentBackgroundUrl=await uploadMedia(pendingBackgroundFile,"background");
        currentBackgroundType=inferBackgroundType(pendingBackgroundFile.name,pendingBackgroundFile.type);
        pendingBackgroundFile=null;
        backgroundEnabled=true;
      }
      if(pendingMusicFile){
        msg.textContent="Subiendo música…";
        currentMusicUrl=await uploadMedia(pendingMusicFile,"music");
        pendingMusicFile=null;
        musicEnabled=true;
      }

      if($("settingAudioModeVideo")?.checked){
        const effectiveType = pendingBackgroundFile
          ? inferBackgroundType(pendingBackgroundFile.name,pendingBackgroundFile.type)
          : currentBackgroundType;
        if(!backgroundEnabled || effectiveType!=="video"){
          const proceed=confirm("Elegiste usar audio del video, pero el fondo actual no es un video. Puedes guardar así y subir un video después. ¿Deseas continuar?");
          if(!proceed){
            msg.textContent="";
            return;
          }
        }
      }

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
        background_url:currentBackgroundUrl,
        background_type:currentBackgroundType,
        background_enabled:backgroundEnabled,
        music_url:currentMusicUrl,
        music_enabled:musicEnabled,
        audio_mode:$("settingAudioModeVideo")?.checked ? "video" : "music",
        pickup_enabled:$("settingPickup").checked,
        shipping_enabled:$("settingShipping").checked,
        payment_transfer:$("settingTransfer").checked,
        payment_cash:$("settingCash").checked,
        footer_text:$("settingFooter").value.trim(),
        notification_email:$("settingNotificationEmail")?.value.trim()||"",
        admin_email_notifications:$("settingAdminEmailNotifications")?.checked!==false,
        customer_email_notifications:$("settingCustomerEmailNotifications")?.checked!==false,
        shipping_policy:$("settingShippingPolicy").value.trim(),
        returns_policy:$("settingReturnsPolicy").value.trim(),
        privacy_policy:$("settingPrivacyPolicy").value.trim(),
        terms_policy:$("settingTermsPolicy").value.trim(),
        updated_at:new Date().toISOString()
      };

      msg.textContent="Guardando configuración…";
      const {error}=await db.from("store_settings").upsert(payload,{onConflict:"id"});
      if(error)throw error;

      renderLogo(); renderBackground(); renderMusic();
      msg.textContent="Configuración guardada correctamente.";
      document.querySelectorAll("[data-admin-store-name]").forEach(el=>el.textContent="ROCKSTAR");
    }catch(error){
      console.error(error);
      msg.textContent="No se pudo guardar.";
      const detail=String(error?.message||error||"");
      if(/background_url|background_type|background_enabled|music_url|music_enabled|column/i.test(detail)){
        alert("Falta preparar Supabase para V16.2. Ejecuta primero supabase/V16_2_ROCKSTAR_MEDIA_SETTINGS.sql en SQL Editor.");
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
