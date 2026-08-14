/* ROCKSTAR V17.2 — Visor fijo de producto con zoom real */
(() => {
  let gallery = [];
  let currentIndex = 0;
  let scale = 1;
  let translateX = 0;
  let translateY = 0;
  let dragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;

  const MIN_SCALE = 1;
  const MAX_SCALE = 4;
  const SCALE_STEP = 0.5;

  const unique = arr => [...new Set((arr || []).filter(Boolean))];

  function viewer() {
    let el = document.getElementById("rockstarProductViewerV172");
    if (el) return el;

    el = document.createElement("div");
    el.id = "rockstarProductViewerV172";
    el.className = "rockstar-product-viewer-v172";
    el.setAttribute("aria-hidden", "true");
    el.innerHTML = `
      <div class="rpv172-backdrop"></div>
      <div class="rpv172-dialog" role="dialog" aria-modal="true" aria-label="Vista ampliada del producto">
        <div class="rpv172-toolbar">
          <div class="rpv172-counter"></div>
          <div class="rpv172-tools">
            <button type="button" class="rpv172-tool rpv172-zoom-out" aria-label="Alejar">−</button>
            <span class="rpv172-scale">100%</span>
            <button type="button" class="rpv172-tool rpv172-zoom-in" aria-label="Acercar">+</button>
            <button type="button" class="rpv172-tool rpv172-reset" aria-label="Restablecer zoom">↺</button>
            <button type="button" class="rpv172-close" aria-label="Cerrar">×</button>
          </div>
        </div>

        <div class="rpv172-canvas">
          <button type="button" class="rpv172-nav rpv172-prev" aria-label="Foto anterior">‹</button>
          <div class="rpv172-image-area">
            <img class="rpv172-image" alt="Foto ampliada del producto" draggable="false">
          </div>
          <button type="button" class="rpv172-nav rpv172-next" aria-label="Foto siguiente">›</button>
        </div>

        <div class="rpv172-help">Usa +/− o la rueda para acercar. Cuando esté ampliada, arrastra la foto para revisar detalles.</div>
      </div>`;
    // V17.4: se monta directamente bajo <html>, fuera del flujo del body.
    // Esto impide que reglas antiguas del body cambien position:fixed a relative.
    document.documentElement.appendChild(el);

    el.querySelector(".rpv172-backdrop").addEventListener("click", closeViewer);
    el.querySelector(".rpv172-close").addEventListener("click", closeViewer);
    el.querySelector(".rpv172-prev").addEventListener("click", () => showImage(currentIndex - 1));
    el.querySelector(".rpv172-next").addEventListener("click", () => showImage(currentIndex + 1));
    el.querySelector(".rpv172-zoom-in").addEventListener("click", () => setScale(scale + SCALE_STEP));
    el.querySelector(".rpv172-zoom-out").addEventListener("click", () => setScale(scale - SCALE_STEP));
    el.querySelector(".rpv172-reset").addEventListener("click", resetTransform);

    const area = el.querySelector(".rpv172-image-area");

    area.addEventListener("wheel", e => {
      if (!el.classList.contains("is-open")) return;
      e.preventDefault();
      setScale(scale + (e.deltaY < 0 ? SCALE_STEP : -SCALE_STEP));
    }, { passive: false });

    area.addEventListener("dblclick", e => {
      e.preventDefault();
      if (scale > 1) resetTransform();
      else setScale(2);
    });

    area.addEventListener("pointerdown", e => {
      if (scale <= 1) return;
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      startTranslateX = translateX;
      startTranslateY = translateY;
      area.setPointerCapture?.(e.pointerId);
      area.classList.add("is-dragging");
    });

    area.addEventListener("pointermove", e => {
      if (!dragging || scale <= 1) return;
      translateX = startTranslateX + (e.clientX - dragStartX);
      translateY = startTranslateY + (e.clientY - dragStartY);
      applyTransform();
    });

    const stopDrag = e => {
      if (!dragging) return;
      dragging = false;
      area.releasePointerCapture?.(e.pointerId);
      area.classList.remove("is-dragging");
    };
    area.addEventListener("pointerup", stopDrag);
    area.addEventListener("pointercancel", stopDrag);

    return el;
  }

  function resetTransform() {
    scale = 1;
    translateX = 0;
    translateY = 0;
    applyTransform();
  }

  function setScale(next) {
    scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(next.toFixed(2))));
    if (scale === 1) {
      translateX = 0;
      translateY = 0;
    }
    applyTransform();
  }

  function applyTransform() {
    const el = viewer();
    const img = el.querySelector(".rpv172-image");
    const pct = el.querySelector(".rpv172-scale");
    img.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
    img.classList.toggle("is-zoomed", scale > 1);
    pct.textContent = `${Math.round(scale * 100)}%`;
  }

  function showImage(index) {
    if (!gallery.length) return;
    currentIndex = (index + gallery.length) % gallery.length;

    const el = viewer();
    const img = el.querySelector(".rpv172-image");
    resetTransform();
    img.src = gallery[currentIndex];

    const counter = el.querySelector(".rpv172-counter");
    counter.textContent = gallery.length > 1 ? `${currentIndex + 1} de ${gallery.length}` : "Foto del producto";

    const showNav = gallery.length > 1;
    el.querySelector(".rpv172-prev").hidden = !showNav;
    el.querySelector(".rpv172-next").hidden = !showNav;
  }

  let savedScrollY = 0;

  function openViewer(urls, startIndex = 0) {
    gallery = unique(urls);
    if (!gallery.length) return;

    savedScrollY = window.scrollY || window.pageYOffset || 0;

    const el = viewer();
    el.classList.add("is-open");
    el.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("rpv172-lock");
    document.body.classList.add("rpv172-lock");

    // Mantener exactamente la posición donde el usuario abrió el producto.
    document.body.style.setProperty("--rpv172-scroll-y", `${savedScrollY}px`);
    showImage(startIndex);
  }

  function closeViewer() {
    const el = document.getElementById("rockstarProductViewerV172");
    if (!el) return;
    el.classList.remove("is-open");
    el.setAttribute("aria-hidden", "true");
    document.documentElement.classList.remove("rpv172-lock");
    document.body.classList.remove("rpv172-lock");
    resetTransform();

    // No saltar al inicio/final al cerrar.
    requestAnimationFrame(() => {
      window.scrollTo({ top: savedScrollY, left: 0, behavior: "auto" });
    });
  }

  function getCardImages(card, clickedImg) {
    const urls = [];
    if (card) {
      card.querySelectorAll("img").forEach(img => {
        const src = img.currentSrc || img.src || img.getAttribute("src");
        if (src && !src.startsWith("data:image/svg")) urls.push(src);
      });
    }

    // Some products keep photo URLs in data attributes
    if (card) {
      ["data-images", "data-photos", "data-gallery"].forEach(attr => {
        const raw = card.getAttribute(attr);
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) parsed.forEach(x => {
            if (typeof x === "string") urls.push(x);
            else if (x?.url) urls.push(x.url);
          });
        } catch (_) {}
      });
    }

    const list = unique(urls);
    const clicked = clickedImg?.currentSrc || clickedImg?.src || clickedImg?.getAttribute("src");
    return {
      list,
      index: Math.max(0, list.indexOf(clicked))
    };
  }

  document.addEventListener("click", e => {
    const img = e.target.closest(
      ".store-product-card .store-product-main-media img, " +
      ".store-product-card .store-product-media img, " +
      ".store-product-card img.store-product-card-main-image, " +
      ".product-card img"
    );
    if (!img) return;
    if (img.closest("#rockstarProductViewerV172")) return;

    const card = img.closest(".store-product-card, .product-card, article");
    const { list, index } = getCardImages(card, img);
    if (!list.length) return;

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation?.();
    openViewer(list, index);
  }, true);

  document.addEventListener("keydown", e => {
    const el = document.getElementById("rockstarProductViewerV172");
    if (!el?.classList.contains("is-open")) return;
    if (e.key === "Escape") closeViewer();
    if (e.key === "ArrowLeft") showImage(currentIndex - 1);
    if (e.key === "ArrowRight") showImage(currentIndex + 1);
    if (e.key === "+" || e.key === "=") setScale(scale + SCALE_STEP);
    if (e.key === "-") setScale(scale - SCALE_STEP);
    if (e.key === "0") resetTransform();
  });

  /* ROCKSTAR V17.3 — puente para VER PRODUCTO */
  window.ROCKSTAR_OPEN_MEDIA_VIEWER = function(media, selectedIndex = 0){
    const all = Array.isArray(media) ? media : [];

    // El visor detallado actual es para fotografías.
    const imageItems = all
      .map((item, originalIndex) => ({
        item,
        originalIndex
      }))
      .filter(entry => entry.item && entry.item.type !== "video" && entry.item.src);

    if(!imageItems.length) return;

    let imageStart = imageItems.findIndex(entry => entry.originalIndex === Number(selectedIndex));
    if(imageStart < 0) imageStart = 0;

    openViewer(
      imageItems.map(entry => entry.item.src),
      imageStart
    );
  };

})();
