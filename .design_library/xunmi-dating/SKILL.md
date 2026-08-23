---
name: xunmi-dating-design
description: Use this skill to generate well-branded interfaces and assets for 寻觅 (Xunmi) — a warm, healing dating & social mini-program. Contains essential design guidelines, mint-green + heart-pink colors, PingFang SC typography, soft shadows, and UI kit components for prototyping mobile dating app UIs.
user-invocable: true
---

# 寻觅 Xunmi Design Skill

Read the `README.md` file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out
and create static HTML files for the user to view. If working on production code, you can
copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build
or design, ask some questions, and act as an expert designer who outputs HTML artifacts
_or_ production code, depending on the need.

## Quick map

- `README.md` — brand context, content fundamentals, visual foundations (read first)
- `css.json` — structured token understanding source
- `colors_and_type.css` — drop-in runtime CSS variables; link it, do not read it to understand tokens when css.json exists
- `components/` — component contracts (`{slug}.json` as primary source, `_evidence/{slug}.json` as fallback evidence)
- resolved component sources — use `preview/component-{slug}.html` first for DOM/CSS fidelity, `components/{slug}.json` for intent/variants, and `components/_evidence/{slug}.json` as fallback evidence
- `preview/` — small HTML cards illustrating the foundations and components
- `components.css` — aggregated component CSS extracted from preview pages
- `library-consumption.json` — recommended downstream read order

## Essentials at a glance

- **Brand primary `#36C99A`** (mint green) — cool, fresh, healing. The dominant action color across buttons, links, and active states. No warm amber or orange accents in the core palette.
- **Accent heart-pink `#FF6B81`** — used sparingly for likes, notifications, and romantic highlights. Creates the "心动" (heartbeat) contrast against the calm mint base.
- **Radius is large and pill-shaped** — `20px` (xl) for cards, `9999px` (full) for buttons and chips. Soft, approachable, never sharp. Controls default to fully rounded pill form.
- **Density: 44px default button height, 48px input height, 4px spacing base.** Tokens: 4, 8, 12, 16, 20, 24, 32, 40, 48px. Mobile-first with generous touch targets.
- **Type: PingFang SC** (fallback: Microsoft YaHei, Hiragino Sans GB) for all Chinese and body text. Weights: 400 body, 500 h3/h4, 600 display/h1/h2. SF Mono / Menlo for code.
- **Voice: gentle, healing, encouraging** — Chinese-first, warm but not pushy. Short romantic taglines like "遇见同频的人" and "从一次聊天开始一段故事". No emoji in product UI.
- **Shadow philosophy: whisper-soft, 5 levels.** Level 1 (`0 1px 3px rgba(31,31,26,0.04)`) for resting cards, building up to level 5 for overlays. Always warm-neutral tint, never harsh black.
- **Signature pattern: center-elevated heart FAB in bottom nav.** The 5-tab bottom navigation has a raised circular heart button in the middle — the brand's most distinctive UI motif.

## Components

| Component | Preview | Contract | CSS Source | Key Facts | Key Insight |
|---|---|---|---|---|---|
| 按钮 Button | `preview/component-button.html` | `components/button.json` | `components.css` · Button | 3 sizes (36/44/52px), 4 variants: primary mint, secondary gray, outline, accent pink. Pill-shaped (`radius-full`). | 薄荷绿主按钮 + 心动粉强调按钮，大圆角药丸形 |
| 卡片 Card | `preview/component-card.html` | `components/card.json` | `components.css` · Card | 4 variants: default, profile, match, message. 20px radius, soft shadow-2. | 大圆角20px + 柔和阴影，白色卡片在浅绿背景上 |
| 底部导航 Bottom Nav | `preview/component-bottom-nav.html` | `components/bottom-nav.json` | `components.css` · Bottom Nav | 2 variants: standard 5-tab, center-elevated with heart FAB. Mint active state, 64px height. | 5 Tab + 中间凸起心形按钮，薄荷绿选中态 |
| 头像 Avatar | `preview/component-avatar.html` | `components/avatar.json` | `components.css` · Avatar | 5 sizes (24–80px), status dot, badge, gradient ring variant. Always circular. | 圆形头像 + 右下角状态点 + 可选渐变环 |
| 标签 Chip/Tag | `preview/component-chip.html` | `components/chip.json` | `components.css` · Chip | 4 variants: interest, status, distance, filter. Pill-shaped with small 12px font. | 药丸形小标签，兴趣/状态/距离多种类型 |
| 输入框 Input | `preview/component-input.html` | `components/input.json` | `components.css` · Input | 4 variants: default, search, message, with-icon. 48px height, 20px radius. | 大圆角输入框，搜索/消息/默认三种形态 |
