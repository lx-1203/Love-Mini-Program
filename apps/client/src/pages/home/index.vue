<script setup lang="ts">
/**
 * 首页 - 校园聚合页
 * 包含：学校选择器、校园圈活动、课表空档、校园墙、逛逛推荐、社交升温进度
 */
import { ref, computed, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useActivityStore } from "../../stores/activity";
import { useCheckInStore } from "../../stores/checkin";
import { useSocialProgressStore } from "../../stores/social-progress";
import { useDiscoverStore } from "../../stores/discover";
import { useScheduleStore, WEEK_DAYS } from "../../stores/schedule";
import { useSessionStore } from "../../stores/session";
import { featureFlags } from "../../config/feature-flags";
import { openAppPath } from "../../utils/navigation";
import { useTabBar } from "../../composables/useTabBar";
// 学校选择器数据源（i18n-data-review #16：复用 config/schools.ts，避免与页面内联数组重复）
import { SCHOOLS } from "../../config/schools";
import SocialProgressIndicator from "../../components/social/SocialProgressIndicator.vue";
import MatchCountChip from "../../components/common/MatchCountChip.vue";
// Task F：全局发帖悬浮按钮组件
import GlobalPublishFab from "../../components/common/GlobalPublishFab.vue";
// 功能1：首页 Banner 自动轮播组件（替换原静态横滚 Banner）
import HomeBanner from "../../components/home/HomeBanner.vue";
// 功能8：签到分享卡片组件
import ShareCard from "../../components/common/ShareCard.vue";
import { IMAGE_PATHS } from "../../config/images";
// Phase Feedback2："为你推荐"已移除，home-recommended-people 配置保留供后续复用；
// 如需重新启用请取消注释并接入模板。
// import { homeRecommendedPeople } from "../../config/home-recommended-people";
// Task 0.3.4：上传目录鉴权改造后，所有用户上传图片 URL 需经 resolveMediaUrl 重写为鉴权代理路径
import { resolveMediaUrl } from "../../utils/media";
// SubTask 5.5.2：列表页图片 @error 占位图通用方案
import { useImageFallback } from "../../composables/useImageFallback";
// infra R2-00044: makeUpCheckIn 失败抛错后页面需按类型提示，导入结果视图类型
import type { MakeUpCheckInResultView } from "../../services/generated/api-types-supplement";

// 同步自定义 TabBar 选中状态（首页 = 索引 2）
useTabBar(2);

// SubTask 5.5.2：列表页图片 @error 占位图 —— 失败 key 集合与判断函数
// 注意：使用对象引用而非解构，避免 vue-tsc 在某些场景下误报 "All destructured elements are unused"
const imageFallback = useImageFallback();
const onImageError = imageFallback.onImageError;
const isImageFailed = imageFallback.isImageFailed;

const { t } = useI18n();

/** Emoji 替换 SVG 图标路径（统一通过 IMAGE_PATHS.ICONS_EMOJI 引用，避免硬编码） */
const emojiIcons = {
  search: IMAGE_PATHS.ICONS_EMOJI.SEARCH,
  sparkles: IMAGE_PATHS.ICONS_EMOJI.SPARKLES,
  location: IMAGE_PATHS.ICONS_EMOJI.LOCATION,
  heart: IMAGE_PATHS.ICONS_EMOJI.HEART,
  chat: IMAGE_PATHS.ICONS_EMOJI.CHAT,
  fire: IMAGE_PATHS.ICONS_EMOJI.FIRE,
  gift: IMAGE_PATHS.ICONS_EMOJI.GIFT,
  cake: IMAGE_PATHS.ICONS_EMOJI.CAKE,
  group: IMAGE_PATHS.ICONS_EMOJI.GROUP,
  microphone: IMAGE_PATHS.ICONS_EMOJI.MICROPHONE,
  smile: IMAGE_PATHS.ICONS_EMOJI.SMILE,
  thumbsUp: IMAGE_PATHS.ICONS_EMOJI.THUMBS_UP,
  bookmark: IMAGE_PATHS.ICONS_EMOJI.BOOKMARK,
  bell: IMAGE_PATHS.ICONS_EMOJI.BELL,
  lock: IMAGE_PATHS.ICONS_EMOJI.LOCK,
  // 通用图标（学校、庆典）- SVG 变体，支持 currentColor 主题色
  school: IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG,
  celebration: IMAGE_PATHS.ICONS_COMMON.CELEBRATION_SVG,
  settings: IMAGE_PATHS.ICONS_EMOJI.SETTINGS,
} as const;

const activityStore = useActivityStore();
const checkInStore = useCheckInStore();
const socialProgressStore = useSocialProgressStore();
const discoverStore = useDiscoverStore();
const sessionStore = useSessionStore();
/** 共享 discover store 的剩余匹配次数（与寻觅页 count-chip 数据源一致） */
const { remainingCount } = storeToRefs(discoverStore);

/** Phase Feedback2：校园活动是否仅对已认证学生开放（未认证时点击提示） */
const isCampusVerified = computed(() => sessionStore.isCampusVerified);

/**
 * 打开校园活动：仅认证学生可用。
 * 未认证时 toast 提示，避免直接跳转后无权限。
 */
function openCampusActivities() {
  if (!isCampusVerified.value) {
    uni.showToast({ title: t('home.campusActivityOnlyVerified'), icon: "none" });
    return;
  }
  openAppPath('/subpackages/discover/activities/index');
}

/** Task F：全局发帖 FAB publish 事件 → 发帖编辑页 */
function goToPublishTopic() {
  openAppPath('/pages/circles/post-topic');
}

// ==================== 推荐用户数据 ====================
// Phase Feedback2："为你推荐"已按反馈移除，recommendUsers 不再被模板引用。
// 保留 home-recommended-people 配置供后续运营位复用（如需恢复可重新接入）。

// ==================== 学校选择（任务 C：认证前置 + 一次性绑定） ====================
// 初始学校取会话中的校园名称（campusName），未设置时回退默认值
// 修复（i18n-data-review #16）：学校列表复用 config/schools.ts（避免与配置重复），
// 展示经 nameKey 走 t() 渲染；值仅用于选择器匹配与展示，不做存储。
const currentSchool = ref(sessionStore.userSession?.campusName || t("config.schools.pku.name"));
const schools = computed(() => SCHOOLS.map((s) => (s.nameKey ? t(s.nameKey) : s.name)));
const showSchoolPicker = ref(false);

/** 是否已绑定学校（绑定后选择器只读，不可再切换） */
const schoolBound = computed(() => sessionStore.isSchoolBound);

/** 空操作占位（catchtap 占位 handler，mp-weixin 要求 catchtap 必须绑定 handler） */
function noop() {}

/**
 * 点击学校选择器（任务 C：认证前置 + 只读态）：
 * 1. 已绑定 → 提示"学校已绑定，如需修改请联系客服"，不打开选择器；
 * 2. 未认证 → 弹窗提示先完成校园认证，确认后跳转认证页，不打开选择器；
 * 3. 已认证且未绑定 → 打开学校选择器。
 */
function onSchoolSelectorTap() {
  if (schoolBound.value) {
    uni.showToast({ title: t('home.schoolBindLocked'), icon: "none" });
    return;
  }
  if (!isCampusVerified.value) {
    uni.showModal({
      title: t('home.schoolBindAuthTitle'),
      content: t('home.schoolBindRequireAuth'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
      success: (res) => {
        if (res.confirm) {
          openAppPath('/pages/campus/certification');
        }
      },
    });
    return;
  }
  showSchoolPicker.value = true;
}

/**
 * 选择学校（任务 C：一次性绑定）。
 * 已认证用户选择学校后调用 sessionStore.bindSchool 写入绑定状态，
 * 绑定成功后刷新首页数据（活动、签到、社交进度等可能随学校变化）。
 */
async function selectSchool(school: string) {
  if (currentSchool.value === school) {
    showSchoolPicker.value = false;
    return;
  }
  const bound = await sessionStore.bindSchool(school);
  if (!bound) {
    uni.showToast({ title: t('home.schoolBindFailed'), icon: "none" });
    return;
  }
  currentSchool.value = school;
  showSchoolPicker.value = false;
  refreshHomeData();
}

/**
 * 刷新首页数据：学校切换或下拉刷新时调用。
 * 统一触发各 store 的 fetch，避免分散调用导致遗漏。
 */
function refreshHomeData() {
  void activityStore.fetchActivities();
  void checkInStore.fetchStatus();
  void socialProgressStore.fetchProgress();
}

// 课表数据（从 schedule store 拉取，支持课程/活动/自定义三类）
const scheduleStore = useScheduleStore();
const weekDays = WEEK_DAYS;
const currentDay = ref(0);

/** 当前选中天的时段视图（含 item 与 isFree 信息） */
const currentDaySlots = computed(() =>
  scheduleStore.dayTimeSlots(currentDay.value)
);

/** 课表类型图例 */
const scheduleLegends = computed(() => [
  { type: "course", label: t('home.scheduleLegendCourse'), colorVar: "var(--c-schedule-course)" },
  { type: "activity", label: t('home.scheduleLegendActivity'), colorVar: "var(--c-schedule-activity)" },
  { type: "custom", label: t('home.scheduleLegendCustom'), colorVar: "var(--c-schedule-custom)" },
]);

/** 获取课表项主标题（根据 type 返回不同字段） */
function getItemTitle(
  item: { type: string; courseName?: string; activityName?: string; title?: string } | undefined
): string {
  if (!item) return "";
  if (item.type === "course") return item.courseName || t('home.unnamedCourse');
  if (item.type === "activity") return item.activityName || t('home.unnamedActivity');
  return item.title || t('home.customPlan');
}

/** 获取课表项副标题（位置/教室 + 主办方/教师/备注） */
function getItemSubtitle(
  item: {
    type: string;
    classroom?: string;
    location?: string;
    teacher?: string;
    sponsor?: string;
    note?: string;
  } | undefined
): string {
  if (!item) return "";
  if (item.type === "course") {
    return [item.classroom, item.teacher].filter(Boolean).join(" · ");
  }
  if (item.type === "activity") {
    return [item.location, item.sponsor ? `${t('home.sponsorPrefix')}${item.sponsor}` : ""].filter(Boolean).join(" · ");
  }
  return [item.location, item.note].filter(Boolean).join(" · ");
}

/** 课表项类型 class（用于色块样式映射） */
function getItemClass(type: string): string {
  if (type === "course") return "schedule-slot--course";
  if (type === "activity") return "schedule-slot--activity";
  return "schedule-slot--custom";
}

/**
 * 点击时段：空闲时段弹出"添加安排"操作表，已占用时段提示去编辑
 * 使用 uni.showActionSheet 实现 mp-weixin 兼容
 */
function onSlotTap(slot: { isFree: boolean; item?: { type: string } }): void {
  if (!slot.isFree && slot.item) {
    // 已占用：跳转到编辑页查看详情
    openAppPath("/subpackages/setup/schedule/index");
    return;
  }
  uni.showActionSheet({
    itemList: [t('home.addCourse'), t('home.addActivity'), t('home.addCustom')],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.showToast({ title: t('home.courseEditing'), icon: "none" });
      } else if (res.tapIndex === 1) {
        uni.showToast({ title: t('home.activityEditing'), icon: "none" });
      } else if (res.tapIndex === 2) {
        uni.showToast({ title: t('home.customEditing'), icon: "none" });
      }
    },
    fail: (_e) => {
      // 用户取消，无需处理
    },
  });
}

// ==================== 社交升温进度 ====================

/** 是否展开完整的升温进度指示器 */
const showSocialProgress = ref(false);

/** 切换升温进度展开/收起 */
function toggleSocialProgress() {
  showSocialProgress.value = !showSocialProgress.value;
}

/**
 * 执行每日签到
 *
 * 签到成功后（功能8）自动弹出分享卡片，鼓励用户分享打卡成就。
 */
async function handleCheckIn() {
  if (checkInStore.loading || checkInStore.checkedIn) return;
  try {
    await checkInStore.checkIn();
    // 签到奖励文案可配置（i18n checkinReward，mock 固定 +5 社交币）
    uni.showToast({
      title: t('home.checkinReward', { n: 5 }),
      icon: "success",
      duration: 2000,
    });
    // 功能8：签到成功后自动弹出分享卡片
    shareCardVisible.value = true;
  } catch (error) {
    console.error("[首页签到] 失败:", error);
    uni.showToast({
      title: t('home.checkinFailed'),
      icon: "none",
      duration: 2000,
    });
  }
}

// ==================== 功能7：签到补签 ====================

/**
 * 计算最近 7 天可补签的日期列表（不含今天，仅昨日及之前 7 天）。
 *
 * 返回数组项格式：{ value: 'yyyy-MM-dd', label: 'MM-dd 周X' }
 * 用于 showActionSheet 展示，避免引入 date-picker 组件保持 mp-weixin 兼容。
 */
const makeUpDateOptions = computed(() => {
  // Task 28: 周几标签抽取到 i18n（home.weekdaySun..weekdaySat）
  const weekdays = [
    t('home.weekdaySun'), t('home.weekdayMon'), t('home.weekdayTue'),
    t('home.weekdayWed'), t('home.weekdayThu'), t('home.weekdayFri'), t('home.weekdaySat'),
  ];
  const options: { value: string; label: string }[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const value = `${year}-${month}-${day}`;
    // Task 28: 日期标签格式抽取到 i18n（home.makeUpDateLabel）
    const label = t('home.makeUpDateLabel', { date: `${month}-${day}`, weekday: weekdays[d.getDay()] });
    options.push({ value, label });
  }
  return options;
});

/**
 * 触发补签流程：弹出 ActionSheet 选择补签日期。
 *
 * mp-weixin 兼容：使用 uni.showActionSheet 而非自定义 date-picker，
 * 避免引入额外组件依赖与 mp-weixin 不支持的 API。
 */
function handleMakeUpCheckIn() {
  if (checkInStore.makingUp) return;
  const options = makeUpDateOptions.value;
  uni.showActionSheet({
    itemList: options.map((o) => o.label),
    success: (res) => {
      const selected = options[res.tapIndex];
      if (selected) {
        void confirmMakeUp(selected.value);
      }
    },
    fail: (_e) => {
      // 用户取消，无需处理
    },
  });
}

/**
 * 确认补签：调用 store.makeUpCheckIn，根据结果 toast 提示。
 *
 * 错误处理：
 * - 月配额用完 → 提示 makeUpNoQuota
 * - 积分不足 → 提示 makeUpNoPoints
 * - 其他错误 → 提示 makeUpFailed
 *
 * @param date 补签日期（yyyy-MM-dd）
 */
async function confirmMakeUp(date: string) {
  // infra R2-00044: makeUpCheckIn 失败时抛错，此处捕获后按 errorMessage 差异化提示
  let result: MakeUpCheckInResultView | null = null;
  try {
    result = await checkInStore.makeUpCheckIn(date);
  } catch (_e) {
    // 抛错场景统一走下方错误提示逻辑（errorMessage 已由 store 设置）
  }
  if (!result) {
    // store errorMessage 中包含具体原因（配额/积分等）
    const errMsg = checkInStore.errorMessage || t('home.makeUpFailed');
    // 根据错误信息匹配更友好的提示
    if (errMsg.includes("配额") || errMsg.includes("次数")) {
      uni.showToast({ title: t('home.makeUpNoQuota'), icon: "none" });
    } else if (errMsg.includes("积分")) {
      uni.showToast({ title: t('home.makeUpNoPoints'), icon: "none" });
    } else {
      uni.showToast({ title: t('home.makeUpFailed'), icon: "none" });
    }
    return;
  }
  // 补签成功：toast 提示 + 自动弹出分享卡片（功能8）
  uni.showToast({
    title: t('home.makeUpSuccess'),
    icon: "success",
    duration: 2000,
  });
  shareCardVisible.value = true;
}

// ==================== 功能8：签到分享 ====================

/** 分享卡片是否可见 */
const shareCardVisible = ref(false);

/** 签到获得的积分（用于分享卡片展示，与后端 extraQuota 对齐） */
const earnedPoints = computed(() => checkInStore.extraRecommendations || 5);

/** 打开分享卡片（点击分享按钮时调用） */
function handleShareCheckIn() {
  shareCardVisible.value = true;
}

/** 关闭分享卡片 */
function handleCloseShareCard() {
  shareCardVisible.value = false;
}

onMounted(() => {
  void activityStore.fetchActivities();
  void checkInStore.fetchStatus();
  void socialProgressStore.fetchProgress();
});

// 修复（严格模式 noUnusedLocals）：noop 通过 catchtap 绑定到模板，
// vue-tsc 无法识别 catchtap 语法，故通过 defineExpose 标记为已使用。
defineExpose({ noop });
</script>

<template>
  <view class="home-page page-fade-in">
    <!-- 学校选择弹窗（任务 C：已绑定后不再展示切换列表） -->
    <view v-if="showSchoolPicker && !schoolBound" class="school-picker" role="button" :aria-label="t('common.closeAria')" @tap="showSchoolPicker = false">
      <view class="school-picker__content" catchtap="noop">
        <view class="school-picker__header">
          <text class="school-picker__title">{{ t('home.selectSchool') }}</text>
          <text class="school-picker__close" role="button" :aria-label="t('common.closeAria')" @tap="showSchoolPicker = false">✕</text>
        </view>
        <view class="school-picker__list" role="list">
          <view
            v-for="school in schools" :key="school"
            class="school-picker__item"
            :class="{ 'school-picker__item--active': school === currentSchool }"
            role="button"
            :aria-label="school"
            :aria-pressed="school === currentSchool"
            @tap="selectSchool(school)"
          >
            <text class="school-picker__item-name">{{ school }}</text>
            <text v-if="school === currentSchool" class="school-picker__item-check">✓</text>
          </view>
        </view>
      </view>
    </view>

    <scroll-view scroll-y class="home-scroll" :show-scrollbar="false">
      <!-- 顶部区域 -->
      <view class="top-section">
        <view class="greeting-row">
          <view class="greeting-left">
            <text class="greeting-text">{{ t('home.greeting') }}</text>
            <text class="greeting-subtitle">{{ t('home.greetingSubtitle') }}</text>
          </view>
          <view class="greeting-right">
            <MatchCountChip :count="remainingCount" />
            <!-- 任务 E4：设置入口（齿轮图标） -->
            <view class="settings-btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.settingsAria')" @tap="openAppPath('/pages/settings/index')">
              <image class="settings-icon" :src="emojiIcons.settings" mode="aspectFit" alt="" />
            </view>
            <view class="notification-btn press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('home.notificationAria')" @tap="openAppPath('/pages/messages/index?tab=notification')">
              <image class="notification-icon" :src="emojiIcons.bell" mode="aspectFit" alt="" />
              <view class="notification-dot"></view>
            </view>
          </view>
        </view>

        <!-- 搜索框 -->
        <view class="search-box press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('home.searchPlaceholder')" @tap="openAppPath('/pages/discover/index')">
          <image class="search-icon" :src="emojiIcons.search" mode="aspectFit" alt="" />
          <text class="search-placeholder">{{ t('home.searchPlaceholder') }}</text>
        </view>

        <!-- 学校选择器（任务 C：未认证弹窗引导认证；已绑定只读展示学校 + 锁定标记） -->
        <view
          class="school-selector press-feedback"
          :class="{ 'school-selector--locked': schoolBound }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="schoolBound ? t('home.schoolBindLocked') : t('home.selectSchool')"
          @tap="onSchoolSelectorTap"
        >
          <image class="school-icon" :src="emojiIcons.school" mode="aspectFit" alt="" />
          <text class="school-name">{{ currentSchool }}</text>
          <template v-if="schoolBound">
            <image class="school-lock" :src="emojiIcons.lock" mode="aspectFit" lazy-load="true" alt="" />
          </template>
          <text v-else class="school-arrow">▼</text>
          <view class="school-badge">
            <text class="school-badge__text">{{ t('home.schoolLimited') }}</text>
          </view>
        </view>
      </view>

      <!-- 签到入口 -->
      <view class="section-wrap">
        <view v-if="!checkInStore.checkedIn && !checkInStore.loading" class="checkin-card card-base btn-press press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('home.todayCheckin')" @tap="handleCheckIn">
          <view class="checkin-icon-wrap checkin-icon-wrap--gradient">
            <image class="checkin-emoji" :src="emojiIcons.sparkles" mode="aspectFit" alt="" />
          </view>
          <view class="checkin-info">
            <text class="checkin-title">{{ t('home.todayCheckin') }}</text>
            <text class="checkin-desc">{{ t('home.checkinDesc') }}</text>
          </view>
          <text class="checkin-arrow">›</text>
        </view>

        <view v-else-if="checkInStore.checkedIn" class="checkin-card card-base checkin-card--done">
          <view class="checkin-icon-wrap checkin-icon-wrap--success">
            <image class="checkin-emoji" :src="emojiIcons.sparkles" mode="aspectFit" alt="" />
          </view>
          <view class="checkin-info">
            <text class="checkin-title checkin-title--dark">{{ t('home.consecutiveDays', { n: checkInStore.consecutiveDays }) }}</text>
            <text class="checkin-desc checkin-desc--gray">{{ t('home.tomorrowContinue') }}</text>
          </view>
          <view class="checkin-streak">
            <text class="checkin-streak-text">{{ t('home.days', { n: checkInStore.consecutiveDays }) }}</text>
          </view>
          <!-- 功能7+8：补签 / 分享按钮（仅在已签到状态显示） -->
          <view class="checkin-actions">
            <view
              class="checkin-action-btn press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('home.makeUpCheckIn')"
              @tap="handleMakeUpCheckIn"
            >
              <text class="checkin-action-text">{{ t('home.makeUpCheckIn') }}</text>
            </view>
            <view
              class="checkin-action-btn checkin-action-btn--share press-feedback"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="t('home.shareCheckIn')"
              @tap="handleShareCheckIn"
            >
              <text class="checkin-action-text">{{ t('home.shareCheckIn') }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 彩色功能宫格（Phase Feedback2：精简为 5 项） -->
      <view class="section-wrap">
        <view class="function-grid-card card-base">
          <view class="function-grid">
            <!-- Phase Feedback2 · 附近的人：跳转「附近的人」列表页 -->
            <view class="function-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('home.nearbyPeople')" @tap="openAppPath('/pages/love-center/nearby')">
              <view class="function-icon function-icon--pink">
                <image class="function-emoji" :src="emojiIcons.location" mode="aspectFit" alt="" />
              </view>
              <text class="function-label">{{ t('home.nearbyPeople') }}</text>
            </view>
            <view class="function-item function-item--highlight press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('home.interestMatch')" @tap="openAppPath('/pages/discover/index')">
              <view class="function-icon function-icon--purple">
                <image class="function-emoji" :src="emojiIcons.heart" mode="aspectFit" alt="" />
              </view>
              <text class="function-label">{{ t('home.interestMatch') }}</text>
              <text class="function-item__hot-badge">{{ t('home.hotBadge') }}</text>
            </view>
            <!-- Phase Feedback2 · 恋爱咨询（恋爱咨询/恋爱课程/社交咨询/社交课程 4 板块） -->
            <view class="function-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('home.loveConsulting')" @tap="openAppPath('/pages/love-center/index')">
              <view class="function-icon function-icon--orange">
                <image class="function-emoji" :src="emojiIcons.chat" mode="aspectFit" alt="" />
              </view>
              <text class="function-label">{{ t('home.loveConsulting') }}</text>
            </view>
            <!-- Phase Feedback2 · 恋爱测试（MBTI 等） -->
            <view class="function-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('home.loveTest')" @tap="openAppPath('/pages/love-center/index')">
              <view class="function-icon function-icon--blue">
                <image class="function-emoji" :src="emojiIcons.gift" mode="aspectFit" alt="" />
              </view>
              <text class="function-label">{{ t('home.loveTest') }}</text>
            </view>
            <!-- Phase Feedback2 · 校园活动（仅认证学生可用） -->
            <view class="function-item press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('home.campusActivity_short')" @tap="openCampusActivities">
              <view class="function-icon function-icon--green">
                <image class="function-emoji" :src="emojiIcons.sparkles" mode="aspectFit" alt="" />
              </view>
              <text class="function-label">{{ t('home.campusActivity_short') }}</text>
              <text v-if="!isCampusVerified" class="function-item__lock-badge">
                <image class="function-item__lock-badge-icon" :src="emojiIcons.lock" mode="aspectFit" alt="" />
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 功能1：首页 Banner 自动轮播（替换原静态横滚 Banner，置于 section-wrap 之上） -->
      <HomeBanner />

      <view class="section-wrap">
        <view class="section-header">
          <text class="section-title section-title-brand">{{ t('home.campusCircleActivity') }}</text>
          <text class="section-more" role="button" :aria-label="t('home.moreArrow')" @tap="openAppPath('/pages/circles/index')">{{ t('home.moreArrow') }}</text>
        </view>
        <scroll-view scroll-x class="activity-scroll" :show-scrollbar="false">
          <view class="activity-list" role="list">
            <view
              v-for="item in activityStore.activities.slice(0, 5)" :key="item.id"
              class="activity-card-new list-item"
              role="button"
              :aria-label="t('home.activityCardAria', { title: item.title, time: item.scheduleText })"
              @tap="openCampusActivities"
            >
              <view class="activity-card__image-wrap">
                <image
                  v-if="item.coverImage && !isImageFailed(`activity-${item.id}`)"
                  class="activity-card__img"
                  :src="resolveMediaUrl(item.coverImage)"
                  mode="aspectFill"
                  lazy-load alt=""
                  @error="onImageError(`activity-${item.id}`)"
                />
                <view v-else class="activity-card__placeholder">
                  <image class="activity-placeholder-emoji" :src="emojiIcons.celebration" mode="aspectFit" lazy-load="true" alt="" />
                </view>
                <view class="activity-card__status" :class="`activity-status--${item.status}`">
                  <text class="activity-status-text">{{ item.status === 'open' ? t('home.activityStatusOpen') : item.status === 'ongoing' ? t('home.activityStatusOngoing') : t('home.activityStatusPreview') }}</text>
                </view>
              </view>
              <view class="activity-card__info-new">
                <text class="activity-card__title-new">{{ item.title }}</text>
                <text class="activity-card__time-new">{{ item.scheduleText }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <!-- Phase Feedback2：为你推荐已移除（反馈明确不需要） -->

      <!-- 本周安排（Phase Feedback2：默认隐藏，待 OCR 课表方案确认后开启 featureFlags.weeklyScheduleEnabled） -->
      <view v-if="featureFlags.weeklyScheduleEnabled" class="section-wrap">
        <view class="section-header">
          <text class="section-title section-title-brand">{{ t('home.weeklySchedule') }}</text>
          <text
            class="section-more"
            role="button"
            :aria-label="t('home.editArrow')"
            @tap="openAppPath('/subpackages/setup/schedule/index')"
          >{{ t('home.editArrow') }}</text>
        </view>

        <!-- 课表卡片 -->
        <view class="schedule-card-new card-base">
          <!-- 类型图例 -->
          <view class="schedule-legend">
            <view
              v-for="legend in scheduleLegends" :key="legend.type"
              class="schedule-legend__item"
            >
              <view class="schedule-legend__dot" :style="{ background: legend.colorVar }"></view>
              <text class="schedule-legend__label">{{ legend.label }}</text>
            </view>
          </view>

          <!-- 周一到周日 7 天 -->
          <view class="schedule-days-new">
            <view
              v-for="(day, index) in weekDays" :key="day"
              class="schedule-day-new"
              :class="{ 'schedule-day--active-new': currentDay === index }"
              role="button"
              :aria-label="day"
              :aria-pressed="currentDay === index"
              @tap="currentDay = index"
            >
              <text class="schedule-day__name-new">{{ day }}</text>
            </view>
          </view>

          <!-- 时段列表 -->
          <view class="schedule-slots-new">
            <view
              v-for="slot in currentDaySlots" :key="slot.index"
              class="schedule-slot-new press-feedback"
              :class="slot.isFree ? 'schedule-slot--free-new' : getItemClass(slot.item?.type || 'custom')"
              hover-class="press-feedback--active"
              hover-stay-time="120"
              role="button"
              :aria-label="`${slot.start}-${slot.end} ${slot.isFree ? t('home.freeSlotHint') : getItemTitle(slot.item)}`"
              @tap="onSlotTap(slot)"
            >
              <text class="schedule-slot__time-new">{{ slot.start }}-{{ slot.end }}</text>
              <view class="schedule-slot__content-new">
                <template v-if="!slot.isFree && slot.item">
                  <text class="schedule-slot__course-new">{{ getItemTitle(slot.item) }}</text>
                  <text class="schedule-slot__classroom-new">{{ getItemSubtitle(slot.item) }}</text>
                </template>
                <view v-else class="schedule-slot__free-new">
                  <image class="schedule-slot__free-icon" :src="emojiIcons.sparkles" mode="aspectFit" lazy-load="true" alt="" />
                  <text class="schedule-slot__free-text">{{ t('home.freeSlotHint') }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <!-- 社交升温进度 -->
      <view class="section-wrap">
        <view class="section-header">
          <view class="section-title-group">
            <text class="section-title section-title-brand">{{ t('home.socialProgressTitle') }}</text>
            <image class="section-title__icon" :src="emojiIcons.fire" mode="aspectFit" alt="" />
          </view>
          <text class="section-more" role="button" :aria-label="showSocialProgress ? t('home.collapse') : t('home.expand')" @tap="toggleSocialProgress">
            {{ showSocialProgress ? t('home.collapse') : t('home.expand') }}
          </text>
        </view>

        <view v-if="!showSocialProgress" class="social-mini-card-new card-base press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('home.socialProgressAria', { percent: socialProgressStore.progressPercentage })" @tap="toggleSocialProgress">
          <view class="social-progress-wrap">
            <view class="social-bar-track">
              <view
                class="social-bar-fill"
                :style="{ width: socialProgressStore.progressPercentage + '%' }"
              />
            </view>
            <text class="social-percent">{{ socialProgressStore.progressPercentage }}%</text>
          </view>
          <view class="social-info-new">
            <text class="social-label">{{ socialProgressStore.progress?.tierLabel ?? t('common.loading') }}</text>
            <text class="social-hint">{{ socialProgressStore.nextAction || t('home.viewFullProgress') }}</text>
          </view>
          <text class="social-arrow">›</text>
        </view>

        <SocialProgressIndicator v-else />
      </view>

      <!-- 底部留白 -->
      <view class="home-footer-space"></view>
    </scroll-view>

    <!-- Task F：全局发帖悬浮按钮（publish → 发帖编辑页） -->
    <GlobalPublishFab @publish="goToPublishTopic" />

    <!-- 功能8：签到分享卡片弹窗 -->
    <ShareCard
      :visible="shareCardVisible"
      :consecutive-days="checkInStore.consecutiveDays"
      :earned-points="earnedPoints"
      @close="handleCloseShareCard"
    />

  </view>
</template>

<style scoped lang="scss">
.home-page {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  /* mp-weixin 不支持 100vh（含导航栏高度），改用 100% 配合页面根元素铺满可视区域 */
  min-height: 100%;
  background: var(--c-gradient-page);
}

.home-scroll {
  /* mp-weixin 不支持 100vh，配合 flex:1 实现自适应高度 */
  flex: 1;
  /* 占位高度，配合 flex:1 让 scroll-view 撑满剩余空间；0 避免 vh 单位 */
  height: 0;
  min-height: 0;
}

.section-wrap {
  padding: 0 var(--page-padding);
  margin-bottom: var(--sp-8);
}

/* ========== 顶部区域 ========== */
.top-section {
  position: relative;
  padding: calc(env(safe-area-inset-top) + var(--sp-6)) var(--page-padding) var(--sp-6);
  background: var(--c-gradient-brand-overlay);
}

.greeting-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: var(--sp-6);
}

.greeting-left {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.greeting-text {
  font-size: var(--fs-4xl);
  font-weight: 700;
  color: var(--c-text-primary);
  line-height: 1.2;
}

.greeting-subtitle {
  font-size: var(--fs-md);
  color: var(--c-text-tertiary);
}

.greeting-right {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
}

.notification-btn {
  position: relative;
  /* 修复 P2（触摸目标过小）：80rpx → 88rpx（44px @2x），满足 iOS HIG / Material Design 标准 */
  width: 88rpx;
  height: 88rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-md);
}

.notification-icon {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-text-secondary);
}

/* 任务 E4：设置入口按钮（与通知按钮同规格，保持顶部视觉一致） */
.settings-btn {
  width: 88rpx;
  height: 88rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-md);
}

.settings-icon {
  width: 44rpx;
  height: 44rpx;
  color: var(--c-text-secondary);
}

.notification-dot {
  position: absolute;
  top: var(--sp-4);
  right: var(--sp-4);
  width: var(--sp-4);
  height: var(--sp-4);
  background: var(--c-error);
  border-radius: var(--r-full);
  border: 3rpx solid var(--c-bg-container);
}

/* ========== 搜索框 ========== */
.search-box {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  height: 88rpx;
  /* #ifdef H5 */
  background: var(--c-overlay-white-text-mid);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  /* #endif */
  /* #ifndef H5 */
  background: var(--c-overlay-white-bg-most);
  /* #endif */
  border: var(--border-subtle);
  border-radius: var(--r-xl);
  padding: 0 28rpx;
  margin-bottom: var(--sp-5);
}

.search-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: var(--sp-2);
  opacity: 0.6;
  flex-shrink: 0;
}

.search-placeholder {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary);
}

/* ========== 学校选择器 ========== */
.school-selector {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-6);
  /* #ifdef H5 */
  background: var(--c-overlay-white-text-mid);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  /* #endif */
  /* #ifndef H5 */
  background: var(--c-overlay-white-bg-most);
  /* #endif */
  border: var(--border-subtle);
  border-radius: var(--r-lg);
  align-self: flex-start;
}

.school-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: var(--sp-2);
  color: var(--c-brand-500);
  flex-shrink: 0;
}

.school-name {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.school-arrow {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
  margin: 0 var(--sp-2);
}

.school-badge {
  background: var(--c-gradient-brand);
  padding: 6rpx var(--sp-4);
  border-radius: var(--r-full);
  margin-left: var(--sp-2);
}

.school-badge__text {
  font-size: var(--fs-xs);
  color: var(--c-text-inverse);
  font-weight: 600;
}

/* ========== 签到卡片 ========== */
.checkin-card {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  padding: 28rpx;
  border-radius: var(--r-xl);
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand-lg);
}

/* #ifdef H5 */
.checkin-card:active {
  transform: scale(0.98);
}
/* #endif */

.checkin-card--done {
  background: var(--c-bg-container);
  box-shadow: var(--s-card-soft);
  border: var(--border-subtle);
}

.checkin-icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.checkin-icon-wrap--gradient {
  background: var(--c-overlay-white-bg-mid-strong);
}

.checkin-icon-wrap--success {
  background: var(--c-location-bg);
}

.checkin-emoji {
  width: 56rpx;
  height: 56rpx;
  color: var(--c-neutral-0);
}

.checkin-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.checkin-title {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-inverse);
}

.checkin-title--dark {
  color: var(--c-text-primary);
}

.checkin-desc {
  font-size: var(--fs-base);
  color: var(--c-overlay-text-secondary);
}

.checkin-desc--gray {
  color: var(--c-text-tertiary);
}

.checkin-arrow {
  font-size: var(--fs-5xl);
  color: var(--c-overlay-white-text-strong);
  font-weight: 300;
}

.checkin-streak {
  background: var(--c-romance-50);
  padding: var(--sp-3) var(--sp-5);
  border-radius: var(--r-lg);
}

.checkin-streak-text {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-romance-500);
}

/* ========== 功能宫格 ========== */
.function-grid-card {
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  padding: var(--sp-8);
  box-shadow: var(--s-card-soft);
}

.function-grid {
  display: flex;
  flex-wrap: wrap;
}

.function-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-3) 0;
}

/* #ifdef H5 */
.function-item:active {
  transform: scale(0.96);
}
/* #endif */

/* ========== 高亮功能项（兴趣匹配 / CP匹配） ========== */
.function-item--highlight {
  position: relative;
  background: var(--c-romance-50);
  border: 2rpx solid var(--c-romance-200);
  border-radius: var(--r-lg);
  transform: scale(1.05);
  box-shadow: 0 8rpx 24rpx var(--c-romance-bg-tint);

  .function-icon {
    background: var(--c-romance-100);
    transform: scale(1.08);
  }
}

.function-item--highlight::before {
  content: '';
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  background: linear-gradient(135deg, var(--c-romance-400), var(--c-accent-400));
  color: var(--c-text-inverse);
  font-size: var(--fs-xs);
  font-weight: 700;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-lg) var(--r-lg) var(--r-lg) 0;
  z-index: 2;
  box-shadow: 0 2rpx 8rpx var(--s-romance);
}

/* Task 28: 热门徽章文本改为 <text> 元素，支持 i18n 切换 */
.function-item__hot-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  background: linear-gradient(135deg, var(--c-romance-400), var(--c-accent-400));
  color: var(--c-text-inverse);
  font-size: var(--fs-xs);
  font-weight: 700;
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-lg) var(--r-lg) var(--r-lg) 0;
  z-index: 3;
  box-shadow: 0 2rpx 8rpx var(--s-romance);
  line-height: 1.2;
}

.function-icon {
  width: 96rpx;
  height: 96rpx;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
}

.function-icon--pink {
  background: linear-gradient(135deg, var(--c-romance-400) 0%, var(--c-romance-500) 100%);
  box-shadow: 0 6rpx 16rpx var(--s-romance);
}

.function-icon--purple {
  background: linear-gradient(135deg, var(--c-lavender-500) 0%, var(--c-lavender-500) 100%);
  box-shadow: 0 6rpx 16rpx var(--c-lavender-500);
}

.function-icon--orange {
  background: linear-gradient(135deg, var(--c-accent-400) 0%, var(--c-accent-400) 100%);
  box-shadow: 0 6rpx 16rpx var(--c-tag-match-to);
}

.function-icon--red {
  background: linear-gradient(135deg, var(--c-error-dark) 0%, var(--c-error) 100%);
  box-shadow: 0 6rpx 16rpx var(--s-action-error);
}

.function-icon--green {
  background: linear-gradient(135deg, var(--c-success) 0%, var(--c-success) 100%);
  box-shadow: 0 6rpx 16rpx var(--s-action-success);
}

.function-icon--cyan {
  background: linear-gradient(135deg, var(--c-info-400) 0%, var(--c-info-500) 100%);
  box-shadow: 0 6rpx 16rpx var(--c-info-500);
}

.function-icon--yellow {
  background: linear-gradient(135deg, var(--c-gold) 0%, var(--c-warning) 100%);
  box-shadow: 0 6rpx 16rpx var(--c-warning-border-tint);
}

.function-icon--blue {
  background: linear-gradient(135deg, var(--c-info-400) 0%, var(--c-info-500) 100%);
  box-shadow: 0 6rpx 16rpx var(--s-action-super);
}

.function-emoji {
  width: 56rpx;
  height: 56rpx;
  color: var(--c-neutral-0);
}

.function-label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  font-weight: 500;
}

/* 校园活动未认证锁标（emoji 替换为 SVG） */
.function-item__lock-badge {
  position: absolute;
  top: 8rpx;
  right: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.function-item__lock-badge-icon {
  width: 28rpx;
  height: 28rpx;
  color: var(--c-warning, #f59e0b);
}

/* ========== 分区标题 ========== */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-5);
}

.section-title {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary);
}

.section-title-group {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-2);
}

.section-title__icon {
  width: 32rpx;
  height: 32rpx;
  color: var(--c-romance-500);
  flex-shrink: 0;
}

.section-more {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
}

.section-more--green {
  color: var(--c-brand-500);
  font-weight: 500;
}

/* ========== Banner轮播 ========== */
.banner-scroll {
  width: 100%;
}

.banner-list {
  display: flex;
  gap: var(--sp-5);
  padding-right: var(--page-padding);
}

.banner-card {
  flex-shrink: 0;
  width: 300rpx;
  height: 180rpx;
  border-radius: var(--r-xl);
  padding: var(--sp-6);
  display: flex;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.banner-card::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 30%, var(--c-overlay-white-bg-tint-strong) 0%, transparent 60%);
  pointer-events: none;
}

/* #ifdef H5 */
.banner-card:active {
  transform: scale(0.98);
}
/* #endif */

.banner-card--romance {
  background: var(--c-gradient-romance);
}

.banner-card--green {
  background: var(--c-gradient-float-btn);
}

.banner-card--warm {
  background: linear-gradient(135deg, var(--c-accent-400) 0%, var(--c-warning) 100%);
}

.banner-card--purple {
  background: linear-gradient(135deg, var(--c-lavender-500) 0%, var(--c-lavender-500) 100%);
}

.banner-content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
  z-index: 1;
}

.banner-tag {
  display: inline-flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-xs);
  color: var(--c-overlay-text-secondary);
  background: var(--c-overlay-bg-light);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
  align-self: flex-start;
}

.banner-tag__icon {
  width: 20rpx;
  height: 20rpx;
  color: var(--c-overlay-bg-pure);
  flex-shrink: 0;
}

.banner-tag__text {
  font-size: var(--fs-xs);
  color: var(--c-overlay-bg-pure);
  font-weight: 500;
}

.banner-title {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-text-inverse);
}

.banner-desc {
  font-size: var(--fs-sm);
  color: var(--c-overlay-white-text-strong);
}

.banner-emoji {
  width: 96rpx;
  height: 96rpx;
  opacity: 0.4;
  position: absolute;
  right: var(--sp-4);
  bottom: var(--sp-2);
  color: var(--c-overlay-bg-solid);
}

/* ========== 活动卡片 ========== */
.activity-scroll {
  width: 100%;
}

.activity-list {
  display: flex;
  gap: var(--sp-5);
  padding-right: var(--page-padding);
}

.activity-card-new {
  flex-shrink: 0;
  width: 260rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  overflow: hidden;
  box-shadow: var(--s-sm);
}

/* #ifdef H5 */
.activity-card-new:active {
  transform: scale(0.98);
}
/* #endif */

.activity-card__image-wrap {
  position: relative;
  width: 100%;
  height: 140rpx;
  background: linear-gradient(135deg, var(--c-brand-200), var(--c-brand-300));
  display: flex;
  align-items: center;
  justify-content: center;
}

.activity-card__img {
  width: 100%;
  height: 100%;
}

.activity-card__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--c-romance-100), var(--c-romance-200));
}

.activity-placeholder-emoji {
  width: 56rpx;
  height: 56rpx;
  color: var(--c-romance-500);
}

.activity-card__status {
  position: absolute;
  top: var(--sp-3);
  left: var(--sp-3);
  padding: var(--sp-1) var(--sp-3);
  border-radius: var(--r-full);
}

.activity-status--open {
  background: var(--c-state-signup-bg);
  .activity-status-text {
    color: var(--c-state-signup-text);
  }
}

.activity-status--ongoing {
  background: var(--c-state-ongoing-bg);
  .activity-status-text {
    color: var(--c-state-ongoing-text);
  }
}

.activity-status--upcoming {
  background: var(--c-state-preview-bg);
  .activity-status-text {
    color: var(--c-state-preview-text);
  }
}

.activity-status-text {
  font-size: var(--fs-xs);
  font-weight: 500;
}

.activity-card__info-new {
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.activity-card__title-new {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-card__time-new {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* ========== 推荐用户 ========== */
.recommend-scroll {
  width: 100%;
}

.recommend-list {
  display: flex;
  gap: var(--sp-5);
  padding-right: var(--page-padding);
}

.user-card {
  flex-shrink: 0;
  width: 180rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  padding: var(--sp-6) var(--sp-4);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-2);
  box-shadow: var(--s-card-soft);
}

/* #ifdef H5 */
.user-card:active {
  transform: scale(0.97);
}
/* #endif */

.user-avatar-wrap {
  position: relative;
  margin-bottom: var(--sp-2);
}

.user-avatar-ring {
  width: 112rpx;
  height: 112rpx;
  border-radius: var(--r-full);
  padding: 6rpx;
  background: var(--c-gradient-brand);
}

.user-avatar {
  width: 100%;
  height: 100%;
  border-radius: var(--r-full);
  background: var(--c-romance-50);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.user-avatar-emoji {
  font-size: 48rpx;
}

.online-dot {
  position: absolute;
  bottom: 6rpx;
  right: 6rpx;
  width: var(--sp-5);
  height: var(--sp-5);
  background: var(--c-success);
  border-radius: var(--r-full);
  border: 4rpx solid var(--c-bg-container);
}

.user-nickname {
  font-size: var(--fs-base);
  font-weight: 600;
  color: var(--c-text-primary);
}

.user-info {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

.match-tag {
  display: inline-flex;
  align-items: center;
  gap: 4rpx;
  margin-top: var(--sp-2);
  background: var(--c-romance-50);
  padding: 6rpx var(--sp-3);
  border-radius: var(--r-full);
}

.match-tag__icon {
  width: 20rpx;
  height: 20rpx;
  color: var(--c-romance-500);
  flex-shrink: 0;
}

.match-text {
  font-size: var(--fs-xs);
  color: var(--c-romance-500);
  font-weight: 500;
}

/* ========== 课表卡片 ========== */
.schedule-card-new {
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  padding: var(--sp-6);
  box-shadow: var(--s-sm);
}

/* 类型图例 */
.schedule-legend {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding-bottom: var(--sp-4);
  margin-bottom: var(--sp-5);
  border-bottom: 1rpx solid var(--c-border-light);
}

.schedule-legend__item {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.schedule-legend__dot {
  width: var(--sp-5);
  height: var(--sp-5);
  border-radius: var(--r-sm);
}

.schedule-legend__label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  font-weight: 500;
}

.schedule-days-new {
  display: flex;
  gap: var(--sp-3);
  margin-bottom: var(--sp-5);
}

.schedule-day-new {
  flex: 1;
  padding: var(--sp-3) 0;
  border-radius: var(--r-lg);
  background: var(--c-bg-page);
  text-align: center;
}

.schedule-day--active-new {
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand-sm);
}

.schedule-day__name-new {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  font-weight: 500;
}

.schedule-day--active-new .schedule-day__name-new {
  color: var(--c-text-inverse);
  font-weight: 600;
}

.schedule-slots-new {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.schedule-slot-new {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  padding: var(--sp-4);
  border-radius: var(--r-lg);
  background: var(--c-bg-page);
}

/* 空闲时段 */
.schedule-slot--free-new {
  background: var(--c-brand-bg-tint);
  border: 1rpx dashed var(--c-brand-border-tint-stronger);
}

/* 课程色块（蓝色） */
.schedule-slot--course {
  background: var(--c-schedule-course);

  .schedule-slot__course-new {
    color: var(--c-schedule-course-text);
  }

  .schedule-slot__classroom-new {
    color: var(--c-schedule-course-text);
    opacity: 0.75;
  }
}

/* 活动色块（绿色） */
.schedule-slot--activity {
  background: var(--c-schedule-activity);

  .schedule-slot__course-new {
    color: var(--c-schedule-activity-text);
  }

  .schedule-slot__classroom-new {
    color: var(--c-schedule-activity-text);
    opacity: 0.75;
  }
}

/* 自定义色块（橙色） */
.schedule-slot--custom {
  background: var(--c-schedule-custom);

  .schedule-slot__course-new {
    color: var(--c-schedule-custom-text);
  }

  .schedule-slot__classroom-new {
    color: var(--c-schedule-custom-text);
    opacity: 0.75;
  }
}

.schedule-slot__time-new {
  font-size: var(--fs-sm);
  color: var(--c-text-quaternary);
  width: 160rpx;
  flex-shrink: 0;
}

.schedule-slot__content-new {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.schedule-slot__course-new {
  font-size: var(--fs-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.schedule-slot__classroom-new {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
  margin-top: var(--sp-1);
}

.schedule-slot__free-new {
  display: flex;
  align-items: center;
  gap: var(--sp-1);
  font-size: var(--fs-base);
  color: var(--c-brand-500);
  font-weight: 500;
}

.schedule-slot__free-icon {
  width: 24rpx;
  height: 24rpx;
  color: var(--c-brand-500);
  flex-shrink: 0;
}

.schedule-slot__free-text {
  font-size: var(--fs-base);
  color: var(--c-brand-500);
  font-weight: 500;
}

/* ========== 帖子列表 ========== */
.post-list-new {
  display: flex;
  flex-direction: column;
  gap: var(--sp-5);
}

.post-card-new {
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  padding: var(--sp-6);
  box-shadow: var(--s-card-soft);
}

/* #ifdef H5 */
.post-card-new:active {
  transform: scale(0.99);
}
/* #endif */

.post-card__header-new {
  display: flex;
  align-items: center;
  gap: var(--sp-4);
  margin-bottom: var(--sp-4);
}

.post-avatar-wrap {
  flex-shrink: 0;
}

.post-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-full);
  background: var(--c-romance-100);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.post-avatar-emoji {
  font-size: var(--fs-4xl);
}

.post-meta-new {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
}

.post-nickname-new {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.post-school-new {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.post-content-new {
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  line-height: 1.6;
  margin-bottom: var(--sp-4);
}

.post-images-new {
  display: flex;
  gap: var(--sp-3);
  margin-bottom: var(--sp-4);
}

.post-image-item {
  width: 160rpx;
  height: 160rpx;
  border-radius: var(--r-md);
  background: linear-gradient(135deg, var(--c-neutral-50), var(--c-neutral-100));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.post-image-emoji {
  font-size: 48rpx;
  opacity: 0.5;
}

.post-footer-new {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: var(--sp-4);
  border-top: 1rpx solid var(--c-neutral-50);
}

.post-location-new {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.post-location-emoji {
  width: 24rpx;
  height: 24rpx;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.post-location-text {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.post-actions-new {
  display: flex;
  gap: 28rpx;
}

.post-action-new {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

/* #ifdef H5 */
.post-action-new:active {
  transform: scale(0.9);
}
/* #endif */

.post-action-emoji {
  width: 32rpx;
  height: 32rpx;
  color: var(--c-text-tertiary);
  flex-shrink: 0;
}

.post-action--liked .post-action-emoji {
  color: var(--c-romance-500);
}

.post-action-count {
  font-size: var(--fs-sm);
  color: var(--c-text-tertiary);
}

.post-action--liked .post-action-count {
  color: var(--c-error);
}

/* ========== 逛逛推荐 ========== */
.shop-scroll-new {
  width: 100%;
}

.shop-list-new {
  display: flex;
  gap: var(--sp-5);
  padding-right: var(--page-padding);
}

.shop-card-new {
  flex-shrink: 0;
  width: 220rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-lg);
  overflow: hidden;
  box-shadow: var(--s-sm);
}

/* #ifdef H5 */
.shop-card-new:active {
  transform: scale(0.97);
}
/* #endif */

.shop-image-wrap {
  width: 100%;
  height: 180rpx;
  background: var(--c-romance-50);
  display: flex;
  align-items: center;
  justify-content: center;
}

.shop-image-emoji {
  font-size: 64rpx;
}

.shop-title-new {
  font-size: var(--fs-base);
  color: var(--c-text-primary);
  padding: var(--sp-4) var(--sp-4) var(--sp-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.shop-bottom-new {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sp-4) var(--sp-4);
}

.shop-price-new {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-error);
}

.shop-sales-new {
  font-size: var(--fs-xs);
  color: var(--c-text-tertiary);
}

/* ========== 社交升温迷你卡片 ========== */
.social-mini-card-new {
  display: flex;
  align-items: center;
  gap: var(--sp-5);
  padding: 28rpx;
  background: var(--c-bg-container);
  border-radius: var(--r-xl);
  box-shadow: var(--s-brand-sm);
  border: var(--c-border-card-brand);
}

/* #ifdef H5 */
.social-mini-card-new:active {
  transform: scale(0.98);
}
/* #endif */

.social-progress-wrap {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  flex-shrink: 0;
}

.social-bar-track {
  width: 120rpx;
  height: var(--sp-3);
  border-radius: var(--r-sm);
  background: var(--c-neutral-50);
  overflow: hidden;
}

.social-bar-fill {
  height: 100%;
  border-radius: var(--r-sm);
  background: var(--c-gradient-float-btn);
  transition: width var(--d-slowest, 600ms) ease;
}

.social-percent {
  font-size: var(--fs-lg);
  font-weight: 700;
  color: var(--c-brand-500);
}

.social-info-new {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.social-label {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--c-text-primary);
}

.social-hint {
  font-size: var(--fs-base);
  color: var(--c-text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.social-arrow {
  font-size: var(--fs-4xl);
  color: var(--c-neutral-300);
  font-weight: 300;
}

/* ========== 底部留白 ========== */
.home-footer-space {
  height: 200rpx;
}

/* ========== 悬浮发布按钮 ========== */
.fab-container {
  position: fixed;
  right: var(--page-padding);
  bottom: calc(env(safe-area-inset-bottom) + 120rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
  z-index: var(--z-dropdown);
}

.fab-bubble {
  background: var(--c-neutral-800);
  padding: 10rpx var(--sp-5);
  border-radius: var(--r-full);
  opacity: 0;
  transform: translateY(10rpx);
  animation: fabBubble var(--d-breathe, 3000ms) ease-in-out infinite;
}

.fab-bubble-text {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse);
}

@keyframes fabBubble {
  0%, 100% { opacity: 0; transform: translateY(10rpx); }
  20%, 80% { opacity: 0.8; transform: translateY(0); }
}

.fab-button {
  width: 112rpx;
  height: 112rpx;
  border-radius: var(--r-full);
  background: var(--c-gradient-float-btn);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-float-btn);
}

/* #ifdef H5 */
.fab-button:active {
  transform: scale(0.92);
}
/* #endif */

.fab-icon {
  font-size: 56rpx;
  color: var(--c-text-inverse);
  font-weight: 300;
  line-height: 1;
}

/* ========== 学校选择弹窗 ========== */
.school-picker {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--c-bg-overlay);
  z-index: var(--z-modal);
  display: flex;
  align-items: flex-end;
}

.school-picker__content {
  width: 100%;
  background: var(--c-bg-container);
  border-radius: var(--r-xl, 32rpx) var(--r-xl, 32rpx) 0 0;
  padding: var(--sp-8);
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--sp-8));
}

.school-picker__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-6);
}

.school-picker__title {
  font-size: var(--fs-2xl);
  font-weight: 700;
  color: var(--c-text-primary);
}

.school-picker__close {
  font-size: var(--fs-2xl);
  color: var(--c-text-tertiary);
  padding: var(--sp-2);
}

.school-picker__list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.school-picker__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx var(--sp-6);
  border-radius: var(--r-lg);
  background: var(--c-neutral-50);
}

.school-picker__item--active {
  background: var(--c-bg-brand);
}

.school-picker__item-name {
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
}

.school-picker__item-check {
  font-size: var(--fs-lg);
  color: var(--c-brand-500);
  font-weight: 700;
}

/* ========== 页面进入动画 ========== */
/* page-fade-in 已统一在 App.vue 中定义（300ms），此处不再重复 */
</style>
