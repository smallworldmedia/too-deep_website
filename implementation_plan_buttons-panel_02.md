# Bottom Panel, Countdown, Share, and Play Button Glow — Full UI Spec

**Supersedes** `implementation_plan_buttons-panel_01.md`. Incorporates all decisions from the project manager review sessions. This document is the complete, implementation-ready spec.

## Goal

Replace the existing standalone play button and SUB slider with a consolidated bottom panel that contains play, SUB knob (replacing the slider), and a PRE-SAVE toggle which expands to reveal per-platform pre-save links plus a studio credit. Add a top-left release date + live countdown and a top-right share button. When the panel is open, dim and blur the background for focus.

The cymatics audio-reactive system (shader, audio engine, postprocessing) is **out of scope** — do not modify `src/postprocessing.js`, `src/audioEngine.js`, `scripts/analyze-audio.mjs`, or `src/data/frequency-data.json`.

---

## Platform pre-save links

Verified working FFM per-platform deep-link pattern: `https://broke.ffm.to/jeff_sorkowitz-too_deep/{platform}`. Each link lands directly in the platform's OAuth flow, bypassing FFM's landing page. FFM remains the backend.

Define this map at the top of `src/main.js`:

```js
const PLATFORM_LINKS = [
  { slug: 'spotify',     label: 'Spotify',      href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/spotify' },
  { slug: 'applemusic',  label: 'Apple Music',  href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/applemusic' },
  { slug: 'deezer',      label: 'Deezer',       href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/deezer' },
  { slug: 'amazonmusic', label: 'Amazon Music', href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/amazonmusic' },
  { slug: 'tidal',       label: 'TIDAL',        href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/tidal' },
  { slug: 'soundcloud',  label: 'SoundCloud',   href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/soundcloud' },
  { slug: 'audiomack',   label: 'Audiomack',    href: 'https://broke.ffm.to/jeff_sorkowitz-too_deep/audiomack' },
];
```

Before shipping, open each URL in an incognito window and confirm it lands in that platform's pre-save flow. `/spotify` and `/soundcloud` are verified. If any other slug 404s or redirects to the FFM landing page, try variants (`apple-music`, `amazon-music`, `amazon`) and document the working form. If no variant works, fall back to the base smartlink for that one platform with a code comment noting the fallback.

---

## Layout map

```
┌─────────────────────────────────────────────────────────────┐
│ [RELEASE DATE]                                    [SHARE]   │  top-left / top-right overlays
│ [COUNTDOWN]                                                 │
│                                                             │
│                   (canvas / cymatics)                       │
│                                                             │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Tier 2 (visible when expanded):                         │ │
│ │   [Spotify] [Apple] [Deezer] [Amazon] [TIDAL] [SC] [AM] │ │
│ │         site by small world media                       │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ Tier 1 (always visible):                                │ │
│ │   [ PRE-SAVE ↑ ]      [ ▶ ]        [  ⊙ SUB  ]          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘   panel overflows ~80px past viewport bottom
```

DOM source order inside `#bottom-panel`: Tier 2 FIRST, Tier 1 SECOND. This is required so the panel grows upward visually when expanded via `transform: translateY()`.

---

## Components

### Release date + countdown (top-left)

- Position: `position: fixed; top: calc(20px + env(safe-area-inset-top)); left: 20px; z-index: 20;`
- Label line: `MAY 1, 2026` — `Aspekta-450`, 10px, `letter-spacing: 2px`, `text-transform: uppercase`, color `rgba(114, 221, 249, 0.5)`
- Countdown line: same font, 18px, color `rgba(114, 221, 249, 0.85)`, tabular-nums so digits don't wiggle
- Target datetime: **May 1, 2026 00:00 in the user's local timezone**. Construct with `new Date(2026, 4, 1, 0, 0, 0)` (month is 0-indexed; 4 = May). `Date` auto-localizes.
- Countdown format:
  - `> 24h` remaining: `{days}d {hours}h {minutes}m` (no seconds)
  - `≤ 24h` remaining: `HH:MM:SS` zero-padded
  - `≤ 0` (post-release): replace countdown line with `OUT NOW` in the label-line style (same color + weight as the date); keep the date label above
- Update cadence: `setInterval(update, 1000)`. Compute format branch each tick from remaining ms.

### Share button (top-right)

- Position: `position: fixed; top: calc(20px + env(safe-area-inset-top)); right: 20px; z-index: 20;`
- Circular, 36x36px, matches play button's glassmorphism: `background: rgba(10, 40, 80, 0.35); border: 1px solid rgba(114, 221, 249, 0.3); backdrop-filter: blur(12px);`
- Icon: inline SVG of the universal share glyph (upward arrow from a box, or three-node share graph), 16px, stroke `rgba(114, 221, 249, 0.85)`
- Hover: background `rgba(10, 40, 80, 0.5)`, border brightens, soft cyan glow
- `aria-label="Share this page"`
- Behavior:
  - If `navigator.share` is available: call `navigator.share({ title: 'Too Deep — Jeff Sorkowitz', text: "Pre-save Jeff Sorkowitz's new track 'Too Deep', out May 1", url: window.location.href })`
  - Else: `await navigator.clipboard.writeText(window.location.href)`, then show a transient toast reading `Copied` for 2 seconds
- Toast: fixed, centered near the share button, glassmorphism pill, fades in/out 200ms, auto-dismiss at 2000ms

### Bottom panel — container

- Element id: `#bottom-panel`
- Position: `position: fixed; left: 0; right: 0; bottom: -80px; z-index: 30;`
  - The `-80px` is the "runs off screen" requirement — panel visually extends 80px past the viewport bottom so there's no hard bottom edge
  - Content is padded above that 80px so nothing is cut off visually
- Background: `rgba(8, 20, 40, 0.55)` with `backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);`
- Top border: `1px solid rgba(114, 221, 249, 0.15)` for a subtle lip
- Inner container: `max-width: 640px; margin: 0 auto; padding: 20px 32px calc(80px + env(safe-area-inset-bottom));`
- Translate-based slide animation:
  - Always render both tiers inside the panel
  - Let `H = height of Tier 2 content` (measure in JS on resize, or hardcode an estimate like 180px and pad Tier 2 to that height)
  - Collapsed: `transform: translateY(H)` — Tier 2 pushed below fold
  - Expanded (when `.expanded` class added): `transform: translateY(0)` — Tier 2 visible above Tier 1
  - Transition: `transform 320ms cubic-bezier(0.22, 1, 0.36, 1)`
- Do NOT animate `max-height` from 0 to `auto` — it doesn't animate in any browser.

### Tier 1 — controls row (always visible)

- Flex container, `display: flex; justify-content: space-between; align-items: center;`
- Width: 100%, centered via the panel inner container
- Contains three children in order: PRE-SAVE toggle (left), play button (center, absolute-centered so it stays centered regardless of flank widths), SUB knob (right)
- To absolute-center the play button: give the row `position: relative`, make the play button `position: absolute; left: 50%; transform: translateX(-50%);`

#### PRE-SAVE toggle (left of center)

- `<button class="presave-toggle">` (real `<button>` for a11y)
- `background: transparent; border: 0; padding: 8px 12px;` — intentionally flat, embedded into the panel
- Content: text `PRE-SAVE` followed by an upward chevron SVG (10x10, stroke `rgba(114, 221, 249, 0.7)`, 2px stroke-width)
- Text: `Aspekta-450`, 10px, `letter-spacing: 2px`, `text-transform: uppercase`, color `rgba(114, 221, 249, 0.7)`
- Hover: text + chevron brighten to `rgba(114, 221, 249, 1)`
- When `#bottom-panel.expanded`: chevron rotates 180° via `transform: rotate(180deg); transition: transform 280ms ease;` (indicates "tap to close")
- `aria-expanded="false|true"`, `aria-controls="panel-tier-2"`

#### Play button (center, dominant)

- `<button id="play-btn">`
- Size: **56x56px** (up from the existing 48px — emphasizes primacy)
- Keep the existing glassmorphism styling from `src/style.css`
- Preserve the existing `.playing` pulse animation
- Preserve the existing `▶` / `❚❚` symbol swap logic from `src/main.js`
- Glow CTA animation: add a new class `.glow-cta` with a `@keyframes glow-pulse` that animates `box-shadow` between `0 0 12px rgba(114, 221, 249, 0.3)` and `0 0 28px rgba(114, 221, 249, 0.7)` over ~1.6s, infinite
- Glow persistence: on page init, read `localStorage.getItem('tooDeep.glowSeen')`. If absent, add `.glow-cta` to the play button. On first play click, remove the class and write `localStorage.setItem('tooDeep.glowSeen', '1')`. Never re-add in the same session.
- Respect `prefers-reduced-motion: reduce` — disable the glow animation (class can still exist but the `@keyframes` animation should be cut to 0 duration via media query)

#### SUB knob (right of center)

**Replaces the `<input type="range">` entirely.** Remove all existing `#sub-knob` and `#sub-slider` markup and CSS.

- Value range: 0.0 to 2.0, default 1.0 (matches current behavior; the existing `subGain` variable and wiring to the cymatics shader in `src/main.js` stays intact — only the UI is changing)
- Visual: 48x48 outer circle, glassmorphism matching the play button (softer — less border contrast)
- Inside the circle: a pointer line (2px wide, ~16px long, rounded ends, `rgba(114, 221, 249, 0.9)`) rotating from the center. Implement as a child `<div class="knob-pointer">` with `transform-origin: center;` rotated via CSS custom property `--val-deg`.
- Small tick marks at 7 o'clock and 5 o'clock endpoints (dots, 2px, `rgba(114, 221, 249, 0.3)`) to hint at the range
- Label `SUB` directly below the knob — 9px, letter-spacing 2px, uppercase, `rgba(114, 221, 249, 0.5)`

**Angle mapping.** In CSS rotation (0° = pointer up at 12 o'clock, positive = clockwise):
- Value 0.0 → pointer at 7 o'clock → 210°
- Value 2.0 → pointer at 5 o'clock (reached clockwise via 12) → 150°, i.e. 510° (wrap)
- Formula for the CSS variable: `--val-deg: calc(210deg + (var(--val) / 2) * 300deg)`. Total sweep = 300° clockwise.
- Set `--val` to the current value as a number; the pointer's `transform: rotate(var(--val-deg))`.

**Interaction.**
- Pointerdown on the knob captures drag state; pointermove tracks deltaY; pointerup/pointercancel releases.
- **Drag sensitivity**: `valueDelta = -deltaY * 0.01`. Drag up (negative deltaY) increases, drag down decreases. Clamp to [0, 2].
- Apply `touch-action: none` on the knob element so touch drag doesn't scroll the page.
- Call `preventDefault()` on pointerdown to avoid text selection on desktop drag.
- **Scroll wheel** (desktop, nice-to-have): `wheel` event on knob, `valueDelta = -event.deltaY * 0.002`, clamp.
- **Keyboard** (accessibility): ArrowUp / ArrowRight += 0.05, ArrowDown / ArrowLeft -= 0.05, Home = 0, End = 2, PageUp/PageDown ± 0.2.
- Each value change updates the `subGain` variable and the `--val` CSS variable.

**Accessibility.** `role="slider"`, `aria-label="Sub"`, `aria-valuemin="0"`, `aria-valuemax="2"`, `aria-valuenow="{current}"`, `tabindex="0"`. Update `aria-valuenow` on every change.

### Tier 2 — expanded content

Contains two children in order: platform buttons grid, then SWM credit line. Sits ABOVE Tier 1 in DOM order so translateY expansion works correctly.

#### Platform buttons

- Container: flex row, `justify-content: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px;`
- On viewports narrower than ~480px, flex-wrap allows the row to break into 2 lines cleanly
- Each button: `<a>` element, `target="_blank"`, `rel="noopener noreferrer"`, `aria-label="Pre-save on {label}"`
- Pill shape: ~36px height, rounded (`border-radius: 20px`), icon + label inside, ~10px horizontal gap between them
- Pill styling: glassmorphism matching the panel — `background: rgba(10, 40, 80, 0.35); border: 1px solid rgba(114, 221, 249, 0.2); backdrop-filter: blur(8px);`
- Hover: border brightens to `rgba(114, 221, 249, 0.5)`, background `rgba(10, 40, 80, 0.5)`
- Icon: inline SVG brand glyph, 14px, **monochrome** `rgba(114, 221, 249, 0.85)` — do NOT use official brand colors. Simple geometric/logo forms. Source clean SVGs; store inline in the HTML or JS.
- Label: `Aspekta-450`, 11px, letter-spacing 1px, uppercase or title-case, `rgba(114, 221, 249, 0.85)`
- Rendered from the `PLATFORM_LINKS` map via JS or hardcoded in HTML — implementer's choice

#### Small World Media credit

- Below platform buttons, centered
- `<a href="https://smallworld.media" target="_blank" rel="noopener noreferrer">site by small world media</a>`
- Style: `Aspekta-450`, 9px, letter-spacing 1.5px, lowercase, `rgba(114, 221, 249, 0.35)`, no underline by default
- Hover: color brightens to `rgba(114, 221, 249, 0.6)`, underline appears
- `display: block; text-align: center; margin-top: 12px;`

### Dim + blur backdrop

- Element id: `#panel-backdrop`
- `position: fixed; inset: 0; z-index: 25;` (between canvas which is z:0 and panel which is z:30)
- Default state: `opacity: 0; backdrop-filter: blur(0); pointer-events: none; background: transparent;`
- When `#bottom-panel.expanded`: backdrop gets `opacity: 1; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); background: rgba(0, 0, 0, 0.25); pointer-events: auto;`
- Toggle via a sibling class (e.g., `body.panel-open` or just reuse `#bottom-panel.expanded ~ #panel-backdrop`, or set directly via JS when toggling `.expanded`)
- Transition: `opacity 280ms ease, backdrop-filter 280ms ease, background 280ms ease`
- Clicking / tapping the backdrop closes the panel. Because the backdrop only captures pointer events when expanded, the cursor ripple on the canvas continues to work normally while the panel is closed.

---

## Interaction wiring (state machine)

**Panel state.** Single boolean `isPanelOpen`, toggled by:
- Click on `.presave-toggle` → flip
- Click on `#panel-backdrop` → close
- `Escape` key → close (only if currently open)

When `isPanelOpen` becomes true:
- Add `.expanded` to `#bottom-panel`
- Add the activation state to `#panel-backdrop`
- Set `.presave-toggle` `aria-expanded="true"`
- Optionally move focus to the first platform button for keyboard users

When `isPanelOpen` becomes false:
- Remove `.expanded` from `#bottom-panel`
- Remove activation from `#panel-backdrop`
- Set `.presave-toggle` `aria-expanded="false"`
- Return focus to `.presave-toggle`

**Play button.**
- First click: remove `.glow-cta`, write `localStorage.setItem('tooDeep.glowSeen', '1')`
- Every click: existing play/pause toggle logic from `src/main.js` unchanged

**SUB knob.**
- Existing subGain wiring in `src/main.js` (pass to `ppUpdate`) unchanged
- New knob component emits value changes that update the `subGain` variable; no other wiring changes

**Canvas pointer handlers.**
- Keep existing mousemove/touchmove handlers on `window` for cursor ripple
- When backdrop is active, `pointer-events: auto` on the backdrop catches events before they reach the canvas, so ripple pauses while panel is open — this is acceptable and desired

**Share button.**
- Click handler as described in the Share button component

---

## Accessibility summary

- All interactive elements are real `<button>` or `<a>` elements (except the knob, which is a `role="slider"` div with keyboard handlers)
- `aria-expanded`, `aria-controls`, `aria-label`, `aria-valuemin/max/now` per component specs
- Tab order: share button → PRE-SAVE toggle → play button → SUB knob → (when expanded) platform buttons in order → SWM credit link
- Escape key closes expanded panel and returns focus to PRE-SAVE toggle
- Focus-visible outline preserved (add a clear `:focus-visible` style if the default is overridden)
- `prefers-reduced-motion: reduce` disables the play button glow pulse and shortens panel slide to 120ms

---

## Files to modify

- `index.html` — restructure `<body>`: remove standalone `#play-btn` and `#sub-knob`; add top-left countdown block, top-right share button, `#panel-backdrop`, `#bottom-panel` with Tier 2 then Tier 1
- `src/style.css` — remove existing `#play-btn` fixed positioning and `#sub-knob`/`#sub-slider` styles; add all styles for the new components per spec. Keep the base reset and canvas styles.
- `src/main.js` — add `PLATFORM_LINKS` constant; countdown updater; share handler (with clipboard fallback + toast); panel open/close state + keyboard handler; knob component class (drag/wheel/keyboard handlers, value→rotation mapping, subGain write-through); glow-CTA localStorage logic

Do not modify any other file.

---

## Acceptance criteria

- Top-left shows `MAY 1, 2026` label and a live-updating countdown; ticking every second; switches from `{d}d {h}h {m}m` to `HH:MM:SS` at the 24-hour boundary; displays `OUT NOW` after May 1 local midnight
- Top-right share button opens native share sheet on mobile browsers that support it; on desktop it copies the page URL to clipboard and shows a `Copied` toast for 2 seconds
- Bottom panel shows Tier 1 only by default; tapping PRE-SAVE expands the panel upward to reveal Tier 2; chevron rotates 180° when expanded
- While expanded, the background dims and softly blurs; cursor ripple does not fire through the backdrop while open
- Panel visibly extends off the bottom of the viewport — no hard bottom edge to the panel
- Play button is centered in Tier 1 regardless of the PRE-SAVE text width or SUB knob size
- SUB knob pointer at value 0 points to 7 o'clock; at value 2 points to 5 o'clock; drag-up increases, drag-down decreases; the rotation sweeps clockwise through 12 o'clock
- SUB knob value correctly updates the existing `subGain` variable and the cymatics shader continues to respond to it exactly as before
- All 7 platform buttons open their respective `/{platform}` FFM URL in a new tab
- SWM credit line links to `https://smallworld.media` in a new tab
- Panel close interactions all work: tap PRE-SAVE again, tap the dim backdrop, press Escape
- On mobile viewports under 480px wide, all controls remain tappable and the platform buttons wrap to 2 rows cleanly
- First-ever visit: play button shows the cyan glow-pulse animation. Once play is clicked, glow disappears permanently (verified by reloading — glow does not return)
- iOS: safe-area insets respected at top and bottom (no overlap with notch, no overlap with home indicator)
- Keyboard navigation: Tab reaches every control in the order specified; Escape closes the panel; arrow keys adjust the SUB knob
- `prefers-reduced-motion: reduce` quiets the glow pulse and shortens panel transitions
- No regressions to the cymatics visuals, audio playback, cursor ripple, caustics, bloom, fog, or text layers

---

## Out of scope

- Any change to the cymatics shader or audio engine
- Pre-bake script changes
- Email capture
- Analytics integration (tracking of button clicks)
- Backend / server-side changes
- Changes to scene geometry, shaders other than via uniforms, or texture assets
