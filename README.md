# idk

A 16-bit style, tile-based RPG where combat is coding. Your spells are JavaScript functions.

- Design: [docs/superpowers/specs/2026-10-31-idk-rpg-design.md](docs/superpowers/specs/2026-10-31-idk-rpg-design.md)
- Roadmap: [docs/roadmap.md](docs/roadmap.md)

## Run

```bash
npm install
npm run dev        # play at the printed localhost URL
npm test           # unit tests (Vitest)
npm run typecheck  # tsc --noEmit
npm run build      # production build into dist/
```

## Controls

| Key | Action |
| --- | --- |
| Arrow keys / WASD | Move |
| Space / E / Enter | Interact, advance text |
| I | Inventory |
| K | Skills (level, skill points, mods) |
| Esc | Close panel / back |
| Ctrl+Enter | Cast (in the code editor) |
