<div align="center">
  <h1>🎮 METRO-9 Infiltration</h1>
  <p>
    <strong>An interactive, full-stack 3D stealth & exploration game built with Babylon.js, React, and TypeScript.</strong>
  </p>
  <p>
    <a href="https://metro9infil.vercel.app/" target="_blank">Play the Demo</a>
    ·
    <a href="#features">Explore Features</a>
    ·
    <a href="#installation">Installation Guide</a>
  </p>
</div>

<hr />

## 📖 Overview

**METRO-9 Infiltration** is a time-hopping 3D exploration and stealth game. Navigate through distinct temporal environments—**Present City, Ancient World, and Future World**—while completing missions under the pressure of a 180-second observation timer. Players must observe the district, contact local informants, inspect and equip era-specific artifacts from physical shops, and execute secure handoffs to couriers without triggering security awareness.

Built natively on the web using **Babylon.js** for performant 3D rendering and **React** for responsive, modern UI management, this project demonstrates a highly interactive, framework-agnostic game loop smoothly embedded within a web application.

---

## ✨ Key Features

- 🌍 **Multi-Era Environments**: Explore three meticulously generated worlds (Present, Ancient, Future) with unique procedural meshes, NPCs, and architectural landmarks.
- 🕴️ **Dynamic Gameplay**: A fast-paced mission loop including stealth elements (security awareness), a strict observation timer, and interactive physical-world objectives (shops, informants, transit landmarks).
- 🎨 **Live Character Customization**: Procedural third-person avatar with era-specific attire, live appearance tweaking, and responsive movement mechanics.
- ⚡ **High-Performance 3D Engine**: Powered by Babylon.js with an optimized runtime structure—`client/src/components/GameCanvas.tsx` manages a persistent Engine seamlessly bridged with a framework-agnostic gameplay loop.
- 💾 **Persistent Profiles**: SaveStore validates and persists world states, customized character appearances, mission progress, and field credits directly in local browser storage.
- 📱 **Responsive & Modern UI**: Built with Radix UI, Framer Motion, and Tailwind CSS for slick, full-screen HUDs, immersive transition states, dialogs, and main menus.

---

## 🛠️ Technology Stack

| Category | Technologies |
| :--- | :--- |
| **Frontend/UI** | React 19, TypeScript, Vite, Tailwind CSS, Radix UI, Framer Motion, Lucide React |
| **Game Engine** | Babylon.js |
| **Backend** | Node.js, Express.js |
| **Package Management** | pnpm |
| **Linting & Formatting**| ESLint, Prettier, TypeScript (tsc) |

---

## 🚀 Installation & Setup

Ensure you have [Node.js](https://nodejs.org/) (v18+) and [pnpm](https://pnpm.io/) installed.

### 1. Clone the repository
```bash
git clone https://github.com/RITHULOWKEY/game-infiltration.git
cd game-infiltration
```

### 2. Install dependencies
```bash
pnpm install
```

### 3. Run the development server
```bash
pnpm dev
```
The game will be available locally on your host machine.

### 4. Build for Production
To build the optimized client and server bundle:
```bash
pnpm build
```

To run the production build:
```bash
pnpm start
```

---

## 🏗️ Project Architecture

The architecture intentionally separates React UI components from the core Babylon.js rendering engine:

- `client/src/components/GameCanvas.tsx`: Owns the full-screen Babylon Engine for the React component lifetime.
- `client/src/game/scene.ts`: Manages title-to-play flow, world changes, camera, mission state, and local-save integration.
- `client/src/game/World.ts`: Constructs the Present, Ancient, and Future scenes, handling collision blockers, NPCs, and visibility control.
- `client/src/game/Player.ts`: Handles procedural avatar generation, movement, jump physics, and collision logic.
- `client/src/game/Hud.ts`: A custom HUD implementation that relays semantic UI actions back to the scene loop.

For an exhaustive breakdown of the game loops and states, see the [`STRUCTURE.md`](./STRUCTURE.md) file.

---

## 🤝 Contributing

We welcome contributions! Please follow standard Git workflow protocols:
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

**Development Scripts:**
- `pnpm check`: Type check TypeScript files without emitting code.
- `pnpm format`: Formats code via Prettier.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
<div align="center">
  <b>Built by <a href="https://github.com/RITHULOWKEY">Rithika K</a></b>
</div>
