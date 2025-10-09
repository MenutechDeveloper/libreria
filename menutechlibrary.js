class MenutechGradient extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    // 🎨 Valores por defecto
    const defaultColors = "#ff6b6b,#f06595,#845ef7,#339af0,#22b8cf,#51cf66,#fcc419";
    const colors = this.getAttribute("colors") || defaultColors;

    const speed = this.getAttribute("speed") || "15s"; // duración de animación
    const angle = this.getAttribute("angle") || "45deg"; // ángulo del gradiente
    const overlayOpacity = this.getAttribute("overlay-opacity") || 0.1; // transparencia de la superposición
    const blur = this.getAttribute("blur") || "10px"; // desenfoque

    // 🌈 Estructura y estilos internos del componente
    shadow.innerHTML = `
      <style>
        :host {
          display: block;
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          overflow: hidden;
          z-index: -1;
        }

        .background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(${angle}, ${colors});
          background-size: 400% 400%;
          animation: gradientShift ${speed} ease infinite;
        }

        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(255,255,255,${overlayOpacity});
          backdrop-filter: blur(${blur});
          z-index: 0;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      </style>

      <div class="background"></div>
      <div class="overlay"></div>
      <slot></slot>
    `;
  }
}

customElements.define("menutech-gradient", MenutechGradient);

// --------------------------------------------------------------------------------------------------
// MENUTECH PARTICLES
class MenutechParticles extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    // Valores por defecto
    const count = parseInt(this.getAttribute("count")) || 50;
    const color = this.getAttribute("color") || "#ffffff";
    const size = parseInt(this.getAttribute("size")) || 5;
    const speed = parseFloat(this.getAttribute("speed")) || 1;
    const image = this.getAttribute("image") || null;

    // Canvas para las partículas
    shadow.innerHTML = `
      <style>
        :host { position: fixed; top:0; left:0; width:100vw; height:100vh; pointer-events:none; z-index:1000; }
        canvas { width:100%; height:100%; display:block; }
      </style>
      <canvas></canvas>
    `;

    const canvas = shadow.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    let particles = [];

    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Crear partículas
    for(let i=0; i<count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random()-0.5) * speed,
        vy: (Math.random()-0.5) * speed,
        size: size * (0.5 + Math.random()), // tamaño aleatorio cerca del size
      });
    }

    // Cargar imagen si se proporciona
    let particleImage = null;
    if(image) {
      particleImage = new Image();
      particleImage.src = image;
    }

    // Animación
    function animate() {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      for(let p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Rebotar en los bordes
        if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if(p.y < 0 || p.y > canvas.height) p.vy *= -1;

        // Dibujar partícula
        if(particleImage && particleImage.complete) {
          ctx.drawImage(particleImage, p.x - p.size/2, p.y - p.size/2, p.size, p.size);
        } else {
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
          ctx.fill();
        }
      }
      requestAnimationFrame(animate);
    }
    animate();
  }
}
customElements.define("menutech-particles", MenutechParticles);



