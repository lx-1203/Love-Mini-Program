<script setup lang="ts">
/**
 * 寻觅助手会话页 — 理想图还原版
 * 绿色渐变头部 + 吉祥物 + 聊天气泡 + 活动卡片 + 操作按钮 + 输入栏
 */
import { computed, ref, nextTick, onMounted } from "vue";
import { resolveMediaUrl } from "@/utils/media";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../../stores/session";
import { useProfileStore } from "../../../stores/profile";
import { usePageAccess } from "../../../composables/usePageAccess";
// 2026-09-04 视觉验收：statusBarHeight 注入，var(--statusbar, env(safe-area-inset-top)) 模拟器为 0 会压刘海
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";
// R11-L11-D22（层级遮挡 P2）：本页自绘导航右侧「···」被微信原生胶囊盖住，按实测胶囊左缘让位
// ——与同仓 components/chat/ChatHeader.vue:20-40 同一配方（env/静态 rpx 与本运行档不成比例）。
import { getMenuButtonRect, getWindowWidth } from "../../../compat";
import { chatPageRequirements } from "../../../config/page-access";
import LockScreen from "../../../components/common/LockScreen.vue";
import { request } from "../../../services/http";
import { useMock } from "../../../stores/helpers/use-mock";
import { IMAGE_PATHS } from "../../../config/images";
import { openAppPath } from "../../../utils/navigation";
import { ROUTES } from "../../../constants/routes";
import EmojiText from "../../../components/common/EmojiText.vue";
// MP-R1-OFFICIALCHAT-002：三处死按钮（···/表情/+）接线——表情复用私聊页 EmojiPanel，
// ···与 + 暂无对应能力先给「敬请期待」提示（不留死按钮）
import EmojiPanel from "../../../components/chat/EmojiPanel.vue";
// P8-2.3：报名成功后消费本地 mock 会话存储中的「报名成功」助手活动消息
import { consumeAssistantActivityNotifies } from "../../../utils/assistant-notify";
import type {
  OfficialAccountView,
  OfficialMessageView,
} from "../../../services/generated/api-types-supplement";

/**
 * 本页消息视图：在 OfficialMessageView 契约上扩展实际出现的形态——
 * 本地 pending 插入为 "user-text"、后端按钮卡片为 "action-buttons"、
 * R16 后端 direction/role 方向字段（generated 契约暂未声明）。
 */
type ChatMessageView = Omit<OfficialMessageView, "messageType"> & {
  messageType: OfficialMessageView["messageType"] | "user-text" | "action-buttons";
  direction?: string;
  role?: string;
};

const { t } = useI18n();
const statusBarHeightPx = useStatusBarHeight();

/* R11-L11-D22（层级遮挡 P2，2026-10-21）：自绘「···」盒原右缘贴 24rpx 内衬落在 x326-366，
 * 整块压在微信原生胶囊（实测 x288-368 / y50-78）之下 ⇒ 会话设置入口（onSessionMoreTap 唯一出口）
 * 不可见不可点。照同仓 components/chat/ChatHeader.vue:13-40 的在册配方按实测胶囊左缘反推右内衬：
 * paddingRight = windowWidth − rect.left + 4px（4px 视觉间隙，本帧 378−288+4=94px）；
 * 测不到时退回样式表里同量级的 184rpx 兜底（92.7px ⇒ 右缘仍在胶囊左缘 288px 之外）。
 * 只在 MP-WEIXIN 给兜底值：H5/其他端没有胶囊，不该凭空吃掉 92px 页头宽度。 */
const capsulePadRightPx = ref(0);
onMounted(() => {
  try {
    const rect = getMenuButtonRect();
    const windowWidth = getWindowWidth();
    if (rect && windowWidth && rect.left > 0) {
      capsulePadRightPx.value = Math.max(0, windowWidth - rect.left) + 4;
    }
  } catch (_e) {
    capsulePadRightPx.value = 0;
  }
});
/** 页头内联样式：状态栏让位（已知机制 §4，env() 本档恒 0）+ 胶囊避让（R11-L11-D22） */
const navBarStyle = computed(() => {
  const style: Record<string, string> = {
    paddingTop: Math.max(statusBarHeightPx.value, 24) + "px",
  };
  if (capsulePadRightPx.value > 0) {
    style.paddingRight = capsulePadRightPx.value + "px";
  }
  return style;
});
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
const messages = ref<ChatMessageView[]>([]);
// 2026-08-31 Phase 1：进入过渡骨架（录屏实证助手聊天进入有 1~1.5s 纯空白）
const ready = ref(false);

/* -------- 输入 -------- */
const inputValue = ref("");
const inputFocus = ref(false);
/** R21：与私聊页一致的发送键可用态（空输入禁用） */
const canSend = computed(() => inputValue.value.trim().length > 0 && !sending.value);

/* MP-R1-OFFICIALCHAT-002：表情面板（复用私聊页 EmojiPanel）+ 死按钮提示 */
const emojiPanelVisible = ref(false);
function toggleEmojiPanel() {
  emojiPanelVisible.value = !emojiPanelVisible.value;
}
function handleEmojiSelect(emoji: string) {
  inputValue.value += emoji;
}
function onSessionMoreTap() {
  uni.showToast({ title: "会话设置敬请期待", icon: "none" });
}
function onPlusTap() {
  uni.showToast({ title: "更多功能敬请期待", icon: "none" });
}
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
/* 2026-09-06 修复：本人头像单一数据源 = profileStore.avatarUrl（与会话页一致），
 * 原写死 avatar-1.jpg 与当前用户身份割裂 */
const userAvatar = computed(() =>
  profileStore.avatarUrl ? resolveMediaUrl(profileStore.avatarUrl) : resolveMediaUrl("/static/assets/images/avatars/avatar-2.jpg"),
);

/* R6-B38/D05（素材缺失 P1，2026-10-20）：英雄区吉祥物（:421）与 5 枚助手头像（:451）
 * 原先把 IMAGE_PATHS.MASCOT.SMILE='/static/assets/images/mascot/mascot_smile.png'
 * （config/images.ts:537 字面量）裸绑给 <image>，未过 resolveMediaUrl ⇒ real 发布包内
 * static/assets/images/ 整目录不存在（本仓 src/static 下实测也没有 mascot/），
 * 帧上量到 5 个纯 #e8e8e8 灰盘 + 英雄区 80px 空圆洞。同文件 :88 的 userAvatar
 * 早已是这个写法，此处按同一口径补单一来源 computed：素材由后端 app-assets 托管
 * （apps/api/uploads/app-assets/assets/images/mascot/mascot_smile.png 实测在盘）。 */
const mascotSmileSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.MASCOT.SMILE));

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
  });
  inputValue.value = "";
  scrollToBottom();

  if (useMock()) {
    // mock 模式：保留本地模拟回复
    sending.value = true;
    setTimeout(() => {
      messages.value.push({
        id: nextLocalId(),
        messageType: "text",
        // MP-R2VIS-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-001：正文走 i18n；😊 已在
        // config/emoji-map.ts 映射表内、经 EmojiText 渲染为 SVG，按 Lane 2 裁决留在拼接位。
        content: `${t("messages.officialChatMockReply")} 😊`,
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
      // [PRODUCT-FIX] 键名修正 `header`→`headers`（RequestOptions 实际字段），
      // 此前按 localId 生成的幂等键未随请求发出，重试可能被稳定键幂等去重拦截。
      headers: { "Idempotency-Key": `official-${localId}` },
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
      content: t("messages.officialChatUserDecline"),
      cardTitle: null, cardDesc: null, cardTag: null, cardTargetUrl: null,
      publishedAt: new Date().toISOString(), cardActivity: null,
    });
    scrollToBottom();
  }
};

/* -------- 滚动到底部 -------- */
const scrollContainerId = "chat-scroll-" + Date.now();
/** 底部锚点 id（2026-09-20 滚底修复：与私聊页 chat-session 同款锚定方案） */
const BOTTOM_ANCHOR_ID = "official-chat-bottom-anchor";
/** scroll-into-view 目标（滚底锚定用；与 scroll-top 互斥） */
const scrollIntoViewId = ref("");
/** 2026-09-06 滚动修复：scroll-view 必须用其自身 scroll-top 属性定位，
 * 此前用 uni.pageScrollTo 滚的是页面而非 scroll-view，发送后视窗不动，
 * 用户感知为「消息发不出去」；交替赋值强制触发属性变更 */
const scrollTopValue = ref(0);
/**
 * 2026-09-20 修复（MP-R1-OFFICIALCHAT-001）：原实现交替赋值 99999/100000 大数
 * scroll-top——首次滚动后内容继续增高（如发送 300 字长消息）时，目标值不再产生
 * 有效滚动，最后一条消息被输入栏截断甚至视窗完全不动。
 * 改为 scroll-into-view 锚定底部锚点（先清空 scroll-top 与旧锚点，下一帧再赋值，
 * 与私聊页 chat-session 的 scrollToBottom 同款），发送 / mock 回复 / real 加载
 * 三条路径统一经此函数滚底。
 */
const scrollToBottom = () => {
  nextTick(() => {
    scrollTopValue.value = 0;
    scrollIntoViewId.value = "";
    setTimeout(() => {
      scrollIntoViewId.value = BOTTOM_ANCHOR_ID;
    }, 0);
  });
};

/* -------- 判断消息类型 -------- */
/* R16：后端 OfficialMessageView 新增 direction（user/assistant），优先用它判别左右；
 * R20：direction 判别大小写容错 + 收紧兜底（本地理想插入恒 user-text），
 * 防止用户消息被误判为助手渲染到左侧（方向不区分缺陷） */
const isUserMsg = (msg: ChatMessageView) => {
  if (typeof msg.direction === "string" && msg.direction) {
    return msg.direction.toLowerCase() === "user";
  }
  return msg.messageType === "user-text" || msg.role === "user";
};
const isActivityMsg = (msg: ChatMessageView) =>
  msg.messageType === "card" && msg.cardActivity;
const isButtonMsg = (msg: ChatMessageView) =>
  msg.messageType === "action-buttons";

async function loadOfficialChat(): Promise<void> {
  if (loading.value) return;
  loading.value = true;
  errorMessage.value = "";
  try {
    if (useMock()) {
      messages.value = [
        {
          id: 101, messageType: "text",
          // MP-R2VIS-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-001：问候正文走 i18n；✨ 在
          // config/emoji-map.ts 内、经 EmojiText 渲染为 SVG，按 Lane 2 裁决留在拼接位。
          content: `${t("messages.officialChatAssistantGreeting")}✨`,
          cardTitle: null, cardDesc: null, cardTag: null, cardTargetUrl: null,
          publishedAt: new Date(Date.now() - 2 * 86400000).toISOString(), cardActivity: null,
        },
        {
          id: 102, messageType: "card",
          content: t("messages.officialChatCardHint"),
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
      }
      // MP-R1-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-010：mock 冷启动也必须滚到底——
      // 原仅 pendingNotifies 非空才滚，常规加载路径无 scrollToBottom，滚动位停在顶部，
      // 末条消息后半段被输入栏遮挡（历史 P0 线索 MP-R1-OFFICIAL-003 运行时复现）。
      // 与 real 分支同口径：nextTick + 120ms 滚底。
      await nextTick();
      setTimeout(() => scrollToBottom(), 120);
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
    const fetched = await request<OfficialMessageView[]>({
      url: `/official-accounts/${encodeURIComponent(accountId.value)}/messages`,
      method: "GET",
    });
    // MP-R1-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-001/102：报名成功→寻觅助手消息
    // 链路 real 模式断链修复——生产者（activities/detail notifyEnrollSuccess）双模式
    // 都写本地通知，消费者此前仅存在于 mock 分支，real 模式「写了永远没人读」且
    // storage 无限累积。real 拉取后按 publishedAt 归并消费，消费即清语义两模式一致。
    const pendingReal = consumeAssistantActivityNotifies();
    if (pendingReal.length > 0) {
      messages.value = [...fetched, ...pendingReal].sort(
        (a, b) => Date.parse(a.publishedAt) - Date.parse(b.publishedAt)
      );
    } else {
      messages.value = fetched;
    }
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
function buildActivityDetailUrl(msg: ChatMessageView): string {
  if (msg.cardTargetUrl) return msg.cardTargetUrl;
  const id = msg.cardActivity?.activityId;
  if (id) return `/subpackages/tools/activities/detail?id=${id}`;
  return "/subpackages/discover/activities/index";
}

/**
 * 返回上一页（自定义导航栏返回键）。
 * 2026-09-20 修复（MP-R1-OFFICIALCHAT-003）：页面栈仅剩本页（直达/分享进入）时
 * navigateBack 必然失败且产生未处理 rejection（触发全局错误上报）。现按栈深判断：
 * 有上一页时 navigateBack，无上一页时 switchTab 回消息 tab（本页从消息页助手卡
 * 进入的合理回退入口，对齐 album.vue 等页面的兜底模式）。
 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: ROUTES.TAB.CHAT });
  }
}

function shouldShowTime(idx: number): boolean {
  if (idx === 0) return true;
  // R21：时间条去重——与上一条同一分钟（HH:mm 相同）不再重复展示
  const prev = messages.value[idx - 1];
  const cur = messages.value[idx];
  if (!prev || !cur) return idx % 3 === 0;
  return formatTime(prev.publishedAt) !== formatTime(cur.publishedAt) && idx % 3 === 0;
}

/* -------- 时间格式化 --------
 * R21：历史消息只显示 HH:mm 会造成「时间在未来」的错觉（昨天 01:42 显示为 01:42）。
 * 今天→HH:mm；昨天→昨天 HH:mm；更早→M月D日 HH:mm */
function formatTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const ts = d.getTime();
  if (ts >= startOfToday) return hm;
  if (ts >= startOfYesterday) return `昨天 ${hm}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
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
      <!-- ===== 顶部导航栏（navBarStyle：statusBarHeight 注入 + R11-L11-D22 胶囊避让；
           R20：Math.max 兜底 24px，标题不再贴刘海/压状态栏） ===== -->
      <view class="nav-bar" :style="navBarStyle">
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
        <view class="nav-right" @tap="onSessionMoreTap">
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
        <!-- 消息流（R11-L11-D20：英雄区已从 .chat-body 常驻位移进本滚动容器首块，
             消息流拿到导航与输入栏之间的全部高度，装饰区随消息滚走） -->
        <scroll-view
          :id="scrollContainerId"
          class="chat-scroll"
          scroll-y
          :scroll-top="scrollTopValue"
          :scroll-into-view="scrollIntoViewId"
          scroll-with-animation
        >
          <!-- R11-L11-D20（尺寸比例 P2，2026-10-21）：绿色渐变吉祥物区 + 吉祥物。
               原先它是 .chat-body 里 flex-shrink:0 的常驻块（实测 y83-270 高 187px = 23% 屏高），
               把本页主区（消息流）压到 y270-730 共 460px，一屏只装得下 5 条气泡 + 1 条被裁顶边的，
               历史消息要反复推屏才看得完。按卡上建议改法把它移进 .chat-scroll 作首块 ⇒ 随消息滚走。 -->
          <view class="hero-section">
            <image class="hero-deco hero-deco-1" :src="IMAGE_PATHS.ICONS_EMOJI.LEAF" mode="aspectFit" alt="" />
            <image class="hero-deco hero-deco-2" :src="IMAGE_PATHS.ICONS_EMOJI.SPARKLES" mode="aspectFit" alt="" />
            <image class="hero-deco hero-deco-3" :src="IMAGE_PATHS.ICONS_EMOJI.LEAF" mode="aspectFit" alt="" />
            <image class="hero-deco hero-deco-4" :src="IMAGE_PATHS.ICONS_EMOJI.SPROUT" mode="aspectFit" alt="" />
            <image class="hero-mascot" :src="mascotSmileSrc" mode="aspectFill" />
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

          <view class="chat-list">
            <template v-for="(msg, idx) in messages" :key="msg.id">
              <!-- 时间戳（每隔几条显示） -->
              <view v-if="idx === 0 || shouldShowTime(idx)" class="msg-time">
                <text class="msg-time__text">{{ formatTime(msg.publishedAt) }}</text>
              </view>

              <!-- ===== 助手消息（左对齐） ===== -->
              <view v-if="!isUserMsg(msg)" class="msg-row msg-row--left">
                <image class="msg-avatar" :src="mascotSmileSrc" mode="aspectFill" />
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
                      <!-- MP-R1-OFFICIALCHAT-004：优先消息自带封面（前后端契约均有
                           cardActivity.imageUrl），空值回落库存图——原恒硬编码 activity-1.jpg，
                           real 模式所有活动卡片永远显示同一张与内容无关的库存图 -->
                      <image
                        class="activity-embed__image"
                        :src="resolveMediaUrl(msg.cardActivity.imageUrl || IMAGE_PATHS.ACTIVITIES.ACTIVITY_1)"
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
          <!-- 底部锚点：发送 / mock 回复 / real 加载后滚底至此（2026-09-20 滚底修复） -->
          <view :id="BOTTOM_ANCHOR_ID" style="height: 20rpx" />
        </scroll-view>
      </view>

      <!-- ===== 底部输入栏（R20：与私聊页 wechat-input-bar 统一——[表情][+] [输入框] [发送]，
           移除私聊页没有的麦克风按钮，消除同组件跨场景布局不一致） ===== -->
      <view class="input-bar">
        <view class="input-bar__icon" @tap="toggleEmojiPanel">
          <image class="input-icon-text" :src="IMAGE_PATHS.ICONS_EMOJI.SMILE" mode="aspectFit" alt="" />
        </view>
        <view class="input-bar__icon input-bar__icon--plus" @tap="onPlusTap">
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

      <!-- MP-R1-OFFICIALCHAT-002：表情面板（复用私聊页 EmojiPanel，选中追加进输入框） -->
      <EmojiPanel v-if="emojiPanelVisible" @select="handleEmojiSelect" />
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
  /* R11-L11-D22（层级遮挡 P2）：测量成功时由 navBarStyle 注入 paddingRight
     （windowWidth − rect.left + 4px）；此处仅测量失败时的同量级兜底，
     同 ChatHeader.vue:130。MP-WEIXIN 之外没有胶囊，不给这 92px 空档。 */
  /* #ifdef MP-WEIXIN */
  padding-right: 184rpx;
  /* #endif */
  /* R20：去掉固定 height:88rpx（与内联 paddingTop 叠加计算不稳），改最小高度自适应 */
  min-height: 88rpx;
  padding-top: var(--statusbar, env(safe-area-inset-top));
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
  /* R6-B38/D07（位置 P2，2026-10-20）：.nav-left 原先只有 align-items:center，
     缺 justify-content ⇒ 箭头墨迹贴死在 80rpx 热区左缘（实测 x13 起，热区应 x12-52 居中）。 */
  justify-content: center;
}
.nav-right {
  justify-content: flex-end;
}
/* R6-B38/D07：原 .nav-back-icon 只给 font-size:42rpx 未收 line-height ⇒ 默认行高把字形
   压低（实测箭头中心 y67 vs 标题中心 y41 / 系统胶囊中心 y43，低 26px≈52rpx）。
   配方直接复用同仓 components/chat/ChatHeader.vue:103-107 的既有修法（line-height:1 +
   负 margin 微调），让返回钮与标题/胶囊同一视觉行。 */
.nav-back-icon {
  font-size: 42rpx;
  line-height: 1;
  margin-top: -8rpx;
  /* R12-L11-D10（可达性 P1）：#36C99A 压页底 #EEF7F2 实测 1.93:1，低于非文本 3:1 地板，
     且这是本页唯一显式返回出口（无系统导航栏）。归口 --c-brand-800（#156B51，
     design-variables.scss:18 真值），对 #EEF7F2 ≈5.2:1；与 chat-session 错误态页头
     （同域已改 --c-brand-800 并注明不复制低对比读数）取档对齐。
     line-height/margin 配方不动（R6-B38/D07 在册修法）。 */
  color: var(--c-brand-800, #156B51);
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
  /* R12-L11-D11（颜色token P3）：私有色 #222 归口 --c-text-primary
     （真值 #1A1E1C，design-variables.scss:121）；本页其余私有色随同文件令牌化批次再清。 */
  color: var(--c-text-primary, #1A1E1C);
}
/* 2026-08-26 P1：V-08 官方小标签样式。
   参考图：白底 + 薄荷绿描边 + 深绿文本的小标签（不再是绿色渐变胶囊）。 */
.official-badge {
  margin-left: 8rpx;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  background: #FFFFFF;
  /* R11-L11-D21（可达性 P2）：描边值不变，仅把硬写 #36C99A 归位到它本来的令牌 --c-brand
     （design-variables.scss:15 $brand-500 = #36C99A，逐字节同值 ⇒ 零像素，消私有色字面量） */
  border: 1rpx solid var(--c-brand, #36C99A);
}
/* R11-L11-D21（可达性 P2，2026-10-21）：「官方」是判定这枚号是官方号还是真人的可信度标记，
 * 原文字硬写 #1F9A75（非令牌，仓内既有档是 brand-600 #2AAE83 / brand-700 #1F8D6A），
 * 压白底实测 3.54:1 + 20rpx=10px 已到极小档下沿（整块角标仅 25px 高）⇒ 几乎读不出笔画。
 * 改 --c-brand-800 #156B51（白底 6.45:1，design-variables.scss:18/267 既有档）。
 * 字号：卡上写「抬到 --fs-xs 22rpx」，但 --fs-xs 真值是 20rpx（design-variables.scss:560），
 * 照抄等于不动 ⇒ FIXNOTVISIBLE；按卡的目标值 22rpx 取 --fs-sm（:561 真值正是 22rpx）。 */
.official-badge__text {
  font-size: var(--fs-sm);
  color: var(--c-brand-800, #156B51);
  font-weight: 600;
  line-height: 1.4;
}
.nav-subtitle {
  font-size: 22rpx;
  /* R21：#999 压浅绿底对比度不足；R3 再加深一档（22rpx 浅色可读性 borderline） */
  color: #5A6B64;
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

/* ===== 吉祥物英雄区 =====
   R11-L11-D20（尺寸比例 P2）：本块已从 .chat-body 的常驻 flex 项移进 .chat-scroll 首块
   ⇒ 原来的 flex-shrink: 0（正是它把 187px=23% 屏高钉死在消息带上）随之删除，
   改由 width:100% + box-sizing 铺满滚动内容宽度，滚动即滚走。 */
.hero-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  padding: 40rpx 40rpx 28rpx;
  background: linear-gradient(180deg, #e8faf0 0%, #f0fdf5 60%, #f5f6f8 100%);
  position: relative;
  overflow: hidden;
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

/* ===== 消息滚动区 =====
   R6-B38/D09（可达性 P1，2026-10-20）：flex 子项缺 min-height:0 ⇒ mp-weixin 下容器高度按
   内容撑开后被 overflow:hidden 裁掉，首屏被截断的历史气泡（bottom 帧顶部 y185-215 那半条）
   不可达、pageScrollTo 与手势都推不动（top/bottom 两帧 contentHash 同为 0891255b62ec6a7a）。
   同仓 chat-session/index.vue:2571-2577 早已写了这条铁律配方（flex:1 + min-height:0）。
   box-sizing 同 defect 建议的 border-box 复位：全局复位名单在 theme/global.scss（本泳道禁改），
   故先在页内把 scroll-view 自身复位，避免 padding/width 再被内容撑开。 */
.chat-scroll {
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
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
/* R11-L11-D19（可达性 P1，2026-10-21）：原硬写 #bbb 未过令牌，压页面底 --c-bg-page #EEF7F2
 * 实测 1.60:1（帧上 y464-474 最暗墨像素 (196,196,196)），22rpx=11px 又在 --fs-base 档以下
 * ⇒ 用户拿不到消息时间。字号抬到 --fs-md 26rpx（design-variables.scss:563）。
 * ⚠️ 偏离卡上建议（已知机制 §2「对比度要算」）：建议值 --c-text-tertiary #6B7571 压 #EEF7F2
 * 只有 4.36:1（L=0.170388 vs 0.910454 ⇒ 0.960454/0.220388），不达本卡自陈的 4.5:1；
 * 且卡上「与私聊页时间档同轨」的参照物本身就不是 tertiary —— 私聊页时间条
 * chat-session/index.vue:2617 走的是 --c-text-secondary。故取 --c-text-secondary #4A524E
 * （同底 7.37:1），既过 4.5:1 又真正与私聊页同轨，两档均为既有令牌，不新增色值。 */
.msg-time__text {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
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
  /* R11-L11-D24（尺寸比例 P2，2026-10-21）：原自绘 max-width:70% ⇒ 帧上助手气泡宽 246px
     （x57-302，占屏 65%），比令牌规定的 --bubble-max-width 58%（design-variables.scss:646，=219px）
     宽 27px，长句右缘几乎贴屏边，与私聊页 ChatBubble 并排看宽窄不同轨 ⇒ 收敛到同一枚令牌。 */
  max-width: var(--bubble-max-width);
  display: flex;
  flex-direction: column;
}
.msg-content--right {
  align-items: flex-end;
}

/* ===== 气泡 =====
   R11-L11-D24（尺寸比例 P2，2026-10-21）：原 .bubble{border-radius:24rpx} 四角等圆，
   缺规格里的 4rpx 尾角 ⇒ 与私聊页 ChatBubble（:309/:320/:327/:334 全部走 --bubble-radius-*）
   两套规格。改走令牌并按左右行取镜像尾角档，方向判据同 ChatBubble 的 PRD E4
   （头像所在一侧的上角收小）。 */
.bubble {
  border-radius: var(--bubble-radius-main);
  padding: 20rpx 28rpx;
}
.bubble--assistant {
  background: #fff;
  border: 1rpx solid #f0f0f0;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  /* R11-L11-D24：助手行头像在左 ⇒ 尾角取左上（同 ChatBubble.vue:327/334 的 peer/assistant 档） */
  border-radius: var(--bubble-radius-tail) var(--bubble-radius-main) var(--bubble-radius-main) var(--bubble-radius-main);
}
.bubble--card {
  padding-bottom: 12rpx;
}
.bubble--user {
  /* R20（2026-09-08）：青绿渐变（#43e97b→#38f9d7）与私聊页品牌绿气泡不统一，
     对齐 ChatBubble --c-brand 品牌绿实色 */
  background: var(--c-brand, #36C99A);
  /* R11-L11-D24：用户行头像在右 ⇒ 尾角取右上（同 ChatBubble.vue:320 的 self 档，与上方左行镜像） */
  border-radius: var(--bubble-radius-main) var(--bubble-radius-tail) var(--bubble-radius-main) var(--bubble-radius-main);
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
/* R11-L11-D23（可达性 P1，2026-10-21）：表情与「+」宿主原为 64rpx=32px 见方，低于 88rpx(44px)
 * 触控下限；而本页表情只有 :540 一枚入口（toggleEmojiPanel）、「+」只有 :543 一枚（onPlusTap），
 * 页内无替代出口 ⇒ 想插表情只能命中 32px 目标。按卡上建议把宿主热区抬到 88rpx，
 * 图标本体（.input-icon-text 40rpx / .plus-btn 56rpx）不动，与私聊页 ChatInput 同轨。 */
.input-bar__icon {
  width: 64rpx;
  height: 64rpx;
  min-width: 88rpx;
  min-height: 88rpx;
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
  /* R3（OFFCHAT-002）：与私聊页「+」按钮样式统一（灰底深字）——
     原绿底白字与私聊灰底样式漂移，同一组件两套观感 */
  background: var(--c-neutral-50, #F5F6F8);
  display: flex;
  align-items: center;
  justify-content: center;
}
.plus-btn__icon {
  font-size: 36rpx;
  color: var(--c-text-primary, #333);
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
  /* R12-L11-D12（颜色token P3）：输入文字私有色 #333 归口 --c-text-primary（#1A1E1C）。 */
  color: var(--c-text-primary, #1A1E1C);
  width: 100%;
}
.input-placeholder {
  /* R12-L11-D12（颜色token P3）：占位符私有色 #bbb 归口 --c-text-placeholder
     （真值 --c-text-quaternary #9AA39F，design-variables.scss:126/:373）。 */
  color: var(--c-text-placeholder, #9AA39F);
  font-size: 28rpx;
}
/* P2 修复：输入栏「发送」按钮（品牌绿胶囊，与输入区同高居中）
   R6-B38/D08（颜色token P2，2026-10-20）：#36C99A 与下面的 #C7E9DC 都是硬写字面量，
   仓内已有档位令牌 ⇒ 常态底改 var(--c-brand-500)（真值同为 #36C99A，零像素变化）。 */
.input-bar__send {
  /* R11-L11-D23（可达性 P1）：原 height:72rpx=36px 低于 88rpx(44px) 下限，
     且本页发送只有此键 + input @confirm 一条路（mp 软键盘 send 不可靠，见 :561 P2 注）
     ⇒ 抬到 88rpx，与同排表情/「+」热区同档；底色与字色不动（保持 R6-B38/D08 在册档）。 */
  height: 88rpx;
  padding: 0 32rpx;
  border-radius: 999rpx;
  background: var(--c-brand-500);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
/* R21：空输入禁用态（与私聊页一致）
   R6-B38/D08：原 #C7E9DC 底 + #FFFFFF 字实测对比度 1.30:1，28rpx 正文完全读不出。
   按建议改法取「--c-status-disabled(#DCE5E2) 底 + --c-text-secondary(#4A524E) 字」
   这一档（实测计算 ≈6.3:1，≥4.5:1），两个值都是 theme/design-variables.scss:333/363
   既有令牌，不新增令牌。 */
.input-bar__send--disabled {
  background: var(--c-status-disabled);
}
.input-bar__send--disabled .input-bar__send-text {
  color: var(--c-text-secondary);
}
.input-bar__send-text {
  font-size: 28rpx;
  color: #fff;
  font-weight: 600;
}
</style>
