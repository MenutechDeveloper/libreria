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


// =========================================================
// Menutech form
// =========================================================

// menutechlibrary.js

class MenutechForm extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    // Propiedades editables desde el HTML
    const bgColor = this.getAttribute('bg-color') || '#fff';
    const labelColor = this.getAttribute('label-color') || '#000';
    const inputColor = this.getAttribute('input-color') || '#000';
    const placeholderColor = this.getAttribute('placeholder-color') || '#000';
    const maxWidth = this.getAttribute('max-width') || '800px';
    const buttonColor = this.getAttribute('button-color') || '#f7d6d6';
    const buttonTextColor = this.getAttribute('button-text-color') || '#000';

    // URL del Apps Script fijo
    const scriptURL = "https://script.google.com/macros/s/TU_SCRIPT_ID/exec"; // 👈 reemplaza con tu script real

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          box-sizing: border-box;
          padding: 20px;
        }
        form {
          background: ${bgColor};
          max-width: ${maxWidth};
          margin: 0 auto;
          padding: 28px 36px;
          border-radius: 12px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.12);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        label {
          color: ${labelColor};
          font-weight: bold;
          margin-bottom: 4px;
        }
        input, textarea {
          font-family: inherit;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.12);
          color: ${inputColor};
          background: #fff;
          outline: none;
        }
        input::placeholder, textarea::placeholder {
          color: ${placeholderColor};
        }
        button {
          align-self: flex-start;
          padding: 10px 16px;
          border-radius: 8px;
          border: none;
          background: ${buttonColor};
          color: ${buttonTextColor};
          cursor: pointer;
          font-weight: bold;
          transition: transform 0.2s ease;
        }
        button:hover {
          transform: translateY(-2px);
        }
        #popup {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0);
          background: #fff9e8;
          padding: 28px 36px;
          border-radius: 12px;
          box-shadow: 0 12px 28px rgba(0,0,0,0.18);
          text-align: center;
          font-size: 1.1rem;
          color: #333;
          z-index: 9999;
          opacity: 0;
          transition: transform 0.4s ease, opacity 0.4s ease;
        }
        #popup.show {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
        .spinner {
          margin: 12px auto;
          width: 36px;
          height: 36px;
          border: 4px dashed #444;
          border-top: 4px solid #f7d6d6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
      </style>

      <form id="contactForm">
        <label for="nombre">Nombre</label>
        <input type="text" name="nombre" placeholder="Tu nombre" required>

        <label for="email">Correo</label>
        <input type="email" name="email" placeholder="Tu correo" required>

        <label for="mensaje">Mensaje</label>
        <textarea name="mensaje" placeholder="Escribe tu mensaje" required></textarea>

        <button type="submit">Enviar</button>
      </form>

      <div id="popup">
        <div class="spinner"></div>
        <div id="popupText">Enviando mensaje...</div>
      </div>
    `;

    // Eventos
    const form = this.shadowRoot.getElementById('contactForm');
    const popup = this.shadowRoot.getElementById('popup');
    const popupText = this.shadowRoot.getElementById('popupText');

    form.addEventListener('submit', e => {
      e.preventDefault();
      popupText.textContent = "Enviando mensaje...";
      popup.classList.add("show");

      const data = new FormData(form);
      data.append("dominio", window.location.hostname);

      fetch(scriptURL, { method: "POST", body: data })
        .then(resp => resp.json())
        .then(res => {
          if (res.result === "success") {
            popupText.textContent = "✅ Mensaje enviado con éxito!";
            form.reset();
          } else {
            popupText.textContent = "⚠️ Error al enviar. Intenta de nuevo.";
          }
          setTimeout(() => popup.classList.remove("show"), 2500);
        })
        .catch(err => {
          console.error(err);
          popupText.textContent = "❌ Error al conectar con el servidor.";
          setTimeout(() => popup.classList.remove("show"), 2500);
        });
    });
  }
}

customElements.define('menutech-form', MenutechForm);

















