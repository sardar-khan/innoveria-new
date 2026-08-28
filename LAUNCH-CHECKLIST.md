# Launch Checklist — innovariatech.space

Work through this top to bottom on launch day. The site is fully built but
deliberately hidden from search engines until step 1 is done.

## 1. Flip noindex - DONE (July 2026) → index,follow

Every file below carries `<meta name="robots" content="noindex">` with a
`<!-- TODO: change to index,follow before launch -->` comment above it.
Change the content attribute to `index, follow` in ALL of them:

Root pages:
- [x] index.html
- [x] services.html
- [x] industries.html
- [x] case-studies.html
- [x] about.html
- [x] contact.html
- [x] veyrais.html
- [x] privacy.html
- [x] terms.html

Service pages (/services/):
- [x] ai-automation.html
- [x] ai-chatbot-development.html
- [x] ai-voice-agents.html
- [x] generative-ai-development.html
- [x] ai-consulting.html
- [x] lead-automation.html
- [x] email-automation.html
- [x] workflow-automation.html
- [x] social-automation.html

Industry pages (/industries/):
- [x] real-estate.html
- [x] healthcare.html
- [x] ecommerce.html
- [x] finance.html
- [x] legal.html
- [x] education.html
- [x] manufacturing.html
- [x] logistics.html

Blog (/blog/):
- [x] index.html
- [x] ai-real-estate-lead-generation.html
- [x] ai-automation-medical-clinics.html
- [x] how-real-estate-uses-ai-automation-2026.html
- [x] cost-of-automating-lead-follow-up.html
- [x] best-automation-tools-service-businesses.html

DO NOT FLIP (permanently noindex):
- /lp/free-automation-audit.html (ad landing page)
- /lp/ai-voice-agents.html (ad landing page)
- /admin.html (leads portal)

Quick verification after flipping:
`grep -r "noindex" --include="*.html" .` should return ONLY the two /lp/
pages and admin.html.

## 2. Search engine submission

- [ ] Google Search Console: property already verified
      (google43fa1eb08388b558.html). Submit sitemap.xml, then use URL
      Inspection → Request Indexing on the homepage and both hubs.
- [ ] Bing Webmaster Tools: verify the domain (can import from GSC),
      submit sitemap.xml.

## 3. Assets and integrations

- [ ] Create assets/og-cover.png at exactly 1200x630 (dark navy background,
      logo, one line of text). Every page references it for social shares.
- [x] Calendar link: done. The booking card on contact.html opens
      https://calendly.com/innovariatech/30min with WhatsApp as the
      secondary option.
- [ ] Lead capture: already live (api/lead.js + Upstash + ADMIN_KEY on
      Vercel). Submit a test through the live form and confirm it appears
      at /admin.html.
- [ ] Google Analytics: tag G-JWXS939G3J is on every page. Confirm Realtime
      shows your visit. The form fires a generate_lead event on success;
      mark it as a conversion in GA4 (Admin → Events).

## 4. Content swaps (can happen after launch)

- [ ] Replace the "[Placeholder for real client quote and attribution]"
      lines on case-studies.html with real client quotes as permission
      arrives.
- [ ] Replace anonymized case studies with named ones when clients agree.
- [ ] Photos are hotlinked from Unsplash; optionally self host them in
      /assets/ for full control (download, save, update src attributes).

## 5. Ads (when ready)

- [ ] Point paid traffic at /lp/free-automation-audit.html or
      /lp/ai-voice-agents.html, never at organic pages.
- [ ] The /lp/ pages have no nav and a single CTA by design. Do not add
      site navigation to them.
- [ ] In Google Ads, use the generate_lead GA4 conversion as the bidding
      signal.

## 6. Post launch sanity

- [ ] Hard refresh the live homepage; check the browser tab shows the
      favicon and no console errors.
- [ ] Click every nav item once.
- [ ] Run https://search.google.com/test/rich-results on the homepage, one
      service page, one industry page, and one blog post.
- [ ] Check https://innovariatech.space/llms.txt and /sitemap.xml load.
