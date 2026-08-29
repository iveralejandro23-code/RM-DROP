/* RIVER V12.7.4 — Contacto y redes dinámicos */
(() => {
  const cfg = window.RIVER_CONFIG || {};
  if(!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;

  const db = window.riverStoreDb ||
    window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  window.riverStoreDb = db;

  function setText(selector, value){
    document.querySelectorAll(selector).forEach(el=>{
      if(value !== undefined && value !== null && String(value).trim() !== ""){
        el.textContent = String(value);
      }
    });
  }

  function normalizeSocialUrl(network, value){
    let raw = String(value || "").trim();
    if(!raw) return "";

    // Already a full URL
    if(/^https?:\/\//i.test(raw)) return raw;

    // Protocol-relative URL
    if(/^\/\//.test(raw)) return "https:" + raw;

    // User wrote a domain without protocol
    if(/^(www\.)?/i.test(raw) && raw.includes(".")){
      return "https://" + raw.replace(/^\/+/, "");
    }

    // @usuario or usuario
    raw = raw.replace(/^@/, "").replace(/^\/+/, "");

    const bases = {
      instagram: "https://www.instagram.com/",
      facebook: "https://www.facebook.com/",
      tiktok: "https://www.tiktok.com/@",
      youtube: "https://www.youtube.com/@"
    };

    const base = bases[network];
    if(!base) return "";

    // If pasted platform path without protocol, avoid duplicating hostname
    const hostPatterns = {
      instagram: /^(?:www\.)?instagram\.com\//i,
      facebook: /^(?:www\.)?facebook\.com\//i,
      tiktok: /^(?:www\.)?tiktok\.com\//i,
      youtube: /^(?:www\.)?youtube\.com\//i
    };
    if(hostPatterns[network]?.test(raw)){
      return "https://" + raw;
    }

    return base + raw;
  }


  // V20.2 — Convierte fondos negros/casi negros de logos en transparencia real.
  // Se usa para la marca ROCKSTAR.
  const transparentBrandCache = new Map();
  async function transparentizeDarkBackground(url){
    const source=String(url||"").trim();
    if(!source) return "";
    if(transparentBrandCache.has(source)) return transparentBrandCache.get(source);
    const promise=(async()=>{
      try{
        const response=await fetch(source,{mode:"cors",cache:"force-cache"});
        if(!response.ok) throw new Error("No se pudo leer la imagen");
        const blob=await response.blob();
        const bitmap=await createImageBitmap(blob);
        const canvas=document.createElement("canvas");
        canvas.width=bitmap.width; canvas.height=bitmap.height;
        const ctx=canvas.getContext("2d",{willReadFrequently:true});
        ctx.drawImage(bitmap,0,0);
        const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
        const d=frame.data;
        for(let i=0;i<d.length;i+=4){
          const r=d[i],g=d[i+1],b=d[i+2];
          const mx=Math.max(r,g,b),mn=Math.min(r,g,b),lum=(r+g+b)/3;
          const neutral=(mx-mn)<34;
          if(neutral && lum<=46){ d[i+3]=0; }
          else if(neutral && lum<96){ d[i+3]=Math.round(d[i+3]*((lum-46)/50)); }
        }
        ctx.putImageData(frame,0,0);
        bitmap.close?.();
        return canvas.toDataURL("image/png");
      }catch(_){ return ""; }
    })();
    transparentBrandCache.set(source,promise);
    return promise;
  }

  function applyTransparentImage(img,originalUrl,kind){
    if(!img || !originalUrl) return;
    img.src=originalUrl;
    delete img.dataset.transparentHeaderBrand;
    delete img.dataset.transparentPublicBrand;
    transparentizeDarkBackground(originalUrl).then(result=>{
      if(!img.isConnected || img.dataset.originalBrandSource!==originalUrl) return;
      if(result){
        img.src=result;
        if(kind==="header") img.dataset.transparentHeaderBrand="1";
        if(kind==="public") img.dataset.transparentPublicBrand="1";
      }else{
        if(kind==="header") img.dataset.transparentHeaderBrand="fallback";
        if(kind==="public") img.dataset.transparentPublicBrand="fallback";
      }
    });
  }


  function baseBackgroundType(type){
    return String(type||"").toLowerCase().startsWith("video") ? "video" : "image";
  }

  function is360BackgroundType(type){
    return /360$/i.test(String(type||""));
  }

  function isPanoravenBackgroundType(type){
    return String(type||"").toLowerCase()==="panoraven360";
  }

  function normalizePanoravenUrl(value){
    const raw=String(value||"").trim();
    if(!raw)return "";
    try{
      const url=new URL(raw);
      if(!/(^|\.)panoraven\.com$/i.test(url.hostname))return "";
      const parts=url.pathname.split("/").filter(Boolean);
      const modeIndex=parts.findIndex(x=>/^(slider|embed)$/i.test(x));
      if(modeIndex<0 || !parts[modeIndex+1])return "";
      const locale=modeIndex>0 ? parts[modeIndex-1] : "es";
      const id=parts[modeIndex+1].replace(/[^A-Za-z0-9_-]/g,"");
      return id ? `https://panoraven.com/${locale}/embed/${id}` : "";
    }catch(_){ return ""; }
  }

  function applySettings(data){
    if(!data) return;
    window.RIVER_STORE_SETTINGS = data;

    // Identidad pública editable desde Admin.
    const storeName = String(data.store_name || data.header_brand_text || "ROCKSTAR").trim() || "ROCKSTAR";
    const city = (data.city || "").trim();
    const address = (data.address || "").trim();

    document.title = "ROCKSTAR | Tienda";

    setText("[data-store-name]", storeName);
    setText("[data-store-owner]", storeName);
    setText("[data-store-footer]", data.footer_text || "ROCKSTAR · Headwear · Streetwear");

    const locationBits = [city, address].filter(Boolean);
    if(locationBits.length){
      setText("[data-store-location]", locationBits.join(" · "));
    }

    // Marca gráfica: la imagen de Admin tiene prioridad; el nombre de tienda es respaldo.
    const brandMode = data.header_brand_image_url ? "image" : "text";
    const brandText = storeName || "ROCKSTAR";
    const brandImageUrl = String(data.header_brand_image_url || "").trim();
    const glowColor = String(data.brand_glow_color || "#e5bd70").trim() || "#e5bd70";
    document.documentElement.style.setProperty("--rockstar-brand-glow", glowColor);

    const hasGraphicBrand=Boolean(brandImageUrl);
    document.querySelectorAll("[data-header-brand-text]").forEach(el=>{
      el.textContent = brandText;
      // Si existe imagen de marca, la tienda pública usa siempre esa tipografía/arte.
      el.style.display = hasGraphicBrand ? "none" : "";
    });
    document.querySelectorAll("[data-header-brand-image]").forEach(img=>{
      if(hasGraphicBrand){
        img.dataset.originalBrandSource=brandImageUrl;
        applyTransparentImage(img,brandImageUrl,"header");
        img.hidden = false;
        img.style.display = "block";
        img.alt = brandText;
      }else{
        img.removeAttribute("src");
        img.hidden = true;
        img.style.display = "none";
        delete img.dataset.originalBrandSource;
      }
    });

    // Todas las apariciones visuales de la marca en la tienda usan la misma
    // imagen subida desde Admin. Si no hay imagen, conservan texto como respaldo.
    document.querySelectorAll("[data-public-brand-slot]").forEach(slot=>{
      const img=slot.querySelector("[data-public-brand-image]");
      const text=slot.querySelector("[data-public-brand-text]");
      if(hasGraphicBrand && img){
        img.dataset.originalBrandSource=brandImageUrl;
        applyTransparentImage(img,brandImageUrl,"public");
        img.hidden=false;
        img.style.display="block";
        img.alt=brandText;
        if(text){ text.hidden=true; text.style.display="none"; }
      }else{
        if(img){ img.hidden=true; img.style.display="none"; img.removeAttribute("src"); }
        if(text){ text.textContent=brandText; text.hidden=false; text.style.display="inline-block"; }
      }
    });

    window.ROCKSTAR_ENTRY_CONFIG = {
      brandMode,
      brandText,
      brandImageUrl,
      glowColor,
      productGlowColor: String(data.entry_product_glow_color || "#e5bd70").trim() || "#e5bd70",
      captionGlowColor: String(data.entry_caption_glow_color || "#ff2028").trim() || "#ff2028",
      brand3DLevel: String(data.brand_3d_level || "off").trim() || "off",
      product3DLevel: String(data.entry_product_3d_level || "off").trim() || "off",
      caption3DLevel: String(data.entry_caption_3d_level || "off").trim() || "off",
      entryCaptionImageUrl: String(data.entry_caption_image_url || "").trim(),
      entryBackgroundUrl: String(data.entry_background_url || "").trim(),
      entryProductImageUrl: String(data.entry_product_image_url || "").trim()
    };

    // V21 — Las opciones de entrega y pago de Admin controlan el checkout real.
    const checkoutAvailability={
      pickup: data.pickup_enabled !== false,
      shipping: data.shipping_enabled !== false,
      transfer: data.payment_transfer !== false,
      cash: data.payment_cash !== false
    };
    window.ROCKSTAR_CHECKOUT_AVAILABILITY=checkoutAvailability;

    function syncOption(selector,enabled){
      const card=document.querySelector(selector);
      if(!card)return null;
      card.hidden=!enabled;
      card.style.display=enabled?"":"none";
      const input=card.querySelector('input[type="radio"]');
      if(input){ input.disabled=!enabled; if(!enabled)input.checked=false; }
      return input;
    }
    const pickupInput=syncOption('[data-delivery-option="pickup"]',checkoutAvailability.pickup);
    const shippingInput=syncOption('[data-delivery-option="shipping"]',checkoutAvailability.shipping);
    const transferInput=syncOption('[data-payment-option="transfer"]',checkoutAvailability.transfer);
    const cashInput=syncOption('[data-payment-option="cash"]',checkoutAvailability.cash);

    const firstDelivery=[pickupInput,shippingInput].find(i=>i && !i.disabled);
    if(firstDelivery && !document.querySelector('input[name="deliveryType"]:checked')) firstDelivery.checked=true;
    const firstPayment=[transferInput,cashInput].find(i=>i && !i.disabled);
    if(firstPayment && !document.querySelector('input[name="paymentType"]:checked')) firstPayment.checked=true;

    document.querySelectorAll('[data-delivery-option]').forEach(card=>{
      const input=card.querySelector('input[name="deliveryType"]');
      card.classList.toggle('selected',Boolean(input?.checked && !input.disabled));
    });
    document.querySelectorAll('[data-payment-option]').forEach(card=>{
      const input=card.querySelector('input[name="paymentType"]');
      card.classList.toggle('selected',Boolean(input?.checked && !input.disabled));
    });

    const deliveryMessage=document.getElementById('deliveryAvailabilityMessage');
    if(deliveryMessage) deliveryMessage.hidden=Boolean(firstDelivery);
    const paymentMessage=document.getElementById('paymentAvailabilityMessage');
    if(paymentMessage) paymentMessage.hidden=Boolean(firstPayment);
    const shippingFields=document.getElementById('shippingFields');
    if(shippingFields){
      const selectedDelivery=document.querySelector('input[name="deliveryType"]:checked');
      shippingFields.classList.toggle('show',selectedDelivery?.value==='Envío');
    }
    window.dispatchEvent(new CustomEvent('rockstar:checkout-settings-applied',{detail:checkoutAvailability}));

    // ROCKSTAR V21.3 — Fondo normal o 360° interactivo desde Admin.
    const backgroundWrap=document.querySelector(".rockstar-global-bg");
    const backgroundFallback=document.querySelector(".rockstar-global-fallback");
    const backgroundVideo=document.getElementById("rockstarGlobalVideo");
    const viewer360=document.getElementById("rockstar360Viewer");
    const backgroundEnabled=data.background_enabled!==false;
    const backgroundUrl=String(data.background_url||"").trim();
    const backgroundType=String(data.background_type||"").trim().toLowerCase();
    const bundledPoster="assets/media/rockstar-poster.jpg";
    const backgroundBaseType=baseBackgroundType(backgroundType);
    const backgroundIsPanoraven=isPanoravenBackgroundType(backgroundType);
    const backgroundIs360=is360BackgroundType(backgroundType);

    window.ROCKSTAR_BACKGROUND_TYPE=backgroundType;
    window.ROCKSTAR_BACKGROUND_URL=backgroundUrl;

    if(window.ROCKSTAR_360_VIEWER){
      window.ROCKSTAR_360_VIEWER.destroy();
      window.ROCKSTAR_360_VIEWER=null;
    }
    if(viewer360){ viewer360.hidden=true; viewer360.innerHTML=""; }

    if(backgroundWrap && backgroundFallback){
      backgroundWrap.classList.toggle("is-360",Boolean(backgroundEnabled && backgroundUrl && backgroundIs360));

      if(!backgroundEnabled){
        backgroundWrap.style.setProperty("background","#05070a","important");
        backgroundFallback.style.setProperty("background","#05070a","important");
        if(backgroundVideo){
          backgroundVideo.pause();
          backgroundVideo.removeAttribute("src");
          const source=backgroundVideo.querySelector("source");
          if(source) source.removeAttribute("src");
          backgroundVideo.style.setProperty("display","none","important");
        }
      }else if(backgroundUrl && backgroundIsPanoraven && viewer360){
        backgroundFallback.style.setProperty("background","#05070a","important");
        if(backgroundVideo){
          backgroundVideo.pause();
          backgroundVideo.removeAttribute("src");
          backgroundVideo.style.setProperty("display","none","important");
        }
        const embedUrl=normalizePanoravenUrl(backgroundUrl);
        if(embedUrl){
          const iframe=document.createElement("iframe");
          iframe.className="rockstar-panoraven-frame";
          iframe.src=embedUrl;
          iframe.title="Fondo 360 interactivo";
          iframe.setAttribute("allowfullscreen","");
          iframe.setAttribute("allow","accelerometer; magnetometer; gyroscope; xr-spatial-tracking; fullscreen");
          iframe.setAttribute("referrerpolicy","strict-origin-when-cross-origin");
          viewer360.replaceChildren(iframe);
          viewer360.hidden=false;
        }
      }else if(backgroundUrl && backgroundIs360 && window.Rockstar360Viewer && viewer360){
        backgroundFallback.style.setProperty("background","#05070a","important");
        if(backgroundVideo){
          backgroundVideo.pause();
          backgroundVideo.removeAttribute("src");
          backgroundVideo.style.setProperty("display","none","important");
        }
        viewer360.hidden=false;
        window.ROCKSTAR_360_VIEWER=new window.Rockstar360Viewer(viewer360,{
          url:backgroundUrl,
          type:backgroundBaseType,
          muted:true,
          loop:true
        });
      }else if(backgroundUrl && backgroundBaseType==="video"){
        backgroundWrap.style.setProperty("background",`linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.27)),url("${bundledPoster}") center/contain no-repeat,#05070a`,"important");
        backgroundFallback.style.setProperty("background",`url("${bundledPoster}") center/contain no-repeat,#05070a`,"important");
        if(backgroundVideo){
          const source=backgroundVideo.querySelector("source");
          if(source){
            source.src=backgroundUrl;
            source.type=/\.webm(?:$|\?)/i.test(backgroundUrl) ? "video/webm" : "video/mp4";
          }else{
            backgroundVideo.src=backgroundUrl;
          }
          backgroundVideo.style.setProperty("display","block","important");
          backgroundVideo.style.setProperty("opacity","1","important");
          backgroundVideo.muted=true;
          backgroundVideo.loop=true;
          backgroundVideo.playsInline=true;
          backgroundVideo.load();
          backgroundVideo.play().catch(()=>{});
        }
      }else{
        const imageUrl=backgroundUrl||bundledPoster;
        backgroundWrap.style.setProperty("background",`linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.27)),url("${imageUrl}") center/contain no-repeat,#05070a`,"important");
        backgroundFallback.style.setProperty("background",`url("${imageUrl}") center/contain no-repeat,#05070a`,"important");
        if(backgroundVideo){
          backgroundVideo.pause();
          backgroundVideo.style.setProperty("display","none","important");
        }
      }
    }

    // ROCKSTAR V16.3 — Fuente de sonido configurable.
    const audio=document.getElementById("rockstarAudio");
    const soundButton=document.getElementById("rockstarSound");
    const musicEnabled=data.music_enabled!==false;
    const musicUrl=String(data.music_url||"").trim();
    const savedAudioMode=data.audio_mode==="video" ? "video" : "music";
    // Una música personalizada tiene prioridad para que nunca quede ignorada
    // por una selección anterior de "audio del video" en Administración.
    const audioMode=(musicEnabled && musicUrl) ? "music" : savedAudioMode;

    const extractYouTubeId=value=>{
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
    };
    const youtubeId=extractYouTubeId(musicUrl);

    window.ROCKSTAR_AUDIO_MODE=audioMode;

    if(audio && soundButton){
      if(!window.ROCKSTAR_BUNDLED_MUSIC_SRC){
        window.ROCKSTAR_BUNDLED_MUSIC_SRC=audio.getAttribute("src")||"assets/media/rockstar-music.mp3";
      }

      if(audioMode==="video"){
        audio.pause();
        soundButton.style.display="";

        const activeVideo=(backgroundIs360 && window.ROCKSTAR_360_VIEWER?.video) ? window.ROCKSTAR_360_VIEWER.video : backgroundVideo;
        if(activeVideo && backgroundEnabled && backgroundBaseType==="video" && backgroundUrl){
          activeVideo.muted=true;
          activeVideo.volume=0.55;
          soundButton.dataset.audioSource="video";
          soundButton._rockstarVideoSource=activeVideo;
          soundButton.setAttribute("aria-label","Activar sonido del video");
          const label=soundButton.querySelector("span");
          if(label) label.textContent="SONIDO";
        }else{
          soundButton.style.display="none";
        }
      }else{
        if(backgroundVideo) backgroundVideo.muted=true;
        if(window.ROCKSTAR_360_VIEWER?.video) window.ROCKSTAR_360_VIEWER.video.muted=true;
        soundButton._rockstarVideoSource=null;
        soundButton.dataset.audioSource="music";

        if(!musicEnabled){
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
          soundButton.style.display="none";
        }else if(youtubeId){
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
          soundButton._rockstarVideoSource=null;
          soundButton.dataset.audioSource="youtube";
          soundButton.dataset.youtubeId=youtubeId;
          document.dispatchEvent(new CustomEvent("rockstar:youtube-source",{detail:{id:youtubeId}}));
          soundButton.style.display="";
          soundButton.setAttribute("aria-label","Activar música de YouTube");
          const label=soundButton.querySelector("span");
          if(label) label.textContent="MÚSICA";
        }else{
          delete soundButton.dataset.youtubeId;
          const desired=musicUrl||window.ROCKSTAR_BUNDLED_MUSIC_SRC;
          if(audio.getAttribute("src")!==desired){
            const wasPlaying=!audio.paused;
            audio.pause();
            audio.src=desired;
            audio.load();
            if(wasPlaying) audio.play().catch(()=>{});
          }
          soundButton.style.display="";
          soundButton.setAttribute("aria-label","Activar música");
          const label=soundButton.querySelector("span");
          if(label) label.textContent="MÚSICA";
        }
      }
    }

    const socialMap = {
      instagram: normalizeSocialUrl("instagram", data.instagram),
      facebook: normalizeSocialUrl("facebook", data.facebook),
      tiktok: normalizeSocialUrl("tiktok", data.tiktok),
      youtube: normalizeSocialUrl("youtube", data.youtube)
    };

    Object.entries(socialMap).forEach(([key,url])=>{
      document.querySelectorAll(`[data-social="${key}"]`).forEach(a=>{
        if(url && String(url).trim()){
          a.href = String(url).trim();
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.style.display = "";
        }else{
          a.style.display = "none";
        }
      });
    });

    function socialLabel(key, url){
      try{
        const u = new URL(url);
        const part = u.pathname.split("/").filter(Boolean).pop() || "";
        if(key === "youtube") return "Canal oficial ↗";
        return part ? `${part.startsWith("@") ? "" : "@"}${part} ↗` : `${key} ↗`;
      }catch(_){ return `${key} ↗`; }
    }

    Object.entries(socialMap).forEach(([key,url])=>{
      if(url && String(url).trim()){
        setText(`[data-social-label="${key}"]`, socialLabel(key, String(url).trim()));
      }
    });

    const phone = String(data.whatsapp || "").replace(/[^\d]/g, "");
    document.querySelectorAll("[data-contact-whatsapp]").forEach(a=>{
      if(phone){
        a.href = `https://wa.me/${phone}`;
        a.textContent = `WhatsApp: +${phone}`;
        a.style.display = "";
      }else a.style.display = "none";
    });

    const email = String(data.email || "").trim();
    document.querySelectorAll("[data-contact-email]").forEach(a=>{
      if(email){
        a.href = `mailto:${email}`;
        a.textContent = email;
        a.style.display = "";
      }else a.style.display = "none";
    });

    window.dispatchEvent(new CustomEvent("river:store-settings-loaded", {detail:data}));
  }

  async function loadStoreSettings(){
    const {data,error} = await db
      .from("store_settings")
      .select("*")
      .eq("id",1)
      .maybeSingle();

    if(error){
      console.error("No se pudieron leer los datos de la tienda:", error);
      return;
    }
    applySettings(data);
  }

  window.RIVER_APPLY_STORE_SETTINGS = applySettings;
  loadStoreSettings();
})();
