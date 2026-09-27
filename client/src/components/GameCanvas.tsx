import { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameHandle } from "@/game/scene";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;

    const engine = new Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      adaptToDeviceRatio: true,
    });
    let cancelled = false;
    let handle: GameHandle | null = null;

    void createGameScene(engine, canvas)
      .then((created) => {
        if (cancelled) {
          created.dispose();
          return;
        }
        handle = created;
        engine.runRenderLoop(() => created.scene.render());
      })
      .catch((error: unknown) => {
        console.error("METRO-9 failed to initialize", error);
      });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      engine.stopRenderLoop();
      handle?.dispose();
      engine.dispose();
      startedRef.current = false;
    };
  }, []);

  return (
    <main className="game-shell" aria-label="METRO-9 3D game">
      <canvas
        ref={canvasRef}
        className="game-canvas"
        aria-label="Third-person city exploration game. Use WASD to move and drag to look around."
        tabIndex={0}
      />
    </main>
  );
}
