# 匹配卡片首屏体验打磨 Spec

## Why

当前匹配页（discover）已具备基础滑动与详情弹层，但用户反馈整体仍未达到"足够吸引人"的展示质感：卡片信息密度、滑动/拖动/点击/长按的状态反馈、进入应用首屏即见匹配页、以及从卡片到喜欢/聊天的完整闭环，都需要以更高的视觉与交互标准重新打磨，使卡片像展示物品一样具有吸引力。

## What Changes

- 将匹配页确立为应用启动后的默认首屏（TabBar 顺序 + 启动入口双重保证）。
- 重构 CardSwiper 卡片：强化照片展示、姓名、年龄、性格、收入、社交圈等信息的视觉层级。
- 优化手势交互状态：拖动倾斜回弹、左右滑动喜欢/跳过提示、点击展开详情、长按弹出快捷菜单，均有明确视觉/触觉反馈。
- 打磨 CardDetailOverlay：从卡片位置平滑展开至全屏居中，完整呈现用户主页、照片墙、社交圈、年龄、性格、收入、学校等信息。
- 确保喜欢/超级喜欢/跳过操作闭环，匹配成功后进入喜欢/聊天页面。
- 保证聊天页面（chat-session）文字与语音消息发送链路可用。
- 修复该链路中可能存在的图片路径、类型错误与未定义引用。

## Impact

- Affected specs: `verify-fix-swipe-likes-chat-flow`（在其集成修复基础上做体验增强）
- Affected code:
  - `apps/client/src/pages/discover/index.vue` - 首屏入口与匹配逻辑
  - `apps/client/src/components/discover/CardSwiper.vue` - 卡片视觉与手势交互
  - `apps/client/src/components/discover/CardDetailOverlay.vue` - 详情全屏展示
  - `apps/client/src/components/discover/LongPressMenu.vue` - 长按快捷菜单
  - `apps/client/src/custom-tab-bar/index.js` - Tab 顺序
  - `apps/client/src/config/navigation.ts` - Tab 配置
  - `apps/client/src/pages/chat-session/index.vue` - 文字/语音消息发送
  - `apps/client/src/stores/discover.ts` - 右滑/超级喜欢匹配逻辑
  - `apps/client/src/stores/likes.ts` - 喜欢列表联动

## ADDED Requirements

### Requirement: 匹配页作为应用首屏

系统在用户打开小程序后，SHALL 默认展示匹配页 `/pages/discover/index`，并确保 TabBar 第一项为"匹配"。

#### Scenario: 启动应用
- **WHEN** 用户打开小程序
- **THEN** 首先看到匹配卡片页，底部 TabBar 选中"匹配"

### Requirement: 卡片展示用户信息并具备展示质感

系统在匹配页 SHALL 以堆叠卡片形式展示推荐用户，卡片 SHALL 突出展示：姓名、照片/照片墙、年龄、性格标签、收入范围、共同兴趣圈/社交圈，整体视觉应具备物品展示般的质感。

#### Scenario: 浏览卡片
- **WHEN** 用户看到当前卡片
- **THEN** 卡片上半部分为主视觉区（照片/照片墙），下半部分叠加姓名、年龄、学校、认证、性格标签、收入、匹配度等信息，层次分明

### Requirement: 滑动/拖动交互状态反馈

系统在卡片被拖动时 SHALL 提供实时视觉反馈：卡片随手指移动、倾斜、达到一定阈值时显示喜欢/跳过提示；释放后根据位置决定是否飞出。

#### Scenario: 拖动卡片
- **WHEN** 用户按住卡片拖动
- **THEN** 卡片跟随手指并轻微旋转，向左显示"跳过"、向右显示"喜欢"标签，超过阈值后释放即飞出

### Requirement: 点击卡片进入详情

系统在用户点击当前卡片时 SHALL 从卡片当前位置平滑展开至全屏居中的详情页，展示更完整的用户信息。

#### Scenario: 点击卡片
- **WHEN** 用户轻点当前卡片
- **THEN** 详情页从卡片位置放大展开至屏幕中央，展示照片墙、详细资料、社交圈、操作按钮

### Requirement: 长按卡片调出快捷菜单

系统在用户长按当前卡片时 SHALL 弹出快捷操作菜单，提供举报、不感兴趣、分享等选项。

#### Scenario: 长按卡片
- **WHEN** 用户长按当前卡片超过 500ms
- **THEN** 弹出底部/中央快捷菜单，松手后保持显示，点击菜单项执行对应操作

### Requirement: 详情页支持喜欢与发消息

系统在详情页 SHALL 提供"喜欢""超级喜欢""跳过""发消息"按钮；点击"喜欢"/"超级喜欢"执行对应匹配操作，点击"发消息"进入聊天页。

#### Scenario: 详情页操作
- **WHEN** 用户在详情页点击"发消息"
- **THEN** 关闭详情页并导航到 `/pages/chat-session/index?userId={userId}`

### Requirement: 聊天页支持标准文字与语音消息

系统在 chat-session 页 SHALL 支持发送文字消息与语音消息，消息 SHALL 正常出现在聊天列表中。

#### Scenario: 发送文字
- **WHEN** 用户输入文字并点击发送
- **THEN** 消息发送成功并出现在列表，输入框清空

#### Scenario: 发送语音
- **WHEN** 用户切换到语音模式，长按"按住说话"录制 1-30 秒后松开
- **THEN** 语音消息以 `[语音消息 {duration}秒]` 或真实语音文件形式发送

## MODIFIED Requirements

### Requirement: 错误处理与提示

所有滑动、喜欢、发消息操作失败时，SHALL 通过 `uni.showToast` 给用户明确提示，禁止静默吞掉异常。

## REMOVED Requirements

无
