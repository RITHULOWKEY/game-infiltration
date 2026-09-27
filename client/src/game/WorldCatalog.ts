import type { WorldId } from "./Player";

export type WorldDefinition = {
  id: WorldId;
  name: string;
  label: string;
  tagline: string;
  description: string;
  landmarks: string[];
  preview: string;
  district: string;
};

export const WORLD_CATALOG: Record<WorldId, WorldDefinition> = {
  present: {
    id: "present",
    name: "Present City",
    label: "01 / THE PRESENT",
    tagline: "Haven District · 23:41",
    description: "Walk a modern night district of wet stone, quiet shops, city contacts and a Metro-9 entrance hiding a deeper story.",
    landmarks: ["Aureline jewellery house", "Central Metro-9", "Havel Street"],
    preview: "/manus-storage/metro9-present-preview_95b03f15.png",
    district: "HAVEN · 09",
  },
  ancient: {
    id: "ancient",
    name: "Ancient World",
    label: "02 / THE OLD KINGDOM",
    tagline: "Ashen Gate · Dusk",
    description: "Cross a fortified market village where the temple, gatehouse and lantern bazaars hold the clues to a vanished court.",
    landmarks: ["Crenellated Ashen Gate", "Sun Temple", "Lantern Bazaar"],
    preview: "/manus-storage/metro9-ancient-preview_c21b8764.png",
    district: "ASHEN GATE",
  },
  future: {
    id: "future",
    name: "Future World",
    label: "03 / THE FAR FUTURE",
    tagline: "Meridian Stack · 02:09",
    description: "Navigate a vertical neon megacity of skybridges, maglev transit, service robots and a high-tech accessory kiosk.",
    landmarks: ["Meridian skybridge", "Maglev platform", "Signal accessories"],
    preview: "/manus-storage/metro9-future-preview_5f83f758.png",
    district: "MERIDIAN · 9",
  },
};
