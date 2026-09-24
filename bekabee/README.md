# Bekabee: website redesign

A single-page, scroll-driven site for Bekabee (recycling, waste management, waste removal, rubble removal and skip hire across Gauteng).
Vite + vanilla JS, GSAP ScrollTrigger and Lenis. Everything is static, so it can be hosted anywhere.

```bash
cd bekabee
npm install
npm run dev       # http://localhost:5174
npm run build     # static site in dist/ (relative paths)
npm run preview   # serve dist/ on http://localhost:4174
```

## The idea

**Mess → system → sort → recover → clean.** The page shows that process instead of photos of rubbish piles:

| Section | What moves |
| --- | --- |
| Hero (pinned) | A pile of mixed waste particles sorts into five material lanes, packs neatly into five bays, leaves for recycling and ends with clean, ticked bays: MESS → SORTED → ORGANISED → RECYCLED → CLEAN. |
| On-site recycling centre (pinned) | The centre appears first as a blueprint, then is built phase by phase: foundation, structure, sorting bays, landscaping, staff. |
| How it works (pinned) | One mixed stream flows from your site through the facility and splits into coloured material streams at sorting, then goes to removal and recovery. It runs vertically on phones. |
| Skip hire (pinned) | A skip-loader delivers the skip and swings it down behind the truck. The skip fills, then the truck collects it and drives off for disposal. |
| Why Bekabee (pinned) | FAST. RELIABLE. RESPONSIVE. COST-CONSCIOUS. fill the screen one at a time, over a growing yellow disc. |
| Symbiosis | Sunlit water (canvas) behind a crocodile with its jaws open and a plover at work on its teeth. |
| Where does it go? | Tap an item and it arcs into its stream (paper, plastic, glass, metal, general, skip). Works with touch and keyboard. |

Also included: a custom cursor (green dot with a yellow ring; **GO →** on CTAs, **EXPLORE** on services), a full-screen mobile menu, a sticky mobile bar (Get a quote / Call), word-by-word headline reveals and price count-ups.
`prefers-reduced-motion` (or `?reduced` in the URL) turns off smooth scroll, pinning and scrubbing and shows every scene in a finished, static state.

## Where the facts come from

The live site (bekabee.co.za) was **not reachable from the build environment**: the network policy blocked it, the press releases and the Wayback Machine. The content therefore comes from search-engine extracts of Bekabee's own pages and press releases, and the brief:

- Home, `/about`: the two service models, "Bragging rights earned!", "We impress with no mess", the four pillars (operationally / financially / ethically / aesthetically) and the name story (the bird that cleans crocodiles' teeth).
- `/recycling-solutions` and its basic / core / premium pages: the turnkey model, the full-time on-site staff, "a full analysis of historical waste records", a once-off infrastructure fee plus a flat, fixed monthly fee, three levels that differ in capacity and design complexity, the materials (plastic, glass, metal, paper), and the sectors (schools, hospitals, companies, construction sites, offices).
- `/pricing`: General (compactable) skip R650 rental; Rubble (non-compactable) skip R650 rental and R2,500 per load; 4-ton flatbed R950 per load; management R1,000/month; staff R4,999/month. All marked "*terms and conditions apply".
- `/skip-hire-near-me`, `/rubble-removal-near-me`, `/waste-removal-near-me`: Johannesburg and Pretoria skip hire, the waste types, and rocks, wood, concrete, soil, bricks and mortar.
- `/contact`: 0861-BEKABEE (235 2233), 072 395 5610, info@bekabee.co.za.
- `/showcase/st-peters-college`: a full recycling system for all waste at the school, a Bekabee employee on campus full-time, and attention to detail in design, construction and landscaping.

No statistics, tonnages, certifications or environmental-impact numbers appear anywhere on the page.

## Before launch: please confirm

1. **Logo.** `public/logo.svg`, `favicon.svg` and the `#bird` symbol in `index.html` are a placeholder wordmark with a bird mark in brand colours. Swap in the real logo files.
2. **Photography.** The brief asks for real Bekabee photos (recycling stations, trucks, skips, staff), but they couldn't be downloaded here, and I didn't fake "Bekabee" photos with AI. The scenes are illustrated instead. Good places for real photos: beside the showcase case study, behind the "Your waste area should look this good" section, and in the rubble section.
3. **Client list.** Only St Peter's College / Prep could be checked independently (Bekabee's showcase page). The other names in the marquee come from the brief's list of logos on the current site: Kingsmead College, Yeshiva College, Sacred Hearts, Pridwin, St Andrew's, King David and Dainfern College. Check each name and spelling (the brief says "Sacred Hearts"), and swap the text wordmarks for approved logo files.
4. **Recycling setup fees.** Sources disagree on which level costs R149,999 (core or premium), so no setup fees are shown. Only the three levels and the fee structure appear. The one-line descriptions of Basic and Premium are paraphrased from "capacity and complexity of design".
5. **Showcase location.** "Sunninghill, Johannesburg" is St Peter's College's campus. Confirm it, and add real before/after photos.
6. **Prices** are shown with the pricing page's terms caveat and a "Contact Bekabee to confirm current pricing and terms" link. Update them in `index.html` (search `data-count`) and in the JSON-LD offers.
7. **WhatsApp and social links** were left out because none could be verified. The sticky mobile bar offers Get a quote and Call (0861 number). To add WhatsApp, put a `https://wa.me/27…` button in `.mbar`.
8. **Quote form.** It validates, then opens a pre-filled email to info@bekabee.co.za. For direct delivery, add `data-endpoint="https://…"` to the `<form>` (for example Formspree or a serverless function); it POSTs JSON and falls back to email if that fails. Links with `data-service` (Hire a skip, Book rubble removal and so on) pre-select the service in the form.
9. **Sorting game.** The item-to-stream choices (for example chip packet → general) are illustrative, and the page says so.

## SEO

Title and description as briefed, a canonical URL, Open Graph and Twitter tags, `og-image.png` (1200×630), JSON-LD `LocalBusiness` plus four `Service` nodes with offers, `robots.txt`, `sitemap.xml`, a single H1 with H2/H3 per section, and descriptive titles on the illustrations.

## Files

```
index.html            all copy, semantic sections, JSON-LD
src/styles.css        tokens (green #15803D / bright #48B84A / yellow #F2C230 / charcoal #101313 / off-white #F5F4EE), layout, motion states
src/main.js           Lenis + ScrollTrigger, nav, menu, reveals, counters, marquee, anchor + service preselect
src/js/hero.js        particle hero (MESS → CLEAN)
src/js/how.js         stream-splitting process canvas
src/js/scenes.js      recycling centre build, skip truck, Why words, rubble texture
src/js/symbiosis.js   water canvas + crocodile/bird animation
src/js/sorter.js      "Where does it go?" game
src/js/form.js        quote form (mailto fallback / optional endpoint)
src/js/cursor.js      custom cursor
public/               logo, favicon, og-image, robots.txt, sitemap.xml
```
