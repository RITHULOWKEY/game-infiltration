import { APPEARANCE_CHOICES, type AppearanceKey, type CharacterAppearance, type WorldId } from "./Player";
import { WORLD_CATALOG } from "./WorldCatalog";

export type HudScreen = "title" | "worlds" | "customize" | "ready" | "settings" | "howto" | "pause" | "play";
export type HudActionHandler = (action: string, payload: Record<string, string>) => void;

export type HudSnapshot = {
  timeLeft: number;
  detection: number;
  coins: number;
  phase: string;
  objective: string;
  step: string;
  directive: string;
  wearingPendant: boolean;
  worldName: string;
  district: string;
};

export type DialogContent = {
  eyebrow: string;
  title: string;
  body: string;
  action: string;
  detail?: string;
};

const APPEARANCE_FIELDS: { key: AppearanceKey; label: string; note: string }[] = [
  { key: "face", label: "Face shape", note: "Base profile" },
  { key: "skin", label: "Complexion", note: "Tone" },
  { key: "hair", label: "Hair form", note: "Silhouette" },
  { key: "hairColor", label: "Hair color", note: "Finish" },
  { key: "eyes", label: "Eyes", note: "Iris" },
  { key: "nose", label: "Nose", note: "Profile" },
  { key: "outfit", label: "Outfit", note: "World attire" },
  { key: "shoes", label: "Footwear", note: "Field fit" },
  { key: "accessory", label: "Accessory", note: "Detail" },
];

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export class Hud {
  readonly root: HTMLDivElement;
  private toastTimer: number | undefined;
  private onDialogAction: (() => void) | null = null;
  private onDialogClose: (() => void) | null = null;
  private onActionBound = () => this.onDialogAction?.();
  private onCloseBound = () => this.onDialogClose?.();
  private clickBound = (event: MouseEvent) => this.handleClick(event);
  private inputBound = (event: Event) => this.handleInput(event);
  private readonly actionHandler: HudActionHandler;
  private lastSnapshot = "";

  constructor(actionHandler: HudActionHandler) {
    this.actionHandler = actionHandler;
    this.root = document.createElement("div");
    this.root.className = "metro-hud";
    const worldCards = Object.values(WORLD_CATALOG).map((world) => `
      <button class="world-card" type="button" data-action="select-world" data-world="${world.id}" aria-label="Select ${escapeHtml(world.name)}">
        <span class="world-card-image"><img src="${world.preview}" alt="" loading="lazy"/><span class="world-card-index">${world.label.split("/")[0].trim()}</span><span class="world-card-check">✓</span></span>
        <span class="world-card-copy"><strong>${escapeHtml(world.name)}</strong><small>${escapeHtml(world.tagline)}</small></span>
      </button>`).join("");
    const appearanceControls = APPEARANCE_FIELDS.map(({ key, label, note }) => `
      <div class="appearance-row">
        <div class="appearance-row-label"><strong>${escapeHtml(label)}</strong><small>${escapeHtml(note)}</small></div>
        <button class="appearance-step" type="button" data-action="cycle-appearance" data-field="${key}" data-delta="-1" aria-label="Previous ${label}">−</button>
        <span class="appearance-value" data-current="${key}">—</span>
        <button class="appearance-step" type="button" data-action="cycle-appearance" data-field="${key}" data-delta="1" aria-label="Next ${label}">+</button>
      </div>`).join("");
    this.root.innerHTML = `
      <section class="game-ui" aria-label="Infiltration HUD">
        <header class="hud-topline">
          <div class="hud-brand-block"><div class="hud-brand"><span class="brand-mark">M9</span><span>METRO<span class="brand-accent">-9</span></span></div><div class="hud-kicker">FIELD SYSTEMS <span class="hud-live"><i></i> ONLINE</span></div></div>
          <div class="hud-status"><span class="hud-status-dot"></span><span class="phase-label">OBSERVATION WINDOW</span><span class="hud-divider"></span><span class="timer-number">03:00</span></div>
          <div class="hud-right"><div class="hud-currency"><span class="coin-icon">₵</span><div><small>FIELD CREDITS</small><strong class="coin-value">350</strong></div></div><button class="pause-button" type="button" data-action="pause" aria-label="Pause">Ⅱ</button></div>
        </header>
        <section class="detection-panel" aria-label="Detection meter"><div class="meter-heading"><span>SECURITY AWARENESS</span><strong class="detection-value">08%</strong></div><div class="meter-track"><div class="meter-fill"></div></div><div class="meter-caption"><span>UNNOTICED</span><span>COMPROMISED</span></div></section>
        <section class="objective-card"><div class="objective-kicker"><span class="objective-icon">✦</span><span>FIELD DIRECTIVE</span><span class="directive-id">01 / 03</span></div><div class="objective-step">YOUR FIRST MOVE</div><div class="objective-text">Talk to the contact</div><div class="objective-divider"></div><div class="objective-foot"><span class="district-coord">HAVEN · 09</span><span class="disguise-state"><i></i> COVER: UNVERIFIED</span></div></section>
        <div class="crosshair" aria-hidden="true"><span></span></div>
        <div class="interaction-prompt is-hidden"><span class="keycap">E</span><span class="prompt-label">INTERACT</span><span class="prompt-arrow">↗</span></div>
        <div class="toast-message is-hidden"><span class="toast-pip"></span><span class="toast-text"></span></div>
        <div class="controls-rail"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><label>MOVE</label></span><span><kbd>SHIFT</kbd><label>RUN</label></span><span><kbd>SPACE</kbd><label>JUMP</label></span><span><kbd>DRAG</kbd><label>LOOK</label></span><span><kbd>E</kbd><label>INTERACT</label></span></div>
        <div class="corner-coordinates"><span class="world-name">PRESENT CITY</span><span> · </span><span class="district-coord-bottom">HAVEN · 09</span></div>
      </section>

      <div class="flow-backdrop">
        <div class="flow-frame">
          <header class="flow-header"><button class="flow-brand" type="button" data-action="home"><span class="brand-mark">M9</span><span>METRO<span class="brand-accent">-9</span><small>INFILTRATION PROTOCOL</small></span></button><div class="flow-header-meta"><span class="status-pip"></span> SIMULATION / <span class="header-era">HAVEN · 09</span></div><button class="flow-header-menu" type="button" data-action="settings" aria-label="Open settings">SETTINGS <span>↗</span></button></header>
          <div class="flow-content">
            <section class="flow-screen title-screen" data-view="title">
              <div class="title-copy"><div class="eyebrow"><span>FIELD OPERATION</span><i></i><span>NO. 009</span></div><h1>INFILTRATION<br/><em>PROTOCOL.</em></h1><p class="title-lede">Read the room. Wear the right story.<br/>Move through worlds that remember you.</p><div class="title-foot"><span class="title-rule"></span><span>THREE ERAS. ONE MARK.</span><span>v0.9.7</span></div></div>
              <div class="title-console"><div class="console-crest"><span class="crest-orbit"></span><span class="crest-mark">M9</span><small>FIELD DIVISION<br/>WORLD OPERATIONS</small></div><button class="primary-action" type="button" data-action="start"><span>START GAME</span><b>↗</b></button><button class="secondary-action" type="button" data-action="continue"><span>CONTINUE</span><small class="continue-state">NO ACTIVE RUN</small></button><div class="console-lower"><button type="button" data-action="howto">HOW TO PLAY <span>↗</span></button><button type="button" data-action="settings">SETTINGS <span>↗</span></button></div><div class="title-version"><span>AN INTERACTIVE FIELD STUDY</span><span>© METRO-9 OPERATIONS</span></div></div>
              <div class="title-location"><span class="location-pin"></span><span class="location-label">CURRENT SIMULATION</span><strong class="current-world-name">PRESENT CITY</strong><small class="current-world-tagline">HAVEN DISTRICT · 23:41</small></div>
            </section>

            <section class="flow-screen worlds-screen" data-view="worlds">
              <div class="section-heading"><div><div class="eyebrow"><span>SELECT YOUR REALITY</span><i></i><span>01 — 03</span></div><h2>Choose a <em>world.</em></h2><p>Each era has its own rules, silhouettes, and routes. Your mission follows you.</p></div><button class="back-link" type="button" data-action="home">← BACK TO TITLE</button></div>
              <div class="world-selection-layout"><div class="world-list"><div class="world-list-label">AVAILABLE SIMULATIONS <span>03</span></div>${worldCards}</div><article class="world-showcase"><div class="showcase-image-wrap"><img class="showcase-image" src="${WORLD_CATALOG.present.preview}" alt="Present City night district"/><div class="showcase-shade"></div><div class="showcase-top"><span class="showcase-label">01 / THE PRESENT</span><span class="showcase-live"><i></i> READY</span></div><div class="showcase-bottom"><span class="showcase-location">HAVEN · 09</span><h3 class="showcase-title">Present City</h3><span class="showcase-tagline">Haven District · 23:41</span></div></div><div class="showcase-details"><p class="showcase-description"></p><div class="landmark-list"></div><button class="primary-action showcase-enter" type="button" data-action="enter-customize"><span>ENTER WORLD</span><b>↗</b></button></div></article></div>
              <div class="worlds-footer"><span>SELECT A WORLD TO PREVIEW ITS DISTRICT</span><span>MISSION PROGRESS IS SAVED LOCALLY</span></div>
            </section>

            <section class="flow-screen customize-screen" data-view="customize">
              <div class="section-heading creator-heading"><div><div class="eyebrow"><span>IDENTITY LAB</span><i></i><span>02 — 03</span></div><h2>Build your <em>cover.</em></h2><p>Make the silhouette yours, then step into the selected era.</p></div><button class="back-link" type="button" data-action="back-worlds">← CHANGE WORLD</button></div>
              <div class="creator-layout"><div class="avatar-stage"><div class="avatar-stage-mark"><span class="stage-cross">＋</span><span>LIVE CHARACTER PREVIEW</span></div><div class="avatar-stage-world"><span class="stage-era">ERA / <b class="creator-era">PRESENT CITY</b></span><span class="stage-light"></span></div><div class="avatar-stage-hint">ROTATE · DRAG TO LOOK</div></div><div class="creator-panel"><div class="creator-panel-top"><div><span class="micro-label">CHARACTER TRANSFORMATION</span><h3>Field identity</h3></div><span class="identity-status"><i></i> ACTIVE</span></div><div class="appearance-list">${appearanceControls}</div><div class="creator-tip"><span class="tip-mark">✦</span><span><strong>WORLD ADAPTIVE</strong><small>Attire and materials shift to match your selected reality.</small></span></div><button class="primary-action creator-continue" type="button" data-action="ready"><span>REVIEW ENTRY</span><b>↗</b></button></div></div>
            </section>

            <section class="flow-screen ready-screen" data-view="ready">
              <div class="section-heading"><div><div class="eyebrow"><span>FINAL CHECK</span><i></i><span>03 — 03</span></div><h2>Ready to <em>enter?</em></h2><p>Your look is set. The district and its contact are waiting.</p></div><button class="back-link" type="button" data-action="back-customize">← EDIT IDENTITY</button></div>
              <div class="ready-layout"><div class="ready-world-card"><img class="ready-preview" src="${WORLD_CATALOG.present.preview}" alt="Selected world"/><div class="ready-overlay"></div><div class="ready-world-copy"><span class="eyebrow ready-eyebrow">SELECTED REALITY</span><h3 class="ready-world-name">Present City</h3><span class="ready-world-tagline">Haven District · 23:41</span></div></div><div class="ready-brief"><div class="brief-stamp">M9 <span>FIELD BRIEF</span></div><div class="brief-line"><span>WORLD</span><strong class="brief-world">PRESENT CITY</strong></div><div class="brief-line"><span>ENTRY POINT</span><strong class="brief-location">HAVEN · 09</strong></div><div class="brief-line"><span>CHARACTER</span><strong>TRANSFORMED</strong></div><div class="brief-divider"></div><p>Observe the district before your cover window closes. Talk to a local contact, find the marked item, and return to the transit entrance.</p><button class="primary-action ready-enter" type="button" data-action="enter-game"><span>ENTER WORLD</span><b>↗</b></button><button class="secondary-action ready-back" type="button" data-action="back-customize"><span>ADJUST CHARACTER</span><small>RETURN TO IDENTITY LAB</small></button></div></div>
            </section>

            <section class="flow-screen settings-screen" data-view="settings">
              <div class="section-heading"><div><div class="eyebrow"><span>FIELD SYSTEMS</span><i></i><span>CONFIGURATION</span></div><h2>Settings &amp; <em>controls.</em></h2><p>Adjust the way the simulation responds to your input.</p></div><button class="back-link" type="button" data-action="back-screen">← BACK</button></div>
              <div class="settings-panel"><div class="settings-row"><div><strong>Mouse look sensitivity</strong><small>Changes camera rotation while dragging over the world.</small></div><label class="sensitivity-control"><input type="range" min="0.0015" max="0.009" step="0.0005" value="0.0045" data-setting="sensitivity"/><output class="sensitivity-value">50%</output></label></div><div class="settings-row controls-guide"><div><strong>Field controls</strong><small>All controls are available in the 3D district.</small></div><div class="control-key-list"><span><kbd>W A S D</kbd> MOVE</span><span><kbd>SHIFT</kbd> RUN</span><span><kbd>SPACE</kbd> JUMP</span><span><kbd>DRAG</kbd> LOOK</span><span><kbd>E</kbd> INTERACT</span><span><kbd>ESC</kbd> PAUSE</span></div></div><div class="settings-note"><span>LOCAL PROFILE</span><span>Appearance, world, and current run are saved in this browser.</span></div></div>
            </section>

            <section class="flow-screen howto-screen" data-view="howto">
              <div class="section-heading"><div><div class="eyebrow"><span>FIELD MANUAL</span><i></i><span>QUICK BRIEFING</span></div><h2>Read. Blend. <em>Move.</em></h2><p>A short primer before your first district.</p></div><button class="back-link" type="button" data-action="back-screen">← BACK</button></div>
              <div class="manual-grid"><article class="manual-card"><span>01</span><div><h3>Observe the district</h3><p>Use the three-minute observation window to read the streets, shop, and transit gate. The timer resumes as soon as you enter the simulation.</p></div></article><article class="manual-card"><span>02</span><div><h3>Find the lead</h3><p>Approach people and objects until the interaction prompt appears, then press <kbd>E</kbd>. Follow the directive in the lower-left HUD.</p></div></article><article class="manual-card"><span>03</span><div><h3>Protect your cover</h3><p>Nearby security raises awareness when you are not wearing the marked item. Equip it, then meet your courier at the transit entrance.</p></div></article><article class="manual-card"><span>04</span><div><h3>Move naturally</h3><p><kbd>W A S D</kbd> moves relative to the camera, <kbd>SHIFT</kbd> runs, <kbd>SPACE</kbd> jumps, and a pointer drag turns your view.</p></div></article></div><button class="primary-action manual-start" type="button" data-action="start"><span>CHOOSE A WORLD</span><b>↗</b></button>
            </section>

            <section class="flow-screen pause-screen" data-view="pause">
              <div class="pause-card"><div class="eyebrow"><span>FIELD SYSTEMS</span><i></i><span>PAUSED</span></div><h2>Hold position.</h2><p>Your run is saved automatically while you move through the district.</p><button class="primary-action" type="button" data-action="resume"><span>RESUME RUN</span><b>↗</b></button><button class="secondary-action" type="button" data-action="save-title"><span>RETURN TO TITLE</span><small>YOUR FIELD POSITION WILL BE SAVED</small></button><button class="pause-settings" type="button" data-action="settings">OPEN SETTINGS <span>↗</span></button></div>
            </section>
          </div>
          <footer class="flow-footer"><span>METRO-9 / FIELD OPERATIONS</span><span class="footer-world">PRESENT CITY</span><span>SIMULATION BUILD 09.27</span></footer>
        </div>
      </div>

      <div class="dialog-backdrop is-hidden"><section class="dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="dialog-top"><span class="dialog-eyebrow">CONTACT / ENCRYPTED</span><button class="dialog-close" type="button" aria-label="Close">×</button></div><h2 id="dialog-title">A Lead in the Rain</h2><p class="dialog-body"></p><div class="dialog-item is-hidden"><span class="dialog-item-icon">◇</span><span class="dialog-item-copy"><small>FIELD ITEM</small><strong>THE MARKED PENDANT</strong></span><span class="dialog-item-value">150 ₵</span></div><div class="dialog-footer"><span class="dialog-detail">KEEP YOUR COVER CLOSE</span><button class="dialog-action" type="button"><span class="dialog-action-label">ACCEPT LEAD</span><span>↗</span></button></div></section></div>
    `;
    document.body.appendChild(this.root);
    this.root.addEventListener("click", this.clickBound);
    this.root.addEventListener("input", this.inputBound);
    this.root.querySelector(".dialog-action")?.addEventListener("click", this.onActionBound);
    this.root.querySelector(".dialog-close")?.addEventListener("click", this.onCloseBound);
    this.setWorldSelection("present", true);
    this.setScreen("title");
  }

  private handleClick(event: MouseEvent) {
    const element = (event.target as HTMLElement | null)?.closest<HTMLElement>("[data-action]");
    if (!element || element instanceof HTMLButtonElement && element.disabled) return;
    const payload: Record<string, string> = {};
    for (const key of ["world", "field", "delta"]) {
      const value = element.dataset[key];
      if (value !== undefined) payload[key] = value;
    }
    this.actionHandler(element.dataset.action ?? "", payload);
  }

  private handleInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (input?.dataset.setting === "sensitivity") {
      const value = Number(input.value);
      const normalized = Math.round(((value - 0.0015) / (0.009 - 0.0015)) * 100);
      this.setText(".sensitivity-value", `${normalized}%`);
      this.actionHandler("sensitivity", { value: input.value });
    }
  }

  setScreen(screen: HudScreen) {
    this.root.dataset.screen = screen;
    this.root.querySelectorAll<HTMLElement>(".flow-screen").forEach((view) => {
      view.classList.toggle("is-active", view.dataset.view === screen);
    });
  }

  setContinueAvailable(available: boolean) {
    const button = this.root.querySelector<HTMLButtonElement>('[data-action="continue"]');
    if (!button) return;
    button.disabled = !available;
    button.classList.toggle("is-unavailable", !available);
    this.setText(".continue-state", available ? "RESUME SAVED RUN" : "NO ACTIVE RUN");
  }

  setSensitivity(value: number) {
    const input = this.root.querySelector<HTMLInputElement>('[data-setting="sensitivity"]');
    if (!input) return;
    input.value = value.toFixed(4);
    const normalized = Math.round(((value - 0.0015) / (0.009 - 0.0015)) * 100);
    this.setText(".sensitivity-value", `${normalized}%`);
  }

  setWorldSelection(worldId: WorldId, selected = false) {
    const world = WORLD_CATALOG[worldId];
    this.root.querySelectorAll<HTMLButtonElement>(".world-card").forEach((card) => {
      const active = card.dataset.world === worldId;
      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", String(active));
    });
    const showcase = this.root.querySelector<HTMLImageElement>(".showcase-image");
    if (showcase) {
      showcase.src = world.preview;
      showcase.alt = `${world.name} environment preview`;
    }
    this.setText(".showcase-label", world.label);
    this.setText(".showcase-title", world.name);
    this.setText(".showcase-location", world.district);
    this.setText(".showcase-tagline", world.tagline);
    this.setText(".showcase-description", world.description);
    const landmarkList = this.root.querySelector<HTMLElement>(".landmark-list");
    if (landmarkList) landmarkList.innerHTML = world.landmarks.map((landmark) => `<span><i></i>${escapeHtml(landmark)}</span>`).join("");
    this.setText(".current-world-name", world.name.toUpperCase());
    this.setText(".current-world-tagline", world.tagline.toUpperCase());
    this.setText(".creator-era", world.name.toUpperCase());
    this.setText(".ready-world-name", world.name);
    this.setText(".ready-world-tagline", world.tagline);
    this.setText(".brief-world", world.name.toUpperCase());
    this.setText(".brief-location", world.district);
    this.setText(".header-era", world.district);
    this.setText(".world-name", world.name.toUpperCase());
    this.setText(".district-coord-bottom", world.district);
    this.setText(".footer-world", world.name.toUpperCase());
    const ready = this.root.querySelector<HTMLImageElement>(".ready-preview");
    if (ready) {
      ready.src = world.preview;
      ready.alt = `${world.name} selected world`;
    }
    if (selected) this.root.querySelector(".showcase-live")?.classList.add("is-ready");
  }

  setAppearance(appearance: CharacterAppearance) {
    for (const field of APPEARANCE_FIELDS) {
      const choices = APPEARANCE_CHOICES[field.key];
      this.setText(`[data-current="${field.key}"]`, choices[appearance[field.key]] ?? choices[0]);
      const row = this.root.querySelector<HTMLElement>(`[data-current="${field.key}"]`)?.closest(".appearance-row");
      row?.setAttribute("aria-label", `${field.label}: ${choices[appearance[field.key]] ?? choices[0]}`);
    }
  }

  setSnapshot(snapshot: HudSnapshot) {
    const stamp = `${snapshot.timeLeft}|${snapshot.detection}|${snapshot.coins}|${snapshot.phase}|${snapshot.objective}|${snapshot.step}|${snapshot.directive}|${snapshot.wearingPendant}|${snapshot.worldName}|${snapshot.district}`;
    if (stamp === this.lastSnapshot) return;
    this.lastSnapshot = stamp;
    const minutes = Math.floor(snapshot.timeLeft / 60).toString().padStart(2, "0");
    const seconds = Math.floor(snapshot.timeLeft % 60).toString().padStart(2, "0");
    this.setText(".timer-number", `${minutes}:${seconds}`);
    this.setText(".phase-label", snapshot.phase);
    this.setText(".detection-value", `${Math.round(snapshot.detection).toString().padStart(2, "0")}%`);
    this.setText(".coin-value", snapshot.coins.toString().padStart(3, "0"));
    this.setText(".objective-step", snapshot.step);
    this.setText(".objective-text", snapshot.objective);
    this.setText(".directive-id", snapshot.directive);
    this.setText(".disguise-state", snapshot.wearingPendant ? "COVER: VERIFIED" : "COVER: UNVERIFIED");
    this.setText(".district-coord", snapshot.district);
    this.setText(".district-coord-bottom", snapshot.district);
    this.setText(".world-name", snapshot.worldName.toUpperCase());
    this.root.querySelector(".meter-fill")?.setAttribute("style", `width:${Math.max(0, Math.min(100, snapshot.detection))}%;`);
    this.root.querySelector(".disguise-state")?.classList.toggle("is-verified", snapshot.wearingPendant);
    this.root.querySelector(".hud-status-dot")?.classList.toggle("is-alert", snapshot.detection >= 65);
    this.root.querySelector(".detection-panel")?.classList.toggle("is-alert", snapshot.detection >= 65);
  }

  setPrompt(label: string | null) {
    const prompt = this.root.querySelector<HTMLElement>(".interaction-prompt");
    if (!prompt) return;
    prompt.classList.toggle("is-hidden", !label);
    this.setText(".prompt-label", label ?? "INTERACT");
  }

  showDialog(content: DialogContent, action: () => void, close: () => void = () => this.closeDialog()) {
    this.onDialogAction = action;
    this.onDialogClose = close;
    this.setText(".dialog-eyebrow", content.eyebrow);
    this.setText("#dialog-title", content.title);
    this.setText(".dialog-body", content.body);
    this.setText(".dialog-action-label", content.action);
    this.setText(".dialog-detail", content.detail ?? "KEEP YOUR COVER CLOSE");
    this.root.querySelector(".dialog-item")?.classList.toggle("is-hidden", !content.title.toLowerCase().includes("pendant"));
    this.root.querySelector(".dialog-backdrop")?.classList.remove("is-hidden");
  }

  closeDialog() {
    this.root.querySelector(".dialog-backdrop")?.classList.add("is-hidden");
    this.onDialogAction = null;
    this.onDialogClose = null;
  }

  showToast(message: string) {
    this.setText(".toast-text", message);
    const toast = this.root.querySelector(".toast-message");
    toast?.classList.remove("is-hidden");
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => toast?.classList.add("is-hidden"), 2900);
  }

  private setText(selector: string, value: string) {
    const element = this.root.querySelector<HTMLElement>(selector);
    if (element && element.textContent !== value) element.textContent = value;
  }

  dispose() {
    if (this.toastTimer) window.clearTimeout(this.toastTimer);
    this.root.removeEventListener("click", this.clickBound);
    this.root.removeEventListener("input", this.inputBound);
    this.root.querySelector(".dialog-action")?.removeEventListener("click", this.onActionBound);
    this.root.querySelector(".dialog-close")?.removeEventListener("click", this.onCloseBound);
    this.root.remove();
  }
}
