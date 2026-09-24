# Supreme Roof Waterproofing Company: website redesign

A premium, mobile-first, single-page site for Supreme Roof Waterproofing Company (Bryanston, Sandton).
Built with Vite and vanilla JS, GSAP ScrollTrigger and Lenis, with Leaflet loaded only when the contact map comes into view.

```bash
cd supreme-roof
npm install
npm run dev       # http://localhost:5175
npm run build     # static site in dist/ (index.html + legal.html)
npm run preview   # http://localhost:4175
```

## Built around customer intent

| Visitor | Path through the page |
| --- | --- |
| **Emergency:** "my roof is leaking" | Hero **Call** → orange **Leaking now?** band → floating "Leak? Call" button (desktop) / Call · WhatsApp · Get quote bar (mobile). "I need an emergency assessment" in the service finder leads with the phone number. |
| **Homeowner:** ageing roof, needs waterproofing | The problem cards (warning sign → what it could mean) → services → roof-type selector → process → assessment explainer → warranty → reviews → assessment form |
| **Commercial / industrial** | Commercial and industrial section → maintenance programmes → projects → **Request a commercial assessment** (pre-selects the form) |

Every "assess my … roof" / "report a leak" link pre-fills the four-step assessment form, which asks what you need, roof type, height access, area and details (with photo upload), then contact details. With no backend it hands the request to **WhatsApp** (quickest, and photos can be attached) or **email**. Add `data-endpoint="https://…"` to the `<form>` to POST it (photos included) to a form service instead.

## Visual system

Charcoal `#0E0F10` / graphite `#17191B` / slate `#23272B` / metal and concrete greys / off-white `#F3F2EE`, with a single accent `--accent: #D9772B`.
Type: Inter Tight (display), Inter (body) and IBM Plex Mono for technical labels.

Imagery is **procedural** (`src/js/textures.js`): concrete roof tiles, slate, torch-on membrane, metal sheeting, ponding, cracks, rust, damp and peeling coatings, drawn in canvas with lighting and grain. The hero is a rain-soaked tiled roof; as you scroll, a protective sheen sweeps across and the rain starts beading off. Nothing claims to be a photo of Supreme's own work.

`prefers-reduced-motion` (or `?reduced`) turns off smooth scroll, parallax, the rain animation and the reveals.

## Sources and what to confirm before launch

The live site was **blocked from the build environment**, so the content comes from search-engine extracts of roofwaterproofingcompany.co.za pages (home, about, services, flat/tiled/slate/metal, emergency, commercial, industrial/factory, maintenance, renovations, area pages, contact) and the brief.

1. **Experience claims conflict.** The site says *established 1997*, *two decades*, *three decades*, *30+ years*, *four decades*, *over a century* and *105 years*. The redesign uses only **"Family-owned · Est. 1997"** and no year counts. The owner should confirm the one figure to use.
2. **Brand colour and logo.** The logo couldn't be retrieved. The copper accent and roofline mark are placeholders. Replace `--accent` in `src/styles.css`, `public/logo.svg`, `public/favicon.svg` and the `#mark` symbol in `index.html`.
3. **24-hour emergency call-out.** This is stated on the site's emergency page, so it's shown in the orange band, the FAQ and the contact hours. Confirm it's still offered, or remove the badge.
4. **5-year workmanship guarantee plus product warranties.** Stated on several pages and shown with "Terms and conditions apply". Add the full terms to `legal.html#terms`.
5. **Reviews.** The three quotes are customer testimonials that appear on the current site, without names. Swap in named, dated reviews (Google or Trustindex) before launch. No star ratings are shown because none could be verified per review.
6. **Projects.** No verifiable project details or photos were available, so the before/after gallery shows **clearly labelled placeholder slots** (procedural before/after textures). Replace them with real photos and details in `src/js/content.js` (`PROJECTS`) and swap the texture keys for image URLs.
7. **Materials list** (torch-on incl. 4mm silver oxide, screed, EPDM, TPO/PVC, liquid membranes, hot-applied, silicone and acrylic coatings) comes from the site's waterproofing content. Confirm which systems the team actually installs.
8. **Service areas:** Sandton, Bryanston, Randburg, Rivonia, Fourways, Northcliff, Johannesburg, Johannesburg North (the site has area pages for these) "and surrounding Gauteng areas".
9. **WhatsApp** uses 067 817 3343. Confirm that number is on WhatsApp.
10. **Map pin** coordinates (`CONTACT.lat/lng` in `content.js`) are approximate for 25 Plantation Road. Directions use the full street address.
11. **Hours** (Mon–Fri 06:30–18:00, Sat 08:00–14:00, Sun 09:00–12:00) come from a business listing. Confirm them.
12. **Not included** because nothing could be verified: certifications, awards, client logos, statistics, pricing, and the "SABS standards" materials wording (confirm it before adding).
13. **Commercial sectors** are limited to what the site supports (commercial property, offices, industrial and factory facilities). Schools, retail and body corporates were left out.

## SEO

Descriptive title and meta, canonical, Open Graph and Twitter tags with `og-image.png`, JSON-LD `RoofingContractor` (address, hours, areas, offer catalogue of ten services, Facebook `sameAs`) plus `FAQPage` matching the on-page FAQ, `robots.txt` and `sitemap.xml`. One H1, H2 per section, H3 per item. The service copy targets Johannesburg, Sandton and Randburg roof waterproofing and repair terms without keyword stuffing.

This is a single page. For stronger local SEO, the natural next step is separate URLs per service and area (e.g. `/flat-roof-waterproofing/`, `/roof-repairs-sandton/`) built from the same components, keeping the old URLs through redirects.

## Files

```
index.html          all copy, sections, JSON-LD
legal.html          privacy + warranty terms (draft)
src/styles.css      tokens, layout, components, responsive, reduced motion
src/main.js         Lenis, nav/menu, reveals, counters, marquee, lazy Leaflet map
src/js/content.js   roof types, service finder, project slots, areas, contact
src/js/textures.js  procedural roofing materials
src/js/hero.js      rain / protection canvas (hero + final CTA)
src/js/ui.js        roof selector, finder, process, inspection, projects, area map
src/js/form.js      4-step assessment form, photo upload, WhatsApp / email hand-off
public/             logo, favicon, og-image, robots, sitemap
```
