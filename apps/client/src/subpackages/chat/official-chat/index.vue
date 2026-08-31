<script setup lang="ts">
/**
 * 寻觅助手会话页 — 理想图还原版
 * 绿色渐变头部 + 吉祥物 + 聊天气泡 + 活动卡片 + 操作按钮 + 输入栏
 */
import { computed, ref, nextTick } from "vue";
import { resolveMediaUrl } from "@/utils/media";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../../stores/session";
import { usePageAccess } from "../../../composables/usePageAccess";
import { chatPageRequirements } from "../../../config/page-access";
import LockScreen from "../../../components/common/LockScreen.vue";
import { request } from "../../../services/http";
import { useMock } from "../../../stores/helpers/use-mock";
import { IMAGE_PATHS } from "../../../config/images";
import { openAppPath } from "../../../utils/navigation";
import EmojiText from "../../../components/common/EmojiText.vue";
// P8-2.3：报名成功后消费本地 mock 会话存储中的「报名成功」助手活动消息
import { consumeAssistantActivityNotifies } from "../../../utils/assistant-notify";
import type {
  OfficialAccountView,
  OfficialMessageView,
} from "../../../services/generated/api-types-supplement";

const { t } = useI18n();
const sessionStore = useSessionStore();
const isUnlocked = computed(() => sessionStore.isLoggedIn || useMock());
const completionPercent = computed(() => sessionStore.profileCompletion);

// 寻觅助手只需登录即可进入，不需要完善资料
const officialChatRequirements = { ...chatPageRequirements, requiresProfile: false };
usePageAccess(officialChatRequirements);

const accountId = ref("official-assistant");
const accountName = ref("寻觅助手");
const accountDesc = ref("你的恋爱小管家");
const loading = ref(false);
const errorMessage = ref("");
const messages = ref<OfficialMessageView[]>([]);
// 2026-08-31 Phase 1：进入过渡骨架（录屏实证助手聊天进入有 1~1.5s 纯空白）
const ready = ref(false);

/* -------- 输入 -------- */
const inputValue = ref("");
const inputFocus = ref(false);
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
const userAvatar = resolveMediaUrl("/static/assets/images/avatars/avatar-1.jpg");

/* -------- 本地发送 -------- */
const sendMessage = () => {
  const text = inputValue.value.trim();
  if (!text) return;
  messages.value.push({
    id: Date.now(),
    messageType: "user-text",
    content: text,
    cardTitle: null, cardDesc: null, cardTag: null, cardTargetUrl: null,
    publishedAt: new Date().toISOString(), cardActivity: null,
  } as any);
  inputValue.value = "";
  scrollToBottom();
  // 模拟助手回复
  setTimeout(() => {
    messages.value.push({
      id: Date.now() + 1,
      messageType: "text",
      content: "收到啦～我会帮你留意合适的活动和人哦 😊",
      cardTitle: null, cardDesc: null, cardTag: null, cardTargetUrl: null,
      publishedAt: new Date().toISOString(), cardActivity: null,
    });
    scrollToBottom();
  }, 1200);
};

/* -------- 按钮点击 -------- */
const onActionBtnTap = (label: string) => {
  if (label === "去看看") {
    openAppPath("/subpackages/discover/activities/index");
  } else {
    messages.value.push({
      id: Date.now(),
      messageType: "user-text",
      content: "好的，稍后再说～",
      cardTitle: null, cardDesc: null, cardTag: null, cardTargetUrl: null,
      publishedAt: new Date().toISOString(), cardActivity: null,
    } as any);
    scrollToBottom();
  }
};

/* -------- 滚动到底部 -------- */
const scrollContainerId = "chat-scroll-" + Date.now();
const scrollToBottom = () => {
  nextTick(() => {
    uni.createSelectorQuery()
      .select("#" + scrollContainerId)
      .boundingClientRect((rect: any) => {
        if (rect) {
          uni.pageScrollTo({ scrollTop: 99999, duration: 200 });
        }
      })
      .exec();
  });
};

/* -------- 判断消息类型 -------- */
const isUserMsg = (msg: OfficialMessageView) =>
  (msg as any).messageType === "user-text" || (msg as any).role === "user";
const isActivityMsg = (msg: OfficialMessageView) =>
  msg.messageType === "card" && msg.cardActivity;
const isButtonMsg = (msg: OfficialMessageView) =>
  (msg as any).messageType === "action-buttons";

async function loadOfficialChat(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    if (useMock()) {
      messages.value = [
        {
          id: 101, messageType: "text",
          content: "Hi~ 我是寻觅助手 🌱 我会帮你发现有趣的人和活动，让每一次相遇都更有意义✨",
          cardTitle: null, cardDesc: null, cardTag: null, cardTargetUrl: null,
          publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(), cardActivity: null,
        },
        {
          id: 102, messageType: "card",
          content: "这个活动和你的兴趣很匹配哦~ 要一起去认识新朋友吗？😊",
          cardTitle: "城市露营计划",
          cardDesc: "周六 14:00-18:00 · 中央公园 2.3km",
          cardTag: "发现一个适合你的活动",
          cardTargetUrl: "/subpackages/tools/activities/detail?id=2001",
          publishedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
          cardActivity: {
            activityId: 2001,
            title: "城市露营计划",
            imageUrl: IMAGE_PATHS.ACTIVITIES.ACTIVITY_SPORTS,
            timeText: "周六 14:00-18:00",
            locationText: "中央公园 2.3km",
            enrollmentCount: 12,
            recommendReason: "你和小林都喜欢咖啡与户外",
          },
        },
        {
          id: 103, messageType: "text",
          content: "太好了！已经帮你报名成功啦✅ 活动开始前一天我会提醒你~ 另外有3位兴趣相近的人也参加🌹 要提前认识一下吗？",
          cardTitle: null, cardDesc: null, cardTag: null, cardTargetUrl: null,
          publishedAt: new Date(Date.now() - 0.5 * 86400000).toISOString(), cardActivity: null,
        },
      ];
      // P8-2.3：消费活动详情页报名成功后追加的本地助手消息（追加到消息流末尾）
      const pendingNotifies = consumeAssistantActivityNotifies();
      if (pendingNotifies.length > 0) {
        messages.value = messages.value.concat(pendingNotifies);
        void scrollToBottom();
      }
      return;
    }

    const accounts = await request<OfficialAccountView[]>({
      url: "/official-accounts",
      method: "GET",
    });
    const meta = accounts.find((a) => a.code === accountId.value) ?? accounts[0];
    if (meta) {
      accountName.value = meta.name;
      accountDesc.value = meta.description;
    }
    messages.value = await request<OfficialMessageView[]>({
      url: `/official-accounts/${encodeURIComponent(accountId.value)}/messages`,
      method: "GET",
    });
  } catch (_error) {
    errorMessage.value = t("messages.officialChatLoadFailed");
    messages.value = [];
  } finally {
    loading.value = false;
  }
}

function handleActivityTap(targetUrl: string) {
  openAppPath(targetUrl);
}

/**
 * P2 活动卡片点击修复：优先跳转活动详情页（/subpackages/tools/activities/detail?id=xxx）。
 * 卡片自带 targetUrl 时用之；否则回退到 cardActivity.activityId 拼详情页；
 * 最后兜底到活动列表页，保证一定有点击响应、不静默无动作。
 */
function buildActivityDetailUrl(msg: OfficialMessageView): string {
  if (msg.cardTargetUrl) return msg.cardTargetUrl;
  const id = msg.cardActivity?.activityId;
  if (id) return `/subpackages/tools/activities/detail?id=${id}`;
  return "/subpackages/discover/activities/index";
}

function goBack() {
  uni.navigateBack();
}

function shouldShowTime(idx: number): boolean {
  return idx > 0 && idx % 3 === 0;
}

/* -------- 时间格式化 -------- */
function formatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

onLoad((query) => {
  // 2026-08-31：进入即渲染骨架，数据/兜底计时后放开（消除纯白过渡）
  setTimeout(() => { ready.value = true; }, 500);
  if (!isUnlocked.value) return;
  const raw = query?.accountId;
  if (typeof raw === "string" && raw) accountId.value = raw;
  void loadOfficialChat();
});
</script>

<template>
  <view class="assistant-chat">
    <LockScreen v-if="!isUnlocked" :completion-percent="completionPercent" />
    <template v-else>
      <!-- 2026-08-31 Phase 1：进入骨架（消除 1~1.5s 纯白过渡） -->
      <SkeletonBlock v-if="!ready" variant="chat" :rows="4" label="加载中" />
      <!-- ===== 顶部导航栏 ===== -->
      <view class="nav-bar">
        <view class="nav-left" @tap="goBack">
          <!-- 2026-08-25 P0：返回箭头改为 ‹（规格书 9.1） -->
          <text class="nav-back-icon">‹</text>
        </view>
        <view class="nav-center">
          <view class="nav-title-row">
            <text class="nav-title">{{ accountName }}</text>
            <!-- 2026-08-26 P1：V-08 官方小标签样式与参考图保持一致。
       参考图：浅绿描边胶囊（白底 + 薄荷绿描边 + 深绿文本），不再是渐变填充。 -->
          <view class="official-badge">
            <text class="official-badge__text">官方</text>
          </view>
          </view>
          <text class="nav-subtitle">{{ accountDesc }}</text>
        </view>
        <view class="nav-right">
          <text class="nav-more-icon">···</text>
        </view>
      </view>

      <!-- ===== 加载 / 错误 ===== -->
      <view v-if="loading" class="state-view"><text>加载中...</text></view>
      <view v-else-if="errorMessage" class="state-view">
        <text class="error-text">{{ errorMessage }}</text>
        <view class="retry-btn" @tap="loadOfficialChat"><text>重试</text></view>
      </view>

      <!-- ===== 聊天主体 ===== -->
      <view v-else class="chat-body">
        <!-- 绿色渐变区域 + 吉祥物 -->
        <view class="hero-section">
          <image class="hero-deco hero-deco-1" :src="IMAGE_PATHS.ICONS_EMOJI.LEAF" mode="aspectFit" alt="" />
          <image class="hero-deco hero-deco-2" :src="IMAGE_PATHS.ICONS_EMOJI.SPARKLES" mode="aspectFit" alt="" />
          <image class="hero-deco hero-deco-3" :src="IMAGE_PATHS.ICONS_EMOJI.LEAF" mode="aspectFit" alt="" />
          <image class="hero-deco hero-deco-4" :src="IMAGE_PATHS.ICONS_EMOJI.SPROUT" mode="aspectFit" alt="" />
          <image class="hero-mascot" src="/static/assets/images/mascot/mascot_smile.png" mode="aspectFill" />
          <view class="hero-greeting">
            <text>Hi~ 我是寻觅助手</text>
            <image class="hero-greeting-icon" :src="IMAGE_PATHS.ICONS_EMOJI.SPROUT" mode="aspectFit" alt="" />
          </view>
          <text class="hero-desc">我会帮你发现有趣的人和活动</text>
          <view class="hero-desc">
            <text>让每一次相遇都更有意义</text>
            <image class="hero-desc-icon" :src="IMAGE_PATHS.ICONS_EMOJI.SPARKLES" mode="aspectFit" alt="" />
          </view>
        </view>

        <!-- 消息流 -->
        <scroll-view
          :id="scrollContainerId"
          class="chat-scroll"
          scroll-y
          scroll-with-animation
        >
          <view class="chat-list">
            <template v-for="(msg, idx) in messages" :key="msg.id">
              <!-- 时间戳（每隔几条显示） -->
              <view v-if="idx === 0 || shouldShowTime(idx)" class="msg-time">
                <text class="msg-time__text">{{ formatTime(msg.publishedAt) }}</text>
              </view>

              <!-- ===== 助手消息（左对齐） ===== -->
              <view v-if="!isUserMsg(msg)" class="msg-row msg-row--left">
                <image class="msg-avatar" src="/static/assets/images/mascot/mascot_smile.png" mode="aspectFill" />
                <view class="msg-content">
                  <!-- 纯文本消息：body 中可能含 emoji（mock/后端），由 EmojiText 自动转 SVG -->
                  <view v-if="msg.messageType === 'text'" class="bubble bubble--assistant">
                    <EmojiText
                      :text="msg.content"
                      emoji-size="32rpx"
                      text-class="bubble__text"
                    />
                  </view>

                  <!-- 活动卡片消息 -->
                  <view v-else-if="isActivityMsg(msg)" class="bubble bubble--assistant bubble--card" @tap="handleActivityTap(buildActivityDetailUrl(msg))">
                    <text class="bubble__text" v-if="msg.cardTag">{{ msg.cardTag }}</text>
                    <view class="activity-embed" v-if="msg.cardActivity">
                      <image
                        class="activity-embed__image"
                        :src="resolveMediaUrl('/static/assets/images/activities/activity-1.jpg')"
                        mode="aspectFill"
                      />
                      <view class="activity-embed__info">
                        <text class="activity-embed__title">{{ msg.cardActivity.title }}</text>
                        <text class="activity-embed__meta">{{ msg.cardActivity.timeText }}</text>
                        <text class="activity-embed__meta">{{ msg.cardActivity.locationText }}</text>
                        <view class="activity-embed__participants">
                          <view class="participant-dot" v-for="i in Math.min(msg.cardActivity.enrollmentCount ?? 0, 4)" :key="i" />
                          <text class="activity-embed__count">{{ msg.cardActivity.enrollmentCount }}人已报名</text>
                        </view>
                      </view>
                    </view>
                    <view class="activity-detail-link" @tap.stop="handleActivityTap(buildActivityDetailUrl(msg))">
                      <text class="activity-detail-link__text">查看详情</text>
                    </view>
                    <text class="bubble__text bubble__text--mt" v-if="msg.content && msg.content !== msg.cardTag">{{ msg.content }}</text>
                  </view>

                  <!-- 按钮消息 -->
                  <view v-else-if="isButtonMsg(msg)" class="msg-buttons">
                    <view class="action-btn action-btn--primary" @tap="onActionBtnTap('去看看')">
                      <text class="action-btn__text action-btn__text--primary">去看看</text>
                    </view>
                    <view class="action-btn action-btn--default" @tap="onActionBtnTap('稍后再说')">
                      <text class="action-btn__text">稍后再说</text>
                    </view>
                  </view>

                  <!-- 其他文本（卡片附言等）：同样走 EmojiText -->
                  <view v-else class="bubble bubble--assistant">
                    <EmojiText
                      :text="msg.content"
                      emoji-size="32rpx"
                      text-class="bubble__text"
                    />
                  </view>
                </view>
              </view>

              <!-- ===== 用户消息（右对齐） ===== -->
              <view v-else class="msg-row msg-row--right">
                <view class="msg-content msg-content--right">
                  <view class="bubble bubble--user">
                    <text class="bubble__text bubble__text--user">{{ msg.content }}</text>
                  </view>
                  <text class="read-receipt">已读</text>
                </view>
                <image class="msg-avatar" :src="userAvatar" mode="aspectFit" />
              </view>
            </template>
          </view>
          <view style="height: 20rpx" />
        </scroll-view>
      </view>

      <!-- ===== 底部输入栏 ===== -->
      <view class="input-bar">
        <view class="input-bar__icon">
          <view class="voice-btn">
            <image class="voice-btn__icon" :src="IMAGE_PATHS.ICONS_EMOJI.MICROPHONE" mode="aspectFit" alt="" />
          </view>
        </view>
        <view class="input-bar__field">
          <input
            class="input-bar__input"
            v-model="inputValue"
            placeholder="对我说点什么吧～"
            placeholder-class="input-placeholder"
            confirm-type="send"
            @confirm="sendMessage"
            @focus="inputFocus = true"
            @blur="inputFocus = false"
          />
        </view>
        <view class="input-bar__icon">
          <image class="input-icon-text" :src="IMAGE_PATHS.ICONS_EMOJI.SMILE" mode="aspectFit" alt="" />
        </view>
        <view class="input-bar__icon input-bar__icon--plus">
          <view class="plus-btn">
            <text class="plus-btn__icon">+</text>
          </view>
        </view>
        <!-- P2 修复：输入栏增加常显「发送」按钮（原先仅依赖键盘 confirm，mp-weixin 软键盘 send 不可靠/无按钮时无法上屏） -->
        <view class="input-bar__send" @tap="sendMessage">
          <text class="input-bar__send-text">发送</text>
        </view>
      </view>
    </template>
  </view>
</template>

<style scoped lang="scss">
/* ===== 导航栏 ===== */

.assistant-chat {
  /* P0#4: 覆盖全局粉→灰页面渐变，使用浅薄荷底色，避免“上绿下粉” */
  background: var(--c-bg-page, #F7FAF9);
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  padding-top: env(safe-area-inset-top);
  background: #fff;
  border-bottom: 1rpx solid #f0f0f0;
  flex-shrink: 0;
  z-index: 10;
}
.nav-left,
.nav-right {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
}
.nav-right {
  justify-content: flex-end;
}
.nav-back-icon {
  font-size: 42rpx;
  color: #36C99A;
}
.nav-more-icon {
  font-size: 40rpx;
  color: #333;
  letter-spacing: 2rpx;
}
.nav-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.nav-title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.nav-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #222;
}
/* 2026-08-26 P1：V-08 官方小标签样式。
   参考图：白底 + 薄荷绿描边 + 深绿文本的小标签（不再是绿色渐变胶囊）。 */
.official-badge {
  margin-left: 8rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #FFFFFF;
  border: 1rpx solid #36C99A;
}
.official-badge__text {
  font-size: 20rpx;
  color: #1F9A75;
  font-weight: 600;
  line-height: 1.4;
}
.nav-subtitle {
  font-size: 22rpx;
  color: #999;
  margin-top: 2rpx;
}

/* ===== 加载/错误 ===== */
.state-view {
  padding: 80rpx 32rpx;
  text-align: center;
  color: #999;
}
.error-text {
  display: block;
  margin-bottom: 20rpx;
  color: #E94D87;
}
.retry-btn {
  display: inline-flex;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  background: #E8F8F1;
  color: #36C99A;
  font-weight: 600;
}

/* ===== 聊天主体 ===== */
.chat-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* ===== 吉祥物英雄区 ===== */
.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 40rpx 28rpx;
  background: linear-gradient(180deg, #e8faf0 0%, #f0fdf5 60%, #f5f6f8 100%);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}
.hero-deco {
  position: absolute;
  width: 28rpx;
  height: 28rpx;
  color: #36C99A;
  opacity: 0.4;
}
.hero-deco-1 {
  top: 20rpx;
  left: 60rpx;
}
.hero-deco-2 {
  top: 60rpx;
  right: 80rpx;
}
.hero-deco-3 {
  bottom: 30rpx;
  left: 120rpx;
}
.hero-deco-4 {
  bottom: 60rpx;
  right: 60rpx;
}
.hero-mascot {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  margin-bottom: 16rpx;
}
.hero-greeting {
  font-size: 34rpx;
  font-weight: 700;
  color: #222;
  margin-bottom: 8rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.hero-greeting-icon {
  width: 32rpx;
  height: 32rpx;
  color: #36C99A;
}
.hero-desc {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.hero-desc-icon {
  width: 26rpx;
  height: 26rpx;
  color: #FF9F43;
}

/* ===== 消息滚动区 ===== */
.chat-scroll {
  flex: 1;
  overflow: hidden;
}
.chat-list {
  padding: 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

/* ===== 时间戳 ===== */
.msg-time {
  display: flex;
  justify-content: center;
  padding: 12rpx 0 4rpx;
}
.msg-time__text {
  font-size: 22rpx;
  color: #bbb;
}

/* ===== 消息行 ===== */
.msg-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}
.msg-row--left {
  flex-direction: row;
}
.msg-row--right {
  flex-direction: row-reverse;
}
.msg-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  flex-shrink: 0;
  background: #e8e8e8;
}
.msg-content {
  max-width: 70%;
  display: flex;
  flex-direction: column;
}
.msg-content--right {
  align-items: flex-end;
}

/* ===== 气泡 ===== */
.bubble {
  border-radius: 24rpx;
  padding: 20rpx 28rpx;
}
.bubble--assistant {
  background: #fff;
  border: 1rpx solid #f0f0f0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}
.bubble--card {
  padding-bottom: 12rpx;
}
.bubble--user {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}
.bubble__text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-line;
}
.bubble__text--user {
  color: #fff;
}
.bubble__text--mt {
  margin-top: 16rpx;
}

/* ===== 活动卡片嵌入 ===== */
.activity-embed {
  margin-top: 16rpx;
  background: #f9fbfa;
  border-radius: 16rpx;
  overflow: hidden;
  padding: 16rpx;
}
.activity-embed__image {
  width: 100%;
  height: 200rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}
.activity-embed__info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.activity-embed__title {
  font-size: 28rpx;
  font-weight: 600;
  color: #222;
}
.activity-embed__meta {
  font-size: 22rpx;
  color: #888;
}
.activity-embed__participants {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: 6rpx;
}
.participant-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #43e97b, #38f9d7);
  border: 2rpx solid #fff;
  margin-left: -6rpx;
  &:first-child {
    margin-left: 0;
  }
}
.activity-embed__count {
  font-size: 22rpx;
  color: #999;
}
.activity-detail-link {
  padding: 8rpx 0 4rpx;
}
.activity-detail-link__text {
  font-size: 26rpx;
  color: #36C99A;
  font-weight: 500;
}

/* ===== 按钮组 ===== */
.msg-buttons {
  display: flex;
  gap: 16rpx;
  margin-top: 12rpx;
}
.action-btn {
  padding: 14rpx 36rpx;
  border-radius: 40rpx;
}
.action-btn--primary {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}
.action-btn--default {
  background: #fff;
  border: 1rpx solid #ddd;
}
.action-btn__text {
  font-size: 26rpx;
  color: #666;
}
.action-btn__text--primary {
  color: #fff;
}

/* ===== 已读 ===== */
.read-receipt {
  font-size: 22rpx;
  color: #bbb;
  margin-top: 6rpx;
}

/* ===== 底部输入栏 ===== */
.input-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 20rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
  gap: 12rpx;
  flex-shrink: 0;
}
.input-bar__icon {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.input-bar__icon--plus {
  margin-left: 4rpx;
}
.input-icon-text {
  width: 40rpx;
  height: 40rpx;
  color: #666;
}
.voice-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.voice-btn__icon {
  width: 36rpx;
  height: 36rpx;
  display: block;
}
.plus-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.plus-btn__icon {
  font-size: 36rpx;
  color: #fff;
  font-weight: 700;
}
.input-bar__field {
  flex: 1;
  background: #f5f6f8;
  border-radius: 36rpx;
  padding: 14rpx 24rpx;
}
.input-bar__input {
  font-size: 28rpx;
  color: #333;
  width: 100%;
}
.input-placeholder {
  color: #bbb;
  font-size: 28rpx;
}
/* P2 修复：输入栏「发送」按钮（品牌绿胶囊，与输入区同高居中） */
.input-bar__send {
  height: 72rpx;
  padding: 0 32rpx;
  border-radius: 999rpx;
  background: #36C99A;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.input-bar__send-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}
</style>
