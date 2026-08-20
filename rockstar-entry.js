(function(){
  const entry=document.getElementById('rockstarEntry');
  if(!entry)return;

  const imageButton=document.getElementById('rockstarEntryProductButton');
  const image=document.getElementById('rockstarEntryProductImage');
  const brandTextEl=document.getElementById('rockstarEntryBrandText');
  const brandImageEl=document.getElementById('rockstarEntryBrandImage');
  const captionImageEl=document.getElementById('rockstarEntryCaptionImage');
  const captionContainer=document.getElementById('rockstarEntryCaption');
  let featuredId=null;

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
      entryCaptionImageUrl:'',
      entryBackgroundUrl:'',
      entryProductImageUrl:''
    };
  }

  async function makeBrandBackgroundTransparent(img,url){
    if(!img || !url)return;
    // Evita volver a procesar la misma imagen.
    if(img.dataset.processedSource===url)return;
    img.dataset.processedSource=url;
    try{
      const response=await fetch(url,{mode:'cors',cache:'force-cache'});
      if(!response.ok)throw new Error('No se pudo leer la imagen de marca');
      const blob=await response.blob();
      const bitmap=await createImageBitmap(blob);
      const canvas=document.createElement('canvas');
      canvas.width=bitmap.width;
      canvas.height=bitmap.height;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});
      ctx.drawImage(bitmap,0,0);
      const frame=ctx.getImageData(0,0,canvas.width,canvas.height);
      const d=frame.data;
      // Convierte fondos negros o casi negros en transparencia real.
      // Los bordes suaves se conservan con una transición gradual.
      for(let i=0;i<d.length;i+=4){
        const r=d[i],g=d[i+1],b=d[i+2];
        const max=Math.max(r,g,b);
        const min=Math.min(r,g,b);
        const lum=(r+g+b)/3;
        const neutral=(max-min)<28;
        if(neutral && lum<=42){
          d[i+3]=0;
        }else if(neutral && lum<88){
          d[i+3]=Math.round(d[i+3]*((lum-42)/46));
        }
      }
      ctx.putImageData(frame,0,0);
      img.src=canvas.toDataURL('image/png');
      img.dataset.transparentBrand='1';
      bitmap.close?.();
    }catch(_){
      // En caso de que el navegador bloquee el procesamiento, el CSS
      // mix-blend-mode:screen sigue ocultando visualmente el negro.
      img.dataset.transparentBrand='fallback';
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
      img.src=output.toDataURL('image/png');
      img.dataset.transparentCaption='1';
      bitmap.close?.();
    }catch(_){
      img.dataset.transparentCaption='fallback';
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
        }
        brandImageEl.hidden=false;
        brandImageEl.style.display='block';
        // Quita de verdad el fondo negro de JPG/PNG subidos por el usuario.
        // El resultado queda transparente y deja ver el fondo general rojo.
        makeBrandBackgroundTransparent(brandImageEl,source);
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
        }
        captionImageEl.hidden=false;
        captionImageEl.style.display='block';
        makeCaptionBackgroundTransparent(captionImageEl,source);
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
    if(cfg.entryProductImageUrl){
      image.src=cfg.entryProductImageUrl;
      image.alt='Imagen destacada de entrada';
      image.dataset.customEntryImage='1';
      makeProductBackgroundTransparent(image,cfg.entryProductImageUrl);
    }else{
      delete image.dataset.customEntryImage;
    }
  }

  function chooseCard(){
    const cards=[...document.querySelectorAll('.store-product-card[data-product-id]')];
    const cap=cards.find(c=>/gorra|cap|felona|trucker|snapback/i.test(c.textContent||''));
    return cap||cards[0]||null;
  }

  function syncFeaturedProduct(){
    const card=chooseCard();
    if(!card)return false;
    featuredId=card.getAttribute('data-product-id');
    const cardImg=card.querySelector('.store-product-card-main-image');
    if(cardImg?.src && !image.dataset.customEntryImage){
      image.src=cardImg.src;
      image.alt=cardImg.alt||'Producto destacado';
      makeProductBackgroundTransparent(image,cardImg.src);
    }
    return true;
  }

  function closeEntry(){
    // La foto de entrada solo abre la tienda. No manda directo al catálogo.
    // Al terminar la transición, la vista queda al inicio para mostrar primero
    // el fondo completo; el usuario decide cuándo bajar o tocar “Tienda”.
    syncFeaturedProduct();
    entry.classList.add('is-leaving');
    document.body.classList.remove('rockstar-entry-open');
    window.setTimeout(()=>{
      entry.hidden=true;
      const inicio=document.getElementById('inicio');
      if(inicio){
        inicio.scrollIntoView({behavior:'auto',block:'start'});
      }else{
        window.scrollTo({top:0,left:0,behavior:'auto'});
      }
    },430);
  }

  imageButton?.addEventListener('click',closeEntry);

  applyEntryConfig();
  window.addEventListener('river:store-settings-loaded',()=>{
    applyEntryConfig();
    syncFeaturedProduct();
  });

  if(!syncFeaturedProduct()){
    const grid=document.getElementById('storeProductGrid');
    if(grid){
      const observer=new MutationObserver(()=>{
        if(syncFeaturedProduct())observer.disconnect();
      });
      observer.observe(grid,{childList:true,subtree:true});
      window.setTimeout(()=>observer.disconnect(),12000);
    }
  }
})();