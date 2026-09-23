# MGTD Environmental: website redesign

A cinematic, editorial redesign of [mgtdenvironmental.co.za](https://mgtdenvironmental.co.za/) for
MGTD Environmental (Pty) Ltd. Vite + vanilla JS, GSAP ScrollTrigger, Lenis smooth scroll.

```bash
cd mgtd
npm install
npm run media:fetch   # download + web-encode the imagery and hero film (see Media)
npm run dev           # http://localhost:5173
npm run build         # static site in dist/ (relative paths, host anywhere)
```

## Before launch: what MGTD needs to supply

The build environment could not reach mgtdenvironmental.co.za, so copy comes from what search
engines index of the site, plus public records. Anything unverified is wrapped in `[brackets]` in
`src/data/content.json` and shows on the page as a dashed ◇ placeholder, so gaps can't be missed.

| Item | Where | Status |
| --- | --- | --- |
| **Logo file** | `public/brand/mgtd-logo.png` | **Missing.** Drop the original logo here. The site shows it unaltered on a white plate (nav, hero intro, footer). Until then a plain text fallback shows. The logo is never redrawn. |
| Email, phone, street address | `content.json → contact` | Placeholders. Setting `email` also turns on the form's email fallback. |
| Form endpoint | `contact.formEndpoint` | `null`. Any URL that accepts a JSON POST (Formspree, CRM webhook). |
| Full service list | `content.json → services` | 4 services verified from positioning and public record, plus 1 placeholder row. Add each service listed on the current site. |
| Case studies | `content.json → projects` | 1 verified (Cosmo City to Lanseria), 2 placeholder cards. |
| NNR report year and page | `credentials[0].meta` | Listing supplied in the brief. Add the annual-report year and page, or a link. |
| Exact vision and mission wording | `company.vision / mission` | Reconstructed from indexed summaries. Paste the site's exact text. |
| Social links | `contact.social` | Empty. Add only verified profiles: `[{ "label": "LinkedIn", "url": "…" }]`. |
| Photography | `src/data/media.json` | Illustrative (see Media). Replace with MGTD field photography. |

## Sources used

- **mgtdenvironmental.co.za** (as indexed): "high-quality, turnkey, strategic environmental consulting
  services aimed at addressing complex environmental challenges faced by the business community";
  a vision of global services aligned with clients' business goals; solutions that consider other stakeholders.
- **Fourways Review, 7 March 2014**, ["Meetings to discuss infrastructure"](https://www.citizen.co.za/fourways-review/news-headlines/2014/03/07/meetings-to-discuss-infrastructure/):
  proposed bulk water pipelines, sewer pipelines and associated infrastructure from Cosmo City to Lanseria
  (also affecting Lion Park and Farmall); a background information document and draft Basic Assessment Report
  available from MGTD Environmental's offices in Cresta; public meetings on 23 March at Thabo Mbeki Village (09:00)
  and Das Landhaus Guestlodge (11:00); comments due 19 April.
- **National Nuclear Regulator annual report**: MGTD Environmental (Pty) Ltd listed as a Certificate of
  Exemption holder (as stated in the brief; the report couldn't be opened from the build environment).

Nothing else is claimed. There are no staff names, clients, statistics, awards, testimonials, years
in business or partner logos.

### Content decisions

- **Services.** "Strategic environmental consulting" and "turnkey environmental solutions" are the
  company's own descriptors. "Environmental assessment" and "public participation" are evidenced by
  the Cosmo City to Lanseria Basic Assessment.
- **Approach.** No numbered methodology was found in MGTD's public material, so the four words come
  from the four ideas in its positioning: *Address* (complex challenges), *Align* (business goals),
  *Consider* (stakeholders), *Deliver* (turnkey, high-quality). Each step quotes its source phrase.
- **Hero headline.** "Environmental intelligence for complex decisions" is the brief's working line.
  The subline uses MGTD's own wording. Swap in a line from MGTD if preferred (`index.html`, `.hero__title`).
- **Research → decision diagram.** Contour linework is procedural and labelled "Not survey data".

## Brand and palette

Colours are sampled from the logo (tree canopy, "MGTD" letterforms, sky circle, black type) and
defined as tokens at the top of `src/styles.css`:

| Token | Hex | Use |
| --- | --- | --- |
| `--green-700` | `#155a2c` | Primary: buttons, headings, key UI |
| `--green-900` / `--green-950` | `#0c2a18` / `#07231a` | Large brand sections, nav bar, contact |
| `--green-500` | `#1f8f3c` | Secondary: hovers, highlights (the "MGTD" letter green) |
| `--sky-500` / `--sky-300` | `#3f8fd6` / `#9cc8ee` | Accents, links, focus, diagram details |
| `--char-900` | `#111613` | Cinematic sections, footer |
| `--paper` | `#f6f5f0` | Primary light background |

Logo-derived graphics: a canopy-silhouette section divider, circular image masks and orbits from
the sky circle, and small sky-and-canopy "dot" marks. The logo itself appears only in the nav, the
hero intro and the footer.

Type: **Manrope** (variable) for everything, with **Newsreader italic** used sparingly for editorial
emphasis. Both are bundled, with no external font requests.

## Media

Stock-photo sites and MGTD's own imagery were unreachable from the build environment, so the imagery
is **illustrative**, generated with Higgsfield (Cinema Studio 2.5 stills; Seedance 2.0 Mini for the
8-second hero drift). The page labels it "Illustrative imagery", and the project card says its image
is not a photograph of the project.

`npm run media:fetch` downloads everything in `src/data/media.json`, then:

- encodes stills to WebP at 800 / 1400 / 2400 px (served as a responsive `srcset`)
- encodes the hero film to VP9 WebM + H.264 MP4 (1280 px, no audio) with a poster
- writes `public/og-image.jpg` (1200×630) from the hero still
- writes `public/media/local.json`, which the build reads to prefer self-hosted files

Without this step the site uses the hosted originals, which are large PNGs, so always run it for production.
The `MGTD site build` GitHub Action does this and uploads the finished `dist/` as an artifact.

To use real photography, keep the keys in `media.json`, point `remote` at the new files (or drop
pre-encoded files in `public/media/img` and list them in `local.json`), and update the `alt` text.

## How the page moves

| Section | Behaviour |
| --- | --- |
| Hero | Landscape film slowly settles (scale 1.12 → 1). The logo fades up on a white plate, then the headline rises line by line. Scroll-out parallax. The logo intro plays once per session. |
| Nav | Transparent over the hero, sliding into a solid deep-green bar past 60% of the viewport. Active section underline. Full-screen circular-reveal menu under 1100 px. |
| 01 Who we are | Word-masked heading, staggered reveals, circular wetland image with parallax. |
| 02 Services | Sticky heading and a circular image preview that re-masks per service. The list opens on hover (desktop) or tap (accordion), other titles dim, and each item links to the form with the enquiry preselected. |
| Environment + Development | Pinned. A rounded frame opens to full bleed as the image de-zooms and the statement builds. |
| 03 Experience | Pinned horizontal gallery with a progress rule on desktop; stacked cards on mobile. |
| 04 Approach | Pinned. One word per viewport, blur-to-sharp crossfades over drifting grassland. |
| 05 Research → decision | Connector line draws on scroll, nodes light up, masked image reveals, orbiting diagram. |
| Contact / footer | Parallax dusk background, validated form. |

Cursor ring and magnetic buttons on fine pointers only. `prefers-reduced-motion` (or `?reduced` in
the URL) turns off smooth scroll, pinning and the intro, and shows every section statically. The hero
video pauses off-screen and doesn't autoplay on save-data connections. Below-fold images lazy-load.

## SEO

Title, description, canonical, Open Graph and Twitter tags, `ProfessionalService` JSON-LD (verified
fields only), one `h1` with a sectioned `h2` / `h3` outline, alt text on content images (decorative
ones are `alt=""`), `robots.txt` and `sitemap.xml` in `public/`. All sections are rendered to static
HTML at build time from `content.json` (see `src/render.js` and the plugin in `vite.config.js`), so
crawlers get the full page without JavaScript.
