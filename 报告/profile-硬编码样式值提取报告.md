# Profile 模块硬编码样式值提取报告

> 提取时间: 2026-08-20
> 范围: `apps/client/src/pages/profile/` + `apps/client/src/components/profile/`
> 共计 35 个 Vue 文件

---

## 一、Pages（6个文件）

---

### 1. `pages/profile/index.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| ~L2855 | `.voice-only-tag` | background (fallback) | `#f0fdf9` |
| ~L2855 | `.voice-only-tag` | border (fallback) | `#99f6e0` |
| ~L2859 | `.voice-only-tag__text` | color (fallback) | `#0d9488` |
| ~L2905 | `.profile-bg__overlay` | background | `rgba(15, 23, 42, 0)` / `rgba(15, 23, 42, 0.18)` / `rgba(15, 23, 42, 0.32)` |
| ~L3003 | `.user-info__chip` | background (fallback) | `#f0fdf9` |
| ~L3003 | `.user-info__chip` | border-color (fallback) | `#99f6e0` |
| ~L3003 | `.user-info__chip` | color (fallback) | `#0d9488` |
| ~L3131 | `.greet-btn__text` | color (fallback) | `#ffffff` |
| ~L3513 | `@keyframes video-cta-pulse` | — | `rgba(244, 63, 94, 0.35)` / `rgba(244, 63, 94, 0)` |
| ~L3663 | `.voice-preview__card` | background (fallback) | `#e6f9f0` |
| ~L3663 | `.voice-preview__card` | border (fallback) | `#b7ecd8` |
| ~L3679 | `.voice-preview__bar` | background (fallback) | `#9be8c8` |
| ~L3683 | `.voice-preview__bar--active` | background (fallback) | `#36C99A` |
| ~L3687 | `.voice-preview__duration` | color (fallback) | `#2db97a` |
| ~L3691 | `.voice-preview__delete` | background (fallback) | `#ffffff` |
| ~L3695 | `.voice-preview__delete-text` | color (fallback) | `#e5454d` |
| ~L3701 | `.photo-grid__badge--pending` | background | `rgba(100, 116, 139, 0.82)` |
| ~L3705 | `.photo-grid__badge--rejected` | background | `rgba(229, 69, 77, 0.86)` |
| ~L3713 | `.avatar-audit-badge--pending` | background | `rgba(100, 116, 139, 0.9)` |
| ~L3717 | `.avatar-audit-badge--rejected` | background | `rgba(229, 69, 77, 0.92)` |
| ~L3751 | `.photo-wall-empty` | border (fallback) | `#99f6e0` |
| ~L3751 | `.photo-wall-empty` | background (fallback) | `#f0fdf9` |
| ~L3755 | `.photo-wall-empty__text` | color (fallback) | `#0d9488` |
| ~L4587 | `.invite-modal__error-text` | color (fallback) | `#f43f5e` |
| ~L4643 | `.invite-modal__code` | background (fallback) | `#e8f8f0` |
| ~L4675 | `.invite-modal__btn--cancel` | background (fallback) | `#f4f6fa` |
| ~L4691 | `.profile-menu` | border-color (fallback) | `#ECEFF2` |
| ~L4698 | `.profile-menu__row` | border-color (fallback) | `#ECEFF2` |
| ~L4705 | `.profile-menu__label` | color (fallback) | `#222222` |
| ~L4711 | `.profile-menu__hint` | color (fallback) | `#666666` |
| ~L4716 | `.profile-menu__arrow` | color (fallback) | `#C8CFCD` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L4691 | `.profile-menu` | `20rpx` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L2825 | `.profile-head-card` | `0 -8rpx 32rpx rgba(15, 23, 42, 0.06)` |

**gradient:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L3670 | `.voice-preview__play` | `linear-gradient(135deg, #36C99A 0%, #6FD4AA 100%)` |
| ~L2905 | `.profile-bg__overlay` | `linear-gradient(180deg, rgba(15,23,42,0) 30%, rgba(15,23,42,0.18) 70%, rgba(15,23,42,0.32) 100%)` |

**border-color:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L4691 | `.profile-menu` | `1rpx solid #ECEFF2` |
| ~L4698 | `.profile-menu__row` | `1rpx solid #ECEFF2` |

---

### 2. `pages/profile/other.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L177 | `.other-page` | background | `#F7FAF9` |
| L186 | `.other-header__back, .other-header__more` | background | `rgba(255, 255, 255, 0.85)` |
| L193 | `.other-header__back-arrow` | color | `#222222` |
| L199 | `.other-header__more-dots` | color | `#222222` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L188 | `.other-header__back, .other-header__more` | `50%` |

---

### 3. `pages/profile/privacy.vue`

**硬编码颜色:** 无（全部使用 CSS 变量 + fallback）

**gradient（fallback）:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L101 | `.privacy-page__header` | `linear-gradient(135deg, var(--c-brand-500, #36C99A) 0%, var(--c-brand-400, #6fe0b0) 100%)` |

**box-shadow（fallback）:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L121 | `.privacy-page__section` | `0 4rpx 20rpx rgba(0, 0, 0, 0.06)` |

**border-color（fallback）:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L131 | `.privacy-item` | `1rpx solid #f0f0f0` |

---

### 4. `pages/profile/tasks.vue`

**无硬编码颜色** — 全部使用 CSS 变量引用。

---

### 5. `pages/profile/visitors.vue`

**无硬编码颜色** — 全部使用 CSS 变量引用。

---

### 6. `pages/profile/album.vue`

**硬编码颜色（CSS变量fallback）:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| ~L381 | `.album-cell__loading` | background | `rgba(15, 23, 42, 0.45)` |
| ~L385 | `.album-cell__spinner` | border | `rgba(255, 255, 255, 0.3)` |

---

## 二、Components — Profile 根级（7个文件）

---

### 7. `components/profile/ProfileShell.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L115 | `.profile-shell` | background | `#F7FAF9` |
| L125 | `.profile-shell__text` | color | `#777777` |
| L130 | `.profile-shell__retry` | background | `#DFF8EF` |
| L135 | `.profile-shell__retry-text` | color | `#36C99A` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L130 | `.profile-shell__retry` | `999rpx` |

---

### 8. `components/profile/ProfileTabs.vue`

**硬编码颜色（全部为 CSS 变量 fallback）:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| ~L73 | `.profile-tabs` | border (fallback) | `#eef1f5` |
| ~L73 | `.profile-tabs` | box-shadow (fallback) | `0 2rpx 8rpx rgba(15, 23, 42, 0.04)` |
| ~L84 | `.profile-tabs__item--active` | background (fallback) | `linear-gradient(135deg, #f472b6 0%, #FF6B81 100%)` |
| ~L84 | `.profile-tabs__item--active` | box-shadow (fallback) | `0 4rpx 16rpx rgba(255, 104, 145, 0.3)` |
| ~L90 | `.profile-tabs__item-text` | color (fallback) | `#64748b` |
| ~L95 | `.profile-tabs__item--active .profile-tabs__item-text` | color (fallback) | `#ffffff` |

**gradient:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L84 | `.profile-tabs__item--active` | `linear-gradient(135deg, var(--c-romance-400, #f472b6) 0%, var(--c-romance-500, #FF6B81) 100%)` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L73 | `.profile-tabs` | `0 2rpx 8rpx rgba(15, 23, 42, 0.04)` |
| ~L84 | `.profile-tabs__item--active` | `0 4rpx 16rpx rgba(255, 104, 145, 0.3)` |

**border-color:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L73 | `.profile-tabs` | `1rpx solid #eef1f5` |

---

### 9. `components/profile/ProfileEmptyState.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| ~L51 | `.profile-empty` | background | `rgba(255, 255, 255, 0.8)` |
| ~L60 | `.profile-empty__title` | color | `#222222` |
| ~L65 | `.profile-empty__desc` | color | `#777777` |
| ~L71 | `.profile-empty__action` | background | `#DFF8EF` |
| ~L77 | `.profile-empty__action-text` | color | `#36C99A` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L51 | `.profile-empty` | `40rpx` |
| ~L71 | `.profile-empty__action` | `999rpx` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L52 | `.profile-empty` | `0 8rpx 30rpx rgba(0, 0, 0, 0.06)` |

---

### 10. `components/profile/NotLoggedProfile.vue`

**硬编码颜色（纯硬编码，大量）:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| ~L89 | `.nlp-header__title` | color | `#222222` |
| ~L94 | `.nlp-header__sub` | color | `#8A9694` |
| ~L99 | `.nlp-header__arrow` | color | `#36C99A` |
| ~L103 | `.nlp-card` | background | `#ffffff` |
| ~L110 | `.nlp-completion__title` | color | `#222222` |
| ~L115 | `.nlp-completion__percent` | color | `#36C99A` |
| ~L120 | `.nlp-completion__bar` | background | `#E6F5EF` |
| ~L125 | `.nlp-completion__bar-inner` | background | `#36C99A` |
| ~L130 | `.nlp-completion__tip` | color | `#999999` |
| ~L135 | `.nlp-completion__btn` | background | `#36C99A` |
| ~L140 | `.nlp-completion__btn-text` | color | `#ffffff` |
| ~L160 | `.nlp-stats__value` | color | `#222222` |
| ~L165 | `.nlp-stats__label` | color | `#999999` |
| ~L173 | `.nlp-section__title` | color | `#222222` |
| ~L186 | `.nlp-story__img` | background | `#E8FBF2` |
| ~L191 | `.nlp-story--add .nlp-story__img` | background | `#ffffff` |
| ~L194 | `.nlp-story__plus` | color | `#36C99A` |
| ~L199 | `.nlp-story__name` | color | `#333333` |
| ~L219 | `.nlp-interaction__label` | color | `#222222` |
| ~L224 | `.nlp-interaction__value` | color | `#999999` |
| ~L229 | `.nlp-interaction__arrow` | color | `#C6CDCC` |
| ~L235 | `.nlp-footer-btn` | background | `#36C99A` |
| ~L243 | `.nlp-footer-btn__text` | color | `#ffffff` |

**gradient:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L82 | `.not-logged-profile` | `linear-gradient(180deg, #DFF8EF 0%, #F7FAF9 40%)` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L103 | `.nlp-card` | `32rpx` |
| ~L120 | `.nlp-completion__bar` | `999rpx` |
| ~L135 | `.nlp-completion__btn` | `999rpx` |
| ~L186 | `.nlp-story__img` | `24rpx` |
| ~L235 | `.nlp-footer-btn` | `999rpx` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L103 | `.nlp-card` | `0 8rpx 24rpx rgba(0, 0, 0, 0.05)` |

**border-color:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L190 | `.nlp-story--add .nlp-story__img` | `3rpx dashed #36C99A` |
| ~L207 | `.nlp-interaction` | `1rpx solid #EEF1F5` |

**JS常量中的硬编码颜色（动态绑定到模板）:**

| 行号 | 变量 | 值 |
|------|------|-----|
| ~L12 | `STATS` colors | `#8D7BFF` / `#FF6B81` / `#FF9A57` / `#4D8DFF` |
| ~L19 | `INTERACTIONS` colors | `#FF6B81` / `#FF9A57` / `#8D7BFF` / `#4D8DFF` |

**模板内联样式（动态拼接）:**

| 行号 | 模式 | 说明 |
|------|------|------|
| ~L61 | `:style="{ background: \`${s.color}1F\` }"` | 颜色 + `1F`（8% 透明度） |
| ~L62 | `:style="{ color: s.color }"` | 动态绑定颜色 |
| ~L111 | `:style="{ background: \`${item.color}1F\` }"` | 颜色 + `1F` |
| ~L112 | `:style="{ color: item.color }"` | 动态绑定颜色 |

---

### 11. `components/profile/TagSelector.vue`

**无硬编码颜色** — 全部使用 CSS 变量引用。

---

### 12. `components/profile/CertBadgeRow.vue`

**硬编码颜色（纯硬编码，3组渐变）:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| ~L92 | `.cert-badge--realname` | gradient | `linear-gradient(135deg, #4f8ef7 0%, #c9a36a 100%)` |
| ~L97 | `.cert-badge--education` | gradient | `linear-gradient(135deg, #c9a36a 0%, #36C99A 100%)` |

**gradient:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L87 | `.cert-badge--age` | `linear-gradient(135deg, var(--c-brand-400, #6fe0b0) 0%, var(--c-brand-500, #36C99A) 100%)` |
| ~L92 | `.cert-badge--realname` | `linear-gradient(135deg, #4f8ef7 0%, #c9a36a 100%)` |
| ~L97 | `.cert-badge--education` | `linear-gradient(135deg, #c9a36a 0%, var(--c-brand-500, #36C99A) 100%)` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L87 | `.cert-badge--age` | `0 2rpx 10rpx rgba(61, 201, 148, 0.35)` |
| ~L92 | `.cert-badge--realname` | `0 2rpx 10rpx rgba(79, 142, 247, 0.3)` |
| ~L97 | `.cert-badge--education` | `0 2rpx 10rpx rgba(201, 163, 106, 0.35)` |

---

### 13. `components/profile/CertDetailSheet.vue`

**硬编码颜色（纯硬编码，2个无 var 包裹）:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| ~L253 | `.cert-item__triple-dot--machine` | color | `#4f8ef7` |
| ~L255 | `.cert-item__triple-dot--chsi` | color | `#c9a36a` |

**CSS 变量 fallback 中的硬编码值:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| ~L158 | `.cert-sheet` | background | `#ffffff` |
| ~L168 | `.cert-sheet__handle` | background | `#e2e8f0` |
| ~L181 | `.cert-sheet__close` | background | `#fafbfc` |
| ~L202 | `.cert-item` | background | `#fafbfc` |
| ~L202 | `.cert-item` | border-color | `#e2e8f0` |
| ~L222 | `.cert-item__status--earned` | background | `#f0fdf9` |
| ~L222 | `.cert-item__status--earned` | border-color | `#99f6e0` |
| ~L227 | `.cert-item__status--pending` | background | `#f1f5f9` |
| ~L227 | `.cert-item__status--pending` | border-color | `#e2e8f0` |
| ~L231 | `.cert-item__status--earned .cert-item__status-text` | color | `#0d9488` |
| ~L239 | `.cert-item__triple` | background | `#e8f8f0` |
| ~L259 | `.cert-item__triple-text` | color | `#065f46` |
| ~L279 | `.cert-item__value--reliability` | color | `#0d9488` |
| ~L289 | `.cert-item__go-text` | color | `#ffffff` |
| ~L294 | `.cert-sheet__privacy` | background | `#f8fafc` |

**gradient:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L284 | `.cert-item__go` | `linear-gradient(135deg, #36C99A, #6fe0b0)` (fallback) |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| ~L158 | `.cert-sheet` | `32rpx 32rpx 0 0` |

---

## 三、Components — Mine（12个文件）

---

### 14. `components/profile/mine/MyHeader.vue`

**硬编码颜色（纯硬编码，21处）:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L108 | `.my-header` | background gradient 起点 | `#36C99A` |
| L108 | `.my-header` | background gradient 终点 | `#B8F0DE` |
| L116 | `.my-header__avatar-wrap` | background | `rgba(255, 255, 255, 0.25)` |
| L121 | `.my-header__avatar-text` | color | `#ffffff` |
| L130 | `.my-header__vip-badge` | border | `#36C99A` |
| L131 | `.my-header__vip-badge` | box-shadow | `rgba(0, 0, 0, 0.15)` |
| L133 | `.my-header__vip-dot` | background | `#E8FBF2` |
| L139 | `.my-header__vip-text` | color | `#36C99A` |
| L145 | `.my-header__edit-btn` | background | `#36C99A` |
| L146 | `.my-header__edit-btn` | border | `#ffffff` |
| L150 | `.my-header__edit-text` | color | `#ffffff` |
| L162 | `.my-header__name` | color | `#ffffff` |
| L168 | `.my-header__age` | color | `rgba(255, 255, 255, 0.92)` |
| L173 | `.my-header__id` | color | `#ffffff` |
| L178 | `.my-header__tag` | background | `rgba(255, 255, 255, 0.22)` |
| L179 | `.my-header__tag` | border | `rgba(255, 255, 255, 0.6)` |
| L184 | `.my-header__tag-text` | color | `#ffffff` |
| L190 | `.my-header__completion-text` | color | `rgba(255, 255, 255, 0.95)` |
| L198 | `.my-header__action-btn` | background | `rgba(255, 255, 255, 0.25)` |
| L199 | `.my-header__action-btn` | border | `rgba(255, 255, 255, 0.4)` |
| L204 | `.my-header__action-text` | color | `#ffffff` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L109 | `.my-header` | `0 0 40rpx 40rpx` |
| L115 | `.my-header__avatar-wrap` | `50%` |
| L128 | `.my-header__vip-badge` | `50%` |
| L144 | `.my-header__edit-btn` | `50%` |
| L177 | `.my-header__tag` | `999rpx` |
| L197 | `.my-header__action-btn` | `999rpx` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L131 | `.my-header__vip-badge` | `0 10rpx 24rpx rgba(0, 0, 0, 0.15)` |

**gradient:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L108 | `.my-header` | `linear-gradient(180deg, #36C99A 0%, #B8F0DE 100%)` |

**border-color:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L130 | `.my-header__vip-badge` | `#36C99A` |
| L146 | `.my-header__edit-btn` | `#ffffff` |
| L179 | `.my-header__tag` | `rgba(255, 255, 255, 0.6)` |
| L199 | `.my-header__action-btn` | `rgba(255, 255, 255, 0.4)` |

---

### 15. `components/profile/mine/MyProfile.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L67 | `.my-profile` | background | `#F7FAF9` |

---

### 16. `components/profile/mine/MyContent.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L88 | `.my-content__title` | color | `#222222` |
| L96 | `.my-content__card` | background | `rgba(255, 255, 255, 0.8)` |
| L106 | `.my-content__text` | color | `#222222` |
| L114 | `.my-content__meta` | color | `#777777` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L95 | `.my-content__card` | `40rpx` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L97 | `.my-content__card` | `0 8rpx 30rpx rgba(0, 0, 0, 0.06)` |

---

### 17. `components/profile/mine/MyStats.vue`

**JS常量中的硬编码颜色（动态绑定到模板）:**

| 行号 | 变量 | 值 |
|------|------|-----|
| L15 | `items[0].color` | `#8D7BFF` |
| L16 | `items[1].color` | `#FF6B81` |
| L17 | `items[2].color` | `#FF9A57` |
| L18 | `items[3].color` | `#4D8DFF` |

**硬编码颜色 (CSS):**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L46 | `.my-stats__card` | background | `#ffffff` |
| L60 | `.my-stats__separator` | background | `#EEF1F5` |
| L72 | `.my-stats__value` | color | `#222222` |
| L77 | `.my-stats__label` | color | `#999999` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L44 | `.my-stats__card` | `32rpx` |
| L66 | `.my-stats__item` | `50%` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L45 | `.my-stats__card` | `0 8rpx 24rpx rgba(0, 0, 0, 0.05)` |

**模板内联样式（动态拼接）:**

| 行号 | 模式 |
|------|------|
| L34 | `:style="{ background: \`${item.color}22\` }"` |
| L35 | `:style="{ color: item.color }"` |

---

### 18. `components/profile/mine/MyInteraction.vue`

**JS常量中的硬编码颜色:**

| 行号 | 变量 | 值 |
|------|------|-----|
| L22 | `items[0].color` | `#FF6B81` |
| L23 | `items[1].color` | `#FF9A57` |
| L24 | `items[2].color` | `#8D7BFF` |
| L25 | `items[3].color` | `#4D8DFF` |

**硬编码颜色 (CSS):**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L58 | `.my-interaction__title` | color | `#222222` |
| L65 | `.my-interaction__card` | background | `#ffffff` |
| L78 | `.my-interaction__item:active` | background | `#F7FAF9` |
| L90 | `.my-interaction__item-title` | color | `#222222` |
| L95 | `.my-interaction__item-value` | color | `#999999` |
| L100 | `.my-interaction__item-arrow` | color | `#C6CDCC` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L64 | `.my-interaction__card` | `32rpx` |
| L84 | `.my-interaction__item-icon` | `50%` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L65 | `.my-interaction__card` | `0 8rpx 24rpx rgba(0, 0, 0, 0.05)` |

**border-color:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L71 | `.my-interaction__item` | `#EEF1F5` (border-bottom) |

**模板内联样式:**

| 行号 | 模式 |
|------|------|
| L35 | `:style="{ background: \`${item.color || '#36C99A'}22\` }"` |
| L36 | `:style="{ color: item.color \|\| '#36C99A' }"` |

---

### 19. `components/profile/mine/MyMore.vue`

**JS常量中的硬编码颜色:**

| 行号 | 变量 | 值 |
|------|------|-----|
| L17 | `ICONS.explore.color` | `#FFB020` |
| L18 | `ICONS.myPost.color` | `#4D8DFF` |
| L19 | `ICONS.myLike.color` | `#FF6B81` |
| L20 | `ICONS.favorites.color` | `#8D7BFF` |
| L21 | `ICONS.settings.color` | `#36C99A` |
| L22 | `ICONS.help.color` | `#FF6B81` |
| L23 | `ICONS.feedback.color` | `#FF9A57` |
| L24 | `ICONS.about.color` | `#36C99A` |

**硬编码颜色 (CSS):**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L56 | `.my-more__title` | color | `#222222` |
| L63 | `.my-more__card` | background | `#ffffff` |
| L80 | `.my-more__label` | color | `#666666` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L61 | `.my-more__card` | `32rpx` |
| L74 | `.my-more__icon` | `50%` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L62 | `.my-more__card` | `0 8rpx 24rpx rgba(0, 0, 0, 0.05)` |

**模板内联样式:**

| 行号 | 模式 |
|------|------|
| L38 | `:style="{ background: \`${ICONS[item.key]?.color \|\| '#36C99A'}22\` }"` |
| L39 | `:style="{ color: ICONS[item.key]?.color \|\| '#36C99A' }"` |

---

### 20. `components/profile/mine/MyCompletion.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L42 | `.my-completion__card` | background | `rgba(255, 255, 255, 0.92)` |
| L51 | `.my-completion__title` | color | `#222222` |
| L56 | `.my-completion__percent` | color | `#36C99A` |
| L62 | `.my-completion__bar` | background | `#E6F5EF` |
| L67 | `.my-completion__bar-inner` | background | `#36C99A` |
| L75 | `.my-completion__tip` | color | `#999999` |
| L80 | `.my-completion__btn` | background | `#36C99A` |
| L84 | `.my-completion__btn-text` | color | `#ffffff` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L41 | `.my-completion__card` | `32rpx` |
| L61 | `.my-completion__bar` | `999rpx` |
| L66 | `.my-completion__bar-inner` | `999rpx` |
| L79 | `.my-completion__btn` | `999rpx` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L43 | `.my-completion__card` | `0 8rpx 30rpx rgba(0, 0, 0, 0.06)` |

---

### 21. `components/profile/mine/MyGrowth.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L38 | `.my-growth__card` | background | `rgba(255, 255, 255, 0.8)` |
| L45 | `.my-growth__item` | border-bottom | `#eef1f5` |
| L52 | `.my-growth__item:active` | background | `#F7FAF9` |
| L56 | `.my-growth__item-label` | color | `#222222` |
| L61 | `.my-growth__item-value` | color | `#777777` |
| L66 | `.my-growth__item-arrow` | color | `#777777` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L37 | `.my-growth__card` | `40rpx` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L39 | `.my-growth__card` | `0 8rpx 30rpx rgba(0, 0, 0, 0.06)` |

**border-color:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L45 | `.my-growth__item` | `#eef1f5` |

---

### 22. `components/profile/mine/MyStory.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L96 | `.my-story__title` | color | `#222222` |
| L104 | `.my-story__card` | background | `#E8FBF2` |
| L112 | `.my-story__video-bg` | background | `#EEF3FF` |
| L118 | `.my-story__video-icon` | color | `#4D8DFF` |
| L138 | `.my-story__name` | color | `#ffffff` |
| L142 | `.my-story__count` | color | `rgba(255, 255, 255, 0.85)` |
| L147 | `.my-story__add-card` | border | `#36C99A` (dashed) |
| L148 | `.my-story__add-card` | background | `#ffffff` |
| L155 | `.my-story__add-icon` | color | `#36C99A` |
| L159 | `.my-story__add-text` | color | `#36C99A` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L103 | `.my-story__card` | `24rpx` |

**gradient:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L114 | `.my-story__placeholder` | `linear-gradient(180deg, #E8FBF2 0%, #C8EEDF 100%)` |
| L124 | `.my-story__mask` | `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)` |

**border-color:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L147 | `.my-story__add-card` | `#36C99A` |

---

### 23. `components/profile/mine/MyProfileFeed.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L68 | `.my-profile-feed__title` | color | `#222222` |
| L80 | `.my-profile-feed__text` | color | `#222222` |
| L88 | `.my-profile-feed__meta` | color | `#999999` |
| L98 | `.my-profile-feed__empty-text` | color | `#999999` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L76 | `.my-profile-feed__card` | `32rpx` |

---

### 24. `components/profile/mine/MyProfileGallery.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L62 | `.my-profile-gallery__title` | color | `#222222` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L69 | `.my-profile-gallery__cell` | `24rpx` |

---

### 25. `components/profile/mine/MyProfileInterest.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| L74 | `.my-profile-interest__title` | color | `#222222` |
| L85 | `.my-profile-interest__tag` | background | `#EAF8F3` |
| L92 | `.my-profile-interest__text` | color | `#222222` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| L84 | `.my-profile-interest__tag` | `28rpx` |

---

## 四、Components — Public（11个文件）

---

### 26. `components/profile/public/PublicProfile.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.public-profile` | background | `#F7FAF9` |
| style | `.public-profile__state-text` | color | `#999999` |
| style | `.public-profile__retry` | background | `#DFF8EF` |
| style | `.public-profile__retry-text` | color | `#36C99A` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-profile__retry` | `999rpx` |

---

### 27. `components/profile/public/PublicHero.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.public-hero__avatar` | border-color | `#36C99A` |
| style | `.public-hero__avatar` | background | `#E8FBF2` |
| style | `.public-hero__avatar-initial` | color | `#36C99A` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-hero__avatar` | `50%` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-hero__avatar` | `0 10rpx 28rpx rgba(0, 0, 0, 0.18)` |

**gradient:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-hero__bg--fallback` | `linear-gradient(180deg, #E8F8F1 0%, #FFFFFF 100%)` |
| style | `.public-hero__top-gradient` | `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 100%)` |
| style | `.public-hero__bottom-gradient` | `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.9) 100%)` |

---

### 28. `components/profile/public/PublicIdentity.vue`

**硬编码颜色（纯硬编码，15处）:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.public-identity` | background | `#ffffff` |
| style | `.public-identity__name` | color | `#333A37` |
| style | `.public-identity__gender--male` | background | `#54A0FF` |
| style | `.public-identity__gender--female` | background | `#FF6B81` |
| style | `.public-identity__gender-symbol` | color | `#ffffff` |
| style | `.public-identity__online` | background | `#E8FAF3` |
| style | `.public-identity__online-dot` | background | `#36C99A` |
| style | `.public-identity__online-text` | color | `#36C99A` |
| style | `.public-identity__match` | color | `#FF6B81` |
| style | `.public-identity__btn--like` | background | `#FF6B81` |
| style | `.public-identity__btn--hello` | background | `#ffffff` |
| style | `.public-identity__meta-item` | color | `#6B7571` |
| style | `.public-identity__meta-sep` | color | `#DDE3E0` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-identity` | `40rpx` |
| style | `.public-identity__gender` | `50%` |
| style | `.public-identity__online` | `999rpx` |
| style | `.public-identity__online-dot` | `50%` |
| style | `.public-identity__btn` | `50%` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-identity` | `0 8rpx 24rpx rgba(0, 0, 0, 0.06)` |
| style | `.public-identity__btn--like` | `0 8rpx 24rpx rgba(255, 107, 129, 0.3)` |
| style | `.public-identity__btn--hello` | `0 8rpx 24rpx rgba(0, 0, 0, 0.08)` |

---

### 29. `components/profile/public/PublicBio.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.public-bio` | background | `#F2F7F5` |
| style | `.public-bio__quote` | color | `#B7C4C0` |
| style | `.public-bio__text` | color | `#444444` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-bio` | `32rpx` |

---

### 30. `components/profile/public/PublicAction.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.public-action__btn--crush` | background | `#FFE4EC` |
| style | `.public-action__btn--crush .public-action__text` | color | `#FF6B91` |
| style | `.public-action__text` | color | `#ffffff` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-action__btn` | `40rpx` |

**gradient:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-action__btn--chat` | `linear-gradient(135deg, #6BE3B8 0%, #36C99A 100%)` |
| style | `.public-action__btn--like` | `linear-gradient(135deg, #FF9DB5 0%, #FF6B91 100%)` |

---

### 31. `components/profile/public/PublicMoment.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.public-moment__title` | color | `#222222` |
| style | `.public-moment__more` | color | `#999999` |
| style | `.public-moment__card` | background | `#ffffff` |
| style | `.public-moment__content` | color | `#333333` |
| style | `.public-moment__img` | background | `#EEF3F1` |
| style | `.public-moment__stat` | color | `#999999` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-moment__card` | `32rpx` |
| style | `.public-moment__img` | `16rpx` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-moment__card` | `0 8rpx 24rpx rgba(0, 0, 0, 0.05)` |

---

### 32. `components/profile/public/PublicGallery.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.public-gallery` | background | `#ffffff` |
| style | `.public-gallery__title` | color | `#222222` |
| style | `.public-gallery__cell` | background | `#EEF3F1` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-gallery` | `32rpx` |
| style | `.public-gallery__cell` | `12rpx` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-gallery` | `0 8rpx 24rpx rgba(0, 0, 0, 0.05)` |

---

### 33. `components/profile/public/PublicInterest.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.public-interest` | background | `#FFFFFF` |
| style | `.public-interest__title` | color | `#222222` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-interest` | `40rpx` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-interest` | `0 8rpx 24rpx rgba(0, 0, 0, 0.06)` |

---

### 34. `components/profile/public/PublicCommon.vue`

**JS常量中的硬编码颜色（动态绑定到模板）:**

| 行号 | 变量 | bg | fg |
|------|------|-----|-----|
| script | `COLORS[0]` | `#E8F8F1` | `#36C99A` |
| script | `COLORS[1]` | `#EEF3FF` | `#4D8DFF` |
| script | `COLORS[2]` | `#FFF1E8` | `#FF9A57` |
| script | `COLORS[3]` | `#FFF0F6` | `#FF6B81` |

**硬编码颜色 (CSS):**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.public-common` | background | `#ffffff` |
| style | `.public-common__title` | color | `#222222` |
| style | `.public-common__num` | color | `#FF6B81` |
| style | `.public-common__item-title` | color | `#222222` |
| style | `.public-common__item-sub` | color | `#999999` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-common` | `32rpx` |
| style | `.public-common__icon` | `50%` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.public-common` | `0 8rpx 24rpx rgba(0, 0, 0, 0.05)` |

---

### 35. `components/profile/public/RelationshipCTA.vue`

**硬编码颜色（纯硬编码，16处）:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.relationship-cta` | background | `rgba(255, 255, 255, 0.97)` |
| style | `.relationship-cta__btn--like` | background | `#FFF0F6` |
| style | `.relationship-cta__btn--hello` | background | `#36C99A` |
| style | `.relationship-cta__btn--follow` | background | `#ffffff` |
| style | `.relationship-cta__heart` | color | `#FF6B81` |
| style | `.relationship-cta__bubble` | color | `#ffffff` |
| style | `.relationship-cta__star` | color | `#36C99A` |
| style | `.relationship-cta__text` | color | `#FFFFFF` |
| style | `.relationship-cta__text--like` | color | `#FF6B81` |
| style | `.relationship-cta__text--follow` | color | `#168B65` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.relationship-cta__btn` | `999rpx` |

**box-shadow:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.relationship-cta` | `0 -8rpx 30rpx rgba(0, 0, 0, 0.05)` |
| style | `.relationship-cta__btn--hello` | `0 8rpx 20rpx rgba(61, 201, 148, 0.3)` |

**border-color:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.relationship-cta` | `1rpx solid #EEF1F5` (border-top) |
| style | `.relationship-cta__btn--like` | `2rpx solid #FFD3E0` |
| style | `.relationship-cta__btn--follow` | `2rpx solid #36C99A` |

---

### 36. `components/profile/public/GovernanceMenu.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.governance-mask` | background | `rgba(0, 0, 0, 0.4)` |
| style | `.governance-sheet` | background | `#FFFFFF` |
| style | `.governance-sheet__title` | color | `#666666` |
| style | `.governance-sheet__item` | color | `#222222` |
| style | `.governance-sheet__item--danger` | color | `#E94D87` |
| style | `.governance-sheet__cancel` | color | `#222222` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.governance-sheet` | `32rpx 32rpx 0 0` |

**border-color:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.governance-sheet__item` | `1rpx solid #F0F3F2` (border-top) |
| style | `.governance-sheet__cancel` | `#F7FAF9` (border-top) |

---

## 五、Components — Common（5个文件）

---

## 37. `components/profile/common/Avatar.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.profile-avatar` | background | `#DFF8EF` |
| style | `.profile-avatar__initial` | color | `#36C99A` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.profile-avatar` | `50%` |

---

## 38. `components/profile/common/InterestTag.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.interest-tag` | background | `#E8F8F1` |
| style | `.interest-tag` | border | `rgba(32, 201, 151, 0.12)` |
| style | `.interest-tag--active` | background | `linear-gradient(135deg, #6BE3B8 0%, #36C99A 100%)` |
| style | `.interest-tag--active .interest-tag__text` | color | `#ffffff` |
| style | `.interest-tag__text` | color | `#333333` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.interest-tag` | `999rpx` |

**gradient:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.interest-tag--active` | `linear-gradient(135deg, #6BE3B8 0%, #36C99A 100%)` |

---

## 39. `components/profile/common/PhotoCard.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.photo-card` | background | `#DFF8EF` |
| style | `.photo-card__empty-text` | color | `#36C99A` |
| style | `.photo-card__badge` | background | `rgba(32, 201, 151, 0.9)` |
| style | `.photo-card__badge--rejected` | background | `rgba(255, 111, 174, 0.9)` |
| style | `.photo-card__badge-text` | color | `#ffffff` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.photo-card` | `24rpx` |

---

## 40. `components/profile/common/StatItem.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.stat-item__value` | color | `#222222` |
| style | `.stat-item__value--emphasis` | color | `#FF6B81` |
| style | `.stat-item__label` | color | `#666666` |

---

## 41. `components/profile/common/VerifiedBadge.vue`

**硬编码颜色:**

| 行号 | 选择器 | 属性 | 值 |
|------|--------|------|-----|
| style | `.verified-badge` | background | `rgba(255, 255, 255, 0.9)` |
| style | `.verified-badge` | border | `#36C99A` |
| style | `.verified-badge--off` | border-color | `#999999` |
| style | `.verified-badge__text` | color | `#36C99A` |
| style | `.verified-badge--off .verified-badge__text` | color | `#999999` |

**border-radius:**

| 行号 | 选择器 | 值 |
|------|--------|-----|
| style | `.verified-badge` | `999rpx` |

---

## 六、全局汇总

### 去重硬编码颜色色值总表

| 色值 | 出现次数 | 用途 |
|------|---------|------|
| `#36C99A` | ~25+ | 品牌主色（绿色） |
| `#ffffff` / `#FFFFFF` | ~20+ | 白色文字/背景/边框 |
| `#222222` | ~15 | 主文字色 |
| `#999999` | ~8 | 次要文字色 |
| `#777777` | ~5 | 辅助文字色 |
| `#F7FAF9` | ~5 | 页面/卡片浅绿灰背景 |
| `#E8FBF2` / `#E8FAF3` / `#E8F8F1` / `#E8F8F0` / `#EAF8F3` / `#E6F5EF` | ~8 | 浅绿背景色（相近但不完全一致） |
| `#DFF8EF` | ~3 | 浅绿按钮背景 |
| `#FF6B81` / `#FF6B91` | ~8 | 品牌粉红色 |
| `#FF9A57` | ~3 | 橙色图标 |
| `#4D8DFF` | ~5 | 蓝色图标 |
| `#8D7BFF` | ~3 | 紫色图标 |
| `#54A0FF` | 1 | 男性性别标识蓝色 |
| `#FFB020` | 1 | 金色图标 |
| `#E94D87` | 1 | 危险操作红色 |
| `#f43f5e` | 1 | 错误文字红色 |
| `#e5454d` | 1 | 删除按钮红色 |
| `#EEF1F5` / `#eef1f5` / `#EEF3F1` | ~5 | 分隔线/浅灰背景（大小写不一致） |
| `#ECEFF2` | 2 | 边框灰 |
| `#F0F3F2` | 1 | 分隔线灰 |
| `#DDE3E0` | 1 | 分隔符色 |
| `#C6CDCC` | 2 | 箭头色 |
| `#8A9694` | 1 | 副标题色 |
| `#6B7571` | 1 | meta 色 |
| `#333A37` | 1 | 名字色 |
| `#333333` | 2 | 次要文字 |
| `#444444` | 1 | 正文色 |
| `#666666` | 3 | 提示/标签色 |
| `#168B65` | 1 | 深绿文字 |
| `#065f46` | 1 | 深绿文字 |
| `#0d9488` | 3 | 品牌深绿 |
| `#99f6e0` | 3 | 边框浅绿 |
| `#f0fdf9` | 3 | 极浅绿背景 |
| `#64748b` | 1 | tab 非活动文字 |
| `#4f8ef7` / `#6BE3B8` | 2 | 渐变中间色 |
| `#c9a36a` | 2 | 金色渐变 |
| `#B8F0DE` / `#C8EEDF` / `#B7ecd8` / `#9be8c8` / `#6FD4AA` / `#6fe0b0` | ~6 | 渐变中间/终止色 |
| `#2db97a` | 1 | 进度条色 |
| `#b7C4C0` | 1 | 引号色 |
| `#FFD3E0` | 1 | 粉色边框 |
| `#FF9DB5` | 1 | 粉色渐变 |
| `#f472b6` | 1 | tab 渐变（fallback） |
| `#FFE4EC` | 1 | crush 按钮背景 |
| `#f0f0f0` | 1 | 分隔线（fallback） |
| `#f1f5f9` | 1 | pending 状态背景 |
| `#f4f6fa` | 1 | 取消按钮背景 |
| `#fafbfc` | 2 | 极浅灰背景 |
| `#f8fafc` | 1 | 隐私信息背景 |
| `#e2e8f0` | 2 | 边框灰/把手色 |

### rgba 色值

| 色值 | 出现次数 | 用途 |
|------|---------|------|
| `rgba(0, 0, 0, 0.05)` | ~6 | box-shadow |
| `rgba(0, 0, 0, 0.06)` | ~5 | box-shadow |
| `rgba(0, 0, 0, 0.08)` | 1 | box-shadow |
| `rgba(0, 0, 0, 0.15)` | 1 | box-shadow |
| `rgba(0, 0, 0, 0.18)` | 1 | box-shadow |
| `rgba(0, 0, 0, 0.35)` | 1 | 渐变遮罩 |
| `rgba(0, 0, 0, 0.4)` | 1 | 遮罩背景 |
| `rgba(0, 0, 0, 0.7)` | 1 | 渐变遮罩 |
| `rgba(15, 23, 42, 0.06)` | 1 | box-shadow |
| `rgba(15, 23, 42, 0.18)` | 1 | 渐变 |
| `rgba(15, 23, 42, 0.32)` | 1 | 渐变 |
| `rgba(15, 23, 42, 0.45)` | 1 | loading 背景 |
| `rgba(255, 255, 255, 0.22)` | 1 | 半透明白色背景 |
| `rgba(255, 255, 255, 0.25)` | 2 | 半透明白色背景 |
| `rgba(255, 255, 255, 0.3)` | 1 | spinner 边框 |
| `rgba(255, 255, 255, 0.4)` | 1 | 边框 |
| `rgba(255, 255, 255, 0.6)` | 1 | 边框 |
| `rgba(255, 255, 255, 0.8)` | 3 | 半透明白色背景 |
| `rgba(255, 255, 255, 0.85)` | 2 | 半透明白色背景 |
| `rgba(255, 255, 255, 0.9)` | 1 | 渐变 |
| `rgba(255, 255, 255, 0.92)` | 1 | 半透明白色背景 |
| `rgba(255, 255, 255, 0.95)` | 1 | 半透明白色文字 |
| `rgba(255, 255, 255, 0.97)` | 1 | CTA 背景 |
| `rgba(244, 63, 94, 0.35)` | 1 | 脉冲动画 |
| `rgba(255, 104, 145, 0.3)` | 2 | box-shadow |
| `rgba(255, 107, 129, 0.3)` | 1 | box-shadow |
| `rgba(61, 201, 148, 0.3)` | 1 | box-shadow |
| `rgba(61, 201, 148, 0.35)` | 1 | box-shadow |
| `rgba(79, 142, 247, 0.3)` | 1 | box-shadow |
| `rgba(201, 163, 106, 0.35)` | 1 | box-shadow |
| `rgba(100, 116, 139, 0.82)` | 1 | badge 背景 |
| `rgba(100, 116, 139, 0.9)` | 1 | badge 背景 |
| `rgba(229, 69, 77, 0.86)` | 1 | rejected badge |
| `rgba(229, 69, 77, 0.92)` | 1 | rejected badge |

### border-radius 去重

| 值 | 出现次数 |
|----|---------|
| `50%` | ~8 |
| `999rpx` | ~10 |
| `40rpx` | ~6 |
| `32rpx` | ~12 |
| `24rpx` | ~4 |
| `28rpx` | 1 |
| `20rpx` | 1 |
| `16rpx` | 1 |
| `12rpx` | 1 |
| `0 0 40rpx 40rpx` | 1 |
| `32rpx 32rpx 0 0` | 2 |

### box-shadow 去重

| 值 | 出现次数 |
|----|---------|
| `0 8rpx 24rpx rgba(0, 0, 0, 0.05)` | ~5 |
| `0 8rpx 30rpx rgba(0, 0, 0, 0.06)` | ~4 |
| `0 8rpx 24rpx rgba(0, 0, 0, 0.06)` | 1 |
| `0 8rpx 24rpx rgba(0, 0, 0, 0.08)` | 1 |
| `0 10rpx 24rpx rgba(0, 0, 0, 0.15)` | 1 |
| `0 10rpx 28rpx rgba(0, 0, 0, 0.18)` | 1 |
| `0 -8rpx 32rpx rgba(15, 23, 42, 0.06)` | 1 |
| `0 -8rpx 30rpx rgba(0, 0, 0, 0.05)` | 1 |
| `0 4rpx 20rpx rgba(0, 0, 0, 0.06)` | 1 |
| `0 2rpx 8rpx rgba(15, 23, 42, 0.04)` | 1 |
| `0 4rpx 16rpx rgba(255, 104, 145, 0.3)` | 1 |
| `0 8rpx 24rpx rgba(255, 107, 129, 0.3)` | 1 |
| `0 8rpx 20rpx rgba(61, 201, 148, 0.3)` | 1 |
| `0 2rpx 10rpx rgba(61, 201, 148, 0.35)` | 1 |
| `0 2rpx 10rpx rgba(79, 142, 247, 0.3)` | 1 |
| `0 2rpx 10rpx rgba(201, 163, 106, 0.35)` | 1 |

### gradient 去重

| 值 | 文件 |
|----|------|
| `linear-gradient(180deg, #36C99A 0%, #B8F0DE 100%)` | MyHeader.vue |
| `linear-gradient(135deg, #36C99A 0%, #6FD4AA 100%)` | index.vue |
| `linear-gradient(135deg, #6BE3B8 0%, #36C99A 100%)` | PublicAction.vue |
| `linear-gradient(135deg, #FF9DB5 0%, #FF6B91 100%)` | PublicAction.vue |
| `linear-gradient(135deg, #4f8ef7 0%, #c9a36a 100%)` | CertBadgeRow.vue |
| `linear-gradient(135deg, #c9a36a 0%, #36C99A 100%)` | CertBadgeRow.vue |
| `linear-gradient(135deg, #36C99A, #6fe0b0)` | CertDetailSheet.vue |
| `linear-gradient(135deg, #f472b6 0%, #FF6B81 100%)` | ProfileTabs.vue |
| `linear-gradient(180deg, #DFF8EF 0%, #F7FAF9 40%)` | NotLoggedProfile.vue |
| `linear-gradient(180deg, #E8F8F1 0%, #FFFFFF 100%)` | PublicHero.vue |
| `linear-gradient(180deg, #E8FBF2 0%, #C8EEDF 100%)` | MyStory.vue |
| `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.7) 100%)` | MyStory.vue |
| `linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 100%)` | PublicHero.vue |
| `linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(255,255,255,0.9) 100%)` | PublicHero.vue |
| `linear-gradient(180deg, rgba(15,23,42,0) 30%, ... 0.18 70%, ... 0.32 100%)` | index.vue |

### border-color 去重

| 值 | 出现次数 |
|----|---------|
| `#EEF1F5` / `#eef1f5` | ~5 |
| `#ECEFF2` | 2 |
| `#F0F3F2` | 1 |
| `#FFD3E0` | 1 |
| `#36C99A` | 3 |
| `#ffffff` | 2 |
| `#99f6e0` | 3 |
| `#f0f0f0` | 1 |
| `#E8F8F1` / `#e2e8f0` | 2 |
| `rgba(255, 255, 255, 0.6)` | 1 |
| `rgba(255, 255, 255, 0.4)` | 1 |

---

### 重点关注（纯硬编码，无 CSS 变量包裹）

1. **MyHeader.vue** — 21 处纯硬编码颜色，是 profile 模块中硬编码最密集的文件
2. **NotLoggedProfile.vue** — 22+ 处纯硬编码颜色 + 8 个 JS 常量颜色
3. **PublicIdentity.vue** — 15 处纯硬编码颜色
4. **RelationshipCTA.vue** — 16 处纯硬编码颜色 + 3 个 border-color
5. **CertBadgeRow.vue** — 3 组渐变全部纯硬编码（`#4f8ef7`, `#c9a36a`）
6. **CertDetailSheet.vue** — `.triple-dot--machine` (`#4f8ef7`) 和 `.triple-dot--chsi` (`#c9a36a`) 无 var 包裹
7. **GovernanceMenu.vue** — 6 处纯硬编码颜色
8. **PublicAction.vue** — 3 处纯硬编码颜色 + 2 个纯硬编码渐变
9. **PublicMoment.vue** — 6 处纯硬编码颜色
10. **MyStory.vue** — 10 处纯硬编码颜色 + 2 个纯硬编码渐变
