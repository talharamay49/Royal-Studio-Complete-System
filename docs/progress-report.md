# Royal Studio — Progress Report vs. Original Analysis

**Original analysis:** [branding-seo-marketing-guide.md](./branding-seo-marketing-guide.md), July 2026
**This report:** what's changed since, what's still open, and an updated roadmap.

---

## 1. Headline change

The original analysis's core finding was blunt: **the entire visual portfolio was placeholder content** — stock Unsplash photos, a stock Pexels hero video, and four "wedding films" all pointing to the same placeholder YouTube ID. That finding is now resolved. Every photo, video, testimonial, and map pin on the site is real and independently verified — sourced from Royal Studio's own Instagram, YouTube, and Google Business Profile, not invented.

That's the biggest shift: this went from a well-built template with fabricated proof-of-work to a site that's actually telling the truth about the business behind it.

---

## 2. Item-by-item: what the original guide flagged vs. where it stands now

### Visual content (§1, §5.2.6 of original guide)

| Item | Original finding | Current status |
|---|---|---|
| Portfolio gallery | 18 Unsplash stock photos | ✅ **10 real photos** from Instagram, covering Barat, Bridal, Mehndi, Fashion |
| Homepage hero | Stock Pexels video | ✅ Real YouTube video embedded as background (Barat ceremony, Grand Vista) |
| Wedding films page | 4 entries, all the same placeholder YouTube ID | ✅ **6 real, verified videos** across Barat, Mehndi, Walima, Nikah, Mayoun |
| About page / founders | Stock "team at work" photo, initials-only founder avatars | ✅ Real founder headshots, real co-founders photo, real branded team photo |
| Shared page banner (`PageHeader`) | Stock Unsplash image on every inner page (not flagged in original guide — found in later audit) | ✅ Real photo |
| Blog images | 4 Unsplash stock photos | ✅ Real photos, thematically matched per post |
| Testimonials | 4 fully fictional couples ("Amara & Hassan," etc.) | ✅ **8 real, verified Google reviews**, labeled "Verified Google Review" |
| Contact page map | Placeholder/approximate coordinates | ✅ Real geocoded embed matching the actual Google Business Profile pin |

### Technical SEO (§5.2 of original guide)

| Item | Original finding | Current status |
|---|---|---|
| Favicon | Missing entirely | ✅ Added (`app/icon.png`, `app/apple-icon.png`) |
| Alt text | Generic ("Royal Studio team at work") | ✅ Descriptive and specific across portfolio/team/blog images |
| Blog post OG images | Same generic image everywhere | ✅ Each post has its own real image |
| Homepage/portfolio/service-page OG images | All fall back to `/logo.png` | ⚠️ **Still open** — only blog posts have unique OG images; other pages still share the one logo image |
| Meta keywords | Stop at "Burewala," no per-city coverage | ⚠️ **Still open** — `seoKeywords` and `layout.tsx` keywords unchanged; Vehari/Multan/Sahiwal/Faisalabad still not targeted |
| Analytics / Search Console | None installed | ⚠️ **Still open** — no GA/GTM/Search Console code found in the codebase |
| Stock images hurting image SEO | All portfolio/blog images were stock | ✅ Resolved — no `images.unsplash.com` references remain anywhere in the codebase |

### Local SEO / Google Business Profile (§5.4 of original guide)

This is where the original guide's recommendation turned out to already be partly true, which is a good sign: the original guide assumed the GBP still needed to be claimed and built up. Pulling the real listing this session showed it's **already active, claimed, and performing well**:

- **4.9★ average rating across 74 reviews** — now surfaced on the homepage testimonials section as a real trust badge, where before there was no rating shown at all.
- The owner is **already replying to every review individually** — the habit the original guide recommended building ("request reviews, respond promptly") is already in practice.
- NAP (name/address/phone) on the site matches the GBP listing exactly — confirmed, no drift.

Still open (these require the business owner's direct access to the GBP dashboard, not something editable from the codebase):
- Uploading more photos directly to the GBP listing (guide recommended 20+)
- Q&A seeding on the listing
- Listing on Shadiyana.pk and comparable marketplaces

### Marketing (§6 of original guide)

| Item | Status |
|---|---|
| TikTok | Guide flagged it as "currently unused." The account link (`@royalstudio089`) is now wired into the footer, social schema, and JSON-LD `sameAs` — but actually *posting* content there is still an owner action. |
| YouTube wedding films page | Guide called this "needs real content" — ✅ now has 6 real videos, so it's a genuine conversion asset instead of an empty shell. |
| Paid social | Guide gated this on "only after the portfolio being advertised is real" — that condition is **now met**, so paid social is more viable sooner than the original timeline assumed. |
| Instagram/referral strategy | Unchanged — these are ongoing content/relationship activities, not something a code session resolves. |

### Brand architecture (§2.4 of original guide)

Not touched. The guide's recommendation to de-emphasize Fashion/Corporate/Product relative to weddings in the navigation hierarchy hasn't been implemented — `homeServices` and `detailedServices` still present all service lines as co-equal. Still an open recommendation if you want it.

---

## 3. New findings this session, beyond the original guide's scope

A few things came up in later audits that weren't in the original analysis at all:

1. **Portfolio categories with zero real photos.** Nikah, Walima, Couple Portraits, and Corporate have no real photos yet (only Barat/Bridal/Mehndi/Fashion do). Rather than a blank grid, these now show a "Stories Are on the Way" empty state with a link back to the full portfolio or contact page — a UX fix, not a content fix. The underlying gap (no real photos in those 4 categories) is still open.
2. **Blog articles were templated filler**, not just stock images — each post's `content` field was a single unfinished sentence, and the detail page padded every post with an identical hardcoded paragraph regardless of topic. All 4 posts now have full, original ~700-word articles.
3. **The contact page's Google Maps embed** used placeholder-looking rounded coordinates rather than the real geocoded pin — found and fixed during the same audit pass.

---

## 4. Updated priority roadmap

Re-scored against what's now done vs. what's genuinely still open:

### Done since the original analysis
- [x] Favicon
- [x] Real portfolio, hero, wedding films, testimonials, blog content, founder photos, map embed
- [x] Alt text rewritten to be descriptive
- [x] Blog post OG images
- [x] Stock imagery fully retired (zero Unsplash references remain)
- [x] TikTok account linked (not yet content-active)

### Still open — now the actual highest-leverage next steps
1. **Analytics + Google Search Console.** Still the single biggest blind spot — there's no way to measure any of this work's impact without it.
2. **Expand meta keywords + city-specific content** (Vehari, Multan, Sahiwal, Faisalabad) — the whitespace opportunity the original guide identified in these less-competitive cities is still sitting unclaimed.
3. **Per-page OG images** beyond blog posts — homepage, portfolio, and service pages still share one generic logo image on social shares.
4. **Fill the 4 empty portfolio categories** (Nikah, Walima, Couple, Corporate) with real photos — the UX no longer dead-ends, but the content gap itself remains.
5. **GBP photo upload + Q&A seeding**, and **Shadiyana.pk listing** — both owner-side actions outside the codebase.
6. **Start posting to TikTok** — the account is linked and discoverable now; it just has no content yet.

### Reconsider given new information
- **Paid social** was originally gated on "wait until the portfolio is real." That condition is now met — if there's appetite, this could reasonably move up from "later" to "next 30 days."
- **Review-request habit** — turns out this is already happening organically (the owner replies to every Google review), so this line item can effectively be marked done rather than pending.
