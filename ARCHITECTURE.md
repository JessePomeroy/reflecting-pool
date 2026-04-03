# Architecture — Reflecting Pool

## Overview

A photography portfolio where images float at different depths, gently drifting like objects on still water. Clusters of photos wander the page, decorative leaves drift overhead, and subtle underwater caustics ripple across the background. Everything responds to the viewer's presence through parallax.

## Design Principles

1. **Separation of animation concerns** — CSS for ambient motion, JS for interactive responses
2. **Single source of truth for input** — one ParallaxProvider owns all mouse/gyro/touch state
3. **No shared rAF loops** — each component that needs per-frame updates gets its own, but most don't (CSS handles it)
4. **Generate, don't hardcode** — positions computed from viewport dimensions, not static percentages
5. **Mobile-first interaction model** — touch/gyroscope is the baseline, mouse is the enhancement

## Component Deep Dive

### ParallaxProvider.svelte
**Purpose:** Single mouse/gyroscope tracker that provides smoothed values to all children via Svelte context.

**Owns:**
- One rAF loop for lerp smoothing of raw input → smooth output
- Raw mouse position (updated on mousemove)
- Raw gyro orientation (updated on deviceorientation)
- Touch vs mouse detection
- Mobile/low-end device detection
- Ripple event bus (children call `addRipple(x, y)`)

**Provides via context:**
```ts
interface ParallaxContext {
  // Smoothed normalized mouse position (-1 to 1)
  readonly smoothX: number;
  readonly smoothY: number;
  // Smoothed pixel position
  readonly smoothPixelX: number;
  readonly smoothPixelY: number;
  // Device info
  readonly isTouch: boolean;
  readonly isMobile: boolean;
  readonly isLowEnd: boolean;
  // Interaction
  addRipple: (x: number, y: number) => void;
}
```

**Why context, not props:** Avoids drilling smoothX/smoothY through 4+ component layers. Every component that needs parallax just calls `getContext('parallax')`.

### WaterSurface.svelte
**Purpose:** Background layer with caustics video and ripple ring animations.

**Rendering:**
- `<video>` element with looping caustics webm/gif, `mix-blend-mode: soft-light`, low opacity
- Ripple rings: CSS-only expanding circles triggered by click events
- No JS animation — ripples use CSS `@keyframes` with dynamic `--ripple-x` and `--ripple-y` custom properties

**z-index:** 0 (behind everything)

### ClusterField.svelte
**Purpose:** Index view showing wandering photo clusters.

**Animation model:**
- **Wander:** Each cluster has a position offset computed from `sin(time * freq)` combinations
- **Parallax:** Reads smoothX/smoothY from context, multiplied by cluster depth
- **Collision:** Simple pairwise repulsion, runs only when positions change > 5px
- **Boundary clamping:** Clusters can't leave viewport

**CSS custom properties per cluster:**
```css
.cluster {
  --cx: 0px;  /* JS writes: parallax + wander + collision offset */
  --cy: 0px;
  transform: translate(
    calc(-50% + var(--cx)),
    calc(-50% + var(--cy))
  );
  /* CSS float animation stacks on top without conflicting */
}
```

**Key insight:** JS writes to `--cx`/`--cy` via `element.style.setProperty()`. CSS reads them. No fighting over `transform`.

**Mobile:** Clusters arranged in a flowing layout, reduced wander, no collision (unnecessary when stacked).

### GalleryView.svelte
**Purpose:** Expanded view when a cluster is clicked. Shows individual photos scattered across the viewport.

**Position generation:**
```ts
function generateGalleryPositions(imageCount: number, vw: number, vh: number) {
  // Divide viewport into zones, place images with jitter
  // Ensure no image starts above 30vh (below header)
  // Ensure images don't overlap too much (min distance check)
}
```

**Transition in:** Other clusters dismiss (fly outward + fade), then gallery images reveal with staggered opacity.

**Mobile:** 2-column flowing layout with staggered y-positions.

### PhotoCard.svelte
**Purpose:** Single floating photo, used in both ClusterField and GalleryView.

**CSS animations (ambient, GPU-composited):**
- `float`: gentle vertical bob (3-6s cycle, randomized)
- `drift`: slow horizontal meander (20-40s cycle, randomized)

**JS-driven (via CSS custom properties):**
- Parallax offset from ParallaxProvider context
- Wobble from ripple wavefronts (temporary displacement)
- Proximity brightness (subtle glow when cursor is near)

**Depth effects (CSS):**
- Scale: deeper = slightly smaller
- Filter: deeper = subtle blur
- Opacity: deeper = slightly faded
- z-index: higher depth = on top

### LeafLayer.svelte
**Purpose:** Decorative floating leaves that drift across the page.

**All CSS animation:**
- Spin: `@keyframes leaf-spin` (15-40s, random direction)
- Drift: `@keyframes leaf-drift` (6-14s, random amplitude)
- Direction changes: smooth CSS transition on a correction wrapper, NOT restarting the animation

**JS interaction:**
- Click/tap to blow away: CSS transition (700ms fly + fade), then CSS transition back (2500ms)
- Parallax: reads from context, applied as inline `transform: translate()`

**Hidden during:** gallery view, lightbox open

**Mobile:** 6 leaves instead of 12, larger touch targets

### Lightbox.svelte
**Purpose:** Fullscreen image viewer.

**Features:**
- Arrow key navigation (prev/next)
- Escape to close
- Click overlay to close
- Swipe left/right on touch devices
- Image counter (3 / 7)
- Smooth scale+fade entry animation

### StrokeTitle.svelte
**Purpose:** "margaret helena" header with CSS stroke effect.

**Ripple interaction:** On page click, letters wobble outward from click point and ease back. Uses batched `getBoundingClientRect()` reads (one layout pass, not per-letter).

**Responsive:** `clamp()` font sizing, `nowrap` on mobile with tighter letter-spacing.

### Navigation.svelte
**Purpose:** Nav links on desktop, hamburger menu on mobile.

**Desktop:** Fixed position links (photography · shop · about · book)
**Mobile:** Hamburger icon → fullscreen overlay menu

## z-index Stack

| Layer | z-index | Element |
|---|---|---|
| Caustics video | 0 | WaterSurface |
| Gallery area | 1 | ClusterField / GalleryView |
| Leaves (back) | 3-7 | LeafLayer (40% of leaves) |
| Clusters/photos | 5-8 | ClusterField |
| Leaves (front) | 8-12 | LeafLayer (60% of leaves) |
| Header gradient | 15 | +layout.svelte |
| Header content | 16 | StrokeTitle + Navigation |
| Back button | 50 | GalleryView |
| Lightbox | 100 | Lightbox |
| Hamburger menu | 200 | Navigation (mobile overlay) |

## Responsive Breakpoints

| Breakpoint | Label | Key Changes |
|---|---|---|
| < 768px | Mobile | Hamburger nav, stacked clusters, 6 leaves, gyro parallax, swipe lightbox |
| 768-1023px | Tablet | Intermediate sizing, reduced parallax |
| ≥ 1024px | Desktop | Full experience, mouse parallax, 12 leaves |

## Performance Targets

- **60fps** on mid-range devices (no dropped frames during scroll/mouse)
- **< 3s** first contentful paint
- **< 500KB** total JS bundle
- **< 2MB** total page weight (excluding gallery images)
- Gallery images: lazy loaded, WebP, ~400-500px on long edge
