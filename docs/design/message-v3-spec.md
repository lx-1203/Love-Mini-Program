# 寻觅消息模块 V3 产品设计契约

> 本文件是「消息模块 V3」唯一产品设计来源，实现前必须先更新本文件。
> 关联系统：`docs/design/v3.1-contract.md` 第 04、09 节。

## 1. 设计目标
消息页从“微信式收件箱”升级为“恋爱关系推进中心”：用户进入后知道“今天应该推进谁、用什么动作推进”，而不是只浏览聊天记录。

## 2. 页面结构

### 2.1 消息首页
动态顺序：
- 有正在升温：`正在升温` → `今日心动` → `寻觅助手` → `最近聊天`
- 无正在升温：`今日心动` → `推荐认识的人` → `寻觅助手` → `最近聊天`

### 2.2 普通聊天页
`顶部导航` → `关系状态区` → `消息流` → `恋爱输入区`

### 2.3 寻觅助手会话页
`顶部导航（返回 + 助手头像 + 寻觅助手/你的恋爱小管家 + ...）` → `助手消息流`（text + 活动卡）。v1 只读，不做用户回复。

## 3. 设计 Token
- Primary `#34C98A`、浅绿 `#E8F8F1`、页面背景 `#F7FAF9`
- 主文字 `#222222`、次文字 `#666666`、辅助 `#999999`
- Love `#FF6891`
- 关系标签：刚认识 `#8A9694`，聊天中 `#3CC99A`，暧昧中 `#FF6891`，互相关注 `#3CC99A`

## 4. 关系数据模型
```ts
interface RelationshipInfo {
  status: "just_met" | "chatting" | "ambiguous" | "mutual_follow";
  score: number;
  lastInteractionTime: string | null;
  commonInterests: string[];
  commonActivities: number;
  suggestedAction: SuggestedAction;
}

interface SuggestedAction {
  type: "reply" | "invite" | "view_profile";
  text: string;
  targetUrl?: string;
  reason?: string;
}
```

## 5. 关系分数算法
| 信号 | 权重 | 计算 |
| --- | --- | --- |
| messageCount | 20 | min(count/50,1)*20 |
| conversationDays | 15 | min(days/7,1)*15 |
| avgReplyTime | 10 | <=30m=10; <=120m=7; <=720m=4; else 0 |
| mutualLike | 20 | 双向喜欢=20 |
| activityTogether | 15 | 共同活动=15 |
| profileViewCount | 5 | min(views/5,1)*5 |
| voiceMessageCount | 5 | min(voice/3,1)*5 |
| photoShareCount | 10 | min(photo/3,1)*10 |

映射：`0-20 just_met`，`21-50 chatting`，`51-80 ambiguous`，`81-100 mutual_follow`。

## 6. 建议动作生成
- 最近互动为空或超过 48h：`reply`「发一句问候」
- 有共同兴趣且无共同活动：`invite`「邀请参加一场共同兴趣活动」
- 无主页访问：`view_profile`「看看 TA 最新动态」
- 否则：`reply`「继续聊天」
- 有共同兴趣时 reply 文案优先「一起聊聊{兴趣}？」

## 7. 消息首页聚合接口
`GET /api/v1/messages/relationship-dashboard`

返回：
- `todayHeart`: likedMeCount / waitingReplyCount / warmingCount
- `assistant`: 3 条主动建议
- `warmPeople`: Top 8
- `recommendedPeople`: 新用户冷启动 Top 6
- `recentChats`: 普通会话列表

## 8. 组件清单
- `components/relationship/`：`RelationshipTag`、`SuggestedAction`
- `components/message/`：`MessageHeader`、`TodayHeartSection`、`AssistantCard`、`WarmPeopleCarousel`、`ConversationItem`
- `components/chat/`：`ChatBubble`（扩展 assistant）、`ActivityCard`、`ChatInput`

## 9. 状态
- 空态：推荐认识的人兜底，不空屏。
- 加载态：Skeleton。
- 错误态：ErrorState + 重试。
- 未读态：`#FF6891` 数字 Badge。
- 匹配/活动提醒：由寻觅助手建议和活动卡承载。

## 10. 体验账号演示路径
进入消息页 → 看到正在升温/今日心动/寻觅助手 → 点击正在升温建议动作 → 进入聊天 → 顶部关系状态 → 发送快捷回复。

## 11. 素材映射（素材\消息\2 + 素材\消息\2\2）
- 基础图标：assistant_avatar / heart / like_notice / official / send_heart / voice / location / calendar / online
- 扩展素材：avatar/avatar-ring、avatar/online、card/card-base、gallery/photo-placeholder、hero/hero-gradient-bg、icon/add、icon/heart、interest/common-interest-bg、match/match-progress、story/story-empty
- 全部复制到 `apps/client/src/static/assets/message/svg/`，并在 `config/images.ts` 的 `MESSAGE_ICONS` 注册。
