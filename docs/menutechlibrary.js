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

// -----------------------------------------------------------------
// Modelados 3D
// -----------------------------------------------------------------
class MenutechView3D extends HTMLElement {
  constructor() {
    super();
    // Crear contenedor
    this.container = document.createElement("div");
    this.container.style.width = this.getAttribute("width") || "100%";
    this.container.style.height = this.getAttribute("height") || "500px";
    this.container.style.position = "relative";
    this.container.style.overflow = "hidden";
    this.container.style.backgroundColor = "#000";
    this.appendChild(this.container);

    // Crear póster
    this.poster = document.createElement("div");
    this.poster.style.position = "absolute";
    this.poster.style.top = "0";
    this.poster.style.left = "0";
    this.poster.style.width = "100%";
    this.poster.style.height = "100%";
    this.poster.style.backgroundSize = "cover";
    this.poster.style.backgroundPosition = "center";
    this.poster.style.transition = "opacity 0.6s ease";
    this.container.appendChild(this.poster);
  }

  connectedCallback() {
    const gltfUrl = this.getAttribute("gltf");
    const posterUrl = this.getAttribute("poster");

    if (posterUrl) {
      this.poster.style.backgroundImage = `url('${posterUrl}')`;
    }

    if (!gltfUrl) {
      console.error("❌ menutech-view3d: Falta el atributo gltf");
      return;
    }

    // Esperar a que el elemento esté visible en el DOM
    requestAnimationFrame(() => {
      this.ensureView3DLoaded(() => {
        this.initView3D(gltfUrl);
      });
    });
  }

  ensureView3DLoaded(callback) {
    if (window.View3D) {
      callback();
      return;
    }

    const existingScript = document.querySelector('script[data-menutech-view3d]');
    if (existingScript) {
      existingScript.addEventListener("load", callback);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@egjs/view3d@latest/dist/view3d.pkgd.min.js";
    script.dataset.menutechView3d = "true";
    script.onload = callback;
    document.head.appendChild(script);
  }

  initView3D(gltfUrl) {
    console.log("✅ Iniciando View3D con:", gltfUrl);

    try {
      this.view3D = new View3D(this.container, {
        src: gltfUrl,
        autoplay: true,
        autoRotate: true,
        cameraControls: true,
        environment: "neutral",
      });

      this.view3D.on("ready", () => {
        console.log("🎯 Modelo 3D cargado correctamente");
        this.view3D.camera.position.set(0, 1, 3);
        this.view3D.camera.lookAt(0, 0, 0);
        this.view3D.scene.scale.set(3, 3, 3);
        this.poster.style.opacity = "0";
        setTimeout(() => (this.poster.style.display = "none"), 800);
      });

      this.view3D.on("error", e => {
        console.error("❌ Error al cargar modelo:", e);
        this.poster.style.background = "#222";
        this.poster.textContent = "⚠️ Error al cargar modelo";
        this.poster.style.color = "#fff";
        this.poster.style.display = "flex";
        this.poster.style.alignItems = "center";
        this.poster.style.justifyContent = "center";
      });
    } catch (err) {
      console.error("❌ Excepción al iniciar View3D:", err);
    }
  }
}

customElements.define("menutech-view3d", MenutechView3D);











