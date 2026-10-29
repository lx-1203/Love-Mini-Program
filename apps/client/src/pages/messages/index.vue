<script setup lang="ts">


/**
 * 消息首页 — 理想设计还原版
 * 顺序：Header → QuickActionCards → 寻觅助手 → 正在升温 → 最近聊天 → 活动推荐
 */
import { computed, ref, watch } from "vue";
// MP-R2-PAGES-MESSAGES-INDEX-004：聊天列表时间收敛到 utils/time 单一实现
import { formatChatListTime } from "../../utils/time";
import { onLoad, onShow, onPullDownRefresh, onPageScroll } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
import { useLikesStore } from "../../stores/likes";
import { useMessagesStore, type MessageSession } from "../../stores/messages";
import { usePageAccess } from "../../composables/usePageAccess";
import { messagesPageRequirements } from "../../config/page-access";
import { useTabBar } from "../../composables/useTabBar";
// MP-R1-PAGES-MESSAGES-INDEX-010：本页 header 依赖的 --statusbar/--capsule-right 此前从未注入
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
import { openAppPath } from "../../utils/navigation";
import { lightHaptic } from "../../utils/haptic";
import { ROUTES } from "../../constants/routes";
import { useMock } from "../../stores/helpers/use-mock";
// MP-R1-PAGES-MESSAGES-INDEX-008：错误重试需清除 bootstrap 缓存键穿透 TTL
import { removeCache } from "../../utils/cache-ttl";
// 第五轮 QA 验收入口：dev-user=1 页面级兜底（onLoad 登录锁判断前注入 mock 会话）
import { applyDevUserFromQuery } from "../../utils/dev-user";
import { IMAGE_PATHS } from "../../config/images";
import { resolveMediaUrl } from "../../utils/media";
// R2b-B24/D13·D18：游客态不再整页顶换成 NotLoggedWaiting（寻觅口径登录墙），改由本页
// 自渲染「消息」标题/副标 + 摘要卡·会话列表灰态骨架 + 收进一张卡的登录浮层，
// 故本文件不再引用该组件（它仍由 subpackages/discover-extra/likes/index.vue 宿主使用）。
import Skeleton from "../../components/common/Skeleton.vue";
import ErrorState from "../../components/common/ErrorState.vue";
import PageStateContainer from "../../components/common/PageStateContainer.vue";
import EmojiText from "../../components/common/EmojiText.vue";
import type { RelationshipPersonView } from "../../services/generated/api-types-supplement";

useTabBar(3);
usePageAccess({ ...messagesPageRequirements, requiresProfile: false });

// 2026-08-25 P0：i18n（标题/副标接入 chat.headerTitle / chat.headerSubtitle）
// MP-R2-PAGES-MESSAGES-INDEX-004：formatTime 收敛到 utils/time 需要当前 locale
const { t, locale: locale_ } = useI18n();

// R5(INDEP-004)：滚动后内容滑入状态栏与系统时间叠印——与首页同款滚动遮罩
const statusBarPx = Number(uni.getSystemInfoSync().statusBarHeight ?? 0);
const pageScrolled = ref(false);
const topScrimStyle = computed(() => ({
  height: `${statusBarPx + 28}px`,
  opacity: pageScrolled.value ? "1" : "0",
}));
onPageScroll((e) => {
  const next = (e.scrollTop ?? 0) > 10;
  if (next !== pageScrolled.value) pageScrolled.value = next;
});

const sessionStore = useSessionStore();
const messagesStore = useMessagesStore();
const likesStore = useLikesStore();
// MP-R1-PAGES-MESSAGES-INDEX-010：与 home/nearby 一致，根节点绑定 styleVars 注入
// --statusbar/--capsule-right（env(safe-area-inset-top) 在开发者工具恒 0，
// 不注入时头部与状态栏/系统时间叠印）
const { styleVars: menuStyleVars } = useMenuButtonRect();

const isUnlocked = computed(() => sessionStore.isLoggedIn || useMock());

function goLogin() {
  openAppPath("/pages/login/index");
}

/** MP-R1-PAGES-MESSAGES-INDEX-005：未登录态「手机号登录」按钮 → 登录页（含手机号登录表单入口） */
function goPhoneLogin() {
  openAppPath("/pages/login/index");
}

const searchActive = ref(false);
const searchKeyword = ref("");

const dashboard = computed(() => messagesStore.dashboard);
const likedMeCount = computed(() => dashboard.value?.todayHeart.likedMeCount ?? likesStore.likedBy.length);
const waitingReplyCount = computed(() => dashboard.value?.todayHeart.waitingReplyCount ?? Math.max(0, likesStore.likes.length - likesStore.mutualLikes.length));
// MP-R1-PAGES-MESSAGES-INDEX-011：删除编造的 ?? 2 兜底——dashboard 为 null 时活动区
// 整体隐藏（模板 v-if 守卫），不再显示凭空捏造的「2 场活动」
const assistantActivityCount = computed(() => dashboard.value?.assistant.length ?? 0);
/** 助手卡活动区首条真实文案（MP-R1-PAGES-MESSAGES-INDEX-011：删除硬编码露营行） */
const assistantFirstActivityTitle = computed(() => dashboard.value?.assistant[0]?.title ?? "");
/** 活动推荐卡片数据（来自 dashboard.assistant，仅在有数据时展示） */
const activityRecommendations = computed(() =>
  (dashboard.value?.assistant ?? [])
    .filter((a) => a && a.title)
    .map((a) => ({
      title: a.title,
      subtitle: a.subtitle || "",
      icon: a.icon || "",
      targetUrl: a.targetUrl || "",
    }))
);
/**
 * 2026-09-06 修复渲染层图片 404：后端 assistant.icon 可能下发的是 emoji 文本而非图片 URL，
 * 直接塞进 <image src> 会按相对路径请求页面域（pages/messages/❤️ → net::ERR）。
 * 本函数只负责区分「URL / 非 URL」；非 URL 的渲染口径见下方 activityIconFor（R9-L02-D14
 * 起不再走 <text>，改为按语义映射包内图标）。
 */
function isIconUrl(value: string): boolean {
  return /^(https?:\/\/|\/|\.\.?\/|wxfile:|data:)/.test(value);
}
/**
 * R9-L02-D14（素材缺失）：后端 assistant.icon 非 URL 时是 emoji 文本（帧上是 🏀 / 🚴 / ❤️），
 * 直接 <text> 上屏会与同页线性图标两种口径，且 ❤️ 与页头摘要卡「有人喜欢你」同义重复。
 * 这里按语义映射到既有包内图标（不下载、不新增素材）：
 *   心形 → IMAGE_PATHS.MASCOT.HEART_GREEN（同页 :466 已出图）；
 *   其余（球类/骑行/户外）→ IMAGE_PATHS.NEARBY_ICONS.ACTIVITY（calendar，包内 icons/common 桶）；
 *   空值/兜底 → IMAGE_PATHS.ICONS_COMMON.FIRE（R1-B25/D14 原占位图标）。
 */
function activityIconFor(icon: string): string {
  if (!icon) return resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.FIRE);
  if (/[\u2764\u{1F496}-\u{1F49F}\u{1F5A4}]/u.test(icon)) {
    return resolveMediaUrl(IMAGE_PATHS.MASCOT.HEART_GREEN);
  }
  return resolveMediaUrl(IMAGE_PATHS.NEARBY_ICONS.ACTIVITY);
}
/**
 * 2026-09-03（真实数据要求）：移除硬编码假用户回退（小林/小雨/小周/阿杰）——
 * 仅展示后端 dashboard.warmPeople 真实数据；后端为空时区块隐藏
 * （模板 v-if="warmPeople.length > 0"），不再出现凭空捏造的用户。
 */
const warmPeople = computed(() => dashboard.value?.warmPeople ?? []);

const privateSessions = computed(() => messagesStore.sessions.filter((s) => !s.isOfficial));

/**
 * 2026-09-20 修复（MP-R1-PAGES-MESSAGES-INDEX-002）：列表排序纳入置顶态。
 * 优先级明确为：置顶会话全局最前（微信语义，组内保持 store 的最近消息时间排序），
 * 其后才是 highIntent 分组与普通会话——原实现按 highIntent/normal 分组渲染，
 * 完全覆盖 store 层的 pinned 排序，置顶成功后列表不重排、亦无置顶标识。
 */
const pinnedTopSessions = computed(() => privateSessions.value.filter((s) => s.pinned));

const highIntentSessions = computed(() =>
  privateSessions.value.filter(
    (s) =>
      !s.pinned &&
      s.relationship != null &&
      (s.relationship.score >= 51 ||
        s.relationship.status === "ambiguous" ||
        s.relationship.status === "mutual_follow")
  )
);
const normalSessions = computed(() =>
  privateSessions.value.filter((s) => !s.pinned && !highIntentSessions.value.includes(s))
);

/** 最近聊天全量渲染列表：置顶组优先（2026-09-20 pinned 修复） */
const orderedSessions = computed(() => [
  ...pinnedTopSessions.value,
  ...highIntentSessions.value,
  ...normalSessions.value,
]);

const filteredSessions = computed(() => {
  const q = searchKeyword.value.trim().toLowerCase();
  if (!q) return privateSessions.value;
  return privateSessions.value.filter(
    (s) =>
      (s.partnerName || "").toLowerCase().includes(q) ||
      (s.lastMessagePreview || "").toLowerCase().includes(q)
  );
});

const pageState = computed<"loading" | "error" | "empty" | "content">(() => {
  // 2026-08-30 竞态修复：改用聚合 pageLoading（sessions/signals/notifications/interactions 各自独立标志）
  // MP-R2-PAGES-MESSAGES-INDEX-006：force 下拉刷新时保留现有内容（原 pageLoading 即
  // 整页切骨架再切回，内容闪烁）——仅首屏（无任何可展示数据）才显示整块 Skeleton
  if (messagesStore.pageLoading && orderedSessions.value.length === 0 && warmPeople.value.length === 0) return "loading";
  // MP-R1-PAGES-MESSAGES-INDEX-008：errorMessage 与整页 error 态解耦——长按置顶/
  // 删除等单会话操作失败也会写入 store.errorMessage，原判定会把整页替换成 ErrorState。
  // 现仅「无任何可展示内容且带错误」才判 error（首屏加载失败），操作失败由页面 toast。
  if (messagesStore.errorMessage && orderedSessions.value.length === 0 && warmPeople.value.length === 0) return "error";
  if (privateSessions.value.length === 0 && warmPeople.value.length === 0) return "empty";
  return "content";
});

function toggleSearch() {
  searchActive.value = !searchActive.value;
  if (!searchActive.value) searchKeyword.value = "";
}

/**
 * MP-R1-PAGES-MESSAGES-INDEX-102：补「+（发起会话）」入口——从已认识的人
 * （访客/喜欢记录）中选择对象后直达 chat-session?userId=；无已知联系人时
 * 引导去附近认识新朋友。避免消息页无法主动找人开聊的功能缺失。
 */
async function handleStartChat() {
  lightHaptic();
  if (likesStore.visitors.length === 0) {
    await likesStore.fetchVisitors().catch((e: unknown) => {
      console.warn("[messages] fetchVisitors failed", e);
    });
  }
  const people = likesStore.visitors.slice(0, 6);
  if (people.length === 0) {
    openAppPath(ROUTES.TAB.NEARBY);
    return;
  }
  const names = people.map((p) => p.name || t("chat.peerFallbackName"));
  uni.showActionSheet({
    itemList: names,
    success: (res) => {
      const person = people[res.tapIndex];
      if (person?.userId) {
        openAppPath(`${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(person.userId)}`);
      }
    },
    fail: () => {
      /* 用户取消 */
    },
  });
}

/**
 * R2b-B24/D18（需新建·游客骨架）：游客态头部操作区统一跳登录。
 * 搜索与「发起会话」都依赖登录后的真数据（会话列表 / 访客列表），游客点击只给登录出口，
 * 不再露出点了没反应的功能壳——审计建议「操作区统一跳登录」的落点。
 */
function onSearchTap(): void {
  if (!isUnlocked.value) {
    goLogin();
    return;
  }
  toggleSearch();
}

function onStartChatTap(): void {
  if (!isUnlocked.value) {
    goLogin();
    return;
  }
  void handleStartChat();
}

function clearSearch() {
  searchKeyword.value = "";
}

function handleRetry() {
  if (!isUnlocked.value) return;
  // MP-R1-PAGES-MESSAGES-INDEX-008/009：错误态重试强制穿透 30s TTL 缓存，
  // 并清除 bootstrap 缓存键（原 isCacheFresh 早退导致错误态卡死至 TTL 过期）
  removeCache("messages:bootstrap");
  void messagesStore.bootstrap(true);
}

/** 单会话操作失败 toast（MP-R1-PAGES-MESSAGES-INDEX-008：操作错误不进整页 error 态） */
function toastOpError(error: unknown): void {
  uni.showToast({
    title: error instanceof Error && error.message ? error.message : t("apiErrors.operationFailed"),
    icon: "none",
  });
}

function openAssistant() {
  openAppPath(`${ROUTES.MESSAGES.OFFICIAL_CHAT}?accountId=official-assistant`);
}

function goLikes() {
  void messagesStore.markTypeRead(["like", "visitor", "interaction_match"]);
  openAppPath(ROUTES.LIKES.VISITORS_LIKES);
}

// MP-R1-PAGES-MESSAGES-INDEX-103：空态行动出口——跳附近 Tab
function goNearby() {
  openAppPath(ROUTES.TAB.NEARBY);
}

// 2026-09-04 视觉验收修复：「去回复」原先误绑 goLikes，跳到喜欢与访客页与文案不符；
// 语义应为打开最近一个进行中的会话（waitingReplyCount>0 时卡片才展示），无会话时回退喜欢页
function goReply() {
  const [first] = privateSessions.value;
  if (first) {
    openSession(first);
    return;
  }
  goLikes();
}

function openWarmPerson(item: RelationshipPersonView) {
  openAppPath(`${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(String(item.userId))}`);
}

function openSession(session: MessageSession) {
  openAppPath(`${ROUTES.CHAT.SESSION}?sessionId=${encodeURIComponent(session.id)}`);
}

function openActivity(targetUrl?: string) {
  if (targetUrl) openAppPath(targetUrl);
}

function onSessionLongpress(session: MessageSession) {
  uni.showActionSheet({
    itemList: ["置顶/取消置顶", "标为未读", session.muted ? "恢复提醒" : "免打扰", "删除会话"],
    success: ({ tapIndex }) => {
      // MP-R1-PAGES-MESSAGES-INDEX-008：单会话操作失败仅 toast（含隐藏的 unhandled rejection 修复），
      // 不再把整页切到 error 态
      if (tapIndex === 0) {
        void messagesStore.setSessionPinned(session.id, !session.pinned).catch(toastOpError);
      }
      if (tapIndex === 1) {
        void messagesStore.markSessionUnread(session.id).then((ok) => {
          uni.showToast({ title: t(ok ? "messages.markedUnread" : "messages.unreadSyncFailed"), icon: "none" });
        });
      }
      if (tapIndex === 2) {
        void messagesStore.setSessionMuted(session.id, !session.muted).then((ok) => {
          if (!ok) uni.showToast({ title: t("apiErrors.operationFailed"), icon: "none" });
        });
      }
      if (tapIndex === 3) {
        uni.showModal({
          title: "确定删除该会话？",
          success: (res) => {
            if (res.confirm) void messagesStore.deleteSession(session.id).catch(toastOpError);
          },
        });
      }
    },
  });
}

/** MP-R1-PAGES-MESSAGES-INDEX-009：改 async 并支持 force 透传（原非 async，await 实为 void） */
async function loadPage(force = false) {
  if (!isUnlocked.value) return;
  await Promise.all([
    messagesStore.bootstrap(force),
    // MP-R1-PAGES-MESSAGES-INDEX-006：空 catch 违反硬约束且静默失败，改为留痕
    likesStore.fetchLikes().catch((e: unknown) => {
      console.warn("[messages] fetchLikes failed", e);
    }),
  ]);
  avatarFailedIds.value = new Set();
  warmAvatarFailedIds.value = new Set(); // R1-B25/D10：重载后升温行头像失败位同样清零，给坏链一次重试
  // 2026-10-28：不再在列表加载时自动清空全部未读；打开会话或显式「标为已读」才清零，
  // 否则服务端持久化的「标为未读」会被下一次 loadPage 立刻抹掉。
}

watch(isUnlocked, (unlocked) => {
  if (unlocked) void loadPage();
});

onLoad((query) => {
  // 第五轮 QA 验收入口：dev-user=1 页面级兜底（导航拦截器之外的直开/自动化场景），
  // 在 loadPage 登录锁判断前注入 mock 会话（watch(isUnlocked) 会随之触发加载）。
  applyDevUserFromQuery(query);
  void loadPage();
});
onShow(() => {
  void loadPage();
  /* MP-R2-PAGES-MESSAGES-INDEX-020：这里原来还无条件调一次 markAllSessionsRead。
     loadPage 在锁定态会 early return（本文件 :294）⇒ onShow 这次成了「内容没看到就把未读清掉」的那一半，
     与 :304 的「数据加载完成后清」构成双重置且语义互相冲突。现只保留 :304 一处（红点闭环仍是 badge→进入→清除）。 */
});
onPullDownRefresh(async () => {
  // MP-R1-PAGES-MESSAGES-INDEX-009：loadPage 已 async 且 force 穿透 TTL，
  // stopPullDownRefresh 在数据链路完成后才调用（原 await 落在 void 上立即返回）
  await loadPage(true);
  uni.stopPullDownRefresh();
});

function getStatusLabel(status?: string): string {
  const map: Record<string, string> = {
    chatting: "聊天中",
    just_met: "刚认识",
    mutual_follow: "互相关注",
    ambiguous: "暧昧中",
  };
  return map[status || ""] || "新朋友";
}

function getStatusClass(status?: string): string {
  const map: Record<string, string> = {
    chatting: "status-chatting",
    just_met: "status-new",
    mutual_follow: "status-mutual",
    ambiguous: "status-ambiguous",
  };
  return map[status || ""] || "status-new";
}

function formatTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  const ts = Date.parse(dateStr);
  // MP-R1-PAGES-MESSAGES-INDEX-004：NaN 防护（非法时间串不再渲染 "NaN/NaN"）
  if (Number.isNaN(ts)) return "";
  // MP-R2-PAGES-MESSAGES-INDEX-004：收敛到 utils/time 单一实现
  // （当天/昨天/本周/更早 + i18n；原页面私有副本与全仓 6 处近似实现行为漂移）
  // 2026-10-29 英文版不上线：i18n 只剩 zh-CN 一档资源，locale 恒为 "zh-CN"，
  // 这里的 en-US 只是 formatChatListTime 的 **Intl 格式化档位**（12 小时制/英文星期缩写），
  // 不依赖任何语言包；保留分支是为了历史遗留的 locale 值不会把格式打回中文以外再报错。
  const locale = (locale_.value === "en-US" ? "en-US" : "zh-CN") as "zh-CN" | "en-US";
  return formatChatListTime(ts, locale);
}

/** MP-R2-PAGES-MESSAGES-INDEX-003：头像加载失败兜底（原内联版缺失） */
const avatarFailedIds = ref<Set<string>>(new Set());
function onAvatarError(session: MessageSession): void {
  avatarFailedIds.value = new Set(avatarFailedIds.value).add(session.id);
}

/** R1-B25/D10：「正在升温」行头像走同一套失败位兜底（键为 userId，原实现无 @error 直接留空块） */
const warmAvatarFailedIds = ref<Set<string>>(new Set());
function onWarmAvatarError(person: RelationshipPersonView): void {
  warmAvatarFailedIds.value = new Set(warmAvatarFailedIds.value).add(String(person.userId));
}
</script>

<template>
  <view class="messages-page" :style="menuStyleVars">
    <!-- R5(INDEP-004)：滚动状态栏遮罩（与首页同款） -->
    <view class="messages-page__top-scrim" :style="topScrimStyle" />
    <!-- R2b-B24/D13（空态文案）：header 上移到登录判断之外，游客态同样渲染本页自己的
         「消息」标题 + 副标（chat.headerTitle / chat.headerSubtitle 两个既有键，正是
         消息.png 左栏顶部文案「消息」/「今天也有新的心动在发生」）。此前游客态整页被
         NotLoggedWaiting 顶掉，画面只剩寻觅口径的「正在为你寻找 同频的那个人」，
         用户看不出这一页登录后会给什么——本页自己的文案即宿主空态文案。
         审计建议的那句原文「登录后即可查看谁在喜欢你和未读聊天」在 locales 里没有对应键，
         按泳道规则不新增 locale 条目、也不硬编码，故宿主文案由 chat.headerTitle +
         chat.headerSubtitle（消息口径）+ notLoggedWaiting.unlockHint（登录出口）三条既有键承担。
         操作区两个按钮（MP-R1-PAGES-MESSAGES-INDEX-005 的 @go-phone-login 监听需求
         随登录墙改到下方 .guest-state 的手机号登录按钮，行为不丢）。 -->
    <!-- ========== Header ========== -->
    <view class="header">
      <view class="header__left">
        <view class="header__title-row">
          <text class="header__title">{{ t('chat.headerTitle') }}</text>
          <!-- 2026-08-25 P0：主标题后绿色小苗图标（规格书 8.1） -->
          <image class="header__title-sprout" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_V2.SPROUT)" mode="aspectFit" alt="" />
        </view>
        <text class="header__subtitle">{{ t('chat.headerSubtitle') }}</text>
      </view>
      <view class="header__right">
        <!-- MP-R1-PAGES-MESSAGES-INDEX-102：补「+（发起会话）」入口（放大镜+加号双钮） -->
        <view class="header__icon-btn" hover-class="header__icon-btn--hover" @tap="onSearchTap">
          <image class="header__icon-img" :src="IMAGE_PATHS.ICONS_EMOJI.SEARCH" mode="aspectFit" />
        </view>
        <view class="header__icon-btn" hover-class="header__icon-btn--hover" role="button" :aria-label="t('chat.startChatAria')" @tap="onStartChatTap">
          <text class="header__icon-plus">＋</text>
        </view>
      </view>
    </view>

    <!-- ========== Search Bar ========== -->
    <view v-if="searchActive && isUnlocked" class="search-bar">
      <input
  cursor-spacing="20" v-model="searchKeyword" class="search-bar__input" placeholder="搜索聊天记录..." />
      <text class="search-bar__clear" @tap="clearSearch">×</text>
    </view>

    <template v-if="isUnlocked">
      <PageStateContainer :state="pageState" :error-text="messagesStore.errorMessage || '加载失败'" @retry="handleRetry">
        <template #loading>
          <Skeleton variant="list" :count="5" />
        </template>
        <template #error>
          <ErrorState type="network" @retry="handleRetry" />
        </template>
        <template #empty>
          <view class="empty-chat">
            <image class="empty-chat__img" :src="IMAGE_PATHS.MASCOT.DEFAULT" mode="aspectFit" />
            <text class="empty-chat__title">还没有新的缘分</text>
            <!-- MP-R1-PAGES-MESSAGES-INDEX-103/026：空态给可点的行动出口——
                 原 desc 为死文案，新用户空态成死胡同；改为「去附近看看」按钮 -->
            <view class="empty-chat__cta press-feedback" hover-class="press-feedback--active" role="button" :aria-label="t('messages.emptyExploreAria')" @tap="goNearby">
              <text class="empty-chat__cta-text">去附近看看</text>
            </view>
          </view>
        </template>

        <template #default>
          <!-- ========== Quick Action Cards ========== -->
          <view class="quick-cards">
            <!-- R13-L02-D01（P2）：图标圆与标题/副标包进一行横向头部（图标左、文案右），
                 消除「64rpx 图标圆独占一行、标题压在图标下方」的单列堆叠，
                 整卡高度回落一档，与理想图横排头部同位；按钮保持右下角。 -->
            <view class="quick-card" hover-class="quick-card--hover" @tap="goLikes">
              <view class="quick-card__head">
                <view class="quick-card__icon-wrap quick-card__icon-wrap--pink">
                  <image class="quick-card__icon-img" :src="resolveMediaUrl(IMAGE_PATHS.MASCOT.HEART_GREEN)" mode="aspectFit" />
                </view>
                <view class="quick-card__body">
                  <text class="quick-card__title">有人喜欢你</text>
                  <text class="quick-card__desc">{{ likedMeCount }} 人喜欢了你</text>
                </view>
              </view>
              <view class="quick-card__btn">
                <text class="quick-card__btn-text">去看看</text>
              </view>
            </view>
            <view v-if="waitingReplyCount > 0" class="quick-card" hover-class="quick-card--hover" @tap="goReply">
              <view class="quick-card__head">
                <view class="quick-card__icon-wrap quick-card__icon-wrap--green">
                  <image class="quick-card__icon-img" :src="resolveMediaUrl(IMAGE_PATHS.MASCOT.CHAT_HI)" mode="aspectFit" />
                </view>
                <view class="quick-card__body">
                  <text class="quick-card__title">正在等待回复</text>
                  <text class="quick-card__desc">{{ waitingReplyCount }} 个聊天正在继续</text>
                </view>
              </view>
              <view class="quick-card__btn">
                <text class="quick-card__btn-text">去回复</text>
              </view>
            </view>
          </view>

          <!-- ========== 寻觅助手 ========== -->
          <view class="assistant-card" hover-class="assistant-card--hover" @tap="openAssistant">
            <view class="assistant-card__main">
              <view class="assistant-card__avatar-wrap">
                <!-- 2026-08-29：换用品牌吉祥物「寻觅芽」（素材库 V2 mascot_smile，与等待页/空态同一 IP 形象）
                     R9-L02-D08（素材缺失）：XunmiMascot 内部直拼 `/static/assets/images/mascot/*.png`
                     （XunmiMascot.vue:117），而 `static/assets/images/` 命中 config/cdn-buckets.json 的
                     cdnPrefixes ⇒ real 档包内被剪、运行时只有经 resolveMediaUrl 解析成后端
                     app-assets URL 才取得到；裸路径在 real 档整枚空白（帧实测卡内 x≈35-100 纯白）。
                     本页改直挂 <image>，与同页 :466/:478/:562 三枚已正常出图的 <image> 同口径。 -->
                <image class="assistant-card__avatar" :src="resolveMediaUrl(IMAGE_PATHS.MASCOT.SMILE)" mode="aspectFit" alt="" />
                <!-- R21：角标数据源改为 会话未读+通知未读 合计（原 totalUnreadCount 不含通知，
                     补种未读通知后仍不显示） -->
                <view v-if="messagesStore.totalUnreadCount + messagesStore.unreadNotificationCount > 0" class="assistant-card__badge">
                  <text class="assistant-card__badge-text">{{ Math.min(messagesStore.totalUnreadCount + messagesStore.unreadNotificationCount, 99) }}+</text>
                </view>
              </view>
              <view class="assistant-card__info">
                <view class="assistant-card__name-row">
                  <text class="assistant-card__name">寻觅助手</text>
                  <view class="assistant-card__official-badge">
                    <text class="assistant-card__official-text">官方</text>
                  </view>
                </view>
                <text class="assistant-card__subtitle">你的恋爱小管家</text>
              </view>
              <text class="assistant-card__arrow">→</text>
            </view>
            <!-- MP-R1-PAGES-MESSAGES-INDEX-011：活动区全部数据驱动——dashboard 无 assistant
                 数据时整块隐藏，不再显示编造的「2 场活动」与硬编码露营文案 -->
            <view v-if="assistantActivityCount > 0" class="assistant-card__activity">
              <view class="assistant-card__activity-item">
                <view class="assistant-card__activity-text-wrap">
                  <!-- R9-L02-D11（素材缺失）：原 IMAGE_PATHS.ICONS_EMOJI.LEAF 在 real 档无对应素材
                       （icons/emoji/ 里没有 leaf.svg），帧上只剩一枚约 10×8px 灰色残形。
                       改用同页 :562 已验证出图的 ICONS_V2.SPROUT（包内 v2 桶，resolveMediaUrl 后仍是 /static）。 -->
                  <image class="assistant-card__activity-icon" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_V2.SPROUT)" mode="aspectFit" alt="" />
                  <text class="assistant-card__activity-text">今天附近有 {{ assistantActivityCount }} 场活动适合你参加</text>
                </view>
              </view>
              <view v-if="assistantFirstActivityTitle" class="assistant-card__activity-item">
                <text class="assistant-card__activity-text">{{ assistantFirstActivityTitle }}</text>
              </view>
            </view>
          </view>

          <!-- ========== 正在升温 ========== -->
          <view v-if="warmPeople.length > 0" class="section">
            <view class="section__head">
              <text class="section__title">正在升温</text>
              <!-- R1-B25/D18（可达性）：「更多 ›」原先是裸 <text> 直接挂 @tap——无 role、无
                   aria-label、无按压反馈，读屏播报为空且热区只有文字宽。改包一层 view 补
                   role="button" + :aria-label + 全局 press-feedback（与同页空态 .empty-chat__cta 同口径），
                   热区靠内边距撑开、负外边距保持视觉位置不变。文案走 i18n（common.more = 更多）。
                   注：aria 目前只能复用既有键 common.moreAria（「更多」），带目的地的键
                   （如「查看更多升温好友」）需 i18n 泳道在 locales/*.ts 新增，本泳道无权改。 -->
              <view class="section__more-btn press-feedback" hover-class="press-feedback--active" role="button"
                :aria-label="t('common.moreAria')" @tap="goLikes">
                <text class="section__more">{{ t('common.more') }} ›</text>
              </view>
            </view>
            <view class="warm-list">
              <view
                v-for="person in warmPeople.slice(0, 4)"
                :key="person.userId"
                class="warm-item"
                hover-class="warm-item--hover"
                @tap="openWarmPerson(person)"
              >
                <view class="warm-item__avatar-wrap">
                  <!-- R1-B25/D10（素材缺失）：坏链头像此前没有 @error 兜底（同页最近聊天行的
                       onAvatarError 有），真机上 avatarUrl 404 时整枚圆头像连同描边环留空。
                       补同一套失败位机制，切 DEFAULT_AVATAR。 -->
                  <image
                    class="warm-item__avatar"
                    :src="warmAvatarFailedIds.has(String(person.userId)) || !person.avatarUrl ? IMAGE_PATHS.DEFAULT_AVATAR : person.avatarUrl"
                    mode="aspectFill"
                    @error="onWarmAvatarError(person)"
                  />
                  <view class="warm-item__heart-icon">
                    <image class="warm-item__heart-img" :src="resolveMediaUrl(IMAGE_PATHS.ICONS_V2.SPROUT)" mode="aspectFit" />
                  </view>
                </view>
                <text class="warm-item__name">{{ person.name }}</text>
              </view>
            </view>
          </view>

          <!-- ========== 最近聊天（R3：核心模块前移至活动推荐之前，对齐理想图信息层级） ========== -->
          <view class="section">
            <view class="section__head">
              <text class="section__title">最近聊天</text>
            </view>

            <!-- MP-R2-PAGES-MESSAGES-INDEX-003：主列表与搜索分支两段 ~50 行内联模板
                 收敛为单一份（显示列表 = 搜索态 filteredSessions / 常态 orderedSessions），
                 pinned/muted/时间等修复不再需要双写 -->
            <view
              v-for="session in (searchKeyword ? filteredSessions : orderedSessions)"
              :key="session.id"
              class="chat-item"
              hover-class="chat-item--hover"
              @tap="openSession(session)"
              @longpress="onSessionLongpress(session)"
            >
              <view class="chat-item__avatar-wrap">
                <image
                  class="chat-item__avatar"
                  :src="avatarFailedIds.has(session.id) || !session.partnerAvatar ? IMAGE_PATHS.DEFAULT_AVATAR : session.partnerAvatar"
                  mode="aspectFill"
                  @error="onAvatarError(session)"
                />
                <!-- MP-R1-PAGES-MESSAGES-INDEX-004：在线绿点已移除（无真实数据源） -->
              </view>
              <view class="chat-item__content">
                <view class="chat-item__top-row">
                  <text class="chat-item__name">{{ session.partnerName || '未知用户' }}</text>
                  <image
                    v-if="session.pinned"
                    class="chat-item__pin-icon"
                    :src="IMAGE_PATHS.ICONS_EMOJI.PIN"
                    mode="aspectFit"
                  />
                  <view v-if="session.relationship?.status" class="chat-item__status" :class="getStatusClass(session.relationship.status)">
                    <text class="chat-item__status-text">{{ getStatusLabel(session.relationship.status) }}</text>
                  </view>
                  <!-- MP-R2VIS-PAGES-MESSAGES-INDEX-009：免打扰是「会话属性」，与置顶/关系标签同属昵称行
                       状态标识带；原挂在时间列会让时间行混入非时间语义（消息.png 时间列只有时间数字） -->
                  <image
                    v-if="session.muted"
                    class="chat-item__muted-icon"
                    :src="IMAGE_PATHS.ICONS_EMOJI.VOLUME_X"
                    mode="aspectFit"
                  />
                </view>
                <EmojiText
                  v-if="session.lastMessagePreview"
                  :text="session.lastMessagePreview"
                  emoji-size="24rpx"
                  text-class="chat-item__preview"
                />
                <text v-else class="chat-item__preview">暂无消息</text>
              </view>
              <view class="chat-item__right">
                <view class="chat-item__time-row">
                  <text class="chat-item__time">{{ formatTime(session.lastMessageSentAt) }}</text>
                </view>
                <view v-if="session.unreadCount > 0" class="chat-item__unread-badge">
                  <text class="chat-item__unread-text">{{ session.unreadCount > 99 ? '99+' : session.unreadCount }}</text>
                </view>
              </view>
            </view>

            <view
              v-if="(searchKeyword ? filteredSessions : orderedSessions).length === 0"
              class="section__empty"
            >
              <text class="section__empty-text">{{ searchKeyword ? '未找到匹配的聊天' : '暂无聊天记录' }}</text>
            </view>
          </view>

          <!-- ========== 活动推荐（R3：后移，核心会话列表优先） ========== -->
          <view v-if="activityRecommendations.length > 0" class="section">
            <view class="section__head">
              <text class="section__title">活动推荐</text>
            </view>
            <view class="activity-list">
              <view
                v-for="(act, idx) in activityRecommendations"
                :key="idx"
                class="activity-rec-card"
                hover-class="activity-rec-card--hover"
                @tap="openActivity(act.targetUrl)"
              >
                <!-- R9-L02-D14（素材缺失）：非 URL 的 act.icon（emoji 文本）不再直接 <text> 上屏，
                     统一走 activityIconFor 映射到既有包内图标；URL 图标保持原口径。 -->
                <image v-if="act.icon && isIconUrl(act.icon)" class="activity-rec-card__icon" :src="act.icon" mode="aspectFit" alt="" />
                <image v-else class="activity-rec-card__icon activity-rec-card__icon--placeholder"
                  :src="activityIconFor(act.icon)" mode="aspectFit" alt="" />
                <view class="activity-rec-card__body">
                  <text class="activity-rec-card__title">{{ act.title }}</text>
                  <text v-if="act.subtitle" class="activity-rec-card__subtitle">{{ act.subtitle }}</text>
                  <view v-if="act.targetUrl" class="activity-rec-card__cta">
                    <text class="activity-rec-card__cta-text">查看详情</text>
                    <text class="activity-rec-card__cta-arrow">›</text>
                  </view>
                </view>
              </view>
            </view>
          </view>
        </template>
      </PageStateContainer>
    </template>

    <!-- R2b-B24/D18（需新建·游客骨架）：游客态保留本页版式的骨架，登录墙从「整页替换」
         降为一张卡内的登录浮层。骨架自上而下 = 标题+副标（上方 header，既有键）→ 两张
         摘要卡灰态 → 会话列表灰态（沿用本页 loading 态同一个 Skeleton 组件，不新造实现），
         灰态区任意点击统一跳登录（onSearchTap/onStartChatTap 之外，卡与列表在此兜住）。
         灰态只放占位形状：游客没有真数据源，不给捏造计数（与 MP-R1-PAGES-MESSAGES-INDEX-011
         「删除编造的 ?? 2 兜底」同口径），也因此不需要任何新 locale 键——本块用到的
         notLoggedWaiting.unlockHint / wechatLogin / phoneLogin 与占位区 aria 复用的
         nearby.loginToView（「登录后可查看更多内容」，两语均已存在）全部走既有键，
         messages 命名空间没有等价的「登录后查看」键，按泳道规则不新增 locale 条目。
         D16（间距）随本块一并解决：整页 NotLoggedWaiting 撤掉后，页面 padding-bottom
         不再与该组件根容器自带的 60rpx 底部内边距叠加成 ~290rpx 死档。 -->
    <view v-else class="guest-state">
      <view class="guest-wall">
        <text class="guest-wall__hint">{{ t('notLoggedWaiting.unlockHint') }}</text>
        <view class="guest-wall__row">
          <!-- MP-R1-PAGES-MESSAGES-INDEX-005：「手机号登录」出口保留（原经组件 emit 触发） -->
          <view
            class="guest-wall__btn guest-wall__btn--primary press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('notLoggedWaiting.wechatLogin')"
            @tap="goLogin"
          >
            <text class="guest-wall__btn-text guest-wall__btn-text--primary">{{ t('notLoggedWaiting.wechatLogin') }}</text>
          </view>
          <view
            class="guest-wall__btn guest-wall__btn--secondary press-feedback"
            hover-class="press-feedback--active"
            hover-stay-time="120"
            role="button"
            :aria-label="t('notLoggedWaiting.phoneLogin')"
            @tap="goPhoneLogin"
          >
            <text class="guest-wall__btn-text">{{ t('notLoggedWaiting.phoneLogin') }}</text>
          </view>
        </view>
      </view>

      <!-- 摘要卡灰态：R8-L02-D10（空态文案）——形状保留（64rpx 图标圆位仍走
           .quick-card__ph--icon），原来那两条 24rpx 纯灰条改由 .quick-card__body 的
           真实文本槽承担：标题位取既有键（messages.likedMe=「喜欢你的」/
           messages.chatDesc=「未读消息」，正是这两张卡登录后口径上的名字），
           计数位取既有键 nearby.loginToView（「登录后可查看更多内容」）——
           游客确实没有这两项计数（喜欢数/待回复数走受保护端点，捏造数字＝编数据，
           本仓红线见 :675-686 的 R2b 裁决），故计数位写「登录后可见」而不是假数字。
           三条键 zh/en 双语都已存在，0 新增词条。
           卡宽实算：750 − 2×32(.quick-cards padding) − 20(gap) = 678 → 每卡 339rpx，
           减左右 24rpx 内衬 = 291rpx 文本位；22rpx 字号 × 10 字 = 220rpx ⇒ 计数行单行放得下。 -->
      <view class="quick-cards">
        <view
          class="quick-card"
          hover-class="quick-card--hover"
          role="button"
          :aria-label="t('nearby.loginToView')"
          @tap="goLogin"
        >
          <view class="quick-card__ph quick-card__ph--icon" />
          <view class="quick-card__body">
            <text class="quick-card__title">{{ t('messages.likedMe') }}</text>
            <text class="quick-card__desc">{{ t('nearby.loginToView') }}</text>
          </view>
        </view>
        <view
          class="quick-card"
          hover-class="quick-card--hover"
          role="button"
          :aria-label="t('nearby.loginToView')"
          @tap="goLogin"
        >
          <view class="quick-card__ph quick-card__ph--icon" />
          <view class="quick-card__body">
            <text class="quick-card__title">{{ t('messages.chatDesc') }}</text>
            <text class="quick-card__desc">{{ t('nearby.loginToView') }}</text>
          </view>
        </view>
      </view>

      <!-- 会话列表灰态：R8-L02-D10 同轴——4 行灰条此前既无标题也无说明，
           补一行分区名（messages.private=「私信」/「Private」，双语既有键）点明这些位置对应会话。 -->
      <view class="guest-list" role="button" :aria-label="t('nearby.loginToView')" @tap="goLogin">
        <text class="guest-list__label">{{ t('messages.private') }}</text>
        <Skeleton variant="list" :count="4" />
      </view>
      <!-- R6-L02-D08（R6/F7，2026-10-20）：滚动到底有一句「为什么这里没有内容」的可见说明。
           原缺陷是顶/底两帧逐字节相同、灰条之下什么都没有了——游客确实没有会话数据源
           （会话端点受登录门保护，捏造示例会话＝编数据，本仓红线，见 :675-686 的 R2b 裁决），
           所以这里不补假列表，只把"到此为止 + 登录可解锁"这件事从只有 aria-label
           升成肉眼可见的一行，用的仍是既有键 nearby.loginToView（两语都已存在，0 新增词条）。 -->
      <view class="guest-end" role="status" aria-live="polite" @tap="goLogin">
        <text class="guest-end__text">{{ t('nearby.loginToView') }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.messages-page {
  min-height: 100vh;
  /* MP-R1-PAGES-MESSAGES-INDEX-106：消息页整页白底（v3.1 契约「发现/附近/消息白底」
     节奏红线 + 消息.png 主视觉）——由下方 background 兑现，白卡以描边/浅阴影分层。
     原先另附的页面级 `--c-bg-page: #FFFFFF` 覆写已移除：本页面自身对该令牌零消费
     （grep 全页仅命中此处），其唯一存活效果是级进子组件后把 NotLoggedWaiting.vue:121
     的游客等待态底色由全局浅薄荷绿 #EEF7F2 拉成纯白，与 未登录等待页面.png 相悖
     （likes 页无此覆写故一直正确）。移除后白底裁决不变、游客态回到浅绿、暗色重新跟随
     tokens.scss:234 的 --c-bg-page 深色值。
     R1-B25/D16（颜色 token）：白底裁决不动，但兑现方式由字面量 #FFFFFF 改读
     --c-bg-container——浅色档该令牌同值 #FFFFFF（design-variables.scss 的 $bg-container），
     逐像素零变化；暗色档它落到深色（tokens.scss 暗色块），页面底板不再与卡片色脱节。
     同页 header 早已走该令牌，本次把根容器与下方 .messages-page__top-scrim 渐变对齐同一条。 */
  background: var(--c-bg-container, #FFFFFF);
  display: flex;
  flex-direction: column;
  /* MP-R2-PAGES-MESSAGES-INDEX-002：自定义 tabBar 为 fixed 悬浮层，原无底部避让——
     最后一条会话被遮且无法滚动出来；与 home/discover 页同口径预留。
     R1-B25/D12：此处此前自写 112rpx（+16rpx 余量 = 128rpx），比 tabBar 在屏上真正占掉的总高
     矮一档，滚到底末卡仍被切。改读单一来源令牌 --tab-bar-total-h（theme/design-variables.scss
     的避让口径 = 184rpx + 两倍安全区，与 discover/index.vue 底部避让同一条），
     本页只保留 16rpx 呼吸位，高度不再两处各写一份。
     R2b-B24/D16（间距）两条叠底因由：
     1) 回退值里 env(safe-area-inset-bottom) 被写了两遍（`184rpx + env() + env()`）——
        var() 第二参是「令牌未定义时」的静态兜底，写成双份即比令牌本体多算一个安全区，
        现去掉重复的一处，与 theme/design-variables.scss 的 --tab-bar-total-h 本体口径
        （184rpx + 2env）分开看：令牌本体的双计属 R1-B01/D25 地盘（见
        subpackages/village/village/publish.vue 的相关注释），不在本文件改。
     2) 游客态原整页顶替的 NotLoggedWaiting.vue 根容器 .not-logged 自带 min-height:100vh
        + 60rpx 底部内边距，与本行页面级 --tab-bar-total-h + 16rpx 叠成实测 ~290rpx 纯底色
        死档（「稍后再看」到 TabBar 上沿）。随 D18 把登录墙降为卡内浮层后，游客态内容改走
        本页正常文档流，底部只剩这一条不叠加的避让口径，死档消失。 */
  padding-bottom: calc(var(--tab-bar-total-h, 184rpx + env(safe-area-inset-bottom)) + 16rpx);
}

.messages-page__top-scrim {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9;
  /* MP-R1-PAGES-MESSAGES-INDEX-106：滚动遮罩随白底主视觉同步改白
     R1-B25/D16：起点改读 --c-bg-container（浅色档同值 #FFFFFF，零变化），终点用 transparent
     而非 rgba(255,255,255,0)——渐变按预乘 alpha 插值，不会串灰，且不再写死白色 */
  background: linear-gradient(180deg, var(--c-bg-container, #FFFFFF) 82%, transparent);
  pointer-events: none;
  transition: opacity 160ms ease-out;
}

/* R8-L02-D11（层级遮挡）：页头此前是「无 position 的静态元素」，而 .messages-page__top-scrim
   是 position:fixed + z-index:9 —— 静态元素永不参与 z-index 竞争，只要遮罩 opacity=1
   （滚动后必然为 1）就把升入该带的页头整块压成半透明白纱：底帧里「消息」标题上缘被裁、
   字形只剩约 40% 不透明度、副标与状态栏时钟同带不可读。
   修法按任务书两案取「页头抬到遮罩之上」这一半：页头本身带不透明 --c-bg-container 底，
   升到 z-index:10（> 遮罩 9）后自身 100% 实色，同时顺势充当本页的固定导航底板——
   滚上来的正文被页头实底遮住，永远停在胶囊/状态带下方。
   遮罩本体保持 top:0 → 状态栏+胶囊带（statusBarPx+28，见 :51 topScrimStyle），
   它现在只负责页头之上那一条，职责与层级各归其位。
   R9-L02-D13（层级遮挡）：上一轮只抬了 z-index，但 .header 仍是 position:relative ⇒
   随页面一起滚走，无法充当固定导航底板：底帧「正在升温」标题升到 y≈60-68，落在遮罩
   渐变尾段（82%→100%，75px 高）里被冲淡、上缘被裁。现补 position:sticky; top:0，
   让这块不透明 --c-bg-container 页头在整个滚动过程中常驻 y=0 起的顶部，正文滚上来时
   停在页头底缘之下，既不再进入胶囊带也不经过遮罩渐变尾段。 */
.header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  /* MP-R1-PAGES-MESSAGES-INDEX-010：--statusbar/--capsule-right 由根节点 useMenuButtonRect()
     styleVars 绑定注入（本页未用 page-meta——项目内 page-meta 有限制，见 village/detail.vue 注释），
     修复自定义导航与状态栏叠印及 --capsule-right 回落猜测值 7px 的问题 */
  padding: calc(calc(var(--statusbar, env(safe-area-inset-top)) + 20px) + 24rpx) 32rpx 16rpx;
  /* R8-L02-D08（位置）：删除 `padding-right: calc(var(--capsule-right, 7px) + 104px)`。
     本页页头是「标题行 + 副标」两行的左对齐块，其顶缘由上一行的 padding-top 决定：
     statusBar(实测≈47) + 20px + 24rpx ⇒ 标题行落在 y≈85-120，而胶囊带实测 y≈28-60
     ——页头整体已在胶囊下方，横向再让 104px 属重复让位，把「+」右缘顶到 x≈250
     （帧宽 378 的 66%），右侧空出约 91px。回到根 padding 的 32rpx 页边距口径
     （与本页 .quick-cards :897 / .search-bar :875 的 32rpx 同一条），右缘即贴 x≈341。
     避让胶囊的职责由上面的 padding-top（纵向）与本行右边距（页边距）分担，不再横向缓冲。 */
  background: var(--c-bg-container, #FFFFFF);
}
.header__left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.header__title-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.header__title {
  font-size: 44rpx;
  font-weight: 800;
  color: var(--c-text-primary, #1A1E1C);
}

.header__title-sprout {
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  margin-top: -2rpx;
}

.header__subtitle {
  font-size: 24rpx;
  color: var(--c-text-tertiary, #9AA39F);
  margin-top: 4rpx;
}
.header__right {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding-top: 8rpx;
}
.header__icon-btn {
  /* R10-L02-D07（P2 可达性）：搜索与「＋」两枚 .header__icon-btn 原为 72rpx(36px) 热区，
     低于 88rpx 下限，而两枚是本页唯一的搜索与发起会话入口。盒体提到 88rpx，
     图标 .header__icon-img(40rpx) 与 flex 居中不动 ⇒ 视觉尺寸不变、热区达标。
     （R8-L02-D09 曾保留 72rpx 并注「热区口径不变」，本轮按可达性下限上调，间距仍不动。） */
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  /* R8-L02-D09（颜色token）：删除 `background: var(--c-bg-surface, #EEF7F2)`。
     理想图页头此处是「裸图标」，没有任何圆底；浅绿圆底（#EEF7F2 压在 #FFFFFF 页头上，
     两色相差仅 5 灰阶）把两枚钮读成 72rpx 实心圆点，视觉权重反超标题「消息」。
     72rpx 盒体与 flex 居中保留（R8 当时口径）⇒ 视觉权重不反超标题；盒体现已由 R10-L02-D07
     上调为 88rpx 达热区下限，flex 居中与同页 .header__right 的 16rpx 间距仍不动。 */
  display: flex;
  align-items: center;
  justify-content: center;
}
.header__icon-btn--hover {
  opacity: 0.6;
}
.header__icon-img {
  width: 40rpx;
  height: 40rpx;
  /* R8-L02-D09 另一半：描线归一到近黑。素材 static/assets/icons/search.svg:2 把
     stroke="#94A3B8" 写死在 SVG 里（该文件属别的车道，本车道不可写），宿主页的
     color/token 覆盖不到它；而 #94A3B8 压在白页头上（去掉浅绿圆底后即为白底）
     实测相对亮度比 = 1.05 / 0.4102 = 2.56:1，低于非文本 3:1 门槛。
     改在「运行时真正生效的路径」上出解：宿主节点给 image 加 filter: brightness(0)，
     把描线压成 #000000 ⇒ 对 #FFFFFF = 21:1（同钮右缘的「＋」字形取 --c-text-primary
     #1A1E1C = 16.85:1，两枚同档近黑、与理想图裸图标口径一致）。
     filter 对本仓 mp-weixin 运行时的 image 已被验证生效（EmptyState.vue:163 正是靠
     filter 给同一批 SVG 染色后才在帧上读出灰调）。 */
  filter: brightness(0);
}
/* MP-R1-PAGES-MESSAGES-INDEX-102：「+（发起会话）」按钮字形 */
.header__icon-plus {
  font-size: 40rpx;
  line-height: 1;
  font-weight: 500;
  color: var(--c-text-primary, #1A1E1C);
}

/* ========== Search Bar ========== */
.search-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin: 0 32rpx 16rpx;
  padding: 0 20rpx;
  height: 72rpx;
  border-radius: 18rpx;
  background: var(--c-bg-surface, #EEF7F2);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
}
.search-bar__input {
  flex: 1;
  font-size: 26rpx;
  color: var(--c-text-secondary, #333A37);
}
.search-bar__clear {
  font-size: 36rpx;
  color: var(--c-text-tertiary, #9AA39F);
  padding: 0 8rpx;
}

/* ========== Quick Action Cards ========== */
.quick-cards {
  display: flex;
  gap: 20rpx;
  padding: 12rpx 32rpx 20rpx;
}
.quick-card {
  /* R13：第二张卡按数据 v-if 隐藏时，flex:1 会让单卡通栏铺满，
     与理想图「两枚等宽半屏卡」不符——限宽至半屏保持版式比例 */
  flex: 1 1 0;
  max-width: calc(50% - 10rpx);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 28rpx 24rpx;
  border-radius: var(--r-xl, 24rpx); /* R1-B25/D17：与活动卡同档，改读 --r-xl 以免档位调整时两卡分家 */
  /* R9-L02-D09（颜色token）：卡底由纯白改成品牌浅绿 --c-bg-brand（#E8FBF2），
     与理想图「浅绿填充」的摘要卡同档。字色按 design-variables.scss 真值核算：
     标题 --c-text-primary #1A1E1C（L=0.0123）压 #E8FBF2（L=0.9286）= 0.9786/0.0623 = 15.7:1；
     副标 --c-text-secondary #4A524E（.vue 里的 #6B7571 是过期兜底）压 #E8FBF2 = 7.51:1。 */
  background: var(--c-bg-brand, #E8FBF2);
  box-shadow: 0 2rpx 12rpx rgba(54, 201, 154, 0.06);
}
.quick-card--hover {
  opacity: 0.85;
  transform: scale(0.98);
}
/* R13-L02-D01（P2）：横排头部槽——图标圆 64rpx 靠左，标题/副标列在其右侧同水平行；
   卡本体仍为列方向，头部与右下角按钮之间走既有 16rpx gap。 */
.quick-card__head {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.quick-card__head .quick-card__body {
  flex: 1 1 auto;
  min-width: 0;
}
.quick-card__icon-wrap {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.quick-card__icon-wrap--pink {
  /* R9-L02-D09：原 rgba(255,107,129,.12) 粉底与右卡 rgba(54,201,154,.12) 绿底不同族；
     两枚统一到 --c-brand-100 #D1F5E7（同档浅绿，压卡底 #E8FBF2 仍可辨）。 */
  background: var(--c-brand-100, #D1F5E7);
}
.quick-card__icon-wrap--green {
  background: var(--c-brand-100, #D1F5E7);
}
.quick-card__icon-emoji {
  font-size: 32rpx;
}
.quick-card__icon-img {
  width: 36rpx;
  height: 36rpx;
}
.quick-card__body {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.quick-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
.quick-card__desc {
  font-size: 22rpx;
  color: var(--c-text-secondary, #6B7571);
}
.quick-card__btn {
  align-self: flex-end;
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
  /* MP-R1-PAGES-MESSAGES-INDEX-105：按 消息.png 归一为「浅绿描边小胶囊 + 品牌绿文字」，
     非实心渐变（2026-08-27 的实心修复与现行裁决链冲突，以唯一页面级对照依据 消息.png
     为准）；去渐变与投影 */
  background: transparent;
  border: 1rpx solid var(--c-brand, #36C99A);
  margin-top: 8rpx;
}
.quick-card__btn-text {
  font-size: 22rpx;
  font-weight: 700;
  color: var(--c-text-brand, var(--c-brand, #36C99A));
}

/* ========== 寻觅助手 ========== */
.assistant-card {
  margin: 0 32rpx 20rpx;
  padding: 28rpx;
  border-radius: var(--r-xl, 24rpx); /* R1-B25/D17：同上，三枚卡同档一起挂令牌 */
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
  box-shadow: 0 2rpx 12rpx rgba(54, 201, 154, 0.06);
}
.assistant-card--hover {
  opacity: 0.85;
}
.assistant-card__main {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.assistant-card__avatar-wrap {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  flex-shrink: 0;
  /* R9-L02-D08：头像槽补品牌浅绿底 + 圆形裁切（同页 .warm-item__avatar-wrap :1200 口径）——
     图像即便再次取不到也不再是一枚纯白空洞；正常出图时 aspectFit 的留白边由浅绿底承接。
     不加 overflow:hidden：未读角标定位在 wrap 外沿（top/right:-6rpx），裁了会被切掉。 */
  border-radius: 50%;
  background: var(--c-brand-50, #E8FAF3);
}
.assistant-card__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
}
.assistant-card__badge {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 16rpx;
  /* 未读徽章柔和粉色系（对齐 2026-08-27 理想图修复） */
  background: var(--c-romance-400, #FF7C91);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.assistant-card__badge-text {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--c-bg-container, #FFFFFF);
  line-height: 1;
}
.assistant-card__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.assistant-card__name-row {
  display: flex;
  align-items: center;
  gap: 10rpx;
}
.assistant-card__name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
.assistant-card__official-badge {
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  background: rgba(54, 201, 154, 0.15);
}
.assistant-card__official-text {
  font-size: 18rpx;
  font-weight: 600;
  color: var(--c-text-brand, #36C99A);
}
.assistant-card__subtitle {
  font-size: 24rpx;
  color: var(--c-text-secondary, #6B7571);
}
.assistant-card__arrow {
  font-size: 36rpx;
  color: var(--c-text-tertiary, #C2CAC6);
  flex-shrink: 0;
}
.assistant-card__activity {
  margin-top: 20rpx;
  /* R9-L02-D12（颜色token/层级）：原只有 1rpx 上分隔线、无填充无圆角无内边距，两行活动文案
     直接坐在白卡底上，与理想图的「推送子卡」差一整档。改为品牌浅绿子卡：填充
     --c-bg-brand #E8FBF2 + 20rpx 圆角 + 20rpx 内边距，去掉上边框；字色 --c-text-secondary
     #4A524E 压 #E8FBF2 = 7.51:1（正文口径 ≥4.5:1）。 */
  padding: 20rpx;
  border-radius: 20rpx;
  background: var(--c-bg-brand, #E8FBF2);
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}
.assistant-card__activity-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.assistant-card__activity-text-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6rpx;
}

.assistant-card__activity-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}

.assistant-card__activity-text {
  font-size: 24rpx;
  color: var(--c-text-secondary, #4A524E);
  line-height: 1.5;
}

/* ========== 正在升温 ========== */
.section {
  padding: 16rpx 0;
}
.section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 16rpx;
}
.section__title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--c-text-primary, #1A1E1C);
}
.section__more {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #9AA39F);
}
/* R1-B25/D18（可达性）：「更多 ›」的可点外壳。内边距把热区从「只有文字宽」向外各扩
   14rpx（纵向）/10rpx（横向），等值负外边距保证行高与 .section__head 右缘（32rpx）逐像素不变。
   注：抬到 44px 见标需 min-height≈88rpx，会把 .section__head 行高顶高一档（版式改动），本批不做 */
.section__more-btn {
  display: flex;
  align-items: center;
  padding: 14rpx 10rpx;
  margin: -14rpx -10rpx;
  border-radius: var(--r-sm, 8rpx);
}
.section__empty {
  padding: 40rpx 32rpx;
  text-align: center;
}
.section__empty-text {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #9AA39F);
}

.warm-list {
  display: flex;
  gap: 24rpx;
  padding: 0 32rpx;
}
.warm-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  width: 140rpx;
}
.warm-item--hover {
  opacity: 0.8;
}
.warm-item__avatar-wrap {
  position: relative;
  width: 100rpx;
  height: 100rpx;
  /* R1-B25/D11（尺寸比例）：帧上该盒塌陷到不足一枚角标高（名字几乎贴住分区标题），与声明的
     100rpx 不成比例。flex 子项默认 flex-shrink:1，在列向 .warm-item 里被压时先掉高度——
     与同页 assistant-card__avatar-wrap 同口径钉死：flex-shrink:0 + min-*。 */
  min-width: 100rpx;
  min-height: 100rpx;
  flex-shrink: 0;
  /* R1-B25/D10（素材缺失）：头像图坏链/尚未回来时不再是一块空洞，垫品牌浅绿底 + 圆形裁切口径 */
  border-radius: 50%;
  background: var(--c-brand-50, #E8FAF3);
}
.warm-item__avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid var(--c-border-brand, #36C99A);
  box-sizing: border-box;
}
.warm-item__heart-icon {
  position: absolute;
  bottom: -2rpx;
  right: -2rpx;
  width: 30rpx;
  height: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container, #FFFFFF);
  border-radius: 50%;
  overflow: hidden;
}
.warm-item__heart-img {
  width: 24rpx;
  height: 24rpx;
}
.warm-item__name {
  font-size: 24rpx;
  color: var(--c-text-secondary, #333A37);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 130rpx;
}

/* ========== 活动推荐 ========== */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 0 32rpx;
}
.activity-rec-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  /* R1-B25/D17（圆角）：24rpx/16rpx 是 --r-xl/--r-lg 的字面量副本，档位调整时该卡不跟随 */
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
  box-shadow: 0 2rpx 12rpx rgba(54, 201, 154, 0.06);
}
.activity-rec-card--hover {
  opacity: 0.85;
}
.activity-rec-card__icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-lg, 16rpx); /* R1-B25/D17：同上，走 --r-lg 档 */
  flex-shrink: 0;
  background: var(--c-brand-50, #E8FAF3);
}
.activity-rec-card__icon--placeholder {
  background: var(--c-brand-bg-tint, rgba(61, 201, 148, 0.08));
  /* R1-B25/D14：占位分支现在渲染一枚默认图标；<image> 在 MP 是 content-box，
     显式 border-box 让内边距只缩图形、不把盒子撑到 96rpx 之外 */
  padding: 20rpx;
  box-sizing: border-box;
}
/* R9-L02-D14：emoji 文本图标分支已删除（改映射包内图标），.activity-rec-card__icon--emoji
   随之成为死样式一并移除。 */
.activity-rec-card__body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.activity-rec-card__title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.activity-rec-card__subtitle {
  font-size: 22rpx;
  color: var(--c-text-secondary, #6B7571);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.activity-rec-card__cta {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  margin-top: 4rpx;
}
/* R13-L02-D02（P1）：--c-brand #36C99A 压白卡实算 2.10:1，低于正文级 4.5:1，
   文字与箭头同升 --c-brand-800 #156B51（design-variables.scss:267 真值，白底 6.45:1），
   22rpx 字号不动；箭头 28rpx 常规重不属大字豁免（<3:1 也不达），与文字同一 CTA 同步提档。 */
.activity-rec-card__cta-text {
  font-size: 22rpx;
  font-weight: 600;
  color: var(--c-brand-800, #156B51);
}
.activity-rec-card__cta-arrow {
  font-size: 28rpx;
  line-height: 1;
  color: var(--c-brand-800, #156B51);
}

/* ========== 最近聊天 ========== */
.chat-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  /* R4-batch4 像素级对齐：参考图消息行高更舒展（24rpx → 28rpx） */
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid var(--c-border-light, #F2F5F3);
}
.chat-item--hover {
  background: var(--c-bg-surface, #EEF7F2);
}
.chat-item__avatar-wrap {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  flex-shrink: 0;
}
.chat-item__avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
}
.chat-item__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}
.chat-item__top-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}
/* 2026-09-20（MP-R1-PAGES-MESSAGES-INDEX-002）：置顶角标 */
.chat-item__pin-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
}
.chat-item__name {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--c-text-primary, #1A1E1C);
  flex-shrink: 0;
}
.chat-item__status {
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}
.status-chatting {
  background: rgba(54, 201, 154, 0.12);
}
.status-chatting .chat-item__status-text {
  color: var(--c-text-brand);
}
.status-new {
  background: rgba(154, 163, 159, 0.12);
}
.status-new .chat-item__status-text {
  color: var(--c-text-secondary, #6B7571);
}
.status-mutual {
  /* MP-R1-PAGES-MESSAGES-INDEX-104：互相关注规格色为品牌绿 #3CC99A（原蓝色系
     --c-text-link 与三态语义冲突：聊天中绿/暧昧粉/互关蓝） */
  background: rgba(60, 201, 154, 0.12);
}
.status-mutual .chat-item__status-text {
  color: var(--c-text-brand);
}
.status-ambiguous {
  background: rgba(255, 107, 129, 0.12);
}
.status-ambiguous .chat-item__status-text {
  color: var(--c-text-romance);
}
.chat-item__status-text {
  font-size: 20rpx;
  font-weight: 500;
}
.chat-item__preview {
  font-size: 24rpx;
  color: var(--c-text-secondary, #6B7571);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.chat-item__right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10rpx;
  flex-shrink: 0;
  min-width: 80rpx;
}
/* 2026-09-20（MP-R1-PAGES-MESSAGES-INDEX-003）：时间行容器；MP-R2VIS-PAGES-MESSAGES-INDEX-009
   起免打扰图标已移至昵称行，本行只承载时间 */
.chat-item__time-row {
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.chat-item__muted-icon {
  width: 24rpx;
  height: 24rpx;
  flex-shrink: 0;
  opacity: 0.8;
}
.chat-item__time {
  font-size: 22rpx;
  color: var(--c-text-tertiary, #9AA39F);
}
.chat-item__unread-badge {
  min-width: 36rpx;
  height: 36rpx;
  padding: 0 10rpx;
  border-radius: 18rpx;
  /* 未读徽章柔和粉色系（对齐 2026-08-27 理想图修复） */
  background: var(--c-romance-400, #FF7C91);
  display: flex;
  align-items: center;
  justify-content: center;
}
.chat-item__unread-text {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--c-bg-container, #FFFFFF);
  line-height: 1;
}

/* ========== Empty State ========== */
.empty-chat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20rpx;
  padding: 80rpx 32rpx;
}
.empty-chat__img {
  width: 360rpx;
  height: 270rpx;
}
.empty-chat__title {
  font-size: 34rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}
.empty-chat__desc {
  font-size: 26rpx;
  color: var(--c-text-tertiary, #9AA39F);
}
/* MP-R1-PAGES-MESSAGES-INDEX-103：空态「去附近看看」行动按钮 */
.empty-chat__cta {
  margin-top: 24rpx;
  padding: 16rpx 48rpx;
  border-radius: 999rpx;
  border: 1rpx solid var(--c-brand, #36C99A);
}
.empty-chat__cta-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--c-text-brand, var(--c-brand, #36C99A));
}

/* ========== R2b-B24/D18 游客骨架（登录浮层 + 摘要卡·会话列表灰态） ==========
   全部尺寸/配色沿用本页既有口径，不新造档位：卡壳= .assistant-card（32rpx 左右间距、
   28rpx 内距、--r-xl 圆角、--c-border-light 描边），按钮高度= --btn-height-md，
   胶囊圆角= .quick-card__btn / .empty-chat__cta 的 999rpx，主按钮渐变= 与
   NotLoggedWaiting.vue 主按钮同一条 --c-brand → --c-brand-600，占位行高= Skeleton.vue
   的 .skeleton-line（24rpx / --r-sm）。 */
.guest-state {
  display: flex;
  flex-direction: column;
}
.guest-wall {
  margin: 0 32rpx 20rpx;
  padding: 28rpx;
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-surface, #EEF7F2);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
/* 提示文案颜色走 --c-text-secondary（R2b-L02/D12 同一裁决：浅底小字不用 --c-text-tertiary） */
.guest-wall__hint {
  font-size: 24rpx;
  color: var(--c-text-secondary, #4A524E);
}
.guest-wall__row {
  display: flex;
  gap: 16rpx;
}
.guest-wall__btn {
  flex: 1;
  min-width: 0;
  height: var(--btn-height-md, 96rpx);
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.guest-wall__btn--primary {
  /* R10-L02-D05（P1 颜色token）：主登录钮原为 brand-500→brand-600 渐变，白字实算 2.10–2.81:1
     （§2 表：brand-600 白字 2.81 不达标、brand-500 白字 1.9 不达标），26rpx 粗体不享大字号豁免。
     收成 --c-brand-800 纯色（白字 6.45:1），与 LockScreen/附近发动态同档。本页主入口。 */
  background: var(--c-brand-800, #156b51);
}
.guest-wall__btn--secondary {
  background: var(--c-bg-container, #FFFFFF);
  /* R10-L02-D06（P1 颜色token）：次按钮描边原 --c-brand(#36C99A) 压白底 2.10:1，文字见下。
     描边改 --c-brand-800(#156B51，6.45:1)，与主/次同档，让备选登录入口的文字与边界都可辨。 */
  border: 1rpx solid var(--c-brand-800, #156b51);
}
.guest-wall__btn-text {
  font-size: 26rpx;
  font-weight: 600;
  /* R10-L02-D06 另一半：次按钮文字原 --c-text-brand(#36C99A) 压白底 2.10:1 → --c-brand-800(6.45:1)。
     主按钮文字由 .guest-wall__btn-text--primary(:1575) 覆盖为 --c-neutral-0，本行改动只作用于次按钮。 */
  color: var(--c-brand-800, #156b51);
}
.guest-wall__btn-text--primary {
  color: var(--c-neutral-0, #FFFFFF);
}
/* 摘要卡灰态占位：R8-L02-D10 起只保留「图标位」形状（64rpx 圆，同 .quick-card__icon-wrap），
   文案位改由 .quick-card__body 的真实标题/计数文本槽承担（见模板同轴注释）。
   .quick-card__ph 本体是 --icon 的 height/border-radius/底色来源，不可删。 */
.quick-card__ph {
  height: 24rpx;
  border-radius: var(--r-sm, 8rpx);
  background: var(--c-bg-surface, #EEF7F2);
}
.quick-card__ph--icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
}
/* 会话列表灰态：沿用本页 loading 态同一个 Skeleton 组件，左右间距同 .activity-list；
   R8-L02-D10 补分区名，字号/字色取本页既有文本层级（同 .quick-card__title 的
   28rpx / 700 / --c-text-primary），让「这 4 行灰条＝会话」在屏幕上读得出来。 */
.guest-list {
  padding: 0 32rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.guest-list__label {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
}

/* R6-L02-D08：灰态列表末尾的「到此为止」一行——字号/字色与 .guest-wall__hint 同档
   （:1453-1456），保持游客区只有两种文本层级；44rpx 上内衬兼作可点热区下沿。 */
.guest-end {
  display: flex;
  justify-content: center;
  padding: 44rpx 32rpx 8rpx;
}

.guest-end__text {
  font-size: 24rpx;
  line-height: 1.5;
  color: var(--c-text-secondary, #4A524E);
}
</style>
