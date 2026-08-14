/* ROCKSTAR V16.4 — Mi cuenta */
(() => {
  const cfg=window.RIVER_CONFIG||{};
  const db=window.riverSupabase ||
    (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
      ? window.supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY)
      : null);
  if(!db)return;
  window.riverSupabase=db;

  const $=id=>document.getElementById(id);
  const emailCurrent=$("accountCurrentEmail");
  const emailNew=$("accountNewEmail");
  const passNew=$("accountNewPassword");
  const passConfirm=$("accountConfirmPassword");
  const msg=$("accountMessage");

  async function loadAccount(){
    const {data,error}=await db.auth.getUser();
    if(error || !data?.user){
      if(msg) msg.textContent="No se pudo leer la cuenta actual.";
      return;
    }
    if(emailCurrent) emailCurrent.value=data.user.email||"";
  }

  $("accountChangeEmail")?.addEventListener("click",async()=>{
    const email=String(emailNew?.value||"").trim().toLowerCase();
    if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      alert("Escribe un correo válido.");
      return;
    }
    if(email===String(emailCurrent?.value||"").trim().toLowerCase()){
      alert("Ese ya es el correo actual.");
      return;
    }
    if(!confirm(`¿Cambiar el correo de acceso a ${email}?`)) return;

    msg.textContent="Solicitando cambio de correo…";
    const {data,error}=await db.auth.updateUser({email});
    if(error){
      console.error(error);
      msg.textContent="No se pudo cambiar el correo.";
      alert(error.message||"No se pudo cambiar el correo.");
      return;
    }

    emailNew.value="";
    msg.textContent="Cambio solicitado. Revisa el correo de confirmación si Supabase lo requiere.";
    await loadAccount();
  });

  $("accountChangePassword")?.addEventListener("click",async()=>{
    const password=String(passNew?.value||"");
    const confirmPassword=String(passConfirm?.value||"");

    if(password.length<8){
      alert("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if(password!==confirmPassword){
      alert("Las contraseñas no coinciden.");
      return;
    }
    if(!confirm("¿Cambiar la contraseña de acceso a ROCKSTAR Admin?")) return;

    msg.textContent="Cambiando contraseña…";
    const {error}=await db.auth.updateUser({password});
    if(error){
      console.error(error);
      msg.textContent="No se pudo cambiar la contraseña.";
      alert(error.message||"No se pudo cambiar la contraseña.");
      return;
    }

    passNew.value="";
    passConfirm.value="";
    msg.textContent="Contraseña actualizada correctamente.";
    alert("Contraseña actualizada correctamente.");
  });

  loadAccount();
})();
