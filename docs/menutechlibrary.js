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

// ==================================================================
// Modelados 3D
// ==================================================================
class MenutechView3D extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });

    // Contenedor visible
    this.wrapper = document.createElement("div");
    this.wrapper.style.width = this.getAttribute("width") || "100%";
    this.wrapper.style.height = this.getAttribute("height") || "500px";
    this.wrapper.style.position = "relative";
    this.wrapper.style.overflow = "hidden";
    this.shadow.appendChild(this.wrapper);

    // Póster overlay
    this.posterDiv = document.createElement("div");
    this.posterDiv.style.position = "absolute";
    this.posterDiv.style.top = "0";
    this.posterDiv.style.left = "0";
    this.posterDiv.style.width = "100%";
    this.posterDiv.style.height = "100%";
    this.posterDiv.style.backgroundSize = "cover";
    this.posterDiv.style.backgroundPosition = "center";
    this.posterDiv.style.transition = "opacity 0.6s ease";
    this.wrapper.appendChild(this.posterDiv);
  }

  connectedCallback() {
    const posterUrl = this.getAttribute("poster");
    if (posterUrl) {
      this.posterDiv.style.backgroundImage = `url('${posterUrl}')`;
    }

    const src = this.getAttribute("src") || this.getAttribute("gltf");
    if (!src) {
      console.error("menutech-view3d: necesitas atributo src o gltf");
      return;
    }

    // Insertar CSS de view3d (sí, debemos hacerlo)
    this.injectCSS();

    // Iniciar carga de la librería + visor
    this.loadLibraryAndInit(src);
  }

  injectCSS() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/@egjs/view3d@latest/css/view3d-bundle.min.css";
    this.shadow.appendChild(link);
  }

  loadLibraryAndInit(src) {
    if (window.View3D) {
      this.initViewer(src);
      return;
    }

    // Verificar si ya hay un script inyectado
    const existing = document.querySelector('script[data-menutech-view3d]');
    if (existing) {
      existing.addEventListener("load", () => this.initViewer(src));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://unpkg.com/@egjs/view3d@latest/dist/view3d.pkgd.min.js";
    script.setAttribute("data-menutech-view3d", "true");
    script.onload = () => {
      console.log("View3D librería cargada");
      this.initViewer(src);
    };
    script.onerror = () => {
      console.error("No se pudo cargar la librería View3D");
    };
    document.head.appendChild(script);
  }

  initViewer(src) {
    console.log("Inicializando View3D con", src);

    // Debemos esperar un tick para asegurar que el wrapper esté listo
    requestAnimationFrame(() => {
      try {
        this.view3d = new View3D(this.wrapper, {
          src: src,
          poster: null,  // podemos pasar null porque manejamos el póster manualmente
          autoInit: true,
          autoResize: true,
          environment: "neutral",
        });

        this.view3d.on("ready", () => {
          console.log("Modelo listo");
          // ajustar cámara simple
          this.view3d.camera.yaw = 45;
          this.view3d.camera.pitch = -30;
          // esconder póster
          this.posterDiv.style.opacity = "0";
          setTimeout(() => (this.posterDiv.style.display = "none"), 700);
        });

        this.view3d.on("error", (e) => {
          console.error("Error cargando modelo 3D:", e);
        });
      } catch (e) {
        console.error("Excepción en initViewer:", e);
      }
    });
  }
}

customElements.define("menutech-view3d", MenutechView3D);














