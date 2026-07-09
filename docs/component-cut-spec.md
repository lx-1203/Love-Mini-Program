# 组件切分规范 · Component Cutting Spec

> 适用于 AI 高保真页面 → 组件化 → 前端还原的完整流程

---

## 切分原则

### 1. 三级切分结构

```
页面级 (Page)
  └── 模块级 (Section)
       └── 组件级 (Component)
```

### 2. 可复用性优先

- 同一类组件只切一次
- 变体用 props 控制，不重复切图
- 按钮、标签、头像等原子组件必须独立

### 3. 状态完整性

每个组件必须覆盖以下状态（如适用）：
- Default（默认态）
- Hover/Active（交互态）
- Disabled（禁用态）
- Empty（空状态）
- Loading（骨架屏）
- Error（错误态）

---

## 切分清单

### 登录页 (Login Page)

| 层级 | 组件名 | 尺寸参考 | 状态数 | uni-app 组件 |
|------|--------|---------|--------|-------------|
| 页面 | LoginPage | 750×1624rpx | 1 | `pages/login/index` |
| 模块 | LoginHeader | 750×400rpx | 1 | 内联 |
| 组件 | LoginLogo | 144×144rpx | 1 | `components/login/LoginLogo.vue` |
| 组件 | LoginIllustration | 400×320rpx | 1 | `components/login/LoginIllustration.vue` |
| 组件 | WechatLoginButton | 686×88rpx | 3 (default/hover/disabled) | `components/login/WechatBtn.vue` |
| 组件 | PhoneLoginButton | 686×88rpx | 3 | `components/login/PhoneBtn.vue` |
| 组件 | TermsText | 自适应 | 1 | `components/login/TermsText.vue` |

### 首页 (Home Feed)

| 层级 | 组件名 | 尺寸参考 | 状态数 | uni-app 组件 |
|------|--------|---------|--------|-------------|
| 页面 | HomePage | 750×1624rpx | 1 | `pages/home/index` |
| 模块 | HomeHeader | 750×88rpx | 1 | `components/layout/HomeHeader.vue` |
| 模块 | WelcomeBanner | 712×200rpx | 3 (有课/无课/周末) | `components/home/WelcomeBanner.vue` |
| 模块 | ActivityScroll | 750×260rpx | 2 (有数据/空) | `components/home/ActivityScroll.vue` |
| 组件 | ActivityCard | 480×240rpx | 2 (default/hover) | `components/home/ActivityCard.vue` |
| 模块 | PeopleScroll | 750×220rpx | 2 (有数据/空) | `components/home/PeopleScroll.vue` |
| 组件 | PersonCard | 320×240rpx | 2 (default/hover) | `components/home/PersonCard.vue` |
| 模块 | WallSection | 712×自适应 | 2 (有数据/空) | `components/home/WallSection.vue` |
| 组件 | WallPostCard | 712×自适应 | 2 (展开/收起) | `components/social/WallPostCard.vue` |
| 组件 | TabBar | 750×98rpx | 5 (每个tab) | `components/layout/TabBar.vue` |

### 聊天页 (Chat List)

| 层级 | 组件名 | 尺寸参考 | 状态数 | uni-app 组件 |
|------|--------|---------|--------|-------------|
| 页面 | ChatListPage | 750×1624rpx | 1 | `pages/chat/index` |
| 模块 | ChatHeader | 750×88rpx | 1 | `components/layout/ChatHeader.vue` |
| 模块 | HeartSignalBanner | 712×100rpx | 2 (有信号/无信号) | `components/chat/HeartSignal.vue` |
| 组件 | ChatListItem | 750×120rpx | 4 (未读/已读/pin/匹配) | `components/chat/ChatItem.vue` |
| 组件 | Avatar | 104×104rpx | 3 (在线/离线/无头像) | `components/common/Avatar.vue` |
| 组件 | UnreadBadge | 自适应 | 2 (数字/点) | `components/common/UnreadBadge.vue` |

---

## 原子组件（跨页面复用）

| 组件名 | 用途 | 变体 |
|--------|------|------|
| `Avatar` | 用户头像 | xs(40px)/sm(52px)/md(64px)/lg(80px) |
| `Tag` | 兴趣标签 | gray/blue/pill/topic/cert |
| `Button` | 按钮 | primary/outline/ghost/wechat |
| `Badge` | 未读/状态角标 | red/blue/dot |
| `Card` | 通用卡片 | default/interactive/gradient |
| `SectionHeader` | 区块标题 | with-more/with-badge |
| `Skeleton` | 骨架屏 | card/list/avatar |
| `EmptyState` | 空状态 | no-data/no-match/no-chat |
| `ErrorState` | 错误态 | network/server |

---

## Token 对应关系

切分后的组件样式必须从 `design-system/tokens.ts` 引用，禁止硬编码。

```typescript
// 示例：Avatar 组件
const t = designTokens;
const size = t.component.avatar[size]; // 40/52/64/80/120
const radius = t.radius.full;          // 9999
const border = `2px solid ${t.color.brand[100]}`;
const shadow = t.shadow.sm;
```

---

## 生成 → 切分 → 开发流程

```
AI 生成高保真页面（HTML/Figma）
    ↓
按本规范切分组件清单
    ↓
为每个组件编写 uni-app Vue 3 组件
    ↓
组件引用 tokens.ts 中的设计 Token
    ↓
添加状态切换（hover/active/disabled）
    ↓
添加骨架屏/空状态/错误状态
    ↓
动效补全（过渡动画/微交互）
    ↓
开发完成
```
