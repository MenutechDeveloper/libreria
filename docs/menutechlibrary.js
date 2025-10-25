/******************************
 * MENUTECH GRADIENT
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
    const speed = this.getAttribute("speed") || "30s";
    const angle = this.getAttribute("angle") || "45deg";
    const overlayOpacity = this.getAttribute("overlay-opacity") || 0.1;
    const blur = this.getAttribute("blur") || "5px";

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
 * MENUTECH EVENTS
 ******************************/
class MenutechNavidad extends HTMLElement {
  static get observedAttributes() {
    return [
      "color","cantidad","tamano","velocidad","opacidad",
      "popup-activo","popup-image","popup-link"
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.render();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const color = this.getAttribute("color") || "#ffffff";
    const cantidad = parseInt(this.getAttribute("cantidad")) || 60;
    const tamano = parseFloat(this.getAttribute("tamano")) || 3;
    const velocidad = parseFloat(this.getAttribute("velocidad")) || 1;
    const opacidad = parseFloat(this.getAttribute("opacidad")) || 0.8;
    const popupActivo = ["true","on"].includes(this.getAttribute("popup-activo"));
    const popupImage = this.getAttribute("popup-image") || "";
    const popupLink = this.getAttribute("popup-link") || "";

    // MOSTRAR SIEMPRE PARA PRUEBAS
    const activo = true;

    const snowImages = [
      "https://menutechdeveloper.github.io/libreria/snow1.png",
      "https://menutechdeveloper.github.io/libreria/snow2.png",
      "https://menutechdeveloper.github.io/libreria/snow3.png"
    ];

    let dots = "";
    for (let i = 0; i < cantidad; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = tamano + Math.random() * tamano;
      const dur = 4 + Math.random() * 3;
      const delay = Math.random() * 2;
      const img = snowImages[i % snowImages.length];

      dots += `
        <div class="flake" style="
          left:${x}%;
          top:${y}%;
          width:${size * 5}px;
          height:${size * 5}px;
          animation-duration:${dur / velocidad}s;
          animation-delay:${delay}s;
          opacity:${opacidad};
          background-image:url('${img}');
          background-size:contain;
          background-repeat:no-repeat;
          background-position:center;
        "></div>`;
    }

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display:block;
          position:relative;
          width:100%;
          height:100%;
          overflow:hidden;
          pointer-events:none;
          background:linear-gradient(180deg,#001b33,#002b44);
        }

        .flake {
          position:absolute;
          animation:fall linear infinite;
          will-change: transform, opacity;
        }

        @keyframes fall {
          0% { transform:translateY(0) rotate(0deg); opacity:1; }
          100% { transform:translateY(100vh) rotate(360deg); opacity:0; }
        }

        /* POPUP */
        .popup-overlay {
          position:fixed;
          top:0; left:0; right:0; bottom:0;
          background:rgba(0,0,0,0.6);
          display:${popupActivo ? "flex" : "none"};
          justify-content:center;
          align-items:center;
          z-index:9999;
          pointer-events:auto;
        }

        .popup-content {
          position:relative;
          background:#fff;
          border-radius:12px;
          max-width:400px;
          width:90%;
          padding:20px;
          text-align:center;
          box-shadow:0 8px 30px rgba(0,0,0,0.4);
          pointer-events:auto;
        }

        .popup-content img {
          max-width:100%;
          height:auto;
          border-radius:8px;
          margin-bottom:15px;
          display:block;
          object-fit:contain;
        }

        .popup-close {
          position:absolute;
          top:10px;
          right:10px;
          width:30px;
          height:30px;
          background:#d32f2f;
          color:#fff;
          font-weight:bold;
          border:none;
          border-radius:50%;
          cursor:pointer;
          display:flex;
          justify-content:center;
          align-items:center;
          font-size:18px;
          line-height:1;
        }

        .popup-content button {
          background:#00bcd4;
          color:#fff;
          border:none;
          padding:10px 18px;
          border-radius:6px;
          cursor:pointer;
          font-size:16px;
          margin-top:10px;
        }
      </style>

      ${dots}

      <div class="popup-overlay">
        <div class="popup-content">
          <button class="popup-close">&times;</button>
          ${popupImage ? `<img src="${popupImage}" alt="Promoción">` : ""}
          ${popupLink ? `<button onclick="window.open('${popupLink}','_blank')">Ver promoción</button>` : ""}
        </div>
      </div>
    `;

    const overlay = this.shadowRoot.querySelector(".popup-overlay");
    const closeBtn = this.shadowRoot.querySelector(".popup-close");

    // Cierra al dar click en la X
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        overlay.style.display = "none";
      });
    }

    // Cierra al click fuera del contenido
    if (overlay) {
      overlay.addEventListener("click", e => {
        if (e.target === overlay) overlay.style.display = "none";
      });
    }
  }
}

customElements.define("menutech-navidad", MenutechNavidad);









/******************************
 * MENUTECH PARTICLES
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

// ========================================================================
// Menutech hero
// ========================================================================



// ==================================================================
// Menutech View 3D
// ==================================================================
class MenutechModel3D extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="https://unpkg.com/@egjs/view3d@latest/css/view3d-bundle.min.css">
      <div id="view3d">
        <canvas class="view3d-canvas"></canvas>
        <div class="v3d-loader">
          <div class="v3d-loader-progress"></div>
        </div>
      </div>
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          position: relative;
        }
        #view3d {
          width: 100%;
          height: 100%;
          position: relative;
          overflow: hidden;
          background: #000;
        }
        .v3d-loader {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.4);
        }
        .v3d-loader-progress {
          width: 0%;
          height: 4px;
          background: #09f;
          transition: width 0.2s;
        }
      </style>
    `;
  }

  connectedCallback() {
    this.initView3D();
  }

  async initView3D() {
    if (typeof View3D === 'undefined') {
      await this.loadScript("https://unpkg.com/@egjs/view3d@latest/dist/view3d.pkgd.min.js");
    }
    const container = this.shadowRoot.querySelector("#view3d");

    const src = this.getAttribute("src") ||
      "https://vikingantonio.github.io/bddCards/assets/pos/pos.gltf";
    const poster = this.getAttribute("poster") || "./pos.png";

    const view3D = new View3D(container, {
      src,
      poster,
      autoInit: true,
    });
    const progressEl = this.shadowRoot.querySelector(".v3d-loader-progress");
    const loaderEl = this.shadowRoot.querySelector(".v3d-loader");

    view3D.on("loadStart", () => progressEl.style.width = "0%");
    view3D.on("progress", e => progressEl.style.width = (e.loaded * 100) + "%");
    view3D.on("load", () => loaderEl.style.display = "none");
    view3D.on("ready", () => {
      view3D.scene.scale.set(3, 3, 3);
      loaderEl.style.display = "none";
    });
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
}

customElements.define("menutech-model3d", MenutechModel3D);

// =========================================================
// Menutech form
// =========================================================

class MenutechForm extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    const bgColor = this.getAttribute('bg-color') || '#fff';
    const labelColor = this.getAttribute('label-color') || '#000';
    const inputColor = this.getAttribute('input-color') || '#000';
    const placeholderColor = this.getAttribute('placeholder-color') || '#000';
    const maxWidth = this.getAttribute('max-width') || '800px';
    const buttonColor = this.getAttribute('button-color') || '#f7d6d6';
    const buttonTextColor = this.getAttribute('button-text-color') || '#000';

    const scriptURL = "https://script.google.com/macros/s/AKfycbzkS-PWHOxgcpOPl_V179BTF8egKI8_yvJC6TaYVy2b1A1wbeHsaaVnHAqkJFU3rc9P9g/exec";

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
            popupText.textContent = " Mensaje enviado con éxito!";
            form.reset();
          } else {
            popupText.textContent = " Error al enviar. Intenta de nuevo.";
          }
          setTimeout(() => popup.classList.remove("show"), 2500);
        })
        .catch(err => {
          console.error(err);
          popupText.textContent = " Error al conectar con el servidor.";
          setTimeout(() => popup.classList.remove("show"), 2500);
        });
    });
  }
}

customElements.define('menutech-form', MenutechForm);

// ==============================================================================
// Menutech Morfico
// ==============================================================================

class MenutechNeomorphism extends HTMLElement {
  static get observedAttributes() {
    return ['color', 'radius', 'distance', 'blur', 'inset'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('neo');
    this.wrapper.innerHTML = `<slot></slot>`;

    const style = document.createElement('style');
    style.textContent = `
      :host {
        display: inline-block;
        padding: 1rem;
      }

      .neo {
        background: var(--neo-color, #e0e0e0);
        border-radius: var(--neo-radius, 20px);
        box-shadow:
          var(--neo-distance, 9px) var(--neo-distance, 9px) var(--neo-blur, 16px) #bebebe,
          calc(var(--neo-distance, 9px) * -1) calc(var(--neo-distance, 9px) * -1) var(--neo-blur, 16px) #ffffff;
        transition: all 0.25s ease;
      }

      .neo.inset {
        box-shadow:
          inset var(--neo-distance, 9px) var(--neo-distance, 9px) var(--neo-blur, 16px) #bebebe,
          inset calc(var(--neo-distance, 9px) * -1) calc(var(--neo-distance, 9px) * -1) var(--neo-blur, 16px) #ffffff;
      }
    `;

    this.shadowRoot.append(style, this.wrapper);
  }

  connectedCallback() {
    this.#updateStyle();
  }

  attributeChangedCallback() {
    this.#updateStyle();
  }

  #updateStyle() {
    const color = this.getAttribute('color') || '#e0e0e0';
    const radius = this.getAttribute('radius') || '20px';
    const distance = this.getAttribute('distance') || '9px';
    const blur = this.getAttribute('blur') || '16px';
    const inset = this.hasAttribute('inset');

    this.wrapper.style.setProperty('--neo-color', color);
    this.wrapper.style.setProperty('--neo-radius', radius);
    this.wrapper.style.setProperty('--neo-distance', distance);
    this.wrapper.style.setProperty('--neo-blur', blur);

    if (inset) this.wrapper.classList.add('inset');
    else this.wrapper.classList.remove('inset');
  }
}

customElements.define('menutech-neomorphism', MenutechNeomorphism);

// ==========================================================================
// Menutech Carrusel
// ==========================================================================

class MenuTechCarrusel extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    if (!this.querySelector('.menus')) {
      const container = document.createElement('div');
      container.classList.add('menus');
      container.innerHTML = `
        <div class="swiper-container">
          <div class="swiper-wrapper"></div>
          <div class="swiper-pagination"></div>
        </div>
      `;
      this.appendChild(container);
    }

    if (!this.querySelector('#popup')) {
      const popup = document.createElement('div');
      popup.id = 'popup';
      popup.classList.add('popup');
      popup.innerHTML = `
        <div class="popup-content">
          <span class="close">&times;</span>
          <iframe id="popupFrame" src="" frameborder="0"></iframe>
        </div>
      `;
      this.appendChild(popup);
    }

    if (!document.getElementById('menutech-carrusel-style')) {
      const style = document.createElement('style');
      style.id = 'menutech-carrusel-style';
      style.textContent = `
        menutech-carrusel {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: auto;
          box-sizing: border-box;
          padding: 40px 0;
        }
        .swiper-container {
          width: 100%;
          max-width: 1000px;
          overflow: hidden;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .swiper-wrapper {
          display: flex;
          align-items: center;
        }
        .swiper-slide {
          background-position: center;
          background-size: cover;
          display: flex;
          justify-content: center;
          align-items: center;
          transition: transform 0.5s ease;
        }
        .menus img {
          width: 100%;
          cursor: pointer;
          display: block;
          border-radius: 10px;
        }
        .popup {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.7);
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }
        .popup-content {
          background: #fff;
          width: 80%;
          max-width: 800px;
          height: 70%;
          border-radius: 10px;
          overflow: hidden;
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          flex-direction: column;
        }
        .popup-content iframe {
          width: 100%;
          max-width: 700px;
          height: 100%;
          border: none;
          margin: auto;
          display: block;
        }
        .close {
          position: absolute;
          top: 8px;
          right: 15px;
          font-size: 30px;
          font-weight: bold;
          color: #333;
          cursor: pointer;
          z-index: 10;
        }
      `;
      document.head.appendChild(style);
    }
    const loadSwiper = () => new Promise((resolve) => {
      if (window.Swiper) return resolve();

      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
    const wrapper = this.querySelector('.swiper-wrapper');
    const imagesAttr = this.getAttribute('images');
    const width = this.getAttribute('slide-width') || '300px';
    const height = this.getAttribute('slide-height') || '400px';

    const userSlides = imagesAttr
      ? imagesAttr.split(',').map(src => ({ src: src.trim() }))
      : Array.from({ length: 6 }, (_, i) => ({
          src: `https://placehold.co/500x500?text=Imagen+${i + 1}`,
        }));

    wrapper.innerHTML = '';
    userSlides.forEach(slide => {
      const div = document.createElement('div');
      div.classList.add('swiper-slide');
      div.style.width = width;
      div.style.height = height;
      div.innerHTML = `<img src="${slide.src}" data-url="${slide.url || ''}">`;
      wrapper.appendChild(div);
    });
    loadSwiper().then(() => {
      const container = this.querySelector('.swiper-container');
      const imgs = container.querySelectorAll('img');
      const allLoaded = Promise.all(
        Array.from(imgs).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => (img.onload = resolve));
        })
      );

      allLoaded.then(() => {
        const swiper = new Swiper(container, {
          effect: 'coverflow',
          grabCursor: true,
          centeredSlides: true,
          loop: true,
          autoplay: { delay: 2500, disableOnInteraction: false },
          coverflowEffect: {
            rotate: 40,
            stretch: 0,
            depth: 150,
            modifier: 1.5,
            slideShadows: true,
          },
          pagination: {
            el: this.querySelector('.swiper-pagination'),
            clickable: true,
          },
          breakpoints: {
            0: { slidesPerView: 1 },
            600: { slidesPerView: 2 },
            900: { slidesPerView: 3 },
          },
        });
      });
    });

    const popup = this.querySelector('#popup');
    const popupFrame = this.querySelector('#popupFrame');
    const closeBtn = this.querySelector('.close');

    const handleClick = (img) => {
      const url = img.getAttribute('data-url');
      if (url) {
        popupFrame.src = url;
        popup.style.display = 'flex';
      }
    };

    const assignPopupEvents = () => {
      this.querySelectorAll('.swiper-slide img').forEach((img) => {
        img.removeEventListener('click', img._popupClick);
        img._popupClick = () => handleClick(img);
        img.addEventListener('click', img._popupClick);
      });
    };

    assignPopupEvents();
    const observer = new MutationObserver(() => assignPopupEvents());
    observer.observe(wrapper, { childList: true });

    closeBtn.addEventListener('click', () => {
      popup.style.display = 'none';
      popupFrame.src = '';
    });
    popup.addEventListener('click', (e) => {
      if (e.target === popup) {
        popup.style.display = 'none';
        popupFrame.src = '';
      }
    });
  }
}

customElements.define('menutech-carrusel', MenuTechCarrusel);




// ==========================================================================================================================
// Menutech Navbar
// ==========================================================================================================================

class MenutechNavbar extends HTMLElement {
  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.render();
  }

  static get observedAttributes() {
    return [
      "color", "opacity", "text-color", "hover-color",
      "link1", "link2", "link3", "link4", "link5",
      "text1", "text2", "text3", "text4", "text5",
      "icon1", "icon2", "icon3", "icon4", "icon5"
    ];
  }

  attributeChangedCallback(name, oldValue, newValue) {

    if (!this.shadowRoot) return;

    if (name.startsWith("text")) {
      const index = parseInt(name.replace("text", "")) - 1;
      const spans = this.shadowRoot.querySelectorAll("a span");
      if (spans[index]) spans[index].textContent = newValue || "";
    }

    if (name.startsWith("link")) {
      const index = parseInt(name.replace("link", "")) - 1;
      const links = this.shadowRoot.querySelectorAll("a");
      if (links[index]) links[index].href = newValue || "#";
    }

    if (name.startsWith("icon")) {
      const index = parseInt(name.replace("icon", "")) - 1;
      const icons = this.shadowRoot.querySelectorAll("a i");
      if (icons[index]) icons[index].className = newValue || "ri-question-line";
    }

    if (name === "color" || name === "opacity") {
      const color = this.getAttribute("color") || "#e0e0e0";
      const opacity = this.getAttribute("opacity") || "0.7";
      const navbar = this.shadowRoot.querySelector(".neo-navbar");
      if (navbar) navbar.style.background = `rgba(${this.hexToRgb(color)}, ${opacity})`;
    }

    if (name === "text-color") {
      const val = this.getAttribute("text-color") || "#444";
      this.shadowRoot.querySelectorAll("a").forEach(a => a.style.color = val);
    }

    if (name === "hover-color") {
      const val = this.getAttribute("hover-color") || "#007aff";
      this.shadowRoot.querySelectorAll("a:hover, a:hover i").forEach(el => el.style.color = val);
    }
  }

  render() {
    const color = this.getAttribute("color") || "#e0e0e0";
    const opacity = this.getAttribute("opacity") || "0.7";

    const links = [
      this.getAttribute("link1") || "index.html",
      this.getAttribute("link2") || "index.html#services",
      this.getAttribute("link3") || "index.html#gallery",
      this.getAttribute("link4") || "index.html#contact",
      this.getAttribute("link5") || ""
    ];

    const icons = [
      this.getAttribute("icon1") || "ri-home-5-line",
      this.getAttribute("icon2") || "ri-tools-line",
      this.getAttribute("icon3") || "ri-image-2-line",
      this.getAttribute("icon4") || "ri-mail-line",
      this.getAttribute("icon5") || ""
    ];

    const texts = [
      this.getAttribute("text1") || "Home",
      this.getAttribute("text2") || "Services",
      this.getAttribute("text3") || "Gallery",
      this.getAttribute("text4") || "Contact",
      this.getAttribute("text5") || ""
    ];

    this.shadow.innerHTML = `
      <link href="https://cdn.jsdelivr.net/npm/remixicon@4.3.0/fonts/remixicon.css" rel="stylesheet">
      <style>
        :host {
          font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
        }

        .neo-navbar {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          width: 760px;
          padding: 14px 30px;
          background: rgba(${this.hexToRgb(color)}, ${opacity});
          border-radius: 35px;
          box-shadow:
            8px 8px 16px rgba(0,0,0,0.15),
            -8px -8px 16px rgba(255,255,255,0.9);
          display: flex;
          justify-content: space-around;
          align-items: center;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
          z-index: 1000;
        }

        a {
          text-decoration: none;
          color: #444;
          font-size: 0.9rem;
          font-weight: 500;
          padding: 10px 18px;
          border-radius: 18px;
          background: rgba(${this.hexToRgb(color)}, 0.4);
          box-shadow:
            inset 2px 2px 4px rgba(255,255,255,0.6),
            inset -2px -2px 4px rgba(190,190,190,0.5);
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.25s ease;
        }

        a i {
          font-size: 1.3rem;
          opacity: 0.75;
          transition: all 0.25s ease;
        }

        a:hover {
          color: #007aff;
          box-shadow:
            inset 3px 3px 6px rgba(190,190,190,0.65),
            inset -3px -3px 6px rgba(255,255,255,0.7);
          transform: translateY(-2px);
        }

        a:hover i {
          color: #007aff;
          opacity: 1;
        }

        /* ===== RESPONSIVE ===== */
        @media (max-width: 768px) {
          .neo-navbar {
            width: 90%;
            padding: 10px 20px;
            border-radius: 25px;
          }

          a {
            padding: 10px;
            border-radius: 15px;
            font-size: 0; /* oculta el texto */
            background: rgba(${this.hexToRgb(color)}, 0.35);
          }

          a i {
            font-size: 1.5rem;
            opacity: 0.85;
          }

          a:hover {
            transform: translateY(-3px);
          }
        }
      </style>

      <nav class="neo-navbar">
        ${links.map((href, i) => texts[i] ? `
          <a href="${href.trim()}">
            <i class="${icons[i] ? icons[i].trim() : 'ri-question-line'}"></i>
            <span>${texts[i].trim()}</span>
          </a>
        ` : "").join('')}
      </nav>
    `;
  }

  hexToRgb(hex) {
    hex = hex.replace(/^#/, "");
    if (hex.length === 3) hex = hex.split("").map(x => x + x).join("");
    const num = parseInt(hex, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `${r},${g},${b}`;
  }
}

customElements.define("menutech-navbar", MenutechNavbar);



















