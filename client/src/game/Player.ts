import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";
import type { GameInput } from "./InputManager";

export type WorldId = "present" | "ancient" | "future";
export type AppearanceKey = "face" | "skin" | "hair" | "hairColor" | "eyes" | "nose" | "outfit" | "shoes" | "accessory";
export type CharacterAppearance = Record<AppearanceKey, number>;

export const APPEARANCE_CHOICES: Record<AppearanceKey, string[]> = {
  face: ["Soft", "Angular", "Oval"],
  skin: ["Warm umber", "Copper", "Golden", "Deep bronze"],
  hair: ["Close crop", "Textured", "High bun"],
  hairColor: ["Ink", "Chestnut", "Silver", "Copper"],
  eyes: ["Hazel", "Ice", "Amber"],
  nose: ["Straight", "Button", "Sculpted"],
  outfit: ["Field", "Market", "Signal"],
  shoes: ["Street", "Travel", "Mag-step"],
  accessory: ["None", "Optic frames", "Ear cuff"],
};

export function defaultAppearance(world: WorldId): CharacterAppearance {
  return {
    face: 0,
    skin: 1,
    hair: 1,
    hairColor: 0,
    eyes: world === "future" ? 1 : 0,
    nose: 0,
    outfit: world === "ancient" ? 1 : world === "future" ? 2 : 0,
    shoes: world === "ancient" ? 1 : world === "future" ? 2 : 0,
    accessory: world === "future" ? 1 : 0,
  };
}

export type MovementBlocker = {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
};

const skinPalette = ["#693D2E", "#8B523C", "#B87754", "#D39A70"].map((value) => Color3.FromHexString(value));
const hairPalette = ["#17191D", "#543324", "#B9C4C0", "#9A4F32"].map((value) => Color3.FromHexString(value));
const eyePalette = ["#8DB68B", "#73D9E6", "#C79542"].map((value) => Color3.FromHexString(value));
const outfitPalettes: Record<WorldId, Color3[]> = {
  present: ["#15363B", "#715342", "#26313D"].map((value) => Color3.FromHexString(value)),
  ancient: ["#7A4C2F", "#8A6841", "#405C55"].map((value) => Color3.FromHexString(value)),
  future: ["#283043", "#344B59", "#282448"].map((value) => Color3.FromHexString(value)),
};
const trimPalettes: Record<WorldId, Color3[]> = {
  present: ["#31766E", "#C08A45", "#6C9CA6"].map((value) => Color3.FromHexString(value)),
  ancient: ["#D1A351", "#3C7770", "#A8523F"].map((value) => Color3.FromHexString(value)),
  future: ["#48D9E5", "#ED7CCC", "#83E79D"].map((value) => Color3.FromHexString(value)),
};
const shoePalettes: Record<WorldId, Color3[]> = {
  present: ["#161B20", "#4F4339", "#2D4E53"].map((value) => Color3.FromHexString(value)),
  ancient: ["#513522", "#75553A", "#433C31"].map((value) => Color3.FromHexString(value)),
  future: ["#1A2531", "#33414F", "#28263E"].map((value) => Color3.FromHexString(value)),
};

export class Player {
  readonly root: TransformNode;
  private readonly leftArm: ReturnType<typeof MeshBuilder.CreateCylinder>;
  private readonly rightArm: ReturnType<typeof MeshBuilder.CreateCylinder>;
  private readonly leftLeg: ReturnType<typeof MeshBuilder.CreateCylinder>;
  private readonly rightLeg: ReturnType<typeof MeshBuilder.CreateCylinder>;
  private readonly jacketMaterial: StandardMaterial;
  private readonly trimMaterial: StandardMaterial;
  private readonly pantsMaterial: StandardMaterial;
  private readonly shoesMaterial: StandardMaterial;
  private readonly skinMaterial: StandardMaterial;
  private readonly hairMaterial: StandardMaterial;
  private readonly eyeMaterial: StandardMaterial;
  private readonly faceMesh;
  private readonly hairMesh;
  private readonly bunMesh;
  private readonly noseMesh;
  private readonly pendant: TransformNode;
  private readonly glasses: TransformNode;
  private readonly earCuff: TransformNode;
  private readonly walkableAccessories: TransformNode;
  private readonly ancientOutfit: TransformNode;
  private readonly futureOutfit: TransformNode;
  private readonly ancientRobeMaterial: StandardMaterial;
  private readonly ancientSashMaterial: StandardMaterial;
  private readonly futureShellMaterial: StandardMaterial;
  private readonly futureTrimMaterial: StandardMaterial;
  private worldId: WorldId = "present";
  private walkPhase = 0;
  private verticalVelocity = 0;
  private grounded = true;
  private jumpWasDown = false;
  private currentAppearance: CharacterAppearance = defaultAppearance("present");
  wearingPendant = false;

  constructor(private readonly scene: Scene, position: Vector3, worldId: WorldId = "present", appearance?: CharacterAppearance) {
    this.root = new TransformNode("player-avatar", scene);
    this.root.position.copyFrom(position);
    this.worldId = worldId;

    this.jacketMaterial = this.material("player-outfit", new Color3(0.075, 0.145, 0.16));
    this.trimMaterial = this.material("player-outfit-trim", new Color3(0.13, 0.26, 0.28));
    this.pantsMaterial = this.material("player-trousers", new Color3(0.09, 0.11, 0.13));
    this.shoesMaterial = this.material("player-shoes", new Color3(0.025, 0.035, 0.043));
    this.skinMaterial = this.material("player-skin", new Color3(0.55, 0.34, 0.24));
    this.hairMaterial = this.material("player-hair", new Color3(0.025, 0.031, 0.04));
    this.eyeMaterial = this.material("player-eyes", new Color3(0.4, 0.58, 0.39));
    this.ancientOutfit = new TransformNode("ancient-layered-robe", scene);
    this.ancientOutfit.parent = this.root;
    this.futureOutfit = new TransformNode("future-field-armor", scene);
    this.futureOutfit.parent = this.root;
    this.ancientRobeMaterial = this.material("ancient-robe-cloth", new Color3(0.4, 0.23, 0.13));
    this.ancientSashMaterial = this.material("ancient-robe-sash", new Color3(0.77, 0.57, 0.24), new Color3(0.1, 0.055, 0.012));
    this.futureShellMaterial = this.material("future-armor-shell", new Color3(0.1, 0.18, 0.24));
    this.futureTrimMaterial = this.material("future-armor-trim", new Color3(0.12, 0.62, 0.66), new Color3(0.04, 0.23, 0.28));
    const gold = this.material("pendant-gold", new Color3(0.82, 0.53, 0.14), new Color3(0.18, 0.095, 0.018));
    const gem = this.material("pendant-teal-stone", new Color3(0.04, 0.67, 0.63), new Color3(0.01, 0.28, 0.27));

    const jacket = MeshBuilder.CreateCylinder("jacket", { height: 0.92, diameterTop: 0.48, diameterBottom: 0.66, tessellation: 14 }, scene);
    jacket.parent = this.root;
    jacket.position.set(0, 1.02, 0);
    jacket.material = this.jacketMaterial;
    this.partBox("jacket-seam", 0, 1.05, -0.219, 0.045, 0.72, 0.018, this.trimMaterial);
    this.partBox("belt", 0, 0.56, 0, 0.61, 0.08, 0.44, this.trimMaterial);
    this.partBox("collar-left", -0.14, 1.48, -0.1, 0.2, 0.16, 0.13, this.trimMaterial);
    this.partBox("collar-right", 0.14, 1.48, -0.1, 0.2, 0.16, 0.13, this.trimMaterial);

    this.faceMesh = MeshBuilder.CreateSphere("player-head", { diameter: 0.42, segments: 14 }, scene);
    this.faceMesh.parent = this.root;
    this.faceMesh.position.set(0, 1.7, -0.015);
    this.faceMesh.material = this.skinMaterial;
    this.hairMesh = MeshBuilder.CreateSphere("player-hair-cap", { diameter: 0.43, segments: 14 }, scene);
    this.hairMesh.parent = this.root;
    this.hairMesh.scaling.set(0.54, 0.25, 0.52);
    this.hairMesh.position.set(0, 1.88, -0.01);
    this.hairMesh.material = this.hairMaterial;
    this.bunMesh = MeshBuilder.CreateSphere("player-hair-bun", { diameter: 0.19, segments: 10 }, scene);
    this.bunMesh.parent = this.root;
    this.bunMesh.position.set(0, 1.99, -0.07);
    this.bunMesh.material = this.hairMaterial;

    const eyeLeft = MeshBuilder.CreateSphere("player-eye-left", { diameter: 0.07, segments: 10 }, scene);
    eyeLeft.parent = this.root;
    eyeLeft.position.set(-0.082, 1.715, 0.178);
    eyeLeft.material = this.eyeMaterial;
    const eyeRight = MeshBuilder.CreateSphere("player-eye-right", { diameter: 0.07, segments: 10 }, scene);
    eyeRight.parent = this.root;
    eyeRight.position.set(0.082, 1.715, 0.178);
    eyeRight.material = this.eyeMaterial;
    this.noseMesh = MeshBuilder.CreateSphere("player-nose", { diameter: 0.07, segments: 8 }, scene);
    this.noseMesh.parent = this.root;
    this.noseMesh.position.set(0, 1.67, 0.19);
    this.noseMesh.material = this.skinMaterial;

    this.leftArm = this.partCylinder("left-arm", -0.43, 1.02, 0, 0.74, 0.22, this.jacketMaterial);
    this.rightArm = this.partCylinder("right-arm", 0.43, 1.02, 0, 0.74, 0.22, this.jacketMaterial);
    this.leftLeg = this.partCylinder("left-leg", -0.19, 0.38, 0.02, 0.72, 0.25, this.pantsMaterial);
    this.rightLeg = this.partCylinder("right-leg", 0.19, 0.38, 0.02, 0.72, 0.25, this.pantsMaterial);
    this.partBox("left-shoe", -0.19, 0.06, -0.06, 0.28, 0.13, 0.42, this.shoesMaterial);
    this.partBox("right-shoe", 0.19, 0.06, -0.06, 0.28, 0.13, 0.42, this.shoesMaterial);

    this.walkableAccessories = new TransformNode("avatar-accessories", scene);
    this.walkableAccessories.parent = this.root;
    const opticMaterial = this.material("optic-frames", new Color3(0.09, 0.13, 0.15));
    this.glasses = new TransformNode("optic-frames-group", scene);
    this.glasses.parent = this.walkableAccessories;
    for (const x of [-0.082, 0.082]) {
      const lens = MeshBuilder.CreateTorus("optic-lens", { diameter: 0.11, thickness: 0.014, tessellation: 16 }, scene);
      lens.parent = this.glasses;
      lens.position.set(x, 1.715, 0.205);
      lens.material = opticMaterial;
    }
    const bridge = MeshBuilder.CreateBox("optic-bridge", { width: 0.05, height: 0.018, depth: 0.014 }, scene);
    bridge.parent = this.glasses;
    bridge.position.set(0, 1.715, 0.205);
    bridge.material = opticMaterial;
    const cuffMaterial = this.material("gold-ear-cuff", new Color3(0.83, 0.56, 0.2), new Color3(0.12, 0.055, 0.014));
    this.earCuff = new TransformNode("ear-cuff-group", scene);
    this.earCuff.parent = this.walkableAccessories;
    for (const x of [-0.205, 0.205]) {
      const cuff = MeshBuilder.CreateTorus("ear-cuff", { diameter: 0.09, thickness: 0.022, tessellation: 14 }, scene);
      cuff.parent = this.earCuff;
      cuff.position.set(x, 1.66, 0.02);
      cuff.material = cuffMaterial;
    }
    this.glasses.setEnabled(false);
    this.earCuff.setEnabled(false);

    this.pendant = new TransformNode("worn-pendant", scene);
    this.pendant.parent = this.root;
    this.pendant.position.set(0, 1.42, 0.23);
    const chain = MeshBuilder.CreateTorus("worn-pendant-chain", { diameter: 0.28, thickness: 0.022, tessellation: 24 }, scene);
    chain.parent = this.pendant;
    chain.material = gold;
    const setting = MeshBuilder.CreateSphere("worn-pendant-setting", { diameter: 0.13, segments: 10 }, scene);
    setting.parent = this.pendant;
    setting.position.set(0, -0.12, 0.035);
    setting.scaling.y = 1.15;
    setting.material = gold;
    const jewel = MeshBuilder.CreateSphere("worn-pendant-gem", { diameter: 0.078, segments: 10 }, scene);
    jewel.parent = this.pendant;
    jewel.position.set(0, -0.12, 0.09);
    jewel.material = gem;
    this.pendant.setEnabled(false);
    const robe = MeshBuilder.CreateCylinder("player-era-robe", { height: 1.18, diameterTop: 0.48, diameterBottom: 0.88, tessellation: 16 }, scene);
    robe.parent = this.ancientOutfit;
    robe.position.set(0, 0.68, -0.025);
    robe.material = this.ancientRobeMaterial;
    const robeShoulder = MeshBuilder.CreateBox("player-era-robe-shoulder", { width: 0.8, height: 0.24, depth: 0.52 }, scene);
    robeShoulder.parent = this.ancientOutfit;
    robeShoulder.position.set(0, 1.37, -0.015);
    robeShoulder.material = this.ancientRobeMaterial;
    const sash = MeshBuilder.CreateBox("player-era-robe-sash", { width: 0.72, height: 0.13, depth: 0.49 }, scene);
    sash.parent = this.ancientOutfit;
    sash.position.set(0, 1.05, 0.015);
    sash.material = this.ancientSashMaterial;
    const wrap = MeshBuilder.CreateSphere("player-era-head-wrap", { diameter: 0.48, segments: 12 }, scene);
    wrap.parent = this.ancientOutfit;
    wrap.scaling.set(1, 0.28, 0.96);
    wrap.position.set(0, 1.84, -0.025);
    wrap.material = this.ancientSashMaterial;

    const chest = MeshBuilder.CreateBox("player-era-armor-chest", { width: 0.55, height: 0.57, depth: 0.15 }, scene);
    chest.parent = this.futureOutfit;
    chest.position.set(0, 1.11, 0.205);
    chest.material = this.futureShellMaterial;
    const backpack = MeshBuilder.CreateBox("player-era-armor-pack", { width: 0.46, height: 0.68, depth: 0.22 }, scene);
    backpack.parent = this.futureOutfit;
    backpack.position.set(0, 1.12, -0.24);
    backpack.material = this.futureShellMaterial;
    for (const side of [-1, 1]) {
      const shoulder = MeshBuilder.CreateBox("player-era-armor-shoulder", { width: 0.32, height: 0.23, depth: 0.36 }, scene);
      shoulder.parent = this.futureOutfit;
      shoulder.position.set(side * 0.42, 1.41, 0);
      shoulder.rotation.z = side * -0.12;
      shoulder.material = this.futureShellMaterial;
      const gauntlet = MeshBuilder.CreateBox("player-era-armor-gauntlet", { width: 0.12, height: 0.24, depth: 0.25 }, scene);
      gauntlet.parent = this.futureOutfit;
      gauntlet.position.set(side * 0.43, 0.9, 0.04);
      gauntlet.material = this.futureTrimMaterial;
    }
    const suitSignal = MeshBuilder.CreateBox("player-era-armor-signal", { width: 0.09, height: 0.34, depth: 0.035 }, scene);
    suitSignal.parent = this.futureOutfit;
    suitSignal.position.set(0, 1.1, 0.29);
    suitSignal.material = this.futureTrimMaterial;
    this.applyAppearance(appearance ?? defaultAppearance(worldId));
  }

  private material(name: string, color: Color3, glow?: Color3) {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = color;
    material.specularColor = new Color3(0.24, 0.27, 0.29);
    if (glow) material.emissiveColor = glow;
    return material;
  }

  private partBox(name: string, x: number, y: number, z: number, w: number, h: number, d: number, material: StandardMaterial) {
    const mesh = MeshBuilder.CreateBox(name, { width: w, height: h, depth: d }, this.scene);
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    mesh.material = material;
    return mesh;
  }

  private partCylinder(name: string, x: number, y: number, z: number, h: number, diameter: number, material: StandardMaterial) {
    const mesh = MeshBuilder.CreateCylinder(name, { height: h, diameterTop: diameter * 0.84, diameterBottom: diameter, tessellation: 12 }, this.scene);
    mesh.parent = this.root;
    mesh.position.set(x, y, z);
    mesh.material = material;
    return mesh;
  }

  applyAppearance(appearance: CharacterAppearance) {
    const clamp = (key: AppearanceKey) => Math.max(0, Math.min(APPEARANCE_CHOICES[key].length - 1, Math.round(appearance[key] ?? 0)));
    this.currentAppearance = {
      face: clamp("face"), skin: clamp("skin"), hair: clamp("hair"), hairColor: clamp("hairColor"),
      eyes: clamp("eyes"), nose: clamp("nose"), outfit: clamp("outfit"), shoes: clamp("shoes"), accessory: clamp("accessory"),
    };
    this.skinMaterial.diffuseColor = skinPalette[this.currentAppearance.skin];
    this.hairMaterial.diffuseColor = hairPalette[this.currentAppearance.hairColor];
    this.eyeMaterial.diffuseColor = eyePalette[this.currentAppearance.eyes];
    this.jacketMaterial.diffuseColor = outfitPalettes[this.worldId][this.currentAppearance.outfit];
    this.trimMaterial.diffuseColor = trimPalettes[this.worldId][this.currentAppearance.outfit];
    this.trimMaterial.emissiveColor = this.worldId === "future" ? trimPalettes[this.worldId][this.currentAppearance.outfit].scale(0.42) : Color3.Black();
    this.ancientRobeMaterial.diffuseColor = outfitPalettes.ancient[this.currentAppearance.outfit];
    this.ancientSashMaterial.diffuseColor = trimPalettes.ancient[this.currentAppearance.outfit];
    this.futureShellMaterial.diffuseColor = outfitPalettes.future[this.currentAppearance.outfit];
    this.futureTrimMaterial.diffuseColor = trimPalettes.future[this.currentAppearance.outfit];
    this.futureTrimMaterial.emissiveColor = trimPalettes.future[this.currentAppearance.outfit].scale(0.4);
    this.ancientOutfit.setEnabled(this.worldId === "ancient");
    this.futureOutfit.setEnabled(this.worldId === "future");
    this.pantsMaterial.diffuseColor = outfitPalettes[this.worldId][(this.currentAppearance.outfit + 1) % 3].scale(0.7);
    this.shoesMaterial.diffuseColor = shoePalettes[this.worldId][this.currentAppearance.shoes];
    const faceScale = [[1, 1, 1], [0.93, 1.04, 0.98], [0.96, 0.94, 1.04]][this.currentAppearance.face];
    this.faceMesh.scaling.set(faceScale[0], faceScale[1], faceScale[2]);
    const hairScale = [[0.54, 0.24, 0.52], [0.57, 0.33, 0.55], [0.56, 0.28, 0.54]][this.currentAppearance.hair];
    this.hairMesh.scaling.set(hairScale[0], hairScale[1], hairScale[2]);
    this.bunMesh.setEnabled(this.currentAppearance.hair === 2);
    const noseScale = [0.78, 0.65, 0.94][this.currentAppearance.nose];
    this.noseMesh.scaling.set(noseScale, noseScale, 1.25 - this.currentAppearance.nose * 0.12);
    this.glasses.setEnabled(this.currentAppearance.accessory === 1);
    this.earCuff.setEnabled(this.currentAppearance.accessory === 2);
  }

  setWorldStyle(worldId: WorldId, appearance?: CharacterAppearance) {
    this.worldId = worldId;
    this.applyAppearance(appearance ?? defaultAppearance(worldId));
  }

  update(delta: number, input: GameInput, cameraYaw: number, blockers: MovementBlocker[]) {
    let forwardAmount = Number(input.forward) - Number(input.backward);
    let rightAmount = Number(input.right) - Number(input.left);
    const rawLength = Math.hypot(forwardAmount, rightAmount);
    if (rawLength > 1) {
      forwardAmount /= rawLength;
      rightAmount /= rawLength;
    }

    const forward = new Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new Vector3(Math.cos(cameraYaw), 0, -Math.sin(cameraYaw));
    const speed = input.run ? 6.6 : 4.2;
    const dx = (forward.x * forwardAmount + right.x * rightAmount) * speed * delta;
    const dz = (forward.z * forwardAmount + right.z * rightAmount) * speed * delta;

    if (input.jump && !this.jumpWasDown && this.grounded) {
      this.verticalVelocity = 5.2;
      this.grounded = false;
    }
    this.jumpWasDown = input.jump;
    if (!this.grounded) {
      this.root.position.y += this.verticalVelocity * delta;
      this.verticalVelocity -= 14.5 * delta;
      if (this.root.position.y <= 0) {
        this.root.position.y = 0;
        this.verticalVelocity = 0;
        this.grounded = true;
      }
    }

    if (Math.abs(dx) + Math.abs(dz) > 0.0001) {
      const nextX = this.root.position.x + dx;
      const nextZ = this.root.position.z + dz;
      if (!this.isBlocked(nextX, this.root.position.z, blockers)) this.root.position.x = nextX;
      if (!this.isBlocked(this.root.position.x, nextZ, blockers)) this.root.position.z = nextZ;
      const facingX = dx / Math.max(0.0001, Math.hypot(dx, dz));
      const facingZ = dz / Math.max(0.0001, Math.hypot(dx, dz));
      this.root.rotation.y = Math.atan2(-facingX, -facingZ);
      this.walkPhase += delta * (input.run ? 13 : 8.5);
      const swing = Math.sin(this.walkPhase) * 0.48;
      this.leftArm.rotation.x = swing;
      this.rightArm.rotation.x = -swing;
      this.leftLeg.rotation.x = -swing * 0.76;
      this.rightLeg.rotation.x = swing * 0.76;
    } else {
      this.leftArm.rotation.x *= 0.8;
      this.rightArm.rotation.x *= 0.8;
      this.leftLeg.rotation.x *= 0.8;
      this.rightLeg.rotation.x *= 0.8;
    }
  }

  private isBlocked(x: number, z: number, blockers: MovementBlocker[]) {
    if (x < -22 || x > 22 || z < -24 || z > 24) return true;
    const radius = 0.34;
    return blockers.some((blocker) => {
      const nearestX = Math.max(blocker.minX, Math.min(x, blocker.maxX));
      const nearestZ = Math.max(blocker.minZ, Math.min(z, blocker.maxZ));
      return (x - nearestX) ** 2 + (z - nearestZ) ** 2 < radius * radius;
    });
  }

  wearPendant() {
    this.wearingPendant = true;
    this.pendant.setEnabled(true);
  }

  removePendant() {
    this.wearingPendant = false;
    this.pendant.setEnabled(false);
  }

  teleport(position: Vector3) {
    this.root.position.copyFrom(position);
    this.grounded = position.y <= 0;
    if (this.grounded) this.verticalVelocity = 0;
  }

  get appearance() {
    return { ...this.currentAppearance };
  }

  get position() {
    return this.root.position;
  }

  dispose() {
    this.root.dispose(false, true);
  }
}
