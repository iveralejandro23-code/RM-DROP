/* ROCKSTAR V16.4 — Recuperación de contraseña */
(() => {
  const cfg=window.RIVER_CONFIG||{};
  const db=window.riverSupabase ||
    (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
      ? window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY)
      : null);
  if(!db)return;
  window.riverSupabase=db;

  const btn=document.getElementById("forgotPasswordButton");
  const msg=document.getElementById("forgotPasswordMessage");
  const emailInput=document.getElementById("email");

  btn?.addEventListener("click",async()=>{
    const email=String(emailInput?.value||"").trim().toLowerCase();
    if(!email){
      alert("Escribe primero tu correo.");
      emailInput?.focus();
      return;
    }
    btn.disabled=true;
    if(msg) msg.textContent="Enviando enlace…";

    const redirectTo=new URL("reset-password.html",window.location.href).href;
    const {error}=await db.auth.resetPasswordForEmail(email,{redirectTo});
    btn.disabled=false;

    if(error){
      console.error(error);
      if(msg) msg.textContent="No se pudo enviar el enlace.";
      alert(error.message||"No se pudo enviar el enlace.");
      return;
    }
    if(msg) msg.textContent="Si el correo está registrado, recibirás un enlace para cambiar la contraseña.";
  });
})();
