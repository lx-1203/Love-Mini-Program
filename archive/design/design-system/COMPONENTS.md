# 校园恋爱小程序 — Vue 组件库文档

## 概述

本文档定义了校园恋爱小程序的 Vue 组件库，基于 uni-app (Vue 3 + TypeScript) 技术栈，遵循清新活力的设计系统。

---

## 1. 通用组件 (common/)

### 1.1 Avatar — 头像组件

```vue
<template>
  <Avatar 
    :src="user.avatar" 
    :size="'large'" 
    :online="user.isOnline"
    :verified="user.isVerified"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `src` | `string` | `''` | 头像图片地址 |
| `size` | `'small' \| 'medium' \| 'large' \| 'xlarge'` | `'medium'` | 头像尺寸 |
| `online` | `boolean` | `false` | 是否显示在线状态点 |
| `verified` | `boolean` | `false` | 是否显示认证徽章 |

**尺寸规范：**
- `small`: 32px（聊天列表）
- `medium`: 48px（卡片内）
- `large`: 72px（个人资料）
- `xlarge`: 96px（个人资料头部）

---

### 1.2 Button — 按钮组件

```vue
<template>
  <Button 
    type="primary" 
    :loading="isLoading"
    @click="handleClick"
  >
    确认
  </Button>
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | `'primary' \| 'secondary' \| 'ghost' \| 'danger'` | `'primary'` | 按钮类型 |
| `size` | `'small' \| 'medium' \| 'large'` | `'medium'` | 按钮尺寸 |
| `loading` | `boolean` | `false` | 加载状态 |
| `disabled` | `boolean` | `false` | 禁用状态 |
| `block` | `boolean` | `false` | 是否占满宽度 |

**样式规范：**
- 主按钮：`--brand-400` 背景，白色文字，圆角 `--radius-full`
- 次按钮：`--brand-50` 背景，`--brand-600` 文字
- 幽灵按钮：透明背景，`--brand-400` 文字，1px `--brand-200` 边框
- 高度：48px（medium）

---

### 1.3 Card — 卡片组件

```vue
<template>
  <Card 
    :shadow="true" 
    :hoverable="true"
    @click="handleClick"
  >
    <template #header>
      <span>标题</span>
    </template>
    <template #default>
      <p>内容</p>
    </template>
  </Card>
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `shadow` | `boolean` | `true` | 是否显示阴影 |
| `hoverable` | `boolean` | `false` | 是否支持悬浮效果 |
| `bordered` | `boolean` | `true` | 是否显示边框 |

**样式规范：**
- 背景：白色 `#FFFFFF`
- 圆角：`--radius-md`（12px）
- 阴影：`--shadow-sm`
- 内边距：`--space-4`（16px）
- 悬浮态：`--shadow-md`，上移 2px

---

### 1.4 Tag — 标签组件

```vue
<template>
  <Tag 
    :type="'brand'" 
    :closable="true"
    @close="handleClose"
  >
    摄影
  </Tag>
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `type` | `'brand' \| 'pink' \| 'orange' \| 'success' \| 'warning'` | `'brand'` | 标签类型 |
| `closable` | `boolean` | `false` | 是否可关闭 |

**样式规范：**
- 圆角：`--radius-full`（药丸形）
- 内边距：`4px 12px`
- 字号：12px

---

### 1.5 EmptyState — 空状态组件

```vue
<template>
  <EmptyState 
    :icon="'chat'"
    :title="'暂无消息'"
    :description="'快去打个招呼吧'"
  >
    <template #action>
      <Button type="primary">开始寻觅</Button>
    </template>
  </EmptyState>
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `icon` | `string` | `'default'` | 图标类型 |
| `title` | `string` | `''` | 标题 |
| `description` | `string` | `''` | 描述文字 |

---

## 2. 布局组件 (layout/)

### 2.1 TabBar — 底部导航栏

```vue
<template>
  <TabBar 
    :tabs="tabs"
    :active="currentTab"
    @change="handleTabChange"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tabs` | `TabItem[]` | `[]` | Tab 配置数组 |
| `active` | `string` | `''` | 当前激活的 Tab |

**TabItem 类型：**
```typescript
interface TabItem {
  key: string;
  label: string;
  icon: string;
  badge?: number;
}
```

**样式规范：**
- 高度：56px（不含安全区）
- 图标大小：24px，选中时 28px
- 激活态：`--brand-400`
- 非激活态：`--gray-400`

---

### 2.2 NavBar — 顶部导航栏

```vue
<template>
  <NavBar 
    :title="'聊天'"
    :show-back="true"
    @back="handleBack"
  >
    <template #right>
      <Icon name="search" />
    </template>
  </NavBar>
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `title` | `string` | `''` | 标题 |
| `showBack` | `boolean` | `false` | 是否显示返回按钮 |
| `fixed` | `boolean` | `true` | 是否固定在顶部 |

**样式规范：**
- 高度：48px
- 背景：白色 + 底部 1px `--gray-200` 边框

---

## 3. 业务组件 (home/)

### 3.1 PersonCard — 用户卡片

```vue
<template>
  <PersonCard 
    :user="userData"
    :show-match-rate="true"
    @click="goToProfile"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `user` | `User` | - | 用户数据 |
| `showMatchRate` | `boolean` | `false` | 是否显示匹配度 |

**User 类型：**
```typescript
interface User {
  id: string;
  avatar: string;
  name: string;
  school: string;
  grade: string;
  tags: string[];
  matchRate?: number;
  isVerified: boolean;
}
```

---

### 3.2 ActivityCard — 活动卡片

```vue
<template>
  <ActivityCard 
    :activity="activityData"
    @click="goToDetail"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `activity` | `Activity` | - | 活动数据 |

**Activity 类型：**
```typescript
interface Activity {
  id: string;
  title: string;
  cover: string;
  date: string;
  location: string;
  participants: number;
}
```

---

### 3.3 WelcomeBanner — 欢迎横幅

```vue
<template>
  <WelcomeBanner 
    :greeting="'早安'"
    :username="username"
    :new-count="3"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `greeting` | `string` | `'你好'` | 问候语 |
| `username` | `string` | `''` | 用户名 |
| `newCount` | `number` | `0` | 新增人数 |

---

### 3.4 SocialProgress — 社交升温进度

```vue
<template>
  <SocialProgress 
    :progress="65"
    :steps="progressSteps"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `progress` | `number` | `0` | 进度百分比 |
| `steps` | `StepItem[]` | `[]` | 步骤配置 |

---

## 4. 聊天组件 (chat/)

### 4.1 ChatBubble — 聊天气泡

```vue
<template>
  <ChatBubble 
    :message="message"
    :is-sent="true"
    :show-avatar="true"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `message` | `Message` | - | 消息数据 |
| `isSent` | `boolean` | `false` | 是否为发送的消息 |
| `showAvatar` | `boolean` | `true` | 是否显示头像 |

**Message 类型：**
```typescript
interface Message {
  id: string;
  content: string;
  timestamp: string;
  avatar: string;
}
```

**样式规范：**
- 接收的消息：白色背景，左下角圆角 4px
- 发送的消息：`--brand-400` 背景，白色文字，右下角圆角 4px

---

### 4.2 IcebreakerSuggestions — 破冰建议

```vue
<template>
  <IcebreakerSuggestions 
    :suggestions="suggestions"
    @select="handleSelect"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `suggestions` | `string[]` | `[]` | 建议列表 |

---

### 4.3 HeartSignal — 心动信号

```vue
<template>
  <HeartSignal 
    :text="'你们互相喜欢了！'"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `text` | `string` | `''` | 信号文字 |

---

## 5. 发现组件 (discover/)

### 5.1 CardSwiper — 卡片滑动

```vue
<template>
  <CardSwiper 
    :cards="cardList"
    @swipe-left="handleSwipeLeft"
    @swipe-right="handleSwipeRight"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `cards` | `CardItem[]` | `[]` | 卡片数据列表 |

**CardItem 类型：**
```typescript
interface CardItem {
  id: string;
  avatar: string;
  name: string;
  age: number;
  school: string;
  bio: string;
  tags: string[];
  isVerified: boolean;
}
```

---

## 6. 校园组件 (campus/)

### 6.1 TopicCard — 话题卡片

```vue
<template>
  <TopicCard 
    :topic="topicData"
    @click="goToDetail"
    @like="handleLike"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `topic` | `Topic` | - | 话题数据 |

**Topic 类型：**
```typescript
interface Topic {
  id: string;
  author: {
    avatar: string;
    name: string;
  };
  title: string;
  content: string;
  category: 'course' | 'club' | 'activity' | 'study' | 'life' | 'alumni';
  images?: string[];
  likes: number;
  comments: number;
  time: string;
  isLiked: boolean;
}
```

---

### 6.2 CategoryTabs — 分类标签

```vue
<template>
  <CategoryTabs 
    :tabs="categoryTabs"
    :active="activeCategory"
    @change="handleCategoryChange"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `tabs` | `TabItem[]` | `[]` | 分类配置 |
| `active` | `string` | `''` | 当前激活分类 |

---

## 7. 社交组件 (social/)

### 7.1 WallPostCard — 动态卡片

```vue
<template>
  <WallPostCard 
    :post="postData"
    @like="handleLike"
    @comment="handleComment"
    @share="handleShare"
  />
</template>
```

**Props：**
| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `post` | `Post` | - | 动态数据 |

---

### 7.2 MatchGuideOverlay — 匹配引导浮层

```vue
<template>
  <MatchGuideOverlay 
    :visible="showGuide"
    @close="handleClose"
    @start="handleStart"
  />
</template>
```

---

## 8. 样式 Token 映射

所有组件使用统一的设计 Token，映射到 CSS 变量：

```scss
// 颜色
--brand-400: #2DD4BF;    // 主色
--pink-400: #F472B6;     // 辅助色
--gray-600: #475569;     // 正文色

// 间距
--space-4: 16px;         // 标准内边距

// 圆角
--radius-md: 12px;       // 卡片圆角

// 阴影
--shadow-sm: 0 2px 8px rgba(0,0,0,0.06);
```

---

## 9. 组件与页面映射

| 页面 | 使用的组件 |
|------|-----------|
| 首页 | Avatar, PersonCard, ActivityCard, WelcomeBanner, SocialProgress |
| 寻觅 | CardSwiper, PersonCard, Tag |
| 聊天 | Avatar, ChatBubble, IcebreakerSuggestions, HeartSignal |
| 校园 | TopicCard, CategoryTabs, Avatar |
| 个人资料 | Avatar, Button, Tag, MenuCard |
| 聊天详情 | Avatar, ChatBubble, IcebreakerSuggestions |
| 话题详情 | TopicCard, CommentItem, Button |
