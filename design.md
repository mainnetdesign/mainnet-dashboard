# DESIGN.md — Mainnet Design (mainnet.design)

> Design system documentation for AI-assisted development and design consistency.

## Brand Identity

**Name:** Mainnet Design
**Symbol:** ® (registered mark used alongside "Mainnet" wordmark)
**Tagline:** "Softwares Designed to Last."
**Positioning:** Design studio for startup founders, working with YC-backed companies and high-end startups.
**Tone:** Technical, confident, direct. No fluff. The site communicates through structure and contrast, not decoration.

## Design Philosophy

The site follows a **brutalist-tech** aesthetic. Every decision leans into restraint, structure, and raw clarity. The visual language prioritizes information density over visual embellishment.

**Core principles:**

1. **Edge-to-edge layouts** with no outer margins or breathing room on containers. Content fills the viewport.
2. **Square corners everywhere.** Zero border-radius across all components: cards, buttons, images, sections. No rounding, no exceptions.
3. **High-contrast monochrome palette.** The site lives in black and white with minimal grayscale in between.
4. **Dense, grid-locked composition.** Sections stack tightly. Borders and dividers act as structural elements, not decoration.
5. **Typography as hierarchy tool.** Large, bold headings paired with smaller, quieter body text. The contrast between sizes does the heavy lifting.

## Color Palette

```
Background (Primary):    #000000  (pure black)
Background (Secondary):  #0A0A0A  (near-black, used for subtle section differentiation)
Background (Cards):      #111111  (dark gray card surfaces)
Foreground (Primary):    #FFFFFF  (pure white text)
Foreground (Secondary):  #999999  (muted gray for secondary text, labels, timestamps)
Foreground (Tertiary):   #666666  (subdued gray for metadata)
Border:                  #222222  (subtle dark borders between sections)
Border (Active/Hover):   #444444  (lighter border on interaction states)
Accent:                  #FFFFFF  (white is the accent on black, no color accents)
```

**Rule:** No color accents. No blues, greens, or gradients. The palette is strictly achromatic. If emphasis is needed, use weight, size, or spatial contrast instead of color.

## Typography

**Headings:** Sans-serif, bold/black weight. Large scale with tight letter-spacing. All-caps is used sparingly for category labels.

**Body:** Sans-serif, regular weight. Comfortable reading size with generous line-height.

**Labels/Metadata:** Smaller size, uppercase, with wider letter-spacing. Used for timestamps (e.g., "18:24:48"), section categories (e.g., "LANDING PAGE", "WEBSITE"), and navigation items.

**Suggested font stack:**
```css
--font-heading: 'SF Pro Display', 'Helvetica Neue', sans-serif;
--font-body: 'SF Pro Text', 'Helvetica Neue', sans-serif;
--font-mono: 'SF Mono', 'JetBrains Mono', monospace;
```

**Type scale:**
```
Hero heading:        clamp(2.5rem, 5vw, 4.5rem)
Section heading:     clamp(1.25rem, 2.5vw, 1.75rem)
Card title:          1rem / bold
Body text:           0.875rem / regular
Label/metadata:      0.75rem / medium / uppercase / letter-spacing: 0.05em
Timestamp/clock:     0.75rem / monospace
```

## Layout & Spacing

**Grid:** Full-width. No max-width container. Content bleeds to viewport edges.

**Section borders:** Sections are separated by 1px solid borders (`#222222`), not by whitespace. This creates a "walled" or "compartmentalized" feel, like a terminal or dashboard interface.

**Internal padding:**
```
Section padding:     clamp(1.5rem, 3vw, 3rem)
Card padding:        1rem to 1.5rem
Gap between items:   0.5rem to 1rem
```

**Border-radius:** `0` across all elements. No rounded corners anywhere.

```css
--radius: 0;
--radius-sm: 0;
--radius-lg: 0;
--radius-full: 0;
```

## Components

### Navigation
- Fixed/sticky top bar
- "® Mainnet" wordmark on the left
- "View Work" and "Get Started" links on the right
- No background blur or transparency, solid black
- 1px bottom border separating nav from content
- Square, minimal. No hamburger menu animations

### Hero Section
- Full-width, edge-to-edge
- Large heading: "Softwares Designed to Last."
- Live clock element (monospace, real-time) as a design detail
- Scrolling project ticker/marquee listing project names and categories

### Project Cards / Work Listing
- Horizontal scroll or vertical list
- Each item shows: Project Name + Category (e.g., "Solene E-Commerces", "Mino® Websites")
- No thumbnails in the listing, text-only with hover states
- Square image containers when images are used (no rounded corners)

### Service Tags
- Inline tag list: "Web Apps", "Mobile Apps", "Landing Pages", etc.
- No pill shapes. Square or no-border tags
- Subtle border or background differentiation

### Process Steps (How Section)
- Numbered steps: Research, Definition, Building, Delivery
- Card-based layout with 1px borders
- Title + description per card
- No icons, no illustrations. Text does the work.

### Testimonials
- Horizontal carousel with navigation arrows
- Each card: Avatar (small, square) + Name + Company + Quote + Date
- 1px bordered cards on black background
- Arrows are minimal SVG icons, square-cornered

### FAQ / Accordion
- Simple expand/collapse
- Question text as trigger, answer revealed below
- No decorative icons or plus/minus circles
- Border between items

### Footer
- Dense, multi-column link grid
- Categories: Landing Page, Website, Mobile App, Branding, Web App, Dashboard, Social Media, E-Commerce
- Each category lists specific project links
- "® Mainnet" wordmark repeated
- Coordinates displayed: "22°48'49.65" S 43°02'22.61" W"
- Biblical verse as brand signature
- Email: marcus@mainnet.design
- Copyright line

### Buttons / CTAs
- Square corners (border-radius: 0)
- Solid fill or outlined
- White text on black, or inverted (black text on white)
- No shadows, no gradients
- Hover: subtle border color shift or background inversion

```css
.btn-primary {
  background: #FFFFFF;
  color: #000000;
  border: 1px solid #FFFFFF;
  border-radius: 0;
  padding: 0.75rem 1.5rem;
  font-weight: 600;
  text-transform: none;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
}

.btn-primary:hover {
  background: transparent;
  color: #FFFFFF;
}

.btn-secondary {
  background: transparent;
  color: #FFFFFF;
  border: 1px solid #222222;
  border-radius: 0;
  padding: 0.75rem 1.5rem;
}

.btn-secondary:hover {
  border-color: #FFFFFF;
}
```

## Motion & Interaction

- **Restrained.** Animations exist but are functional, not decorative.
- Page transitions: fade or slide, fast (200ms-300ms)
- Hover states: color inversions, border highlights
- Marquee/ticker: continuous horizontal scroll for project names
- Carousel: smooth snap scrolling
- No parallax. No bounce effects. No playful animations.

```css
--transition-fast: 150ms ease;
--transition-base: 200ms ease;
--transition-slow: 300ms ease;
```

## Imagery

- Project screenshots shown full-bleed within their containers
- No rounded image masks
- No decorative overlays or gradients on images
- Founder photo: natural, no heavy filters
- Avatar images in testimonials: small, square

## Responsive Behavior

- Full-width layout maintained at all breakpoints
- Sections reflow to single-column on mobile
- Navigation collapses to compact layout (not a traditional hamburger)
- Font sizes scale via clamp()
- Horizontal scroll sections may become vertical stacks on mobile
- Edge-to-edge principle applies at every viewport size

## CSS Variables Summary

```css
:root {
  /* Colors */
  --color-bg-primary: #000000;
  --color-bg-secondary: #0A0A0A;
  --color-bg-card: #111111;
  --color-text-primary: #FFFFFF;
  --color-text-secondary: #999999;
  --color-text-tertiary: #666666;
  --color-border: #222222;
  --color-border-hover: #444444;
  --color-accent: #FFFFFF;

  /* Typography */
  --font-heading: 'SF Pro Display', 'Helvetica Neue', sans-serif;
  --font-body: 'SF Pro Text', 'Helvetica Neue', sans-serif;
  --font-mono: 'SF Mono', 'JetBrains Mono', monospace;

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 3rem;

  /* Borders */
  --radius: 0;
  --border-width: 1px;
  --border-color: var(--color-border);
  --border: var(--border-width) solid var(--color-border);

  /* Motion */
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}
```

## Anti-Patterns (Do NOT)

1. **Never add border-radius.** Not on buttons, not on cards, not on images, not on avatars.
2. **Never introduce color accents** like blue, green, or purple. Stay monochrome.
3. **Never use gradients** or decorative backgrounds.
4. **Never add drop shadows** or glow effects.
5. **Never use rounded pill-shaped elements** (tags, badges, buttons).
6. **Never add excessive whitespace** between sections. Keep it tight, bordered.
7. **Never use playful or bouncy animations.** Keep motion mechanical and fast.
8. **Never center everything.** Mix left-aligned content with structured grids.
9. **Never use generic stock imagery** or illustrated graphics.
10. **Never break the edge-to-edge principle.** No max-width wrappers with side margins.

## Site Structure

```
mainnet.design/
├── / (Home)
│   ├── Navigation (fixed)
│   ├── Hero + Clock + Marquee
│   ├── What (Services)
│   ├── How (Process Steps)
│   ├── For Who (Target Audience)
│   ├── By Who (Founder Bio)
│   ├── Testimonials (Carousel)
│   ├── FAQ (Accordion)
│   ├── Referral CTA
│   └── Footer (Multi-column links)
├── /works (Portfolio)
│   ├── /works/solene
│   ├── /works/mino
│   ├── /works/embeddables
│   ├── /works/revi
│   ├── /works/warux
│   ├── /works/sailia
│   ├── /works/studio222
│   ├── /works/eternal-creations
│   ├── /works/casinha
│   ├── /works/students-who-sit
│   ├── /works/web3dev
│   ├── /works/velvet
│   ├── /works/orange-financial
│   ├── /works/nerio-coffee
│   ├── /works/lemon-btg
│   ├── /works/crowdfy
│   ├── /works/citadel-security
│   ├── /works/off-white
│   ├── /works/greenpill-commons
│   ├── /works/green-goods
│   ├── /works/gopark
│   ├── /works/bee-company
│   ├── /works/greenpill-brasil
│   └── /works/flora
```

## Content Patterns

**Section headers follow a question format:**
- "What? We are a studio in love with building things..."
- "How? Mainnet simplifies the design process..."
- "For who? Who believe on a better world by design."
- "By who? Who makes us different..."

**Footer signature elements:**
- ® Mainnet wordmark
- Biblical verse (Psalm 23)
- Email contact
- Geographic coordinates (São Gonçalo, RJ, Brazil)
- Copyright with year

---

*This document serves as the single source of truth for maintaining visual consistency across all Mainnet Design pages and components. Any new section, page, or component must follow these rules without exception.*
