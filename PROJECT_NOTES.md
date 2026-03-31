# The Blockshelf — Project Notes

## Site Overview
- **URL:** https://www.theblockshelf.com
- **Platform:** Shopify (store handle: `vsedsy-0g.myshopify.com`)
- **Theme base:** Harmony v4.0.0 (custom)
- **GitHub:** https://github.com/jonno-BUIDLs/theblockshelf-theme (private)
- **Products:** Bitcoin Minors and Degen Descendants (book), Sats for Hats (hats), Shoetoshi Nakamotoes (shoes)

## Workflow
1. Make theme file changes on work machine → commit → push to GitHub
2. On personal machine: `git pull origin main`
3. Deploy: `shopify theme push --store vsedsy-0g.myshopify.com`
4. Content changes (meta descriptions, alt text, etc.) are done manually in Shopify Admin

---

## Session — 2026-03-31

### Audits Completed
- Full UI/UX audit via code review of all theme files
- Full SEO + GEO audit via live site crawl (7 pages analysed)
- SEO score: 54/100 | GEO score: 42/100

### Theme File Changes

#### Commit 1 — UI/UX improvements
Files: `config/settings_data.json`, `sections/header-group.json`, `sections/footer-group.json`, `snippets/collection-card.liquid`, `templates/index.json`, `templates/product.json`

| Change | Detail |
|--------|--------|
| Announcement bar contrast | Background `#dc3fb1` → `#b52d93`, text `#fafafa` → `#000000` (WCAG AA fix) |
| Header background | `#e7e6e9` → `#000000` (matches site body, fixes nav contrast fail) |
| Footer | Enabled (was fully disabled — no social links, nav, or logo showing) |
| Body line-height | 1.2 → 1.6 (WCAG + readability) |
| Uppercase headings | Enabled (`type_header_capitalize: true`) |
| Search | Enabled (`enable_search: true`) |
| Page width | 1900px → 1440px |
| Newsletter section | Enabled on homepage |
| Help drawer | Replaced 4 placeholder text blocks with real shipping, support, FAQ, and contact copy |
| Collection card alt text | Added `alt: collection_title` to image_tag |

#### Commit 2 — SEO + GEO improvements
Files: `layout/theme.liquid`, `snippets/social-meta-tags.liquid`, `templates/index.json`

| Change | Detail |
|--------|--------|
| Organization schema | Added JSON-LD to `layout/theme.liquid` with name, URL, logo, email, social sameAs |
| WebSite schema | Added JSON-LD with SearchAction for sitelinks search box |
| BreadcrumbList schema | Added conditional JSON-LD for product and collection pages |
| twitter:image | Added `<meta name="twitter:image">` to `social-meta-tags.liquid` |
| Homepage H1 | Fixed — hero heading changed to H2 to avoid multiple H1s |

#### Commits 3–5 — Homepage hero iterations + bug fixes

| Fix | Detail |
|-----|--------|
| Liquid syntax error | `{search_term_string}` in WebSite schema URL template was breaking Liquid parser — fixed using string concatenation (`'{' \| append: 'search_term_string}'`) |
| Shopify section order | Disabled sections must still appear in `order` array — added `empty_space_PgFjxU` and `rich_text_EDyByF` back |
| Homepage hero | Floating product bundle tried as hero — broken (text cropped, mobile invisible). Reverted. |
| Homepage final order | Featured product (book) moved to first position as hero. `padding_top` reduced 104px → 40px. Book is now the first thing visitors see. |

### Homepage Section Order (Final)
1. `featured-product` — Bitcoin Minors book (hero)
2. `collection-list` — The Blockshelf (3 collections)
3. `images_with_text_M8eG6c` — About Us with mascot
4. `newsletter_8XcrGk` — Sign up and save
5. `faq_yDEybi` — FAQs
6. `floating_product_bundle_axKh79` — disabled
7. `empty_space_PgFjxU` — disabled
8. `rich_text_EDyByF` — disabled

---

## Pending — Manual Shopify Admin Actions

### Meta Descriptions (Admin → each product/collection/page → SEO section)

**Homepage** (Admin → Online Store → Preferences):
> Bitcoin-native merch for degens who want quality gear. Crypto hats, Bitcoin shoes, and a crypto kids book that actually slaps. No fast fashion rugs. Ships from Australia.

**Homepage title** (Admin → Online Store → Preferences → Title):
> The Blockshelf | Bitcoin Merch, Crypto Shoes & Kids Books

**Bitcoin Minors and Degen Descendants:**
> The crypto kids book that slaps. Bitcoin Minors and Degen Descendants is a hilarious read for Bitcoin-loving parents. Perfect for baby showers, Father's Day, and bedtime. AUD $29.

**Shoetoshi Nakamotoes:**
> Bitcoin shoes built to last. The Shoetoshi Nakamotoes feature canvas uppers, padded collar, and durable rubber outsoles. Think Bitcoin, not sh*tcoin — get ready to HODL these long-term.

**Hats (use for all hat variants):**
> Crypto headwear for degens who don't do fast fashion. The Block Shelf GM hats are high-quality, long-term HODL gear. Available in snapback and flexfit styles.

**Collection: Sats for Hats:**
> High-quality crypto hats for Bitcoin maxis and degens alike. The Sats for Hats collection features GM snapbacks and flexfit caps built to last. No fast fashion rugs here.

**Collection: Shoetoshi Nakamotoes:**
> Bitcoin shoes for the long-term holder. Shoetoshi Nakamotoes are canvas kicks with breathable lining, padded collar, and durable rubber outsoles. Printed on demand, just for you.

**Collection: Bitcoin Minors and Degen Descendants:**
> The crypto kids book collection. Bitcoin Minors and Degen Descendants — a hilarious read for Bitcoin-loving parents. Available in Australian and US English editions.

### Product Image Alt Text (Admin → Products → [product] → each image)

| Product | Alt Text |
|---------|----------|
| GM Snapback - Pink/Black | GM Snapback hat in pink and black — The Blockshelf |
| O.G. WAGMI Flexfit Cap | WAGMI Flexfit cap in grey — The Blockshelf |
| GM Snapback Hat Grey/Black | GM Snapback hat in grey and black — The Blockshelf |
| GM Coffee Flexfit Cap | GM Coffee Flexfit cap — The Blockshelf |
| Purple GM Flexfit Cap | Purple GM Flexfit cap — The Blockshelf |
| GM Flexfit Cap | GM Flexfit cap — The Blockshelf |
| Shoetoshi Nakamotoes | Shoetoshi Nakamotoes Bitcoin shoes — canvas upper, rubber outsole — The Blockshelf |
| Bitcoin Minors book cover | Bitcoin Minors and Degen Descendants — crypto children's book by The Blockshelf |

### Collection Descriptions (Admin → Collections → Description)

**Sats for Hats:**
> No fast fashion rugs here. The Sats for Hats collection is built for degens who want headwear that HODLs as long as they do. Each cap is printed on demand — minted just for you the moment you order. Available in GM snapback and flexfit styles, because not all heads are created equal. Stack sats. Wear the hat.

**Shoetoshi Nakamotoes:**
> Think Bitcoin, not sh*tcoin. The Shoetoshi Nakamotoes are canvas kicks with a breathable lining, padded collar and tongue, and durable rubber outsoles — the kind of shoes that won't rug you after a few wears. Each pair is mined just for you the moment you place an order. Get ready to HODL these long-term.

**Bitcoin Minors and Degen Descendants:**
> The crypto kids book that actually slaps. Bitcoin Minors and Degen Descendants is a hilarious read for Bitcoin-loving parents tired of stumbling through Dr. Seuss at bedtime. Available in Australian English and US English editions. Perfect for baby showers, Father's Day, or any degen who's been through more cycles than they'd like to admit.

### Other Admin Actions

- [ ] Delete malformed page: Admin → Pages → delete `https-theblockshelf-com-products-bitcoin-minors-and-degen-descendants`
- [ ] Add founder name to About Us section: *"— Jonno Newman, founder of The Blockshelf"*

### Blog Content — Blockheads (Admin → Online Store → Blog Posts)

**Article 1:** `What to Buy a Bitcoin Maxi: The Ultimate Crypto Gift Guide`
- Targets: "crypto gifts", "bitcoin gift ideas", "gift for bitcoin lover"
- Link to each product. Round up your own range + general ideas.

**Article 2:** `Why We Only Do Print-on-Demand (And Why That's Actually a Good Thing)`
- Targets: "bitcoin merch quality", "crypto clothing", "why is crypto merch expensive"
- Explain the decentralised supply chain, quality over quantity ethos.

**Article 3:** `Bitcoin Minors and Degen Descendants: The Story Behind the Book`
- Targets: "crypto children's book", "bitcoin kids book", "blockchain book for kids"
- Founder story, why the book exists, what's in it, who it's for.

---

## Verify After Next Deploy
- Schema: https://search.google.com/test/rich-results
- Page speed: https://pagespeed.web.dev
- Submit sitemap in Google Search Console
