(function(){
  const entry=document.getElementById('rockstarEntry');
  if(!entry)return;

  const imageButton=document.getElementById('rockstarEntryProductButton');
  const image=document.getElementById('rockstarEntryProductImage');
  const name=document.getElementById('rockstarEntryProductName');
  const price=document.getElementById('rockstarEntryProductPrice');
  let featuredId=null;

  document.body.classList.add('rockstar-entry-open');

  function moneyFromCard(card){
    const promo=card?.querySelector('.store-new-price');
    const regular=card?.querySelector('.store-product-price');
    return (promo?.textContent||regular?.textContent||'ENTRAR A LA TIENDA').trim();
  }

  function syncFeaturedProduct(){
    const card=document.querySelector('.store-product-card[data-product-id]');
    if(!card)return false;
    featuredId=card.getAttribute('data-product-id');
    const cardImg=card.querySelector('.store-product-card-main-image');
    const cardName=card.querySelector('.store-product-info h3');
    if(cardImg?.src){
      image.src=cardImg.src;
      image.alt=cardImg.alt||'Producto destacado ROCKSTAR';
    }
    if(cardName?.textContent)name.textContent=cardName.textContent.trim();
    price.textContent=moneyFromCard(card);
    return true;
  }

  function closeEntry(goToProduct){
    syncFeaturedProduct();
    entry.classList.add('is-leaving');
    document.body.classList.remove('rockstar-entry-open');
    window.setTimeout(()=>{
      entry.hidden=true;
      if(goToProduct){
        const card=featuredId
          ? document.querySelector(`.store-product-card[data-product-id="${CSS.escape(String(featuredId))}"]`)
          : document.querySelector('.store-product-card');
        if(card){
          card.scrollIntoView({behavior:'smooth',block:'center',inline:'center'});
          card.classList.add('rockstar-entry-target');
          window.setTimeout(()=>card.classList.remove('rockstar-entry-target'),1400);
        }else{
          document.getElementById('coleccion')?.scrollIntoView({behavior:'smooth'});
        }
      }else{
        document.getElementById('inicio')?.scrollIntoView({behavior:'smooth'});
      }
    },430);
  }

  imageButton?.addEventListener('click',()=>closeEntry(true));

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
