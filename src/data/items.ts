export interface ItemDef {
  name: string;
  description: string;
}

export const ITEMS: Record<string, ItemDef> = {
  spaceHeater: {
    name: "Space Heater",
    description: "Warms the air around you. It doesn't do anything yet… but someday it might change world.temperature.",
  },
};
