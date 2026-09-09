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
import { useProfileStore } from "../../../stores/profile";
import { usePageAccess } from "../../../composables/usePageAccess";
// 2026-09-04 视觉验收：statusBarHeight 注入，env(safe-area-inset-top) 模拟器为 0 会压刘海
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";
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
const statusBarHeightPx = useStatusBarHeight();
const sessionStore = useSessionStore();
const profileStore = useProfileStore();
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
/** R21：与私聊页一致的发送键可用态（空输入禁用） */
const canSend = computed(() => inputValue.value.trim().length > 0 && !sending.value);
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
/* 2026-09-06 修复：本人头像单一数据源 = profileStore.avatarUrl（与会话页一致），
 * 原写死 avatar-1.jpg 与当前用户身份割裂 */
const userAvatar = computed(() =>
  profileStore.avatarUrl ? resolveMediaUrl(profileStore.avatarUrl) : resolveMediaUrl("/static/assets/images/avatars/avatar-2.jpg"),
);

/* -------- 发送（R16 2026-09-07：接真实后端 POST /official-accounts/{code}/messages）-------- *
 * 此前为纯本地 echo 桩：消息不落库、刷新即消失，且 Date.now() 作 id 同毫秒碰撞。
 * 现改为 async：本地先插 pending 消息 → POST → 用后端返回（[用户消息, 助手回复]，direction 区分）替换 →
 * 失败 toast 并恢复草稿。后端同时做了规则化助手回复与刷新后的会话合并。 */
const sending = ref(false);
let localIdSeq = 1;
const nextLocalId = (): number => Date.now() * 100 + (localIdSeq++ % 100);

const sendMessage = async () => {
  const text = inputValue.value.trim();
  if (!text || sending.value) return;
  const localId = nextLocalId();
  messages.value.push({
    id: localId,
    messageType: "user-text",
    content: text,
    cardTitle: null, cardDesc: null, cardTag: null, cardTargetUrl: null,
    publishedAt: new Date().toISOString(), cardActivity: null,
  } as any);
  inputValue.value = "";
  scrollToBottom();

  if (useMock()) {
    // mock 模式：保留本地模拟回复
    sending.value = true;
    setTimeout(() => {
      messages.value.push({
        id: nextLocalId(),
        messageType: "text",
        content: "收到啦～我会帮你留意合适的活动和人哦 😊",
        cardTitle: null, cardDesc: null, cardTag: null, cardTargetUrl: null,
        publishedAt: new Date().toISOString(), cardActivity: null,
      });
      sending.value = false;
      scrollToBottom();
    }, 1200);
    return;
  }

  sending.value = true;
  try {
    const replies = await request<OfficialMessageView[]>({
      url: `/official-accounts/${encodeURIComponent(accountId.value)}/messages`,
      method: "POST",
      data: { content: text },
      header: { "Idempotency-Key": `official-${localId}` },
    });
    // 用后端权威结果替换本地 pending 消息
    const list = Array.isArray(replies) ? replies : [];
    const pendingIdx = messages.value.findIndex((m) => m.id === localId);
    if (pendingIdx >= 0) messages.value.splice(pendingIdx, 1, ...list);
    else messages.value.push(...list);
    scrollToBottom();
  } catch (_error) {
    // 失败：移除本地 pending、恢复草稿，提示用户
    const pendingIdx = messages.value.findIndex((m) => m.id === localId);
    if (pendingIdx >= 0) messages.value.splice(pendingIdx, 1);
    inputValue.value = text;
    uni.showToast({ title: t("messages.officialChatSendFailed"), icon: "none" });
  } finally {
    sending.value = false;
  }
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
/** 2026-09-06 滚动修复：scroll-view 必须用其自身 scroll-top 属性定位，
 * 此前用 uni.pageScrollTo 滚的是页面而非 scroll-view，发送后视窗不动，
 * 用户感知为「消息发不出去」；交替赋值强制触发属性变更 */
const scrollTopValue = ref(0);
const scrollToBottom = () => {
  nextTick(() => {
    scrollTopValue.value = scrollTopValue.value >= 99999 ? 100000 : 99999;
  });
};

/* -------- 判断消息类型 -------- */
/* R16：后端 OfficialMessageView 新增 direction（user/assistant），优先用它判别左右；
 * R20：direction 判别大小写容错 + 收紧兜底（本地理想插入恒 user-text），
 * 防止用户消息被误判为助手渲染到左侧（方向不区分缺陷） */
const isUserMsg = (msg: OfficialMessageView) => {
  const m = msg as any;
  if (typeof m.direction === "string" && m.direction) {
    return m.direction.toLowerCase() === "user";
  }
  return m.messageType === "user-text" || m.role === "user";
};
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
    // R21（2026-09-09）：加载历史后滚到底部——此前仅发送时滚底，
    // 消息多于视口时最后一条永远被输入栏遮挡
    await nextTick();
    setTimeout(() => scrollToBottom(), 120);
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
  if (idx === 0) return true;
  // R21：时间条去重——与上一条同一分钟（HH:mm 相同）不再重复展示
  const prev = messages.value[idx - 1];
  const cur = messages.value[idx];
  if (!prev || !cur) return idx % 3 === 0;
  return formatTime(prev.publishedAt) !== formatTime(cur.publishedAt) && idx % 3 === 0;
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
      <!-- ===== 顶部导航栏（statusBarHeight 注入，避免模拟器 env()=0 压刘海；
           R20：Math.max 兜底 24px，标题不再贴刘海/压状态栏） ===== -->
      <view class="nav-bar" :style="{ paddingTop: Math.max(statusBarHeightPx, 24) + 'px' }">
        <view class="nav-left press-feedback" hover-class="press-feedback--active" hover-stay-time="40" @tap="goBack">
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
        <view class="retry-btn press-feedback" hover-class="press-feedback--active" hover-stay-time="40" @tap="loadOfficialChat"><text>重试</text></view>
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
          :scroll-top="scrollTopValue"
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
                    <view class="action-btn action-btn--primary press-feedback" hover-class="press-feedback--active" hover-stay-time="40" @tap="onActionBtnTap('去看看')">
                      <text class="action-btn__text action-btn__text--primary">去看看</text>
                    </view>
                    <view class="action-btn action-btn--default press-feedback" hover-class="press-feedback--active" hover-stay-time="40" @tap="onActionBtnTap('稍后再说')">
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

      <!-- ===== 底部输入栏（R20：与私聊页 wechat-input-bar 统一——[表情][+] [输入框] [发送]，
           移除私聊页没有的麦克风按钮，消除同组件跨场景布局不一致） ===== -->
      <view class="input-bar">
        <view class="input-bar__icon">
          <image class="input-icon-text" :src="IMAGE_PATHS.ICONS_EMOJI.SMILE" mode="aspectFit" alt="" />
        </view>
        <view class="input-bar__icon input-bar__icon--plus">
          <view class="plus-btn">
            <text class="plus-btn__icon">+</text>
          </view>
        </view>
        <view class="input-bar__field">
          <input
  cursor-spacing="20"
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
        <!-- P2 修复：输入栏增加常显「发送」按钮（原先仅依赖键盘 confirm，mp-weixin 软键盘 send 不可靠/无按钮时无法上屏）；
             R21：空输入时禁用态，与私聊页发送键状态逻辑一致 -->
        <view
          class="input-bar__send"
          :class="{ 'input-bar__send--disabled': !canSend }"
          @tap="sendMessage"
        >
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
  background: var(--c-bg-page, #EEF7F2);
  /* 2026-09-06 布局修复：页面改为 100vh 弹性列布局（导航/消息区/输入栏），
   * 消息区内部滚动。此前整页自然流滚动 + scroll-view 叠加，
   * 下拉时整页错位、发送后 pageScrollTo 无法定位到 scroll-view 内部 */
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  /* R20：去掉固定 height:88rpx（与内联 paddingTop 叠加计算不稳），改最小高度自适应 */
  min-height: 88rpx;
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
  /* R21：#999 压浅绿底对比度不足，几乎不可读 */
  color: #667870;
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
/* R20（2026-09-08）：方向判别（左右行）保持，但 isUserMsg 判定收紧见 script；
   助手=左（头像左）、用户=右（头像右），两侧在视觉上必须镜像可区分 */
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
  /* R20（2026-09-08）：青绿渐变（#43e97b→#38f9d7）与私聊页品牌绿气泡不统一，
     对齐 ChatBubble --c-brand 品牌绿实色 */
  background: var(--c-brand, #36C99A);
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
  /* R20：青绿渐变统一收敛为品牌绿 */
  background: var(--c-brand, #36C99A);
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
  /* R20（2026-09-08）：原 #bbb 22rpx 对比度不足、辨识度差 → 提升字号并加深颜色 */
  font-size: 24rpx;
  color: #667870;
  margin-top: 6rpx;
}

/* ===== 底部输入栏 ===== */
.input-bar {
  flex-shrink: 0;
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
  /* R20：青绿渐变统一收敛为品牌绿（与私聊页「+」附件按钮一致语义） */
  background: var(--c-brand, #36C99A);
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
/* R21：空输入禁用态（与私聊页一致） */
.input-bar__send--disabled {
  background: #C7E9DC;
}
.input-bar__send-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}
</style>
