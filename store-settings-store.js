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

    const storeName = (data.store_name || "RIVER Store").trim();
    const ownerName = (data.owner_name || storeName).trim();
    const tagline = (data.tagline || "").trim();
    const city = (data.city || "").trim();
    const address = (data.address || "").trim();

    document.title = `${storeName} | Tienda Oficial`;

    setText("[data-store-name]", storeName);
    setText("[data-store-owner]", ownerName);
    if(tagline) setText("[data-store-tagline]", tagline);
    setText("[data-store-footer]", data.footer_text || `${storeName} · Tienda oficial`);

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

    document.querySelectorAll("[data-store-cover]").forEach(el=>{
      if(data.cover_url){
        if(el.tagName === "IMG") el.src = data.cover_url;
        else el.style.backgroundImage = `url("${data.cover_url}")`;
        el.classList.add("has-custom-cover");
      }
    });

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