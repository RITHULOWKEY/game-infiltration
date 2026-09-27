import { APPEARANCE_CHOICES, defaultAppearance, type AppearanceKey, type CharacterAppearance, type WorldId } from "./Player";

const PROFILE_KEY = "metro9.profile.v3";
const RUN_KEY = "metro9.run.v3";
const WORLDS: WorldId[] = ["present", "ancient", "future"];

export type MissionStage = 0 | 1 | 2 | 3;
export type PlayerPosition = { x: number; y: number; z: number };
export type ProfileSave = { world: WorldId; appearance: CharacterAppearance; sensitivity: number };
export type RunSave = {
  active: true;
  world: WorldId;
  appearance: CharacterAppearance;
  position: PlayerPosition;
  yaw: number;
  coins: number;
  missionStage: MissionStage;
  observationTime: number;
  observationComplete: boolean;
  detection: number;
  wearingPendant: boolean;
};

function isWorld(value: unknown): value is WorldId {
  return typeof value === "string" && WORLDS.includes(value as WorldId);
}

function safeNumber(value: unknown, fallback: number, minimum: number, maximum: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeAppearance(world: WorldId, value: unknown): CharacterAppearance {
  const defaults = defaultAppearance(world);
  if (!value || typeof value !== "object") return defaults;
  const input = value as Record<string, unknown>;
  const normalized = { ...defaults };
  (Object.keys(APPEARANCE_CHOICES) as AppearanceKey[]).forEach((key) => {
    normalized[key] = Math.round(safeNumber(input[key], defaults[key], 0, APPEARANCE_CHOICES[key].length - 1));
  });
  return normalized;
}

export function readProfile(): ProfileSave {
  const fallback: ProfileSave = { world: "present", appearance: defaultAppearance("present"), sensitivity: 0.0045 };
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const world = isWorld(parsed.world) ? parsed.world : fallback.world;
    return {
      world,
      appearance: normalizeAppearance(world, parsed.appearance),
      sensitivity: safeNumber(parsed.sensitivity, fallback.sensitivity, 0.0015, 0.009),
    };
  } catch {
    return fallback;
  }
}

export function writeProfile(profile: ProfileSave) {
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // The simulation remains playable if browser storage is blocked or full.
  }
}

export function readRun(): RunSave | null {
  try {
    const raw = window.localStorage.getItem(RUN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed.active !== true || !isWorld(parsed.world) || !parsed.position || typeof parsed.position !== "object") return null;
    const world = parsed.world;
    const position = parsed.position as Record<string, unknown>;
    const missionStage = Math.round(safeNumber(parsed.missionStage, 0, 0, 3)) as MissionStage;
    return {
      active: true,
      world,
      appearance: normalizeAppearance(world, parsed.appearance),
      position: {
        x: safeNumber(position.x, 0, -21.5, 21.5),
        y: safeNumber(position.y, 0, 0, 8),
        z: safeNumber(position.z, 15, -23.5, 23.5),
      },
      yaw: safeNumber(parsed.yaw, -0.28, -Math.PI * 2, Math.PI * 2),
      coins: Math.round(safeNumber(parsed.coins, 350, 0, 999999)),
      missionStage,
      observationTime: safeNumber(parsed.observationTime, 180, 0, 180),
      observationComplete: parsed.observationComplete === true,
      detection: safeNumber(parsed.detection, 8, 8, 100),
      wearingPendant: parsed.wearingPendant === true,
    };
  } catch {
    return null;
  }
}

export function writeRun(run: RunSave) {
  try {
    window.localStorage.setItem(RUN_KEY, JSON.stringify(run));
  } catch {
    // The simulation remains playable if browser storage is blocked or full.
  }
}
