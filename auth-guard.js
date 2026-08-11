(async function () {
  const cfg = window.RIVER_CONFIG || {};
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY || !window.supabase) {
    document.documentElement.style.visibility = "visible";
    alert("No se pudo cargar la conexión de Supabase.");
    return;
  }

  const client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  window.riverSupabase = client;

  const { data: sessionData } = await client.auth.getSession();
  if (!sessionData.session) {
    location.replace("login.html");
    return;
  }

  const { data: isAdmin, error } = await client.rpc("is_admin");
  if (error || isAdmin !== true) {
    await client.auth.signOut();
    location.replace("login.html");
    return;
  }

  document.documentElement.style.visibility = "visible";

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await client.auth.signOut();
      location.replace("login.html");
    });
  }
})();
