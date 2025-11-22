// menutechui.js
// Menutech Chatbot Web Component (Shadow DOM)
// - Loads KB from https://menutechdeveloper.github.io/databasewindows/kb.json
// - Always-visible floating icon, toggle chat open/close
// - No editor, no fallback KB in localStorage, history persisted locally
// - Shows fallback message only when user asks something unknown
class MenutechChatbot extends HTMLElement {
  constructor() {
    super();
    this.kbUrl = 'https://script.google.com/macros/s/AKfycbyCPz710krQ7-9AzNO9u-AS5yjH7EJ3X8Lo-S73r_JBrpaf8_tJUFQadh5uenV5u-8F/exec';
    this.historyKey = 'menutech_chat_history_v1';
    this.kb = [];
    this.history = JSON.parse(localStorage.getItem(this.historyKey) || '[]');

    this.shadow = this.attachShadow({ mode: 'open' });
    this.render();
    this.bindElements();
    this.loadKB();
    this.renderHistory();

    // Vosk: rutas y estado
    this._voskBundleUrl = 'https://unpkg.com/vosk-browser@0.0.6/dist/bundle.esm.js';
    this._voskAudioProcessorUrl = 'https://unpkg.com/vosk-browser@0.0.6/dist/vosk-audio-processor.js';
    this._voskModelUrl = 'https://menutech.xyz/vosk/model/';
    this._vosk = null;
    this._model = null;
    this._recognizer = null;
    this._audioCtx = null;
    this._workletNode = null;
    this._mediaStream = null;
    this._listening = false;
    this._sampleRate = 16000;
    this._voskReady = false;
  }

  render() {
    this.shadow.innerHTML = `
<style>
:host { all: initial; font-family: Inter, system-ui, Arial, sans-serif; }
.chat-toggle{
  position:fixed;
  right:20px;
  bottom:20px;
  width:56px;height:56px;border-radius:50%;
  background:#fff;color:#fff;border:none;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 6px 18px rgba(10,10,10,.18);cursor:pointer;
  z-index:999999;font-size:22px;
}
.chat-window{
  position:fixed;right:20px;bottom:88px;width:360px;height:640px;max-height:90vh;
  background:#ffffff;border-radius:12px;box-shadow:0 16px 40px rgba(10,10,10,.2);
  display:flex;flex-direction:column;overflow:hidden;
  z-index:999998;border:1px solid rgba(0,0,0,.06);
}
.chat-header{
  padding:12px 14px;
  background: linear-gradient(90deg,#ff7a00,#ff9b3a);
  color:#fff;display:flex;align-items:center;justify-content:space-between;
}
.chat-body{padding:12px;overflow:auto;flex:1;background:linear-gradient(#fff,#fbfbfb)}
.msg{margin-bottom:10px;display:flex}
.msg.user{justify-content:flex-end}
.bubble{
  max-width:78%;padding:10px 12px;border-radius:12px;
  background:#f1f5ff;color:#111;
}
.msg.user .bubble{
  background:#ffd9b3;color:#000;
}
.chat-input{
  display:flex;
  align-items:center;
  gap:10px;
  padding:10px 12px;
  border-top:1px solid #eee;
  background:#fff;
  height:64px; /* evita que se corte nada */
  box-sizing:border-box;
}
.chat-input input{
  flex:1;
  padding:12px 14px;
  border-radius:10px;
  border:1px solid #d5d5d5;
  font-size:15px;
  min-width:0;
}
.chat-input button.iconbtn{
  padding:8px;
  background:transparent;
  border:none;
  border-radius:8px;
  cursor:pointer;
  font-size:20px;
  color:#ff7a00;
  flex-shrink:0;
}
.chat-input button.send{
  padding:10px 16px;
  border-radius:10px;
  border:none;
  background:#ff7a00;
  color:#fff;
  cursor:pointer;
  font-size:15px;
  font-weight:600;
  flex-shrink:0;
}
@keyframes bubble-delete {
  0% { opacity:1; transform:scale(1); }
  100% { opacity:0; transform:scale(0.7); }
}
.bubble.deleting { animation: bubble-delete .35s ease forwards; }
.iconbtn img,
.iconbtn svg { width:22px;height:22px;display:block;pointer-events:none; }
</style>

<button id="openBtn" class="chat-toggle" title="Abrir chat">
  <img id="openIcon" src="https://menutechdeveloper.github.io/databasewindows/img/icon.png"
  style="width:32px;height:32px;border-radius:50%" alt="abrir chat" />
</button>

<div id="chat" class="chat-window" style="display:none" aria-hidden="true">
  <div class="chat-header">
    <div><strong>Asistente</strong><div style="font-size:12px;opacity:.9">Soporte autom¨¢tico</div></div>
    <button id="closeBtn" style="background:transparent;border:none;color:#fff;font-size:18px;cursor:pointer">
      <img src="https://menutechdeveloper.github.io/libreria/icons/close.svg" style="width:20px;height:20px;filter:invert(1)">
    </button>
  </div>

  <div id="body" class="chat-body"></div>

  <div class="chat-input">
    <button id="micBtn" class="iconbtn" title="Hablar"><img id="micIcon" src="https://menutechdeveloper.github.io/libreria/icons/mic.svg"></button>
    <button id="clearBtn" class="iconbtn" title="Limpiar historial"><img src="https://menutechdeveloper.github.io/libreria/icons/trash.svg"></button>
    <input id="messageInput" placeholder="Escribe tu pregunta..." />
    <button id="sendBtn" class="send">Enviar</button>
  </div>
</div>
`;
  }

  bindElements() {
    const s = this.shadow;
    this.openBtn = s.getElementById('openBtn');
    this.chat = s.getElementById('chat');
    this.closeBtn = s.getElementById('closeBtn');
    this.bodyEl = s.getElementById('body');
    this.input = s.getElementById('messageInput');
    this.sendBtn = s.getElementById('sendBtn');
    this.clearBtn = s.getElementById('clearBtn');
    this.micBtn = s.getElementById('micBtn');

    this.openBtn.addEventListener('click', () => {
      const isOpen = this.chat.style.display === 'flex';
      this.chat.style.display = isOpen ? 'none' : 'flex';
      this.chat.setAttribute('aria-hidden', isOpen ? 'true' : 'false');
      if (!isOpen) this.input.focus();
    });

    this.closeBtn.addEventListener('click', () => {
      this.chat.style.display = 'none';
      this.chat.setAttribute('aria-hidden', 'true');
    });

    this.sendBtn.addEventListener('click', () => {
      this.userSend(this.input.value);
      this.input.value = '';
      this.input.focus();
    });

    this.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (this.input.value.trim() !== "") this.sendBtn.click();
      }
    });

    this.clearBtn.addEventListener('click', () => {
      const bubbles = this.shadow.querySelectorAll('.bubble');
      if (bubbles.length === 0) return;
      bubbles.forEach((bub, i) => setTimeout(() => bub.classList.add('deleting'), i * 60));
      setTimeout(() => {
        this.history = [];
        localStorage.setItem(this.historyKey, JSON.stringify([]));
        this.renderHistory();
        this.showClearedMessage();
      }, bubbles.length * 60 + 350);
    });

    this.initVosk();
  }

  async initVosk() {
    try {
      const mod = await import(this._voskBundleUrl);
      this._vosk = mod;
      if (!this._vosk || !this._vosk.Model) {
        console.warn('Vosk bundle cargado pero no se encontr¨® exportaci¨®n Model.');
        return;
      }

      this._model = new this._vosk.Model(this._voskModelUrl);
      await (this._model.init?.() || Promise.resolve());

      this.micIcon = this.shadow.getElementById("micIcon");

      this.micBtn.addEventListener('click', async () => {
        if (this._listening) this.stopVosk();
        else await this.startVosk();
      });

      this._voskReady = true;
    } catch (err) {
      console.error('Error inicializando Vosk:', err);
      this.micBtn.style.opacity = 0.35;
      this.micBtn.title = 'Reconocimiento Vosk no disponible';
    }
  }

  async startVosk() {
    if (!this._voskReady) return;
    try {
      this.micIcon.src = "https://menutechdeveloper.github.io/libreria/icons/mic-listening.svg";
      this._mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: this._sampleRate });
      await this._audioCtx.audioWorklet.addModule(this._voskAudioProcessorUrl).catch(() => console.warn('AudioWorklet no disponible'));

      const src = this._audioCtx.createMediaStreamSource(this._mediaStream);
      this._recognizer = new this._vosk.Recognizer({ model: this._model, sampleRate: this._sampleRate });
      await (this._recognizer.init?.() || Promise.resolve());

      if (typeof AudioWorkletNode === 'function') {
        this._workletNode = new AudioWorkletNode(this._audioCtx, 'VoskAudioProcessor');
        src.connect(this._workletNode);
        this._workletNode.connect(this._audioCtx.destination);
        this._workletNode.port.onmessage = ev => {
          const accepted = this._recognizer.acceptWaveform(ev.data);
          if (accepted) {
            const res = this._recognizer.finalResult?.() || {};
            const text = res.text || '';
            if (text.trim()) {
              this.input.value = text;
              this.sendBtn.click();
              this.stopVosk();
            }
          }
        };
      } else {
        const processor = this._audioCtx.createScriptProcessor(4096, 1, 1);
        src.connect(processor);
        processor.connect(this._audioCtx.destination);
        processor.onaudioprocess = e => {
          const channelData = e.inputBuffer.getChannelData(0);
          this._recognizer.acceptWaveform(channelData);
          const final = this._recognizer.finalResult?.() || {};
          if (final.text && final.text.trim()) {
            this.input.value = final.text;
            this.sendBtn.click();
            this.stopVosk();
          }
        };
        this._workletNode = processor;
      }

      this._listening = true;
    } catch (err) {
      console.error('startVosk error', err);
      this.stopVosk();
    }
  }

  stopVosk() {
    try {
      if (this._mediaStream) this._mediaStream.getTracks().forEach(t => t.stop());
      if (this._workletNode) this._workletNode.disconnect();
      this._audioCtx?.close();
    } catch (e) {
      console.warn('stopVosk error', e);
    } finally {
      this._audioCtx = null;
      this._workletNode = null;
      this._recognizer = null;
      this._mediaStream = null;
      this._listening = false;
      if (this.micIcon) this.micIcon.src = "https://menutechdeveloper.github.io/libreria/icons/mic.svg";
    }
  }

  showClearedMessage() {
    const msg = document.createElement('div');
    msg.style.textAlign = "center";
    msg.style.opacity = "0";
    msg.style.padding = "10px";
    msg.style.color = "#ff7a00";
    msg.style.fontWeight = "600";
    msg.style.transition = "opacity .4s ease";
    msg.textContent = "7½8 Historial borrado";
    this.bodyEl.appendChild(msg);
    requestAnimationFrame(() => msg.style.opacity = "1");
    setTimeout(() => { msg.style.opacity = "0"; setTimeout(() => msg.remove(), 300); }, 1800);
  }
  normalize(str){
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}


async loadKB() {
  try {
    const url = this.kbUrl + "?v=" + Date.now();

    const res = await fetch(url, {
      method: 'GET',
      cache: 'no-store'
    });

    const data = await res.json();

    this.kb = {};

    data.forEach(row => {
      const key = this.normalize(row.q);
      this.kb[key] = row.a;
    });

    console.log("KB cargada:", this.kb);

  } catch (err) {
    console.error("Error al cargar KB:", err);
    this.kb = {};
  }
}


  tokenize(text) { return (text || '').toLowerCase().replace(/[^\w\s0Š9¨¢¨¦¨ª¨®¨²¨¹]/g, ' ').split(/\s+/).filter(Boolean); }
  buildTf(tokens) { const tf = {}; tokens.forEach(t => tf[t] = (tf[t] || 0) + 1); return tf; }
  dot(a, b) { let s = 0; for (const k in a) if (b[k]) s += a[k] * b[k]; return s; }
  norm(a) { let s = 0; for (const k in a) s += a[k] * a[k]; return Math.sqrt(s); }
  cosineSim(aTokens, bTokens) { const A = this.buildTf(aTokens), B = this.buildTf(bTokens); const d = this.dot(A, B); const n = this.norm(A) * this.norm(B); return n === 0 ? 0 : d / n; }

  findBestAnswer(query) {
    const qTokens = this.tokenize(query);
    let best = { score: 0, index: -1 };
    this.kb.forEach((item, i) => {
      const s = this.cosineSim(qTokens, this.tokenize(item.q + ' ' + item.a));
      if (s > best.score) { best.score = s; best.index = i; }
    });
    return best;
  }

  userSend(text) {
    if (!text || !text.trim()) return;
    this.history.push({ role: 'user', text });
    localStorage.setItem(this.historyKey, JSON.stringify(this.history));
    this.renderHistory();
    const best = this.findBestAnswer(text);
    const THRESHOLD = 0.18;
    if (best.score >= THRESHOLD) {
      const kbEntry = this.kb[best.index];
      this.botReply(kbEntry.a);
    } else {
      this.botReply("Lo siento, no tengo una respuesta segura para eso. 0†7Quieres que agregue esta pregunta a las FAQs?");
    }
  }

  botReply(text) {
    this.history.push({ role: 'bot', text });
    localStorage.setItem(this.historyKey, JSON.stringify(this.history));
    this.renderHistory();
  }

  renderHistory() {
    this.bodyEl.innerHTML = '';
    this.history.forEach(m => {
      const div = document.createElement('div');
      div.className = 'msg ' + (m.role === 'user' ? 'user' : 'bot');
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.innerHTML = this.escapeHtml(m.text).replace(/\n/g, '<br>');
      div.appendChild(bubble);
      this.bodyEl.appendChild(div);
    });
    this.bodyEl.scrollTop = this.bodyEl.scrollHeight;
  }

  escapeHtml(s) {
    return (s || '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  static get observedAttributes() { return ['kb-url', 'icon']; }
  attributeChangedCallback(name, oldV, newV) {
    if (name === 'kb-url' && newV) this.kbUrl = newV;
    if (name === 'icon' && newV) {
      const img = this.shadow.getElementById('openIcon');
      if (img) img.src = newV;
    }
  }
}

customElements.define('menutech-chatbot', MenutechChatbot);















/******************************
 * MENUTECH DRAWER
 ******************************/
class MenutechDrawer extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    // ===== CSS =====
    const style = document.createElement("style");
    style.textContent = `
      .nav-container {
        position: fixed;
        left: 20px;
        top: 50%;
        transform: translateY(-50%);
        width: 80px;
        height: 260px;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .nav {
        position: relative;
        width: 80px;
        height: 260px;
      }

      .icon {
        position: absolute;
        width: 42px;
        height: 42px;
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        transition:
          transform 0.5s cubic-bezier(0.25, 1.4, 0.4, 1),
          top 0.6s cubic-bezier(0.25, 1.4, 0.4, 1),
          left 0.6s cubic-bezier(0.25, 1.4, 0.4, 1),
          opacity 0.5s ease;
        opacity: 0;
        transform: scale(0.6);
      }

      .icon:hover {
        transform: scale(1.35) !important;
      }

      .nav:not(:hover) .icon {
        opacity: 0;
        pointer-events: none;
        transform: scale(0.6);
      }
      .nav:not(:hover) .icon.last {
        opacity: 1 !important;
        pointer-events: auto !important;
        transform: scale(1) !important;
      }

      .icon {
        left: 5px;
        top: 110px;
      }

      /* Media luna ampliada */
      .nav:hover .icon:nth-child(1) { top: -40px; left: -10px; opacity: 1; transform: scale(1); }
      .nav:hover .icon:nth-child(2) { top: 30px;  left: 25px;  opacity: 1; transform: scale(1); }
      .nav:hover .icon:nth-child(3) { top: 120px; left: 55px;  opacity: 1; transform: scale(1); }
      .nav:hover .icon:nth-child(4) { top: 210px; left: 25px;  opacity: 1; transform: scale(1); }
      .nav:hover .icon:nth-child(5) { top: 280px; left: -10px; opacity: 1; transform: scale(1); }

      img {
        width: 100%;
        height: 100%;
        pointer-events: none;
      }
    `;

    // ===== HTML =====
    const wrapper = document.createElement("div");
    wrapper.classList.add("nav-container");
    wrapper.innerHTML = `
      <div class="nav">
        <div class="icon"><img src="https://menutechdeveloper.github.io/libreria/icons/mago.svg"></div>
        <div class="icon"><img src="https://menutechdeveloper.github.io/libreria/icons/close.svg"></div>
        <div class="icon last"><img src="https://menutechdeveloper.github.io/libreria/icons/trash.svg"></div>
        <div class="icon"><img src="https://menutechdeveloper.github.io/libreria/icons/mic.svg"></div>
        <div class="icon"><img src="https://menutechdeveloper.github.io/libreria/icons/mago.svg"></div>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(wrapper);
  }

  connectedCallback() {
    this.initializeBehavior();
  }

  initializeBehavior() {
    const icons = this.shadowRoot.querySelectorAll(".icon");
    let lastIcon = this.shadowRoot.querySelector(".icon.last");

    // Sonidos suaves por defecto
    const soundEnter = new Audio("https://actions.google.com/sounds/v1/cartoon/wood_plank_flicks.ogg");
    const soundMove = new Audio("https://actions.google.com/sounds/v1/cartoon/pop.ogg");

    icons.forEach(icon => {
      icon.addEventListener("mouseenter", () => {
        soundEnter.currentTime = 0;
        soundMove.currentTime = 0;
        soundEnter.play();
        soundMove.play();

        lastIcon.classList.remove("last");
        icon.classList.add("last");
        lastIcon = icon;
      });
    });

    icons.forEach(icon => {
      icon.addEventListener("click", () => {
        const url = icon.dataset.url;
        if (url) window.open(url);
      });
    });
  }
}

customElements.define("menutech-drawer", MenutechDrawer);









/******************************
 * MENUTECH THEMES
 ******************************/
class MenutechThemes extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
#theme-dropdown {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f1f1f1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 18px rgba(0,0,0,0.15);
  cursor: pointer;
  transition: transform .14s ease;
}
#theme-dropdown:hover { transform: scale(1.08); }

#theme-panel {
  position: fixed;
  top: 70px;
  right: 16px;
  z-index: 9998;
  background: rgba(250,250,250,0.96);
  padding: 12px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15);
  display: none;
  grid-template-columns: repeat(3, 60px);
  gap: 10px;
  width: max-content;
  backdrop-filter: blur(6px);
}
#theme-panel.active { display: grid; animation: pop .18s ease; }
@keyframes pop { from {opacity:0; transform:translateY(-8px) scale(.96);} to {opacity:1; transform:none;} }

.theme-option {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 2px solid rgba(0,0,0,0.12);
  cursor: pointer;
  transition: transform .12s ease, box-shadow .12s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}
.theme-option:hover { transform: scale(1.1); box-shadow: 0 6px 18px rgba(0,0,0,0.15); }

#liquid-bg {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -2;
  transition: opacity .6s ease;
  background: transparent;
}
#liquid-bg.hidden { opacity: 0; pointer-events: none; }

/* OVERLAY */
#overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.0);
  z-index: -1;
  pointer-events: none;
  transition: background .3s ease;
}

/* Overlay controls inside panel */
#overlay-controls {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  background: rgba(255,255,255,0.9);
  padding: 8px 10px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.0);
  backdrop-filter: blur(6px);
  margin-top: 6px;
}
#overlay-range {
  width: 100px;
}
#overlay-toggle {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  background: #e5e5e5;
  user-select: none;
  font-size: 12px;
  font-weight: 600;
}

body.white-mode { background: #fff; color: #222; transition: background .6s, color .6s; }
body.dark-mode { background: #0d0d0d; color: #fff; transition: background .6s, color .6s; }
body.pastel-mode { background: #ffb6c1; color: #4b2e2e; transition: background .6s, color .6s; }

.theme-option[data-theme="white"] { background: #ffffff; }
.theme-option[data-theme="dark"]  { background: #111111; }
.theme-option[data-theme="pastel"] { background: linear-gradient(135deg,#ffb6c1,#ffe6eb); }

.theme-option[data-theme="waves-blue"]  { background: linear-gradient(135deg,#6ec1e4,#b3e5fc); }
.theme-option[data-theme="waves-pink"]  { background: linear-gradient(135deg,#ff7eb3,#ff9a9e); }
.theme-option[data-theme="waves-green"] { background: linear-gradient(135deg,#9be15d,#00e3ae); }

.theme-option[data-theme^="fog-"] { background-size: cover; }
.theme-option[data-theme="fog-1"] { background: linear-gradient(135deg,#a18cd1,#fbc2eb); }
.theme-option[data-theme="fog-2"] { background: linear-gradient(135deg,#84fab0,#8fd3f4); }
.theme-option[data-theme="fog-3"] { background: linear-gradient(135deg,#ffd194,#f6d365); }
.theme-option[data-theme="fog-4"] { background: linear-gradient(135deg,#ff9a9e,#fecfef); }
.theme-option[data-theme="fog-5"] { background: linear-gradient(135deg,#c2e9fb,#a1c4fd); }
.theme-option[data-theme="fog-6"] { background: linear-gradient(135deg,#fbc2eb,#a6c1ee); }

.theme-option[data-theme="clouds-1"] { background: linear-gradient(135deg,#e0eafc,#cfdef3); }
.theme-option[data-theme="clouds-2"] { background: linear-gradient(135deg,#fbc2eb,#a6c1ee); }
.theme-option[data-theme="clouds-3"] { background: linear-gradient(135deg,#fddb92,#d1fdff); }

.theme-option[data-theme="liquid-1"] { background: linear-gradient(135deg,#89f7fe,#66a6ff); }
.theme-option[data-theme="liquid-2"] { background: linear-gradient(135deg,#c471f5,#fa71cd); }
.theme-option[data-theme="liquid-3"] { background: linear-gradient(135deg,#f6d365,#fda085); }

.theme-option[data-theme="birds-1"] { background: linear-gradient(135deg,#8EC5FC,#E0C3FC); }
.theme-option[data-theme="birds-2"] { background: linear-gradient(135deg,#F6D365,#FDA085); }
.theme-option[data-theme="birds-3"] { background: linear-gradient(135deg,#84FAB0,#8FD3F4); }

@media(max-width:600px){
  #theme-panel { grid-template-columns: repeat(3,48px); gap:8px; padding:10px; }
  .theme-option { width:48px; height:48px; }
}
    `;

    const container = document.createElement("div");
    container.innerHTML = `
<div id="theme-dropdown" title="Abrir selector">🎨</div>
<div id="theme-panel" aria-hidden="true">
  <div class="theme-option" data-theme="white" title="Blanco"></div>
  <div class="theme-option" data-theme="dark" title="Oscuro"></div>
  <div class="theme-option" data-theme="pastel" title="Pastel Rosa"></div>

  <div class="theme-option" data-theme="waves-blue"></div>
  <div class="theme-option" data-theme="waves-pink"></div>
  <div class="theme-option" data-theme="waves-green"></div>

  <div class="theme-option" data-theme="fog-1"></div>
  <div class="theme-option" data-theme="fog-2"></div>
  <div class="theme-option" data-theme="fog-3"></div>
  <div class="theme-option" data-theme="fog-4"></div>
  <div class="theme-option" data-theme="fog-5"></div>
  <div class="theme-option" data-theme="fog-6"></div>

  <div class="theme-option" data-theme="clouds-1"></div>
  <div class="theme-option" data-theme="clouds-2"></div>
  <div class="theme-option" data-theme="clouds-3"></div>

  <div class="theme-option" data-theme="liquid-1"></div>
  <div class="theme-option" data-theme="liquid-2"></div>
  <div class="theme-option" data-theme="liquid-3"></div>

  <div class="theme-option" data-theme="birds-1"></div>
  <div class="theme-option" data-theme="birds-2"></div>
  <div class="theme-option" data-theme="birds-3"></div>

  <div id="overlay-controls">
    <input type="range" id="overlay-range" min="0" max="100" value="0">
    <div id="overlay-toggle">Negro</div>
  </div>
</div>
<div id="liquid-bg" aria-hidden="true"></div>
<div id="overlay"></div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(container);
  }

  connectedCallback() {
    this.initExternalMode();
  }

  initExternalMode() {
    const shadow = this.shadowRoot;
    const btn = shadow.querySelector("#theme-dropdown");
    const panel = shadow.querySelector("#theme-panel");
    const bg = shadow.querySelector("#liquid-bg");
    const overlay = shadow.querySelector("#overlay");
    const range = shadow.querySelector("#overlay-range");
    const toggle = shadow.querySelector("#overlay-toggle");
    let vantaEffect = null;
    let metaballsInstance = null;

    // Overlay controls logic
    let overlayColor = "black";
    function applyOverlay() {
      const val = (range && range.value ? range.value : 10) / 100;
      overlay.style.background = overlayColor === "black"
        ? `rgba(0,0,0,${val})`
        : `rgba(255,255,255,${val})`;
    }
    if (range) range.addEventListener("input", applyOverlay);
    if (toggle) toggle.addEventListener("click", () => {
      overlayColor = overlayColor === "black" ? "white" : "black";
      toggle.textContent = overlayColor === "black" ? "Negro" : "Blanco";
      applyOverlay();
    });
    applyOverlay();

    function loadScriptsSequential(urls, cb) {
      let i = 0;
      function next() {
        if (i >= urls.length) return cb && cb();
        const s = document.createElement("script");
        s.src = urls[i++];
        s.onload = next;
        s.onerror = next;
        document.head.appendChild(s);
      }
      next();
    }

    const libs = [
      "https://cdnjs.cloudflare.com/ajax/libs/three.js/r121/three.min.js",
      "https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.waves.min.js",
      "https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js",
      "https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.clouds.min.js",
      "https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.birds.min.js"
    ];

    loadScriptsSequential(libs, () => {
      function Metaballs(container, opts = {}) {
        const cfg = Object.assign({
          count: 8,
          colors: ['#66a6ff','#89f7fe','#3b82f6'],
          bg: '#00111f',
          blur: 36,
          speed: 0.6,
          radiusRange: [60, 160],
          mouseRepel: 0.15
        }, opts);

        let canvas = document.createElement('canvas');
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.zIndex = '-1';
        canvas.style.pointerEvents = 'none';
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const balls = [];
        for (let i=0;i<cfg.count;i++){
          const r = rand(cfg.radiusRange[0], cfg.radiusRange[1]);
          balls.push({
            x: Math.random()*canvas.width,
            y: Math.random()*canvas.height,
            vx: (Math.random()-0.5)*cfg.speed*4,
            vy: (Math.random()-0.5)*cfg.speed*4,
            r,
            color: cfg.colors[i % cfg.colors.length]
          });
        }

        let raf = null;
        let mouse = {x: canvas.width/2, y: canvas.height/2, vx:0, vy:0, down:false};

        function resize(){
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
        }
        window.addEventListener('resize', resize);

        function onMove(e){
          const rect = canvas.getBoundingClientRect();
          const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left;
          const y = (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top;
          mouse.x = x; mouse.y = y;
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('touchmove', onMove, {passive:true});

        function step(){
          ctx.clearRect(0,0,canvas.width,canvas.height);
          ctx.fillStyle = cfg.bg;
          ctx.fillRect(0,0,canvas.width,canvas.height);

          for (let b of balls){
            b.x += b.vx;
            b.y += b.vy;

            if (b.x < -b.r) b.x = canvas.width + b.r;
            if (b.x > canvas.width + b.r) b.x = -b.r;
            if (b.y < -b.r) b.y = canvas.height + b.r;
            if (b.y > canvas.height + b.r) b.y = -b.r;

            const dx = mouse.x - b.x;
            const dy = mouse.y - b.y;
            const dist = Math.sqrt(dx*dx + dy*dy) + 0.001;
            const force = Math.max(-1, Math.min(1, (200 - dist) / 200));
            b.vx += -dx/dist * force * cfg.mouseRepel;
            b.vy += -dy/dist * force * cfg.mouseRepel;
            b.vx *= 0.995; b.vy *= 0.995;

            const g = ctx.createRadialGradient(b.x, b.y, b.r*0.1, b.x, b.y, b.r);
            g.addColorStop(0, hexToRgba(b.color, 0.95));
            g.addColorStop(0.4, hexToRgba(b.color, 0.6));
            g.addColorStop(1, hexToRgba(b.color, 0.0));
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
            ctx.fill();
          }
          raf = requestAnimationFrame(step);
        }

        function start(){ if(!raf) raf = requestAnimationFrame(step); }
        function stop(){
          if(raf){ cancelAnimationFrame(raf); raf = null; }
          window.removeEventListener('resize', resize);
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('touchmove', onMove);
          if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        }

        function rand(a,b){ return a + Math.random()*(b-a); }
        function hexToRgba(hex, a){
          hex = hex.replace('#','');
          if(hex.length === 3) hex = hex.split('').map(h=>h+h).join('');
          const r = parseInt(hex.substring(0,2),16);
          const g = parseInt(hex.substring(2,4),16);
          const b = parseInt(hex.substring(4,6),16);
          return `rgba(${r},${g},${b},${a})`;
        }

        return { start, stop, setColors: c=>{ cfg.colors = c; balls.forEach((b,i)=>b.color = cfg.colors[i%cfg.colors.length]); } };
      }

      function destroyAll() {
        if (vantaEffect && typeof vantaEffect.destroy === 'function') {
          try { vantaEffect.destroy(); } catch(e) {}
          vantaEffect = null;
        }
        if (metaballsInstance && typeof metaballsInstance.stop === 'function') {
          try { metaballsInstance.stop(); } catch(e) {}
          metaballsInstance = null;
        }
      }

      function luminanceFromHex(hex) {
        hex = hex.replace('#','');
        if(hex.length === 3) hex = hex.split('').map(h=>h+h).join('');
        const r = parseInt(hex.substr(0,2),16)/255;
        const g = parseInt(hex.substr(2,2),16)/255;
        const b = parseInt(hex.substr(4,2),16)/255;
        return 0.299*r + 0.587*g + 0.114*b;
      }

      function luminanceForPreset(p) {
        if(p.type === 'mode') return luminanceFromHex(p.bg);
        if(p.type === 'clouds') return luminanceFromHex(p.background);
        if(p.type === 'waves') return luminanceFromHex(("#" + (p.color.toString(16).padStart(6,"0"))));
        if(p.type === 'fog') return 0.33 * (luminanceFromHex(p.h) + luminanceFromHex(p.m) + luminanceFromHex(p.l));
        if(p.type === 'metaballs') return luminanceFromHex(p.bg);
        if(p.type === 'birds') return luminanceFromHex(p.bg);
        return 1;
      }

      const presets = {
        white:  { type:"mode", className:"white-mode", bg:"#ffffff" },
        dark:   { type:"mode", className:"dark-mode", bg:"#0d0d0d" },
        pastel: { type:"mode", className:"pastel-mode", bg:"#ffb6c1" },

        "waves-blue":  { type:"waves", color:0x6ec1e4 },
        "waves-pink":  { type:"waves", color:0xff7eb3 },
        "waves-green": { type:"waves", color:0x00e3ae },

        "fog-1": { type:"fog", h:"#fbc2eb", m:"#a18cd1", l:"#6b5b95" },
        "fog-2": { type:"fog", h:"#84fab0", m:"#8fd3f4", l:"#5bc0eb" },
        "fog-3": { type:"fog", h:"#ffd194", m:"#f6d365", l:"#ffb347" },
        "fog-4": { type:"fog", h:"#ff9a9e", m:"#fecfef", l:"#ff6b6b" },
        "fog-5": { type:"fog", h:"#c2e9fb", m:"#a1c4fd", l:"#6ea8fe" },
        "fog-6": { type:"fog", h:"#fbc2eb", m:"#a6c1ee", l:"#6f86d6" },

        "clouds-1": { type:"clouds", background:"#cfdef3" },
        "clouds-2": { type:"clouds", background:"#fbc2eb" },
        "clouds-3": { type:"clouds", background:"#68b8d7" },

        "liquid-1": { type:"metaballs", colors:['#66a6ff','#89f7fe','#3b82f6'], bg:"#00111f" },
        "liquid-2": { type:"metaballs", colors:['#c471f5','#fa71cd','#7b2cbf'], bg:"#1a002b" },
        "liquid-3": { type:"metaballs", colors:['#f6d365','#fda085','#d97706'], bg:"#2b0f00" },

         "birds-1": { type:"birds", bg:"#9d366c", color1:0xbc85ff, color2:0xfac0ea },
        "birds-2": { type:"birds", bg:"#6e369d", color1:0xbc85ff, color2:0xfac0ea },
        "birds-3": { type:"birds", bg:"#36969d", color1:0xbc85ff, color2:0xfac0ea }

      };

      function applySectionStyles(preset){
        if(!preset.sections)return;
        const sections = ['navbar','hero','services','newsletter','about','gallery','footer'];
        sections.forEach(id=>{
          const el=document.getElementById(id);
          if(el && preset.sections[id]){
            el.style.background=preset.sections[id].bg;
            el.style.color=preset.sections[id].color;
          }
        });
      }

      function applyTheme(key) {
        const p = presets[key];
        if (!p) return;

        destroyAll();
        bg.classList.remove('hidden');
        localStorage.setItem('theme', key);

        if (p.type === 'mode') {
          bg.classList.add('hidden');
          document.body.classList.remove('white-mode','dark-mode','pastel-mode');
          document.body.classList.add(p.className);
          if (key === "dark") {
            document.body.style.color = "#fff";
          } else {
            document.body.style.color = luminanceForPreset(p) < 0.5 ? "#fff" : "#222";
          }
          applyOverlay();
          applySectionStyles(p);
          return;
        }

        const lum = luminanceForPreset(p);
        if (p.type === "fog" || p.type === "clouds") {
          document.body.style.color = "black";
        } else {
          document.body.style.color = lum < 0.5 ? "#fff" : "#222";
        }

        if (p.type === 'waves' && window.VANTA && VANTA.WAVES) {
          vantaEffect = VANTA.WAVES({
            el: bg,
            mouseControls: true,
            touchControls: true,
            color: p.color,
            shininess: 60,
            waveHeight: 25,
            waveSpeed: 0.7,
            zoom: 1.05
          });
        } else if (p.type === 'fog' && window.VANTA && VANTA.FOG) {
          vantaEffect = VANTA.FOG({
            el: bg,
            mouseControls: true,
            touchControls: true,
            highlightColor: p.h,
            midtoneColor: p.m,
            lowlightColor: p.l,
            baseColor: "#000000",
            blurFactor: 0.7,
            speed: 1.1,
            zoom: 1.1
          });
        } else if (p.type === 'clouds' && window.VANTA && VANTA.CLOUDS) {
          vantaEffect = VANTA.CLOUDS({
            el: bg,
            mouseControls: false,
            gyroControls:true,
            touchControls: true,
            backgroundColor: p.background,
            skyColor: p.background,
            speed: 1
          });
        } else if (p.type === 'metaballs') {
          metaballsInstance = Metaballs(bg, {
            count: 9,
            colors: p.colors,
            bg: p.bg,
            speed: 0.6,
            radiusRange: [80,160],
            mouseRepel: 0.18
          });
          metaballsInstance.start();
        } else if (p.type === 'birds' && window.VANTA && VANTA.BIRDS) {
          vantaEffect = VANTA.BIRDS({
            el: bg,
            mouseControls: true,
            touchControls: true,
            backgroundColor: p.bg,
            color1: p.color1,
            color2: p.color2,
            speedLimit: 5,
            separation: 20,
            wingSpan:30,
            birdSize:1,
            alignment: 20,
            cohesion: 20.0,
            quantity: 5
          });
        } else {
          bg.style.background = p.background || p.bg || "transparent";
        }

        applyOverlay();
        applySectionStyles(p);
      }

      btn.addEventListener('click', () => {
        panel.classList.toggle('active');
        panel.setAttribute('aria-hidden', panel.classList.contains('active') ? 'false' : 'true');
      });

      panel.querySelectorAll('.theme-option').forEach(opt => {
        opt.addEventListener('click', () => {
          const key = opt.dataset.theme;
          applyTheme(key);
          panel.classList.remove('active');
          panel.setAttribute('aria-hidden', 'true');
        });
      });

      const saved = localStorage.getItem('theme') || 'white';
      setTimeout(()=>applyTheme(saved), 50);

      window.addEventListener('beforeunload', destroyAll);
    });
  }
}

customElements.define("menutech-themes", MenutechThemes);


























/******************************
 * MENUTECH MENU
 ******************************/
class MenutechMenu extends HTMLElement {
  static get observedAttributes() {
    return ["imagenes"];
  }

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: "open" });

    // ===== CSS original (mantiene el responsive correcto) =====
    const style = document.createElement("style");
    style.textContent = `
      :host {
        display: block;
        width: 100%;
        margin: 40px 0;
        position: relative;
      }

      .flipbook-viewport {
        overflow: hidden;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
      }

      @media (max-width: 992px) {
        .flipbook-viewport {
          width: 90%;
          height: auto;
          display: block;
        }
      }

      .flipbook-viewport .container {
        padding: 20px;
        text-align: center;
        position: relative;
        margin: 0 auto;
      }

      .flipbook {
        width: 922px;
        height: 700px;
        margin: 0 auto;
        display: block;
      }

      @media (max-width: 992px) {
        .flipbook {
          width: 100%;
          height: 400px;
          margin-top: 10px;
        }
      }

      .flipbook .page {
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
      }

      .flipbook img {
        width: 100%;
        user-select: none;
        -webkit-user-select: none;
      }

      @media (min-width: 992px) {
        .flipbook-viewport {
          justify-content: center;
          align-items: center;
        }

        .container {
          display: flex;
          justify-content: center;
          align-items: center;
        }
      }
    `;

    // ===== Estructura HTML =====
    const container = document.createElement("div");
    container.classList.add("flipbook-viewport");
    container.innerHTML = `
      <div class="container">
        <div class="flipbook"></div>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(container);
  }

  connectedCallback() {
    this.render();
    this.ensureTurnJS();
  }

  attributeChangedCallback() {
    this.render();
  }

  render() {
    const flipbook = this.shadowRoot.querySelector(".flipbook");
    if (!flipbook) return;

    // Obtener imágenes del atributo o usar predeterminadas
    let urls = [];
    try {
      urls = JSON.parse(this.getAttribute("imagenes") || "[]");
    } catch {
      const raw = this.getAttribute("imagenes");
      if (raw) urls = raw.split(",").map(u => u.trim());
    }

    const imagesToUse = urls.length ? urls : [
      "https://vikingantonio.github.io/cabanamenu/assets/img/1.jpg",
      "https://vikingantonio.github.io/cabanamenu/assets/img/2.jpg",
      "https://vikingantonio.github.io/cabanamenu/assets/img/3.jpg",
      "https://vikingantonio.github.io/cabanamenu/assets/img/4.jpg",
      "https://vikingantonio.github.io/cabanamenu/assets/img/5.jpg",
      "https://vikingantonio.github.io/cabanamenu/assets/img/6.jpg",
      "https://vikingantonio.github.io/cabanamenu/assets/img/7.jpg",
      "https://vikingantonio.github.io/cabanamenu/assets/img/8.jpg",
      "https://vikingantonio.github.io/cabanamenu/assets/img/9.jpg",
      "https://vikingantonio.github.io/cabanamenu/assets/img/10.jpg",
      "https://vikingantonio.github.io/cabanamenu/assets/img/11.jpg",
      "https://vikingantonio.github.io/cabanamenu/assets/img/12.jpg"
    ];

    // Renderizar las imágenes
    flipbook.innerHTML = imagesToUse
      .map(src => `<img class="page" src="${src}" alt="page">`)
      .join("");

    // Reiniciar flipbook si Turn.js ya está cargado
    if (window.jQuery && jQuery.fn.turn) {
      jQuery(flipbook).turn("destroy").turn();
    }
  }

  ensureTurnJS() {
    const init = () => {
      if (window.jQuery && jQuery.fn.turn) {
        const flipbook = this.shadowRoot.querySelector(".flipbook");
        jQuery(flipbook).turn();
      } else if (!window.jQuery) {
        const jq = document.createElement("script");
        jq.src = "https://code.jquery.com/jquery-3.6.0.min.js";
        jq.onload = init;
        document.head.appendChild(jq);
      } else {
        const turn = document.createElement("script");
        turn.src = "https://menutech.biz/m10/assets/js/turn.js";
        turn.onload = init;
        document.head.appendChild(turn);
      }
    };
    init();
  }
}

customElements.define("menutech-menu", MenutechMenu);




























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
 * MENUTECH NAVIDAD
 ******************************/
class MenutechNavidad extends HTMLElement {
  static get observedAttributes() {
    return [
      "color","cantidad","tamano","velocidad","opacidad",
      "popup-activo","popup-image","popup-link",
      "fecha-inicio","fecha-fin","santa-tamano","santa-velocidad"
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
    const popupImage = this.getAttribute("popup-image") || "";
    const popupLink = this.getAttribute("popup-link") || "";
    const fechaInicio = this.getAttribute("fecha-inicio") || "2025-12-25";
    const fechaFin = this.getAttribute("fecha-fin") || "2025-12-25";
    const santaTamano = parseFloat(this.getAttribute("santa-tamano")) || 450;
    const santaVelocidad = parseFloat(this.getAttribute("santa-velocidad")) || 3;

    const hoy = new Date();
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const navidad = new Date(hoy.getFullYear(), 11, 25);

    const fechasPorDefecto =
      fechaInicio === "2025-12-25" && fechaFin === "2025-12-25";

    let activo = false;
    if (fechasPorDefecto) {
      activo = hoy.toDateString() === navidad.toDateString();
    } else {
      activo = hoy >= inicio && hoy <= fin;
    }

    if (!activo) {
      this.shadowRoot.innerHTML = "";
      return;
    }

    const popupActivo =
      this.getAttribute("popup-activo") === "true" ||
      this.getAttribute("popup-activo") === "on";

    // === Copos de nieve ===
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
          width:${size * 2}px;
          height:${size * 2}px;
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
          position:fixed;
          top:0; left:0;
          width:100%; height:100%;
          pointer-events:none;
          z-index:9999;
          overflow:hidden;
        }
        .flake {
          position:absolute;
          animation:fall linear infinite;
          will-change: transform, opacity;
        }
        @keyframes fall {
          0% { transform: translateY(0) rotate(0deg); opacity:1; }
          100% { transform: translateY(100vh) rotate(360deg); opacity:0; }
        }

        /* POPUP */
        .popup-overlay {
          position:fixed;
          top:0; left:0;
          width:100%; height:100%;
          background:rgba(0,0,0,0.5);
          display:${popupActivo ? "flex" : "none"};
          justify-content:center;
          align-items:center;
          pointer-events:auto;
          z-index:10000;
        }
        .popup-content {
          position:relative;
          background:#fff;
          max-width:90%;
          max-height:80%;
          border-radius:12px;
          box-shadow:0 4px 20px rgba(0,0,0,0.3);
          padding:20px;
          text-align:center;
          display:flex;
          flex-direction:column;
          gap:12px;
          overflow:hidden;
        }
        .popup-content img {
          max-width:100%;
          max-height:60vh;
          border-radius:8px;
          object-fit:contain;
        }
        .popup-content button {
          background:#d32f2f;
          color:#fff;
          border:none;
          padding:10px 16px;
          border-radius:6px;
          cursor:pointer;
          font-size:1rem;
        }
        .popup-close {
          position:absolute;
          top:10px; right:10px;
          background:transparent;
          border:none;
          font-size:1.5rem;
          cursor:pointer;
          color:#333;
        }

        /* Santa Claus */
        #santa {
          position: fixed;
          width: ${santaTamano}px;
          top: 50%;
          left: -200px;
          transform: translateY(-50%);
          pointer-events: none;
          z-index: 10001;
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

      <img id="santa" src="https://menutechdeveloper.github.io/libreria/santa.gif" alt="Santa volando">
    `;

    // ===== POPUP CLOSE =====
    const overlay = this.shadowRoot.querySelector(".popup-overlay");
    const closeBtn = this.shadowRoot.querySelector(".popup-close");
    if (overlay && closeBtn) {
      closeBtn.onclick = () => (overlay.style.display = "none");
      overlay.onclick = (e) => {
        if (e.target === overlay) overlay.style.display = "none";
      };
    }

    // ===== ANIMACIÓN DE SANTA =====
    const santa = this.shadowRoot.querySelector("#santa");
    if (santa) {
      if (santa._animFrame) cancelAnimationFrame(santa._animFrame);

      let posX = -200;
      let posY = window.innerHeight / 2;
      let dirX = 1;
      let dirY = Math.random() < 0.5 ? 1 : -1;
      let vel = santaVelocidad;

      function moverSanta() {
        posX += dirX * vel;
        posY += dirY * 0.5;

        if (posY < 50 || posY > window.innerHeight - 150) dirY *= -1;
        if (posX > window.innerWidth) {
          dirX = -1;
          santa.style.transform = "translateY(-50%) scaleX(-1)";
        }
        if (posX < -200) {
          dirX = 1;
          santa.style.transform = "translateY(-50%) scaleX(1)";
        }

        santa.style.left = `${posX}px`;
        santa.style.top = `${posY}px`;

        santa._animFrame = requestAnimationFrame(moverSanta);
      }

      moverSanta();
    }
  }
}

customElements.define("menutech-navidad", MenutechNavidad);







/******************************
 * MENUTECH HALLOWEEN
 ******************************/
class MenutechHalloween extends HTMLElement {
  static get observedAttributes() {
    return [
      "color-hw","cantidad-hw","tamano-hw","velocidad-hw","opacidad-hw",
      "popup-activo-hw","popup-image-hw","popup-link-hw","popup-color-hw",
      "fecha-inicio-hw","fecha-fin-hw", "tamano-pumpkin-hw","tamano-bat-hw", 
      "velocidad-bat-hw"
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
    const color = this.getAttribute("color-hw") || "#ff6600";
    const cantidad = parseInt(this.getAttribute("cantidad-hw")) || 60;
    const tamano = parseFloat(this.getAttribute("tamano-hw")) || 3;
    const velocidad = parseFloat(this.getAttribute("velocidad-hw")) || 1;
    const opacidad = parseFloat(this.getAttribute("opacidad-hw")) || 0.8;
    const popupImage = this.getAttribute("popup-image-hw") || "";
    const popupLink = this.getAttribute("popup-link-hw") || "";
    const popupColor = this.getAttribute("popup-color-hw") || "#ff6600";
    const tamanoPumpkin = parseFloat(this.getAttribute("tamano-pumpkin-hw")) || 60;
    const tamanoBat = parseFloat(this.getAttribute("tamano-bat-hw")) || 50;
    const velocidadBat = parseFloat(this.getAttribute("velocidad-bat-hw")) || 1;

    const fechaInicio = this.getAttribute("fecha-inicio-hw") || "2025-10-31";
    const fechaFin = this.getAttribute("fecha-fin-hw") || "2025-10-31";

    const hoy = new Date();
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    const halloween = new Date(hoy.getFullYear(), 9, 31);
    const fechasPorDefecto = fechaInicio === "2025-10-31" && fechaFin === "2025-10-31";

    let activo = false;
    if (fechasPorDefecto) {
      activo = hoy.toDateString() === halloween.toDateString();
    } else {
      activo = hoy >= inicio && hoy <= fin;
    }

    if (!activo && !this.closest('.preview')) {
      this.shadowRoot.innerHTML = "";
      return;
    }
    const popupActivo =
    this.getAttribute("popup-activo-hw") === "true" ||
    this.getAttribute("popup-activo-hw") === "on";
    
    // === Partículas base (hw1, hw2, hw3) ===
    const particleImages = [
      "https://menutechdeveloper.github.io/libreria/hw1.png",
      "https://menutechdeveloper.github.io/libreria/hw2.png",
      "https://menutechdeveloper.github.io/libreria/hw3.png"
    ];
    let dots = "";
    for (let i = 0; i < cantidad; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const size = tamano + Math.random() * tamano;
      const dur = 4 + Math.random() * 3;
      const delay = Math.random() * 2;
      const img = particleImages[i % particleImages.length];
      dots += `<div class="flake" style="
        left:${x}%;
        top:${y}%;
        width:${size*2}px;
        height:${size*2}px;
        animation-duration:${dur/velocidad}s;
        animation-delay:${delay}s;
        opacity:${opacidad};
        background-image:url('${img}');
        background-size:contain;
        background-repeat:no-repeat;
        background-position:center;
      "></div>`;
    }

    // === Calabazas luminosas ===
    const pumpkinImg = "https://menutechdeveloper.github.io/libreria/calabaza.gif";
    const pumpkinCount = 8;
    let pumpkins = "";
    for (let i = 0; i < pumpkinCount; i++) {
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const scale = 0.5 + Math.random() * 0.7;
      const duration = 3 + Math.random() * 5;
      const delay = Math.random() * 6;
      pumpkins += `<div class="pumpkin" style="
        left:${x}%;
        top:${y}%;
        width:${tamanoPumpkin}px;
        height:${tamanoPumpkin}px;
        transform:scale(${scale});
        animation-duration:${duration}s;
        animation-delay:${delay}s;
        background-image:url('${pumpkinImg}');
      "></div>`;
    }

    // === Murciélagos GIF volando horizontalmente ===
    const batGif = "https://menutechdeveloper.github.io/libreria/murcielago.gif";
  const batCount = 6;
  let bats = "";
  for (let i = 0; i < batCount; i++) {
  const y = Math.random() * 80;
  const duration = (15 + Math.random() * 5) / velocidadBat;
  const delay = Math.random() * 5;
  bats += `<div class="bat" style="
    top:${y}%;
    width:${tamanoBat}px;
    height:${tamanoBat}px;
    animation-duration:${duration}s;
    animation-delay:${delay}s;
    background-image:url('${batGif}');
  "></div>`;
}


    // === Render Shadow DOM ===
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position:fixed;
          top:0; left:0;
          width:100%; height:100%;
          pointer-events:none;
          z-index:9999;
          overflow:hidden;
        }
        .smoke-layer {
          position:absolute;
          inset:0;
          background:url("https://menutechdeveloper.github.io/libreria/smoke5.png") repeat;
          background-size:cover;
          opacity:0.25;
          filter:blur(4px);
          animation:moveSmoke 60s linear infinite;
        }
        @keyframes moveSmoke {
          0% { background-position:0 0; }
          100% { background-position:2000px 1000px; }
        }
        .flake {
          position: absolute;
          width: 20px; height: 20px;
          background-size: contain;
          background-repeat: no-repeat;
          background-position: center;
          animation: appearDisappear linear infinite;
          opacity: 0;
        }
        @keyframes appearDisappear {
          0%, 100% { opacity: 0; transform: scale(0.5) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
        .pumpkin {
          position:absolute;
          width:60px; height:60px;
          background-size:contain;
          background-repeat:no-repeat;
          background-position:center;
          opacity:0;
          animation:fadePumpkin ease-in-out infinite;
          filter:drop-shadow(0 0 8px #ff6600);
        }
        @keyframes fadePumpkin {
          0%,100% { opacity:0; transform:scale(0.5) rotate(0deg); }
          40%,60% { opacity:1; transform:scale(1) rotate(10deg); }
        }
        .bat {
          position:absolute;
          width:50px; height:50px;
          background-size:contain;
          background-repeat:no-repeat;
          background-position:center;
          animation:flyX linear infinite;
        }
        @keyframes flyX {
          0% { left:-60px; }
          100% { left:100vw; }
        }
        /* POPUP igual que MenutechNavidad */
        .popup-overlay {
          position:fixed;
          top:0; left:0;
          width:100%; height:100%;
          background:rgba(0,0,0,0.5);
          display:${popupActivo ? "flex" : "none"};
          justify-content:center;
          align-items:center;
          pointer-events:auto;
          z-index:10000;
        }
        .popup-content {
          position:relative;
          background:#fff;
          max-width:90%;
          max-height:80%;
          border-radius:12px;
          box-shadow:0 4px 20px rgba(0,0,0,0.3);
          padding:20px;
          text-align:center;
          display:flex;
          flex-direction:column;
          gap:12px;
          overflow:hidden;
        }
        .popup-content img {
          max-width:100%;
          max-height:60vh;
          border-radius:8px;
          object-fit:contain;
        }
        .popup-content button {
          background:${popupColor};
          color:#fff;
          border:none;
          padding:10px 16px;
          border-radius:6px;
          cursor:pointer;
        }
        .popup-close {
          position:absolute;
          top:10px; right:10px;
          background:transparent;
          border:none;
          font-size:1.5rem;
          color:#333;
          cursor:pointer;
        }
      </style>

      <div class="smoke-layer"></div>
      ${dots}
      ${pumpkins}
      ${bats}
      <div class="popup-overlay">
        <div class="popup-content">
          <button class="popup-close">&times;</button>
          ${popupImage ? `<img src="${popupImage}" alt="Promoción">` : ""}
          ${popupLink ? `<button onclick="window.open('${popupLink}','_blank')">Ver promoción</button>` : ""}
        </div>
      </div>
    `;

    // Lógica popup
    const overlay = this.shadowRoot.querySelector(".popup-overlay");
    const closeBtn = this.shadowRoot.querySelector(".popup-close");
    if (overlay && closeBtn) {
      closeBtn.onclick = () => overlay.style.display = "none";
      overlay.onclick = (e) => { if(e.target === overlay) overlay.style.display = "none"; };
    }
  }
}

customElements.define("menutech-halloween", MenutechHalloween);








/******************************
 * MENUTECH PARTICLES
 ******************************/
class MenutechParticles extends HTMLElement {
  static get observedAttributes() {
  return [
    "color","cantidad","tamano","velocidad","opacidad",
    "popup-activo","popup-image","popup-link",
    "fecha-inicio","fecha-fin"
  ];
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
class MenuTechHero extends HTMLElement {
  static get observedAttributes() {
    return [
      "background",
      "overlay-color",
      "overlay-opacity",
      "title",
      "subtitle"
      // NOTE: ya no usamos attribute 'custom-code' para almacenar HTML bruto
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    // observer para detectar cambios en nodos hijos (editor actualiza script/template)
    this._mo = new MutationObserver(() => this.render());
  }

  connectedCallback() {
    // observar cambios en hijos (añadir/editar <template> o <script type="text/plain">)
    this._mo.observe(this, { childList: true, characterData: true, subtree: true });
    this.render();
  }

  disconnectedCallback() {
    this._mo.disconnect();
  }

  attributeChangedCallback() {
    this.render();
  }

  // lee el custom code considerando:
  // 1) <template class="custom-code"> ... </template>
  // 2) <script type="text/plain" class="custom-code"> ... </script>
  // 3) fallback: atributo data-custom-code (si lo tienes por compat)
  _readCustomCode() {
    // prefer template
    const tpl = this.querySelector('template.custom-code');
    if (tpl) return tpl.innerHTML.trim();

    const s = this.querySelector('script[type="text/plain"].custom-code');
    if (s) return s.textContent.trim();

    // atributo por compatibilidad (html-escaped), evita si puede
    const attr = this.getAttribute('custom-code');
    if (attr) return attr.trim();

    // default
    return `
      <span class="glf-button"
        data-glf-cuid="af65ce46-dd1a-4bc2-8461-df278b715ca2"
        data-glf-ruid="4a27439a-e98e-441e-a2db-477113814476">See MENU &amp; Order</span>

      <span class="glf-reservation"
        data-glf-cuid="c6f6fcc9-ebb9-4575-b513-3f3d9ea55da0"
        data-glf-ruid="1e45b55d-4e3a-4866-a22b-30601bde9f8a"
        data-glf-reservation="true">Table Reservation</span>

      <script src="https://www.fbgcdn.com/embedder/js/ewm2.js" defer async></script>
    `;
  }

  render() {
    const background = this.getAttribute("background") || "https://picsum.photos/1200/600";
    const overlayColor = this.getAttribute("overlay-color") || "rgba(0,0,0,0.9)";
    const overlayOpacity = parseFloat(this.getAttribute("overlay-opacity")) || 0.7;
    const title = this.getAttribute("title") || "Impulsa tu negocio al siguiente nivel";
    const subtitle = this.getAttribute("subtitle") || "Descubre cómo nuestra plataforma puede ayudarte a crecer, conectar con más clientes y aumentar tus ventas.";

    const isVideo = /\.(mp4|webm|ogg)(\?.*)?$/i.test(background);

    // el custom code se lee desde nodos hijos (template/script) o atributo como fallback
    const customCode = this._readCustomCode();

    // render HTML en shadow
    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; width:100%; height:100%; }
        section.hero {
          position: relative;
          width: 100%;
          height: 100vh;
          min-height: 300px;
          ${!isVideo ? `background: url('${background}') center/cover no-repeat;` : ""}
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: white;
          overflow: hidden;
          border-radius: 12px;
        }
        .hero-overlay { position:absolute; inset:0; background: ${overlayColor}; opacity: ${overlayOpacity}; z-index:0; }
        video.hero-bg { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; z-index:-1; }
        .hero-content { position:relative; z-index:1; max-width:800px; padding:20px; animation: fadeInUp 1s ease-out; }
        h1{ font-size:3rem; margin:0 0 1rem; font-weight:700; line-height:1.2; }
        p{ font-size:1.2rem; margin:0 0 2rem; opacity:0.9; }
        @keyframes fadeInUp{ from{opacity:0; transform:translateY(20px);} to{opacity:1; transform:none;} }
        @media (max-width:768px){ section.hero{height:60vh;} h1{font-size:2.2rem;} p{font-size:1rem;} }
      </style>

      <section class="hero">
        ${isVideo ? `<video class="hero-bg" src="${background}" autoplay muted loop playsinline></video>` : ''}
        <div class="hero-overlay"></div>
        <div class="hero-content">
          <h1>${title}</h1>
          <p>${subtitle}</p>
          <div class="custom-slot"></div>
        </div>
      </section>
    `;

    // insertar custom code tal cual dentro del shadow (sin envolver ni estilizar)
    const slot = this.shadowRoot.querySelector('.custom-slot');
    if (slot) {
      slot.innerHTML = customCode;

      // reinyectar scripts para que se ejecuten (convertimos los script-tags de slot en scripts reales)
      slot.querySelectorAll('script').forEach(oldScript => {
        const newScript = document.createElement('script');
        // copiar atributos (src, async, defer, etc)
        for (let i = 0; i < oldScript.attributes.length; i++) {
          const attr = oldScript.attributes[i];
          newScript.setAttribute(attr.name, attr.value);
        }
        // transferir contenido inline
        newScript.text = oldScript.textContent;
        // reemplazar en DOM (esto hará que el script se ejecute)
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });
    }
  }
}

customElements.define('menutech-hero', MenuTechHero);





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

        /* 🔹 Correcciones solo para móviles */
        @media (max-width: 768px) {
          html, body {
            overflow-x: hidden;
          }
          menutech-carrusel {
            padding: 20px 0;
            overflow-x: hidden;
          }
          .swiper-container {
            max-width: 100%;
            overflow: hidden;
          }
          .swiper-slide {
            width: 80% !important;
            height: auto !important;
          }
          .menus img {
            width: 100%;
            height: auto;
            object-fit: contain;
          }
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
             rotate: 30,
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



// ==========================================================================================================================
// Menutech ICONOS    this.iconPath = "https://menutech.xyz/icons/";
// ==========================================================================================================================

class MenutechIconLoader {
    constructor() {
        this.iconPath = "https://menutechdeveloper.github.io/libreria/icons/";
        this.processAll();
    }

    processAll() {
        const icons = document.querySelectorAll("i[class*='menutech-']");
        icons.forEach(icon => this.loadIcon(icon));
    }

    async loadIcon(el) {
        const classes = [...el.classList];
        const name = classes.find(c => c.startsWith("menutech-"))?.replace("menutech-", "");
        if (!name) return;

        try {
            let svgText = await fetch(`${this.iconPath}${name}.svg`).then(r => r.text());

            svgText = svgText
                .replace(/fill="[^"]*"/g, 'fill="currentColor"')
                .replace(/stroke="[^"]*"/g, 'stroke="currentColor"')
                .replace('<svg', '<svg fill="currentColor" style="width:100%;height:100%;display:block;pointer-events:none;"')


            el.innerHTML = svgText;
            el.style.display = "inline-block";

        } catch (e) {
            console.error("Icono Menutech no encontrado:", name);
        }
    }
}

document.addEventListener("DOMContentLoaded", () => new MenutechIconLoader());






























































































































































