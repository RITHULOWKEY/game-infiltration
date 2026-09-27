import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Scene } from "@babylonjs/core/scene";
import type { MovementBlocker, WorldId } from "./Player";

export type InteractionTarget = {
  id: "contact" | "pendant" | "courier" | "jeweller" | "door" | "wardrobe" | "vehicle" | "transit";
  label: string;
  position: Vector3;
  radius: number;
  visual: AbstractMesh;
};

type Walker = {
  root: TransformNode;
  x: number;
  z: number;
  phase: number;
  pace: number;
};

export class World {
  readonly root: TransformNode;
  readonly blockers: MovementBlocker[] = [];
  readonly targets: InteractionTarget[] = [];
  readonly contactPosition = new Vector3(0.9, 0, 12.8);
  readonly pendantPosition = new Vector3(8.55, 1.22, -0.55);
  readonly courierPosition = new Vector3(-2.8, 0, -17.1);
  readonly securityPosition = new Vector3(-5.1, 0, -14.0);
  private readonly walkers: Walker[] = [];
  private readonly actors: TransformNode[] = [];
  private readonly security: TransformNode;
  private readonly stoneTexture: Texture | null;
  private readonly gemMaterial: StandardMaterial;
  private readonly shopDoors: TransformNode[] = [];
  private readonly shopDoorBlocker: MovementBlocker = { minX: 6.72, maxX: 9.98, minZ: 5.78, maxZ: 6.32 };
  private shopDoorOpen = true;
  private wardrobeMarker!: AbstractMesh;
  private vehicleMarker!: AbstractMesh;
  private clock = 0;
  private lastHighlighted: string | null = null;

  constructor(private readonly scene: Scene, readonly id: WorldId = "present") {
    const existingMeshes = new Set(scene.meshes);
    const existingLights = new Set(scene.lights);
    this.root = new TransformNode(`world-${id}-root`, scene);
    this.stoneTexture = id === "present" ? new Texture("/manus-storage/metro9-stone_85ad7add.png", scene, false, true) : null;
    if (this.stoneTexture) {
      this.stoneTexture.uScale = 2;
      this.stoneTexture.vScale = 2;
    }
    if (id === "present") {
      this.buildGround();
      this.buildStreet();
      this.buildBuildings();
      this.buildJewelleryShop();
      this.buildMetro();
      this.buildProps();
    } else if (id === "ancient") {
      this.buildAncientWorld();
    } else {
      this.buildFutureWorld();
    }
    this.buildShopDoors();
    this.buildAccessoryStand();
    this.buildVehicle();

    const courier = this.person("metro-courier", this.courierPosition, new Color3(0.10, 0.46, 0.45), new Color3(0.1, 0.12, 0.13));
    const contact = this.person("street-contact", this.contactPosition, new Color3(0.13, 0.43, 0.38), new Color3(0.08, 0.12, 0.14));
    const jeweller = this.person("jeweller", new Vector3(11.15, 0, -1.65), new Color3(0.39, 0.27, 0.14), new Color3(0.13, 0.1, 0.08));
    this.security = this.person("metro-security", this.securityPosition, new Color3(0.12, 0.2, 0.28), new Color3(0.08, 0.12, 0.16));

    const contactBadge = this.sphere("contact-marker", new Vector3(0.9, 2.35, 12.8), 0.12, this.emissiveMaterial("contact-marker-light", new Color3(0.18, 0.9, 0.77)));
    const courierBadge = this.sphere("courier-marker", new Vector3(-2.8, 2.35, -17.1), 0.12, this.emissiveMaterial("courier-marker-light", new Color3(0.18, 0.9, 0.77)));
    const jewellerBadge = this.sphere("jeweller-marker", new Vector3(11.15, 2.35, -1.65), 0.08, this.emissiveMaterial("shopkeeper-marker-light", new Color3(0.92, 0.56, 0.2)));
    const doorBadge = this.sphere("shop-door-marker", new Vector3(8.35, 2.35, 6.2), 0.1, this.emissiveMaterial("shop-door-marker-light", new Color3(0.18, 0.83, 0.74)));
    this.wardrobeMarker = this.sphere("accessory-rack-marker", new Vector3(5.4, 2.25, -2.2), 0.09, this.emissiveMaterial("accessory-marker-light", new Color3(0.86, 0.59, 0.2)));
    const transitBadge = this.sphere("transit-marker", new Vector3(2.75, 2.35, -13.7), 0.11, this.emissiveMaterial("transit-marker-light", new Color3(0.18, 0.83, 0.74)));

    this.targets.push(
      { id: "contact", label: this.id === "ancient" ? "SPEAK WITH THE MARKED INFORMANT" : this.id === "future" ? "OPEN THE SIGNAL BRIEF" : "TALK TO THE CONTACT", position: this.contactPosition, radius: 2.65, visual: contactBadge },
      { id: "pendant", label: this.id === "ancient" ? "INSPECT THE COURT RELIC" : this.id === "future" ? "SCAN THE SIGNAL PENDANT" : "INSPECT THE VINTAGE PENDANT", position: this.pendantPosition, radius: 2.55, visual: contactBadge },
      { id: "courier", label: this.id === "ancient" ? "MEET THE GATE RUNNER" : this.id === "future" ? "MEET THE TRANSIT OPERATOR" : "MEET THE METRO COURIER", position: this.courierPosition.add(new Vector3(0, 1.1, 0)), radius: 2.7, visual: courierBadge },
      { id: "jeweller", label: this.id === "ancient" ? "SPEAK WITH THE BAZAAR KEEPER" : this.id === "future" ? "SPEAK WITH THE KIOSK ANDROID" : "SPEAK WITH THE JEWELLER", position: new Vector3(11.15, 0, -1.65), radius: 2.3, visual: jewellerBadge },
      { id: "door", label: "CLOSE THE SHOP DOORS", position: new Vector3(8.35, 0.9, 6.2), radius: 2.35, visual: doorBadge },
      { id: "wardrobe", label: this.id === "ancient" ? "TRY ON MARKET FINERY" : this.id === "future" ? "SYNC A TECH ACCESSORY" : "BROWSE CLOTHES & ACCESSORIES", position: new Vector3(5.4, 0.8, -2.2), radius: 2.35, visual: this.wardrobeMarker },
      { id: "vehicle", label: this.id === "ancient" ? "INSPECT THE HANDCART" : this.id === "future" ? "INSPECT THE HOVERCRAFT" : "INSPECT THE CITY CAR", position: this.id === "present" ? new Vector3(6.65, 0, -10.2) : this.id === "ancient" ? new Vector3(-5.4, 0, -0.8) : new Vector3(2.1, 0, -5.5), radius: this.id === "future" ? 4.0 : 2.9, visual: this.vehicleMarker },
      { id: "transit", label: this.id === "ancient" ? "USE THE ASHEN GATE" : this.id === "future" ? "BOARD THE MERIDIAN MAGLEV" : "USE THE METRO-9 ENTRANCE", position: new Vector3(2.75, 0, -13.7), radius: 2.85, visual: transitBadge },
    );

    // People walk along the sidewalk in short, looping routes to keep the block alive.
    this.walkers.push(
      { root: this.person("pedestrian-1", new Vector3(-4.8, 0, 7.2), new Color3(0.28, 0.24, 0.18), new Color3(0.12, 0.11, 0.1)), x: -4.8, z: 7.2, phase: 0.3, pace: 0.32 },
      { root: this.person("pedestrian-2", new Vector3(4.3, 0, -3.1), new Color3(0.19, 0.28, 0.31), new Color3(0.08, 0.1, 0.11)), x: 4.3, z: -3.1, phase: 2.0, pace: 0.26 },
      { root: this.person("pedestrian-3", new Vector3(-5.0, 0, -9.0), new Color3(0.36, 0.25, 0.2), new Color3(0.13, 0.09, 0.08)), x: -5.0, z: -9.0, phase: 4.2, pace: 0.28 },
    );

    this.gemMaterial = this.emissiveMaterial("display-gem", new Color3(0.03, 0.42, 0.39));
    const necklaceGem = this.buildNecklaceDisplay();
    this.targets.find((target) => target.id === "pendant")!.visual = necklaceGem;

    // A few low-level sign, torus, and point-light helpers construct nodes directly.
    // Adopt every new top-level node so a world transition has one clean owner.
    for (const mesh of scene.meshes) {
      if (!existingMeshes.has(mesh) && !mesh.parent) mesh.parent = this.root;
    }
    for (const light of scene.lights) {
      if (!existingLights.has(light) && !light.parent) light.parent = this.root;
    }

    // Keep explicit scene references so unused local variables above still mark the intended actors.
    void courier;
    void contact;
    void jeweller;
  }

  private material(name: string, color: Color3, emissive = Color3.Black(), specular = new Color3(0.18, 0.2, 0.23)) {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = color;
    material.emissiveColor = emissive;
    material.specularColor = specular;
    return material;
  }

  private emissiveMaterial(name: string, color: Color3) {
    return this.material(name, color, color.scale(0.6), new Color3(0.08, 0.1, 0.1));
  }

  private box(name: string, position: Vector3, size: Vector3, material: StandardMaterial, parent?: TransformNode) {
    const mesh = MeshBuilder.CreateBox(name, { width: size.x, height: size.y, depth: size.z }, this.scene);
    mesh.position.copyFrom(position);
    mesh.material = material;
    mesh.parent = parent ?? this.root;
    if (/wall|building|temple|fort|tower|house|gate|shop-|bazaar/i.test(name)) {
      mesh.metadata = { ...(mesh.metadata ?? {}), cameraBlocker: true };
    }
    return mesh;
  }

  private cylinder(name: string, position: Vector3, height: number, diameter: number, material: StandardMaterial, tessellation = 12, parent?: TransformNode) {
    const mesh = MeshBuilder.CreateCylinder(name, { height, diameter, tessellation }, this.scene);
    mesh.position.copyFrom(position);
    mesh.material = material;
    mesh.parent = parent ?? this.root;
    return mesh;
  }

  private sphere(name: string, position: Vector3, diameter: number, material: StandardMaterial, parent?: TransformNode) {
    const mesh = MeshBuilder.CreateSphere(name, { diameter, segments: 10 }, this.scene);
    mesh.position.copyFrom(position);
    mesh.material = material;
    mesh.parent = parent ?? this.root;
    return mesh;
  }

  private addBlocker(minX: number, maxX: number, minZ: number, maxZ: number) {
    this.blockers.push({ minX, maxX, minZ, maxZ });
  }

  private worldFloor(name: string, x: number, z: number, width: number, depth: number, material: StandardMaterial) {
    const ground = MeshBuilder.CreateGround(name, { width, height: depth }, this.scene);
    ground.position.set(x, -0.12, z);
    ground.material = material;
    ground.parent = this.root;
    return ground;
  }

  private worldLight(name: string, position: Vector3, color: Color3, intensity: number, range: number) {
    const light = new PointLight(name, position, this.scene);
    light.diffuse = color;
    light.intensity = intensity;
    light.range = range;
    light.parent = this.root;
    return light;
  }

  private buildAncientWorld() {
    const earth = this.material("ashen-earth", new Color3(0.19, 0.145, 0.095));
    const limestone = this.material("ashen-limestone", new Color3(0.4, 0.32, 0.23));
    const dressedStone = this.material("temple-marble", new Color3(0.55, 0.45, 0.32));
    const cobble = this.material("market-cobble", new Color3(0.34, 0.28, 0.2));
    const timber = this.material("market-timber", new Color3(0.19, 0.11, 0.055));
    const roof = this.material("terracotta-roof", new Color3(0.34, 0.16, 0.085));
    const warm = this.emissiveMaterial("brazier-amber", new Color3(1, 0.45, 0.12));
    this.worldFloor("ashen-kingdom-ground", 0, 0, 52, 58, earth);
    this.worldFloor("ashen-gate-cobble-road", 0, 0, 8.2, 48, cobble);
    this.worldFloor("merchant-courtyard", 8.35, 0.05, 10.5, 12.5, limestone);

    // An actual walled citadel, open through a wide southern gate.
    for (const z of [-22, 22]) {
      this.box("fortress-wall", new Vector3(0, 3.5, z), new Vector3(36, 7, 1.2), limestone);
      for (let x = -17; x <= 17; x += 2.4) this.box("fortress-merlon", new Vector3(x, 7.35, z), new Vector3(0.92, 0.58, 1.35), dressedStone);
      this.addBlocker(-18, 18, z - 0.7, z + 0.7);
    }
    for (const x of [-18, 18]) {
      this.box("fortress-side-wall", new Vector3(x, 3.45, 0), new Vector3(1.2, 6.9, 44), limestone);
      this.addBlocker(x - 0.7, x + 0.7, -22, 22);
    }
    this.box("ashen-gate-left-tower", new Vector3(-8.2, 4.25, -17.5), new Vector3(4.2, 8.5, 3), dressedStone);
    this.box("ashen-gate-right-tower", new Vector3(2.1, 4.25, -17.5), new Vector3(4.2, 8.5, 3), dressedStone);
    this.box("ashen-gate-lintel", new Vector3(-3.05, 7.6, -17.5), new Vector3(6.2, 1.3, 3), dressedStone);
    this.box("ashen-gate-dark-passage", new Vector3(-3.05, 2.9, -17.25), new Vector3(5.7, 5.7, 0.1), this.material("gate-passage-shadow", new Color3(0.06, 0.05, 0.038)));
    this.makeSign("ASHEN GATE", "THE OLD KINGDOM", new Vector3(-3.05, 6.18, -15.92), 4.2, 0.82, false, warm);
    this.addBlocker(-10.4, -6, -19.2, -16.1);
    this.addBlocker(-0.1, 4.3, -19.2, -16.1);

    // Temple columns, shallow pediment, and a broad stair form a clear distant landmark.
    this.box("sun-temple-platform", new Vector3(-11.2, 0.45, -8.3), new Vector3(10.6, 0.9, 7.4), dressedStone);
    for (let i = 0; i < 4; i++) this.box("temple-stair", new Vector3(-11.2, 0.13 + i * 0.15, -4.7 + i * 0.7), new Vector3(8.8 - i * 0.35, 0.22, 0.76), limestone);
    for (let x = -14.6; x <= -7.6; x += 1.75) this.cylinder("sun-temple-column", new Vector3(x, 2.15, -5.5), 3.5, 0.48, dressedStone, 12);
    this.box("temple-lintel", new Vector3(-11.1, 4.05, -5.5), new Vector3(9.2, 0.55, 0.78), dressedStone);
    this.box("temple-pediment", new Vector3(-11.1, 4.9, -5.5), new Vector3(9.2, 1.1, 0.7), roof);
    this.box("temple-roof", new Vector3(-11.1, 5.7, -8.5), new Vector3(10.3, 0.55, 6.5), roof);
    this.makeSign("SUN TEMPLE", "ARCHIVE OF THE COURT", new Vector3(-11.1, 3.45, -5.08), 4.7, 0.64, false, warm);
    this.addBlocker(-16.5, -5.7, -12.5, -3.4);

    // Low stone homes and market tents establish an inhabited village, not a recolored street.
    const houses = [
      { x: -13.3, z: 7.3, w: 5.6, h: 4.6 },
      { x: 14.4, z: 7.3, w: 5.5, h: 4.9 },
      { x: 14.2, z: -8.1, w: 5.2, h: 4.3 },
      { x: -14.1, z: -1.1, w: 5.0, h: 4.1 },
    ];
    houses.forEach((house, index) => {
      this.box(`village-house-${index}`, new Vector3(house.x, house.h / 2, house.z), new Vector3(house.w, house.h, 5.2), index % 2 ? limestone : dressedStone);
      const roofMesh = this.box(`village-house-roof-${index}`, new Vector3(house.x, house.h + 0.52, house.z), new Vector3(house.w + 0.7, 1.08, 5.9), roof);
      roofMesh.rotation.z = index % 2 ? -0.08 : 0.08;
      this.box("village-timber-beam", new Vector3(house.x, house.h - 0.48, house.z + 2.62), new Vector3(house.w + 0.12, 0.16, 0.16), timber);
      this.addBlocker(house.x - house.w / 2, house.x + house.w / 2, house.z - 2.6, house.z + 2.6);
    });
    const awnings = [new Color3(0.52, 0.2, 0.12), new Color3(0.18, 0.37, 0.32), new Color3(0.62, 0.46, 0.2)];
    for (const [index, x, z] of [[0, -7.3, 8.8], [1, 0.2, 7.5], [2, 14.1, -0.3]] as const) {
      this.box(`bazaar-stall-table-${index}`, new Vector3(x, 0.56, z), new Vector3(3.1, 0.85, 1.15), timber);
      this.box(`bazaar-awning-${index}`, new Vector3(x, 2.55, z), new Vector3(3.8, 0.18, 3.2), this.material(`bazaar-cloth-${index}`, awnings[index]));
      for (const dx of [-1.65, 1.65]) this.cylinder("bazaar-canopy-post", new Vector3(x + dx, 1.35, z), 2.6, 0.12, timber, 8);
      this.addBlocker(x - 1.45, x + 1.45, z - 0.7, z + 0.7);
    }
    this.buildEraShop("ancient", limestone, timber, warm);
    for (const position of [new Vector3(-7.1, 2.9, 11), new Vector3(7.3, 2.9, 9), new Vector3(-8.5, 2.9, -1), new Vector3(13.4, 2.9, -15)]) {
      this.cylinder("bronze-brazier-stem", position.add(new Vector3(0, -1.1, 0)), 2.2, 0.14, this.material("brazier-bronze", new Color3(0.4, 0.25, 0.11)), 10);
      this.sphere("brazier-flame", position, 0.3, warm);
      this.worldLight("brazier-light", position, new Color3(1, 0.5, 0.19), 0.38, 7);
    }
    const cart = this.box("bazaar-handcart", new Vector3(-5.4, 0.5, -0.8), new Vector3(1.8, 0.75, 1), timber);
    cart.rotation.y = 0.24;
  }

  private buildFutureWorld() {
    const alloy = this.material("meridian-alloy", new Color3(0.09, 0.14, 0.19), new Color3(0.014, 0.028, 0.045));
    const platform = this.material("meridian-ground", new Color3(0.035, 0.052, 0.082), new Color3(0.007, 0.014, 0.026));
    const lane = this.material("maglev-walkway", new Color3(0.07, 0.105, 0.145), new Color3(0.01, 0.028, 0.046));
    const cyan = this.emissiveMaterial("meridian-cyan", new Color3(0.035, 0.72, 0.87));
    const violet = this.emissiveMaterial("meridian-violet", new Color3(0.38, 0.18, 0.82));
    this.worldFloor("meridian-platform", 0, 0, 52, 58, platform);
    this.worldFloor("meridian-maglev-lane", 0, 0, 9, 48, lane);
    this.worldFloor("future-kiosk-floor", 8.35, 0.05, 10.5, 12.5, lane);
    for (let z = -21; z <= 21; z += 5) this.box("maglev-lane-marker", new Vector3(0, 0.01, z), new Vector3(0.11, 0.04, 2), cyan);
    const towers = [
      { x: -13, z: -11, w: 8, d: 13, h: 17 }, { x: -13, z: 10, w: 8, d: 12, h: 14 },
      { x: 15, z: -12, w: 8, d: 13, h: 21 }, { x: 15, z: 10, w: 8, d: 13, h: 18 },
      { x: 0, z: -24, w: 18, d: 5, h: 19 },
    ];
    towers.forEach((tower, index) => {
      this.box(`meridian-tower-${index}`, new Vector3(tower.x, tower.h / 2, tower.z), new Vector3(tower.w, tower.h, tower.d), alloy);
      const glow = index % 2 ? violet : cyan;
      for (let y = 2; y < tower.h; y += 3) this.box("tower-light-band", new Vector3(tower.x, y, tower.z + tower.d / 2 + 0.06), new Vector3(tower.w * 0.72, 0.1, 0.08), glow);
      this.addBlocker(tower.x - tower.w / 2, tower.x + tower.w / 2, tower.z - tower.d / 2, tower.z + tower.d / 2);
    });
    this.box("meridian-skybridge", new Vector3(-5.4, 6.15, -9.6), new Vector3(17, 0.42, 0.7), alloy);
    this.box("skybridge-neon-rail", new Vector3(-5.4, 5.91, -9.17), new Vector3(17, 0.08, 0.09), violet);
    for (const x of [-13.3, 2.5]) this.cylinder("skybridge-pylon", new Vector3(x, 3, -9.6), 6, 0.55, alloy, 10);
    this.buildEraShop("future", alloy, lane, cyan);

    this.box("maglev-platform", new Vector3(-3.2, 0.22, -17.2), new Vector3(9.2, 0.44, 4.2), alloy);
    for (const x of [-7.1, 0.7]) this.box("maglev-gate-pillar", new Vector3(x, 2.55, -16.2), new Vector3(0.58, 5.1, 0.72), alloy);
    this.box("maglev-gate-crown", new Vector3(-3.2, 5, -16.2), new Vector3(8, 0.48, 0.72), alloy);
    this.box("maglev-gate-glow", new Vector3(-3.2, 4.68, -15.8), new Vector3(7, 0.08, 0.07), cyan);
    this.makeSign("MERIDIAN 9", "MAGLEV / CENTRAL", new Vector3(-3.2, 4, -15.78), 4.5, 0.9, false, cyan);
    this.box("transit-operator-console", new Vector3(-5.1, 1, -14.9), new Vector3(1.4, 1.5, 0.55), alloy);
    for (const z of [-16, -8, 1, 10]) {
      this.box("signal-pylon", new Vector3(7.1, 2.5, z), new Vector3(0.32, 5, 0.32), alloy);
      this.box("signal-pylon-light", new Vector3(7.1, 2.6, z + 0.18), new Vector3(0.08, 3.1, 0.06), cyan);
      this.worldLight("pylon-light", new Vector3(7.1, 3.5, z), new Color3(0.09, 0.61, 1), 0.18, 5.5);
    }
    for (const [index, x, z, y] of [[0, -7.3, 7.1, 2.7], [1, 2.1, -5.5, 7.1]] as const) {
      const vehicle = new TransformNode(`hovercraft-${index}`, this.scene);
      vehicle.parent = this.root;
      vehicle.position.set(x, y, z);
      this.box("hovercraft-body", new Vector3(0, 0, 0), new Vector3(3.6, 0.56, 1.65), alloy, vehicle);
      this.box("hovercraft-canopy", new Vector3(0, 0.4, -0.08), new Vector3(1.5, 0.42, 1.06), this.material("hovercraft-glass", new Color3(0.06, 0.24, 0.32), new Color3(0.025, 0.1, 0.15)), vehicle);
      for (const dx of [-1.1, 1.1]) this.box("hovercraft-engine-glow", new Vector3(dx, -0.3, 0.25), new Vector3(0.2, 0.12, 0.85), index ? violet : cyan, vehicle);
    }
  }

  private buildEraShop(era: "ancient" | "future", wall: StandardMaterial, trim: StandardMaterial, glow: StandardMaterial) {
    const glass = this.material(`${era}-shop-glass`, era === "future" ? new Color3(0.045, 0.16, 0.22) : new Color3(0.24, 0.16, 0.095), era === "future" ? new Color3(0.025, 0.09, 0.13) : new Color3(0.045, 0.025, 0.009), new Color3(0.45, 0.58, 0.6));
    if (era === "future") glass.alpha = 0.48;
    this.box("shop-left-wall", new Vector3(3.1, 2.45, 0), new Vector3(0.34, 4.9, 12), wall);
    this.box("shop-right-wall", new Vector3(13.6, 2.45, 0), new Vector3(0.34, 4.9, 12), wall);
    this.box("shop-rear-wall", new Vector3(8.35, 2.45, -5.95), new Vector3(10.5, 4.9, 0.34), wall);
    this.box("shop-front-left", new Vector3(5, 2.45, 6.05), new Vector3(3.8, 4.9, 0.34), glass);
    this.box("shop-front-right", new Vector3(11.45, 2.45, 6.05), new Vector3(4.3, 4.9, 0.34), glass);
    this.box("shop-roof", new Vector3(8.35, 4.95, 0), new Vector3(10.7, 0.3, 12), era === "ancient" ? trim : wall);
    for (const x of [3.72, 6.28, 9.4, 11.55, 13.05]) this.box("shop-era-pilaster", new Vector3(x, 2.35, 5.82), new Vector3(0.075, 4.5, 0.1), trim);
    const title = era === "ancient" ? "LANTERN BAZAAR" : "SIGNAL / ACCESS";
    const subtitle = era === "ancient" ? "SILK / BRASS / AMBER" : "MERIDIAN SERVICE KIOSK";
    this.makeSign(title, subtitle, new Vector3(8.35, 4.17, 6.24), 5.8, 0.9, era === "ancient", glow);
    this.box("shop-counter", new Vector3(11, 0.62, 0.1), new Vector3(3.7, 1.1, 0.85), trim);
    this.box("shop-rug", new Vector3(8, 0.02, -1), new Vector3(3.2, 0.03, 4), this.material("shop-floor-accent", era === "ancient" ? new Color3(0.32, 0.14, 0.08) : new Color3(0.035, 0.095, 0.14)));
    this.worldLight("shop-ambient", new Vector3(8.4, 3.65, 3.5), era === "ancient" ? new Color3(1, 0.58, 0.28) : new Color3(0.14, 0.71, 1), 0.8, 9);
    this.addBlocker(2.8, 3.38, -6.1, 6.1);
    this.addBlocker(13.32, 13.9, -6.1, 6.1);
    this.addBlocker(3, 6.93, 5.8, 6.3);
    this.addBlocker(9.78, 13.8, 5.8, 6.3);
    this.addBlocker(3, 13.8, -6.3, -5.62);
  }

  private buildShopDoors() {
    const frame = this.material("shop-door-bronze-frame", this.id === "future" ? new Color3(0.13, 0.24, 0.31) : new Color3(0.36, 0.26, 0.14));
    const pane = this.material("shop-door-glass", this.id === "future" ? new Color3(0.05, 0.2, 0.26) : new Color3(0.14, 0.21, 0.2), new Color3(0.015, 0.06, 0.06), new Color3(0.55, 0.67, 0.63));
    pane.alpha = 0.36;
    for (let index = 0; index < 2; index++) {
      const door = new TransformNode(`shop-door-${index}`, this.scene);
      door.parent = this.root;
      door.position.set(index === 0 ? 7.52 : 9.18, 0, 6.03);
      const leaf = this.box("shop-door-leaf", new Vector3(0, 1.52, 0), new Vector3(1.58, 3.04, 0.13), pane, door);
      this.box("shop-door-vertical-frame", new Vector3(index === 0 ? -0.72 : 0.72, 1.52, 0.08), new Vector3(0.07, 3.06, 0.08), frame, door);
      this.box("shop-door-handle", new Vector3(index === 0 ? 0.58 : -0.58, 1.42, 0.16), new Vector3(0.055, 0.48, 0.045), frame, door);
      leaf.isPickable = false;
      this.shopDoors.push(door);
    }
    this.toggleShopDoor(true);
  }

  private buildAccessoryStand() {
    const stand = new TransformNode("world-accessory-stand", this.scene);
    stand.parent = this.root;
    stand.position.set(5.35, 0, -2.45);
    const brass = this.material("accessory-stand-metal", this.id === "future" ? new Color3(0.16, 0.27, 0.31) : this.id === "ancient" ? new Color3(0.43, 0.28, 0.14) : new Color3(0.35, 0.28, 0.18));
    const rack = this.material("accessory-stand-wood", this.id === "future" ? new Color3(0.07, 0.11, 0.15) : this.id === "ancient" ? new Color3(0.24, 0.15, 0.08) : new Color3(0.12, 0.14, 0.15));
    const clothA = this.material("accessory-garment-a", this.id === "future" ? new Color3(0.13, 0.24, 0.34) : this.id === "ancient" ? new Color3(0.43, 0.2, 0.13) : new Color3(0.08, 0.27, 0.28));
    const clothB = this.material("accessory-garment-b", this.id === "future" ? new Color3(0.2, 0.12, 0.34) : this.id === "ancient" ? new Color3(0.17, 0.35, 0.3) : new Color3(0.41, 0.28, 0.15));
    this.box("accessory-table", new Vector3(0, 0.52, 0.92), new Vector3(3.4, 0.92, 1.2), rack, stand);
    this.box("accessory-rack-upright", new Vector3(0, 1.55, -0.56), new Vector3(0.14, 2.75, 0.14), brass, stand);
    this.box("accessory-rack-bar", new Vector3(0, 2.75, -0.56), new Vector3(3.7, 0.13, 0.16), brass, stand);
    for (const x of [-1.15, -0.38, 0.38, 1.15]) {
      this.box("accessory-hanger-hook", new Vector3(x, 2.51, -0.56), new Vector3(0.07, 0.45, 0.07), brass, stand);
      const garment = this.box("accessory-garment", new Vector3(x, 1.72, -0.56), new Vector3(0.54, 1.25, 0.25), x < 0 ? clothA : clothB, stand);
      garment.rotation.y = x * 0.08;
    }
    this.sphere("accessory-hat", new Vector3(-1.18, 1.22, 1.03), 0.48, clothA, stand).scaling.y = 0.46;
    this.box("accessory-travel-bag", new Vector3(0.0, 1.12, 1.0), new Vector3(0.58, 0.8, 0.4), clothB, stand);
    for (const x of [0.92, 1.55]) {
      const shoe = this.box("accessory-shoe", new Vector3(x, 1.04, 1.0), new Vector3(0.48, 0.2, 0.7), brass, stand);
      shoe.rotation.y = -0.16;
    }
    const glassMetal = this.material("accessory-optic-metal", new Color3(0.65, 0.49, 0.24));
    for (const x of [-0.5, 0.5]) {
      const lens = MeshBuilder.CreateTorus("accessory-optic-frame", { diameter: 0.35, thickness: 0.035, tessellation: 16 }, this.scene);
      lens.parent = stand;
      lens.position.set(x, 1.24, 1.5);
      lens.material = glassMetal;
    }
  }

  private buildVehicle() {
    if (this.id === "present") {
      const sedan = new TransformNode("parked-city-sedan", this.scene);
      sedan.parent = this.root;
      sedan.position.set(6.65, 0, -10.2);
      const paint = this.material("city-sedan-paint", new Color3(0.055, 0.13, 0.17), new Color3(0.012, 0.04, 0.055), new Color3(0.62, 0.67, 0.68));
      const glass = this.material("city-sedan-glass", new Color3(0.055, 0.16, 0.2), new Color3(0.018, 0.045, 0.055));
      const tire = this.material("city-sedan-tires", new Color3(0.025, 0.031, 0.036));
      const lamp = this.emissiveMaterial("city-sedan-lights", new Color3(0.98, 0.57, 0.2));
      this.box("city-sedan-body", new Vector3(0, 0.75, 0), new Vector3(2.55, 0.66, 4.35), paint, sedan);
      this.box("city-sedan-roof", new Vector3(0, 1.33, -0.25), new Vector3(1.92, 0.68, 2.0), paint, sedan);
      this.box("city-sedan-windshield", new Vector3(0, 1.37, 0.82), new Vector3(1.75, 0.5, 0.08), glass, sedan);
      this.box("city-sedan-rear-glass", new Vector3(0, 1.38, -1.3), new Vector3(1.72, 0.48, 0.08), glass, sedan);
      for (const x of [-1, 1]) {
        this.box("city-sedan-side-glass", new Vector3(x * 0.98, 1.35, -0.27), new Vector3(0.06, 0.43, 1.65), glass, sedan);
        for (const z of [-1.42, 1.4]) this.box("city-sedan-wheel", new Vector3(x * 1.28, 0.42, z), new Vector3(0.28, 0.58, 0.76), tire, sedan);
        this.box("city-sedan-headlamp", new Vector3(x * 0.91, 0.82, 2.19), new Vector3(0.45, 0.17, 0.06), lamp, sedan);
      }
      this.box("city-sedan-grille", new Vector3(0, 0.71, 2.2), new Vector3(0.88, 0.28, 0.08), tire, sedan);
      this.addBlocker(5.1, 8.2, -12.55, -7.85);
      this.vehicleMarker = this.sphere("vehicle-interaction-marker", new Vector3(6.65, 2.15, -10.2), 0.12, this.emissiveMaterial("vehicle-marker-glow", new Color3(0.2, 0.8, 0.76)));
    } else if (this.id === "ancient") {
      this.addBlocker(-6.55, -4.25, -1.9, 0.35);
      this.vehicleMarker = this.sphere("handcart-interaction-marker", new Vector3(-5.4, 2.1, -0.8), 0.12, this.emissiveMaterial("cart-marker-glow", new Color3(0.9, 0.57, 0.19)));
    } else {
      this.vehicleMarker = this.sphere("hovercraft-interaction-marker", new Vector3(2.1, 6.15, -5.5), 0.14, this.emissiveMaterial("hover-marker-glow", new Color3(0.12, 0.79, 0.96)));
    }
  }

  toggleShopDoor(forceOpen?: boolean) {
    this.shopDoorOpen = forceOpen ?? !this.shopDoorOpen;
    const xPositions = this.shopDoorOpen ? [6.94, 9.76] : [7.52, 9.18];
    this.shopDoors.forEach((door, index) => { door.position.x = xPositions[index]; });
    const blockerIndex = this.blockers.indexOf(this.shopDoorBlocker);
    if (this.shopDoorOpen && blockerIndex >= 0) this.blockers.splice(blockerIndex, 1);
    if (!this.shopDoorOpen && blockerIndex < 0) this.blockers.push(this.shopDoorBlocker);
    const target = this.targets.find((entry) => entry.id === "door");
    if (target) target.label = this.shopDoorOpen ? "CLOSE THE SHOP DOORS" : "OPEN THE SHOP DOORS";
  }

  private buildGround() {
    const base = this.material("city-base-asphalt", new Color3(0.11, 0.14, 0.17), new Color3(0.012, 0.018, 0.023));
    const ground = MeshBuilder.CreateGround("district-ground", { width: 52, height: 58 }, this.scene);
    ground.position.y = -0.13;
    ground.material = base;
    ground.parent = this.root;

    const sidewalkMaterial = this.material("city-stone-sidewalk", Color3.White(), new Color3(0.01, 0.013, 0.02));
    if (this.stoneTexture) sidewalkMaterial.diffuseTexture = this.stoneTexture;
    sidewalkMaterial.specularColor = new Color3(0.12, 0.14, 0.18);
    for (const x of [-5.85, 5.85]) {
      const sidewalk = MeshBuilder.CreateGround("stone-sidewalk", { width: 3.3, height: 48 }, this.scene);
      sidewalk.position.set(x, -0.05, 0);
      sidewalk.material = sidewalkMaterial;
      sidewalk.parent = this.root;
    }
    const storeFloor = MeshBuilder.CreateGround("jewellery-shop-interior-floor", { width: 10.5, height: 12.5 }, this.scene);
    storeFloor.position.set(8.35, -0.015, 0.05);
    storeFloor.material = sidewalkMaterial;
    storeFloor.parent = this.root;
  }

  private buildStreet() {
    const asphalt = this.material("road-surface", new Color3(0.095, 0.115, 0.135), new Color3(0.01, 0.014, 0.02));
    const road = MeshBuilder.CreateGround("havel-street", { width: 8.4, height: 48 }, this.scene);
    road.position.set(0, -0.035, 0);
    road.material = asphalt;
    road.parent = this.root;

    const line = this.material("road-marking", new Color3(0.47, 0.52, 0.54), new Color3(0.055, 0.065, 0.07));
    for (let z = -21; z <= 21; z += 5) {
      const dash = this.box("road-dash", new Vector3(0, -0.005, z), new Vector3(0.11, 0.014, 2.0), line);
      dash.isPickable = false;
    }
    for (const x of [-4.15, 4.15]) {
      this.box("curb-edge", new Vector3(x, 0.03, 0), new Vector3(0.14, 0.16, 48), this.material("curb-stone", new Color3(0.25, 0.29, 0.31)));
    }
  }

  private buildBuildings() {
    const facade = this.material("district-facade", new Color3(0.19, 0.23, 0.27), new Color3(0.022, 0.03, 0.04));
    const darkStone = this.material("district-corner-stone", new Color3(0.13, 0.17, 0.2));
    const window = this.material("window-glow", new Color3(0.17, 0.24, 0.28), new Color3(0.08, 0.12, 0.15));
    const warmWindow = this.material("warm-window", new Color3(0.37, 0.22, 0.11), new Color3(0.47, 0.24, 0.08));

    const blocks = [
      { x: -12, z: -10, w: 8, d: 18, h: 9 },
      { x: -11, z: 10, w: 9, d: 16, h: 7 },
      { x: 15.1, z: -10.8, w: 9, d: 18, h: 8 },
      { x: 15.2, z: 10.5, w: 8, d: 16, h: 7 },
    ];
    blocks.forEach((block, index) => {
      this.box(`city-building-${index}`, new Vector3(block.x, block.h / 2 - 0.05, block.z), new Vector3(block.w, block.h, block.d), index % 2 === 0 ? facade : darkStone);
      this.box(`building-cornice-${index}`, new Vector3(block.x, block.h - 0.45, block.z + block.d / 2 + 0.02), new Vector3(block.w + 0.15, 0.25, 0.18), darkStone);
      const front = block.z + block.d / 2 + 0.08;
      const columns = Math.max(2, Math.floor(block.w / 2.4));
      for (let col = 0; col < columns; col++) {
        for (let row = 1; row < Math.min(3, Math.floor(block.h / 2.4)); row++) {
          const wx = block.x - block.w / 2 + 1.25 + col * ((block.w - 2) / Math.max(1, columns - 1));
          const isWarm = (col + row + index) % 4 === 0;
          this.box("city-window", new Vector3(wx, row * 2.05 + 0.65, front), new Vector3(0.92, 1.28, 0.06), isWarm ? warmWindow : window);
          this.box("window-sill", new Vector3(wx, row * 2.05, front + 0.055), new Vector3(1.1, 0.09, 0.14), darkStone);
        }
      }
    });

    // Collision is limited to the shop shell; distant façades remain non-blocking scenery.
    this.box("left-store-neighbour", new Vector3(-16.2, 3.4, 0), new Vector3(4.3, 6.8, 43), darkStone);
  }

  private buildJewelleryShop() {
    const outer = this.material("shop-charcoal-stone", new Color3(0.17, 0.21, 0.23), new Color3(0.018, 0.025, 0.028));
    const inner = this.material("shop-warm-wall", new Color3(0.38, 0.31, 0.22), new Color3(0.055, 0.035, 0.013));
    const brass = this.material("shop-brass", new Color3(0.65, 0.42, 0.16), new Color3(0.09, 0.045, 0.012));
    const glass = this.material("store-window-glass", new Color3(0.12, 0.25, 0.29), new Color3(0.025, 0.08, 0.095), new Color3(0.42, 0.58, 0.63));
    glass.alpha = 0.42;
    const warm = this.material("shop-light-surfaces", new Color3(0.45, 0.31, 0.17), new Color3(0.25, 0.13, 0.045));
    const xMin = 3.1;
    const xMax = 13.6;
    const zFront = 6.05;
    const zBack = -5.95;
    const yCenter = 2.55;
    const h = 5.1;

    this.box("shop-left-wall", new Vector3(xMin, yCenter, 0), new Vector3(0.34, h, 12), outer);
    this.box("shop-right-wall", new Vector3(xMax, yCenter, 0), new Vector3(0.34, h, 12), outer);
    this.box("shop-rear-wall", new Vector3(8.35, yCenter, zBack), new Vector3(10.5, h, 0.34), inner);
    this.box("shop-front-left", new Vector3(5.0, yCenter, zFront), new Vector3(3.8, h, 0.34), outer);
    this.box("shop-front-right", new Vector3(11.45, yCenter, zFront), new Vector3(4.3, h, 0.34), outer);
    this.box("shop-door-header", new Vector3(8.35, 4.88, zFront), new Vector3(2.75, 0.47, 0.34), outer);
    this.box("shop-front-brass-trim", new Vector3(8.35, 0.22, zFront - 0.08), new Vector3(2.8, 0.12, 0.12), brass);

    this.box("shop-window-left", new Vector3(5.0, 2.35, zFront - 0.2), new Vector3(2.5, 2.65, 0.08), glass);
    this.box("shop-window-right", new Vector3(11.55, 2.35, zFront - 0.2), new Vector3(3.05, 2.65, 0.08), glass);
    for (const x of [3.72, 6.28, 9.4, 11.55, 13.05]) {
      this.box("shop-window-mullion", new Vector3(x, 2.35, zFront - 0.12), new Vector3(0.065, 2.85, 0.14), brass);
    }
    this.box("shop-window-sill-left", new Vector3(5, 0.98, zFront - 0.18), new Vector3(2.7, 0.12, 0.25), brass);
    this.box("shop-window-sill-right", new Vector3(11.55, 0.98, zFront - 0.18), new Vector3(3.2, 0.12, 0.25), brass);

    this.makeSign("AURELINE  •  JEWELLERY", "DISTRICT 09  /  EST. 1984", new Vector3(8.35, 4.35, zFront + 0.2), 6.2, 1.0, true);

    const counterWood = this.material("jewellery-counter-wood", new Color3(0.16, 0.09, 0.06));
    const counterTop = this.material("counter-stone-top", new Color3(0.26, 0.23, 0.18), new Color3(0.03, 0.02, 0.01));
    this.box("jewellery-counter-base", new Vector3(11.0, 0.55, 0.1), new Vector3(3.8, 1.05, 0.86), counterWood);
    this.box("jewellery-counter-top", new Vector3(11.0, 1.12, 0.1), new Vector3(4.05, 0.14, 1.0), counterTop);
    this.box("back-display-shelf", new Vector3(5.0, 2.35, -5.65), new Vector3(2.9, 1.05, 0.25), counterWood);
    this.box("back-display-gold-line", new Vector3(5.0, 2.92, -5.48), new Vector3(3.0, 0.045, 0.05), brass);
    this.box("interior-rug", new Vector3(8.0, 0.016, -1.0), new Vector3(3.2, 0.018, 4.3), this.material("shop-rug", new Color3(0.12, 0.075, 0.055)));

    const ceiling = this.box("shop-canopy", new Vector3(8.35, 5.08, 0), new Vector3(10.45, 0.2, 12.0), outer);
    ceiling.isPickable = false;
    const displayLight = new PointLight("shop-display-light", new Vector3(9.0, 3.9, 0), this.scene);
    displayLight.diffuse = new Color3(1, 0.68, 0.34);
    displayLight.intensity = 0.85;
    displayLight.range = 10;
    const interiorLight = new PointLight("shop-front-light", new Vector3(8.4, 3.5, 4.5), this.scene);
    interiorLight.diffuse = new Color3(1, 0.6, 0.28);
    interiorLight.intensity = 0.72;
    interiorLight.range = 8;

    // The doorway is a genuine opening between collision walls; players can walk in and out.
    this.addBlocker(2.8, 3.38, -6.1, 6.1);
    this.addBlocker(13.32, 13.9, -6.1, 6.1);
    this.addBlocker(3.0, 6.93, 5.8, 6.3);
    this.addBlocker(9.78, 13.8, 5.8, 6.3);
    this.addBlocker(3.0, 13.8, -6.3, -5.62);
  }

  private buildNecklaceDisplay(): AbstractMesh {
    const brass = this.material("display-stand-brass", new Color3(0.68, 0.46, 0.21), new Color3(0.11, 0.06, 0.015));
    const velvet = this.material("display-stand-velvet", new Color3(0.11, 0.18, 0.18));
    this.box("necklace-display-pedestal", new Vector3(8.55, 0.35, -0.55), new Vector3(1.0, 0.68, 0.82), velvet);
    this.box("necklace-display-rim", new Vector3(8.55, 0.72, -0.55), new Vector3(1.08, 0.08, 0.88), brass);
    this.cylinder("necklace-stand", new Vector3(8.55, 1.05, -0.55), 0.58, 0.24, velvet, 12);
    const chain = MeshBuilder.CreateTorus("display-chain", { diameter: 0.48, thickness: 0.04, tessellation: 24 }, this.scene);
    chain.position.set(8.55, 1.27, -0.73);
    chain.rotation.x = Math.PI / 2;
    chain.material = brass;
    const setting = this.sphere("display-pendant-setting", new Vector3(8.55, 1.1, -0.78), 0.21, brass);
    setting.scaling.y = 1.2;
    const jewel = this.sphere("display-pendant-gem", new Vector3(8.55, 1.1, -0.9), 0.12, this.gemMaterial);
    this.box("display-glass-base", new Vector3(8.55, 0.82, -0.55), new Vector3(1.14, 0.05, 0.93), this.material("display-glass", new Color3(0.12, 0.22, 0.23), new Color3(0.05, 0.1, 0.11), new Color3(0.65, 0.7, 0.67)));
    jewel.isPickable = false;
    return jewel;
  }

  private buildMetro() {
    const stationStone = this.material("metro-station-stone", new Color3(0.055, 0.09, 0.12));
    const teal = this.emissiveMaterial("metro-teal-glow", new Color3(0.02, 0.72, 0.68));
    const metal = this.material("metro-metal", new Color3(0.18, 0.23, 0.27));
    this.box("metro-platform-canopy", new Vector3(-3.1, 3.9, -18.6), new Vector3(8.8, 0.55, 4.9), stationStone);
    this.box("metro-entry-left-pillar", new Vector3(-6.8, 2.05, -16.3), new Vector3(0.7, 4.1, 0.82), stationStone);
    this.box("metro-entry-right-pillar", new Vector3(0.5, 2.05, -16.3), new Vector3(0.7, 4.1, 0.82), stationStone);
    this.box("metro-entry-header", new Vector3(-3.15, 4.2, -16.3), new Vector3(7.6, 0.7, 0.9), stationStone);
    this.makeSign("METRO-9", "CENTRAL STATION  ↓", new Vector3(-3.15, 4.25, -15.78), 4.2, 1.1, false, teal);
    this.box("metro-stair-shadow", new Vector3(-3.15, 0.04, -16.1), new Vector3(4.7, 0.09, 4.2), this.material("metro-stair-dark", new Color3(0.018, 0.035, 0.045)));
    for (let i = 0; i < 5; i++) {
      this.box("metro-stair", new Vector3(-3.15, -0.12 + i * 0.12, -15.7 - i * 0.46), new Vector3(4.5, 0.16, 0.48), metal);
    }
    this.box("metro-security-barrier", new Vector3(2.1, 0.82, -15.2), new Vector3(0.17, 1.64, 0.25), metal);
    this.sphere("security-camera", new Vector3(-0.2, 4.35, -13.3), 0.25, metal);
    this.box("security-camera-lens", new Vector3(-0.2, 4.35, -13.44), new Vector3(0.12, 0.1, 0.08), teal);
  }

  private buildProps() {
    const iron = this.material("street-iron", new Color3(0.055, 0.075, 0.09));
    const lampGlow = this.emissiveMaterial("street-lamp-amber", new Color3(1, 0.51, 0.22));
    const wood = this.material("bench-wood", new Color3(0.22, 0.14, 0.09));
    const leaf = this.material("tree-canopy", new Color3(0.065, 0.19, 0.16), new Color3(0.01, 0.045, 0.035));
    const bark = this.material("tree-trunk", new Color3(0.12, 0.09, 0.065));
    for (const z of [-18, -10, -2, 8, 17]) {
      for (const x of [-7.35, 7.35]) {
        this.cylinder("streetlamp-pole", new Vector3(x, 2.2, z), 4.4, 0.13, iron, 10);
        this.box("streetlamp-arm", new Vector3(x + (x < 0 ? 0.3 : -0.3), 4.15, z), new Vector3(0.7, 0.08, 0.1), iron);
        this.sphere("streetlamp-glow", new Vector3(x + (x < 0 ? 0.58 : -0.58), 4.05, z), 0.27, lampGlow);
        const lamp = new PointLight("streetlamp-pool", new Vector3(x, 3.9, z), this.scene);
        lamp.diffuse = new Color3(1, 0.59, 0.34);
        lamp.intensity = 0.22;
        lamp.range = 7.5;
      }
    }
    this.box("park-bench-seat", new Vector3(7.2, 0.58, 9.2), new Vector3(1.7, 0.15, 0.5), wood);
    for (const x of [6.55, 7.85]) {
      this.box("park-bench-leg", new Vector3(x, 0.3, 9.2), new Vector3(0.1, 0.6, 0.13), iron);
      this.box("park-bench-back", new Vector3(x, 1.08, 9.0), new Vector3(0.11, 0.95, 0.12), iron);
    }
    for (let i = 0; i < 3; i++) this.box("bench-back-slat", new Vector3(7.2, 0.85 + i * 0.23, 9.0), new Vector3(1.7, 0.12, 0.12), wood);

    this.cylinder("street-tree-trunk", new Vector3(-7.1, 1.4, 2.0), 2.8, 0.33, bark, 10);
    for (const [x, y, z, d] of [[-7.15, 3.2, 2.0, 2.2], [-8.0, 2.95, 2.15, 1.5], [-6.5, 3.05, 1.8, 1.55]] as const) {
      this.sphere("tree-canopy", new Vector3(x, y, z), d, leaf);
    }
    this.box("planter", new Vector3(-7.1, 0.28, 2.0), new Vector3(1.4, 0.5, 1.4), this.material("planter-concrete", new Color3(0.12, 0.16, 0.17)));
    this.cylinder("bollard-left", new Vector3(-4.5, 0.48, -1.5), 0.95, 0.2, iron, 10);
    this.cylinder("bollard-right", new Vector3(4.5, 0.48, -1.5), 0.95, 0.2, iron, 10);
    this.makeSign("HAVEL ST", "NIGHT DISTRICT", new Vector3(-7.0, 2.85, 13.2), 1.8, 0.7, false, lampGlow);
    for (const z of [-12, -6, 3, 12]) {
      this.box("crosswalk-stripe", new Vector3(-0.4, -0.005, z), new Vector3(5.0, 0.012, 0.18), this.material("crosswalk-paint", new Color3(0.41, 0.45, 0.46)));
    }
  }

  private makeSign(title: string, subtitle: string, position: Vector3, width: number, height: number, shop: boolean, emissive?: StandardMaterial) {
    const boardMaterial = this.material(`sign-board-${title.replace(/\W/g, "-")}`, shop ? new Color3(0.05, 0.055, 0.052) : new Color3(0.035, 0.075, 0.095));
    const board = MeshBuilder.CreatePlane(`sign-${title.replace(/\W/g, "-")}`, { width, height }, this.scene);
    board.position.copyFrom(position);
    board.material = boardMaterial;
    const texture = new DynamicTexture(`sign-texture-${title.replace(/\W/g, "-")}`, { width: 1024, height: 256 }, this.scene, false);
    const context = texture.getContext() as unknown as CanvasRenderingContext2D;
    context.fillStyle = shop ? "#101411" : "#07151b";
    context.fillRect(0, 0, 1024, 256);
    context.strokeStyle = shop ? "#b28a4c" : "#12c8bc";
    context.lineWidth = 8;
    context.strokeRect(10, 10, 1004, 236);
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = shop ? "#d2b071" : "#47e0d3";
    context.font = "bold 82px Georgia, serif";
    context.fillText(title, 512, 100, 960);
    context.fillStyle = shop ? "#b6a27d" : "#98c9c7";
    context.font = "bold 32px Arial, sans-serif";
    context.fillText(subtitle, 512, 188, 960);
    texture.update();
    boardMaterial.diffuseTexture = texture;
    boardMaterial.emissiveTexture = texture;
    boardMaterial.emissiveColor = shop ? new Color3(0.55, 0.34, 0.12) : new Color3(0.1, 0.45, 0.44);
    if (emissive) boardMaterial.emissiveColor = emissive.emissiveColor;
    board.isPickable = false;
    return board;
  }

  private person(name: string, position: Vector3, jacketColor: Color3, trouserColor: Color3) {
    const root = new TransformNode(`${name}-root`, this.scene);
    root.position.copyFrom(position);
    root.parent = this.root;
    this.actors.push(root);
    const jacket = this.material(`${name}-jacket`, jacketColor);
    const trousers = this.material(`${name}-trousers`, trouserColor);
    const skin = this.material(`${name}-skin`, new Color3(0.42, 0.28, 0.21));
    const shoes = this.material(`${name}-shoes`, new Color3(0.035, 0.045, 0.055));
    const add = (mesh: AbstractMesh, x: number, y: number, z: number, mat: StandardMaterial) => {
      mesh.parent = root;
      mesh.position.set(x, y, z);
      mesh.material = mat;
      return mesh;
    };
    if (this.id === "future") {
      const alloy = this.material(`${name}-android-alloy`, new Color3(0.24, 0.34, 0.4), new Color3(0.025, 0.06, 0.08));
      const visor = this.emissiveMaterial(`${name}-android-visor`, new Color3(0.08, 0.65, 0.78));
      const joints = this.material(`${name}-android-joints`, new Color3(0.07, 0.09, 0.12));
      add(MeshBuilder.CreateBox(`${name}-torso`, { width: 0.62, height: 0.82, depth: 0.4 }, this.scene), 0, 1.02, 0, alloy);
      add(MeshBuilder.CreateBox(`${name}-head`, { width: 0.43, height: 0.37, depth: 0.36 }, this.scene), 0, 1.66, 0, alloy);
      add(MeshBuilder.CreateBox(`${name}-visor`, { width: 0.32, height: 0.09, depth: 0.04 }, this.scene), 0, 1.71, 0.19, visor);
      add(MeshBuilder.CreateBox(`${name}-arm-left`, { width: 0.17, height: 0.7, depth: 0.22 }, this.scene), -0.39, 1.01, 0, alloy);
      add(MeshBuilder.CreateBox(`${name}-arm-right`, { width: 0.17, height: 0.7, depth: 0.22 }, this.scene), 0.39, 1.01, 0, alloy);
      add(MeshBuilder.CreateBox(`${name}-leg-left`, { width: 0.22, height: 0.7, depth: 0.24 }, this.scene), -0.17, 0.37, 0, joints);
      add(MeshBuilder.CreateBox(`${name}-leg-right`, { width: 0.22, height: 0.7, depth: 0.24 }, this.scene), 0.17, 0.37, 0, joints);
      add(MeshBuilder.CreateCylinder(`${name}-antenna`, { height: 0.25, diameter: 0.035, tessellation: 8 }, this.scene), 0, 1.98, -0.03, visor);
      add(MeshBuilder.CreateBox(`${name}-chest-light`, { width: 0.08, height: 0.28, depth: 0.03 }, this.scene), 0, 1.08, 0.22, visor);
      return root;
    }
    if (this.id === "ancient") {
      const robe = this.material(`${name}-travel-robe`, jacketColor);
      const sash = this.material(`${name}-woven-sash`, new Color3(0.68, 0.42, 0.14));
      const wrap = this.material(`${name}-head-wrap`, new Color3(0.65, 0.54, 0.39));
      add(MeshBuilder.CreateCylinder(`${name}-robe`, { height: 1.08, diameterTop: 0.43, diameterBottom: 0.7, tessellation: 10 }, this.scene), 0, 0.78, 0, robe);
      add(MeshBuilder.CreateSphere(`${name}-head`, { diameter: 0.36, segments: 10 }, this.scene), 0, 1.57, 0, skin);
      add(MeshBuilder.CreateSphere(`${name}-head-wrap`, { diameter: 0.4, segments: 10 }, this.scene), 0, 1.74, -0.015, wrap);
      add(MeshBuilder.CreateBox(`${name}-sash`, { width: 0.64, height: 0.11, depth: 0.42 }, this.scene), 0, 0.96, 0.02, sash);
      add(MeshBuilder.CreateBox(`${name}-arm-left`, { width: 0.17, height: 0.64, depth: 0.2 }, this.scene), -0.38, 1.02, 0, robe);
      add(MeshBuilder.CreateBox(`${name}-arm-right`, { width: 0.17, height: 0.64, depth: 0.2 }, this.scene), 0.38, 1.02, 0, robe);
      add(MeshBuilder.CreateCylinder(`${name}-leg-left`, { height: 0.42, diameter: 0.21, tessellation: 8 }, this.scene), -0.16, 0.23, 0, trousers);
      add(MeshBuilder.CreateCylinder(`${name}-leg-right`, { height: 0.42, diameter: 0.21, tessellation: 8 }, this.scene), 0.16, 0.23, 0, trousers);
      return root;
    }
    add(MeshBuilder.CreateBox(`${name}-torso`, { width: 0.61, height: 0.86, depth: 0.34 }, this.scene), 0, 1.03, 0, jacket);
    add(MeshBuilder.CreateSphere(`${name}-head`, { diameter: 0.37, segments: 10 }, this.scene), 0, 1.66, 0, skin);
    add(MeshBuilder.CreateBox(`${name}-arm-left`, { width: 0.18, height: 0.66, depth: 0.22 }, this.scene), -0.38, 1.01, 0, jacket);
    add(MeshBuilder.CreateBox(`${name}-arm-right`, { width: 0.18, height: 0.66, depth: 0.22 }, this.scene), 0.38, 1.01, 0, jacket);
    add(MeshBuilder.CreateBox(`${name}-leg-left`, { width: 0.22, height: 0.7, depth: 0.25 }, this.scene), -0.16, 0.38, 0, trousers);
    add(MeshBuilder.CreateBox(`${name}-leg-right`, { width: 0.22, height: 0.7, depth: 0.25 }, this.scene), 0.16, 0.38, 0, trousers);
    add(MeshBuilder.CreateBox(`${name}-shoe-left`, { width: 0.26, height: 0.12, depth: 0.38 }, this.scene), -0.16, 0.05, -0.04, shoes);
    add(MeshBuilder.CreateBox(`${name}-shoe-right`, { width: 0.26, height: 0.12, depth: 0.38 }, this.scene), 0.16, 0.05, -0.04, shoes);
    return root;
  }

  setActorsVisible(visible: boolean) {
    this.actors.forEach((actor) => actor.getChildMeshes(false).forEach((mesh) => { mesh.isVisible = visible; }));
    this.targets.forEach((target) => { target.visual.isVisible = visible; });
  }

  update(delta: number) {
    this.clock += delta;
    this.walkers.forEach((walker, index) => {
      walker.root.position.z = walker.z + Math.sin(this.clock * walker.pace + walker.phase) * 1.7;
      walker.root.position.x = walker.x + Math.sin(this.clock * walker.pace * 0.45 + walker.phase) * 0.16;
      walker.root.rotation.y = Math.sin(this.clock * walker.pace + walker.phase) > 0 ? Math.PI : 0;
      walker.root.position.y = Math.abs(Math.sin(this.clock * 3 + walker.phase)) * 0.025;
      void index;
    });
    this.security.position.x = -5.1 + Math.sin(this.clock * 0.38) * 1.0;
  }

  highlight(target: InteractionTarget | null) {
    const id = target?.id ?? null;
    if (this.lastHighlighted === id) return;
    this.lastHighlighted = id;
    if (id === "pendant") this.gemMaterial.emissiveColor = new Color3(0.86, 0.38, 0.06);
    else this.gemMaterial.emissiveColor = new Color3(0.02, 0.25, 0.23);
  }

  dispose() {
    this.root.dispose(false, true);
    this.stoneTexture?.dispose();
  }
}
