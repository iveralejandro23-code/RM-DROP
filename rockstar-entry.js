(function(){
  const entry=document.getElementById('rockstarEntry');
  if(!entry)return;

  const imageButton=document.getElementById('rockstarEntryProductButton');
  const image=document.getElementById('rockstarEntryProductImage');
  const brandTextEl=document.getElementById('rockstarEntryBrandText');
  const brandImageEl=document.getElementById('rockstarEntryBrandImage');
  const captionImageEl=document.getElementById('rockstarEntryCaptionImage');
  const captionContainer=document.getElementById('rockstarEntryCaption');
const DEFAULT_BG='assets/media/entry-default-bg.jpeg';

  document.body.classList.add('rockstar-entry-open');

  function getConfig(){
    return window.ROCKSTAR_ENTRY_CONFIG || {
      brandMode:'text',
      brandText:'ROCKSTAR',
      brandImageUrl:'',
      glowColor:'#e5bd70',
      productGlowColor:'#e5bd70',
      captionGlowColor:'#ff2028',
      brand3DLevel:'off',
      product3DLevel:'off',
      caption3DLevel:'off',
      entryCaptionImageUrl:'',
      entryBackgroundUrl:'',
      entryProductImageUrl:''
    };
  }

  async function makeBrandBackgroundTransparent(img,url){
    if(!img || !url)return false;
    if(img.dataset.processedSource===url && img.dataset.transparentBrand==='1')return true;
    img.dataset.processedSource=url;
    try{
      const response=await fetch(url,{mode:'cors',cache:'no-store'});
      if(!response.ok)throw new Error('No se pudo leer la imagen de marca');
      const blob=await response.blob();
      const bitmap=await createImageBitmap(blob);
      const canvas=document.createElement('canvas');
      canvas.width=bitmap.width;
      canvas.height=bitmap.height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(bitmap,0,0);
      const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
      const d=frame.data,w=canvas.width,h=canvas.height;
      const seen=new Uint8Array(w*h),stack=[];

      const isBg=(x,y)=>{
        const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2];
        const mx=Math.max(r,g,b),mn=Math.min(r,g,b),lum=(r+g+b)/3;
        const neutral=(mx-mn)<=34;
        return neutral && (lum<=78 || lum>=215);
      };
      const push=(x,y)=>{
        const k=y*w+x;
        if(!seen[k] && isBg(x,y)){seen[k]=1;stack.push(k);}
      };
      for(let x=0;x<w;x++){push(x,0);push(x,h-1);}
      for(let y=0;y<h;y++){push(0,y);push(w-1,y);}
      while(stack.length){
        const k=stack.pop(),x=k%w,y=(k/w)|0,i=k*4;
        d[i+3]=0;
        if(x>0)push(x-1,y);
        if(x+1<w)push(x+1,y);
        if(y>0)push(x,y-1);
        if(y+1<h)push(x,y+1);
      }
      ctx.putImageData(frame,0,0);

      let minX=w,minY=h,maxX=-1,maxY=-1;
      for(let y=0;y<h;y++){
        for(let x=0;x<w;x++){
          if(d[(y*w+x)*4+3]>18){
            if(x<minX)minX=x;if(x>maxX)maxX=x;
            if(y<minY)minY=y;if(y>maxY)maxY=y;
          }
        }
      }
      let output=canvas;
      if(maxX>=minX && maxY>=minY){
        const pad=Math.max(4,Math.round(Math.min(w,h)*0.018));
        const sx=Math.max(0,minX-pad),sy=Math.max(0,minY-pad);
        const sw=Math.min(w-sx,(maxX-minX+1)+pad*2);
        const sh=Math.min(h-sy,(maxY-minY+1)+pad*2);
        const cropped=document.createElement('canvas');
        cropped.width=sw;cropped.height=sh;
        cropped.getContext('2d').drawImage(canvas,sx,sy,sw,sh,0,0,sw,sh);
        output=cropped;
      }

      const processed=output.toDataURL('image/png');
      await new Promise(resolve=>{
        let doneCalled=false;
        const done=()=>{if(doneCalled)return;doneCalled=true;resolve();};
        img.addEventListener('load',done,{once:true});
        img.addEventListener('error',done,{once:true});
        img.src=processed;
        if(img.complete)setTimeout(done,0);
      });
      img.dataset.transparentBrand='1';
      bitmap.close?.();
      return true;
    }catch(_){
      img.dataset.transparentBrand='fallback';
      return false;
    }
  }


  async function makeProductBackgroundTransparent(img,url){
    if(!img || !url)return;
    if(img.dataset.processedProductSource===url)return;
    img.dataset.processedProductSource=url;
    try{
      const response=await fetch(url,{mode:'cors',cache:'force-cache'});
      if(!response.ok)throw new Error('No se pudo leer la imagen del producto');
      const blob=await response.blob();
      const bitmap=await createImageBitmap(blob);
      const canvas=document.createElement('canvas');
      canvas.width=bitmap.width;
      canvas.height=bitmap.height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(bitmap,0,0);
      const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
      const d=frame.data,w=canvas.width,h=canvas.height;
      const seen=new Uint8Array(w*h);
      const stack=[];
      const isBg=(x,y)=>{
        const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b);
        return ((r+g+b)/3>=205 && mx-mn<=48) || (r>=235&&g>=235&&b>=235);
      };
      const push=(x,y)=>{const k=y*w+x;if(!seen[k]&&isBg(x,y)){seen[k]=1;stack.push(k);}};
      for(let x=0;x<w;x++){push(x,0);push(x,h-1)}
      for(let y=0;y<h;y++){push(0,y);push(w-1,y)}
      while(stack.length){
        const k=stack.pop(),x=k%w,y=(k/w)|0,i=k*4;
        d[i+3]=0;
        if(x>0)push(x-1,y);if(x+1<w)push(x+1,y);if(y>0)push(x,y-1);if(y+1<h)push(x,y+1);
      }
      ctx.putImageData(frame,0,0);
      img.src=canvas.toDataURL('image/png');
      img.dataset.transparentProduct='1';
      bitmap.close?.();
    }catch(_){
      img.dataset.transparentProduct='fallback';
    }
  }


  async function makeCaptionBackgroundTransparent(img,url){
    if(!img || !url)return;
    if(img.dataset.processedCaptionSource===url)return;
    img.dataset.processedCaptionSource=url;
    try{
      const response=await fetch(url,{mode:'cors',cache:'force-cache'});
      if(!response.ok)throw new Error('No se pudo leer la imagen de la frase');
      const blob=await response.blob();
      const bitmap=await createImageBitmap(blob);
      const canvas=document.createElement('canvas');
      canvas.width=bitmap.width;
      canvas.height=bitmap.height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(bitmap,0,0);
      const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
      const d=frame.data,w=canvas.width,h=canvas.height;
      const seen=new Uint8Array(w*h);
      const stack=[];
      const isBg=(x,y)=>{
        const i=(y*w+x)*4,r=d[i],g=d[i+1],b=d[i+2];
        const mx=Math.max(r,g,b),mn=Math.min(r,g,b),lum=(r+g+b)/3;
        const neutral=(mx-mn)<=55;
        return neutral && (lum<=70 || lum>=190);
      };
      const push=(x,y)=>{const k=y*w+x;if(!seen[k]&&isBg(x,y)){seen[k]=1;stack.push(k);}};
      for(let x=0;x<w;x++){push(x,0);push(x,h-1)}
      for(let y=0;y<h;y++){push(0,y);push(w-1,y)}
      while(stack.length){
        const k=stack.pop(),x=k%w,y=(k/w)|0,i=k*4;
        d[i+3]=0;
        if(x>0)push(x-1,y);if(x+1<w)push(x+1,y);if(y>0)push(x,y-1);if(y+1<h)push(x,y+1);
      }
      ctx.putImageData(frame,0,0);

      // Recorta el lienzo al contenido visible para que una imagen con
      // márgenes internos no se vea desfasada aunque el elemento esté centrado.
      // Dejamos un pequeño margen para conservar el resplandor.
      let minX=w, minY=h, maxX=-1, maxY=-1;
      for(let y=0;y<h;y++){
        for(let x=0;x<w;x++){
          const a=d[(y*w+x)*4+3];
          if(a>18){
            if(x<minX)minX=x; if(x>maxX)maxX=x;
            if(y<minY)minY=y; if(y>maxY)maxY=y;
          }
        }
      }
      let output=canvas;
      if(maxX>=minX && maxY>=minY){
        const pad=Math.max(6,Math.round(Math.min(w,h)*0.025));
        const sx=Math.max(0,minX-pad), sy=Math.max(0,minY-pad);
        const sw=Math.min(w-sx,(maxX-minX+1)+(pad*2));
        const sh=Math.min(h-sy,(maxY-minY+1)+(pad*2));
        const cropped=document.createElement('canvas');
        cropped.width=sw; cropped.height=sh;
        cropped.getContext('2d').drawImage(canvas,sx,sy,sw,sh,0,0,sw,sh);
        output=cropped;
      }
      const processed=output.toDataURL('image/png');
      await new Promise(resolve=>{
        let doneCalled=false;
        const done=()=>{if(doneCalled)return;doneCalled=true;resolve();};
        img.addEventListener('load',done,{once:true});
        img.addEventListener('error',done,{once:true});
        img.src=processed;
        if(img.complete)setTimeout(done,0);
      });
      img.dataset.transparentCaption='1';
      bitmap.close?.();
      return true;
    }catch(_){
      img.dataset.transparentCaption='fallback';
      return false;
    }
  }


  // ===== V22.4: motor limpio. No crea copias DOM de las imágenes. =====
  const spinState=new Map();
function level3D(v){return ['off','soft','strong'].includes(v)?v:'off';}

  function stopCanvas3D(stage){
    if(!stage)return;
    const state=spinState.get(stage);
    if(state?.raf)cancelAnimationFrame(state.raf);
    spinState.delete(stage);
    stage.querySelector(':scope > .rockstar-3d-canvas')?.remove();
    stage.classList.remove('rockstar-canvas-3d-active');
  }

  function makeTintCanvas(img,color){
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

  function startCanvas3D(stage,img,level,glowColor,frontLocked=false){
    level=level3D(level);
    if(level==='off'||!stage||!img||!img.src){stopCanvas3D(stage);return;}
    const sourceKey=img.currentSrc||img.src;
    const current=spinState.get(stage);
    if(current && current.sourceKey===sourceKey && current.level===level && current.frontLocked===frontLocked)return;
    stopCanvas3D(stage);
    const launch=()=>{
      if(!img.naturalWidth||!img.naturalHeight)return;
      const rect=img.getBoundingClientRect();
      if(rect.width<2||rect.height<2)return;
      const canvas=document.createElement('canvas');
      canvas.className='rockstar-3d-canvas';
      const dpr=Math.min(2,window.devicePixelRatio||1);
      const cssW=Math.max(80,rect.width),cssH=Math.max(30,rect.height);
      const pad=Math.round(Math.max(cssW,cssH)*.28);
      canvas.width=Math.round((cssW+pad*2)*dpr);
      canvas.height=Math.round((cssH+pad*2)*dpr);
      canvas.style.width=(cssW+pad*2)+'px';
      canvas.style.height=(cssH+pad*2)+'px';
      stage.appendChild(canvas);
      stage.classList.add('rockstar-canvas-3d-active');
      const ctx=canvas.getContext('2d');
      ctx.scale(dpr,dpr);
      const totalW=cssW+pad*2,totalH=cssH+pad*2,cx=totalW/2,cy=totalH/2;
      const tint=makeTintCanvas(img,'#5a3b1b');
      const duration=level==='soft'?14000:8000;
      const depth=level==='soft'?14:20;
      const layers=level==='soft'?10:14;
      const started=performance.now();
      const state={raf:0,sourceKey:(img.currentSrc||img.src),level,frontLocked};spinState.set(stage,state);
      function frame(now){
        if(spinState.get(stage)!==state)return;
        ctx.clearRect(0,0,totalW,totalH);
        // La frase inferior debe conservar siempre la misma vista frontal.
        // Mantiene su volumen y resplandor, pero no gira de perfil ni muestra
        // el reverso. ROCKSTAR conserva su vuelta 3D completa sin cambios.
        const a=frontLocked ? 0 : ((now-started)%duration)/duration*Math.PI*2;
        const c=Math.cos(a),sn=Math.sin(a);
        // V22.4.39: ROCKSTAR y frase usan exactamente el mismo giro 0→360°.
        // No usar Math.abs(c): eso hace que la segunda mitad de la vuelta
        // se pliegue hacia adelante y parezca regresar.
        const faceScale=c;
        // Extrusión: solo siluetas tintadas muy juntas.
        for(let i=layers;i>=1;i--){
          const z=(i/layers)*depth;
          const off=sn*z;
          const alpha=.16+.34*(i/layers);
          ctx.save();ctx.globalAlpha=alpha;
          ctx.translate(cx+off,cy);
          ctx.scale(faceScale,1);
          ctx.drawImage(tint,-cssW/2,-cssH/2,cssW,cssH);
          ctx.restore();
        }
        ctx.save();
        ctx.translate(cx,cy);
        ctx.globalAlpha=1;
        ctx.scale(faceScale,1);
        ctx.drawImage(img,-cssW/2,-cssH/2,cssW,cssH);
        ctx.restore();
        // Luz exterior elegida en Admin.
        ctx.save();ctx.globalCompositeOperation='destination-over';ctx.shadowColor=glowColor||'#e5bd70';ctx.shadowBlur=22;ctx.fillStyle='rgba(0,0,0,0.001)';ctx.fillRect(cx-cssW*.28,cy-cssH*.28,cssW*.56,cssH*.56);ctx.restore();
        if(!frontLocked)state.raf=requestAnimationFrame(frame);
      }
      state.raf=requestAnimationFrame(frame);
    };
    if(img.complete)requestAnimationFrame(launch); else img.addEventListener('load',()=>requestAnimationFrame(launch),{once:true});
  }
  function applyMotionModes(cfg){
    const brandStage=document.getElementById('rockstarEntryLogo');
    const captionStage=document.getElementById('rockstarEntryCaption');
    if(brandImageEl&&!brandImageEl.hidden && brandImageEl.dataset.transparentBrand==='1'){
      startCanvas3D(brandStage,brandImageEl,cfg.brand3DLevel,cfg.glowColor);
    }else{
      stopCanvas3D(brandStage);
    }
    if(captionImageEl&&!captionImageEl.hidden && captionImageEl.dataset.transparentCaption==='1'){
      startCanvas3D(captionStage,captionImageEl,cfg.caption3DLevel,cfg.captionGlowColor,true);
    }else{
      stopCanvas3D(captionStage);
    }
  }

  function applyEntryConfig(){
    const cfg=getConfig();
    const glow=cfg.glowColor||'#e5bd70';
    const productGlow=cfg.productGlowColor||'#e5bd70';
    const captionGlow=cfg.captionGlowColor||'#ff2028';
    document.documentElement.style.setProperty('--rockstar-brand-glow',glow);
    document.documentElement.style.setProperty('--rockstar-product-glow',productGlow);
    document.documentElement.style.setProperty('--rockstar-caption-glow',captionGlow);

    entry.style.backgroundImage =
      `linear-gradient(rgba(0,0,0,.24),rgba(0,0,0,.36)),url("${cfg.entryBackgroundUrl||DEFAULT_BG}")`;

    // En la portada, si existe una imagen de marca subida desde Admin,
    // ESA imagen reemplaza por completo al texto escrito. Así ROCKSTAR puede
    // ser cualquier logotipo gráfico y no aparece texto duplicado.
    const hasBrandImage=Boolean(cfg.brandImageUrl);
    if(brandTextEl){
      brandTextEl.textContent=cfg.brandText||'ROCKSTAR';
      brandTextEl.hidden=hasBrandImage;
      brandTextEl.style.display=hasBrandImage?'none':'inline-block';
    }
    if(brandImageEl){
      if(hasBrandImage){
        const source=cfg.brandImageUrl;
        if(brandImageEl.dataset.originalSource!==source){
          brandImageEl.dataset.originalSource=source;
          brandImageEl.src=source;
          delete brandImageEl.dataset.processedSource;
          // La imagen de marca subida desde Admin se conserva exactamente
          // como viene. La limpieza automática quitaba el relleno y brillo
          // del logotipo pocos instantes después de cargar la portada.
          brandImageEl.dataset.transparentBrand='1';
        }
        brandImageEl.hidden=false;
        brandImageEl.style.display='block';
        const showBrand=()=>{
          if(brandImageEl.dataset.originalSource===source){
            brandImageEl.dataset.transparentBrand='1';
            applyMotionModes(getConfig());
          }
        };
        if(brandImageEl.complete)requestAnimationFrame(showBrand);
        else brandImageEl.addEventListener('load',showBrand,{once:true});
      }else{
        brandImageEl.hidden=true;
        brandImageEl.style.display='none';
        brandImageEl.removeAttribute('src');
        delete brandImageEl.dataset.originalSource;
        delete brandImageEl.dataset.processedSource;
      }
    }

    const hasCaptionImage=Boolean(cfg.entryCaptionImageUrl);
    if(captionContainer){
      captionContainer.hidden=!hasCaptionImage;
      captionContainer.style.display=hasCaptionImage?'flex':'none';
    }
    if(captionImageEl){
      if(hasCaptionImage){
        const source=cfg.entryCaptionImageUrl;
        if(captionImageEl.dataset.originalSource!==source){
          captionImageEl.dataset.originalSource=source;
          captionImageEl.src=source;
          delete captionImageEl.dataset.processedCaptionSource;
          // La frase subida ya se conserva tal como viene. No se vuelve a
          // procesar porque esa limpieza automática quitaba relleno y brillo
          // pocos instantes después de cargar la portada.
          captionImageEl.dataset.transparentCaption='1';
        }
        captionImageEl.hidden=false;
        captionImageEl.style.display='block';
        const showCaption=()=>{
          if(captionImageEl.dataset.originalSource===source){
            captionImageEl.dataset.transparentCaption='1';
            applyMotionModes(getConfig());
          }
        };
        if(captionImageEl.complete)requestAnimationFrame(showCaption);
        else captionImageEl.addEventListener('load',showCaption,{once:true});
      }else{
        captionImageEl.hidden=true;
        captionImageEl.style.display='none';
        captionImageEl.removeAttribute('src');
        delete captionImageEl.dataset.originalSource;
        delete captionImageEl.dataset.processedCaptionSource;
      }
    }

    // Si el administrador subió una imagen específica para la portada,
    // se usa esa. Si no, se conserva la imagen principal del producto.
    // V22.4.37: la opción de Admin controla realmente el giro de la imagen.
    // off = sin giro, soft = giro lento, strong = giro normal.
    image.classList.remove('rockstar-entry-product-spin-side');
    image.style.removeProperty('--rockstar-entry-product-spin-duration');

    if(cfg.entryProductImageUrl){
      image.src=cfg.entryProductImageUrl;
      image.alt='Imagen destacada de entrada';
      image.dataset.customEntryImage='1';
      makeProductBackgroundTransparent(image,cfg.entryProductImageUrl);

      const productSpinLevel=level3D(cfg.product3DLevel);
      if(productSpinLevel!=='off'){
        image.style.setProperty(
          '--rockstar-entry-product-spin-duration',
          productSpinLevel==='soft' ? '18s' : '12s'
        );
        image.classList.add('rockstar-entry-product-spin-side');
      }
    }else{
      delete image.dataset.customEntryImage;
    }

    // Espera a que la eliminación de fondos actualice las imágenes y después
    // aplica únicamente los modos seleccionados.
    setTimeout(()=>applyMotionModes(cfg),220);
  }
function closeEntry(){
    entry.classList.add('is-leaving');
    document.body.classList.remove('rockstar-entry-open');
    document.body.classList.add('rockstar-store-open');

    window.setTimeout(()=>{
      entry.hidden=true;
      entry.setAttribute('aria-hidden','true');
      entry.style.display='none';

      const tienda=document.getElementById('coleccion');
      if(tienda)tienda.scrollIntoView({behavior:'auto',block:'start'});
      else window.scrollTo({top:0,left:0,behavior:'auto'});
    },430);
  }

  imageButton?.addEventListener('click',closeEntry);

  let entryReleased=false;
  const releaseEntry=()=>{
    if(entryReleased)return;
    entryReleased=true;
    document.documentElement.classList.remove('rockstar-entry-loading');
    entry.classList.add('rockstar-entry-ready');
  };

  const paintFinalEntry=()=>{
    try{
      document.body.classList.add('rockstar-entry-open');
      document.body.classList.remove('rockstar-store-open');
      entry.hidden=false;
      entry.style.removeProperty('display');
      entry.setAttribute('aria-hidden','false');
      applyEntryConfig();
}finally{
      // Dos frames permiten aplicar la configuración antes del primer render visible.
      requestAnimationFrame(()=>requestAnimationFrame(releaseEntry));
    }
  };

  // Si la configuración ya existe, pintar directamente.
  if(window.RIVER_STORE_SETTINGS || window.ROCKSTAR_ENTRY_CONFIG){
    paintFinalEntry();
  }

  // Camino normal: esperar la configuración real.
  window.addEventListener('river:store-settings-loaded',paintFinalEntry,{once:true});

  // LÍMITE DURO: aunque Supabase, Storage o una imagen fallen,
  // la portada se libera sí o sí. No puede quedarse bloqueada.
  window.setTimeout(()=>{
    if(!entryReleased){
      try{ applyEntryConfig(); }catch(_){}
      requestAnimationFrame(releaseEntry);
    }
  },900);

})();
