// Generates public/assets/tiles/placeholder.png: 8 flat 16×16 tiles in one row.
// gids (1-based, as Tiled numbers them): 1 grass, 2 path, 3 tree, 4 roof,
// 5 house wall, 6 door, 7 floor, 8 interior wall.
import { PNG } from "pngjs";
import fs from "node:fs";
import path from "node:path";

const T = 16;
const png = new PNG({ width: T * 8, height: T });

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

function px(tile, x, y, color) {
  const i = ((y * png.width) + tile * T + x) * 4;
  const [r, g, b] = hex(color);
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = 255;
}

const painters = [
  // 1 grass: green with a few darker blades
  (x, y) => ((x * 7 + y * 13) % 23 === 0 ? "#5f9e47" : "#7cc25e"),
  // 2 path: sandy with speckles
  (x, y) => ((x * 5 + y * 11) % 17 === 0 ? "#c9a96a" : "#e2c88f"),
  // 3 tree: round dark canopy on grass, trunk at the bottom
  (x, y) => {
    const dx = x - 7.5, dy = y - 6.5;
    if (dx * dx + dy * dy < 42) return dx + dy < -3 ? "#3f8a3a" : "#2d6a2b";
    if (y >= 12 && x >= 6 && x <= 9) return "#6b4a2b";
    return "#7cc25e";
  },
  // 4 roof: red shingles
  (x, y) => (y % 4 === 3 ? "#8e2f2a" : (x + (y >> 2) * 4) % 8 === 0 ? "#a5392f" : "#c4483a"),
  // 5 house wall: cream planks
  (x, y) => (y % 5 === 4 ? "#b9a27a" : "#efe0b9"),
  // 6 door: brown door with a knob, framed by wall
  (x, y) => {
    if (x < 3 || x > 12) return y % 5 === 4 ? "#b9a27a" : "#efe0b9";
    if (x === 10 && y === 9) return "#f2d24b";
    return y < 2 ? "#5a3a20" : "#7a5230";
  },
  // 7 floor: wooden boards
  (x, y) => (x % 8 === 7 || (y % 4 === 3 && x % 8 === (y >> 2) % 8) ? "#9c7148" : "#c08d5a"),
  // 8 interior wall: blue-grey bricks
  (x, y) => (y % 4 === 3 || (x + ((y >> 2) % 2) * 4) % 8 === 0 ? "#3c4157" : "#5b6382"),
];

painters.forEach((paint, tile) => {
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) px(tile, x, y, paint(x, y));
});

const out = path.resolve("public/assets/tiles/placeholder.png");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, PNG.sync.write(png));
console.log(`wrote ${out} (${png.width}×${png.height})`);
