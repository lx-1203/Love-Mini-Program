# 寻觅/匹配界面美化优化 - 技术设计文档

## 1. 架构概述

### 组件层级
```
discover/index.vue (页面)
├── FilterDrawer (不变)
├── CardSwiper (核心改动) ← 本次 P0
│   ├── CardDetailOverlay (样式微调) ← 本次 P1
│   └── LongPressMenu (不变)
└── HeartParticles (不变)

messages/index.vue (页面)
└── MatchGuideOverlay (样式重构) ← 本次 P3
```

### 技术栈
- Vue 3.4 + Uni-app (H5 / mp-weixin 双平台)
- SCSS scoped + CSS 自定义属性
- 设计令牌: `theme/tokens.ts` + `theme/design-variables.scss`
- 不使用 GSAP（本次纯 CSS 改动）

## 2. 数据模型 - 不变

`DiscoverCard` 接口不做任何改动。所有优化仅涉及视觉渲染层。

## 3. 接口设计 - 不变

所有组件的 props/emits 签名保持不变：
- CardSwiper: `props: cards, remainingCount` / `emits: swipe, superLike, videoTap, message`
- CardDetailOverlay: `props: visible, card` / `emits: close, like, superLike, pass, message`
- MatchGuideOverlay: `props: partnerName, partnerAvatar, icebreakers, commonCircles, activities, sessionId` / `emits: close, select-icebreaker, start-chat`

## 4. 前端设计

### 4.1 CardSwiper — 核心改动 (P0+P1)

#### 改动 1: 卡片遮罩减淡
**文件**: `CardSwiper.vue` 行 998-1013
```scss
// Before
.card__overlay {
  height: 72%;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.72) 0%,
    rgba(0, 0, 0, 0.42) 32%,
    rgba(0, 0, 0, 0.16) 58%,
    rgba(0, 0, 0, 0) 100%
  );
}

// After
.card__overlay {
  height: 55%;
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.45) 0%,
    rgba(0, 0, 0, 0.20) 45%,
    rgba(0, 0, 0, 0) 100%
  );
}
```

#### 改动 2: 卡片内容区简化
**文件**: `CardSwiper.vue` 模板 734-806 行

移除的行:
- `.card__key-info` 区域（3 个彩色 chip：收入/性格/社交圈）
- `.card__campus-tags` 区域（同校/同专业/匹配度%）

新增/调整:
- 匹配度 % 移至在线状态同级的右上角角标位置
- 学校/距离行保留
- 标签区精简为最多 3 个
- bio 简介默认 1 行

#### 改动 3: chip/tag 色彩统一
**文件**: `CardSwiper.vue` 样式

```scss
// 统一标签样式（替换 4n+1/2/3/4 色彩编码）
.tag-pill {
  background: rgba(255, 255, 255, 0.15);
  border: 1rpx solid rgba(255, 255, 255, 0.25);
  color: rgba(255, 255, 255, 0.9);
}

// 新增: 匹配度右上角角标
.card__match-badge {
  position: absolute;
  top: 28rpx;
  right: 28rpx;
  display: flex;
  align-items: center;
  gap: 4rpx;
  padding: 6rpx 14rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: var(--r-full);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  z-index: 4;
}
```

#### 改动 4: 操作按钮比例优化
**文件**: `CardSwiper.vue` 样式 1485-1562

```scss
.action-btn--reject {
  width: 104rpx;  // was 112rpx
  height: 104rpx; // was 112rpx
}

.action-btn--super {
  width: 88rpx;   // was 100rpx
  height: 88rpx;  // was 100rpx
}

.action-btn--like {
  width: 120rpx;  // was 136rpx
  height: 120rpx; // was 136rpx
  box-shadow:
    0 4rpx 24rpx rgba(236, 72, 153, 0.4),
    0 0 60rpx rgba(236, 72, 153, 0.15);
}
```

### 4.2 MatchGuideOverlay — 品牌色迁移 (P3)

所有 `#5B7FFF` / `#4C6EF5` / `rgba(91,127,255,...)` 替换为品牌绿系列：

| 原值 | 替换为 |
|------|--------|
| `#5B7FFF` | `var(--c-brand-500)` or `#3FCF8E` |
| `#4C6EF5` | `var(--c-brand-600)` or `#25A86C` |
| `rgba(91,127,255,0.15)` | `rgba(63,207,142,0.15)` |
| `rgba(91,127,255,0.25)` | `rgba(63,207,142,0.25)` |
| `#64748B` | `var(--c-text-secondary)` |
| `#F1F5F9` | `var(--c-bg-surface)` |
| `#E2E8F0` | `var(--c-neutral-200)` |
| `#ffffff` | `var(--c-bg-container)` |
| z-index `1000` | `var(--z-modal)` (400) or 500 |

额外优化:
- 头像占位改用渐变背景 + 首字（与卡片兜底一致）
- 破冰话题 chip 改用品牌绿渐变
- 兴趣圈 chip 圆角 + 成员数

### 4.3 CardDetailOverlay — 颜色令牌化 (P1)

| 位置 | 当前硬编码 | 替换 |
|------|-----------|------|
| `.detail-tag--2` border | `rgba(139,92,246,0.15)` | `rgba(139,92,246,0.15)` (保持，与 lavender 对齐) |
| `.detail-tag--3` border | `rgba(249,115,22,0.15)` | `rgba(249,115,22,0.15)` (保持，与 apricot 对齐) |
| `.detail-hero__gradient` | hardcoded rgba(0,0,0,...) | 与 CardSwiper overlay 同步，使用相同柔和渐变 |
| 顶部 bar 渐变 | `rgba(255,255,255,0.95...)` | 保持（白色渐变，H5 端合理） |

### 4.4 discover/index.vue — 最小改动 (P2)

- 签到卡片 + 每日一问区域：不做此次修改（已是独立的功能入口，改动风险大）
- 仅确保 CardSwiper 改动后页面布局正常

## 5. 文件变更清单

| # | 文件 | 操作 | 说明 |
|---|------|------|------|
| 1 | `CardSwiper.vue` | 修改 | 遮罩减淡、移除彩色 chip 行、移除 campus-tag 行、统一标签色、匹配度右上角角标、按钮比例 |
| 2 | `MatchGuideOverlay.vue` | 修改 | 全量品牌色替换、头像占位优化、样式令牌化 |
| 3 | `CardDetailOverlay.vue` | 修改 | hero gradient 与 CardSwiper 同步、令牌化 |

## 6. 技术决策与权衡

| 决策 | 理由 |
|------|------|
| 不新增组件 | 改动范围控制在现有组件，避免增加复杂度 |
| 不改 props/emits | 保证向后兼容，不影响 discover/index.vue 和 messages/index.vue |
| 不修改 discover/index.vue 签到区 | 签到/每日一问是独立功能模块，本次聚焦卡片核心体验 |
| 保留 CardDetailOverlay 的兴趣圈多彩色 | 详情页需要区分不同兴趣圈类别，保持微妙的色彩区分合理 |
| 匹配度角标不上移太远 | 避免与在线状态/视频角标冲突 |
| 不使用 backdrop-filter 在 mp-weixin | 微信小程序不支持，已有条件编译处理 |
