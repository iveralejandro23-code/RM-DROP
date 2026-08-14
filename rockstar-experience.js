(() => {
  const audio = document.getElementById('rockstarAudio');
  const button = document.getElementById('rockstarSound');
  const video = document.getElementById('rockstarBgVideo');
  if(video){ video.addEventListener('error',()=>{ video.style.display='none'; }); }
  if(!audio || !button) return;
  const label = button.querySelector('span');
  button.addEventListener('click', async () => {
    try{
      if(audio.paused){
        await audio.play(); button.classList.add('playing'); if(label) label.textContent='PAUSAR MÚSICA'; button.setAttribute('aria-label','Pausar música');
      }else{
        audio.pause(); button.classList.remove('playing'); if(label) label.textContent='ACTIVAR MÚSICA'; button.setAttribute('aria-label','Activar música');
      }
    }catch(e){ console.warn('Agrega assets/rockstar-music.mp3 para activar la música.', e); }
  });
})();




/* ==========================================================
   ROCKSTAR V13.3 — VIDEO GLOBAL DE FONDO
   ========================================================== */
document.addEventListener("DOMContentLoaded",()=>{
  const video=document.getElementById("rockstarGlobalVideo");
  if(video){
    const ready=()=>video.classList.add("is-ready");
    video.addEventListener("loadeddata",ready,{once:true});
    video.addEventListener("canplay",ready,{once:true});
    video.addEventListener("error",()=>{
      video.classList.remove("is-ready");
      console.info("ROCKSTAR: coloca assets/media/rockstar-bg.mp4 para activar el fondo global.");
    });

    const playPromise=video.play();
    if(playPromise && typeof playPromise.catch==="function"){
      playPromise.catch(()=>{});
    }
  }

  const soundButton=document.getElementById("rockstarSoundButton");
  if(soundButton){
    soundButton.addEventListener("click",()=>{
      const audio=document.getElementById("rockstarAmbientAudio");
      if(!audio){
        soundButton.textContent="♪ MÚSICA PRÓXIMAMENTE";
        soundButton.disabled=true;
      }
    });
  }
});




/* ROCKSTAR V16.3 — botón de audio universal */
document.addEventListener("DOMContentLoaded",()=>{
  const music=document.getElementById("rockstarAudio");
  const video=document.getElementById("rockstarGlobalVideo");
  const btn=document.getElementById("rockstarSound");
  if(!btn) return;

  if(music) music.volume=0.42;
  if(video) video.volume=0.55;

  const updateButton=()=>{
    const source=btn.dataset.audioSource || window.ROCKSTAR_AUDIO_MODE || "music";
    const label=btn.querySelector("span");

    if(source==="video"){
      const playing=video && !video.paused && !video.muted;
      btn.classList.toggle("playing",!!playing);
      if(label) label.textContent=playing ? "SILENCIAR" : "SONIDO";
      btn.setAttribute("aria-label",playing ? "Silenciar video" : "Activar sonido del video");
    }else{
      const playing=music && !music.paused;
      btn.classList.toggle("playing",!!playing);
      if(label) label.textContent=playing ? "PAUSAR" : "MÚSICA";
      btn.setAttribute("aria-label",playing ? "Pausar música" : "Activar música");
    }
  };

  btn.addEventListener("click",async()=>{
    const source=btn.dataset.audioSource || window.ROCKSTAR_AUDIO_MODE || "music";

    if(source==="video"){
      if(!video) return;
      if(music) music.pause();

      try{
        if(video.paused) await video.play();

        if(video.muted){
          video.muted=false;
          video.volume=0.55;
        }else{
          video.muted=true;
        }
      }catch(_){}
    }else{
      if(video) video.muted=true;
      if(!music) return;

      try{
        if(music.paused) await music.play();
        else music.pause();
      }catch(_){}
    }
    updateButton();
  });

  music?.addEventListener("play",updateButton);
  music?.addEventListener("pause",updateButton);
  video?.addEventListener("play",updateButton);
  video?.addEventListener("pause",updateButton);
  video?.addEventListener("volumechange",updateButton);

  updateButton();
});
