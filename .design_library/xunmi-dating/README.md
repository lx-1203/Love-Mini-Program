# 寻觅 Xunmi Design System

A design system reconstruction of **寻觅 (Xunmi)** — a campus-oriented dating & social connection mini-program built around gentle, healing interaction patterns. The system is purpose-built for mobile-first social discovery: profile browsing, match signaling, chat initiation, and interest-based community exploration.

> *"遇见同频的人，从一次聊天开始一段故事"* — 寻觅 brand tagline

## Source

- **Reference material:** 13 product screenshots (AI-visual analysis route)
- **Pages analyzed:** Home feed, profile cards, match notifications, bottom navigation, interest circles, chat entry, search/discover
- **Brand owner:** 寻觅 — 恋爱社交小程序

## What this design system covers

- **Foundations** — dual-brand color system (mint primary `#36C99A` + pink accent `#FF6B81`), 10-stop neutral scale with warm undertones, PingFang SC typography across 8 sizes, 4px-based spacing (4–80px), 6-step radius (8–24px + full), 5-level soft elevation
- **Components** — 6 documented components: Button, Card, Bottom Navigation, Avatar, Chip, Input
- **Preview kit** — Individual HTML preview cards for each component, extracted component CSS, and structured JSON contracts

---

## CONTENT FUNDAMENTALS

### Voice & tone

寻觅 speaks in a register that sits between gentle encouragement and quiet confidence — never pushy, never clinical. The brand voice is warm and slightly poetic, framing connection as something that unfolds naturally rather than something to be engineered. Copy favors second-person implicitness (你) over direct imperatives, and leans on soft verbs like "遇见" (encounter), "开始" (begin), and "看看" (take a look) to lower the stakes of interaction.

Emoji usage is restrained in core product UI but present in onboarding and notification contexts. The formality level is casual-informal — consistent with campus-age demographics — and the language is uniformly Simplified Chinese. Latin characters appear only in brand marks and numeric displays (e.g., match percentage, distance), never as decorative type.

### Concrete copy examples (lifted from the reference corpus)

- **Hero tagline:** *"遇见同频的人"*
- **Sub-tagline / onboarding:** *"从一次聊天开始一段故事"*
- **Section header — discovery:** *"今日推荐"*
- **Match metric label:** *"匹配度"*
- **Verification badge:** *"已认证"*
- **Primary CTA — initiate:** *"打招呼"*
- **Primary CTA — like:** *"喜欢"*
- **Navigation — discovery modes:** *"附近的人" / "兴趣圈" / "校园圈" / "活动"*
- **Notification — inbound interest:** *"有人喜欢你"*
- **Notification — pending reply:** *"正在等待回复"*
- **Secondary CTA — explore:** *"去看看"*
- **Secondary CTA — respond:** *"去回复"*

### When generating copy

- Lead with benefit or feeling, not function. "遇见同频的人" positions the product around resonance, not around swiping.
- Keep CTAs short — 2 to 4 characters is the default rhythm. Buttons say "打招呼", "喜欢", "去看看" — never full sentences.
- Use "去 + verb" pattern for secondary navigation CTAs ("去看看", "去回复") — it implies light commitment and forward momentum.
- Match percentage and distance appear as numerals with Chinese units only when context requires it (e.g., "500m" on distance chips stays numeric; "匹配度 95%" mixes label + value).
- Avoid overtly romantic or pressure-laden language. The brand leans on "同频" (same frequency) and "故事" (story) — metaphors of compatibility and narrative, not of conquest.

---

## VISUAL FOUNDATIONS

### Color

寻觅's color system is built on a deliberate dual-brand strategy: a cool mint green as the structural primary, and a warm pink as the emotional accent. The two colors carry different semantic weights and are never used at equal volume — mint does the heavy lifting for navigation, primary actions, and structural elements, while pink is reserved for match signaling, "like" actions, and moments of emotional payoff.

- **Brand primary:** `#36C99A` (薄荷绿 / mint green) — Used for primary buttons, active navigation states, focus rings, links, and structural brand elements. The tone is a mid-saturation mint that reads as fresh and calm rather than clinical or cool; it has enough yellow undertone to feel approachable in a social context.
- **Brand scale:** 10 stops from `#ECFBF5` (primary-50, near-white mint) → `#0E4F3D` (primary-900, deep forest mint). The working range for UI is primarily 400–700; 50–100 serve as container backgrounds, and 800–900 provide on-container text in light mode.
- **Accent / Heart color:** `#FF6B81` (心动粉 / heart pink) — Used for like buttons, match badges, notification dots, and the center FAB in bottom navigation. This is the brand's emotional signal — it appears sparingly but with high impact. The saturation is deliberately not candy-bright; it's a mature pink that reads as genuine rather than cutesy.
- **Accent scale:** 10 stops from `#FFF0F2` (accent-50) → `#871D33` (accent-900, deep rose). Accent-50 functions as a soft container background for accent chips; accent-600 (`#E6526A`) is the hover state.
- **Neutrals:** A 10-stop warm-neutral scale from `#FAFAF7` (neutral-50, off-white with faint yellow undertone) through `#1F1F1A` (neutral-900, near-black). The dominant working neutrals are neutral-50 (page background — noticeably not pure white), neutral-100 (surface container low), neutral-200 (borders and dividers), neutral-500 (muted icons / secondary text), and neutral-900 (primary text). The warm undertone is a deliberate choice — it prevents the mint + pink palette from reading cold or sterile, and it reinforces the "healing / gentle" brand personality.
- **Semantic:**
  - Success: `#22C55E` (functional green — distinct from primary mint; used for online status, verification)
  - Warning: `#F59E0B` (amber — new user badges, caution states)
  - Danger: `#EF4444` (red — error states, destructive actions)
  - Info: `#3B82F6` (blue — information callouts, less commonly used in the current UI)
- **Vibe:** The overall color mood is soft, airy, and slightly nostalgic — like late-afternoon sunlight through leaves. The warm neutral base prevents the mint + pink combination from feeling like a generic "dating app pink" and instead grounds it in something closer to campus-life nostalgia. Color transitions between surfaces are gradual — surface-container-low sits on neutral-50, cards sit on surface (white), and elevation is communicated through shadow rather than background shift.

### Typography

寻觅 uses a single Chinese typeface family across all weights — PingFang SC — with careful weight differentiation to establish hierarchy without introducing visual noise. The choice of PingFang SC is both pragmatic (it is the system font on iOS, where the majority of mini-program usage occurs) and aesthetic: its humanist stroke modulation and slightly rounded terminals align with the brand's gentle personality better than a geometric or neo-grotesk face would.

- **Primary face:** **PingFang SC** — The exclusive UI typeface for all Chinese text. Weights used: 400 (Regular) for body, 500 (Medium) for subtitles and small headings, 600 (Semibold) for display and major headings. On iOS this resolves natively; on Android and Windows it falls back through `Microsoft YaHei` → `Hiragino Sans GB` → system sans-serif.
- **Latin / numeric face:** Inherited from PingFang SC's Latin glyph set for inline numbers (match percentages, distances, counts). No separate Latin font is specified — the consistent x-height between Chinese and Latin in PingFang keeps mixed-language lines balanced.
- **Mono face:** **SF Mono** → `Menlo` → `Monaco` → `Consolas` — Used only for developer-facing surfaces, not in product UI.
- **Scale (size / line-height / weight):**
  - Display: 40px / 1.15 / 600 — reserved for hero moments and onboarding
  - H1: 32px / 1.25 / 600 — page titles in full-screen flows
  - H2: 26px / 1.3 / 600 — section headers with visual weight
  - H3: 22px / 1.35 / 500 — card titles, major module headers
  - H4: 18px / 1.4 / 500 — secondary card titles, input labels, list item headings
  - Body: 16px / 1.6 / 400 — primary reading size, default text
  - Lead: 17px / 1.65 / 400 — slightly emphasized body text, bios
  - Caption: 12px / 1.5 / 400 — metadata, timestamps, secondary info
  - Eyebrow: 11px / 1.4 / 500 — tiny uppercase labels, badges
- **Letter-spacing:** Display size uses `-0.01em` optical tightening; eyebrow uses `0.08em` with uppercase transform. All other sizes use default tracking — PingFang's built-in metrics are well-suited for screen reading at body sizes and do not need adjustment.
- **Line-height approach:** Generous at body sizes (1.6) for comfortable reading of profile bios and chat text, tightening progressively as size increases (1.15 at display) to maintain visual compactness for headings. This is a standard editorial progression — nothing unusual, but executed with enough care that Chinese character density never feels cramped.

### Spacing

The spacing system is built on a 4px base unit, with tokens ranging from `--space-1: 4px` through `--space-20: 80px` in roughly 4px increments (with strategic jumps at the larger end: 48 → 56 → 64 → 80). The working range for mobile UI is 8–24px (`space-2` through `space-6`), with 20px (`space-5`) as the default page gutter (`--gutter: 20px`) and 16px (`space-4`) as the most common internal padding.

Component heights are deliberately generous for a dating product — touch targets need to feel comfortable and inviting, not cramped:
- Buttons: sm 36px, md 44px, lg 52px
- Inputs: 48px default (sm 40px, lg 56px)
- Bottom nav: 64px

The spacing rhythm between cards in a feed is 16px (`space-4`), and card internal padding defaults to 20px (`space-5`). This creates a slightly loose, breathable density — consistent with the "healing" brand personality — rather than the tight information density you'd see in a productivity app.

### Radius

寻觅's radius system is a study in deliberate softness. Every interactive element has significant rounding — there are no sharp corners anywhere in the product UI, and even the smallest controls feel pill-like and tactile.

- **`8px` (radius-sm)** — Small inputs, compact chips, icon-only buttons. The "small" radius in this system is what many systems call "medium" — 8px is the minimum rounding.
- **`12px` (radius-md)** — Standard input fields, secondary cards, image thumbnails within cards.
- **`16px` (radius-lg)** — Large inputs, modal dialogs, medium-sized cards.
- **`20px` (radius-xl)** — Primary card radius (`card-user`, `card-feed`, `card-info`). This is the signature radius of the system — large enough to feel soft but not so large that cards become bubbles.
- **`24px` (radius-2xl)** — Used sparingly for large containers and full-bleed hero elements.
- **`9999px` (radius-full)** — Buttons (all variants are pill-shaped), chips, avatars, badge counts, message input. The full-radius pill is the default button shape — not a special variant. This is a key brand identifier.

The radius philosophy aligns directly with the "温柔治愈" (gentle healing) personality: sharp corners read as technical or corporate; generous rounding reads as friendly and safe. The decision to make *all* buttons full-radius (rather than just chip-like elements) is the most distinctive radius choice in the system.

### Shadow / Elevation

5 layers of soft, diffuse shadow create a gentle elevation system that never feels heavy or harsh. All shadows are cast from the same warm-neutral dark (`--xunmi-neutral-900`, `rgba(31, 31, 26, …)`) with low alpha values, which means they read as natural soft shadow rather than as colored or cool drop shadow.

1. **Level 1 — Subtle Card:** `0 1px 3px rgba(31, 31, 26, 0.04), 0 1px 2px rgba(31, 31, 26, 0.02)` — The at-rest state for cards. Barely perceptible; its purpose is to define the card edge against a near-white background without looking like a border.
2. **Level 2 — Card Hover:** `0 4px 12px -2px rgba(31, 31, 26, 0.08)` — Hover/pressed state for cards. The shadow softens and lifts slightly, communicating interactivity without drama.
3. **Level 3 — Float:** `0 8px 24px -6px rgba(31, 31, 26, 0.12)` — Floating elements, center FAB in bottom navigation, elevated tooltips. This is the first level where the shadow feels intentional rather than ambient.
4. **Level 4 — Modal:** `0 16px 40px -10px rgba(31, 31, 26, 0.16)` — Modal dialogs, bottom sheets, popovers.
5. **Level 5 — Overlay:** `0 24px 60px -16px rgba(31, 31, 26, 0.22)` — Topmost overlays, full-screen menus, notification toasts that need maximum separation.

The shadow philosophy is whisper-quiet at rest and only becomes assertive when elevation is semantically important (modals, FABs). This is consistent with the overall gentle tone — the UI doesn't shout about its layers; it just quietly has them.

### Borders, Backgrounds, Motion

- **Borders:** Default border color is `--xunmi-neutral-200` (`#E8E8DE`) — a warm light gray that reads as a soft rule rather than a hard line. Border width is uniformly 1px. Focus rings use `--xunmi-primary-400` (`#5BD5A8`) as a slightly lighter mint than the primary, creating visible but not jarring focus indication. Inputs transition border color on hover (→ muted-foreground) and focus (→ primary) as the primary state signal, rather than relying on shadow alone.
- **Backgrounds:** Page background is `--xunmi-neutral-50` (`#FAFAF7`) — warm off-white, not pure white. Cards sit on pure white (`--surface: #FFFFFF`), which creates one clear layer of separation via both shadow and subtle color temperature difference. Surface hierarchy follows M3-inspired container naming (container-low → container → container-high → container-highest) but the actual value differences are small — the system doesn't use heavy background shifts to communicate hierarchy; it uses shadow and spacing.
- **Motion:** Three duration tiers (fast 150ms, normal 250ms, slow 400ms) with standard cubic-bezier easing (`cubic-bezier(0.4, 0, 0.2, 1)`). Button press uses a subtle `scale(0.98)` transform rather than a color shift alone — tactile feedback without heaviness. Color transitions use 150ms duration; elevation changes use 250ms. No bounce or elastic easing — motion is calm and deliberate, matching the overall tone.
- **Iconography:** Icons are linear-stroke (2px stroke width, rounded caps/joins) at 20–24px for primary interactive use, 16–18px for secondary/decorative. Icon color defaults to muted-foreground in rest state, transitioning to primary on active. The system does not include a bundled icon set — icons in previews are inline SVG placeholders following the stroke style conventions described above.

---

## Component Patterns

| Component | Preview | Contract | CSS Source | Key Facts | Key Insight |
|---|---|---|---|---|---|
| 按钮 Button | `preview/component-button.html` | `components/button.json` | `components.css` → Button | 3 sizes (36/44/52px), 5 variants (primary/secondary/outline/ghost/danger), pill-shaped (radius-full), icon-slot support, press-scale feedback | 全圆角药丸形是系统默认按钮形态，薄荷绿主按钮 + 心动粉强调按钮的双品牌策略在按钮层最直观 |
| 卡片 Card | `preview/component-card.html` | `components/card.json` | `components.css` → Card | 4 variants (user/feed/story/info), 20px radius-xl, shadow-1 at rest → shadow-2 on hover, 3 padding densities | 20px大圆角 + 柔和阴影是寻觅卡片的标志性语言，白色卡片在暖米白背景上形成温和的层次分离 |
| 底部导航 Bottom Nav | `preview/component-bottom-nav.html` | `components/bottom-nav.json` | `components.css` → Bottom Nav | 64px height, 5-tab standard + center-elevated variants, 22px icon + 11px label, accent badge, mint-green active state | 中间凸起的心形FAB是产品的核心情感触点——渐变薄荷绿 + 三级阴影，打破常规导航的平淡感 |
| 头像 Avatar | `preview/component-avatar.html` | `components/avatar.json` | `components.css` → Avatar | 5 sizes (24/32/40/56/80px), status dot + number badge, optional gradient ring (primary→accent), full-radius circular | 渐变环头像用于匹配/推荐场景，将薄荷绿到心动粉的品牌双色以视觉化方式编码"心动"语义 |
| 标签 Chip | `preview/component-chip.html` | `components/chip.json` | `components.css` → Chip | 2 sizes (20/24px height), 6 semantic tones (primary/accent/success/warning/default/disabled), pill-shaped, icon/dot slot support | 药丸形小标签承担了兴趣标签、状态指示、距离显示等多种语义——是系统中语义密度最高的小组件 |
| 输入框 Input | `preview/component-input.html` | `components/input.json` | `components.css` → Input | 3 sizes (40/48/56px), 4 variants (default/search/message/error), prefix/suffix icon slots, message variant has inline action button | 搜索框默认无描边（嵌入背景）、消息输入框全圆角带发送按钮——输入框形态随场景深度定制而非统一模板 |

---

## Index

- `README.md` — this file (brand narrative + visual foundations + component reference)
- `colors_and_type.css` — CSS custom properties for color, type, spacing, radius, shadow, motion (single-file token import)
- `css.json` — structured JSON token representation for programmatic consumption
- `components.css` — aggregated component CSS auto-extracted from preview pages
- `components/index.json` — component registry with category, confidence, and variant counts
- `components/{slug}.json` — individual component contracts (compact schema v2)
- `preview/component-button.html` — button component preview specimen
- `preview/component-card.html` — card component preview specimen
- `preview/component-bottom-nav.html` — bottom navigation preview specimen
- `preview/component-avatar.html` — avatar component preview specimen
- `preview/component-chip.html` — chip/tag component preview specimen
- `preview/component-input.html` — input component preview specimen
- `SKILL.md` — agent skill manifest with quick-reference essentials

---

## Caveats / known substitutions

1. **PingFang SC** is an Apple system font and is not available on Android or Windows devices. We substitute **Microsoft YaHei** on Windows and **Noto Sans SC** on Android/other platforms as the closest available humanist sans-serif with comparable stroke modulation. The weight distribution (400/500/600) maps approximately, but visual density will differ slightly — Microsoft YaHei Bold tends to read heavier than PingFang SC Semibold.

2. **Icon set** is not included in this library. Preview pages use inline SVG placeholders following 2px stroke / rounded cap conventions. For production use, we recommend **Lucide Icons** (outline style) or **IconPark** as accessible substitutes — both match the linear, rounded-end aesthetic observed in the reference screenshots. Icon sizing tokens (`--size-icon-xs` through `--size-icon-xl`) are provided in `colors_and_type.css`.

3. **All color tokens are AI-generated from visual analysis of reference screenshots**, not extracted from source design files or a Figma library. The 10-stop color scales (primary, accent, neutral, semantic) are algorithmically interpolated around the observed key colors (`#36C99A` primary, `#FF6B81` accent). Mid-tone values (200, 300, 400, 600, 700) should be treated as approximations and verified against source files when available.

4. **Component specifications are inferred from 13 reference screenshots** rather than extracted from a design system source. Variant counts, state coverage, and anatomy are based on visible instances in the reference material — additional variants (e.g., tertiary button styles, additional card layouts) may exist in the full product but are not represented here. Confidence is rated "high" for components with multiple visible instances across screenshots.

5. **Neutral scale warm undertone** (`#FAFAF7` / `#F4F4EF` / etc.) is an AI inference from the reference screenshots' apparent background color. The actual product may use pure white (`#FFFFFF`) backgrounds — the warm tint could be a display calibration artifact. Designers should verify the neutral-50 value against a source file before committing to the warm-neutral direction.

6. **Dark mode** token overrides are included in `colors_and_type.css` but are not represented in the component previews. Dark mode values are algorithmically inverted and lightened from the light-mode scale and have not been visually validated against reference designs.
