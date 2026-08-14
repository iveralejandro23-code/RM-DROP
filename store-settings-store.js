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


  function applySettings(data){
    if(!data) return;
    window.RIVER_STORE_SETTINGS = data;

    // ROCKSTAR V13.1:
    // La identidad pública ya no se toma del branding antiguo guardado en Supabase.
    // Así evitamos que "Julián Reynoso Store" vuelva a aparecer después de cargar.
    const storeName = "ROCKSTAR";
    const ownerName = "ROCKSTAR";
    const tagline = "HEADWEAR · STREETWEAR · ATTITUDE";
    const city = (data.city || "").trim();
    const address = (data.address || "").trim();

    document.title = "ROCKSTAR | Tienda";

    setText("[data-store-name]", storeName);
    setText("[data-store-owner]", ownerName);
    setText("[data-store-tagline]", tagline);
    setText("[data-store-footer]", data.footer_text || "ROCKSTAR · Headwear · Streetwear");

    const locationBits = [city, address].filter(Boolean);
    if(locationBits.length){
      setText("[data-store-location]", locationBits.join(" · "));
    }

    document.querySelectorAll("[data-store-logo]").forEach(img=>{
      if(data.logo_url){
        img.src = data.logo_url;
        img.style.display = "block";
        img.alt = `Logo de ${storeName}`;
      }else{
        img.removeAttribute("src");
        img.style.display = "none";
      }
    });

    // ROCKSTAR V16.2 — Fondo configurable desde Admin.
    const backgroundWrap=document.querySelector(".rockstar-global-bg");
    const backgroundFallback=document.querySelector(".rockstar-global-fallback");
    const backgroundVideo=document.getElementById("rockstarGlobalVideo");

    const bundledPoster="assets/media/rockstar-poster.jpg";
    const backgroundEnabled=data.background_enabled!==false;
    const backgroundUrl=String(data.background_url||"").trim();
    const backgroundType=String(data.background_type||"").trim().toLowerCase();

    if(backgroundWrap && backgroundFallback){
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
      }else if(backgroundUrl && backgroundType==="video"){
        backgroundWrap.style.setProperty("background",`linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.27)),url("${bundledPoster}") center/cover no-repeat`,"important");
        backgroundFallback.style.setProperty("background",`url("${bundledPoster}") center/cover no-repeat`,"important");
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
        backgroundWrap.style.setProperty("background",`linear-gradient(180deg,rgba(0,0,0,.10),rgba(0,0,0,.27)),url("${imageUrl}") center/cover no-repeat`,"important");
        backgroundFallback.style.setProperty("background",`url("${imageUrl}") center/cover no-repeat`,"important");
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
    const audioMode=data.audio_mode==="video" ? "video" : "music";

    window.ROCKSTAR_AUDIO_MODE=audioMode;

    if(audio && soundButton){
      if(!window.ROCKSTAR_BUNDLED_MUSIC_SRC){
        window.ROCKSTAR_BUNDLED_MUSIC_SRC=audio.getAttribute("src")||"assets/media/rockstar-music.mp3";
      }

      if(audioMode==="video"){
        audio.pause();
        soundButton.style.display="";

        if(backgroundVideo && backgroundEnabled && backgroundType==="video" && backgroundUrl){
          backgroundVideo.muted=true;
          backgroundVideo.volume=0.55;
          soundButton.dataset.audioSource="video";
          soundButton.setAttribute("aria-label","Activar sonido del video");
          const label=soundButton.querySelector("span");
          if(label) label.textContent="SONIDO";
        }else{
          soundButton.style.display="none";
        }
      }else{
        if(backgroundVideo){
          backgroundVideo.muted=true;
        }
        soundButton.dataset.audioSource="music";

        if(!musicEnabled){
          audio.pause();
          audio.removeAttribute("src");
          audio.load();
          soundButton.style.display="none";
        }else{
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