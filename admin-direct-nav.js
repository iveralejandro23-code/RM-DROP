/* ROCKSTAR V17.8.2 — navegación directa */
(() => {
  document.querySelectorAll('a[href="#respaldoPanel"],a[href="#miCuenta"],a[href="#manualUsoPanel"]').forEach(link=>{
    link.addEventListener("click",e=>{
      const id=link.getAttribute("href");
      const target=document.querySelector(id);
      if(!target)return;
      e.preventDefault();
      target.scrollIntoView({behavior:"smooth",block:"start"});
      history.replaceState(null,"",id);
    });
  });
})();
