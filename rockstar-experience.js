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
});




/* ROCKSTAR V16.3 — botón de audio universal */
document.addEventListener("DOMContentLoaded",()=>{
  const music=document.getElementById("rockstarAudio");
  const btn=document.getElementById("rockstarSound");
  if(!btn) return;

  const getVideo=()=>btn._rockstarVideoSource || document.getElementById("rockstarGlobalVideo");
  const initialVideo=getVideo();
  let youtubeFrame=null;
  let youtubeFrameId="";
  let youtubePlaying=false;
  let youtubeReady=false;
  let youtubePendingPlay=false;

  const youtubeCommand=command=>{
    if(!youtubeFrame?.contentWindow)return;
    youtubeFrame.contentWindow.postMessage(JSON.stringify({
      event:"command",
      func:command,
      args:[]
    }),"*");
  };

  const prepareYouTube=id=>{
    if(!id)return false;
    if(!youtubeFrame || youtubeFrameId!==id){
      youtubeFrame?.remove();
      youtubeReady=false;
      youtubePendingPlay=false;
      youtubeFrame=document.createElement("iframe");
      youtubeFrameId=id;
      youtubeFrame.title="Reproductor de música de la tienda";
      youtubeFrame.allow="autoplay; encrypted-media";
      youtubeFrame.referrerPolicy="strict-origin-when-cross-origin";
      youtubeFrame.tabIndex=-1;
      youtubeFrame.setAttribute("aria-hidden","true");
      youtubeFrame.style.cssText="position:fixed;width:2px;height:2px;left:-10px;bottom:-10px;opacity:.01;pointer-events:none;border:0;";
      youtubeFrame.src=`https://www.youtube.com/embed/${encodeURIComponent(id)}?enablejsapi=1&autoplay=0&playsinline=1&loop=1&playlist=${encodeURIComponent(id)}`;
      youtubeFrame.addEventListener("load",()=>{
        youtubeReady=true;
        if(youtubePendingPlay)youtubeCommand("playVideo");
      });
      document.body.appendChild(youtubeFrame);
    }
    return true;
  };

  const startYouTube=id=>{
    if(!prepareYouTube(id))return false;
    youtubePlaying=true;
    youtubePendingPlay=true;
    if(youtubeReady)youtubeCommand("playVideo");
    return true;
  };

  const pauseYouTube=()=>{
    youtubeCommand("pauseVideo");
    youtubePlaying=false;
    youtubePendingPlay=false;
  };

  document.addEventListener("rockstar:youtube-source",event=>{
    prepareYouTube(String(event.detail?.id||"").trim());
  });

  if(btn.dataset.youtubeId)prepareYouTube(String(btn.dataset.youtubeId).trim());

  if(music) music.volume=0.42;
  if(initialVideo) initialVideo.volume=0.55;

  const updateButton=()=>{
    const source=btn.dataset.audioSource || window.ROCKSTAR_AUDIO_MODE || "music";
    const label=btn.querySelector("span");

    if(source==="video"){
      const video=getVideo();
      const playing=video && !video.paused && !video.muted;
      btn.classList.toggle("playing",!!playing);
      if(label) label.textContent=playing ? "SILENCIAR" : "SONIDO";
      btn.setAttribute("aria-label",playing ? "Silenciar video" : "Activar sonido del video");
    }else if(source==="youtube"){
      btn.classList.toggle("playing",youtubePlaying);
      if(label) label.textContent=youtubePlaying ? "SILENCIAR" : "MÚSICA";
      btn.setAttribute("aria-label",youtubePlaying ? "Silenciar música de YouTube" : "Activar música de YouTube");
    }else{
      const playing=music && !music.paused;
      btn.classList.toggle("playing",!!playing);
      if(label) label.textContent=playing ? "SILENCIAR" : "MÚSICA";
      btn.setAttribute("aria-label",playing ? "Silenciar música" : "Activar música");
    }
  };

  btn.addEventListener("click",async()=>{
    const source=btn.dataset.audioSource || window.ROCKSTAR_AUDIO_MODE || "music";
    const video=getVideo();

    if(source==="video"){
      if(!video) return;
      if(music) music.pause();
      pauseYouTube();

      try{
        if(video.paused) await video.play();

        if(video.muted){
          video.muted=false;
          video.volume=0.55;
        }else{
          video.muted=true;
        }
      }catch(_){}
    }else if(source==="youtube"){
      if(video)video.muted=true;
      if(music)music.pause();
      const id=String(btn.dataset.youtubeId||"").trim();
      if(!id)return;
      if(youtubePlaying)pauseYouTube();
      else startYouTube(id);
    }else{
      if(video) video.muted=true;
      pauseYouTube();
      if(!music) return;

      try{
        if(music.paused) await music.play();
        else music.pause();
      }catch(error){
        console.warn("No se pudo reproducir el enlace de música.",error);
        const label=btn.querySelector("span");
        if(label)label.textContent="REVISAR ENLACE";
        btn.setAttribute("aria-label","No se pudo reproducir la música");
      }
    }
    updateButton();
  });

  music?.addEventListener("play",updateButton);
  music?.addEventListener("pause",updateButton);
  music?.addEventListener("error",()=>{
    const source=btn.dataset.audioSource || window.ROCKSTAR_AUDIO_MODE || "music";
    if(source!=="music")return;
    btn.classList.remove("playing");
    const label=btn.querySelector("span");
    if(label)label.textContent="REVISAR ENLACE";
    btn.setAttribute("aria-label","No se pudo cargar la música");
  });
  initialVideo?.addEventListener("play",updateButton);
  initialVideo?.addEventListener("pause",updateButton);
  initialVideo?.addEventListener("volumechange",updateButton);

  updateButton();
});
