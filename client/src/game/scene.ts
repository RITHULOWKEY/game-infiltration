import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { Hud, type DialogContent, type HudScreen, type HudSnapshot } from "./Hud";
import { InputManager, type GameInput } from "./InputManager";
import { APPEARANCE_CHOICES, Player, defaultAppearance, type CharacterAppearance, type WorldId } from "./Player";
import { WORLD_CATALOG } from "./WorldCatalog";
import { normalizeAppearance, readProfile, readRun, writeProfile, writeRun, type MissionStage, type RunSave } from "./SaveStore";
import { World, type InteractionTarget } from "./World";

export type GameHandle = {
  scene: Scene;
  dispose(): void;
};

const ENTRY_POINT = new Vector3(0, 0, 15);
const spawnPosition = (world: WorldId) => world === "ancient" ? new Vector3(0, 0, 15) : ENTRY_POINT.clone();
const spawnYaw = (world: WorldId) => world === "ancient" ? -0.91 : -0.28;
const DEMO_PATH = [
  new Vector3(0.9, 0, 12.8),
  new Vector3(8.35, 0, 5.15),
  new Vector3(8.55, 0, 1.0),
  new Vector3(8.35, 0, 7.2),
  new Vector3(2.0, 0, 7.2),
  new Vector3(-2.8, 0, -14.7),
];

const WORLD_STORY: Record<WorldId, { item: string; store: string; transit: string; courier: string; route: string; afterLead: string }> = {
  present: {
    item: "The Vintage Pendant", store: "Aureline", transit: "Metro-9", courier: "courier",
    route: "AURELINE → METRO-9", afterLead: "The Aureline shop is across the street. The vintage pendant is the mark the courier is looking for. Bring it to the Metro-9 entrance when your cover is ready.",
  },
  ancient: {
    item: "The Court Relic", store: "Lantern Bazaar", transit: "Ashen Gate", courier: "gate runner",
    route: "LANTERN BAZAAR → ASHEN GATE", afterLead: "The Lantern Bazaar is across the courtyard. Its court relic is the sign the gate runner recognizes. Wear the mark, then meet them at Ashen Gate.",
  },
  future: {
    item: "The Signal Pendant", store: "Signal / Access", transit: "Meridian Maglev", courier: "transit operator",
    route: "SIGNAL KIOSK → MERIDIAN MAGLEV", afterLead: "The Signal kiosk sits beside the maglev lane. Scan the pendant and wear its beacon; the transit operator will verify your signal at Meridian 9.",
  },
};

export async function createGameScene(engine: Engine, canvas: HTMLCanvasElement): Promise<GameHandle> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.035, 0.062, 0.078, 1);
  scene.ambientColor = new Color3(0.18, 0.2, 0.24);
  scene.skipPointerMovePicking = true;

  const ambient = new HemisphericLight("district-ambient", new Vector3(0, 1, 0), scene);
  ambient.intensity = 1.18;
  ambient.diffuse = new Color3(0.65, 0.76, 0.88);
  ambient.groundColor = new Color3(0.15, 0.19, 0.22);
  const moon = new DirectionalLight("moonlight", new Vector3(-0.28, -1, 0.24), scene);
  moon.position.set(-12, 18, 14);
  moon.intensity = 0.72;
  moon.diffuse = new Color3(0.54, 0.67, 0.82);

  const profile = readProfile();
  let worldId: WorldId = profile.world;
  let appearance: CharacterAppearance = { ...profile.appearance };
  let world = new World(scene, worldId);
  const player = new Player(scene, spawnPosition(worldId), worldId, appearance);
  const camera = new FreeCamera("third-person-camera", new Vector3(0, 6, 27), scene);
  camera.minZ = 0.12;
  camera.maxZ = 180;
  camera.fov = 0.84;
  camera.inertia = 0;
  camera.speed = 0;
  scene.activeCamera = camera;

  let screen: HudScreen = "title";
  let returnScreen: HudScreen = "title";
  let pendingNewRun = false;
  let modalOpen = false;
  let caught = false;
  let coins = 350;
  let detection = 8;
  let observationTime = 180;
  let observationComplete = false;
  let missionStage: MissionStage = 0;
  let activeTarget: InteractionTarget | null = null;
  let lastPrompt: string | null = null;
  let runSave: RunSave | null = readRun();
  let input: InputManager;
  let hud: Hud;
  let autoStep = 0;
  let autoDone = false;
  let saveAccumulator = 0;
  let promptAccumulator = 0;
  let menuClock = 0;

  const applyLighting = (id: WorldId) => {
    if (id === "ancient") {
      scene.clearColor = new Color4(0.075, 0.066, 0.073, 1);
      ambient.intensity = 1.05;
      ambient.diffuse = new Color3(0.84, 0.69, 0.51);
      ambient.groundColor = new Color3(0.24, 0.17, 0.12);
      moon.diffuse = new Color3(0.88, 0.55, 0.3);
      moon.intensity = 0.62;
    } else if (id === "future") {
      scene.clearColor = new Color4(0.018, 0.03, 0.065, 1);
      ambient.intensity = 0.94;
      ambient.diffuse = new Color3(0.43, 0.71, 0.91);
      ambient.groundColor = new Color3(0.1, 0.12, 0.23);
      moon.diffuse = new Color3(0.35, 0.49, 0.9);
      moon.intensity = 0.82;
    } else {
      scene.clearColor = new Color4(0.035, 0.062, 0.078, 1);
      ambient.intensity = 1.18;
      ambient.diffuse = new Color3(0.65, 0.76, 0.88);
      ambient.groundColor = new Color3(0.15, 0.19, 0.22);
      moon.diffuse = new Color3(0.54, 0.67, 0.82);
      moon.intensity = 0.72;
    }
  };

  const saveProfile = () => {
    profile.world = worldId;
    profile.appearance = { ...appearance };
    writeProfile(profile);
  };

  const saveRun = () => {
    runSave = {
      active: true,
      world: worldId,
      appearance: { ...appearance },
      position: { x: player.position.x, y: player.position.y, z: player.position.z },
      yaw: input?.yaw ?? -0.28,
      coins,
      missionStage,
      observationTime,
      observationComplete,
      detection,
      wearingPendant: player.wearingPendant,
    };
    writeRun(runSave);
    hud?.setContinueAvailable(true);
  };

  const changeWorld = (id: WorldId, nextAppearance?: CharacterAppearance) => {
    if (id !== worldId) {
      world.dispose();
      worldId = id;
      world = new World(scene, id);
      world.setActorsVisible(screen !== "customize");
      applyLighting(id);
    }
    appearance = nextAppearance ? { ...nextAppearance } : id === profile.world ? { ...profile.appearance } : defaultAppearance(id);
    player.setWorldStyle(id, appearance);
    player.removePendant();
    saveProfile();
    hud.setAppearance(appearance);
    hud.setWorldSelection(id, true);
  };

  const setScreen = (next: HudScreen) => {
    screen = next;
    hud.setScreen(next);
    const showAvatar = next === "customize" || next === "ready" || next === "play" || next === "pause";
    player.root.setEnabled(showAvatar);
    world.setActorsVisible(next !== "customize");
    if (input) input.setEnabled(next === "play" && !modalOpen);
    if (next !== "play") {
      hud.setPrompt(null);
      lastPrompt = null;
    }
  };

  const objectiveForStage = () => {
    const story = WORLD_STORY[worldId];
    if (missionStage === 0) return ["YOUR FIRST MOVE", "Talk to the contact"] as const;
    if (missionStage === 1) return [`LEAD 01 · ${story.store.toUpperCase()}`, `Inspect the marked item at ${story.store}`] as const;
    if (missionStage === 2) return [`RETURN TO ${story.transit.toUpperCase()}`, `Meet the ${story.courier} wearing your new cover`] as const;
    return ["LEVEL COMPLETE · FIELD 01", "Local contact secured · explore the district"] as const;
  };

  const snapshot = (): HudSnapshot => {
    const [step, objective] = objectiveForStage();
    return {
      timeLeft: observationTime,
      detection,
      coins,
      phase: observationComplete ? "INFILTRATION ACTIVE" : "OBSERVATION WINDOW",
      objective,
      step,
      directive: missionStage === 0 ? "01 / 03" : missionStage === 1 ? "02 / 03" : missionStage === 2 ? "03 / 03" : "DONE",
      wearingPendant: player.wearingPendant,
      worldName: WORLD_CATALOG[worldId].name,
      district: WORLD_CATALOG[worldId].district,
    };
  };

  const updateHud = () => hud.setSnapshot(snapshot());

  const finishDialog = (action: () => void) => {
    hud.closeDialog();
    modalOpen = false;
    input.setEnabled(screen === "play" && !caught);
    action();
    updateHud();
    saveRun();
  };

  const showDialog = (content: DialogContent, action: () => void) => {
    modalOpen = true;
    input.setEnabled(false);
    hud.showDialog(content, () => finishDialog(action), () => {
      hud.closeDialog();
      modalOpen = false;
      input.setEnabled(screen === "play" && !caught);
    });
  };

  const wearPendant = () => {
    if (player.wearingPendant) {
      hud.showToast("MARK VERIFIED · COVER ALREADY ACTIVE");
      return;
    }
    if (coins < 150) {
      hud.showToast("150 FIELD CREDITS REQUIRED TO EQUIP THE MARK");
      return;
    }
    coins -= 150;
    player.wearPendant();
    if (missionStage < 2) missionStage = 2;
    hud.showToast("MARK EQUIPPED · SECURITY READS YOU DIFFERENTLY");
  };

  const resetRun = () => {
    missionStage = 0;
    coins = 350;
    detection = 8;
    observationTime = 180;
    observationComplete = false;
    caught = false;
    player.teleport(spawnPosition(worldId));
    player.removePendant();
    input.yaw = spawnYaw(worldId);
    input.pitch = 0.18;
    input.clearKeys();
    autoStep = 0;
    autoDone = false;
    saveProfile();
    saveRun();
    setScreen("play");
    hud.showToast("OBSERVATION WINDOW OPEN · 03:00 REMAINING");
    updateHud();
  };

  const continueRun = () => {
    if (!runSave) {
      hud.showToast("NO ACTIVE RUN · START A NEW OPERATION");
      return;
    }
    changeWorld(runSave.world, runSave.appearance);
    player.teleport(new Vector3(runSave.position.x, runSave.position.y, runSave.position.z));
    if (runSave.wearingPendant) player.wearPendant();
    coins = runSave.coins;
    missionStage = runSave.missionStage;
    observationTime = runSave.observationTime;
    observationComplete = runSave.observationComplete;
    detection = runSave.detection;
    caught = false;
    input.yaw = runSave.yaw;
    input.clearKeys();
    pendingNewRun = false;
    setScreen("play");
    updateHud();
    hud.showToast("RUN RESTORED · YOUR COVER IS STILL IN PLAY");
  };

  function handleAction(action: string, payload: Record<string, string>) {
    switch (action) {
      case "start":
        pendingNewRun = true;
        setScreen("worlds");
        break;
      case "continue":
        continueRun();
        break;
      case "home":
        saveProfile();
        setScreen("title");
        break;
      case "select-world": {
        const selected = payload.world as WorldId;
        if (selected === "present" || selected === "ancient" || selected === "future") changeWorld(selected);
        break;
      }
      case "enter-customize":
        pendingNewRun = true;
        player.root.position.copyFrom(spawnPosition(worldId));
        player.root.rotation.y = 0;
        player.setWorldStyle(worldId, appearance);
        hud.setAppearance(appearance);
        setScreen("customize");
        break;
      case "back-worlds":
        setScreen("worlds");
        break;
      case "cycle-appearance": {
        const field = payload.field as keyof CharacterAppearance;
        if (!(field in appearance)) break;
        const delta = Number(payload.delta) < 0 ? -1 : 1;
        const choices = APPEARANCE_CHOICES[field];
        if (!choices?.length) break;
        appearance[field] = (appearance[field] + delta + choices.length) % choices.length;
        player.applyAppearance(appearance);
        hud.setAppearance(appearance);
        saveProfile();
        break;
      }
      case "ready":
        setScreen("ready");
        break;
      case "back-customize":
        setScreen("customize");
        break;
      case "enter-game":
        if (pendingNewRun) resetRun();
        else setScreen("play");
        break;
      case "settings":
        returnScreen = screen;
        setScreen("settings");
        break;
      case "howto":
        returnScreen = screen;
        setScreen("howto");
        break;
      case "back-screen":
        setScreen(returnScreen === "settings" || returnScreen === "howto" ? "title" : returnScreen);
        break;
      case "pause":
        if (screen === "play" && !modalOpen) setScreen("pause");
        break;
      case "resume":
        if (screen === "pause") setScreen("play");
        break;
      case "save-title":
        saveRun();
        saveProfile();
        setScreen("title");
        break;
      case "sensitivity": {
        const value = Number(payload.value);
        if (Number.isFinite(value)) {
          input.setLookSensitivity(value);
          profile.sensitivity = input.sensitivity;
          writeProfile(profile);
          hud.setSensitivity(input.sensitivity);
        }
        break;
      }
      default:
        break;
    }
  }

  hud = new Hud(handleAction);
  hud.setContinueAvailable(Boolean(runSave));
  hud.setWorldSelection(worldId, true);
  hud.setAppearance(appearance);
  hud.setSensitivity(profile.sensitivity);
  input = new InputManager(canvas, () => {
    if (modalOpen || caught || screen !== "play") return;
    if (activeTarget) interact(activeTarget);
  }, () => {
    if (modalOpen) {
      hud.closeDialog();
      modalOpen = false;
      input.setEnabled(screen === "play" && !caught);
      return;
    }
    if (screen === "play") handleAction("pause", {});
    else if (screen === "pause") handleAction("resume", {});
    else if (screen === "settings" || screen === "howto") handleAction("back-screen", {});
    else if (screen === "customize") handleAction("back-worlds", {});
    else if (screen === "ready") handleAction("back-customize", {});
    else if (screen === "worlds") handleAction("home", {});
  });
  input.setLookSensitivity(profile.sensitivity);
  input.yaw = spawnYaw(worldId);
  player.root.setEnabled(false);
  applyLighting(worldId);
  updateHud();

  function interact(target: InteractionTarget) {
    const story = WORLD_STORY[worldId];
    if (target.id === "door") {
      world.toggleShopDoor();
      hud.showToast(world.targets.find((entry) => entry.id === "door")?.label ?? "SHOP DOOR UPDATED");
      return;
    }
    if (target.id === "wardrobe") {
      showDialog({ eyebrow: `${WORLD_CATALOG[worldId].district} / FITTING ROOM`, title: "The Local Look", body: "Try the next era-ready outfit and accessory. Your character's materials update immediately, and the rest of the district stays in view.", action: "TRY THE NEXT LOOK", detail: "CLOTHING · ACCESSORIES" }, () => {
        appearance.outfit = (appearance.outfit + 1) % APPEARANCE_CHOICES.outfit.length;
        appearance.accessory = (appearance.accessory + 1) % APPEARANCE_CHOICES.accessory.length;
        player.applyAppearance(appearance);
        hud.setAppearance(appearance);
        saveProfile();
        hud.showToast("NEW LOOK EQUIPPED · FIELD IDENTITY UPDATED");
      });
      return;
    }
    if (target.id === "vehicle") {
      if (missionStage < 2 || !player.wearingPendant) {
        showDialog({ eyebrow: `${WORLD_CATALOG[worldId].district} / LOCAL TRANSPORT`, title: "Vehicle Locked", body: "The nearby ride can make a quick run to the transit entrance, but the route system requires a verified field identity first. Secure the marked pendant before taking the wheel.", action: "UNDERSTOOD", detail: "COVER VERIFICATION REQUIRED" }, () => undefined);
        return;
      }
      showDialog({ eyebrow: `${WORLD_CATALOG[worldId].district} / LOCAL TRANSPORT`, title: "Route Ready", body: "The local vehicle is linked to the district transit route. Take the short ride to the approach outside the station, gate, or maglev platform.", action: "TAKE THE SHORT ROUTE", detail: "LOCAL VEHICLE · TRANSIT APPROACH" }, () => {
        player.teleport(new Vector3(1.35, 0, -11.2));
        hud.showToast("DROPPED AT THE TRANSIT APPROACH");
      });
      return;
    }
    if (target.id === "transit") {
      if (missionStage < 3) {
        showDialog({ eyebrow: `${story.transit.toUpperCase()} / TRANSIT ACCESS`, title: "Route Not Yet Clear", body: `The transit route remains sealed until you complete the local handoff. Meet the ${story.courier} with the marked pendant first.`, action: "RETURN TO THE DISTRICT", detail: "HANDOFF REQUIRED" }, () => undefined);
        return;
      }
      const nextWorld: WorldId = worldId === "present" ? "ancient" : worldId === "ancient" ? "future" : "present";
      showDialog({ eyebrow: `${story.transit.toUpperCase()} / OUTBOUND ROUTE`, title: `Next stop: ${WORLD_CATALOG[nextWorld].name}`, body: `The handoff is complete. Board local transit to continue the same operation in ${WORLD_CATALOG[nextWorld].name}. The world and its architecture will load around you without leaving the game.`, action: "BOARD TRANSIT", detail: "CONTINUE FIELD OPERATION" }, () => {
        changeWorld(nextWorld, defaultAppearance(nextWorld));
        resetRun();
      });
      return;
    }
    if (target.id === "contact") {
      if (missionStage > 0) {
        showDialog({ eyebrow: `${WORLD_CATALOG[worldId].district} / FIELD CONTACT`, title: "Keep Moving", body: story.afterLead, action: "CLOSE BRIEFING", detail: story.route }, () => undefined);
        return;
      }
      showDialog({ eyebrow: `${WORLD_CATALOG[worldId].district} / FIELD CONTACT`, title: "A Lead in the District", body: `${story.store} keeps a marked pendant near its front counter. The ${story.courier} at ${story.transit} recognizes it as a sign of trust. Find the piece, wear it, then meet the contact at the transit entrance.`, action: "ACCEPT THE LEAD", detail: story.route }, () => {
        missionStage = 1;
        hud.showToast("FIELD LEAD ACCEPTED · THE ITEM IS MARKED");
      });
      return;
    }
    if (target.id === "pendant") {
      if (player.wearingPendant) {
        showDialog({ eyebrow: `${story.store.toUpperCase()} / MARK VERIFIED`, title: story.item, body: `The mark is secure against your collar. Your cover reads differently now; the ${story.courier} is waiting near ${story.transit}.`, action: "KEEP IT ON", detail: "COVER VERIFIED" }, () => undefined);
        return;
      }
      showDialog({ eyebrow: `${story.store.toUpperCase()} / DISPLAY CASE`, title: story.item, body: `A distinctive pendant carries the local insignia. The ${story.courier} recognizes it as a sign of trust. Equip the piece to strengthen your cover near security.`, action: "WEAR PENDANT · 150 ₵", detail: "EQUIP TO STRENGTHEN YOUR COVER" }, wearPendant);
      return;
    }
    if (target.id === "courier") {
      if (missionStage >= 2 && player.wearingPendant && missionStage < 3) {
        showDialog({ eyebrow: `${story.transit.toUpperCase()} / HANDOFF`, title: "You Belong Here", body: `The ${story.courier} spots the mark, gives a quiet nod, and sends recovered field credits to your account. This district's lead is complete.`, action: "COLLECT 200 ₵", detail: "FIELD OPERATION · COMPLETE" }, () => {
          coins += 200;
          missionStage = 3;
          hud.showToast("LEVEL COMPLETE · +200 FIELD CREDITS");
        });
        return;
      }
      showDialog({ eyebrow: `${story.transit.toUpperCase()} / FIELD CONTACT`, title: "Not Yet", body: `The ${story.courier} is watching the entrance. Find the marked pendant at ${story.store} and wear it before you approach.`, action: "UNDERSTOOD", detail: "COVER REQUIRED" }, () => undefined);
      return;
    }
    showDialog({ eyebrow: `${story.store.toUpperCase()} / SHOPKEEPER`, title: "After Hours", body: `The pieces on display are hand-finished. The marked pendant is just inside, beneath the warm lights.`, action: "THANK YOU", detail: "KEEP TO THE PUBLIC FLOOR" }, () => undefined);
  }

  const query = new URLSearchParams(window.location.search);
  const demoMode = query.has("demo") ? query.get("demo") || "auto" : null;
  const demoWorld = query.get("world");
  if (demoMode && (demoWorld === "present" || demoWorld === "ancient" || demoWorld === "future") && demoMode !== "auto") {
    changeWorld(demoWorld, defaultAppearance(demoWorld));
  }
  if (demoMode === "worlds") setScreen("worlds");
  else if (demoMode === "customize") setScreen("customize");
  else if (demoMode === "ready") setScreen("ready");
  else if (demoMode === "settings") setScreen("settings");
  else if (demoMode === "howto") setScreen("howto");
  else if (demoMode === "shop" || demoMode === "inspect") {
    player.teleport(new Vector3(8.35, 0, 1.25));
    missionStage = 1;
    setScreen("play");
    input.yaw = 0;
  } else if (demoMode === "mission") {
    player.teleport(new Vector3(-2.8, 0, -14.7));
    player.wearPendant();
    coins = 200;
    missionStage = 2;
    setScreen("play");
    input.yaw = spawnYaw(worldId);
  } else if (demoMode === "spawn") {
    resetRun();
  } else if (demoMode === "auto") {
    changeWorld("present", defaultAppearance("present"));
    resetRun();
    player.teleport(spawnPosition(worldId));
    autoStep = 0;
    autoDone = false;
  }
  if (demoMode === "inspect") {
    window.setTimeout(() => {
      if (modalOpen || screen !== "play") return;
      showDialog({ eyebrow: "AURELINE / DISPLAY CASE 04", title: WORLD_STORY[worldId].item, body: "A warm setting frames the deep teal stone. The courier described this exact piece as the district's quiet mark of trust.", action: "WEAR PENDANT · 150 ₵", detail: "EQUIP TO STRENGTHEN YOUR COVER" }, wearPendant);
    }, 550);
  }

  const observer = scene.onBeforeRenderObservable.add(() => {
    const delta = Math.min(0.05, Math.max(0.001, engine.getDeltaTime() / 1000));
    world.update(delta);
    menuClock += delta;

    if (screen !== "play" && screen !== "pause") {
      const target = player.position.add(new Vector3(0, 1.15, 0));
      const cameraPosition = screen === "customize" || screen === "ready"
        ? player.position.add(new Vector3(0.28, 1.75, 5.6))
        : new Vector3(Math.sin(menuClock * 0.075) * 1.1, 7.1 + Math.sin(menuClock * 0.12) * 0.16, 27);
      const cameraTarget = screen === "customize" || screen === "ready" ? target : new Vector3(0, 2.0, -1.5);
      if (screen === "customize") {
        const previewShift = new Vector3(-1.3, 0, 0);
        cameraPosition.addInPlace(previewShift);
        cameraTarget.addInPlace(previewShift);
      }
      camera.position = Vector3.Lerp(camera.position, cameraPosition, 1 - Math.exp(-delta * 2.5));
      camera.setTarget(cameraTarget);
      return;
    }

    if (screen === "play" && !observationComplete) {
      observationTime = Math.max(0, observationTime - delta);
      if (observationTime <= 0) {
        observationComplete = true;
        hud.showToast("OBSERVATION COMPLETE · INFILTRATION ACTIVE");
      }
    }

    let movement: GameInput = input.input;
    let yaw = input.yaw;
    if (demoMode === "auto" && !autoDone && !modalOpen) {
      const destination = DEMO_PATH[autoStep];
      if (destination) {
        const dx = destination.x - player.position.x;
        const dz = destination.z - player.position.z;
        if (Math.hypot(dx, dz) < 0.42) {
          player.teleport(destination);
          if (autoStep === 0) missionStage = 1;
          if (autoStep === 2 && !player.wearingPendant) {
            coins = Math.max(0, coins - 150);
            player.wearPendant();
            missionStage = 2;
          }
          if (autoStep === 5) {
            coins += 200;
            missionStage = 3;
            autoDone = true;
            hud.showToast("LEVEL COMPLETE · +200 FIELD CREDITS");
          }
          autoStep += 1;
          updateHud();
        } else {
          yaw = Math.atan2(-dx, -dz);
          input.yaw = yaw;
          movement = { forward: true, backward: false, left: false, right: false, run: true, jump: false };
        }
      }
    }

    if (screen === "play" && !modalOpen) player.update(delta, movement, yaw, world.blockers);
    const forward = new Vector3(-Math.sin(input.yaw), 0, -Math.cos(input.yaw));
    const back = forward.scale(-1);
    const insideShop = player.position.x > 3.6 && player.position.x < 13.0 && player.position.z < 5.55 && player.position.z > -5.4;
    const indoor = insideShop;
    const shoulder = new Vector3(Math.cos(input.yaw), 0, -Math.sin(input.yaw)).scale(indoor ? 0.72 : 1.05);
    let desiredCamera = player.position.add(back.scale(indoor ? 4.1 : 5.65)).add(shoulder).add(new Vector3(0, indoor ? 2.25 + input.pitch : 2.55 + input.pitch * 1.5, 0));
    const aimPoint = player.position.add(new Vector3(0, 1.34 + input.pitch * 1.8, 0)).add(forward.scale(1.45));
    const cameraVector = desiredCamera.subtract(aimPoint);
    const cameraDistance = cameraVector.length();
    const cameraDirection = cameraVector.normalize();
    const obstacleRay = new Ray(aimPoint, cameraDirection, cameraDistance);
    const obstruction = scene.pickWithRay(obstacleRay, (mesh) => mesh.metadata?.cameraBlocker === true);
    if (obstruction?.hit && obstruction.distance < cameraDistance) {
      desiredCamera = aimPoint.add(cameraDirection.scale(Math.max(1.4, obstruction.distance - 0.42)));
    }
    camera.position = Vector3.Lerp(camera.position, desiredCamera, 1 - Math.exp(-delta * 7.5));
    camera.setTarget(aimPoint);

    activeTarget = screen === "play" && !modalOpen ? findTarget(player.position, camera.position, input.yaw, input.pitch, world.targets) : null;
    world.highlight(activeTarget);
    const prompt = activeTarget?.label ?? null;
    if (prompt !== lastPrompt) {
      hud.setPrompt(prompt);
      lastPrompt = prompt;
    }

    const guardDistance = Vector3.Distance(player.position, world.securityPosition);
    if (screen === "play" && missionStage > 0 && guardDistance < 4.7 && !player.wearingPendant) {
      detection = Math.min(100, detection + delta * 11.5);
    } else {
      detection = Math.max(8, detection - delta * (player.wearingPendant ? 7.0 : 4.2));
    }
    if (detection >= 100 && !caught) showCaughtDialog();

    promptAccumulator += delta;
    if (promptAccumulator > 0.12) {
      updateHud();
      promptAccumulator = 0;
    }
    if (screen === "play" && !modalOpen) {
      saveAccumulator += delta;
      if (saveAccumulator > 3.5) {
        saveAccumulator = 0;
        saveRun();
      }
    }
  });

  return {
    scene,
    dispose() {
      input.dispose();
      hud.dispose();
      scene.onBeforeRenderObservable.remove(observer);
      player.dispose();
      world.dispose();
      scene.dispose();
    },
  };

  function showCaughtDialog() {
    caught = true;
    detection = 100;
    input.setEnabled(false);
    showDialog({ eyebrow: `${WORLD_CATALOG[worldId].district} / SECURITY ALERT`, title: "Cover Blown", body: "Security recognizes that you do not belong here. The run has ended. Return to the district entrance and rebuild your cover before approaching transit again.", action: "RESTART THIS RUN", detail: "DETECTION · 100%" }, () => {
      caught = false;
      detection = 8;
      missionStage = 0;
      coins = Math.max(coins, 200);
      player.teleport(spawnPosition(worldId));
      input.yaw = spawnYaw(worldId);
      saveRun();
      updateHud();
      hud.showToast("BACK AT THE DISTRICT ENTRANCE");
    });
  }
}

function findTarget(
  playerPosition: Vector3,
  cameraPosition: Vector3,
  yaw: number,
  pitch: number,
  targets: InteractionTarget[],
): InteractionTarget | null {
  const view = new Vector3(-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch));
  let selected: InteractionTarget | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const target of targets) {
    const distance = Vector3.Distance(playerPosition, target.position);
    if (distance > target.radius) continue;
    const direction = target.position.subtract(cameraPosition).normalize();
    const facing = Vector3.Dot(view, direction);
    const minimumFacing = distance < 1.35 ? -0.1 : 0.48;
    if (facing < minimumFacing) continue;
    const score = facing * 2 - distance * 0.18;
    if (score > bestScore) {
      bestScore = score;
      selected = target;
    }
  }
  return selected;
}
