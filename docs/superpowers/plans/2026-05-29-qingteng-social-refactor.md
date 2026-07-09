# 青藤之恋对标 · 社交体验深化与校园差异化重构计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking。

**Goal:** 以青藤之恋为功能基底，补齐社交升温路径闭环、校园社交差异化、智能回流留存三大核心能力，实现用户引流效率提升与停留时间延长。

**Architecture:** 在现有 Spring Boot + uni-app (Vue 3) 架构上叠加社交体验层。后端新增 CampusController 暴露校园 API、增强推荐算法同校加权、实现微信订阅消息推送；前端新增社交升温引导流、校园专区页面、破冰私信集成、村口互动增强。所有新功能通过独立路由和独立 Store 实现，不修改现有核心链路。

**Tech Stack:** Spring Boot (Java) + uni-app (Vue 3 + Pinia + TS) + MySQL 8.0 + Flyway + Spring WebSocket + 微信小程序订阅消息 API

---

## 第一部分：研究报告

### 一、参考内容（青藤之恋）深度功能分析

青藤之恋的核心竞争力不在于功能数量，而在于其 **社交升温路径设计**——将用户从"陌生人"渐进引导至"深度关系"：

```
┌─────────────────────────────────────────────────────────────┐
│                    青藤之恋社交升温漏斗                        │
├──────────┬──────────────────┬───────────────────────────────┤
│ 层级      │ 功能载体           │ 社交深度                       │
├──────────┼──────────────────┼───────────────────────────────┤
│ L1 曝光层 │ 卡片滑动/每日推荐    │ 单向表达兴趣，无回馈压力         │
│ L2 关注层 │ 喜欢/访客/超级喜欢   │ 单向到双向过渡，产生社交期待       │
│ L3 匹配层 │ 心动信号/倒计时      │ 双向确认，紧迫感促进行动          │
│ L4 沟通层 │ 私信/临时匿名聊天     │ 双向实时交流，建立初步信任         │
│ L5 圈子层 │ 村口/兴趣圈/每日一问  │ 群体互动，扩展社交半径            │
│ L6 场景层 │ 线下活动/校园场景     │ 线下见面，关系落地               │
└──────────┴──────────────────┴───────────────────────────────┘
```

**关键发现**：青藤之恋的每一个功能都不是孤立的，而是作为社交升温漏斗的一个环节。用户的每一步操作都在为下一层级做铺垫。

### 二、当前项目 vs 青藤之恋 · 功能对等性审计

经过对代码库的全面审计（44张数据表、22+控制器、17个前端Store、10+页面），**当前项目已实现青藤之恋约85%的核心功能**：

| 功能模块 | 实现状态 | 后端实体 | 前端页面/Store | 与青藤对比 |
|---------|---------|---------|--------------|----------|
| 卡片滑动推荐 | ✅ 完整 | RecommendationPreference | discover/index.vue + discover.ts | 功能对等 |
| 喜欢/访客 | ✅ 完整 | Like, Visitor | likes/index.vue + likes.ts | 功能对等 |
| 心动信号 | ✅ 完整 | HeartSignal | messages/index.vue + messages.ts | 功能对等 |
| 村口社区(6分类) | ✅ 完整 | Post, PostTag, PostCategory | village/index.vue + village.ts | 功能对等 |
| 私信/WebSocket | ✅ 完整 | PrivateConversation, PrivateMessage | chat/ + chat.ts | 功能对等 |
| 临时匿名聊天 | ✅ 完整 | TempChatSession, TempChatMessage | chat-session/ + session.ts | 功能对等 |
| 兴趣圈 | ✅ 完整 | InterestCircle, CircleTopic, CircleReply | circles/ + circle.ts | 功能对等 |
| 每日一问 | ✅ 完整 | DailyQuestion, DailyAnswer | daily-question/ + daily-question.ts | 功能对等 |
| 签到+权益 | ✅ 完整 | CheckIn, DailyBenefit | discover/index.vue + checkin.ts | 功能对等 |
| 活动 | ✅ 完整 | Activity, ActivityEnrollment | activities/ + activity.ts | 功能对等 |
| 推荐算法(加权) | ✅ 完整 | RecommendationPreference | 同校+50, 同城+20, 兴趣+10, 专业+20 | 功能对等 |
| 社交升温进度 | ✅ 完整 | SocialProgress | SocialProgressIndicator.vue + social-progress.ts | 功能对等 |
| 校园认证 | ✅ 完整 | CampusCertification | campus/index.vue + campus.ts | 功能对等 |
| 校园话题(6分类) | ✅ 完整 | CampusTopic, CampusTopicReply | campus/index.vue + campus.ts | 功能对等 |
| 破冰话题 | ✅ 完整 | IcebreakerTopic | IcebreakerSuggestions.vue + chat.ts | 功能对等 |
| 互动通知(社交/内容) | ✅ 完整 | Notification, InteractionEvent | messages/index.vue + messages.ts | 功能对等 |
| 推送偏好 | ✅ 完整 | PushPreference, PushSummary | 仅后端 | **缺失前端** |
| 帖子话题标签 | ✅ 完整 | PostTag | village/index.vue | 功能对等 |
| 敏感词过滤 | ✅ 完整 | SensitiveWordFilter | 后端服务层 | 功能对等 |

### 三、差异化差距分析：当前缺失的核心能力

| 差距维度 | 青藤之恋 | 当前项目 | 差距类型 | 优化方向 |
|---------|---------|---------|---------|---------|
| **社交升温路径UI** | 有明确的6层漏斗+每层转化引导 | 后端已实现，前端仅展示进度条，缺乏转化引导 | **P0** | 增加每层转化引导UI |
| **校园社交专区** | 无校园属性 | 后端CampusService已实现但**无REST Controller暴露** | **P0** | 新增CampusController |
| **匹配后引导链** | 匹配→破冰→兴趣圈→活动推荐 | 后端支持但前端缺乏串联引导 | **P0** | 匹配成功后智能引导流 |
| **微信推送通知** | 服务通知推送 | PushPreference/PushSummary实体已存在，无实际推送 | **P1** | 集成微信订阅消息API |
| **"你可能认识"推荐** | 基于同校/同专业/共同兴趣 | 后端推荐算法已支持，但无独立端点 | **P1** | 新增推荐端点 |
| **私信破冰集成** | 输入框破冰话题建议 | IcebreakerSuggestions组件存在，需验证集成 | **P1** | 验证并增强集成 |
| **签到权益实际使用** | 签到解锁额外配额 | DailyBenefit实体已存在，前端未使用权益 | **P1** | 前端接入签到权益 |
| **帖子详情→相似作者** | 帖子底部推荐相似用户 | 后端`/posts/{id}/similar-authors`已存在 | **P2** | 前端集成 |

### 四、核心结论

**当前项目已完成青藤之恋约85%的功能对等性**，主要差距不在功能缺失，而在以下三个方面：

1. **后端能力未暴露**：CampusService有完整实现但无REST Controller
2. **前端串联不足**：各功能独立存在，缺乏社交升温路径的引导串联
3. **推送能力未集成**：实体层已就绪，需接入微信订阅消息API

---

## 第二部分：实施计划

### Task 1: 新增 Campus REST Controller

**目标**: 将已有的 CampusService 能力通过 REST API 暴露给前端

**Files:**
- Create: `apps/api/src/main/java/com/campuslove/api/campus/CampusController.java`
- Modify: `apps/client/src/stores/campus.ts` (接入真实API)

- [ ] **Step 1: 创建 CampusController**

```java
package com.campuslove.api.campus;

import com.campuslove.api.config.SecurityUtils;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/campus")
@Profile("real")
public class CampusController {

    private final CampusService campusService;
    private final CampusCertificationService certService;

    public CampusController(CampusService campusService, CampusCertificationService certService) {
        this.campusService = campusService;
        this.certService = certService;
    }

    // ── 校园话题 ──

    @GetMapping("/topics")
    public List<CampusTopicView> listTopics(
            @RequestParam(required = false) String category,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        return campusService.listTopics(userId, category, page, size);
    }

    @GetMapping("/topics/{id}")
    public CampusTopicView getTopic(@PathVariable Long id) {
        Long userId = SecurityUtils.getCurrentUserId();
        return campusService.getTopic(userId, id);
    }

    @PostMapping("/topics")
    public CampusTopicView createTopic(@RequestBody CreateCampusTopicRequest req) {
        Long userId = SecurityUtils.getCurrentUserId();
        return campusService.createTopic(userId, req);
    }

    @GetMapping("/topics/{id}/replies")
    public List<CampusTopicReplyView> listReplies(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        return campusService.listReplies(userId, id, page, size);
    }

    @PostMapping("/topics/{id}/replies")
    public CampusTopicReplyView createReply(
            @PathVariable Long id,
            @RequestBody CreateCampusReplyRequest req) {
        Long userId = SecurityUtils.getCurrentUserId();
        return campusService.createReply(userId, id, req);
    }

    // ── 校园认证 ──

    @GetMapping("/certification")
    public CampusCertificationView getCertification() {
        Long userId = SecurityUtils.getCurrentUserId();
        return certService.getCertification(userId);
    }

    @PostMapping("/certification")
    public CampusCertificationView submitCertification(@RequestBody CampusCertificationRequest req) {
        Long userId = SecurityUtils.getCurrentUserId();
        return certService.submitCertification(userId, req);
    }

    // ── 校园聚合动态 ──

    @GetMapping("/feed")
    public CampusFeedView getCampusFeed(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Long userId = SecurityUtils.getCurrentUserId();
        return campusService.getCampusFeed(userId, page, size);
    }
}
```

- [ ] **Step 2: 创建请求/响应 DTO**

在 `apps/api/src/main/java/com/campuslove/api/campus/` 下创建：
- `CreateCampusTopicRequest.java`
- `CreateCampusReplyRequest.java`
- `CampusCertificationRequest.java`
- `CampusFeedView.java`

- [ ] **Step 3: 前端 campus Store 接入真实 API**

修改 `apps/client/src/stores/campus.ts`，在 mock/real 分支中，real 分支调用 `/api/campus/*` 端点。

- [ ] **Step 4: 验证 Campus 页面功能**

运行后端，切换到 real 模式，验证校园话题列表、发帖、回复、认证、聚合动态功能。

---

### Task 2: 社交升温路径 · 前端转化引导增强

**目标**: 在现有 SocialProgressIndicator 基础上，增加每层转化引导 UI

**Files:**
- Modify: `apps/client/src/components/social/SocialProgressIndicator.vue`
- Modify: `apps/client/src/pages/discover/index.vue`
- Modify: `apps/client/src/pages/messages/index.vue`
- Modify: `apps/client/src/pages/profile/index.vue`

- [ ] **Step 1: 增强 SocialProgressIndicator 组件**

在现有进度条基础上，为每个层级增加"下一步行动指引"卡片：

```vue
<!-- 在 SocialProgressIndicator.vue 的进度条下方增加 -->
<view v-if="nextAction" class="next-action-card">
  <view class="action-icon">{{ nextAction.icon }}</view>
  <view class="action-content">
    <text class="action-title">{{ nextAction.title }}</text>
    <text class="action-desc">{{ nextAction.description }}</text>
  </view>
  <button class="action-btn" @click="navigateToAction">
    {{ nextAction.buttonText }}
  </button>
</view>
```

根据 `currentTier` 显示不同的行动指引：
- L1 → "去寻觅，发现心动的人" → 跳转寻觅页
- L2 → "表达喜欢，等待回应" → 跳转寻觅页
- L3 → "查看心动信号，开启对话" → 跳转消息页
- L4 → "加入兴趣圈，认识更多人" → 跳转兴趣圈
- L5 → "参加线下活动，迈出最后一步" → 跳转活动页

- [ ] **Step 2: 寻觅页增加升温提示**

在 `discover/index.vue` 的卡片区域底部，当用户完成一轮滑动后，展示"你已浏览 N 人，快去查看谁喜欢了你"的引导条。

- [ ] **Step 3: 消息页增加升温入口**

在 `messages/index.vue` 的顶部区域，增加社交升温进度的迷你展示（当前层级图标 + 进度百分比），点击展开完整进度。

- [ ] **Step 4: 验证升温路径完整性**

端到端测试：新用户 → 滑动卡片 → 喜欢 → 匹配 → 私信 → 加入兴趣圈 → 参加活动，验证每步都有引导。

---

### Task 3: 匹配成功后智能引导流

**目标**: 匹配成功后自动推荐破冰话题 + 兴趣圈 + 活动

**Files:**
- Modify: `apps/client/src/pages/chat/index.vue` (或新建匹配成功弹窗组件)
- Create: `apps/client/src/components/social/MatchGuideOverlay.vue`

- [ ] **Step 1: 创建 MatchGuideOverlay 组件**

```vue
<template>
  <view v-if="visible" class="match-guide-overlay">
    <view class="overlay-mask" @click="close" />
    <view class="guide-card">
      <view class="guide-header">
        <text class="guide-title">🎉 匹配成功</text>
        <text class="guide-subtitle">你们互相喜欢了对方</text>
      </view>
      
      <!-- 破冰话题推荐 -->
      <view class="guide-section">
        <text class="section-title">试试这些话题破冰</text>
        <view class="topic-list">
          <view v-for="topic in icebreakers" :key="topic" class="topic-chip" @click="sendIcebreaker(topic)">
            {{ topic }}
          </view>
        </view>
      </view>
      
      <!-- 共同兴趣圈推荐 -->
      <view v-if="commonCircles.length" class="guide-section">
        <text class="section-title">你们有共同的兴趣圈</text>
        <view class="circle-list">
          <view v-for="circle in commonCircles" :key="circle.id" class="circle-chip">
            {{ circle.icon }} {{ circle.name }}
          </view>
        </view>
      </view>
      
      <!-- 活动推荐 -->
      <view v-if="activities.length" class="guide-section">
        <text class="section-title">附近可能感兴趣的活动</text>
        <view class="activity-list">
          <view v-for="act in activities" :key="act.id" class="activity-item" @click="goActivity(act.id)">
            <text class="activity-title">{{ act.title }}</text>
            <text class="activity-time">{{ act.scheduleText }}</text>
          </view>
        </view>
      </view>
      
      <button class="start-chat-btn" @click="startChat">开始聊天</button>
    </view>
  </view>
</template>
```

- [ ] **Step 2: 在消息页检测新匹配并弹出引导**

在 `messages/index.vue` 中，当检测到新的 heart signal (accepted 状态)，弹出 MatchGuideOverlay，传入：
- 破冰话题：从 `/api/matches/{matchId}/icebreakers` 获取
- 共同兴趣圈：从双方兴趣标签交叉计算
- 活动推荐：从 `/api/recommendations/activities` 获取

- [ ] **Step 3: 验证匹配引导流**

端到端测试：两个账号互相喜欢 → 心动信号生成 → 进入消息页 → 弹出引导 → 点击破冰话题 → 发送成功。

---

### Task 4: 微信订阅消息推送集成

**目标**: 将已有的 PushPreference/PushSummary 实体能力接入微信订阅消息 API

**Files:**
- Create: `apps/api/src/main/java/com/campuslove/api/growth/WeChatPushService.java`
- Modify: `apps/api/src/main/java/com/campuslove/api/growth/RealPushSummaryService.java`
- Modify: `apps/client/src/pages/profile/index.vue` (推送设置入口)

- [ ] **Step 1: 创建 WeChatPushService**

```java
package com.campuslove.api.growth;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class WeChatPushService {

    private final WeChatConfig weChatConfig;
    private final RestTemplate restTemplate;

    public WeChatPushService(WeChatConfig weChatConfig) {
        this.weChatConfig = weChatConfig;
        this.restTemplate = new RestTemplate();
    }

    /**
     * 发送订阅消息
     * @param openId 用户 openid
     * @param templateId 模板 ID
     * @param page 跳转页面
     * @param data 模板数据
     */
    public void sendSubscribeMessage(String openId, String templateId, String page, Object data) {
        String url = "https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=" + getAccessToken();
        
        Map<String, Object> body = new HashMap<>();
        body.put("touser", openId);
        body.put("template_id", templateId);
        body.put("page", page);
        body.put("data", data);
        
        restTemplate.postForObject(url, body, Map.class);
    }

    /**
     * 发送社交动态摘要推送
     */
    public void sendSocialDigestPush(String openId, int visitorCount, int likeCount, int interactionCount) {
        // 使用微信订阅消息模板
        // 模板字段: thing1=摘要类型, number2=访客数, number3=喜欢数, number4=互动数
        Map<String, Object> data = Map.of(
            "thing1", Map.of("value", "社交动态"),
            "number2", Map.of("value", visitorCount),
            "number3", Map.of("value", likeCount),
            "number4", Map.of("value", interactionCount)
        );
        sendSubscribeMessage(openId, weChatConfig.getSocialDigestTemplateId(), "pages/messages/index", data);
    }

    /**
     * 发送推荐刷新通知
     */
    public void sendRecommendRefreshPush(String openId, int recommendCount) {
        Map<String, Object> data = Map.of(
            "thing1", Map.of("value", "今日推荐已更新"),
            "number2", Map.of("value", recommendCount)
        );
        sendSubscribeMessage(openId, weChatConfig.getRecommendRefreshTemplateId(), "pages/discover/index", data);
    }

    private String getAccessToken() {
        // 调用微信 getAccessToken 接口
        String url = String.format(
            "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=%s&secret=%s",
            weChatConfig.getAppId(), weChatConfig.getAppSecret()
        );
        Map resp = restTemplate.getForObject(url, Map.class);
        return (String) resp.get("access_token");
    }
}
```

- [ ] **Step 2: 在 WeChatConfig 中增加模板 ID 配置**

在 `apps/api/src/main/java/com/campuslove/api/config/WeChatConfig.java` 中增加：
```java
private String socialDigestTemplateId;
private String recommendRefreshTemplateId;
// getters/setters
```

在 `application.yml` 中增加对应配置项。

- [ ] **Step 3: 修改 RealPushSummaryService 调用实际推送**

在生成推送摘要后，调用 `WeChatPushService` 发送实际推送消息。

- [ ] **Step 4: 前端增加推送设置入口**

在 `profile/index.vue` 的菜单列表中增加"推送设置"入口，跳转到推送偏好设置页面。

- [ ] **Step 5: 创建推送设置页面**

新建 `apps/client/src/pages/profile/push-settings.vue`，展示：
- 推送开关
- 每日推送频率选择（1-10次）
- 活跃时段设置

- [ ] **Step 6: 验证推送流程**

真机测试：设置推送偏好 → 触发社交事件 → 检查微信服务通知是否到达。

---

### Task 5: 前端接入签到权益

**目标**: 将已有的 DailyBenefit 实体能力接入前端，签到后解锁实际权益

**Files:**
- Modify: `apps/client/src/stores/discover.ts`
- Modify: `apps/client/src/pages/discover/index.vue`

- [ ] **Step 1: 修改 discover Store 使用签到权益**

在 `discover.ts` 中，获取推荐配额时检查今日签到权益：
```typescript
// 获取今日签到权益
const benefit = await clientApi.getDailyBenefit();
const baseQuota = 10; // 基础配额
const totalQuota = baseQuota + (benefit?.extraRecommendQuota || 0);
```

- [ ] **Step 2: 寻觅页展示权益效果**

签到成功后，展示"今日推荐配额 +5"、"热门话题已解锁"、"新入圈用户已解锁"的权益提示。

- [ ] **Step 3: 权益实际使用**

- 额外推荐配额：推荐数量 = 基础配额 + extraRecommendQuota
- 热门话题解锁：寻觅页底部内容流展示热门话题 tab
- 新入圈用户解锁：展示"新入圈用户"推荐

- [ ] **Step 4: 验证签到权益**

端到端测试：未签到 → 基础配额 → 签到 → 配额增加 → 展示权益效果。

---

### Task 6: 帖子详情页互动增强

**目标**: 集成已有的 similar-authors 端点，增加互动触点

**Files:**
- Modify: `apps/client/src/pages/village/detail.vue`

- [ ] **Step 1: 帖子详情增加作者快捷操作**

在帖子详情的作者信息区域增加"关注"和"私信"两个按钮：
```vue
<view class="author-actions">
  <button v-if="!isSelf" class="follow-btn" @click="toggleFollow">
    {{ isFollowing ? '已关注' : '关注' }}
  </button>
  <button v-if="!isSelf" class="chat-btn" @click="startChat">
    私信
  </button>
</view>
```

- [ ] **Step 2: 帖子详情增加相似作者推荐**

在帖子底部调用 `/api/posts/{id}/similar-authors` 展示 1-2 位相似作者：
```vue
<view v-if="similarAuthors.length" class="similar-authors">
  <text class="section-title">相似作者</text>
  <view v-for="author in similarAuthors" :key="author.id" class="author-card">
    <image :src="author.avatarUrl" class="author-avatar" />
    <text class="author-name">{{ author.nickname }}</text>
    <text class="author-tags">{{ author.commonTags.join(' · ') }}</text>
  </view>
</view>
```

- [ ] **Step 3: 同校标签展示**

若用户与帖子作者同校，在作者信息旁展示"校友"标签。

- [ ] **Step 4: 验证帖子互动增强**

端到端测试：浏览帖子 → 查看作者信息 → 点击关注/私信 → 查看相似作者推荐。

---

### Task 7: 社交信号分类通知增强

**目标**: 验证并增强已有的社交/内容信号分类功能

**Files:**
- Verify: `apps/client/src/pages/messages/index.vue` (已实现信号分类)
- Verify: `apps/api/src/main/java/com/campuslove/api/chat/NotificationService.java`

- [ ] **Step 1: 验证现有实现**

检查 messages/index.vue 中的信号分类功能是否完整：
- 社交信号（红色）：有人喜欢你、访客记录、心动信号
- 内容信号（蓝色）：评论、点赞、关注、回复

- [ ] **Step 2: 若有缺失，补充实现**

如果发现前端未完整接入 InteractionEvent 的信号分类，在 messages Store 中增加：
```typescript
// 按信号类型筛选通知
const socialSignals = notifications.filter(n => ['like', 'visitor', 'match'].includes(n.type));
const contentSignals = notifications.filter(n => ['comment', 'follow'].includes(n.type));
```

- [ ] **Step 3: 验证信号分类**

端到端测试：触发社交事件（被喜欢、被访问）→ 消息页显示红色社交信号 → 触发内容事件（被评论、被关注）→ 显示蓝色内容信号。

---

### Task 8: 私信破冰话题集成验证

**目标**: 验证 IcebreakerSuggestions 组件在私信中的集成

**Files:**
- Verify: `apps/client/src/components/chat/IcebreakerSuggestions.vue`
- Verify: `apps/client/src/pages/chat-session/index.vue`

- [ ] **Step 1: 验证组件功能**

检查 IcebreakerSuggestions.vue 是否：
- 在私信输入框上方展示破冰话题
- 支持一键发送推荐话题
- 话题来源：共同兴趣、同校、共同兴趣圈、共同每日一问

- [ ] **Step 2: 若未集成，在 chat-session 页面集成**

在 chat-session/index.vue 的输入框上方增加：
```vue
<icebreaker-suggestions 
  v-if="showIcebreakers"
  :match-id="matchId"
  @select="sendIcebreaker"
/>
```

- [ ] **Step 3: 输入框停留5秒破冰提示**

当用户在输入框停留超过5秒未输入，柔和展示基于对方资料的破冰话题。

- [ ] **Step 4: 验证破冰功能**

端到端测试：进入私信 → 查看破冰话题 → 点击发送 → 消息发送成功。

---

### Task 9: 村口分类与话题标签验证

**目标**: 验证已有的6分类和话题标签功能完整性

**Files:**
- Verify: `apps/client/src/pages/village/index.vue` (已实现6分类)
- Verify: `apps/api/src/main/java/com/campuslove/api/village/PostTagController.java`

- [ ] **Step 1: 验证6分类功能**

检查 village/index.vue 中的6分类是否完整：
- 全部 / 兴趣圈 / 诚意帖 / 同乡 / 校园 / 最新

- [ ] **Step 2: 验证话题标签功能**

检查发帖时是否可选择预置话题标签，帖子列表是否展示标签。

- [ ] **Step 3: 验证标签点击聚合**

点击标签后是否跳转到该标签下的帖子聚合页面。

- [ ] **Step 4: 若有缺失，补充实现**

根据验证结果补充缺失功能。

---

### Task 10: 推荐算法同校加权验证

**目标**: 验证推荐算法中的同校/同专业/共同兴趣圈加权

**Files:**
- Verify: `apps/api/src/main/java/com/campuslove/api/discover/RealRecommendationService.java`

- [ ] **Step 1: 验证加权逻辑**

检查 RealRecommendationService 中的评分逻辑：
- 同校 +50 ✅
- 同城 +20 ✅
- 每个匹配兴趣标签 +10 ✅
- 同专业 +20 ✅
- 每个共同兴趣圈 +5 ✅
- 每个共同每日一问 +3 ✅
- 时间安排重叠 +15 ✅
- 校园优先模式 score * 1.3 ✅

- [ ] **Step 2: 验证推荐偏好设置**

检查推荐偏好中的 `scope` (campus_first/city/unlimited) 和 `campusPriority` 设置是否生效。

- [ ] **Step 3: 端到端验证**

设置校园优先模式 → 获取推荐 → 验证同校用户排在前面。

---

## 第三部分：兼容性策略

### 大学生模式保留与增强

- 学校认证从"标签"升级为"身份"：贯穿推荐/匹配/社区/话题/活动全链路
- 同校圈作为独立内容专区，与原村口社区并存
- 校园专属话题不影响原兴趣圈和每日一问功能
- 非大学生用户（未认证）可使用除校园话题外的所有功能

### 线下活动功能保留

- 活动列表+详情+报名完整保留
- 活动新增"校园活动"分类，仅同校可见
- 活动作为社交升温L6"场景层"的核心载体

### 推荐方案设置保留

- 推荐时间偏好完整保留
- 新增"校园优先"推荐范围选项（已有 scope 字段支持）
- 偏好持久化机制不变

### 已有功能零影响

- 寻觅/喜欢/村口/私信/兴趣圈/每日一问/签到/反馈 全部功能保持现有逻辑
- 新增功能通过独立路由和独立Store实现，不修改现有核心链路
- Mock/Real双模式继续保持兼容

---

## 第四部分：测试方法论

### 测试类型与验收标准

| 测试类型 | 范围 | 工具 | 验收标准 |
|---------|------|------|---------|
| 单元测试 | 新增Service层业务逻辑 | JUnit + Mockito | 覆盖率≥80% |
| 集成测试 | 新增API端到端 | Spring Boot Test | 所有API 200响应 |
| 前端单元测试 | 新增Store/Component | Vitest | 覆盖率≥70% |
| 回归测试 | 已有全部功能 | 手动+自动 | 零回归缺陷 |
| 社交链路测试 | 6层升温漏斗 | 手动端到端 | 完整链路可用 |
| 校园模式测试 | 认证+同校圈+话题 | 手动端到端 | 校园功能可用 |
| 推送测试 | 微信服务通知 | 真机验证 | 推送触达 |

### 关键验收标准

1. ✅ 6层社交升温漏斗完整可用，每层有明确的转化引导
2. ✅ 校园认证增强（学生证上传+审核流程）
3. ✅ 同校圈功能可用（校园帖子+校园话题+同校优先推荐）
4. ✅ 匹配后破冰话题自动推荐3个话题
5. ✅ 私信输入框破冰话题模板可用
6. ✅ 社交动态摘要推送功能可用（真机验证）
7. ✅ 村口6分类切换+话题标签系统可用
8. ✅ 签到价值增强（额外推荐配额+热门话题+新入圈用户）
9. ✅ 所有已有功能零回归
10. ✅ 无游戏化元素和购物功能
11. ✅ 大学生模式作为差异化亮点完整呈现

---

## 第五部分：开发时间线

### 阶段规划

| 阶段 | 内容 | 里程碑 | 预计周期 |
|------|------|--------|---------|
| Phase 1 | P0：CampusController + 社交升温引导UI + 匹配引导流 | M1: 核心差异化能力上线 | 3-4天 |
| Phase 2 | P1：微信推送集成 + 签到权益 + 破冰集成验证 | M2: 留存和互动能力上线 | 2-3天 |
| Phase 3 | P2：帖子互动增强 + 分类验证 + 推荐算法验证 | M3: 内容体验升级 | 2天 |
| Phase 4 | 全链路验证 + 回归测试 + 推送真机测试 | M4: 全部验收通过 | 2天 |

### 团队配置建议

| 角色 | 人数 | 职责 |
|------|------|------|
| 后端开发 | 1 | CampusController + 微信推送 + 推荐算法验证 |
| 前端开发 | 1 | 社交升温UI + 校园专区 + 破冰UI + 互动增强 |
| 全栈/联调 | 1 | 数据模型迁移 + 联调测试 + 全链路验证 + 回归 |

---

## 附录：主题色说明

项目主题色为蓝色（校园蓝），定义在 `apps/client/src/theme/tokens.ts`：

```typescript
brand1: "#eff6ff",  // 最浅
brand2: "#dbeafe",
brand3: "#bfdbfe",
brand4: "#93c5fd",
brand5: "#60a5fa",
brand6: "#2563eb",  // 主色
brand7: "#1d4ed8",  // 强调色
brand8: "#1e40af",
brand9: "#1e3a8a",  // 最深
```

所有新增组件必须使用 design tokens 中的颜色变量，禁止硬编码颜色值。参考图片 `ChatGPT Image 2026年5月17日 14_57_39.png` 为视觉风格参考。
