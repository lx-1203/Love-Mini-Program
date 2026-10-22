<script setup lang="ts">
/**
 * 喜欢与访客（2026-08-07 消息页重构独立二级页）。
 *
 * 从消息页「喜欢与访客」入口进入，与普通会话列表完全隔离：
 * - 双 Tab：「喜欢我的」/「我的访客」，选中态下划线高亮
 * - 数据概览栏：今日访客（R12-L07-D01：「总浏览量 / 今日浏览量」无后端真相源，按 §12 撤承诺整格撤除，只留真值格）
 * - 未解锁态：头像模糊 + 锁标识，昵称隐藏，仅展示少量基础标签
 * - 底部固定「解锁全部」按钮：VIP 免费放行，非 VIP 消耗交友币（幂等扣费）
 * - 顶部轻量「提升曝光」入口（不弹窗、不打断浏览，跳转 VIP 页）
 */
import { computed, ref, onMounted } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useLikesStore, type LikeRecord, type VisitorRecord } from "../../../stores/likes";
import { useProfileStore } from "../../../stores/profile";
import { useCoinsStore, UNLOCK_COST_YUAN } from "../../../stores/coins";
import { useVipStore } from "../../../stores/vip";
// P1-08：会员功能开关（关闭时 VIP 页/解锁免费放行全部降级）
import { featureFlags } from "../../../config/feature-flags";
import { usePageAccess } from "../../../composables/usePageAccess";
import { likesPageRequirements } from "../../../config/page-access";
import { openAppPath, replaceAppPath, setPendingLoginRedirect } from "../../../utils/navigation";
// 2026-08-09：路由常量化（他人主页 / 聊天会话 / 登录 / 资料完善）
import { ROUTES, SUBPACKAGE_ROUTES } from "../../../constants/routes";
import { IMAGE_PATHS } from "../../../config/images";
import { resolveMediaUrl } from "../../../utils/media";
// 2026-08-09 免踢登录：未登录切换进本页不跳登录页，由本页登录引导引导（R8-L06-D04 起为骨架下的 .guest-guide）
import { useSessionStore } from "../../../stores/session";
// 批次 A / ADR-2：解锁属商业化能力（commerce.coin 子闸），封存态禁用解锁入口
import { useAppConfigStore } from "../../../stores/app-config";
// 2026-09-04 视觉验收：var(--statusbar, env(safe-area-inset-top)) 在模拟器/部分机型为 0，标题与状态栏叠印，
// 与 AppShell 2026-08-29 修复同源——改用 statusBarHeight 注入
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";
// R8-L06-D04：游客不再整页换成 LockScreen（它是 position:fixed 满屏模态，会把骨架整块盖掉），
// 改为骨架常驻 + 列表区 .guest-guide 登录引导，故本文件不再引该组件。
import SafeImage from "../../../components/common/SafeImage.vue";
import EmptyState from "../../../components/common/EmptyState.vue";
import Skeleton from "../../../components/common/Skeleton.vue";
import ErrorState from "../../../components/common/ErrorState.vue";

const { t } = useI18n();
const statusBarHeightPx = useStatusBarHeight();
const likesStore = useLikesStore();
const profileStore = useProfileStore();
const coinsStore = useCoinsStore();
const vipStore = useVipStore();
const sessionStore = useSessionStore();
const appConfig = useAppConfigStore();

/**
 * 商业化封存（批次 A / ADR-2）：coin 子闸关闭（缺省即关）时，
 * 「解锁全部」入口隐藏、单条打码项点击仅提示封存、金币解锁标签隐藏，
 * 列表浏览与已解锁条目展示不受影响。
 */
const commerceCoinOn = computed(() => appConfig.isCommerceOn("coin"));

usePageAccess(likesPageRequirements);

/** 是否解锁：未登录 → 骨架常驻、列表区换成登录引导，仍不发鉴权请求 */
const isUnlocked = computed(() => sessionStore.isLoggedIn);
/**
 * R8-L06-D04：游客引导图 —— 用列表未解锁角标同一枚锁图标（IMAGE_PATHS.ICONS_EMOJI.LOCK，
 * 本文件 :423 已在用，real 档随包/后端双份在盘），过 resolveMediaUrl 出出口，不新增素材。
 */
const guestLockIconSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.ICONS_EMOJI.LOCK));
/** R8-L06-D04：登录出口，口径同 LockScreen.onPrimary（登录后自动续到资料完善页） */
function goLogin(): void {
  setPendingLoginRedirect(SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE);
  replaceAppPath(ROUTES.LOGIN);
}

const { likedBy, visitors, loading } = storeToRefs(likesStore);

const DEFAULT_AVATAR = IMAGE_PATHS.DEFAULT_AVATAR;

/** 当前 Tab：likedMe（喜欢我的）/ visitors（我的访客） */
const activeTab = ref<"likedMe" | "visitors">("likedMe");

const errorMessage = computed(() => likesStore.errorMessage);

/**
 * Tab 配置（下划线高亮，badge 展示新访客数）。
 * R11-L07-D01（可达性 P0）：游客态（!isUnlocked）两个 badge 一律不渲染——原「喜欢我的」
 * 右侧红底「1」取自 likedBy.value.length（mock 人格池，非本人数据），游客拿不到任何
 * 喜欢记录，却与同屏概览的 0/0/0 直接矛盾（假计数 + 张冠李戴）。登录后再按真实
 * likedBy / visitors 计数。列表本身在游客态已被 :406 登录引导整块替换，badge 无真值来源。
 */
const tabItems = computed(() => [
  {
    key: "likedMe" as const,
    label: t("likesVisitors.tabLikedMe"),
    badge: isUnlocked.value ? likedBy.value.length || undefined : undefined,
  },
  {
    key: "visitors" as const,
    label: t("likesVisitors.tabVisitors"),
    badge: isUnlocked.value
      ? visitors.value.filter((v) => v.isNew).length || undefined
      : undefined,
  },
]);

/**
 * P0-17：当前 Tab 是否仍有未解锁项（驱动底部「解锁全部」按钮显隐）。
 * 解锁状态以服务端 unlocked 字段为准，不再依赖本地 storage。
 */
const hasLockedItems = computed(() => currentList.value.some((item) => item.unlocked !== true));

/** 当前 Tab 解锁单价（元，仅用于文案展示；实际扣费由服务端 /wallet/unlock 定价） */
const unlockCost = computed(() =>
  UNLOCK_COST_YUAN[activeTab.value === "likedMe" ? "LIKES" : "VISITORS"],
);

/**
 * 数据概览（今日访客，单格）
 *
 * R12-L07-D01（P1）：本栏原三项中「总浏览量 / 今日浏览量」两项无后端真相源——
 * /profile/stats 的 ProfileStatsView 只有 followingCount / followersCount / likesCount，
 * visitorsCount 缺失 ⇒ totalViews 恒 0；「今日浏览量 = Math.min(totalViews, likedBy.length)」
 * 是把「喜欢我的条数」夹进总浏览量编出的假读数（mock 值下显示 22=喜欢数）。
 * 按 §12「无真相源只有两合法形态」中的撤承诺：字段落地之前两项整格撤除，
 * 只保留有真相源（fetchVisitors 返回记录的 isNew 标记计数）的「今日访客」。
 * 不许在前端换常量/挪写死表续编；后端补 visitorsCount 与按日浏览计数字段后再接真字段恢复。
 */
const overview = computed(() => ({
  todayVisitors: visitors.value.filter((v) => v.isNew).length,
}));

/** 当前 Tab 列表数据 */
const currentList = computed(() =>
  activeTab.value === "likedMe" ? likedBy.value : visitors.value,
);

/** 头像地址（上传目录鉴权改造后需 resolveMediaUrl 重写） */
function avatarOf(item: { avatar?: string; avatarUrl?: string }): string {
  const raw = item.avatarUrl || item.avatar || "";
  return raw ? resolveMediaUrl(raw) : DEFAULT_AVATAR;
}

onMounted(() => {
  void profileStore.load();
});

onShow(() => {
  // 2026-08-09 免踢登录：未登录只渲染骨架 + 登录引导，不发起鉴权请求（避免 401 被全局处理强拉登录页）
  if (!isUnlocked.value) return;
  // R4-00020 修复：原条件反置（loading 时重复请求、加载完成后永不刷新）。
  // 改为仅在未加载中时补拉，避免重复请求。
  if (!profileStore.loading) {
    void profileStore.load();
  }
  // 修复（2026-08-09）：fetchLikes/fetchVisitors 失败会向上 throw（P1 BUG 设计），
  // 页面侧必须接 catch，否则成为 unhandledRejection（页面异常刷屏 + 主线程卡顿）。
  // 失败由页面内错误态展示（errorMessage 已写入 store），无需额外处理。
  void likesStore.fetchLikes().catch(() => {
    /* store 已记录 errorMessage，页面错误态展示 */
  });
  void likesStore.fetchVisitors().catch(() => {
    /* 同上 */
  });
});

function switchTab(key: string) {
  activeTab.value = key as "likedMe" | "visitors";
}

// MP-R1-LSV-001：错误态「重试」按钮此前无 @retry 监听（emit 无监听为 no-op），
// 网络失败后点重试零反馈；对齐 likes/index.vue:703 口径补 retryLoad
function retryLoad(): void {
  void likesStore.fetchLikes().catch(() => {
    /* store 已记录 errorMessage，页面错误态展示 */
  });
  void likesStore.fetchVisitors().catch(() => {
    /* 同上 */
  });
}

/** 单条记录是否已解锁（服务端 unlocked 字段；缺失按未解锁处理） */
function isItemUnlocked(item: LikeRecord | VisitorRecord): boolean {
  return item.unlocked === true;
}

/**
 * P0-17：解锁当前 Tab 全部未解锁记录。
 *
 * 逐条调用 POST /api/v1/wallet/unlock（服务端幂等：已解锁不重复扣费），
 * 成功后更新对应记录的 unlocked=true 并刷新余额显示；余额不足时展示后端错误信息。
 *
 * P1-08：会员功能启用且当前用户为 VIP 时免费放行（不发起扣费请求）。
 */
async function handleUnlock() {
  // 批次 A / ADR-2：封存态（commerce.coin=false，缺省即封存）禁止解锁，toast 提示
  if (!commerceCoinOn.value) {
    uni.showToast({ title: t("commerce.sealedToast"), icon: "none" });
    return;
  }
  const lockedItems = currentList.value.filter((item) => item.unlocked !== true);
  if (lockedItems.length === 0) return;

  const targetType = activeTab.value === "likedMe" ? "LIKED_ME" : "VISITOR";

  // VIP 免费放行（R4-00021 修复）：仅当会员功能启用时生效（featureFlags.membershipEnabled 控制）。
  // 仍逐条调用服务端 /wallet/unlock（幂等，已解锁不重复扣费）持久化解锁状态，
  // 避免仅本地置位导致刷新后锁状态回退；服务端放行失败时降级为本地解锁兜底。
  if (featureFlags.membershipEnabled && vipStore.isVip) {
    try {
      for (const item of lockedItems) {
        const result = await likesStore.unlockUser(targetType, item.userId);
        void result;
        item.unlocked = true;
      }
    } catch (_e) {
      // 服务端 VIP 免费放行未生效（如余额不足）时降级为本地解锁，保证 VIP 体验不中断
      markAllUnlocked(true);
    }
    uni.showToast({ title: t("likesVisitors.unlockVipFree"), icon: "success" });
    return;
  }

  const confirmed = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: t("likesVisitors.unlockTitle"),
      content: t("likesVisitors.unlockConfirm", { coins: unlockCost.value, count: lockedItems.length }),
      confirmText: t("likesVisitors.unlockConfirmBtn"),
      cancelText: t("common.cancel"),
      success: (res) => resolve(!!res.confirm),
      fail: () => resolve(false),
    });
  });
  if (!confirmed) return;

  // P0-17：服务端解锁——targetType 按当前 Tab（喜欢我的→LIKED_ME / 访客→VISITOR），targetId=对方用户 id
  let lastBalance = 0;
  try {
    for (const item of lockedItems) {
      const result = await likesStore.unlockUser(targetType, item.userId);
      lastBalance = result.balance ?? lastBalance;
      item.unlocked = true;
    }
    // 解锁成功后刷新余额显示（wallet 页余额与 unlock 返回余额同源）
    void coinsStore.fetchBalance(true).catch(() => {
      // 余额刷新失败不阻塞（下次进入钱包页自动重取）
    });
    uni.showToast({ title: t("likesVisitors.unlockSuccess"), icon: "success" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : t("likesVisitors.unlockFail");
    // 2026-08-31 修复付费死路（录屏 05:52：余额不足 toast 后无任何去路）：
    // 余额类失败 → 弹窗引导跳转钱包充值页
    if (msg.includes("余额不足") || /balance/i.test(msg)) {
      uni.showModal({
        title: t("likesVisitors.unlockFailBalanceTitle"),
        content: t("likesVisitors.unlockFailBalanceContent"),
        confirmText: t("likesVisitors.goRecharge"),
        cancelText: t("common.cancel"),
        success: (res) => {
          if (res.confirm) {
            openAppPath(ROUTES.WALLET);
          }
        },
      });
      return;
    }
    uni.showToast({ title: msg, icon: "none" });
  }
}

/** 标记当前 Tab 全部记录为已解锁（VIP 免费放行路径） */
function markAllUnlocked(unlocked: boolean): void {
  for (const item of currentList.value) {
    item.unlocked = unlocked;
  }
}

/**
 * 点击用户：已解锁时进入主页；互相喜欢 → 直接去聊天（2026-08-09 闭环完善）。
 * 进入他人主页页（pages/profile/other），展示完整公开资料并支持喜欢/悄悄话。
 */
function goToUserProfile(userId: string) {
  if (!userId) return;
  const isMutual = likesStore.mutualLikes.some((m) => m.userId === userId);
  if (isMutual) {
    openAppPath(`${ROUTES.CHAT.SESSION}?userId=${encodeURIComponent(userId)}`);
    return;
  }
  openAppPath(`${ROUTES.PROFILE.OTHER}?userId=${encodeURIComponent(userId)}`);
}

/**
 * 返回上一页（自定义导航栏返回键）。
 * 无上一页时（如从 reLaunch/直达进入）回退到首页 tab。
 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 });
  } else {
    uni.switchTab({ url: "/pages/home/index" });
  }
}

/**
 * R4-00022：点击未解锁列表项时弹出解锁引导。
 * 复用底部「解锁全部」同一流程（VIP 免费 / 非 VIP 弹确认框），
 * 避免点击无任何反馈导致用户不知道如何解锁。
 */
function handleLockedItemTap(): void {
  void handleUnlock();
}

/** 提升曝光入口 → VIP 页（P1-08：会员功能未启用时提示并返回） */
function goToExposure() {
  if (!featureFlags.membershipEnabled) {
    uni.showToast({ title: t("likesVisitors.membershipDisabled"), icon: "none" });
    return;
  }
  openAppPath("/subpackages/vip/index");
}

/**
 * 列表项时间展示（R4-00019 修复，对齐 likes/index.vue P2-01 同类修复）。
 * 契约（likes.yaml）visitedAt 为 "yyyy-MM-dd HH:mm:ss"，
 * iOS/Safari 直接 new Date() 解析为 Invalid Date → 显示 NaN/NaN；
 * 先做 "yyyy-MM-dd HH:mm:ss" → ISO 格式转换，再加 isNaN 校验兜底。
 */
function formatTime(isoString?: string): string {
  if (!isoString) return "";
  // 兼容 "yyyy-MM-dd HH:mm:ss"：空格替换为 "T" 生成 ISO 时间串
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(isoString)
    ? isoString.replace(" ", "T")
    : isoString;
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return "";
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** 取列表项时间（喜欢记录用 likedAt，访客记录用 visitedAt） */
function timeOf(item: LikeRecord | VisitorRecord): string | undefined {
  return "likedAt" in item ? item.likedAt : item.visitedAt;
}
</script>

<template>
  <view
    class="likes-visitors-page"
    :style="{ paddingTop: `calc(${statusBarHeightPx}px + var(--sp-6))` }"
  >
    <!-- R8-L06-D04（可达性 P1）：原 <LockScreen v-if="!isUnlocked"> + <template v-else>
         把页头、双 Tab、概览三格、列表整块挡在登录判定之后，而 LockScreen 自身是
         position:fixed 铺满视口的模态层（LockScreen.vue:339-343）⇒ 实机档两帧除状态栏
         时钟与爱心浮动（全帧仅 597 px 不同、集中在 y<188）外逐像素相同，可滚区 0px，
         页自述的 3 格概览数字与 2 个 Tab 标签命中数 0。
         改法按缺陷卡：骨架（页头 + 曝光条 + 概览栏 + 双 Tab）常驻渲染，
         只有列表区在游客态换成条目级登录引导（见下方 .guest-guide）。 -->
    <!-- 顶部标题栏（2026-08-09：左侧补返回键，navigationStyle: custom 无系统返回栏） -->
    <view class="page-header">
      <view class="page-header__top">
        <view
          class="page-header__back press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('common.back')"
          @tap="goBack"
        >
          <image class="page-header__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
        </view>
        <text class="page-header__title">{{ t('likesVisitors.pageTitle') }}</text>
      </view>
      <text class="page-header__subtitle">{{ t('likesVisitors.pageSubtitle') }}</text>
    </view>

    <!-- 轻量「提升曝光」入口（不弹窗、不打断浏览；2026-08-08 走查 P1：会员未启用时整条隐藏） -->
    <view v-if="featureFlags.membershipEnabled" class="exposure-bar press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('likesVisitors.exposure')" @tap="goToExposure">
      <image class="exposure-bar__icon" :src="IMAGE_PATHS.ICONS_EMOJI.MEGAPHONE" mode="aspectFit" alt="" />
      <text class="exposure-bar__text">{{ t('likesVisitors.exposure') }}</text>
      <text class="exposure-bar__arrow">›</text>
    </view>

    <!-- 数据概览栏（R12-L07-D01：撤「总浏览量 / 今日浏览量」两格——ProfileStatsView 无
         visitorsCount / 按日浏览计数字段，原值一恒 0、一是把喜欢数夹进浏览量的假读数；
         只保留有 fetchVisitors 记录 isNew 标记作真相源的「今日访客」。§12 撤承诺形态。 -->
    <view class="overview">
      <view class="overview__item">
        <text class="overview__value">{{ overview.todayVisitors }}</text>
        <text class="overview__label">{{ t('likesVisitors.overviewTodayVisitors') }}</text>
      </view>
    </view>

    <!-- Tab 切换（主色下划线，选中态高亮） -->
    <view class="tabs" role="list">
      <view
        v-for="tab in tabItems" :key="tab.key"
        class="tabs__item"
        :class="{ 'tabs__item--active': activeTab === tab.key }"
        role="button"
        :aria-pressed="activeTab === tab.key"
        @tap="switchTab(tab.key)"
      >
        <text class="tabs__text">{{ tab.label }}</text>
        <view v-if="tab.badge" class="tabs__badge">
          <text class="tabs__badge-text">{{ tab.badge > 99 ? '99+' : tab.badge }}</text>
        </view>
      </view>
    </view>

    <!-- R8-L06-D04：游客态列表区登录引导（骨架之下的唯一分支，条目级操作换成登录出口） -->
    <view v-if="!isUnlocked" class="guest-guide" role="status" :aria-label="t('lock.titleLoggedOut')">
      <image class="guest-guide__icon" :src="guestLockIconSrc" mode="aspectFit" alt="" />
      <text class="guest-guide__title">{{ t('lock.titleLoggedOut') }}</text>
      <text class="guest-guide__desc">{{ t('lock.subtitleLoggedOut') }}</text>
      <view
        class="guest-guide__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('lock.primaryLoggedOut')"
        @tap="goLogin"
      >
        <text class="guest-guide__btn-text">{{ t('lock.primaryLoggedOut') }}</text>
      </view>
      <text class="guest-guide__hint">{{ t('lock.footerTip') }}</text>
    </view>

    <!-- 错误态 -->
    <!-- MP-R1-LSV-001：补 @retry="retryLoad"（原重试按钮点击零响应） -->
    <ErrorState v-else-if="errorMessage && currentList.length === 0" :message="errorMessage" @retry="retryLoad" />

    <!-- 加载中 -->
    <view v-else-if="loading" class="list">
      <Skeleton variant="list" :count="3" />
    </view>

    <!-- 空态 -->
    <EmptyState
      v-else-if="currentList.length === 0"
      type="no-data"
      :title="activeTab === 'likedMe' ? t('likesVisitors.emptyLikedMe') : t('likesVisitors.emptyVisitors')"
    />

    <!-- 用户列表（P0-17：逐条按服务端 unlocked 字段打码，未解锁：头像模糊 + 昵称隐藏） -->
    <view v-else class="list" role="list">
      <view
        v-for="item in currentList" :key="item.userId || item.id"
        class="list__item"
        role="button"
        :aria-label="isItemUnlocked(item) ? item.name : t('likesVisitors.nameHidden')"
        @tap="isItemUnlocked(item) ? goToUserProfile(item.userId) : handleLockedItemTap()"
      >
        <!-- 头像（未解锁时模糊 + 锁标识） -->
        <view class="list__avatar-wrap">
          <view class="list__avatar" :class="{ 'list__avatar--blur': !isItemUnlocked(item) }">
            <SafeImage :src="avatarOf(item)" :fallback="DEFAULT_AVATAR" mode="aspectFill" :lazy-load="true" :alt="item.name || ''" />
          </view>
          <view v-if="!isItemUnlocked(item)" class="list__lock">
            <image class="list__lock-icon" :src="IMAGE_PATHS.ICONS_EMOJI.LOCK" mode="aspectFit" alt="" />
          </view>
        </view>

        <!-- 信息区 -->
        <view class="list__info">
          <text v-if="isItemUnlocked(item)" class="list__name">{{ item.name || '—' }}</text>
          <text v-else class="list__name list__name--hidden">{{ t('likesVisitors.nameHidden') }}</text>
          <text v-if="isItemUnlocked(item)" class="list__meta">{{ item.headline || '' }}</text>
          <!-- 未解锁：仅展示少量基础标签 -->
          <view v-else class="list__tags">
            <text class="list__tag">{{ t('likesVisitors.tagAge') }}</text>
            <text class="list__tag">{{ t('likesVisitors.tagSameCity') }}</text>
            <!-- 批次 A / ADR-2：商业化封存态（commerce.coin=false）隐藏金币解锁标签 -->
            <text v-if="commerceCoinOn" class="list__tag list__tag--coin">{{ t('likesVisitors.tagUnlockHint', { coins: unlockCost }) }}</text>
          </view>
        </view>

        <!-- 时间 -->
        <text v-if="isItemUnlocked(item)" class="list__time">{{ formatTime(timeOf(item)) }}</text>
      </view>
    </view>

    <!-- 底部固定「解锁全部」按钮（当前 Tab 存在未解锁项时显示）；
         批次 A / ADR-2：商业化封存态（commerce.coin=false）一并隐藏 -->
    <view v-if="hasLockedItems && commerceCoinOn" class="unlock-bar">
      <button class="unlock-bar__btn" :aria-label="t('likesVisitors.unlockBtn', { coins: unlockCost })" @tap="handleUnlock">
        <text class="unlock-bar__btn-text">{{ t('likesVisitors.unlockBtn', { coins: unlockCost }) }}</text>
      </button>
      <text class="unlock-bar__hint">{{ t('likesVisitors.unlockHint') }}</text>
    </view>

    <!-- 底部安全区占位（避免内容被固定按钮遮挡） -->
    <view v-if="hasLockedItems && commerceCoinOn" class="unlock-bar-spacer" />
  </view>
</template>

<style scoped lang="scss">
.likes-visitors-page {
  min-height: 100vh;
  background: var(--c-gradient-page);
  /* R11-L07-D08（间距 P3）：原 padding 简写里的 padding-top
     calc(var(--statusbar, env(...)) + var(--sp-6)) 被 :354 行内 statusBarHeightPx 注入
     永久压过（行内优先级更高），是从不落画的孤儿声明 ⇒ 拆成右/下/左三条，
     顶部只留行内注入这一个来源（本条按卡定义即无像素变化，纯来源收口）。 */
  padding-right: var(--sp-7);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-8));
  padding-left: var(--sp-7);
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
  box-sizing: border-box;
}

.page-header {
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

/* 2026-08-09：返回键 + 标题（同一行） */
.page-header__top {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.page-header__back {
  flex-shrink: 0;
  /* R10-L07-D01（可达性 P1）：原 64rpx(32px) 圆钮只有 88rpx(44px) 热区口径的 73%，
     且本页 navigationStyle=custom、无原生导航、游客态唯一离页出口就是它 ⇒ 提到 88rpx
     达标热区（内层 .page-header__back-icon 仍 40rpx，钮面视觉由背景圆撑大）。 */
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-header__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.page-header__title {
  /* R11-L07-D03（字号 P2）：原 --fs-4xl（真值 40rpx=20px）比 §1.3 页头档下限 26px 低 6px，
     同域另四页走 AppShell .shell__title 的 --fs-7xl(56rpx=28px)⇒ 收成同档。 */
  font-size: var(--fs-7xl, 56rpx);
  font-weight: 800;
  color: var(--c-text-primary);
}

.page-header__subtitle {
  font-size: var(--fs-sm);
  /* R12-L07-D02（颜色token P2）：24rpx=12px 次级文字取 tertiary 在页底仅 4.1-4.3:1 < 4.5:1，
     提到 secondary（#4A524E，压页底 ≈7.4:1），与同页 guest-guide__desc 用墨档对齐。 */
  color: var(--c-text-secondary);
}

/* ========== R8-L06-D04（可达性 P1）：游客登录引导（占列表区，骨架之上不再整页被顶替） ========== */
.guest-guide {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* R11-L07-D07（空态文案 P2）：游客引导卡之下原有约 357px（视口 44%）纯页面底，
     而空态分支挂在 v-else-if 被 :406 的 v-if 短路，永远命中不到 ⇒ 把本卡按卡给的第二条
     口径撑到列表区高度：占满概览/Tab 之后的剩余视口，内容纵中，半屏空白消失。 */
  flex: 1 1 auto;
  justify-content: center;
  gap: var(--sp-3);
  padding: var(--sp-8) var(--sp-6);
  /* R11-L07-D05（圆角 P2）：原 --r-lg(20rpx=10px) 只有规范卡片档 40rpx=20px 的一半，
     与同页概览卡又各自一档 ⇒ 统一 --card-radius(40rpx)。 */
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  box-sizing: border-box;
}

.guest-guide__icon {
  width: 96rpx;
  height: 96rpx;
}

.guest-guide__title {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-primary);
  text-align: center;
}

.guest-guide__desc {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  text-align: center;
}

/* 主出口钮面取 --c-brand-800（白字 6.45:1），与 LockScreen.vue:717 同一档结论，
   不用渐变（渐变浅端压白字实测 1.97:1，R8-L07-D03 已判）。
   R11-L07-D06（颜色token P2）核过建议改法后**不采纳**：卡建议的 --c-brand #36C99A 压白
   ≈1.9:1、退档 --c-brand-600 #2AAE83 压白 2.81:1（本任务书 §2 实测表两行均已否掉），
   换过去等于把 6.45:1 的主 CTA 做成不达 4.5:1；且 R9 已把主 CTA 收成 brand-800 立为在册
   设计裁定（任务书 §11.3：别回退）。故维持深档，本条按「建议改法不成立」登记未修。 */
.guest-guide__btn {
  margin-top: var(--sp-4);
  min-height: 88rpx;
  padding: 0 var(--sp-8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-full);
  background: var(--c-brand-800, #156B51);
}

.guest-guide__btn-text {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-inverse, #FFFFFF);
}

.guest-guide__hint {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  text-align: center;
}

/* ========== 提升曝光入口 ========== */
.exposure-bar {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-6);
  border-radius: var(--r-lg);
  background: linear-gradient(135deg, var(--c-bg-brand), var(--c-romance-50));
  border: 1rpx solid var(--c-brand-200);
}

.exposure-bar__icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.exposure-bar__text {
  flex: 1;
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-brand-700);
}

.exposure-bar__arrow {
  font-size: var(--fs-2xl);
  color: var(--c-brand-700);
  line-height: 1;
}

/* ========== 数据概览栏 ========== */
.overview {
  display: flex;
  padding: var(--sp-5) var(--sp-3);
  /* R11-L07-D02（圆角 P2）：原 --r-xl 真值 24rpx=12px，只有规范卡片档 40rpx=20px 的六成，
     帧上四角明显比同域 love-center 卡更方 ⇒ 统一 --card-radius(40rpx)。 */
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container);
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
}

.overview__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-1);
}

.overview__value {
  font-size: var(--fs-3xl);
  font-weight: 800;
  color: var(--c-text-primary);
  font-variant-numeric: tabular-nums;
}

.overview__label {
  /* R10-L07-D02（字号 P2）：三栏说明字原走 --fs-xs=20rpx(10px)，属「角标·法务」档，
     且只有同卡数字（--fs-3xl 18px）的 55%，三栏读数失去说明层级 ⇒ 提到 --fs-base
     (24rpx=12px)，对齐 §1.3 小字档。 */
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

/* ========== Tab 切换（主色下划线） ========== */
.tabs {
  display: flex;
  gap: var(--sp-8);
  border-bottom: 1rpx solid var(--c-divider-light);
}

.tabs__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  /* R11-L07-D04（可达性 P1）：原上下 padding 各 12rpx + 28rpx 文本行 ≈63rpx=31px，
     低于 88rpx 热区下限，而双 Tab 是本页切换列表的唯一控件（无替代出口）
     ⇒ min-height 撑到 88rpx，纵向 padding 提到 --sp-5(20rpx)，文字基线由 flex 居中保位。 */
  min-height: 88rpx;
  padding: var(--sp-5) var(--sp-2);
}

.tabs__text {
  font-size: var(--fs-lg);
  color: var(--c-text-secondary);
}

.tabs__item--active .tabs__text {
  color: var(--c-text-primary);
  font-weight: 600;
}

.tabs__item--active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 48rpx;
  height: 4rpx;
  border-radius: var(--r-xs);
  background: var(--c-brand, #36C99A);
}

.tabs__badge {
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 var(--sp-1);
  border-radius: var(--r-full);
  background: var(--c-error);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tabs__badge-text {
  font-size: 18rpx;
  font-weight: 700;
  color: var(--c-text-inverse);
}

/* ========== 列表 ========== */
.list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-4);
}

.list__item {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  border: var(--c-border-card);
  box-shadow: var(--s-card-soft);
}

.list__avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.list__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-full);
  overflow: hidden;
  background: var(--c-bg-page);
}

.list__avatar--blur {
  border-radius: var(--r-full);

  filter: blur(14rpx);
}

/* 未解锁锁标识（覆盖在模糊头像上） */
.list__lock {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  /* R4-02530：白色叠层改用 token（深色模式自动适配） */
  background: var(--c-overlay-white-bg-strong-mid, rgba(255, 255, 255, 0.35));
  border-radius: var(--r-full);
}

.list__lock-icon {
  width: 40rpx;
  height: 40rpx;
}

.list__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.list__name {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &--hidden {
    color: var(--c-text-tertiary);
    font-weight: 500;
  }
}

.list__meta {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 未解锁基础标签 */
.list__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-2);
}

.list__tag {
  font-size: 20rpx;
  font-weight: 500;
  padding: 2rpx 12rpx;
  border-radius: var(--r-sm);
  background: var(--c-bg-page);
  color: var(--c-text-secondary);

  &--coin {
    background: var(--c-bg-brand);
    color: var(--c-brand-700);
  }
}

.list__time {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  flex-shrink: 0;
  align-self: flex-start;
}

/* ========== 底部固定解锁按钮 ========== */
.unlock-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  padding: var(--sp-4) var(--sp-8);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-4));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, var(--c-bg-container) 30%);
}

.unlock-bar__btn {
  width: 100%;
  height: 88rpx;
  border: 0;
  border-radius: var(--r-xl);
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand);
  line-height: 88rpx;
  text-align: center;
}

.unlock-bar__btn::after {
  border: none;
}

.unlock-bar__btn-text {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.unlock-bar__hint {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* 固定按钮占位（防止遮挡列表末尾） */
.unlock-bar-spacer {
  height: 240rpx;
  flex-shrink: 0;
}
</style>
