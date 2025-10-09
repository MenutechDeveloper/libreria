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
  // Definir qué atributos serán observados para cambios dinámicos
  static get observedAttributes() {
    return ["colors", "speed", "angle", "overlay-opacity", "blur"];
  }

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
  }

  // Cuando el elemento se inserta en el DOM
  connectedCallback() {
    this.render();
  }

  // Cuando alguno de los atributos cambia
  attributeChangedCallback() {
    this.render();
  }

  // Función para renderizar el componente
  render() {
    // Obtener valores de los atributos o usar valores por defecto
    const colors = this.getAttribute("colors") || "#ff6b6b,#f06595,#845ef7,#339af0,#22b8cf,#51cf66,#fcc419";
    const speed = this.getAttribute("speed") || "15s";
    const angle = this.getAttribute("angle") || "45deg";
    const overlayOpacity = this.getAttribute("overlay-opacity") || 0.1;
    const blur = this.getAttribute("blur") || "10px";

    // Insertar HTML y CSS dentro del shadow DOM
    this.shadow.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          top:0; left:0;
          width:100vw;
          height:100vh;
          overflow:hidden;
          z-index:-1; /* siempre en el fondo */
        }
        .background {
          position:absolute;
          top:0; left:0;
          width:100%;
          height:100%;
          background: linear-gradient(${angle}, ${colors});
          background-size: 400% 400%;
          animation: gradientShift ${speed} ease infinite;
        }
        .overlay {
          position:absolute;
          top:0; left:0;
          width:100%;
          height:100%;
          background: rgba(255,255,255,${overlayOpacity});
          backdrop-filter: blur(${blur});
          z-index:0;
        }
        @keyframes gradientShift {
          0% { background-position:0% 50%; }
          50% { background-position:100% 50%; }
          100% { background-position:0% 50%; }
        }
      </style>

      <div class="background"></div>
      <div class="overlay"></div>
      <slot></slot>
    `;
  }
}

// Registrar la etiqueta
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




