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



