/* RIVER V12.7.2 — Navegación administrativa */
(() => {
  const sidebar = document.getElementById("riverAdminSidebar");
  const toggle = document.getElementById("riverSidebarToggle");
  const links = [...document.querySelectorAll("[data-admin-nav]")];

  function goTo(id){
    const target = document.getElementById(id);
    if(!target)return;
    const offset = 26;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({top, behavior:"smooth"});
    links.forEach(a=>a.classList.toggle("active", a.dataset.adminNav===id));

    if(window.innerWidth <= 900){
      document.body.classList.remove("river-sidebar-open");
    }
  }

  links.forEach(link=>{
    link.addEventListener("click",e=>{
      e.preventDefault();
      goTo(link.dataset.adminNav);
      history.replaceState(null,"",`#${link.dataset.adminNav}`);
    });
  });

  toggle?.addEventListener("click",()=>{
    document.body.classList.toggle("river-sidebar-open");
  });

  document.addEventListener("click",e=>{
    if(window.innerWidth>900)return;
    if(!document.body.classList.contains("river-sidebar-open"))return;
    if(sidebar?.contains(e.target) || toggle?.contains(e.target))return;
    document.body.classList.remove("river-sidebar-open");
  });

  const sidebarLogout=document.getElementById("sidebarLogoutBtn");
  sidebarLogout?.addEventListener("click",()=>{
    const original=document.getElementById("logoutBtn");
    if(original) original.click();
  });

  // Highlight current visible section
  const sectionIds=["dashboardPanel","ordersPanel","productsPanel","categoriesPanel","inventoryMovementsPanel","clientsPanel","reportsPanel","editorPanel","storeSettingsPanel"];
  const sections=sectionIds.map(id=>document.getElementById(id)).filter(Boolean);
  const observer=new IntersectionObserver(entries=>{
    const visible=entries
      .filter(e=>e.isIntersecting)
      .sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible)return;
    links.forEach(a=>a.classList.toggle("active",a.dataset.adminNav===visible.target.id));
  },{rootMargin:"-15% 0px -65% 0px",threshold:[0,.05,.15,.3]});
  sections.forEach(s=>observer.observe(s));

  if(location.hash){
    const id=location.hash.slice(1);
    setTimeout(()=>goTo(id),250);
  }else{
    links[0]?.classList.add("active");
  }

  // New-product button also brings the editor into view
  document.getElementById("newProductBtn")?.addEventListener("click",()=>{
    setTimeout(()=>goTo("editorPanel"),50);
  });
})();