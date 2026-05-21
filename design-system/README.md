# 校园恋爱小程序 - Design System

## 概述

本设计系统基于项目原有架构重构，全面采用 Design Tokens 驱动，实现零硬编码、全主题可切换的 UI 设计规范。

## 设计原则

1. **拒绝硬编码**：所有颜色、间距、圆角、阴影、动效均从 tokens 读取
2. **主题可切换**：支持 light / dark / warm 三种主题模式
3. **组件可复用**：所有组件支持变体（variant）与尺寸（size）扩展
4. **动效有温度**：所有交互元素均配备微动效，提升情感化体验

## 目录结构

```
design-system/
├── tokens.ts              # 设计令牌（色彩、字体、间距、动效等）
├── components/            # 可复用组件
│   ├── AppShell.vue       # 页面外壳（Header + TabBar）
│   ├── ChatBubble.vue     # 聊天气泡
│   ├── VoicePill.vue      # 语音消息胶囊
│   ├── BottomActionBar.vue# 底部操作栏
│   ├── StatusState.vue    # 状态标签
│   ├── SectionCard.vue    # 区块卡片
│   └── index.ts           # 统一导出
├── pages/                 # 页面设计稿
│   ├── HomePage.vue       # 首页
│   ├── ChatSessionPage.vue# 聊天详情页
│   ├── MatchPage.vue      # 匹配页
│   └── ProfilePage.vue    # 个人中心页
└── README.md              # 本文档
```

## 色彩系统

### 品牌色（天蓝色系）

> 设计演进：从珊瑚粉/薄荷青双主色（2026-05-18）调整为天蓝色系（2026-05-19），参考青藤之恋风格，降低恋爱压迫感，增强校园清新感。

#### 主色 Brand（天蓝）
| 色阶 | 色值 | 使用场景 |
|------|------|----------|
| 50  | `#E8F4FD` | 极浅背景、hover 底色 |
| 100 | `#C5E5F8` | 浅色背景、标签底色 |
| 200 | `#9DD4F3` | 次要装饰、进度条底色 |
| 300 | `#6CBFED` | 高亮文字、图标激活态 |
| **400** | **`#3B9DE5`** | **主品牌色，按钮、链接、核心图标** |
| 500 | `#2A8BD4` | 按钮按下态、深色强调 |
| 600 | `#1E77B8` | 深色背景、强调文字 |
| 700 | `#176194` | 深色装饰、阴影基调 |
| 800 | `#114D75` | 极深色、特殊强调 |
| 900 | `#0C3A58` | 最深色、文字反白底 |

#### 辅助色 Secondary（浅青）
| 色阶 | 色值 | 使用场景 |
|------|------|----------|
| 50  | `#E8F9FC` | 极浅背景、卡片底色 |
| 100 | `#C5F0F7` | 浅色背景、提示底色 |
| 200 | `#9DE4F0` | 次要装饰、分隔线 |
| 300 | `#6CD5E8` | 高亮文字、辅助图标 |
| **400** | **`#5BC0DE`** | **辅助主色，次级按钮、标签** |
| 500 | `#4AABC8` | 按钮按下态 |
| 600 | `#3D94AE` | 深色背景 |
| 700 | `#317A8F` | 深色装饰 |
| 800 | `#266172` | 极深色 |
| 900 | `#1C4A57` | 最深色 |

#### 强调色 Accent（暖橙）
| 色阶 | 色值 | 使用场景 |
|------|------|----------|
| 50  | `#FFF2E8` | 极浅背景、提示底色 |
| 100 | `#FFD9C5` | 浅色背景 |
| 200 | `#FFBF9D` | 次要装饰 |
| 300 | `#FFA36E` | 高亮文字 |
| **400** | **`#FF8C42`** | **强调主色，重要按钮、警示、匹配成功** |
| 500 | `#E87A35` | 按钮按下态 |
| 600 | `#D1682A` | 深色背景 |
| 700 | `#B35722` | 深色装饰 |
| 800 | `#8C451B` | 极深色 |
| 900 | `#6B3515` | 最深色 |

#### 使用规范
- **主色（Brand 400 `#3B9DE5`）**：用于主按钮、导航激活态、核心图标、链接文字、品牌标识
- **辅助色（Secondary 400 `#5BC0DE`）**：用于次级按钮、标签、辅助图标、信息提示
- **强调色（Accent 400 `#FF8C42`）**：用于重要操作（如匹配、喜欢）、警示状态、匹配成功动画、情感化点缀
- **语义色**：
  - Success `#3ECBB1` — 成功状态、通过标识
  - Warning `#FF8C42`（同 Accent 400）— 警告、待处理
  - Error `#E85A6E` — 错误、拒绝、失败
  - Info `#3B9DE5`（同 Brand 400）— 信息提示、引导

### 中性色
| 色阶 | 色值 | 使用场景 |
|------|------|----------|
| 0   | `#FFFFFF` | 纯白背景、卡片底色 |
| 50  | `#F7F9FC` | 页面背景、浅色底 |
| 100 | `#EEF1F6` | 分割线、边框、卡片背景 |
| 200 | `#DDE2EB` | 默认边框、分割线 |
| 300 | `#C4CBD8` | 强边框、禁用态边框 |
| 400 | `#9BA3B4` | 占位符文字、禁用态文字 |
| 500 | `#6E7687` | 三级文字、辅助说明 |
| 600 | `#4A5060` | 二级文字、副标题 |
| 700 | `#2D323E` | 深色背景、深色卡片 |
| **800** | **`#1A1D26`** | **一级文字、主标题** |
| 900 | `#0D0F14` | 极深色背景、遮罩底层 |

### 渐变预设
| 名称 | 渐变值 | 使用场景 |
|------|--------|----------|
| `brand` | `linear-gradient(135deg, #3B9DE5 0%, #5BC0DE 100%)` | 品牌渐变、欢迎区背景、头部背景 |
| `secondary` | `linear-gradient(135deg, #5BC0DE 0%, #6CD5E8 100%)` | 辅助渐变、次级卡片背景 |
| `warmCool` | `linear-gradient(135deg, #3B9DE5 0%, #5BC0DE 100%)` | 冷暖过渡、特殊活动页 |
| `sunset` | `linear-gradient(135deg, #FF8C42 0%, #3B9DE5 100%)` | 日落渐变、匹配成功、情感化场景 |

## 排版系统

| 层级 | 字号 | 用途 |
|------|------|------|
| Display | 48rpx | 超大标题（匹配成功） |
| H1 | 40rpx | 页面主标题 |
| H2 | 32rpx | 区块标题 |
| H3 | 28rpx | 卡片标题 |
| Body | 26rpx | 正文（基准） |
| Caption | 20rpx | 辅助说明 |
| Overline | 18rpx | 标签/角标 |

## 间距系统

基于 4rpx 的 8 点网格系统：
- `spacing[1]` = 4rpx
- `spacing[4]` = 16rpx
- `spacing[6]` = 24rpx

## 圆角系统

- `xs`: 4rpx — 小标签、输入框
- `lg`: 16rpx — 卡片、按钮
- `xl`: 20rpx — 大卡片、弹窗
- `full`: 9999rpx — 头像、胶囊按钮

## 动效系统

| 名称 | 时长 | 用途 |
|------|------|------|
| instant | 80ms | 颜色切换 |
| fast | 160ms | 按钮反馈、状态切换 |
| normal | 240ms | 页面过渡 |
| slow | 400ms | 卡片展开 |

## 主题切换

```typescript
import { getThemeTokens } from './tokens';

const lightTokens = getThemeTokens('light');
const darkTokens = getThemeTokens('dark');
const warmTokens = getThemeTokens('warm');
```

## 使用方式

### 1. 在组件中使用 Tokens

```vue
<script setup>
import { computed } from 'vue';
import { designTokens } from '../tokens';

const t = computed(() => designTokens);
</script>

<template>
  <view :style="{ color: t.color.text.primary, fontSize: `${t.typography.size.body}rpx` }">
    示例文本
  </view>
</template>
```

### 2. 使用预设组件

```vue
<template>
  <AppShell title="首页" current-tab="home">
    <SectionCard title="区块标题" variant="interactive" clickable>
      内容
    </SectionCard>
  </AppShell>
</template>
```

## 与现有项目的关系

本设计系统为独立文件夹，待评审通过后可按以下方式合并：

1. `tokens.ts` → 替换 `apps/client/src/theme/tokens.ts`
2. `components/*.vue` → 替换 `apps/client/src/components/*`
3. `pages/*.vue` → 替换 `apps/client/src/view-models/*`

## 青藤之恋差异化设计

参考青藤之恋核心功能架构，融入以下差异化元素：

| 功能 | 说明 |
|------|------|
| 学历认证徽章 | 个人资料展示青藤风格的学历徽章，增强可信度 |
| 兴趣图谱 | 以可视化方式展示兴趣标签关联，提升资料丰富度 |
| 恋爱测试 | 新增性格/恋爱观测试模块，增加互动趣味性 |
| 资料完成度 | 环形进度条展示，激励用户完善资料 |

## 设计文件归档体系

### 归档目的

设计文件归档体系用于保存每一次重大设计迭代的历史版本，确保设计决策可追溯、可对比、可回滚。每次归档包含完整的 Tokens、预览文件与说明文档，形成独立的设计快照。

### 目录结构

```
design-archive/
├── 2026-05-18/          # 初版设计（珊瑚粉系）
│   ├── preview.html     # 交互式预览页面
│   ├── tokens.ts        # 完整 Design Tokens
│   └── README.md        # 该版本设计说明
└── 2026-05-19/          # 天蓝色系重构
    ├── preview.html     # 交互式预览页面（天蓝色系版本）
    ├── tokens.ts        # 天蓝色系 Design Tokens
    └── README.md        # 该版本设计说明
```

### 归档规范

1. **归档时机**：每次重大视觉风格调整、品牌色变更、设计系统重构时创建新归档
2. **命名规则**：目录名使用 `YYYY-MM-DD` 格式，对应设计决策日期
3. **文件完整性**：每个归档目录必须包含 `preview.html`、`tokens.ts`、`README.md` 三个文件
   - `preview.html`：可独立打开的交互式预览页面，展示该版本所有组件与页面效果
   - `tokens.ts`：该版本完整的 Design Tokens，与 `design-system/tokens.ts` 结构一致
   - `README.md`：该版本的设计背景、主色调、设计特点、包含文件清单
4. **版本对比**：通过对比不同归档目录的 `tokens.ts`，可快速定位色彩、间距、圆角等设计参数的变更点
5. **回滚机制**：如需回退到历史版本，可将对应归档目录的 `tokens.ts` 复制到 `design-system/tokens.ts`

### 当前版本说明

- **当前活跃版本**：`design-system/` 目录下的文件为最新设计规范
- **最新归档**：`2026-05-19/` — 天蓝色系重构，参考青藤之恋风格
- **上一版本**：`2026-05-18/` — 珊瑚粉/薄荷青双主色初版设计

## 设计亮点总结

| 页面 | 亮点 |
|------|------|
| 首页 | 天蓝渐变欢迎区、时间轴课表、匹配度温度标签 |
| 聊天页 | 天蓝毛玻璃头部、环形倒计时、语音波形动画 |
| 匹配页 | 天蓝情绪化状态展示、进度动画、学历认证展示 |
| 个人中心 | 天蓝渐变头部、学历徽章、兴趣图谱、环形完成度 |
