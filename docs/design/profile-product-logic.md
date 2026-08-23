# 寻觅个人主页产品逻辑与结构 2.0

## 1. 核心定位
- 他人视角：让别人快速判断“这个人值不值得认识”。
- 自己视角：管理自己的吸引力与曝光，不是资料展示。

## 2. 信息分层
1. 吸引层：Hero 大图、一句话介绍、兴趣、共同点、最近动态。
2. 了解层：身高、学历、职业、MBTI、兴趣圈、价值观。
3. 深聊层：语音、故事、私密动态（互动后解锁）。

## 3. 双视角架构
- `PublicProfile`：展示魅力、促进喜欢和聊天。
- `MyProfile`：管理资料完整度、数据统计、故事/动态、设置入口。
- 共享组件：`Hero / Identity / Interest / Gallery / Story / Action`，不共享页面级分支判断。

## 4. 页面组装
### 他人主页
Hero → Identity → Action → Intro → Interest → Common → Gallery → Story

### 我的主页
OwnerHero → 完善度 → 数据统计 → 我的故事 → 我的动态 → 设置

## 5. 数据模型
统一 `UserProfileDTO`：
- basic: name/avatar/age/location
- identity: verified/student
- intro: bio/tags
- relationship: goal/expectation
- media: cover/photos/videos
- socialProof: likedMeCount/likesCount/visitorCount/matchCount
- relation: liked/matched/commonInterests
- posts: 最近动态

## 6. 交互流程
- 进入他人主页 → 加载 Hero → 展示吸引力 → 共同兴趣 → 喜欢/打招呼/心动卡 → 进入消息。
- 进入我的主页 → 查看完成度 → 补充资料 → 后端重新计算推荐权重 → 提高曝光。

## 7. 视觉规范
见 `docs/profile-design-spec.md`：Mint Glassmorphism、#35C99A、#FF6B91、#F7FAF9、20-24px 圆角、玻璃拟态。
