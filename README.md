# Innovaria Tech — Lead Generation Website

Static HTML site for innovariatech.space. No build step, no frameworks: pure HTML,
one shared stylesheet, one small JS file. Hosted on Vercel (deploys automatically
from this repo's master branch). The contact form runs on a Vercel serverless
function with an Upstash Redis store.

## File tree

```
innoveria new/
├── index.html                  Homepage
├── services.html               Services HUB: overviews all 9, links to each
├── services/                   One page per service keyword (9 pages)
├── industries.html             Industries HUB: overviews all 8, links to each
├── industries/                 One page per industry keyword (8 pages)
├── lp/                         Ad landing pages (no nav, single CTA, permanent noindex)
├── case-studies.html           Four anonymized studies + Veyrais internal build
├── veyrais.html                Internal case study: proof of capability, NOT a product page
├── about.html                  Company story + "What we've built" (Veyrais)
├── contact.html                Conversion page: form + calendar + direct lines
├── blog/                       Blog hub + posts
├── admin.html                  Leads portal (password protected, noindex)
├── api/lead.js                 Vercel function: stores + serves form leads
├── css/style.css               The entire design system
├── js/main.js                  Menu, reveals, counters, tilt cards, form submit
├── assets/                     Logo, favicons, Veyrais screenshots
├── sitemap.xml                 All indexable pages (not /lp/, not admin)
├── robots.txt                  Allows crawling, blocks /admin.html and /api/
├── llms.txt                    Site summary for AI crawlers
├── LAUNCH-CHECKLIST.md         Everything to flip/do on launch day
└── README.md
```

## Before going live

Work through LAUNCH-CHECKLIST.md. The short version: flip noindex on every page
except /lp/ and admin.html, submit the sitemap to Google and Bing, create
assets/og-cover.png (1200x630), and paste the Calendly link into contact.html.

## Leads admin portal

The contact form (on contact.html, every service/industry page, and the /lp/
pages) posts to `api/lead.js` and leads appear at `/admin.html` (password =
the ADMIN_KEY environment variable in Vercel). Filter, CSV export, delete,
mailto reply. A hidden honeypot field drops most spam. Successful submissions
fire a `generate_lead` event into Google Analytics (tag G-JWXS939G3J).

Local note: the API only runs on Vercel. On a plain local static server the
form shows an error with the direct email as fallback. Use `npx vercel dev`
to test the API locally.

## How to add a NEW SERVICE page

1. Copy `services/ai-automation.html` (the approved template).
2. Rename: lowercase, hyphens, the keyword (`/services/appointment-automation.html`).
3. Update: title (keyword + benefit + brand, under 60 chars), meta description
   (under 155 chars, keyword + CTA), canonical, OG/Twitter, all four JSON-LD
   blocks (BreadcrumbList third item, Service name/serviceType/description/url,
   FAQPage matching your visible FAQ exactly).
4. Rewrite all 12 sections for the new keyword. Keep the section order:
   hero → problems (3) → solution → outcomes → how it works → why us →
   case study → technology → FAQ → CTA → contact form → related links.
5. Add a card for it on services.html (the hub) and a line in sitemap.xml.
6. Cross link: 2-3 related services + the most relevant industry pages.

## How to add a NEW INDUSTRY page

Same steps using `industries/real-estate.html` as the template, but lead with
THAT INDUSTRY'S pain in its own vocabulary (their tools, their compliance
concerns), and keep the "Other industries:" small link row at the bottom
instead of a big industries section. Add the card to industries.html and the
URL to sitemap.xml.

## SEO checklist for every new page

- [ ] Unique title (under 60 chars) and meta description (under 155 chars)
- [ ] `<link rel="canonical">` with the full https://innovariatech.space/ URL
- [ ] OG + Twitter Card tags
- [ ] Organization + BreadcrumbList JSON-LD; Service schema on service/industry
      pages; FAQPage only if the page shows FAQs (text must match exactly)
- [ ] One H1 containing the primary keyword, logical H2/H3 order
- [ ] Opening paragraph starts with a bolded direct answer sentence
- [ ] Descriptive alt text and explicit width/height on every image
- [ ] `<meta name="robots" content="noindex">` with the launch TODO comment
      (until launch; see LAUNCH-CHECKLIST.md)
- [ ] Google Analytics tag at the top of head (copy from any page)
- [ ] Added to sitemap.xml (never add /lp/ pages)
- [ ] Reachable within 2 clicks of the homepage (hub card or nav)

## How to add a blog post

1. Copy an existing post in /blog/, rename with keywords in the filename.
2. Update title/description/canonical/OG + Article, BreadcrumbList, and
   FAQPage JSON-LD. Author stays Ahsan Ilyas with his LinkedIn URL.
3. Direct answer first paragraph, then H2 sections; link to at least one
   service page and one industry page.
4. Add a card in blog/index.html and a line in sitemap.xml.

## Writing style (strict)

- Active voice, speak to "you"
- No hyphens joining words ("no shows", "follow up"), no em dashes
- Banned: unlock, delve, game-changer, seamless, robust, leverage,
  cutting-edge, revolutionize, elevate, "in today's fast-paced world"
- Sell outcomes, not tools; concrete numbers only, never invented ones
- No fabricated clients, logos, or testimonials; placeholders must say so

## Veyrais policy

Veyrais is our own LinkedIn automation and appears ONLY as proof of
capability: veyrais.html (internal case study), case-studies.html (fifth
study), about.html (What we've built), and the social automation service
page. Never present it as a product for sale: no pricing, no signup CTAs.

## Design system quick reference

Light theme with dark navy anchors (header, page heroes, stats bands, CTA
bands, footer). Colors are CSS variables at the top of css/style.css; the
brand gradient is cyan #06b6d4 to violet #7c3aed. Dark zones remap the
semantic tokens (--heading/--ink/--muted/--accent), so components work on
both surfaces: always use the variables, never hard code colors.

Reusable pieces: .btn-primary, .btn-ghost, .card, .card-3d (leaf shaped 3D
tilt), .photo-card, .split, .frame, .step, .stats, .faq, .cta-band, .reveal
(+ .d1/.d2/.d3 stagger), .marquee, .plan. Animations respect
prefers-reduced-motion automatically.

## Local preview

```
python -m http.server 4180 --directory "E:/finance software/innoveria new"
```

Then open http://localhost:4180 (hard refresh after CSS/JS edits; the
browser caches aggressively).
