/* ROCKSTAR V16.4 — establecer contraseña recuperada */
(() => {
  const cfg=window.RIVER_CONFIG||{};
  const db=window.riverSupabase ||
    (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
      ? window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY)
      : null);
  if(!db)return;
  window.riverSupabase=db;

  const $=id=>document.getElementById(id);
  $("resetPasswordButton")?.addEventListener("click",async()=>{
    const p=$("resetPassword").value||"";
    const c=$("resetPasswordConfirm").value||"";
    if(p.length<8){alert("La contraseña debe tener al menos 8 caracteres.");return;}
    if(p!==c){alert("Las contraseñas no coinciden.");return;}

    $("resetPasswordMessage").textContent="Guardando…";
    const {error}=await db.auth.updateUser({password:p});
    if(error){
      console.error(error);
      $("resetPasswordMessage").textContent="No se pudo cambiar la contraseña.";
      alert(error.message||"No se pudo cambiar la contraseña.");
      return;
    }
    $("resetPasswordMessage").textContent="Contraseña actualizada. Ya puedes iniciar sesión.";
    setTimeout(()=>location.href="login.html",1200);
  });
})();
