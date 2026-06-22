# Game Generator

You are building a single self-contained browser game. Make it genuinely fun, polished, and surprising. Push yourself — this should feel like a tiny finished product, not a tech demo.

> ⛔ **YOUR BUILD WILL BE AUTOMATICALLY REJECTED unless ALL of these are true.**
> An automated headless browser opens your game and clicks the controls. The two
> most common reasons good games get discarded:
>
> 1. **Missing control hooks.** You MUST include a real
>    `<button data-smoke="start">…</button>` to begin the game and a real
>    `<button data-smoke="restart">…</button>` shown after game over. Real
>    `<button>` elements — never `<div>`/`<span>`, never a bare tap-the-canvas
>    start with no button. Nothing may overlay or intercept these buttons.
> 2. **Uncaught exceptions.** Any thrown error on load, on tapping the screen
>    centre, or on clicking start then restart fails the build. Guard every CDN
>    global before use and never crash if WebGL/a library is unavailable.
>
> Re-read the "Testability contract" and "Final self-check" sections below
> before you output. These are hard gates, not suggestions.

## Today's brief

Read `data/brief.json`. It contains:

- **mood, weather, music, season** — use these to flavor the theme, palette, or setting.
- **world_signals** — a handful of real-world observations from today. Let them inspire the game concept loosely. Do NOT make a literal "news game" — instead, let signals shape the vibe, setting, characters, or mechanics.
- **game_directions.{your-model}** — a concept seed assigned specifically to you. Treat `concept` and `aesthetic` as the baseline, and use `mechanic`, `touch_control`, `session_hook`, and `escalation` when present. You may evolve or reinterpret the direction, but don't ignore it entirely.

## Design process

Before writing any code, think through:

1. **Core loop** — what does the player actively do every 1-3 seconds?
2. **Controls** — what is the one-thumb touch gesture? How does keyboard work?
3. **Win/lose** — what ends a round? What's the score or goal?
4. **Start/restart** — clear title screen, immediate restart after game over.
5. **Escalation** — how do speed, density, combo, risk/reward, shrinking space, or changing rules increase pressure during one round?
6. **Polish** — juice (hit pause, particles, easing), sound cues via Web Audio if you want, and guarded haptics (`navigator.vibrate?.(...)`) for important events.

## Hard constraints

1. **Single HTML file.** Output to `generated/games/{model}.html`. All markup, styles, and scripts inline.
2. **CDN allowlist.** You may load libraries from `unpkg.com`, `esm.sh`, `cdn.jsdelivr.net`. No other external requests — no fetch, XMLHttpRequest, WebSocket, or EventSource calls at runtime. No external images, fonts, or CSS via `url(...)`.
3. **Max 200 KB** for the HTML file (excluding CDN payloads at load time).
4. **Viewport meta required:** `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`
5. **Phone-first and one-thumb playable.** The game MUST fill the entire viewport on a phone in portrait orientation. Use `100dvh` / `100dvw`, not fixed pixel sizes. The primary input must be tap, hold/release, drag, or swipe. Tilt-like controls are allowed only with a touch fallback. Keyboard controls should also work for desktop.
6. **Instant clarity.** The player should understand what to do within 3 seconds. A single round should last 30-60 seconds.
7. **Active play.** Do not make a passive visual demo. The player must make meaningful input every 1-3 seconds.
8. **Restart control.** Visible restart / play-again button after game over. The player must be able to replay without reloading.
9. **Dark and light mode.** Respect `prefers-color-scheme`. Both must look polished — not an afterthought.
10. **No persistence.** Do not use `localStorage`, `sessionStorage`, `IndexedDB`, or cookies.
11. **No purple gradients.** Never use purple in gradients or as a dominant color.

## Good mobile game shapes

Prefer small, legible archetypes that work while walking or commuting: dodge/collect, timing, rhythm, physics flick, path drawing, sorting, lane switching, memory/pattern, tiny roguelite survival, or one-screen puzzle. Avoid generic Pong, Snake, and Flappy clones unless the remix creates a meaningfully new decision loop.

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

## Testability contract (REQUIRED — an automated smoke test must pass)

Every build is opened in a headless browser (mobile + desktop), checked for
runtime errors, and driven by clicking the start and restart controls. Builds
that throw or can't be started are discarded and never published. To pass:

1. **Deterministic control hooks.** The primary start control must be a real
   `<button data-smoke="start">…</button>`. The replay control after game over
   must be a real `<button data-smoke="restart">…</button>`. Use real `<button>`
   elements, not `<div>`/`<span>`.
2. **Start button must be clickable — nothing may intercept it.** If the title
   screen is an overlay, the overlay/instructions must not swallow the click.
   Give the overlay container `pointer-events: none` and re-enable
   `pointer-events: auto` only on the button itself, OR ensure the button is the
   top-most element at its position. A common failure is an overlay layer
   covering its own start button.
3. **Render immediately.** The page body must have non-zero height right after
   load. Do not gate all rendering behind a slow/optional CDN script.
4. **Zero uncaught exceptions** — on load, on tapping the screen center, and on
   clicking start then restart. Defensively guard every external global before
   use (e.g. `if (typeof THREE === 'undefined') { /* fallback */ }`), and never
   reference a CDN library before its script has loaded. If `getContext('webgl2')`
   (or your CDN) is unavailable, fall back gracefully instead of throwing.
5. **No stray "start-like" labels as fake buttons.** HUD labels are fine, but the
   only real start/restart affordances should be the `data-smoke` buttons above.

## Final self-check (do this before you output)

Mentally run the automated test and confirm every item. If any fails, fix it first.

- [ ] There is exactly one real `<button data-smoke="start">` that begins the game, and it is clickable (no overlay/instructions layer swallows the click — give overlays `pointer-events: none` and re-enable `pointer-events: auto` only on the button).
- [ ] After game over there is a real `<button data-smoke="restart">` that replays without a page reload.
- [ ] The page renders immediately — body has non-zero height on load, not gated behind a slow CDN script.
- [ ] Zero uncaught exceptions on: load, tapping the screen centre, clicking start, then clicking restart.
- [ ] Every external global (THREE, etc.) is guarded with `typeof X === 'undefined'` before use; `getContext('webgl2')`/CDN failures fall back gracefully instead of throwing.
- [ ] Zero console errors. Phone-first, fills the viewport with `100dvh`/`100dvw`. Respects dark + light mode. No purple gradients. No persistence APIs. No runtime network calls.

## Output

Write the game to `generated/games/{model}.html`.