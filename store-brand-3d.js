(function(){
  'use strict';

  // V22.4.25 — reconexión real del header sin reinicios
  // y aplica EXACTAMENTE el mismo render a las dos imágenes del header.
  // No cambia tamaños ni layout: usa el tamaño real que ya tenían en V22.4.2.

  const states=new Map();
  let applyTimer=0;

  function level3D(v){ return ['off','soft','strong'].includes(v)?v:'off'; }

  function stopKey(key){
    if(!key)return;
    const state=states.get(key);
    if(state?.raf) cancelAnimationFrame(state.raf);
    if(state?.canvas) state.canvas.remove();
    states.delete(key);
    if(key instanceof HTMLImageElement) key.classList.remove('rockstar-store-3d-source-hidden');
  }

  function stopStage(stage){
    if(!stage)return;
    const key=stage.__rockstar3DKey || stage;
    stopKey(key);
    stage.classList.remove('rockstar-store-3d-active');
  }

  function tintCanvas(img,color){
    const c=document.createElement('canvas');
    const w=img.naturalWidth||600,h=img.naturalHeight||200;
    c.width=w;c.height=h;
    const x=c.getContext('2d');
    x.drawImage(img,0,0,w,h);
    x.globalCompositeOperation='source-in';
    x.fillStyle=color;
    x.fillRect(0,0,w,h);
    x.globalCompositeOperation='source-over';
    return c;
  }

  // MISMO motor usado por el ROCKSTAR inferior aprobado.
  function draw3D(canvas,img,cssW,cssH,level,glow,onFrame){
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const pad=Math.round(Math.max(cssW,cssH)*.28);
    const totalW=cssW+pad*2,totalH=cssH+pad*2;
    canvas.width=Math.round(totalW*dpr);
    canvas.height=Math.round(totalH*dpr);
    canvas.style.width=totalW+'px';
    canvas.style.height=totalH+'px';

    const ctx=canvas.getContext('2d');
    ctx.scale(dpr,dpr);
    const cx=totalW/2,cy=totalH/2;
    const tint=tintCanvas(img,'#5a3b1b');
    const duration=level==='soft'?14000:8000;
    const depth=level==='soft'?14:20;
    const layers=level==='soft'?10:14;
    const started=performance.now();
    const state={raf:0,canvas};

    function frame(now){
      if(onFrame && onFrame(state)===false)return;
      ctx.clearRect(0,0,totalW,totalH);
      const a=((now-started)%duration)/duration*Math.PI*2;
      const c=Math.cos(a),sn=Math.sin(a);
      const faceW=Math.max(1,Math.abs(c)*cssW);

      for(let i=layers;i>=1;i--){
        const z=(i/layers)*depth;
        const off=sn*z;
        const alpha=.16+.34*(i/layers);
        ctx.save();
        ctx.globalAlpha=alpha;
        ctx.translate(cx+off,cy);
        ctx.drawImage(tint,-faceW/2,-cssH/2,faceW,cssH);
        ctx.restore();
      }

      ctx.save();
      ctx.translate(cx,cy);
      ctx.globalAlpha=1;
      ctx.drawImage(img,-faceW/2,-cssH/2,faceW,cssH);
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation='destination-over';
      ctx.shadowColor=glow||'#e5bd70';
      ctx.shadowBlur=Math.max(12,Math.min(26,cssW*.08));
      ctx.fillStyle='rgba(0,0,0,0.001)';
      ctx.fillRect(cx-cssW*.28,cy-cssH*.28,cssW*.56,cssH*.56);
      ctx.restore();

      state.raf=requestAnimationFrame(frame);
    }
    state.raf=requestAnimationFrame(frame);
    return state;
  }

  // Secciones públicas de la tienda: NO SE CAMBIÓ su comportamiento.
  function startStage(stage,img,level,glow){
    stopStage(stage);
    level=level3D(level);
    if(level==='off'||!stage||!img||img.hidden||!img.src)return;
    const launch=()=>{
      if(!img.naturalWidth||!img.naturalHeight||img.hidden)return;
      const rect=img.getBoundingClientRect();
      if(rect.width<2||rect.height<2)return;

      const canvas=document.createElement('canvas');
      canvas.className='rockstar-store-3d-canvas';
      stage.appendChild(canvas);
      stage.classList.add('rockstar-store-3d-active');
      img.style.visibility='hidden';
      stage.__rockstar3DKey=stage;

      const state=draw3D(canvas,img,Math.max(30,rect.width),Math.max(18,rect.height),level,glow,s=>states.get(stage)===s);
      states.set(stage,state);
    };
    if(img.complete) requestAnimationFrame(()=>requestAnimationFrame(launch));
    else img.addEventListener('load',()=>requestAnimationFrame(()=>requestAnimationFrame(launch)),{once:true});
  }


  // V22.4.25 — controlador estable del HEADER.
  // Usa EXACTAMENTE draw3D(), el mismo render usado por el ROCKSTAR inferior.
  // La diferencia es solo el posicionamiento, porque corona y ROCKSTAR son
  // dos imágenes independientes dentro del mismo .brand.

  function headerBox(img){
    const w=img.offsetWidth || img.getBoundingClientRect().width || 0;
    const h=img.offsetHeight || img.getBoundingClientRect().height || 0;
    return {w:Math.max(1,w),h:Math.max(1,h)};
  }

  function headerStateValid(img){
    const st=states.get(img);
    if(!st || !st.canvas || !st.canvas.isConnected)return false;
    const box=headerBox(img);
    return st.src===img.currentSrc &&
      Math.abs((st.cssW||0)-box.w)<1 &&
      Math.abs((st.cssH||0)-box.h)<1;
  }

  function stopHeader(img){
    if(!img)return;
    stopKey(img);
    img.style.removeProperty('opacity');
    img.style.removeProperty('pointer-events');
  }

  function startHeader(img,level,glow){
    level=level3D(level);
    if(level==='off'||!img||img.hidden||!img.src||getComputedStyle(img).display==='none'){
      stopHeader(img);
      return;
    }

    if(headerStateValid(img)) return; // NO reiniciar si ya está girando bien.

    stopHeader(img);

    const launch=()=>{
      if(!img.isConnected || !img.naturalWidth || !img.naturalHeight ||
         img.hidden || getComputedStyle(img).display==='none') return;

      const stage=img.closest('header.site-header .brand');
      if(!stage)return;

      const {w:cssW,h:cssH}=headerBox(img);
      if(cssW<2||cssH<2)return;

      // Posición exacta de la imagen dentro del brand, sin tocar el layout.
      const stageRect=stage.getBoundingClientRect();
      const imgRect=img.getBoundingClientRect();
      const left=(imgRect.left-stageRect.left)+(imgRect.width/2);
      const top=(imgRect.top-stageRect.top)+(imgRect.height/2);

      const canvas=document.createElement('canvas');
      canvas.className='rockstar-header-3d-canvas';
      canvas.dataset.headerTarget=img.hasAttribute('data-store-logo')?'store-logo':'brand-image';
      canvas.style.left=left+'px';
      canvas.style.top=top+'px';
      stage.appendChild(canvas);

      // La imagen conserva su espacio; solo se hace invisible visualmente.
      // No usamos hidden/display/visibility para no alterar dimensiones.
      img.style.setProperty('opacity','0','important');
      img.style.setProperty('pointer-events','none','important');

      const state=draw3D(
        canvas,img,cssW,cssH,level,glow,
        s=>states.get(img)===s
      );
      state.src=img.currentSrc;
      state.cssW=cssW;
      state.cssH=cssH;
      states.set(img,state);
    };

    if(img.complete && img.naturalWidth){
      requestAnimationFrame(()=>requestAnimationFrame(launch));
    }else{
      img.addEventListener('load',()=>requestAnimationFrame(()=>requestAnimationFrame(launch)),{once:true});
    }
  }

  function applyHeader3D(){
    const cfg=window.ROCKSTAR_ENTRY_CONFIG||{};
    const glow=cfg.glowColor||'#e5bd70';
    const level='strong';

    document.querySelectorAll(
      'header.site-header [data-store-logo], header.site-header [data-header-brand-image]'
    ).forEach(img=>startHeader(img,level,glow));

    document.documentElement.dataset.rockstarHeader3dCanvases=
      String(document.querySelectorAll('header.site-header canvas.rockstar-header-3d-canvas').length);
  }

  function apply(){
    const cfg=window.ROCKSTAR_ENTRY_CONFIG||{};
    const publicLevel=level3D(cfg.brand3DLevel||'off');
    const glow=cfg.glowColor||'#e5bd70';

    document.querySelectorAll('[data-public-brand-slot]').forEach(stage=>{
      const img=stage.querySelector('[data-public-brand-image]');
      if(img && !img.hidden && img.src) startStage(stage,img,publicLevel,glow); else stopStage(stage);
    });
    applyHeader3D();
  }

  function scheduleApply(delay=120){
    clearTimeout(applyTimer);
    applyTimer=setTimeout(apply,delay);
  }

  // Admin cambia primero la URL original y después la reemplaza por la versión
  // transparente. Escuchamos ambos cambios para que el canvas no se quede con
  // una imagen anterior o con dimensiones incompletas.

  function watchHeaderSources(){
    const header=document.querySelector('header.site-header');
    if(!header)return;

    // Eventos rápidos para cambios reales de Admin/Supabase.
    const observer=new MutationObserver(mutations=>{
      const changed=mutations.some(m=>
        m.type==='attributes' &&
        m.target instanceof HTMLImageElement &&
        m.target.matches('[data-store-logo],[data-header-brand-image]') &&
        ['src','hidden','style'].includes(m.attributeName)
      );
      if(changed) setTimeout(applyHeader3D,80);
    });
    observer.observe(header,{subtree:true,attributes:true,attributeFilter:['src','hidden','style']});

    header.querySelectorAll('[data-store-logo],[data-header-brand-image]').forEach(img=>{
      img.addEventListener('load',()=>setTimeout(applyHeader3D,60));
    });

    // Verificación de salud: SOLO crea/repara si falta el canvas o cambió fuente/tamaño.
    // No reinicia canvases que ya están girando.
    setInterval(applyHeader3D,1200);
  }

  window.addEventListener('river:store-settings-loaded',()=>scheduleApply(180));
  window.addEventListener('resize',()=>scheduleApply(220));
  document.addEventListener('DOMContentLoaded',()=>{
    watchHeaderSources();
    scheduleApply(450);
  });
})();
