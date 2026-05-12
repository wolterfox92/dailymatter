# playground-shopify

A playground/fork of Shopify's **Horizon** theme (v3.5.1, Summer Editions 2025, author: Shopify). Standard Online Store 2.0 structure — no build step, no package.json, served as-is by Shopify. Horizon is not Dawn; defaults and patterns differ — verify against this file, the theme source, or the Shopify Dev MCP before assuming.

## Core principles

Reject any change that violates these.

1. **Web-native.** Evergreen browser features directly. Progressive enhancement, no polyfills. No frameworks (React, Vue, Svelte, Alpine, jQuery, Swiper, Slick, GSAP — none).
2. **Lean, fast, reliable.** Default new features to "no" until they've earned their place.
3. **Server-rendered.** HTML, translations, money formatting are Liquid on the server — never reconstructed in JS.
4. **Functional, not pixel-perfect.** Semantic markup + progressive enhancement over per-browser tweaks.

## Layout

- `layout/` — `theme.liquid` (global shell), `password.liquid`. Keep lean.
- `templates/` — JSON templates (preferred) + one Liquid template (`gift_card.liquid`).
- `sections/` — top-level section Liquid files, plus section group JSON (`header-group.json`, `footer-group.json`).
- `blocks/` — theme blocks. Files prefixed with `_` (e.g. `_card.liquid`, `_heading.liquid`) are **private** blocks: composed into parent blocks, not added directly by merchants.
- `snippets/` — reusable Liquid partials rendered via `{% render 'name' %}`.
- `assets/` — JS, CSS, SVG, fonts. Flat directory (Shopify requirement).
- `config/` — `settings_schema.json` (editor schema), `settings_data.json` (merchant values; don't hand-edit).
- `locales/` — 50 locales. `*.json` = storefront strings; `*.schema.json` = editor strings. `en.default.*` is canonical.

Don't invent new top-level folders — Shopify only reads the seven above.

## Upgrade safety (read before editing anything)

Horizon receives regular updates from Shopify. Edits to core files are overwritten on merge.

- **Never edit core files in place** — `layout/theme.liquid`, `sections/main-*.liquid`, or any Horizon-shipped block/section/snippet/asset.
- **Prefer extension points** — new blocks, new sections, metafields, theme settings, app blocks — before modifying existing code.
- **Copy, then modify.** If a core snippet/section must change, copy it with a project prefix (`acme-product-card.liquid`) and reference the copy.
- **Prefix custom files** (`acme-`, `custom-`, store-specific) to avoid collisions with future Horizon files. Leading `_` is the private-block convention, not a custom-file prefix.
- **One small hook in `theme.liquid`** is acceptable for a meta tag or script that can't go through an app embed. Document it.
- **Track unavoidable core edits** in `docs/changes.md` so the next upstream merge is manageable.
- Maintain an `upstream` remote at `https://github.com/Shopify/horizon.git` and merge updates via review, never blind overwrite.

## Theme blocks

Horizon's headline feature — understand them before writing sections or blocks.

- A theme block is a Liquid file in `blocks/` with its own `{% schema %}`.
- Blocks nest up to **8 levels deep**. Prefer many small composable blocks over monolithic ones.
- Sections accept theme blocks via `"blocks": [{ "type": "@theme" }, { "type": "@app" }]` in their schema. **Always accept `@app`** unless there's a concrete reason not to (enables merchant apps). Accept `@theme` to support Sidekick / AI-generated blocks.
- Render children with `{% content_for 'blocks' %}`; wrap layout with the `group` snippet.

Parent-block skeleton:

```liquid
{% capture children %}{% content_for 'blocks' %}{% endcapture %}
{% render 'group', children: children, settings: block.settings, shopify_attributes: block.shopify_attributes %}
{% schema %}
{ "name": "t:names.content", "tag": null,
  "blocks": [{ "type": "@theme" }, { "type": "@app" }, { "type": "_divider" }],
  "settings": [] }
{% endschema %}
```

## Liquid conventions

- **Never invent filters, tags, or objects.** Hallucinated Liquid APIs are the #1 AI failure mode here. If uncertain, check via the `shopify-plugin:shopify-liquid` skill or Shopify Dev MCP — don't guess.
- **Prefer `{% render %}` over `{% include %}`** — `include` is deprecated; `render` has sandboxed scope.
- **LiquidDoc (`{%- doc -%} ... {%- enddoc -%}`) in snippets and blocks** — not in sections (sections are documented via schema).
- **Respect object scope.** Inside a block, use `block.settings.x`; inside a section, `section.settings.x`. `product`, `collection`, `cart`, etc. are context-specific.
- **Check existence before output:** `{% if product.metafields.custom.tagline != blank %}…{% endif %}`.
- **Translations + money formatting are server-side.** `{{ 'key' | t }}`, `{{ amount | money }}`, `{{ date | time_tag }}`. Never reconstruct these in JS.
- **Schema translation keys** (`t:settings.foo`, `t:content.bar`) must be added to `locales/en.default.schema.json` at minimum; other `*.schema.json` locales mirror. `visible_if` drives conditional fields — check existing patterns before adding new visibility logic.
- **Asset references** use `{{ 'file.js' | asset_url }}` / `| stylesheet_tag` / `| script_tag`.

## Schema best practices

- **Rich setting types over raw text:** `image_picker` (not `url`), `color`, `color_scheme`, `product` / `collection` / `blog` pickers, `range` for bounded numbers.
- **Always localise labels** via `t:…` keys — never hardcode English.
- **Accept `@app` blocks** in section schemas.

## Metafields

- Themes **read** metafields, never **write** them (admin/apps are the source of truth).
- Use known static keys: `product.metafields.custom.tagline`. No dynamic key construction.
- Always check `!= blank` before rendering.
- Values capped at 16 KB; truncation is a data issue, not a theme issue.
- Document every namespace/key the theme depends on in `README.md`.

## JavaScript

- `assets/jsconfig.json` enables `checkJs` with `strictNullChecks`, `noImplicitAny`, `noUncheckedIndexedAccess`. Preserve JSDoc type annotations and the `@theme/*` alias (resolves to `assets/*`).
- Global ambient types live in `assets/global.d.ts` (`Shopify`, `Theme`, `Window.Shopify`). Extend this file rather than redeclaring inline.
- **Zero external dependencies.** Reach for native: `<details>`, `popover`, `<dialog>`, `IntersectionObserver`, container queries, CSS scroll-snap.
- **Native web components are the unit of interactivity.** Register with `customElements.define`. Lazy-hydrate below-the-fold components — see `assets/section-hydration.js` for the pattern; don't eagerly `customElements.define` heavy components at module top-level.
- `const` by default, `let` only for genuine reassignment, never `var`. Prefer `for (const x of xs)` over `forEach`. Private methods use `#` private-field syntax.
- **Group by feature.** A `collection.js` containing related classes beats a folder of micro-modules.
- **Cross-component communication via `ThemeEvents`.** Standard events include `variant:selected`, `cart:updated`, `cart:refresh`, `filter:update`, `zoom-media:selected`. Keeps components decoupled.
- **Cart mutations:** optimistic UI update → roll back with a visible error on API failure → dispatch `cart:refresh` / `cart:updated` once confirmed. Never hard-redirect to `/checkout` from JS; use the standard checkout button.
- Defer work via `Theme.utilities.scheduler.schedule` (see `global.d.ts`). Avoid synchronous layout thrash; `assets/morph.js` is the intended DOM-update path.
- View transitions and a render-blocking `<link rel="expect">` on `#MainContent` are set up in `layout/theme.liquid` — be careful reordering the `<head>`.

## CSS

- **Mobile-first + container queries (`@container`)** for component responsiveness. Prefer container queries over media queries for component-level logic.
- **Design tokens via CSS custom properties.** Global tokens live in `snippets/theme-styles-variables.liquid` on `:root`. Component tokens live on the component root and may reference globals.
- **Never hardcode colours.** Use Shopify color schemes (`color-scheme-1`…) — merchants configure them in the editor; they're exposed as CSS variables. See `snippets/color-schemes.liquid`.
- **Critical CSS is inlined via `{% stylesheet %}` blocks** in sections/blocks — no extra HTTP request. Preserve this pattern. Shared CSS goes in `assets/*.css` and loads via `stylesheet_tag`.
- Specificity ≤ `0 4 0`. No `!important` — fix the selector instead.
- BEM-like (`.product-card__title--featured`) or custom-element tag selectors (`sticky-add-to-cart .bar`). Avoid broad `div` / `section` selectors.
- Dynamic values from schema settings are acceptable as custom properties injected inline (`style="--gap: {{ block.settings.gap }}px"`), but never as full inline `style` rules.
- Animate `transform` and `opacity` only — never layout-triggering props (`width`, `top`, `height`).

## Locales and translations

- Every customer-facing string goes through `| t`. No hardcoded copy in any language.
- `request.locale.iso_code` / `localization.language.iso_code` can return `nl`, `nl-NL`, `en-GB`. Normalise case and match on the language portion first before full match.
- For **multi-market** behaviour, branch on `localization.country.iso_code` or market metafields — not on locale.

## Accessibility — WCAG 2.2 AA

All storefront-facing changes must meet WCAG 2.2 Level AA. The EU Accessibility Act (in force since 2025-06-28) makes this a legal floor for European storefronts.

- **Contrast (1.4.3 / 1.4.11):** text ≥ 4.5:1 (≥ 3:1 for ≥ 18pt or 14pt bold); UI components and graphical objects ≥ 3:1. Verify against every merchant color scheme, not just the default.
- **Keyboard (2.1.1, 2.1.2):** all interactive elements operable via keyboard. Focus traps are permitted only inside modal dialogs and must release on `Esc`. The cart drawer, search drawer, mega menu, and any `<dialog>` in `assets/dialog.js` must trap + restore focus.
- **Focus visible + not obscured (2.4.7, 2.4.11 — new in 2.2):** never suppress focus outlines without a higher-contrast replacement. When the sticky header, cart bubble, or announcement bar is on screen, the focused element must not be fully hidden — use `scroll-margin-top` / `scroll-padding-top` tied to the header-height CSS vars set in `layout/theme.liquid`.
- **Target size (2.5.8 — new in 2.2):** interactive targets ≥ 24×24 CSS px with spacing if smaller. Prefer a stricter **44×44** budget (`--touch-target-size: 44px`) for primary actions — quantity steppers, swatch chips, close buttons, social icons.
- **Dragging alternatives (2.5.7 — new in 2.2):** `assets/comparison-slider.js`, `assets/drag-zoom-wrapper.js`, `assets/slideshow.js` and any drag-driven UI need a non-drag fallback (buttons, arrow keys).
- **Redundant entry + accessible auth (3.3.7, 3.3.8 — new in 2.2):** don't force re-entry of info already provided in the same flow; don't gate auth on cognitive puzzles.
- **Semantic HTML first.** `<button>`, `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>` before `<div role="…">`. ARIA is a last resort.
- **Names/roles/values (4.1.2):** every custom element has an accessible name. Icon-only buttons get an `aria-label` routed through `| t`, never hardcoded English.
- **Landmarks & headings (1.3.1, 2.4.6):** one `<h1>` per page, no skipped levels. Use `<section>`/`<nav>`/`<aside>` with labels.
- **Reduced motion (2.3.3):** respect `prefers-reduced-motion` for slideshow autoplay, marquee, view transitions, `jumbo-text`, `layered-slideshow.js`.
- **Alt text:** always render merchant-provided `image.alt`. Decorative images get `alt=""`; never omit the attribute.

## Performance — Core Web Vitals & PageSpeed

Treat performance as a hard constraint, not a polish pass.

### Budgets

Ship against concrete numbers. Regressions require explicit sign-off.

- **Core Web Vitals (field, p75):** **LCP ≤ 2.5 s**, **INP ≤ 200 ms**, **CLS ≤ 0.1**.
- **Lighthouse (lab, mobile throttling):** Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- **Byte budget above-the-fold (uncompressed):** ≤ 150 KB JS, ≤ 80 KB CSS, ≤ 250 KB images.
- **Target device:** mid-range Android (Moto G Power class) on throttled 3G/slow-4G — not an M-series laptop on fibre.

### Images (biggest lever)

- **Always use `image_url` + `image_tag`** — never `<img src="{{ image.src }}">`. The CDN handles WebP/AVIF and responsive variants.
- **Always set `width` and `height`** (or enforce `aspect-ratio`). Missing dimensions = CLS.
  ```liquid
  {{ image | image_url: width: 1200 | image_tag:
     width: image.width, height: image.height,
     sizes: '(min-width: 750px) 50vw, 100vw',
     widths: '375, 550, 750, 1100, 1500, 2200',
     loading: 'lazy' }}
  ```
- **LCP image (hero / first PDP image / first slide) = `loading="eager"` + `fetchpriority="high"` + `<link rel="preload">`** from `theme.liquid` at the exact width the browser will pick.
- All other images: `loading="lazy"` + `decoding="async"`.
- Accurate `sizes` — a wrong `sizes` makes `widths` pointless.
- Don't rely on the CDN to downscale 4000 px source files; upload at ≤ 2400 px on the long edge.

### Fonts

- Prefer Shopify-hosted fonts (`font_picker` + `font_face` filter) — CDN-served, subsettable.
- `font-display: swap` on every `@font-face`. Never `block` or `auto`.
- Preload **only** the critical weight(s) above the fold — one body + one display is usually enough.
- Subset to `latin` unless the store actually uses `latin-ext`.
- Use `size-adjust` / `ascent-override` / `descent-override` on fallback `@font-face` to eliminate font-swap CLS.
- No third-party font hosts (Google Fonts, Typekit, Adobe).

### JS

- `<script>` tags are `type="module"` or `defer`. No inline blocking scripts beyond the tiny header-height IIFE in `theme.liquid` (keep that in sync with `assets/utilities.js` — there's a comment saying so).
- Break long tasks (> 50 ms) with `requestIdleCallback` / `scheduler.postTask` / `Theme.utilities.scheduler.schedule`.
- Lazy-load below-the-fold custom elements via the `section-hydration.js` pattern.
- **Third-party scripts belong in app embed blocks**, not in Liquid — chat widgets, reviews, analytics, trust badges. Don't hardcode them in `theme.liquid`.

### Layout stability (CLS)

- Every `<img>`, `<video>`, `<iframe>`, `<model-viewer>` has explicit dimensions or `aspect-ratio`.
- Reserve space for banners, cookie bars, review widgets with `min-height`. Don't inject content above existing content after load.
- The inline `setHeaderHeighCustomProperties` IIFE in `theme.liquid` exists specifically to prevent header-driven shift — keep it synced with `assets/utilities.js`.

### Third-party apps (silent killer)

- After images, apps are the #1 perf regression source. Audit every app embed: measure Lighthouse with it off vs on.
- Uninstalled apps leave script tags behind — grep `layout/` and `snippets/scripts.liquid` for orphaned references when a merchant removes an app.
- Push back when an app costs > ~10 Perf points.

### Network

- Preconnect sparingly. Horizon already preconnects `cdn.shopify.com` in `theme.liquid`. Add others only if actually used.
- Avoid redirects — every 301/302 is a round trip. Check for SEO-app redirect chains.

### Measuring

- `mcp__chrome-devtools__lighthouse_audit` and `performance_start_trace` against the dev preview — use these before claiming a perf task done.
- `shopify theme check` catches common perf anti-patterns — run before commit.
- Field data: PageSpeed Insights (CrUX) + Admin → Online Store → Themes → Theme performance.
- Before shipping non-trivial changes: Lighthouse the affected template on clean Horizon vs branch. > 2 perf points regression or any CWV regression blocks the merge.

## Dev workflow

- **Shopify CLI 3.x:** `shopify theme dev`, `shopify theme push --unpublished`, `shopify theme pull`, `shopify theme check`.
- **Never push to a live theme.** Work against an unpublished dev theme; `--unpublished` on push.
- Use `.shopifyignore` to keep files off the remote.
- `config/settings_data.json` is live merchant state — gitignore it unless the team has a deliberate sync strategy.
- Branches: `feature/…`, `fix/…`, `chore/…`. Commits imperative + scoped (`Add sticky add-to-cart to product section`).

## Tooling

- **Editing Liquid, schemas, or theme blocks/sections/snippets → `shopify-plugin:shopify-liquid` skill** (authoritative schema + block/section rules).
- For Admin/Storefront GraphQL, Functions, extensions, etc. → matching `shopify-plugin:*` skill over web search.
- `mcp__shopify-dev-mcp__validate_theme` lints theme changes; `validate_graphql_codeblocks` / `validate_component_codeblocks` validate code snippets before shipping.
- Grep `sections/`, `blocks/`, `snippets/` for existing patterns before inventing new ones — Horizon likely already solves the problem.

## Before editing

1. Read the target file in full — Horizon's inline comments explain non-obvious choices.
2. Look for an existing pattern (variant picker, quick-add, predictive search, etc.) and match it.
3. Ask clarifying questions for schema design, block nesting, and cross-market behaviour — a question is cheaper than a refactor.
4. Never silently change core-file behaviour. If a core edit is unavoidable, flag it and propose the minimum viable change.

## Do not

- Add a JS framework or library (React, Vue, Alpine, jQuery, Swiper, Slick, GSAP).
- Invent Liquid filters, tags, or objects.
- Format currency / dates / translated strings in JavaScript.
- Hardcode colours, fonts, spacing, or customer-facing copy.
- Write to metafields from the theme.
- Use `!important` to win a specificity fight.
- Replace container queries with JS `ResizeObserver` "because it's simpler".
- Push to a live theme or hand-edit `settings_data.json`.
- Add third-party `<script>` tags directly to Liquid — route them through app embeds.

## Repo state

Fresh git repo on branch `master` with no commits yet. `main` is the conventional PR target, but there's nothing to diff against until an initial commit lands.

## How agents perceive a page

Agents do not look at a monitor. They consume a machine-readable representation of the page through three channels, usually combined:

1. **Screenshots** — A vision model interprets the rendered pixels. Useful for layout, grouping, and visual hierarchy (size, color, proximity → importance), but slow and token-expensive. Often used as a fallback when structure is unclear.
2. **Raw HTML / DOM** — The agent reads the nested structure, IDs, classes, attributes, and text content to infer relationships (e.g. a "Buy Now" button inside a product card belongs to *that* product).
3. **Accessibility tree** — A browser-native semantic summary of roles, names, and states. Strips visual noise and exposes pure functional intent. Inspect it via Chrome DevTools → Accessibility panel.

Modern agents cross-reference all three. Our job is to make every channel clean, consistent, and unambiguous.

---

## Coding rules for Claude

When generating, refactoring, or reviewing front-end code in this project, follow these rules. Treat them as defaults; deviate only with a stated reason.

### 1. Use semantic HTML for anything actionable

- Prefer `<button>`, `<a>`, `<input>`, `<select>`, `<label>`, `<nav>`, `<main>`, `<header>`, `<footer>`, `<article>`, `<section>` over generic `<div>` / `<span>`.
- If a non-semantic element *must* be interactive, give it the right ARIA role and keyboard affordance:
  ```html
  <div role="button" tabindex="0" aria-label="Add to cart">…</div>
  ```
- Never invent a "button" out of a `<div>` with only a click handler. Agents reading the DOM will not recognize it as actionable.

### 2. Make every action visible in the interface

- Any action a human or an agent can take must be reflected by a visible, discoverable element. No hidden keyboard shortcuts as the only path. No actions that only appear after a hover on desktop.
- If an action is gated by hover, also expose it via focus and via a visible affordance (caret, kebab menu, etc.).

### 3. Keep layout stable

- Agents using screenshots get confused by shifting layouts. Example to avoid: an **Add to cart** button that lives in a different position per product category.
- Use consistent component placement across pages of the same template.
- Avoid CLS (Cumulative Layout Shift). Reserve space for images, embeds, and async content.
- Be careful with animations that move interactive elements after first paint.

### 4. No ghost elements or invisible overlays over interactive content

- Transparent overlays, full-page modals that don't dismiss cleanly, or `pointer-events` traps will cause visual analysis to discard the underlying nodes — even though they look "visible" to a human.
- If an element is interactive, nothing should sit on top of it unless that overlay is itself the intended action.

### 5. Connect labels to inputs

- Always pair `<label for="id">` with the input's `id`. This gives the agent a direct text-to-action mapping instead of guessing from proximity.
  ```html
  <label for="email">Email address</label>
  <input id="email" name="email" type="email" autocomplete="email" />
  ```
- Wrapping the input inside the label works too, but `for`/`id` is the most explicit.

### 6. Signal interactivity in CSS

- Set `cursor: pointer` on anything clickable. It's a strong actionability signal for visual models.
- Provide visible `:hover`, `:focus`, and `:focus-visible` states. Don't kill outlines without replacing them.

### 7. Respect minimum hit-target size

- Interactive elements required to continue a user journey must have a visible area **larger than 8 square pixels** to avoid being filtered out by visual analysis. (Practical floor for humans is closer to 24×24px or 44×44px on touch — use that as the real target.)

### 8. Give elements meaningful names

- Buttons should have human-readable text or an `aria-label` that describes the action ("Add Nike Pegasus 41 to cart"), not just "Add" or an icon alone.
- Icons-only controls require `aria-label`.
- Avoid duplicate accessible names on different controls within the same view.

### 9. Don't fight the accessibility tree

- Audit the page in Chrome DevTools → Elements → Accessibility. Every interactive node should appear with the correct role, name, and state.
- If something is missing or mislabeled there, fix it at the HTML/ARIA level — not by patching the visual layer.

### 10. Structured data is a bonus, not a substitute

- Add JSON-LD / schema.org markup for product, price, availability, breadcrumbs, FAQs, etc. Agents will use it. But it does **not** excuse broken semantics in the interactive layer.

---

## Review checklist

Before considering any UI task done, Claude should verify:

- [ ] All interactive elements use semantic tags or correct `role` + `tabindex`.
- [ ] Every form input has an associated `<label for="…">`.
- [ ] Buttons and links have descriptive accessible names (text content or `aria-label`).
- [ ] No critical interactive element is hidden behind a transparent overlay or absolutely-positioned ghost element.
- [ ] Layout is stable across page loads in the same template; no surprise shifts after first paint.
- [ ] `cursor: pointer` is set on clickable elements; focus styles are visible.
- [ ] Hit targets are at minimum 24×24px (well above the 8 sq-px floor).
- [ ] Accessibility tree in DevTools matches the visual UI — no missing roles, no misleading names.
- [ ] Structured data, where applicable, is present and validates.

---

## Anti-patterns to refuse or rewrite

If asked to produce any of the following, Claude should push back and offer the agent-friendly alternative:

- A `<div>` with `onClick` and no role/tabindex. → Use `<button>`.
- A "card" that is wrapped in nothing semantic and relies on a JS click handler at the root. → Wrap content in `<a>` or use a button + linked title.
- Modals or drawers that don't trap focus, can't be closed with `Esc`, or leave a transparent overlay over the page.
- Layouts that re-flow late because images, ads, or fonts loaded without reserved space.
- Icon-only controls without `aria-label`.
- Hover-only menus on touch- or agent-driven flows.

---

## Further reading

- web.dev — [Introduction to agents](https://web.dev/articles/ai-agents)
- web.dev — [Build agent-friendly websites](https://web.dev/articles/ai-agent-site-ux) (source for this document)
- web.dev — [The accessibility tree](https://web.dev/articles/the-accessibility-tree)
- Chrome DevTools — [Accessibility tree reference](https://developer.chrome.com/docs/devtools/accessibility/reference#tree)
- Chrome — [WebMCP early preview](https://developer.chrome.com/blog/webmcp-epp), a proposed web standard for site-to-agent interaction.

---

## Guiding principle

> Everything that makes a site agent-ready also makes it better for humans. Treat agent-friendliness as a recommitment to the web's foundational principles: well-structured, accessible, semantic HTML.

## 1. Background — Why these rules exist

- Googlebot processes **only the first 2 MB of an HTML document** for Web Search indexing. Anything beyond that is silently dropped — no warning in Search Console, no error in the URL Inspection Tool.
- The **15 MB limit** still applies to fetching, and the URL Inspection Tool uses the fetching crawler. **Do not trust it** to confirm full indexing.
- **External CSS and JS files each have their own 2 MB budget.** PDFs get 64 MB.
- The limit is measured on **uncompressed** bytes — gzip/Brotli does not help.
- Risk groups (relevant to our stack): e-commerce stores with client-side filtering, **Shopify/Magento with many variants**, SPAs with inline bundles, page-builder sites, Base64-embedded images, infinite-scroll DOM growth.

---

## 2. Hard rules (must pass before staging review)

### 2.1 HTML size budget

| Threshold | Status | Action |
|---|---|---|
| < 500 KB uncompressed | ✅ Safe | Ship |
| 500 KB – 1.5 MB | ⚠️ Watch | Document why, plan reduction |
| 1.5 MB – 2 MB | 🟠 Critical | Block release until reduced |
| > 2 MB | 🔴 Fail | Truncation guaranteed — do not ship |

- Always measure the **uncompressed Resource size** in Chrome DevTools → Network → Doc filter. Never use the "transferred" column.
- Run the check on the **largest realistic page**: PLP with all filters open, longest PDP, longest blog/article, homepage with full content.

### 2.2 Source-code ordering (the "go-bag" principle)

If truncation happens, what's at the top survives. Order every template accordingly:

**Priority 1 — first 100 KB (must-have):**
- `<head>` with meta tags, canonical, hreflang
- **JSON-LD structured data** (move out of `</body>` and into `<head>`)
- `<h1>` and intro copy
- Critical CSS (only if not externalised)

**Priority 2 — first ~1 MB:**
- Main content, all H2/H3 headings
- Most important internal links
- Above-the-fold elements

**Priority 3 — second half (1–2 MB):**
- Related posts, sidebars
- Comments, reviews
- Non-critical UI

**Never inline near the limit:** CSS, JS, Base64 images, page-builder wrapper soup.

### 2.3 Inline code

- **No `<style>` blocks** in templates beyond a small critical-CSS inline (target < 14 KB).
- **No `<script>` blocks with bundle code.** Tracking snippets are allowed; full bundles are not.
- All section/component CSS and JS goes to **external assets** so each file gets its own 2 MB budget.

### 2.4 Structured data (JSON-LD)

- Render JSON-LD **inside `<head>`**, not before `</body>`.
- For Shopify: place JSON-LD in `theme.liquid` `<head>`, or in a snippet rendered from `<head>`. Never let the schema spill into the bottom of `theme.liquid` where it can be cut.
- Special attention for: `Product` schema with many variants, `FAQPage` with many Q&As, `BreadcrumbList`, review aggregations. A truncated JSON-LD block invalidates the **entire** schema, not just the cut part.

### 2.5 Images

- No Base64 / Data-URL images in HTML. Reference external URLs.
- Use **WebP or AVIF** with appropriate fallbacks.
- **Eager load** above-the-fold imagery (`loading="eager"`, `fetchpriority="high"` on the LCP image).
- **Lazy load** everything below the fold (`loading="lazy"`).
- Use Shopify's responsive `image_url` filters with `width:` / `format:` parameters; avoid `img_url` legacy filter.

### 2.6 DOM size

- Target: **< 1500 DOM nodes** per page (Lighthouse threshold).
- Avoid wrapper-in-wrapper markup (`<div><span><span>...`). Use semantic HTML and ask: do I really need this element to render this design?
- Audit page-builder output and Shopify section nesting on every project — flag any section that ships > 200 nodes.

---

## 3. Shopify-specific guidance

- **Storefront filters / collection pages:** if filters are rendered as a JSON blob inline (common in Online Store 2.0 themes for client-side filtering), measure the resulting HTML on a category with many products. Refactor to fetch via Section Rendering API or Storefront API instead of inlining the dataset.
- **Metafields/metaobjects:** rendering large metaobject lists directly into HTML can balloon page weight. Render only what the page needs above the fold; defer the rest.
- **Apps:** audit installed apps for inline `<script>` injections and inline style tags. Common culprits: review apps, upsell apps, consent banners, page builders (PageFly, Shogun, GemPages).
- **Localization (Online Store 2.0):** with multiple languages on one storefront, ensure translated content does not get appended in a way that pushes critical content past the 100 KB / 1 MB priority lines.
- **Theme architecture:** prefer external `assets/` files over inline. `{{ 'theme.css' | asset_url | stylesheet_tag }}` over inline `<style>` blocks.

---

## 4. Mandatory pre-delivery checks

Run all of these before handing off to Onur for review:

1. **Chrome DevTools size check** — Network → Doc → Size column → uncompressed value < 500 KB on every key template.
2. **Tame the Bots fetch & render** ([tamethebots.com/tools/fetch-render](https://tamethebots.com/tools/fetch-render)) — enable "Cap text to 2MB" with **Googlebot Mobile** UA. Confirm full content is visible after the cap.
3. **Mueller test** — copy a unique sentence from the bottom of a long page, search `site:domain.com "exact quote"`. If found → indexed in full.
4. **Top-vs-bottom cross-check** — repeat the Mueller test with a sentence from the top. Top-found + bottom-not-found = truncation.
5. **Response vs Rendered HTML diff** — compare server response (no JS) with rendered DOM. Large gaps signal AI-crawler invisibility (ChatGPT, Perplexity, AI Overviews often don't execute JS).
6. **Screaming Frog crawl** — sort by Size desc; flag any URL > 1 MB for review.
7. **JSON-LD validity** — Rich Results Test on the largest page; confirm schema parses with no truncation errors.

Do **not** rely on the Search Console URL Inspection Tool to confirm full indexing — it uses the 15 MB fetching crawler and will lie to you.

---

## 5. Performance / loading defaults

These pair naturally with the size rules and are part of the ST-63 checklist:

- Above the fold: **eager load**, `fetchpriority="high"` on the LCP image, preload critical fonts.
- Below the fold: **lazy load** images, iframes, embeds.
- Modern image formats: **WebP / AVIF** with `<picture>` fallback when needed.
- Defer non-critical JS (`defer` or `async`).
- Self-host fonts where possible; subset and preload.
