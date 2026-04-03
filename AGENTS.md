# AGENTS.md — Reflecting Pool

Photography portfolio site with floating parallax galleries, decorative leaves, and underwater aesthetic.

## Stack
- **SvelteKit** (Svelte 5 with runes: `$state`, `$derived`, `$effect`)
- **TypeScript** strict
- **Tailwind CSS 4** (or plain CSS — TBD)
- **Vite**

## Architecture Rules

### The Golden Rule: CSS for Ambient, JS for Interactive
- **CSS animations** handle: float/bob, drift, leaf spin, caustics background
- **JS (rAF)** handles: parallax (mouse/gyro), collision avoidance, ripple physics, blow-away
- **NEVER** apply both CSS animations and JS transforms to the same `transform` property
- Bridge via CSS custom properties: JS writes `--parallax-x`, CSS reads it in `calc()`

### Svelte 5 Reactivity Rules
- Use `$state.raw()` for large mutable buffers (position arrays, wobble maps)
- Trigger re-renders with a single `$state` tick counter, not by reassigning arrays
- NEVER create new objects/arrays inside rAF — pre-allocate and mutate
- NEVER write to `$state` more than once per frame
- Template reads from plain buffers, keyed on tick counter

### Performance Budget
- Max 1 rAF loop for the entire app (in ParallaxProvider)
- CSS animations for anything ambient (float, drift, spin, caustics)
- `will-change: transform` only on `:hover` or `.active`, never default
- Throttle mouse events — only update state when delta > threshold
- No `backdrop-filter` changes on mousemove (too expensive)
- Caustics: video/gif background, not procedural

### Mobile from Day One
- Touch detection via shared context, not prop drilling
- Gyroscope parallax for touch devices
- Fewer particles (leaves, ripples) on mobile
- All touch targets ≥ 44px
- Responsive from the first component, not bolted on

## Component Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── ParallaxProvider.svelte    # Single mouse/gyro tracker, provides context
│   │   ├── WaterSurface.svelte        # Caustics bg video + ripple rings
│   │   ├── ClusterField.svelte        # Index view: wandering photo clusters
│   │   ├── GalleryView.svelte         # Expanded gallery: scattered photos
│   │   ├── PhotoCard.svelte           # Single floating photo (used in both views)
│   │   ├── LeafLayer.svelte           # Decorative floating leaves
│   │   ├── Lightbox.svelte            # Fullscreen image viewer
│   │   ├── StrokeTitle.svelte         # Header title with ripple effect
│   │   └── Navigation.svelte          # Nav links (desktop) + hamburger (mobile)
│   ├── stores/
│   │   └── device.ts                  # Shared device/touch/mobile detection
│   ├── utils/
│   │   └── math.ts                    # lerp, clamp, normalize, easing functions
│   └── types/
│       └── gallery.ts                 # TypeScript interfaces
├── routes/
│   ├── +layout.svelte                 # Global styles, fonts, viewport meta
│   └── +page.svelte                   # Assembles all components
└── static/
    ├── images/                        # Gallery photos + leaf PNGs
    └── caustics.webm                  # Looping caustics video (added later)
```

## Data Flow

```
ParallaxProvider (context)
  ├── smoothX, smoothY (normalized -1 to 1)
  ├── smoothPixelX, smoothPixelY (raw px)
  ├── isTouch, isMobile
  └── addRipple(x, y)

ClusterField reads context for parallax
GalleryView reads context for parallax + surface tension
LeafLayer reads context for parallax
WaterSurface reads context for ripple events
```

## Gallery Data

Cluster positions are **generated dynamically** based on viewport + cluster count.
No hardcoded x/y percentages. Algorithm:
1. Divide viewport into a grid (e.g., 3×2 for 5 clusters)
2. Place clusters at grid centers with random jitter (±15%)
3. Assign depths based on position (further from center = deeper)

Gallery image positions within a cluster: same approach — scatter algorithm, not hardcoded.

## Checks Before Done
```bash
npx svelte-check          # Type errors
pnpm biome check src/     # Lint (if configured)
```

## Git Rules
- Work on branches, never main
- Jesse reviews before merge
- Commit frequently with clear messages
