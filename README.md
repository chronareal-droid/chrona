# L'abri Day Spa · Pretoria: cinematic website

> This repository also contains **[`mgtd/`](mgtd/README.md)**, the MGTD Environmental website redesign.

A scroll-driven, film-like site for L'abri Day Spa (6 Sheila Street, Kilner Park, Pretoria).
Vite + vanilla JS, GSAP ScrollTrigger, Lenis smooth scroll, Leaflet map.

```bash
npm install
npm run media:fetch   # download + web-encode the generated film and stills (recommended, see below)
npm run dev           # http://localhost:5173
npm run build         # static site in dist/ (relative paths, host anywhere)
```

## Editing content and prices

All copy that changes lives in **`src/data/content.json`**: business details, treatments, packages,
the three featured pricing cards, counters, group cards and team.

- `price`: a number shows it (`R1,650`); `null` shows "Price on request". Only prices supplied in the
  brief are filled in (Rolling Sands R600, Half Day R1,650, Full Day R1,800, Just The Two Of Us R2,699,
  Date Night R1,899). **Confirm them against the current menu before launch.**
- `pricingTrio` / `pricingFeatured` choose the three cards in the pricing section and the highlighted one.
- `team[].name`: therapist names weren't available, so cards show disciplines. Add names to show them.
- `business.lat/lng` place the map pin (approximate for Kilner Park; verify). Directions use the street address.
- `business.bookingEndpoint`: set a URL to POST booking requests as JSON. When it's `null`, the form
  opens a pre-filled email to `pretoria@labridayspa.co.za`.

The JSON is a plain data file, so it can be swapped for a headless CMS fetch later without touching the templates.

## Media

Generated with Higgsfield: **Seedance 2.0 Mini** (720p, 16:9, no audio, 8 s) for the five clips
(hero "The Escape", "The Ritual", "The Sanctuary", couples, night), and Cinema Studio 2.5 for the stills.
`src/data/media.json` lists their hosted URLs, and the site uses those until you self-host.

`npm run media:fetch` downloads everything, then:

- encodes the **hero all-intra** (every frame a keyframe) as VP9 WebM + H.264 MP4, so scroll-scrubbing seeks instantly
- encodes loops as WebM (VP9) + MP4 fallback with poster JPGs
- converts stills to WebP (≤1800px)
- writes `public/media/local.json`, which the site reads to prefer `/media/*` automatically

Without this step the hero scrubs the original MP4, which has sparse keyframes and seeks less smoothly.

## How the page moves

| Section | Behaviour |
| --- | --- |
| Hero | Pinned 900vh. Scroll position drives `video.currentTime` (oil → hands → steam → stones → treatment → garden). L'ABRI punches in on load, splits and flies through the camera on scroll. At the end the frame freezes, a liquid charcoal wipe rises, and ESCAPE. UNWIND. RECONNECT. resolve one by one (blur → sharp, masked, scaled). |
| Philosophy | Pinned; six steps alternate image-led and type-led states with clip-path crossfades. |
| The Ritual | Vertical scroll → horizontal track (desktop); native swipe with snap (mobile). |
| Treatments | Category tabs; hover expands the card, reveals and zooms the image (video preview on the first massage cards), slides the price up, shows BOOK →, and dims the other cards. Carousel on mobile. |
| Packages | Oversized drag / swipe cards with a progress meter. |
| Pricing | Three cards; the centre card is scaled with a rotating glow border, and prices count up. |
| Counters, Couples, Night, Groups, Gift, Gallery, Team, Location, Booking | See `src/js/main.js`; each block is commented. |

Micro-interactions: custom cursor (VIEW / BOOK labels), magnetic buttons, split-text reveals, film grain,
vignette, hover image distortion (SVG displacement), scroll-velocity skew, liquid page-transition veil on
long jumps, and a sticky **Book your escape** CTA (a full-width bar on mobile, hidden at the form).

Performance and accessibility: only the hero video preloads; other videos attach near the viewport and
pause off-screen; images lazy-load. `prefers-reduced-motion` (or `?reduced` in the URL) disables smooth
scroll, pinning and scrubbing and shows every section statically.
