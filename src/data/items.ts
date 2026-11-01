export interface ItemDef {
  name: string;
  description: string;
}

export const ITEMS: Record<string, ItemDef> = {
  spaceHeater: {
    name: "Space Heater",
    description: "Warms the air around you. In battle, spaceHeater.use() raises world.temperature by 4°. Never runs out.",
  },
  manaBerry: {
    name: "Mana Berry",
    description: "A tart berry that fizzes on your tongue. In battle, manaBerry.use() restores 4 MP. Used up when eaten.",
  },
  energyBar: {
    name: "Energy Bar",
    description: "Chewy, oaty, suspiciously crunchy. In battle, energyBar.use() restores 4 EN. Used up when eaten.",
  },
};
