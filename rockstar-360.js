/* ROCKSTAR V21.3 — visor 360° interactivo para foto/video equirectangular. */
(() => {
  class Rockstar360Viewer {
    constructor(container, options={}){
      this.container=container;
      this.url=String(options.url||"");
      this.type=options.type==="video"?"video":"image";
      this.lon=0;
      this.lat=0;
      this.fov=72;
      this.dragging=false;
      this.pointerId=null;
      this.startX=0; this.startY=0; this.startLon=0; this.startLat=0; this.moved=false;
      this.raf=0;
      this.video=null;
      this.texture=null;
      this._resize=this.resize.bind(this);
      this._move=this.onPointerMove.bind(this);
      this._up=this.onPointerUp.bind(this);
      this.init();
    }
    init(){
      const THREE=window.THREE;
      if(!THREE || !this.container || !this.url) return;
      this.scene=new THREE.Scene();
      this.camera=new THREE.PerspectiveCamera(this.fov,1,0.1,1100);
      this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
      this.renderer.domElement.className="rockstar-360-canvas";
      this.container.appendChild(this.renderer.domElement);
      const geometry=new THREE.SphereGeometry(500,60,40);
      geometry.scale(-1,1,1);
      if(this.type==="video"){
        const video=document.createElement("video");
        video.src=this.url;
        video.crossOrigin="anonymous";
        video.loop=true; video.muted=true; video.playsInline=true; video.autoplay=true; video.preload="auto";
        this.video=video;
        this.texture=new THREE.VideoTexture(video);
        this.texture.colorSpace=THREE.SRGBColorSpace;
        video.play().catch(()=>{});
      }else{
        this.texture=new THREE.TextureLoader().load(this.url,()=>this.render());
        this.texture.colorSpace=THREE.SRGBColorSpace;
      }
      this.material=new THREE.MeshBasicMaterial({map:this.texture});
      this.mesh=new THREE.Mesh(geometry,this.material);
      this.scene.add(this.mesh);
      this.canvas=this.renderer.domElement;
      this.canvas.addEventListener("pointerdown",e=>this.onPointerDown(e));
      this.canvas.addEventListener("pointermove",this._move);
      this.canvas.addEventListener("pointerup",this._up);
      this.canvas.addEventListener("pointercancel",this._up);
      this.canvas.addEventListener("wheel",e=>this.onWheel(e),{passive:false});
      window.addEventListener("resize",this._resize);
      this.resize();
      this.animate();
    }
    onPointerDown(e){
      if(e.pointerType==="mouse" && e.button!==0) return;
      this.dragging=true; this.pointerId=e.pointerId;
      this.startX=e.clientX; this.startY=e.clientY; this.startLon=this.lon; this.startLat=this.lat; this.moved=false;
      try{this.canvas.setPointerCapture(e.pointerId);}catch(_){}
      this.canvas.classList.add("is-dragging");
    }
    onPointerMove(e){
      if(!this.dragging || e.pointerId!==this.pointerId) return;
      const dx=e.clientX-this.startX, dy=e.clientY-this.startY;
      if(!this.moved && Math.hypot(dx,dy)<3) return;
      this.moved=true;
      this.lon=this.startLon-dx*0.16;
      this.lat=this.startLat+dy*0.13;
      this.lat=Math.max(-78,Math.min(78,this.lat));
    }
    onPointerUp(e){
      if(e.pointerId!==this.pointerId) return;
      this.dragging=false; this.pointerId=null;
      this.canvas?.classList.remove("is-dragging");
    }
    onWheel(e){
      e.preventDefault();
      this.fov=Math.max(38,Math.min(92,this.fov+e.deltaY*0.035));
      this.camera.fov=this.fov;
      this.camera.updateProjectionMatrix();
    }
    resize(){
      if(!this.renderer||!this.camera||!this.container) return;
      const w=Math.max(1,this.container.clientWidth||window.innerWidth);
      const h=Math.max(1,this.container.clientHeight||window.innerHeight);
      this.renderer.setSize(w,h,false);
      this.camera.aspect=w/h;
      this.camera.updateProjectionMatrix();
    }
    render(){
      if(!this.renderer||!this.camera||!this.scene) return;
      const phi=THREE.MathUtils.degToRad(90-this.lat);
      const theta=THREE.MathUtils.degToRad(this.lon);
      const target=new THREE.Vector3(
        500*Math.sin(phi)*Math.cos(theta),
        500*Math.cos(phi),
        500*Math.sin(phi)*Math.sin(theta)
      );
      this.camera.lookAt(target);
      this.renderer.render(this.scene,this.camera);
    }
    animate(){
      this.raf=requestAnimationFrame(()=>this.animate());
      this.render();
    }
    destroy(){
      if(this.raf) cancelAnimationFrame(this.raf);
      window.removeEventListener("resize",this._resize);
      if(this.video){ this.video.pause(); this.video.removeAttribute("src"); this.video.load(); }
      this.texture?.dispose?.(); this.material?.dispose?.(); this.mesh?.geometry?.dispose?.(); this.renderer?.dispose?.();
      if(this.container) this.container.innerHTML="";
    }
  }
  window.Rockstar360Viewer=Rockstar360Viewer;
})();
