<script setup lang="ts">
/**
 * 活动详情页（任务 E2）
 *
 * 通过 onLoad 读取 options.id：
 * 1. 优先从 activity store 中按 id 匹配真实/模拟活动数据；
 * 2. 未匹配时回退到内置示例活动（新人礼遇 / 周末派对 / 七夕交友会，i18n activities.sample.*）；
 * 3. 报名按钮点击后 toast 提示"报名成功，请留意通知"（真实报名链路由活动列表页/后端负责）。
 */
import { ref, computed, onMounted } from "vue";
import { onLoad, onShareAppMessage, onShareTimeline } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { lightHaptic } from "../../../utils/haptic";
import { IMAGE_PATHS } from "../../../config/images";
import SkeletonBlock from "../../../components/common/SkeletonBlock.vue";
import { useActivityStore, type ActivityItem } from "../../../stores/activity";
import { ROUTES } from "../../../constants/routes";
import { TOAST_DURATION } from "../../../constants/limits";
import { openAppPath } from "../../../utils/navigation";
// P8-2.3：报名成功后向本地 mock 会话存储追加一条助手活动消息
import { appendAssistantActivityNotify } from "../../../utils/assistant-notify";
// R11-G2：注入 --statusbar（本页样式使用 var(--statusbar, env(...))，DevTools env 恒 0 必须由 JS 注入）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
const { styleVars: menuStyleVars } = useMenuButtonRect();


const { t } = useI18n();

/** 详情页图标 */
const icons = {
  location: IMAGE_PATHS.ICONS_EMOJI.LOCATION,
  schedule: IMAGE_PATHS.ICONS_COMMON.SCHEDULE_SVG,
  /* R10-L08-D09（可达性 P1）：页头底是 brand-500→brand-400 亮绿渐变（.detail-header 的 background），
     原返回箭头吃 ICONS_COMMON.BACK（common/back.png 折线 #94A2B7，见 R8 在册项），
     帧上最暗墨迹 #8BA8B6 压绿底实测 1.30:1，低于非文本控件 3:1 线 ⇒ 页内返回出口找不到
     （微信胶囊只有「更多/关闭」）。换同图形、单色 #333333 的 v2 档（与同 lane
     subpackages/tools/search/index.vue:255 同口径，real 帧已实证该素材在包内可渲染）：
       箭头落在 .detail-header__back 的 rgba(255,255,255,.2) 圆底上
       ⇒ 深端底 #36C99A 合成 (94,212,174) L=0.5244，#333333 L=0.0331 ⇒ 6.91:1
       ⇒ 浅端底 #55D5A7 合成 (119,221,185) L=0.5934 ⇒ 7.74:1
     两档均 ≥3:1（非文本）且 ≥4.5:1，与本页标题墨色（.detail-header__title 的 --c-brand-900）同族。 */
  back: IMAGE_PATHS.ICONS_V2.BACK,
} as const;

const activityStore = useActivityStore();

/** 从 URL 传入的活动 id */
const activityId = ref("");

/** 当前展示的活动（store 匹配或示例数据） */
const activity = ref<ActivityItem | null>(null);

/** 是否使用内置示例内容（store 未匹配到） */
const isSample = ref(false);

/**
 * 内置示例活动（新人礼遇 / 周末派对 / 七夕交友会）。
 * 文案全部来自 i18n activities.sample.*，封面复用 IMAGE_PATHS 占位图。
 */
function buildSampleActivities(): ActivityItem[] {
  return [
    {
      id: "sample-new-user-gift",
      title: t("activities.sample.newUserGift.title"),
      location: t("activities.sample.newUserGift.location"),
      scheduleText: t("activities.sample.newUserGift.time"),
      date: "",
      enrollCount: 0,
      description: t("activities.sample.newUserGift.desc"),
      isEnrolled: false,
      status: "open",
      coverImage: IMAGE_PATHS.ACTIVITIES.ACTIVITY_1,
    },
    {
      id: "sample-weekend-party",
      title: t("activities.sample.weekendParty.title"),
      location: t("activities.sample.weekendParty.location"),
      scheduleText: t("activities.sample.weekendParty.time"),
      date: "",
      enrollCount: 0,
      description: t("activities.sample.weekendParty.desc"),
      isEnrolled: false,
      status: "open",
      coverImage: IMAGE_PATHS.ACTIVITIES.ACTIVITY_2,
    },
    {
      id: "sample-qixi-meetup",
      title: t("activities.sample.qixiMeetup.title"),
      location: t("activities.sample.qixiMeetup.location"),
      scheduleText: t("activities.sample.qixiMeetup.time"),
      date: "",
      enrollCount: 0,
      description: t("activities.sample.qixiMeetup.desc"),
      isEnrolled: false,
      status: "open",
      coverImage: IMAGE_PATHS.ACTIVITIES.ACTIVITY_3,
    },
    {
      // MP-R1-SUBPACKAGES-CHAT-OFFICIAL-CHAT-INDEX-011：补官方聊天卡片指向的
      // id=2001「城市露营计划」——此前该 id 不在数据源，详情页回退展示第一个示例
      // 「新人礼遇」，卡片标题/时间/地点与目标页完全不符（双身份截图实证）
      id: "2001",
      title: t("activities.sample.cityCamp.title"),
      location: t("activities.sample.cityCamp.location"),
      scheduleText: t("activities.sample.cityCamp.time"),
      date: "",
      enrollCount: 12,
      description: t("activities.sample.cityCamp.desc"),
      isEnrolled: false,
      status: "open",
      coverImage: IMAGE_PATHS.ACTIVITIES.ACTIVITY_SPORTS,
    },
  ];
}

/** 从 store 中按 id 匹配活动 */
function findFromStore(id: string): ActivityItem | null {
  return activityStore.activities.find((a) => a.id === id) ?? null;
}

/** 首次拉取是否失败（用于展示错误态与重试） */
const loadError = ref(false);

/**
 * R11-L08-D12（文案 P1）：URL 带了 id、列表与详情接口都取不到 ⇒ 落「未找到该活动」错误态。
 * 原实现在这里 `samples.find(...) ?? samples[0]`：任意未知 id（含真实但后端已下架的 id）
 * 都被静默画成第一条示例「新人礼遇」，用户拿不到该活动的任何字段，
 * 全页唯一披露只有封面左上角一枚 --fs-xs(10px) 小徽标。
 */
const notFound = ref(false);

/** 错误态文案（拉取失败 / 该 id 不存在，两态复用同一 detail-error 槽，均取既有 i18n 键） */
const errorText = computed(() =>
  notFound.value
    ? t("storeErrors.activity.loadDetailFailed")
    : t("storeErrors.activity.loadActivitiesFailed"),
);

/** 无 id 裸开（分享链接缺参、取景直开）时展示的内置示例入口 id */
const DEMO_ENTRY_ID = "sample-new-user-gift";

/** 命中内置示例 id 才渲染示例内容（精确匹配，不再兜底到第一条）；命中即返回 true */
function applySample(id: string): boolean {
  const matched = buildSampleActivities().find((s) => s.id === id);
  if (!matched) return false;
  activity.value = matched;
  isSample.value = true;
  isSignedUp.value = !!matched.isEnrolled;
  loadError.value = false;
  notFound.value = false;
  return true;
}

/**
 * 解析并展示活动内容（同步报名状态：isSignedUp 与 activity.isEnrolled 保持一致）。
 *
 * R11-L08-D12 的取数顺序（列表 → 详情接口 → 示例 id 精确命中 → 错误态）：
 * 1. store 列表按 id 命中 ⇒ 真实活动（原行为不变）；
 * 2. 列表没有这个 id ⇒ 打**在册的真详情接口** GET /api/v1/activities/{id}
 *    （`stores/activity.ts:328 fetchActivityDetail`，字段由后端 `ActivityDetailView.java:12-25`
 *    的 title/location/scheduleText/description/enrollmentCount/participantAvatars/
 *    activityDate/status/isEnrolled/category/coverImage 下发）⇒ 真实活动；
 * 3. 详情接口也没有 ⇒ 只有**内置示例 id 精确命中**才渲染示例内容
 *    （含 :99-112 那枚在册落点 id=2001「城市露营计划」，官方助手卡片指向它，不能断）；
 * 4. 其余一律 notFound 错误态 + 重试，不再画示例。
 * 无 id 裸开仍展示示例入口（第 3 步的 DEMO_ENTRY_ID），但示例内容现在带**整页可见的披露行**
 * （模板 .detail-sample-note，与封面小徽标同时存在）⇒ 不再是「静默」落示例。
 */
async function resolveActivity(id: string): Promise<void> {
  const fromStore = findFromStore(id);
  if (fromStore) {
    activity.value = fromStore;
    isSample.value = false;
    isSignedUp.value = !!fromStore.isEnrolled;
    loadError.value = false;
    notFound.value = false;
    return;
  }
  if (id) {
    const detail = await activityStore.fetchActivityDetail(id);
    if (detail) {
      activity.value = detail;
      isSample.value = false;
      isSignedUp.value = !!detail.isEnrolled;
      loadError.value = false;
      notFound.value = false;
      return;
    }
  }
  if (applySample(id)) return;
  if (!id && applySample(DEMO_ENTRY_ID)) return;
  activity.value = null;
  // 列表本身就拉失败过时（网络因），错误文案留给 loadActivitiesFailed；
  // 只有列表成功而该 id 确实取不到时，才是「该活动取不到详情」（内容因）
  notFound.value = !loadError.value;
}

onLoad((options) => {
  const id = options?.id ?? "";
  activityId.value = id;
  // 微信端开启右上角「...」转发/朋友圈菜单（分享本页活动卡片；H5 不支持时静默降级）
  try {
    uni.showShareMenu({ withShareTicket: true, menus: ["shareAppMessage", "shareTimeline"] });
  } catch (_e) {
    // H5 端 showShareMenu 不支持时静默降级
  }
  if (activityStore.activities.length > 0) {
    void resolveActivity(id);
    return;
  }
  // store 尚无数据：拉取一次后再解析（失败时标记错误态供重试；R11-L08-D12 后不再回退示例内容）
  void activityStore
    .fetchActivities()
    .then(() => resolveActivity(id))
    .catch(() => {
      loadError.value = true;
      void resolveActivity(id);
    });
});

/** 重试：清空错误态后重新拉取 */
function retryLoad() {
  loadError.value = false;
  notFound.value = false;
  void activityStore
    .fetchActivities()
    .then(() => resolveActivity(activityId.value))
    .catch(() => {
      loadError.value = true;
      void resolveActivity(activityId.value);
    });
}

onMounted(() => {
  // 兜底：若 onLoad 的异步拉取未完成，页面挂载后再尝试解析一次
  if (!activity.value && activityId.value) {
    void resolveActivity(activityId.value);
  }
});

/** 封面图：示例活动使用占位图，store 活动使用其 coverImage */
const coverImage = computed<string>(() => {
  return activity.value?.coverImage || IMAGE_PATHS.ACTIVITIES.ACTIVITY_1;
});

/**
 * 活动状态文案（open=报名中 / ongoing=进行中 / ended、closed=已结束 / upcoming=预告）
 *
 * R11-L08-D17（空态文案 P2）：原来 status 缺失时兜底 `t("activities.statusUpcoming")`，
 * 于是「示例常量 status:'open'」与「详情接口没映射 status 的真活动」都会被画成一枚状态胶囊。
 * 示例活动不是真活动、其 status 是 .vue 里的字面量（无真相源），真活动缺列时更不该编一个「预告」
 * ⇒ 这两种情况一律不渲染该胶囊（模板 v-if="statusText"），状态只在后端确实下发了枚举时上屏。
 */
const statusText = computed(() => {
  if (!activity.value || isSample.value) return "";
  const status = activity.value.status;
  if (status === "open") return t("activities.statusOpen");
  if (status === "ongoing") return t("activities.statusOngoing");
  if (status === "ended" || status === "closed") return t("home.activityStatusClosed");
  if (status === "upcoming") return t("activities.statusUpcoming");
  return "";
});

/**
 * R11-L08-D15 / R11-L08-D17：报名决策的第二条依据，只接后端真字段。
 * · 人数 = `enrollCount`（后端 `ActivityDetailView.enrollmentCount`，stores/activity.ts:359 映射，
 *   报名成功后 :269-274 本地自增/自减同步）；
 * · 日期 = `date`（后端 `activityDate` 列，stores/activity.ts:358 映射，示例活动恒 ""）。
 * 两行都只在**真实活动**（非示例内容）下渲染：示例常量项的 enrollCount 是写死的 0/12、
 * date 是空串，把它们画成「12人已报名」等于给一个不存在的活动编一个报名数（硬规矩 6）。
 * 卡上建议的「报名截止」这一列后端没有（`activityDate` 是活动当天日期，不是截止日），
 * 按 §12.4 第④条登记 NEEDS-DATA，不改名借用。
 */
const activityDateLabel = computed<string>(() => {
  const raw = activity.value?.date ?? "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!m) return "";
  return t("activities.dateLabel", { month: Number(m[2] ?? 0), day: Number(m[3] ?? 0) });
});

/** 报名人数行是否可渲染：真实活动 + 后端给了数（示例内容恒不渲染，见上） */
const showEnrollCount = computed(() => !isSample.value && !!activity.value);

/**
 * P8-2.3：报名成功后向官方助手（寻觅助手）本地会话存储追加一条「报名成功」消息。
 * 消息为 card 类型（content=报名文案 + cardActivity=活动详情卡片，可点击回活动详情页）。
 */
function notifyEnrollSuccess(): void {
  const title = activity.value?.title ?? "";
  const id = activity.value?.id ?? "";
  if (!title || !id) return;
  appendAssistantActivityNotify({
    id: Date.now(),
    messageType: "card",
    content: t("activities.enrollMsg", { title }),
    cardTitle: title,
    cardDesc: `${activity.value?.scheduleText ?? ""} · ${activity.value?.location ?? ""}`,
    cardTag: t("activities.enrollTag"),
    cardTargetUrl: `${ROUTES.ACTIVITY_DETAIL}?id=${encodeURIComponent(id)}`,
    publishedAt: new Date().toISOString(),
    cardActivity: {
      activityId: Number(id) || 0,
      title,
      imageUrl: coverImage.value || null,
      timeText: activity.value?.scheduleText ?? null,
      locationText: activity.value?.location ?? null,
      enrollmentCount: activity.value?.enrollCount ?? activity.value?.enrollmentCount ?? 0,
      recommendReason: "",
    },
  });
}

/**
 * P8-2.2：分享活动 = 复制小程序内链接。
 * 复制 `/subpackages/tools/activities/detail?id=<activityId>` 到剪贴板并 toast 提示；
 * 接收方点开即直达活动详情（详情页 onLoad 已读取 id）。mp-weixin 无小程序内
 * 链接分享，改用复制链接方式。
 */
function handleCopyShare() {
  lightHaptic();
  const id = shareId.value;
  const link = id
    ? `${ROUTES.ACTIVITY_DETAIL}?id=${encodeURIComponent(id)}`
    : ROUTES.ACTIVITY_DETAIL;
  uni.setClipboardData({
    data: link,
    success: () => {
      uni.showToast({ title: t("activities.linkCopied"), icon: "none", duration: TOAST_DURATION.NORMAL_MS });
    },
    fail: () => {
      uni.showToast({ title: t("activities.copyLinkFailed"), icon: "none" });
    },
  });
}

/** 报名：真实链路走 store（POST /api/activities/{id}/enroll）；示例活动本地闭环 */
const isSignedUp = ref(false);
async function handleSignup() {
  lightHaptic();
  if (activityStore.enrolling) return;
  const id = activity.value?.id ?? "";
  const inStore = findFromStore(id) !== null;
  if (inStore) {
    const ok = await activityStore.enrollActivity(id);
    isSignedUp.value = ok;
    if (ok) {
      notifyEnrollSuccess();
    }
    uni.showToast({
      title: ok ? t("activities.signupSuccess") : t("activities.enrollFailedToast"),
      icon: "none",
      duration: TOAST_DURATION.NORMAL_MS,
    });
    return;
  }
  // 示例活动（无后端资源）：本地闭环
  isSignedUp.value = true;
  notifyEnrollSuccess();
  uni.showToast({ title: t("activities.signupSuccess"), icon: "none", duration: TOAST_DURATION.NORMAL_MS });
}

/** 退出报名（收尾轮：已报名态可退出，恢复报名按钮；真实链路走 store DELETE） */
async function handleQuitSignup() {
  lightHaptic();
  if (activityStore.enrolling) return;
  const id = activity.value?.id ?? "";
  const inStore = findFromStore(id) !== null;
  if (inStore) {
    // enrollActivity 为切换语义：已报名时调用即为取消报名，返回最终报名状态
    const ok = await activityStore.enrollActivity(id);
    isSignedUp.value = ok;
    uni.showToast({
      title: ok ? t("activities.enrolledToast") : t("activities.unenrolledToast"),
      icon: "none",
      duration: TOAST_DURATION.NORMAL_MS,
    });
    return;
  }
  isSignedUp.value = false;
  uni.showToast({ title: t("activities.quitSignupSuccess"), icon: "none", duration: TOAST_DURATION.NORMAL_MS });
}

/** 返回上一页 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    openAppPath("/subpackages/discover/activities/index");
  }
}

/* ========== 分享（微信卡片/朋友圈，跳转本页并携带活动 id） ========== */

/** 分享目标活动 id（URL 传入优先，其次为当前解析出的活动） */
const shareId = computed(() => activityId.value || activity.value?.id || "");

/** 分享标题：邀请语 + 活动名 */
const shareTitle = computed(() => t("activities.shareTitle", { title: activity.value?.title ?? "" }));

/** 分享路径：指向当前活动详情页，接收方点开即跳转（id 为空时分享页面本身） */
const sharePath = computed(() =>
  shareId.value ? `${ROUTES.ACTIVITY_DETAIL}?id=${encodeURIComponent(shareId.value)}` : ROUTES.ACTIVITY_DETAIL
);

/**
 * 分享给微信好友/群聊（open-type="share" 按钮或右上角「...」触发）。
 * 微信原生联系人选择器：任意好友/群均可接收，非站内固定会话；
 * 卡片内容始终为当前活动，随页面数据实时更新。
 */
onShareAppMessage(() => ({
  title: shareTitle.value,
  path: sharePath.value,
}));

/** 分享到朋友圈（query 带活动 id，点开后同样落到对应详情页） */
onShareTimeline(() => ({
  title: shareTitle.value,
  query: shareId.value ? `id=${encodeURIComponent(shareId.value)}` : "",
}));
</script>

<template>
  <view class="detail-page" :style="menuStyleVars">
    <!-- 顶部栏 -->
    <view class="detail-header">
      <view class="detail-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <image class="detail-header__back-icon" :src="icons.back" mode="aspectFit" alt="" />
      </view>
      <text class="detail-header__title">{{ t('activities.detailNavTitle') }}</text>
      <view class="detail-header__spacer" />
    </view>

    <scroll-view v-if="activity" scroll-y class="detail-scroll" :show-scrollbar="false">
      <!-- 封面图 -->
      <view class="detail-cover">
        <image class="detail-cover__img" :src="coverImage" mode="aspectFill" lazy-load alt="" />
        <view v-if="isSample" class="detail-cover__badge">
          <text class="detail-cover__badge-text">{{ t('activities.sampleBadge') }}</text>
        </view>
      </view>

      <!-- 标题 + 状态 -->
      <view class="detail-section">
        <view class="detail-title-row">
          <text class="detail-title">{{ activity.title }}</text>
          <!-- R4（2026-08-09）：活动分类标签（场景展示） -->
          <text v-if="activity.category" class="detail-category-tag">
            {{ t(`activities.category.${activity.category}`) }}
          </text>
          <view v-if="statusText" class="detail-status">
            <text class="detail-status__text">{{ statusText }}</text>
          </view>
        </view>

        <!-- R11-L08-D12（文案 P1）：示例内容的整页可见披露行。
             原全页唯一披露是封面左上角一枚 --fs-xs(10px) 小徽标（模板 :356），
             下方标题卡/介绍卡不再区分示例与真实 ⇒ 示例常量读起来就是该活动的真信息。
             这行把同一枚在册键 activities.sampleBadge 提到正文级字号挂在标题下方，
             与「报名中」状态标签同屏（R11-L08-D17 的「状态标签成为孤句」由这行一并承接）。
             整句免责说明（如「以下为示例内容，非该活动的真实信息」）缺 i18n 键，
             zh-CN.ts 不在本车道可写集 ⇒ 见交件 NEEDS-COPY。 -->
        <view v-if="isSample" class="detail-sample-note" role="note">
          <text class="detail-sample-note__text">{{ t('activities.sampleBadge') }}</text>
        </view>

        <!-- R11-L08-D15 / R11-L08-D17：真实活动的报名人数 + 活动日期（后端真字段，见脚本注释）。
             示例内容不渲染此块（无真相源的数字不上屏）。 -->
        <view v-if="showEnrollCount" class="detail-capacity">
          <text class="detail-capacity__count">{{ activity.enrollCount }}{{ t('activities.enrolledLabel') }}</text>
          <text v-if="activityDateLabel" class="detail-capacity__date">{{ activityDateLabel }}</text>
        </view>

        <!-- 时间 / 地点 -->
        <view class="detail-meta">
          <view class="detail-meta__item">
            <image class="detail-meta__icon" :src="icons.schedule" mode="aspectFit" lazy-load="true" alt="" />
            <text class="detail-meta__label">{{ t('activities.timeLabel') }}</text>
            <text class="detail-meta__value">{{ activity.scheduleText }}</text>
          </view>
          <view class="detail-meta__item">
            <image class="detail-meta__icon" :src="icons.location" mode="aspectFit" lazy-load="true" alt="" />
            <text class="detail-meta__label">{{ t('activities.locationLabel') }}</text>
            <text class="detail-meta__value">{{ activity.location }}</text>
          </view>
        </view>
      </view>

      <!-- 活动介绍 -->
      <view class="detail-section">
        <text class="detail-section__title">{{ t('activities.introLabel') }}</text>
        <text class="detail-intro">{{ activity.description || t('activities.introEmpty') }}</text>
      </view>

      <!-- 底部留白（避免遮挡报名按钮） -->
      <view class="detail-footer-space" />
    </scroll-view>

    <!-- 加载/兜底状态：R11-L08-D12 起该槽同时承接「列表拉取失败」与「该 id 取不到活动」两态 -->
    <view v-else-if="notFound || loadError" class="detail-loading">
      <view class="detail-error">
        <text class="detail-loading__text">{{ errorText }}</text>
        <view class="detail-error__retry press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.retry')" @tap="retryLoad">
          <text class="detail-error__retry-text">{{ t('common.retry') }}</text>
        </view>
      </view>
    </view>

    <!-- 加载/兜底状态：骨架占位（2026-09-03） -->
    <view v-else class="detail-loading">
      <SkeletonBlock variant="profile" :label="t('common.loading')" />
    </view>

    <!-- 底部报名/退出栏（已报名可退出；左侧「分享」复制小程序内链接，接收方点开即直达详情） -->
    <view v-if="activity" class="detail-action-bar">
      <view
        class="detail-share-btn press-feedback"
        hover-class="detail-share-btn--hover"
        hover-stay-time="120"
        role="button"
        :aria-label="t('activities.share')"
        @tap="handleCopyShare"
      >
        <text class="detail-share-btn__text">{{ t('activities.share') }}</text>
      </view>
      <view
        v-if="!isSignedUp"
        class="detail-signup-btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('activities.signupNow')"
        @tap="handleSignup"
      >
        <text class="detail-signup-btn__text">{{ t('activities.signupNow') }}</text>
      </view>
      <view
        v-else
        class="detail-quit-btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('activities.quitSignup')"
        @tap="handleQuitSignup"
      >
        <text class="detail-quit-btn__text">{{ t('activities.quitSignup') }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.detail-page {
  display: flex;
  flex-direction: column;
  /* R14-L08-D03/D04（位置 P1，同一根因）：原 `min-height:100%` 在祖先无确定高时按 §3
     退化成 auto ⇒ .detail-scroll:630 的 `flex:1;height:0` 拿不到确定高度、scroll-view 不内部滚，
     整页改由 uni 页面滚动：.detail-action-bar 随内容沉到文档底（top 帧报名钮只露 8px）、
     .detail-header 随阅读滚走（bottom 帧返回钮整枚离屏、页内唯一返回出口消失）。
     改 `height:100vh` 立成确定高的 flex 列 ⇒ header 与 action-bar 都是 .detail-page 的
     直接 flex 子（scroll-view 之外），一钉顶一钉底，.detail-scroll 吃满剩余高度内部滚。
     .detail-footer-space 保留作 scroll 内容底部呼吸位（无重叠，无害）。 */
  height: 100vh;
  background: var(--c-bg-page, #EEF7F2);
}

/* ========== 顶部栏 ========== */
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--sp-4) + var(--statusbar, env(safe-area-inset-top))) var(--sp-4) var(--sp-3);
  /* R9-L08-D06（可达性 P2）：本栏底色**刻意不压深**。可读性由 .detail-header__title 改深墨承接
     （算式见该规则）。理由：pages.json:49/52 是 navigationStyle=custom + navigationBarTextStyle=black
     ⇒ 状态栏的黑字/黑图标直接渲染在本栏之上；把栏底压到 brand-800 后，栏右上角（承载信号/电量的
     区段）对黑只有 0.16269/0.05=3.25:1，会把系统状态栏一起拖到门槛边缘，属新的连带缺陷。
     全站同款亮绿导航栏（mbti/privacy/wallet 等 4 处）未在本车道范围，见 HANDOFF。 */
  background: linear-gradient(135deg, var(--c-brand-500, #36C99A) 0%, var(--c-brand-400, #55D5A7) 100%);
}

.detail-header__back {
  /* R11-L08-D11（可达性 P1）：本页 navigationStyle=custom，页内没有第二个返回出口，
     而这枚钮原写死 64rpx(32.3px)——帧上实测半透明白圆底 34×34px，比同帧底部两枚动作钮
     （分享/报名，实测 88rpx=42px 高）差 1.37 倍，也低于仓内自陈的 88rpx 热区下限
     （love-center/nearby.vue:279-280 同口径 width/height:88rpx + 图标 40rpx）。
     min-width/min-height 一并写死，防父级压缩。 */
  width: 88rpx;
  height: 88rpx;
  min-width: 88rpx;
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.2));
}

.detail-header__back-icon {
  /* 与钮同批放大（64→88rpx 后视觉占比保持 nearby.vue:286-289 的 40/88 档） */
  width: 40rpx;
  height: 40rpx;
  /* R10-L08-D09：删去原 `color: var(--c-text-inverse)` —— 本节点是裸 <image>，
     PNG 自带墨色（v2/back.png 单色 #333333），CSS color 对它无效，留着只是「声明与实际不符」。
     对比度算式见 :33 图标取值处。 */
}

.detail-header__title {
  /* R7-L08-D07（字号 P2）：页面主标题原取 var(--fs-xl)=30rpx（15px，§1.3 的「正文/辅助」档），
     顶部绿导航栏里「活动详情」墨迹只有 12px，页头层级塌到正文档。
     升到 §1.3 大标题档 --fs-5xl（44rpx=22px）并与兄弟工具页 heart-signals
     .page-header__title（index.vue:446）同口径；字重保持 700。
     R9-L08-D06（可达性 P2）：原白字（--c-text-inverse，design-variables.scss:369 =
     --c-overlay-text-primary rgba(255,255,255,.95)，:749）压本栏
     linear-gradient(135deg,#36C99A 0%,#55D5A7 100%)（:171 同值族）：
       #36C99A L=0.2126*0.03689+0.7152*0.58414+0.0722*0.32314=0.44891
         ⇒ 纯白 1.05/0.49891=2.10:1；按 rgba(.95) 合成 #F5FCFA(L=0.95935)
         ⇒ 1.00935/0.49891=2.02:1；浅端 #55D5A7 L=0.52310 ⇒ 1.83:1。
     44rpx(22px)/700 属 WCAG 大字号（门槛 3:1），2.02 仍差一档。
     取缺陷卡第二条「标题改深墨压浅绿头」：--c-brand-900 #0B4A38（design-variables.scss:268；
     品牌色阶不随主题翻转，styles/tokens.scss:235 的 dark-theme-vars 不覆盖它）
       L=0.2126*0.00335+0.7152*0.06847+0.0722*0.03954=0.05254
       ⇒ 压 brand-500 端 0.49891/0.10254=4.87:1，压浅端 #55D5A7 0.57310/0.10254=5.59:1，
     过 3:1（大字号）且过 4.5:1（正文线）。
     不用 --c-text-primary 的原因：它在 dark-theme-vars 里翻成 #F0F2F5（tokens.scss:275），
     深色模式下会在这条**不翻转**的亮绿栏上又变回 ≈2:1 的白字。不改栏底的理由见上一条规则注释。 */
  font-size: var(--fs-5xl, 44rpx);
  font-weight: 700;
  color: var(--c-brand-900, #0B4A38);
}

.detail-header__spacer {
  /* R11-L08-D11 连带：与左侧返回钮同宽，标题才继续居中（钮 64→88rpx 后不同步会把标题推歪 12px） */
  width: 88rpx;
}

/* ========== 内容区 ========== */
.detail-scroll {
  flex: 1;
  height: 0;
}

.detail-cover {
  position: relative;
  width: 100%;
  /* R10-L08-D11（间距 P2）：帧上「活动介绍」卡止于 y≈470、底部操作栏起于 y≈690，
     中间 220px（≈440rpx）是纯 #EEF7F2 空底，信息区只占屏高约 58%。
     卡上给的三个「补模块」候选在本帧的实数据上全部渲染不出东西，逐一核过：
       · 报名截止 = activity.date —— 示例活动恒为 ""（buildSampleActivities 内 :67/:79/:91/:106 四处写死空串），
         real 档由 data.activityDate 映射（stores/activity.ts:358），本帧走的是示例回退分支 ⇒ v-if 不成立；
       · 已报名头像组 = participantAvatars —— stores/activity.ts:33 可选、:400 mock 归一为 []，
         示例活动根本没这个键 ⇒ 渲染 0 枚头像；
       · 主办方 —— ActivityItem（stores/activity.ts:19-40）与后端 ActivityRecommendation
         都没有组织者列，前端编造违反硬规矩 6 ⇒ 不采。
     于是按同一张卡给出的第二条口径处理：不留整块空底，把富余高度让给本页唯一的全出血模块
     （封面），使内容重新铺满视口。360rpx(180px) → 640rpx(320px) 吃掉 150px 死白
     （其余 70px 是 .detail-footer-space 的既有避让位），封面占屏 39%，
     落在 design-variables.scss:588-591 自陈的「交友 App 范式 40-50% 屏高全出血」档内；
     mode=aspectFill（模板 :355）⇒ 只是多裁一段原图，不拉伸、不新增素材。 */
  height: 640rpx;
  background: linear-gradient(135deg, var(--c-brand-200), var(--c-brand-300));
}

.detail-cover__img {
  width: 100%;
  height: 100%;
}

.detail-cover__badge {
  position: absolute;
  top: var(--sp-4);
  left: var(--sp-4);
  background: var(--c-badge-on-image-bg, rgba(15, 23, 42, 0.7));
  padding: 6rpx var(--sp-3);
  border-radius: var(--r-full);
}

.detail-cover__badge-text {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-badge-on-image-text, rgba(255, 255, 255, 0.95));
  font-weight: 500;
}

.detail-section {
  /* R11-L08-D14（间距 P2）：两张白卡原 margin 横向取 --sp-4(16rpx=8.1px)、padding 取 --sp-5(20rpx=10.1px)，
     帧上实测卡缘 x=10、卡内文字左缘 x=27 ⇒ 页边距只有 §1.4 标准的一半、内衬比标准少 6px；
     同域 love-center/mbti.vue:347 的同角色容器已按 R6-L10-D10 取 --page-padding(32rpx)（帧上卡缘 x=18）
     ⇒ 同域两页同一角色容器取档不一。两笔都换成 §1.4 的语义令牌。 */
  margin: var(--sp-5) var(--page-padding, 32rpx);
  padding: var(--card-padding, 32rpx);
  background: var(--c-bg-container, #ffffff);
  /* R7-L08-D08（圆角 P3·R6 已批未落地）：两张白卡（标题/元信息卡、活动介绍卡）共用本类，
     原 var(--r-xl)=24rpx（12px，§1.4 的小卡/输入档）实测圆角比全站卡片令牌小 8px，
     卡片观感偏「贴纸」。改引 §1.4 卡片圆角令牌 --card-radius（40rpx=20px，design-variables.scss:699），
     与首页/寻觅页大卡同代。 */
  border-radius: var(--card-radius, 40rpx);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.detail-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sp-3);
}

.detail-title {
  flex: 1;
  font-size: var(--fs-2xl, 36rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
  line-height: 1.35;
}

/* R4（2026-08-09）：活动分类标签（场景展示） */
.detail-category-tag {
  flex-shrink: 0;
  align-self: center;
  padding: 4rpx 16rpx;
  border-radius: 999rpx;
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-primary, #36C99A);
  background: color-mix(in srgb, var(--c-primary, #36C99A) 12%, transparent);
}

.detail-status {
  flex-shrink: 0;
  background: var(--c-bg-brand, #e8f8f0);
  padding: 6rpx var(--sp-3);
  border-radius: var(--r-full);
}

.detail-status__text {
  /* R10-L08-D10（字号 P2）：这枚「报名中」是本页唯一的活动状态标识，原取 --fs-xs(20rpx=10px)
     落进 §1.3 只给角标·法务的极小档，比同帧下方「时间/地点」值行（.detail-meta__value
     = --fs-base 24rpx=13px）还小一档 ⇒ 状态标签比正文还小。升到与 .detail-meta__value 同档。
     墨色 --c-brand-700(#1F8D6A) 压本底 --c-bg-brand(#E8FBF2)：
       L(#1F8D6A)=0.20381、L(#E8FBF2)=0.92567 ⇒ (0.97567/0.25381)=3.84:1，
     24rpx(13px)/600 不享大字号豁免 ⇒ 一并提到 --c-brand-800(#156B51，L=0.11276)
       ⇒ (0.97567/0.16276)=6.00:1 ≥4.5:1。 */
  font-size: var(--fs-base, 24rpx);
  color: var(--c-brand-800, #156B51);
  font-weight: 600;
}

/* R11-L08-D12：示例内容的正文级披露行（封面那枚 --fs-xs 小徽标保留，两处同时在场） */
.detail-sample-note {
  margin-top: var(--sp-3);
  padding: var(--sp-2) var(--sp-3);
  border-radius: var(--r-md, 12rpx);
  background: var(--c-bg-surface, #F3FAF6);
  border: 1rpx solid var(--c-border-strong, #C2CAC6);
}

.detail-sample-note__text {
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
  color: var(--c-text-secondary, #4A524E);
}

/* R11-L08-D15 / D17：真实活动的报名人数 + 活动日期行（后端真字段，示例内容不出） */
.detail-capacity {
  display: flex;
  align-items: baseline;
  gap: var(--sp-3);
  margin-top: var(--sp-3);
}

.detail-capacity__count {
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
  color: var(--c-text-secondary, #4A524E);
}

.detail-capacity__date {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-tertiary, #6B7571);
}

.detail-meta {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-top: var(--sp-5);
  padding-top: var(--sp-4);
  border-top: 1rpx solid var(--c-border-light, #EEF2F0);
}

.detail-meta__item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.detail-meta__icon {
  width: 30rpx;
  height: 30rpx;
  color: var(--c-brand-500);
  flex-shrink: 0;
}

.detail-meta__label {
  font-size: var(--fs-base, 24rpx);
  /* R11-L08-D16（颜色token P3）：兜底字面量原写 #9aa1ab —— 既不在 §1.2 色板、也不等于本令牌
     真值 #6B7571（design-variables.scss:364 --c-text-tertiary 解析为 #6B7571），本页三处
     （:788/:827 与搜索页同角色）各写一个假真值，令牌一旦失效就翻成不同灰。全部改回真值。 */
  color: var(--c-text-tertiary, #6B7571);
  flex-shrink: 0;
}

.detail-meta__value {
  font-size: var(--fs-base, 24rpx);
  color: var(--c-text-primary, #1f2937);
  font-weight: 500;
}

.detail-section__title {
  display: block;
  font-size: var(--fs-lg, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
  margin-bottom: var(--sp-3);
}

.detail-intro {
  display: block;
  /* R11-L08-D13（字号 P2）：本页唯一成段阅读文本原取 --fs-base（令牌真值 24rpx=12.1px，
     design-variables.scss:562；兜底字面量还另写 26rpx，与真值不符），帧上两行墨迹带高 11px，
     与「时间/地点」值行同档、比卡内大标题(.detail-title --fs-2xl 16px)低两档 ⇒ 正文落进 §1.3
     的标签档。提到 --fs-xl(30rpx=15px)，行高保持 1.7；兜底字面量同步改成令牌真值 30rpx。 */
  font-size: var(--fs-xl, 30rpx);
  color: var(--c-text-secondary, #4A524E);
  line-height: 1.7;
}

.detail-footer-space {
  height: calc(140rpx + env(safe-area-inset-bottom));
}

/* ========== 加载态 ========== */
.detail-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-loading__text {
  font-size: var(--fs-base, 24rpx);
  /* R11-L08-D16：兜底同上，改回 --c-text-tertiary 真值 #6B7571（原 #9aa1ab 为 slate 残留） */
  color: var(--c-text-tertiary, #6B7571);
}

/* 加载失败错误态 */
.detail-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
}

.detail-error__retry {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-2) var(--sp-6);
  border-radius: var(--r-full);
  background: var(--c-bg-brand, #e8f8f0);
}

.detail-error__retry-text {
  font-size: var(--fs-base, 26rpx);
  font-weight: 600;
  color: var(--c-brand-700, #1F8D6A);
}

/* ========== 底部报名栏 ========== */
.detail-action-bar {
  display: flex;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-4) calc(env(safe-area-inset-bottom) + var(--sp-4));
  background: var(--c-bg-container, #ffffff);
  box-shadow: 0 -4rpx 20rpx var(--c-black-shadow-sm, rgba(0, 0, 0, 0.08));
}

/* 分享（次级按钮，点击复制小程序内链接；mp-weixin 不支持站内链接分享） */
.detail-share-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  padding: 0 var(--sp-6);
  border-radius: var(--r-full);
  background: var(--c-bg-surface, #F3FAF6);
  border: 1rpx solid var(--c-border-strong, #C2CAC6);
  flex-shrink: 0;
  line-height: 1.2;
  color: inherit;
}

.detail-share-btn--hover {
  opacity: 0.8;
}

.detail-share-btn__text {
  font-size: var(--fs-lg, 32rpx);
  font-weight: 600;
  color: var(--c-text-secondary, #4A524E);
}

.detail-signup-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: var(--r-full);
  /* R9-L08-D05（可达性 P1）：本页唯一转化动作「立即报名」。
     原钮面 var(--c-gradient-brand)（design-variables.scss:171 = linear-gradient(135deg,#36C99A,#55D5A7)），
     标签 .detail-signup-btn__text 为 --c-text-inverse（design-variables.scss:369 = --c-overlay-text-primary
     rgba(255,255,255,.95)，:749），--fs-xl=30rpx=15px/600 不享大字号豁免 ⇒ 门槛 4.5:1。
     算式：底 #36C99A L=0.44891 ⇒ 1.05/0.49891=2.10:1；浅端 #55D5A7 L=0.52310 ⇒ 1.83:1；
     再按标签实际色 rgba(255,255,255,.95) 合成 #F5FCFA(L=0.95935) ⇒ 1.00935/0.49891=2.02:1
     （＝评审实测 ≈2.0:1），差 4.5:1 门槛 2.2 倍。
     brand-600(2.81:1)/brand-700(4.14:1) 两档都不够 ⇒ 取同族深档 --c-brand-800(#156B51，
     design-variables.scss:18) 纯色，与 LockScreen.vue:743（R8-L07-D03）同口径：
       L=0.2126*0.00750+0.7152*0.14712+0.0722*0.08227=0.11269 ⇒ 纯白 1.05/0.16269=6.45:1
       实际白字 rgba(255,255,255,.95) 合成 #F3F8F6 L=0.92843 ⇒ 0.97843/0.16269=6.01:1 ≥4.5:1 */
  background: var(--c-brand-800, #156B51);
}

/* 收尾轮：退出报名按钮（次级样式，避免与报名主按钮混淆） */
.detail-quit-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 88rpx;
  border-radius: var(--r-full);
  background: var(--c-bg-surface, #F3FAF6);
  border: 1rpx solid var(--c-border-strong, #C2CAC6);
}

.detail-quit-btn__text {
  font-size: var(--fs-lg, 32rpx);
  font-weight: 600;
  /* R11-L08-D16 同族：本处兜底原写 slate 的 #64748B，一并改回令牌真值 #6B7571 */
  color: var(--c-text-tertiary, #6B7571);
}

.detail-signup-btn__text {
  font-size: var(--fs-xl, 30rpx);
  font-weight: 600;
  color: var(--c-text-inverse, #ffffff);
}
</style>


