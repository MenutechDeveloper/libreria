/************************************************************
 * MENUTECH EFFECTS
 * Contiene dos etiquetas personalizadas:
 * 1. <menutech-gradient> - fondo animado con gradientes
 * 2. <menutech-particles> - partículas animadas encima de la web
 * Totalmente configurable mediante atributos
 ************************************************************/


/******************************
 * 1️⃣ MENUTECH GRADIENT
 ******************************/
class MenutechGradient extends HTMLElement {
  static get observedAttributes() {
    return ["colors", "speed", "angle", "overlay-opacity", "blur"];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  connectedCallback() { this.render(); }
  attributeChangedCallback() { this.render(); }

  render() {
    const colors = this.getAttribute("colors") || "#ff6b6b,#f06595,#845ef7,#339af0,#22b8cf,#51cf66,#fcc419";
    const speed = this.getAttribute("speed") || "30s"; // más lento para menos carga
    const angle = this.getAttribute("angle") || "45deg";
    const overlayOpacity = this.getAttribute("overlay-opacity") || 0.1;
    const blur = this.getAttribute("blur") || "5px"; // blur más bajo

    this.shadow.innerHTML = `
      <style>
        :host {
          display:block;
          position:fixed; top:0; left:0;
          width:100vw; height:100vh;
          overflow:hidden;
          z-index:-1;
        }

        .background-wrapper {
          position:absolute; top:0; left:0;
          width:200%; height:200%; /* doble tamaño para animar */
          background: linear-gradient(${angle}, ${colors});
          background-size: 200% 200%;
          will-change: transform;
          animation: moveGradient ${speed} linear infinite;
        }

        .overlay {
          position:absolute; top:0; left:0;
          width:100%; height:100%;
          background: rgba(255,255,255,${overlayOpacity});
          backdrop-filter: blur(${blur});
          z-index:0;
        }

        @keyframes moveGradient {
          0% { transform: translate(0%,0%); }
          50% { transform: translate(-50%,-50%); }
          100% { transform: translate(0%,0%); }
        }
      </style>

      <div class="background-wrapper"></div>
      <div class="overlay"></div>
      <slot></slot>
    `;
  }
}

customElements.define("menutech-gradient", MenutechGradient);




/******************************
 * 2️⃣ MENUTECH PARTICLES
 ******************************/
class MenutechParticles extends HTMLElement {
  static get observedAttributes() {
    return ["count", "color", "min-size", "max-size", "speed", "image", "opacity", "direction"];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const count = parseInt(this.getAttribute("count")) || 50;
    const color = this.getAttribute("color") || "#ffffff";
    const minSize = parseFloat(this.getAttribute("min-size")) || 3;
    const maxSize = parseFloat(this.getAttribute("max-size")) || 8;
    const speed = parseFloat(this.getAttribute("speed")) || 1;
    const opacity = parseFloat(this.getAttribute("opacity")) || 1;
    const direction = (this.getAttribute("direction") || "all").toLowerCase();
    const imageSrc = this.getAttribute("image") || null;

    this.shadow.innerHTML = `
      <style>
        :host { position: fixed; top:0; left:0; width:100vw; height:100vh; pointer-events:none; z-index:1000; }
        canvas { width:100%; height:100%; display:block; }
      </style>
      <canvas></canvas>
    `;

    const canvas = this.shadow.querySelector("canvas");
    const ctx = canvas.getContext("2d");

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    const particles = [];

    // Crear partículas
    for (let i = 0; i < count; i++) {
      const size = minSize + Math.random() * (maxSize - minSize);

      let vx = 0, vy = 0;
      switch (direction) {
        case "top": vx = 0; vy = -speed * (0.5 + Math.random()); break;
        case "bottom": vx = 0; vy = speed * (0.5 + Math.random()); break;
        case "left": vx = -speed * (0.5 + Math.random()); vy = 0; break;
        case "right": vx = speed * (0.5 + Math.random()); vy = 0; break;
        case "all": vx = (Math.random()-0.5) * speed; vy = (Math.random()-0.5) * speed; break;
      }

      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx, vy,
        size,
        opacity
      });
    }

    let particleImage = null;
    if(imageSrc){
      particleImage = new Image();
      particleImage.src = imageSrc;
    }

    const animate = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);

      for (let p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Movimiento continuo: reaparecen al salir de la pantalla
        if(p.x < -p.size) p.x = canvas.width + p.size;
        if(p.x > canvas.width + p.size) p.x = -p.size;
        if(p.y < -p.size) p.y = canvas.height + p.size;
        if(p.y > canvas.height + p.size) p.y = -p.size;

        ctx.globalAlpha = p.opacity;

        if(particleImage && particleImage.complete){
          ctx.drawImage(particleImage, p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        } else {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(animate);
    };

    animate();
  }
}

customElements.define("menutech-particles", MenutechParticles);



<!-- menutech-view3d.js -->
<script>
class MenutechView3D extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    // Leer atributos
    const poster = this.getAttribute("poster") || "https://vikingantonio.github.io/aetherkairo/assets/img/caffe22.png";
    const gltf = this.getAttribute("gltf") || "https://vikingantonio.github.io/aetherkairo/assets/scene.gltf";

    this.shadowRoot.innerHTML = `
      <style>
      #view3d {
        width: 100%;
        height: 500px;
        position: relative;
        background: url(./bgtaza3.png) bottom / cover no-repeat;
      }

      .v3d-loader {
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: rgba(255,255,255,0.1);
        overflow: hidden;
      }

      .v3d-loader-progress {
        width: 0%;
        height: 100%;
        background: linear-gradient(90deg, #c49b63, #6b3e1d);
        transition: width 0.3s;
      }

      @media (max-width: 992px) {
        #view3d { height: 900px; }
      }
      </style>

      <link rel="stylesheet" href="https://unpkg.com/@egjs/view3d@latest/css/view3d-bundle.min.css">
      <div id="view3d">
        <canvas class="view3d-canvas"></canvas>
        <div class="v3d-loader"><div class="v3d-loader-progress"></div></div>
      </div>
      <script src="https://unpkg.com/@egjs/view3d@latest/dist/view3d.pkgd.min.js"><\/script>
    `;

    const checkLib = setInterval(() => {
      if (window.View3D) {
        clearInterval(checkLib);
        this.initView3D(gltf, poster);
      }
    }, 50);
  }

  initView3D(gltf, poster) {
    const container = this.shadowRoot.querySelector("#view3d");

    const view3D = new View3D(container, { 
      src: gltf,
      poster: poster,
      autoInit: true,
    });

    // Loader visual
    view3D.on("loadStart", () => {
      this.shadowRoot.querySelector(".v3d-loader-progress").style.width = "0%";
    });
    view3D.on("progress", e => {
      this.shadowRoot.querySelector(".v3d-loader-progress").style.width = (e.loaded * 100) + "%";
    });
    view3D.on("load", () => {
      this.shadowRoot.querySelector(".v3d-loader").style.display = "none";
    });

    view3D.on("ready", () => {
      // Escala del modelo
      view3D.scene.scale.set(3, 3, 3);

      // Cámara (45° horizontal, -30° vertical, radio 1.5)
      const radius = 1.5;
      const theta = (45 * Math.PI) / 180;
      const phi = (-30 * Math.PI) / 180;

      const x = radius * Math.cos(phi) * Math.sin(theta);
      const y = radius * Math.sin(phi);
      const z = radius * Math.cos(phi) * Math.cos(theta);

      view3D.camera.position.set(x, y, z);
      view3D.camera.lookAt(0, 0, 0);

      // Rotación automática
      view3D.control.autoRotate = true;
      view3D.control.autoRotateSpeed = 1.0;

      // Iluminación neutra
      view3D.scene.environmentIntensity = 1.2;
      view3D.renderer.toneMappingExposure = 1.0;
    });
  }
}

customElements.define("menutech-view3d", MenutechView3D);
</script>





