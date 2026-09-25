# Greenfields Instant Lawns · website

A premium, conversion-focused one-page site for Greenfields Instant Lawns (instant lawn installation and landscaping, South Africa).
Vite + vanilla JS, no framework. Fonts (Fraunces and Inter) are bundled locally.

```bash
npm install
npm run media:fetch   # optional: self-host the images as WebP (see Images)
npm run dev           # http://localhost:5173
npm run build         # static site in dist/ (relative paths, host anywhere)
```

## Before launch: fill in the confirmed business details

Nothing unconfirmed has been invented. Every business fact lives in **`src/data/site.json`**, and anything
set to `null` shows a neutral fallback or a visible *"to be added"* placeholder instead of a made-up value.

| Key | What it controls | While `null` |
| --- | --- | --- |
| `business.phone` / `phoneDisplay` | Call buttons (`tel:` links), header, footer | Buttons scroll to the quote form; footer shows a placeholder |
| `business.whatsapp` | Floating WhatsApp button, WhatsApp CTA, form delivery | Buttons scroll to the quote form |
| `business.email` | Footer link, form delivery fallback | Footer placeholder |
| `business.serviceAreaSummary` | Service-area text, map card, footer | Neutral text plus placeholder |
| `serviceAreas` | Suburb chips in the service-area section, e.g. `["Suburb A", "Suburb B"]` | One placeholder chip |
| `social.*` | Footer social icons (only the ones that are set are shown) | Placeholder note |
| `about` | Intro paragraph under "Why Homeowners Choose Greenfields" | Neutral description, no history or claims |
| `services[].enabled` | Show or hide each service. **Set `false` for anything Greenfields doesn't offer.** | All six are shown |
| `rating` | Verified rating: `score`, `count`, `source`, `url` | Placeholder box |
| `testimonials` | Genuine reviews only: `{ "name", "text", "location", "rating", "source" }` | Two placeholder cards |
| `quote.endpoint` | URL that receives quote requests as JSON (POST) | See below |
| `imagesAreIllustrative` | Shows the "illustrative imagery" notes under the slider and gallery | Set `false` once real photos are in |

**Quote form delivery:** it POSTs to `quote.endpoint` when that's set (Formspree, Basin, your own API and so on).
Without an endpoint it opens WhatsApp with the request pre-filled, or failing that the visitor's email app.
With none of the three configured, it says requests aren't connected yet.

Phone numbers can be written locally (`082 123 4567`). WhatsApp links convert them to `27…` automatically.

## Images

All photography is **AI-generated illustrative imagery** (Higgsfield, GPT Image 2.5): South African gardens,
instant lawn being laid, ground preparation, and a matched before/after pair. It is **not Greenfields' work**,
so replace it with real project photos before launch, especially the gallery and before/after slider.

- `src/data/media.json` maps each image key (`hero`, `before`, `after`, `laying`, `prep`, `garden`, `bed`,
  `patio`, `front`, `grass`, `edging`) to a URL, dimensions and alt text. To use your own photos, point `url` at them
  (or put a file in `public/` and use a relative path) and update `w`/`h`/`alt`.
- For the before/after slider, shoot both photos **from the same spot at the same angle**.
- `npm run media:fetch` downloads every image and writes 2000px and 900px WebP versions into `public/media/`.
  The site then serves those, with `srcset`, in place of the heavier hosted PNGs. Run it in your build or deploy step.

## Sections

Hero (with an animated mini before/after card) → Services (bento grid, "Ask about this" preselects the service in the
form) → About / Why choose → Before & After (drag or keyboard slider) → Our Work (masonry + lightbox) → Process →
Reviews → Service area (map-style graphic) → Quote (form + WhatsApp/call) → Footer. There's a sticky header and a floating
WhatsApp button.

Motion: scroll reveals, clip-path image reveals, hero parallax and line-by-line headline, hover states.
Everything is disabled under `prefers-reduced-motion`.
