import type { Dialogue } from "../dialogue/types";

export const DIALOGUES: Record<string, Dialogue> = {
  mo: {
    id: "mo",
    start: "start",
    nodes: {
      start: {
        text: "Hey! Welcome to Idk Village. Nobody remembers what 'idk' stands for. I say it's Intuition, Deduction, Knowledge.",
        choices: [
          { label: "What's east of here?", next: "east" },
          { label: "Bye!", next: null },
        ],
      },
      east: {
        text: "A Bugblob's been oozing around the road. Its ice shield shrugs off weak fire… so bring enough mana.",
      },
    },
  },
  lint: {
    id: "lint",
    start: "start",
    nodes: {
      start: {
        text: "Grandma Lint squints at you. \"idk? Obviously it means Integrated Development Kit. Kids these days.\"",
      },
    },
  },
};
