/*
 * Alexa Announce Card (FR)
 * Carte Home Assistant pour les annonces Alexa : boutons d'annonces rapides (scripts) et
 * message personnalisé à envoyer. Style verre, thème clair/sombre automatique, éditeur visuel.
 */

const CARD_VERSION = "1.0.0";

const DEFAULTS = {
  title: "Annonces Alexa",
  theme: "auto", // auto | light | dark
  columns: 0, // 0 = automatique
  buttons: [],
  message_entity: "", // input_text qui contient le message (facultatif)
  send_entity: "", // script qui envoie le message personnalisé
  placeholder: "Votre message…",
  send_label: "Envoyer sur Alexa",
  show_custom: true,
};

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

class AlexaAnnounceCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement("alexa-announce-card-editor");
  }

  static getStubConfig() {
    return { ...DEFAULTS, buttons: [{ name: "À table", icon: "mdi:silverware-fork-knife", entity: "" }] };
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sig = "";
    this._draft = "";
    this._sent = null;
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide");
    this._config = { ...DEFAULTS, ...config };
    if (!Array.isArray(this._config.buttons)) this._config.buttons = [];
    this._sig = "";
    this._built = false;
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const dark = this._isDark();
    const key = dark ? "d" : "l";
    // On ne reconstruit que si le thème ou la config change : jamais pendant la saisie.
    if (!this._built || this._sig !== key) {
      this._sig = key;
      this._render();
    }
  }

  getCardSize() { return 2 + Math.ceil(this._config.buttons.length / 3) + (this._config.show_custom ? 2 : 0); }

  _isDark() {
    const t = this._config && this._config.theme;
    if (t === "dark") return true;
    if (t === "light") return false;
    const dm = this._hass && this._hass.themes && this._hass.themes.darkMode;
    if (typeof dm === "boolean") return dm;
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }

  _run(eid) {
    if (!eid) return false;
    const [domain] = eid.split(".");
    if (domain === "button" || domain === "input_button") this._hass.callService(domain, "press", { entity_id: eid });
    else if (domain === "script") this._hass.callService("script", "turn_on", { entity_id: eid });
    else if (domain === "scene") this._hass.callService("scene", "turn_on", { entity_id: eid });
    else this._hass.callService("homeassistant", "turn_on", { entity_id: eid });
    return true;
  }

  _flash(el, ok) {
    if (!el) return;
    el.classList.add(ok ? "ok" : "ko");
    setTimeout(() => el.classList.remove("ok", "ko"), 1400);
  }

  _sendCustom() {
    const c = this._config;
    const input = this.shadowRoot.querySelector("textarea");
    const btn = this.shadowRoot.querySelector(".send");
    const msg = (input.value || "").trim();
    if (!msg || !c.send_entity) { this._flash(btn, false); return; }
    const done = () => {
      this._run(c.send_entity);
      input.value = "";
      this._draft = "";
      this._flash(btn, true);
    };
    if (c.message_entity) {
      this._hass.callService("input_text", "set_value", { entity_id: c.message_entity, value: msg.slice(0, 255) });
      // laisse le temps à l'input_text de prendre la valeur avant de lancer le script
      setTimeout(done, 400);
    } else {
      // sans input_text : on transmet le message en variable au script
      const [, name] = c.send_entity.split(".");
      this._hass.callService("script", name, { message: msg });
      input.value = "";
      this._draft = "";
      this._flash(btn, true);
    }
  }

  _render() {
    const c = this._config;
    if (!c || !this._hass) return;
    this._built = true;
    const dark = this._isDark();
    const cols = Number(c.columns) > 0 ? Number(c.columns) : 0;

    const btns = c.buttons.map((b, i) => `
      <button class="qb" data-i="${i}" title="${esc(b.name || "")}">
        <span class="ic"><ha-icon icon="${esc(b.icon || "mdi:bullhorn")}"></ha-icon></span>
        <span class="nm">${esc(b.name || "Annonce")}</span>
      </button>`).join("");

    this.shadowRoot.innerHTML = `
      <style>
        * { box-sizing:border-box; }
        ha-card.dark {
          --al-text:#f4f6fb; --al-muted:#a9afc0; --al-bg:linear-gradient(160deg,#1b1e32 0%,#241a2a 55%,#2d1519 100%);
          --al-border:rgba(255,255,255,.14); --al-shadow:0 .6em 2em rgba(0,0,0,.35);
          --al-glass:rgba(255,255,255,.07); --al-glass-b:rgba(255,255,255,.13); --al-fill:rgba(255,255,255,.09); --al-fill-b:rgba(255,255,255,.16);
          --al-acc:#4fc3f7; --al-ok:#3ddc84; --al-err:#ff5a5f;
        }
        ha-card.light {
          --al-text:#1c2030; --al-muted:#5d6477; --al-bg:linear-gradient(160deg,#f8f9fd 0%,#eef1f8 55%,#f8eff0 100%);
          --al-border:rgba(20,24,40,.12); --al-shadow:0 .4em 1.4em rgba(20,24,40,.12);
          --al-glass:rgba(255,255,255,.7); --al-glass-b:rgba(20,24,40,.1); --al-fill:rgba(20,24,40,.06); --al-fill-b:rgba(20,24,40,.14);
          --al-acc:#0f8fc4; --al-ok:#1a9d55; --al-err:#d32f35;
        }
        ha-card { display:flex; flex-direction:column; gap:12px; padding:16px; overflow:hidden; color:var(--al-text);
          border-radius:24px; border:1px solid var(--al-border); background:var(--al-bg); box-shadow:var(--al-shadow); }
        ha-icon { --mdc-icon-size:1.4em; flex:none; }
        button { font:inherit; color:inherit; cursor:pointer; border:0; background:none; padding:0; -webkit-tap-highlight-color:transparent; }
        .head { display:flex; align-items:center; gap:.6em; font-size:1.1em; font-weight:650; }
        .head ha-icon { color:var(--al-acc); }
        .grid { display:grid; gap:10px; grid-template-columns:${cols ? `repeat(${cols},minmax(0,1fr))` : "repeat(auto-fit,minmax(7.5em,1fr))"}; }
        .qb { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.5em; padding:.9em .5em; min-height:5.6em; border-radius:1.1em; text-align:center;
          background:var(--al-glass); border:1px solid var(--al-glass-b); -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%);
          transition:transform .1s, border-color .2s; }
        .qb:active { transform:scale(.96); }
        .ic { display:grid; place-items:center; width:2.4em; height:2.4em; border-radius:50%; background:var(--al-fill); border:1px solid var(--al-fill-b); color:var(--al-acc); }
        .nm { font-size:.85em; font-weight:600; line-height:1.15; overflow-wrap:anywhere; }
        .qb.ok { border-color:var(--al-ok); } .qb.ok .ic { color:var(--al-ok); } .qb.ko { border-color:var(--al-err); }
        .custom { display:flex; flex-direction:column; gap:8px; padding:12px; border-radius:1.1em; background:var(--al-glass); border:1px solid var(--al-glass-b);
          -webkit-backdrop-filter:blur(18px) saturate(140%); backdrop-filter:blur(18px) saturate(140%); }
        textarea { width:100%; min-height:4.2em; resize:vertical; font:inherit; color:var(--al-text); padding:.7em .8em; border-radius:.9em;
          background:var(--al-fill); border:1px solid var(--al-fill-b); outline:none; }
        textarea:focus { border-color:var(--al-acc); } textarea::placeholder { color:var(--al-muted); }
        .send { display:flex; align-items:center; justify-content:center; gap:.5em; padding:.75em 1em; border-radius:1em; font-weight:650; font-size:.92em;
          background:var(--al-acc); color:${dark ? "#0b1220" : "#fff"}; transition:background .2s; }
        .send:active { filter:brightness(.92); } .send.ok { background:var(--al-ok); } .send.ko { background:var(--al-err); color:#fff; }
        .empty { color:var(--al-muted); font-size:.9em; }
      </style>
      <ha-card class="${dark ? "dark" : "light"}">
        ${c.title ? `<div class="head"><ha-icon icon="mdi:bullhorn-variant"></ha-icon>${esc(c.title)}</div>` : ""}
        ${btns ? `<div class="grid">${btns}</div>` : `<div class="empty">Ajoutez des boutons d'annonce dans l'éditeur de la carte.</div>`}
        ${c.show_custom && c.send_entity ? `<div class="custom">
          <textarea rows="2" maxlength="255" placeholder="${esc(c.placeholder)}">${esc(this._draft)}</textarea>
          <button class="send"><ha-icon icon="mdi:send"></ha-icon>${esc(c.send_label)}</button></div>` : ""}
      </ha-card>`;

    const root = this.shadowRoot;
    root.querySelectorAll(".qb").forEach((el) => el.addEventListener("click", () => {
      const b = c.buttons[Number(el.dataset.i)];
      this._flash(el, this._run(b && b.entity));
    }));
    const ta = root.querySelector("textarea");
    if (ta) {
      ta.addEventListener("input", () => { this._draft = ta.value; });
      ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this._sendCustom(); } });
      root.querySelector(".send").addEventListener("click", () => this._sendCustom());
    }
  }
}

/* ---------- Éditeur visuel ---------- */
const LABELS = {
  title: "Titre", theme: "Thème", columns: "Colonnes (0 = automatique)", show_custom: "Afficher le message personnalisé",
  message_entity: "Champ du message (input_text, facultatif)", send_entity: "Script d'envoi du message personnalisé",
  placeholder: "Texte d'aide du champ", send_label: "Texte du bouton d'envoi",
  name: "Nom du bouton", icon: "Icône", entity: "Script à lancer (ou bouton/scène)",
};
const BTN_SCHEMA = [
  { name: "name", selector: { text: {} } },
  { name: "icon", selector: { icon: {} } },
  { name: "entity", selector: { entity: { domain: ["script", "button", "input_button", "scene"] } } },
];

class AlexaAnnounceCardEditor extends HTMLElement {
  setConfig(config) {
    const next = { ...DEFAULTS, ...config, buttons: (config.buttons || []).map((b) => ({ ...b })) };
    const same = this._config && this._built && next.buttons.length === this._config.buttons.length;
    this._config = next;
    if (!same) return this._build();
    this.querySelectorAll("ha-form").forEach((f, i) => { f.data = i === 0 ? this._config : this._config.buttons[i - 1]; });
  }

  set hass(hass) {
    this._hass = hass;
    this.querySelectorAll("ha-form").forEach((f) => (f.hass = hass));
  }

  _emit() {
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _build() {
    this._built = true;
    this.innerHTML = "";
    const style = document.createElement("style");
    style.textContent = `.bx{border:1px solid var(--divider-color);border-radius:12px;padding:10px;margin:12px 0}
      .bx .h{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-weight:600}
      .bx button,.add{cursor:pointer;border:1px solid var(--divider-color);background:var(--secondary-background-color);color:var(--primary-text-color);border-radius:8px;padding:6px 10px}
      .add{width:100%;margin-top:4px}`;
    this.appendChild(style);

    const main = document.createElement("ha-form");
    main.hass = this._hass;
    main.data = this._config;
    main.computeLabel = (s) => LABELS[s.name] || s.name;
    main.schema = [
      { name: "title", selector: { text: {} } },
      { type: "grid", name: "", schema: [
        { name: "columns", selector: { number: { min: 0, max: 6, mode: "box" } } },
        { name: "theme", selector: { select: { mode: "dropdown", options: [
          { value: "auto", label: "Automatique (thème de Home Assistant)" }, { value: "light", label: "Clair" }, { value: "dark", label: "Sombre" } ] } } },
      ] },
      { name: "show_custom", selector: { boolean: {} } },
      { name: "send_entity", selector: { entity: { domain: "script" } } },
      { name: "message_entity", selector: { entity: { domain: "input_text" } } },
      { type: "grid", name: "", schema: [{ name: "placeholder", selector: { text: {} } }, { name: "send_label", selector: { text: {} } }] },
    ];
    main.addEventListener("value-changed", (ev) => {
      ev.stopPropagation();
      this._config = { ...this._config, ...ev.detail.value, buttons: this._config.buttons };
      this._emit();
    });
    this.appendChild(main);

    this._config.buttons.forEach((b, i) => {
      const box = document.createElement("div");
      box.className = "bx";
      box.innerHTML = `<div class="h"><span>Bouton ${i + 1}</span><span><button data-up="${i}" title="Monter">↑</button> <button data-down="${i}" title="Descendre">↓</button> <button data-del="${i}" title="Supprimer">✕</button></span></div>`;
      const f = document.createElement("ha-form");
      f.hass = this._hass;
      f.data = b;
      f.computeLabel = (s) => LABELS[s.name] || s.name;
      f.schema = BTN_SCHEMA;
      f.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        this._config.buttons[i] = { ...ev.detail.value };
        this._emit();
      });
      box.appendChild(f);
      this.appendChild(box);
    });

    const add = document.createElement("button");
    add.className = "add";
    add.textContent = "+ Ajouter un bouton d'annonce";
    add.addEventListener("click", () => { this._config.buttons.push({ name: "", icon: "mdi:bullhorn" }); this._emit(); this._build(); });
    this.appendChild(add);

    this.querySelectorAll("[data-del]").forEach((x) => x.addEventListener("click", () => { this._config.buttons.splice(Number(x.dataset.del), 1); this._emit(); this._build(); }));
    this.querySelectorAll("[data-up]").forEach((x) => x.addEventListener("click", () => this._move(Number(x.dataset.up), -1)));
    this.querySelectorAll("[data-down]").forEach((x) => x.addEventListener("click", () => this._move(Number(x.dataset.down), 1)));
  }

  _move(i, d) {
    const j = i + d, a = this._config.buttons;
    if (j < 0 || j >= a.length) return;
    [a[i], a[j]] = [a[j], a[i]];
    this._emit();
    this._build();
  }
}

customElements.define("alexa-announce-card", AlexaAnnounceCard);
customElements.define("alexa-announce-card-editor", AlexaAnnounceCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "alexa-announce-card",
  name: "Alexa Announce Card (FR)",
  description: "Boutons d'annonces Alexa rapides et message personnalisé à envoyer.",
  preview: true,
});

console.info(
  `%c ALEXA-ANNOUNCE-CARD %c v${CARD_VERSION} `,
  "color:#fff;background:#0f8fc4;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px",
  "color:#0f8fc4;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px"
);
