# Game Generator

You are building a single self-contained browser game. Make it genuinely fun, polished, and surprising. Push yourself — this should feel like a tiny finished product, not a tech demo.

## Today's brief

Read `data/brief.json`. It contains:

- **mood, weather, music, season** — use these to flavor the theme, palette, or setting.
- **world_signals** — a handful of real-world observations from today. Let them inspire the game concept loosely. Do NOT make a literal "news game" — instead, let signals shape the vibe, setting, characters, or mechanics.
- **game_directions.{your-model}** — a concept seed assigned specifically to you. Treat it as a strong starting suggestion. You may evolve or reinterpret it, but don't ignore it entirely.

## Design process

Before writing any code, think through:

1. **Core loop** — what does the player do every few seconds?
2. **Controls** — how does touch work? How does keyboard work?
3. **Win/lose** — what ends a round? What's the score or goal?
4. **Start/restart** — clear title screen, immediate restart after game over.
5. **Polish** — juice (screen shake, particles, easing), sound cues via Web Audio if you want, satisfying feedback on every action.

## Hard constraints

1. **Single HTML file.** Output to `generated/games/{model}.html`. All markup, styles, and scripts inline.
2. **CDN allowlist.** You may load libraries from `unpkg.com`, `esm.sh`, `cdn.jsdelivr.net`. No other external requests — no fetch, XMLHttpRequest, WebSocket, or EventSource calls at runtime. No external images, fonts, or CSS via `url(...)`.
3. **Max 200 KB** for the HTML file (excluding CDN payloads at load time).
4. **Viewport meta required:** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
5. **Full-screen mobile-first.** The game MUST fill the entire viewport on a phone in portrait orientation. Use `100dvh` / `100dvw`, not fixed pixel sizes. Touch controls are required. Keyboard controls should also work for desktop.
6. **Playable in 30–60 seconds.** A single round should complete within roughly a minute.
7. **Restart control.** Visible restart / play-again button after game over. The player must be able to replay without reloading.
8. **Dark and light mode.** Respect `prefers-color-scheme`. Both must look polished — not an afterthought.
9. **No persistence.** Do not use `localStorage`, `sessionStorage`, `IndexedDB`, or cookies.
10. **No purple gradients.** Never use purple in gradients or as a dominant color.

## Graphics

- **Canvas 2D** is great for most games. Use it confidently.
- **WebGL / Three.js** is allowed and encouraged when the concept calls for it (3D terrain, particle systems, shader effects). Load Three.js from CDN if needed. But: you MUST provide a graceful fallback or simplified mode if `getContext('webgl2')` returns null. Never crash on WebGL failure.
- **DOM animation** is fine for card games, word games, UI-heavy mechanics.
- Pick whichever rendering approach fits the game. Don't default to the simplest option — pick the one that makes the game feel best.

## Visual direction

- Menus, HUD, and overlays: restrained and elegant. Think Swiss modernism — monospace font for scores/labels (`ui-monospace, 'SFMono-Regular', Menlo, monospace`), clean layout, generous whitespace.
- The game arena itself can be vibrant, textured, or stylized — match the concept.
- Smooth transitions between states (title → playing → game over). No jarring jumps.

## Quality bar

- Zero console errors.
- No uncaught exceptions.
- 60fps on modern phones, 30fps minimum.
- Touch targets at least 44px.
- `touch-action: none` on the game canvas to prevent scroll hijacking.
- `user-select: none` on the game area.
- `e.preventDefault()` on touch handlers to avoid double-firing with mouse events.

## Output

Write the game to `generated/games/{model}.html`.