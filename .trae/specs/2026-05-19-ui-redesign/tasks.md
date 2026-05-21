# Tasks

## Phase 1: 设计文件归档整理
- [x] Task 1: 创建 design-archive 目录结构并按时间归档现有设计文件
  - [x] SubTask 1.1: 创建 `design-archive/2026-05-18/` 存放初版设计（珊瑚粉系）
  - [x] SubTask 1.2: 创建 `design-archive/2026-05-19/` 存放当前天蓝色系设计
  - [x] SubTask 1.3: 为每个归档目录编写 README.md 记录设计说明与色值

## Phase 2: 天蓝色系 Design Tokens 重构
- [x] Task 2: 更新 `design-system/tokens.ts` 为天蓝色系
  - [x] SubTask 2.1: 定义天蓝色系色板（brand: #3B9DE5, secondary: #5BC0DE, accent: #FF8C42）
  - [x] SubTask 2.2: 更新中性色与文本色以适配新主题
  - [x] SubTask 2.3: 更新渐变预设与阴影色值
  - [x] SubTask 2.4: 更新 dark/warm 主题变体

## Phase 3: 组件库视觉重构
- [x] Task 3: 重构 AppShell 组件
  - [x] SubTask 3.1: Header 改为天蓝色渐变背景
  - [x] SubTask 3.2: TabBar 激活态改为天蓝色
- [x] Task 4: 重构 ChatBubble 组件
  - [x] SubTask 4.1: 自身消息气泡改为天蓝渐变
  - [x] SubTask 4.2: 系统消息改为冷暖双生渐变
- [x] Task 5: 重构 BottomActionBar / StatusState / SectionCard / VoicePill
  - [x] SubTask 5.1: 全部组件主色替换为天蓝色系
  - [x] SubTask 5.2: 增加青藤风格学历徽章变体

## Phase 4: 页面设计稿重构
- [x] Task 6: 重构 HomePage 设计稿
  - [x] SubTask 6.1: 欢迎区改为天蓝渐变
  - [x] SubTask 6.2: 时间轴圆点颜色更新
  - [x] SubTask 6.3: 推荐卡片增加兴趣图谱预览
- [x] Task 7: 重构 MatchPage 设计稿
  - [x] SubTask 7.1: 匹配状态区改为天蓝渐变
  - [x] SubTask 7.2: 匹配成功增加学历认证标识展示
- [x] Task 8: 重构 ChatSessionPage 设计稿
  - [x] SubTask 8.1: 聊天头部改为天蓝色
  - [x] SubTask 8.2: 输入区按钮颜色更新
- [x] Task 9: 重构 ProfilePage 设计稿
  - [x] SubTask 9.1: 个人头部改为天蓝渐变
  - [x] SubTask 9.2: 增加青藤风格学历徽章
  - [x] SubTask 9.3: 增加兴趣图谱可视化区块

## Phase 5: 交互式预览页面重构
- [x] Task 10: 重构 `design-preview/index.html`
  - [x] SubTask 10.1: 全局 CSS 变量更新为天蓝色系
  - [x] SubTask 10.2: 首页预览更新
  - [x] SubTask 10.3: 匹配页预览更新
  - [x] SubTask 10.4: 聊天页预览更新
  - [x] SubTask 10.5: 个人中心预览更新（含学历徽章与兴趣图谱）

## Phase 6: 设计规范文档更新
- [x] Task 11: 更新 `design-system/README.md`
  - [x] SubTask 11.1: 记录天蓝色系色值与使用规范
  - [x] SubTask 11.2: 记录青藤之恋差异化设计说明
  - [x] SubTask 11.3: 记录设计文件归档体系说明

# Task Dependencies
- Task 2 必须在 Task 3/4/5 之前完成
- Task 3/4/5 必须在 Task 6/7/8/9 之前完成
- Task 6/7/8/9 完成后才能进行 Task 10
- Task 11 可在 Task 10 之后并行完成
