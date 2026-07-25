# 寻觅/匹配界面美化优化 - 需求文档

## 1. 功能概述

对"寻觅"（discover）页面的卡片推荐界面进行全面的视觉美化优化，解决当前界面色彩混乱、信息密度过高、遮罩过暗、组件风格不统一等问题，打造更清爽、更具质感、视觉语言统一的滑动匹配体验。

## 2. 用户故事

| 序号 | 用户故事 |
|------|----------|
| US-1 | **作为** 大学生用户，**我希望** 卡片上的照片更明亮清晰，**以便** 看清对方的样貌和细节 |
| US-2 | **作为** 大学生用户，**我希望** 卡片信息区简洁易读，**以便** 快速了解对方基本信息 |
| US-3 | **作为** 大学生用户，**我希望** 整体配色和谐统一，**以便** 使用感受舒适不杂乱 |
| US-4 | **作为** 大学生用户，**我希望** 操作按钮大小协调，**以便** 直觉地做出喜欢/跳过的选择 |
| US-5 | **作为** 大学生用户，**我希望** 匹配成功弹窗美观有仪式感，**以便** 对匹配产生期待和兴奋感 |

## 3. 验收标准

### US-1: 卡片照片更明亮
- Given 用户在发现页看到推荐卡片，When 卡片渲染完成，Then 卡片底部渐变遮罩从 72% 不透明度降至 ≤45%
- Given 用户看到卡片内容区，When 文字叠加在照片上，Then 文字依然清晰可读

### US-2: 卡片信息区简洁
- Given 卡片数据包含收入/性格/圈子信息，When 卡片渲染，Then 这 3 个彩色 chip 不再显示，信息精简为普通标签
- Given 卡片数据包含同校/同专业标签，When 卡片渲染，Then campus-tag 行移除

### US-3: 色彩统一
- Given discover 页面所有组件，When 页面渲染，Then 所有 chip/按钮/角标使用品牌绿 `#3FCF8E` 或白色半透明风格
- Given 标签 pill 渲染，When 有多个标签，Then 全部统一为白色半透明 + 细白边框风格（移除 4n+1/2/3/4 色彩编码）

### US-4: 操作按钮协调
- Given 卡片下方的操作栏，When 渲染，Then 按钮比例为 reject:super-like:like = 104:88:120 (rpx)
- Given like 按钮，When 渲染，Then 带有精致的粉色发光阴影

### US-5: 匹配成功弹窗美观
- Given MatchGuideOverlay 在匹配后打开，When 渲染，Then 主色使用品牌绿 `#3FCF8E` 而非 `#5B7FFF` 蓝紫色
- Given 弹窗内容，When 渲染，Then 背景/边框/文字/阴影均使用设计令牌

## 4. 非功能性需求

- **平台兼容性**: H5 和 mp-weixin 双平台一致体验
- **性能**: 不因样式改动影响卡片滑动流畅度（60fps）
- **可维护性**: 减少硬编码颜色，优先使用 CSS 变量/设计令牌
- **渐进改动**: 不改动 props/emits 接口，不影响父组件 discover/index.vue 和 messages/index.vue

## 5. 影响范围

### 核心改动文件 (4 个)

| 文件 | 改动类型 | 影响程度 |
|------|----------|----------|
| `apps/client/src/components/discover/CardSwiper.vue` | 模板 + 样式修改 | 高 |
| `apps/client/src/components/social/MatchGuideOverlay.vue` | 样式全面重构 | 高 |
| `apps/client/src/components/discover/CardDetailOverlay.vue` | 样式微调 | 中 |
| `apps/client/src/pages/discover/index.vue` | 样式微调 | 低 |

### 间接影响文件 (0 个)

| 文件 | 说明 |
|------|------|
| `apps/client/src/pages/messages/index.vue` | 使用 MatchGuideOverlay，但仅传入 props，不改接口 |
| `apps/client/src/stores/discover.ts` | 不改动数据模型 |

### 不影响的部分
- 手势交互逻辑 (touchstart/touchmove/touchend)
- 飞出/入场动画系统
- DiscoverCard 数据接口
- Props/Emits 签名（所有组件保持接口不变）
- FilterDrawer / LongPressMenu 组件
- API 层和后端
