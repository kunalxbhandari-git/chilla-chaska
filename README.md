# Chilla Chaska — website

A single-page brand site for the Chilla Chaska chilla & protein-breakfast kitchen.
Plain HTML/CSS/JS — no build step, no dependencies. Open `index.html` or drop the
folder on any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, Hostinger).

```
index.html                 the whole page
assets/css/styles.css      design tokens + all styling (light & dark themes)
assets/js/main.js          chilla data, animations, menu tabs, theme toggle
pos/                       counter billing app — see pos/README.md
.claude/launch.json        local preview config (python3 -m http.server 4173)
```

## Run it locally

```bash
python3 -m http.server 4173
```

Then open http://localhost:4173 for the site, or http://localhost:4173/pos/ for the POS

## Where the content lives

| What | Where |
|---|---|
| The six chillas in the "Look inside a chilla" section — ingredients, protein, cook time, hotspot copy | `CHILLAS` array near the top of `assets/js/main.js` |
| Full menu and prices | `.menu-row` blocks in `index.html`, under `<section id="menu">` |
| Drinks and prices | `<section id="drinks">` in `index.html` |
| Locations / opening status | `<section id="visit">` |
| FAQs | `<section id="order">` |
| Brand colours, fonts, spacing | the `:root` token block at the top of `assets/css/styles.css` |

Menu prices come from the Noida feasibility report's planned ranges. Confirm them
against final recipe costing before launch.

## Before you go live — fill these in

1. **Phone and email** — `+91 98XXX XXXXX` and `hello@chillachaska.in` in `<section id="contact">` and the footer.
2. **Swiggy / Zomato links** — the four `.channel` anchors in `<section id="order">` point at `#contact`; swap in the real listing URLs once the outlet is live.
3. **WhatsApp ordering** — same block. Use `https://wa.me/91XXXXXXXXXX`.
4. **The enquiry form** — `#leadForm` in `index.html` is not connected to an inbox.
   Point it at Formspree / Google Forms / your own endpoint, or replace the submit
   handler at the bottom of `main.js` with a `wa.me` deep link. Remove the grey
   setup note under the form once it is wired.
5. **Google Maps embed** — add one to the Sector 62 card in `<section id="visit">` once the address is signed.
6. **Photos** — every illustration is hand-drawn SVG, so nothing is broken or missing.
   When the food shoot is done, the hero tawa and the drinks shelf are the two places
   real photography will earn its keep.
7. **Favicon + OG image** — add `favicon.svg` and an `og:image` for WhatsApp/Instagram link previews.

## Notes

- Light and dark themes both ship; the toggle sits in the header and remembers the choice.
- Everything respects `prefers-reduced-motion` — animations switch off for users who ask.
- Fonts: Baloo 2 (display), Karla (body), DM Mono (spec labels), loaded from Google Fonts.
