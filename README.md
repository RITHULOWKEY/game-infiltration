<div align="center">
  <h2>🎮 METRO-9 Infiltration</h2>
  
  <p><b>An immersive, framework-agnostic 3D exploration and stealth game.</b></p>

  <p>
    <a href="https://metro9infil.vercel.app/"><strong>🕹️ Play the Live Demo</strong></a> ·
    <a href="#-architecture--design">Read the Architecture</a> ·
    <a href="#-getting-started">Get Started</a>
  </p>

  <p>
    <img alt="React" src="https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB">
    <img alt="Babylon.js" src="https://img.shields.io/badge/babylon.js-%23BB464B.svg?style=for-the-badge&logo=babylon.js&logoColor=white">
    <img alt="TypeScript" src="https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white">
    <img alt="Vite" src="https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white">
    <img alt="Express.js" src="https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB">
  </p>
</div>

---

## 📖 Table of Contents

- [About the Project](#-about-the-project)
- [Key Features](#-key-features)
- [Architecture & Design](#-architecture--design)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Development Workflow](#-development-workflow)
- [Contributing](#-contributing)
- [License](#-license)

## 🎯 About the Project

**METRO-9 Infiltration** is a robust, full-stack web application demonstrating the seamless integration of a high-performance 3D rendering engine (Babylon.js) within a modern, reactive user interface (React). 

Players navigate through distinct temporal environments—**Present City, Ancient World, and Future World**—executing stealth missions under strict time constraints. The project showcases advanced patterns in bridging framework-agnostic game loops with React's component lifecycle, ensuring a fluid, high-fidelity experience in the browser.

## ✨ Key Features

- **Multi-Era World Generation**: Three distinct, procedurally constructed 3D environments, featuring era-specific architecture, NPCs, and dynamic collision boundaries.
- **Framework-Agnostic Game Loop**: A highly optimized scene loop that independently manages rendering, physics, and state, avoiding React reconciliation overhead to maintain 60 FPS gameplay.
- **Advanced State & Save Management**: A robust `SaveStore` architecture that validates and serializes world states, character customizations, and mission progress into local browser storage.
- **Reactive Heads-Up Display (HUD)**: A modern, accessible UI built with Radix Primitives and Tailwind CSS, providing real-time feedback for mission directives, detection alerts, and dialogs.
- **Live Avatar Customization**: Procedural third-person controller with dynamic, era-appropriate attire generation, fluid movement, and physics-based interactions.

## 📐 Architecture & Design

Our architectural philosophy centers on strict boundaries between UI rendering and the core game loop.

- **Canvas Host Integration**: `client/src/components/GameCanvas.tsx` owns the Babylon `Engine` for the lifetime of the React application. React handles the DOM tree; Babylon handles the WebGL context.
- **Scene Management**: `client/src/game/scene.ts` orchestrates the title-to-play state machine, camera transitions, and deterministic execution paths.
- **Entity Ownership**:
  - `World.ts`: Manages environment construction, mesh instancing, collision meshes, and NPC visibility.
  - `Player.ts`: Encapsulates procedural mesh generation, input physics, and the third-person camera target.
  - `InputManager.ts`: Maps raw DOM events into semantic game actions, carefully gating inputs during UI overlays.

For an exhaustive technical breakdown, consult the [Architecture Documentation (`STRUCTURE.md`)](./STRUCTURE.md).

## 🛠️ Tech Stack

### Client
- **Core**: [React 19](https://react.dev/) & [TypeScript 5](https://www.typescriptlang.org/)
- **3D Engine**: [Babylon.js](https://www.babylonjs.com/) (v9)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) & [Framer Motion](https://www.framer.com/motion/)
- **Components**: [Radix UI](https://www.radix-ui.com/) (Headless accessibility primitives)
- **Bundler**: [Vite 7](https://vitejs.dev/)

### Server & Infrastructure
- **Runtime**: Node.js & Express.js
- **Package Manager**: [pnpm 10](https://pnpm.io/)
- **Build Tools**: esbuild

## 🚀 Getting Started

### Prerequisites

Ensure your local development environment meets the following requirements:
- **Node.js**: v18.0.0 or higher
- **pnpm**: v9.0.0 or higher (`corepack enable` recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/RITHULOWKEY/game-infiltration.git
   cd game-infiltration
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start the development server**
   ```bash
   pnpm dev
   ```
   > The application will be served locally. Check your terminal output for the exact `localhost` port.

### Production Build

To compile the application for production, generating both the optimized client bundle and the server entry point:

```bash
pnpm build
pnpm start
```

## 💻 Development Workflow

We enforce strict typings and consistent code formatting to maintain project health.

- **Type Checking**: Run `pnpm check` to execute `tsc` across the workspace without emitting files.
- **Formatting**: Run `pnpm format` to automatically format all files using Prettier.
- **Testing**: Run `pnpm vitest` to execute the unit test suite (if configured).

## 🤝 Contributing

We welcome contributions from the community. To ensure a smooth process:

1. Fork the project.
2. Create your feature branch (`git checkout -b feature/amazing-feature`).
3. Adhere strictly to the project's Prettier and TypeScript configurations.
4. Commit your changes utilizing conventional commit messages (`git commit -m 'feat: add amazing feature'`).
5. Push to the branch (`git push origin feature/amazing-feature`).
6. Open a Pull Request for review.

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---
<div align="center">
  <b>Architected & Developed by <a href="https://github.com/RITHULOWKEY">Rithika K</a></b>
</div>
