export type GameInput = {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
  jump: boolean;
};

export class InputManager {
  readonly input: GameInput = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    run: false,
    jump: false,
  };

  yaw = 0;
  pitch = 0.18;
  enabled = true;
  sensitivity = 0.0045;

  private dragging = false;
  private lastX = 0;
  private lastY = 0;
  private readonly onInteract: () => void;
  private readonly onEscape: () => void;

  constructor(private readonly canvas: HTMLCanvasElement, onInteract: () => void, onEscape: () => void = () => undefined) {
    this.onInteract = onInteract;
    this.onEscape = onEscape;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    canvas.addEventListener("pointerdown", this.handlePointerDown);
    canvas.addEventListener("pointermove", this.handlePointerMove);
    window.addEventListener("pointerup", this.handlePointerUp);
    canvas.addEventListener("contextmenu", this.preventContextMenu);
  }

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("button, input, textarea, select")) return;
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift", "e", " "].includes(key)) {
      event.preventDefault();
    }
    if (key === "escape" && !event.repeat) {
      this.onEscape();
      return;
    }
    if (!this.enabled) return;
    if (key === "e" && !event.repeat) {
      this.onInteract();
      return;
    }
    if (key === "w" || key === "arrowup") this.input.forward = true;
    if (key === "s" || key === "arrowdown") this.input.backward = true;
    if (key === "a" || key === "arrowleft") this.input.left = true;
    if (key === "d" || key === "arrowright") this.input.right = true;
    if (key === "shift") this.input.run = true;
    if (key === " ") this.input.jump = true;
  };

  private readonly handleKeyUp = (event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === "w" || key === "arrowup") this.input.forward = false;
    if (key === "s" || key === "arrowdown") this.input.backward = false;
    if (key === "a" || key === "arrowleft") this.input.left = false;
    if (key === "d" || key === "arrowright") this.input.right = false;
    if (key === "shift") this.input.run = false;
    if (key === " ") this.input.jump = false;
  };

  private readonly handleBlur = () => this.clearKeys();

  private readonly handlePointerDown = (event: PointerEvent) => {
    if (!this.enabled || event.button !== 0) return;
    this.dragging = true;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.canvas.setPointerCapture?.(event.pointerId);
  };

  private readonly handlePointerMove = (event: PointerEvent) => {
    if (!this.enabled || !this.dragging) return;
    const dx = event.clientX - this.lastX;
    const dy = event.clientY - this.lastY;
    this.lastX = event.clientX;
    this.lastY = event.clientY;
    this.yaw -= dx * this.sensitivity;
    this.pitch = Math.max(-0.02, Math.min(0.48, this.pitch + dy * this.sensitivity * 0.53));
  };

  private readonly handlePointerUp = () => {
    this.dragging = false;
  };

  private readonly preventContextMenu = (event: Event) => event.preventDefault();

  setLookSensitivity(value: number) {
    this.sensitivity = Math.max(0.0015, Math.min(0.009, value));
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.clearKeys();
      this.dragging = false;
    }
  }

  clearKeys() {
    this.input.forward = false;
    this.input.backward = false;
    this.input.left = false;
    this.input.right = false;
    this.input.run = false;
    this.input.jump = false;
  }

  dispose() {
    this.clearKeys();
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    window.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("contextmenu", this.preventContextMenu);
  }
}
