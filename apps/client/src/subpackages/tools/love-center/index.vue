<script setup lang="ts">
/**
 * 恋爱中心 - 恋爱咨询（4 板块）+ 恋爱测试入口
 *
 * Phase Feedback2：首页精简后，恋爱咨询（恋爱咨询/恋爱课程/社交咨询/社交课程）
 * 与恋爱测试（MBTI 等）统一收敛到本页，避免首页功能堆砌。
 *
 * 商业定位：为后续"情感内容付费/课程变现"预留入口位。
 * 2026-08-07 已落地真实内容源：四板块 → 咨询课程页 / 帮助客服页，测试 → MBTI 页。
 */
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import { computed } from "vue";
import { onShareAppMessage } from "@dcloudio/uni-app";
import { lightHaptic } from "../../../utils/haptic";
import { IMAGE_PATHS } from "../../../config/images";
// 任务 E3：三个内容页（附近的人 / MBTI / 恋爱咨询课程）路由常量
import { ROUTES } from "../../../constants/routes";
import { useSessionStore } from "../../../stores/session";
// 批次 A5：商业化封存开关
import { useAppConfigStore } from "../../../stores/app-config";
const { t } = useI18n();
const sessionStore = useSessionStore();
const appConfig = useAppConfigStore();

/** 恋爱咨询四板块 */
const consultingBoards = [
  { id: "love-consulting", icon: IMAGE_PATHS.ICONS_EMOJI.DOUBLE_HEART, titleKey: "home.loveConsulting", descKey: "home.loveConsultingDesc" },
  { id: "love-course", icon: IMAGE_PATHS.ICONS_EMOJI.BOOK, titleKey: "home.loveCourse", descKey: "home.loveCourseDesc" },
  { id: "social-consulting", icon: IMAGE_PATHS.ICONS_EMOJI.SPEECH, titleKey: "home.socialConsulting", descKey: "home.socialConsultingDesc" },
  { id: "social-course", icon: IMAGE_PATHS.ICONS_EMOJI.GRAD_CAP, titleKey: "home.socialCourse", descKey: "home.socialCourseDesc" },
] as const;

/** 恋爱测试入口 */
const testEntries = [
  { id: "mbti", icon: IMAGE_PATHS.ICONS_EMOJI.PUZZLE, titleKey: "home.mbtiTest" },
] as const;

/** 任务 E3：快捷入口（附近的人 / MBTI 人格测试 / 恋爱咨询课程）；批次 A5：consulting 受商业化开关控制 */
const quickEntries = computed(() => {
  const entries: Array<{ id: string; icon: string; titleKey: string; url: string }> = [
    // R6-L09-D01（素材缺失 P1）：原绑 ICONS_EMOJI.LOCATION = `/static/assets/icons/location.svg`，
    // 该根目录既不在 cdn-buckets.json 的 cdnPrefixes（只登记 icons/home|match|v2|emoji|login|social|nearby/）
    // 也不在 localPrefixes（只登记 icons/tabbar|register|common/）⇒ real 档发布链按引用裁剪后包内无此文件
    // （实测 apps/client/dist/build/mp-weixin-real/static/assets/icons/ 只剩 common/register/tabbar 三目录，
    // 且 common/ 下只有 location.png、无 location.svg），裸绑必出 0 墨迹空槽。
    // 改指同族在包内的 ICONS_COMMON.LOCATION（common/location.png：PNG 自带内在尺寸，
    // 不依赖 SVG 缺 width/height 那条渲染路径，实测包内 108/111 枚在盘）。
    { id: "nearby", icon: IMAGE_PATHS.ICONS_COMMON.LOCATION, titleKey: "contentPages.entries.nearby", url: ROUTES.LOVE_CENTER.NEARBY },
    // R10-P2-014：MBTI 与下方「恋爱测试」区重复，仅保留后者
  ];
  if (appConfig.isCommerceOn("course")) {
    entries.push({ id: "consulting", icon: IMAGE_PATHS.ICONS_EMOJI.DOUBLE_HEART, titleKey: "contentPages.entries.consulting", url: ROUTES.LOVE_CENTER.CONSULTING as string });
  }
  return entries;
});

/** 任务 E3：跳转快捷入口对应内容页 */
function goToQuickEntry(entry: { url: string }) {
  lightHaptic();
  uni.navigateTo({ url: entry.url });
}

/**
 * R6-L09-D06（需新建 P1）：课程两板块的封存判定。
 *
 * 缺陷实况：real 档后端未下发 commerce.course / commerce.consult ⇒ 原 `v-if` 让整块
 * 「恋爱咨询 4 板块」（本页标题承诺的主体内容，index.vue:3 页面自述）一帧画面都不出，
 * 页名与画面互相矛盾、滚到底只剩两张白卡。
 * 处置（页面侧降级，不动开关语义、不改判据）：4 板块恒渲染 ——
 * 恋爱咨询 / 社交咨询 指向帮助与客服页（ROUTES.HELP，与商业化开关无关）⇒ 保持可点；
 * 恋爱课程 / 社交课程 指向咨询课程页（该页自身按 isCommerceOn("consult") 封存）⇒
 * 开关未开时置灰 + 打「功能封存中」标记，点击给既有 commerce.sealedToast，不再整段消失。
 */
function isBoardSealed(boardId: string): boolean {
  return (boardId === "love-course" || boardId === "social-course") && !appConfig.isCommerceOn("consult");
}

/**
 * 点击四板块（2026-08-07 落地真实内容源）：
 * - 恋爱课程 / 社交课程 → 咨询课程页（web-view 加载国家高等教育智慧教育平台《爱情心理学》）
 * - 恋爱咨询 / 社交咨询 → 帮助与客服页（在线咨询：AI 恋爱助手 + 人工客服入口）
 */
function onBoardTap(boardId: string) {
  lightHaptic();
  if (boardId === "love-consulting" || boardId === "social-consulting") {
    uni.navigateTo({ url: ROUTES.HELP });
    return;
  }
  // R6-L09-D06：封存态课程板块不再跳进一个只有封存卡的页面，直接给封存提示
  if (isBoardSealed(boardId)) {
    uni.showToast({ title: t("commerce.sealedToast"), icon: "none" });
    return;
  }
  uni.navigateTo({ url: ROUTES.LOVE_CENTER.CONSULTING });
}

/** 点击测试：进入 MBTI 人格测试页（web-view 加载十六型本土化测试） */
function onTestTap(_testId: string) {
  lightHaptic();
  uni.navigateTo({ url: ROUTES.LOVE_CENTER.MBTI });
}

/** 恋爱中心分享（2026-08-10 A3 补齐）：分享自己的个人主页 */
onShareAppMessage(() => {
  const name = sessionStore.userSession?.displayName || t("chat.privateMessageTitle");
  return {
    title: t("profile.shareProfileTitle", { name }),
    path: "/pages/profile/index",
  };
});
</script>

<template>
  <AppShell :title="t('showcase.groups.home.items.loveCenter.title')" show-back>
    <!-- R7-L07-D05（文案 P2）：页头标题原引 home.loveConsulting=「恋爱咨询」，与下方第二个板块
         标题(:141 同键）逐字重复，且本页实为「恋爱中心」聚合页（快捷入口/恋爱咨询/恋爱测试）
         ⇒ 页头改走既有「恋爱中心」键（showcase.groups.home.items.loveCenter.title，zh-CN.ts:2344
         「恋爱中心」/ en-US.ts:2251 "Love Center"，非新增键），板块标题保留「恋爱咨询」 -->
    <view class="love-center">
    <!-- 任务 E3：快捷入口（附近的人 / MBTI 人格测试 / 恋爱咨询课程） -->
    <view class="love-center__section">
      <text class="love-center__section-title">{{ t('contentPages.entries.sectionTitle') }}</text>
      <view class="love-center__quick-grid">
        <view
          v-for="entry in quickEntries"
          :key="entry.id"
          class="love-center__quick press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t(entry.titleKey)"
          @tap="goToQuickEntry(entry)"
        >
          <!-- R6-L09-D01：lazy-load 只在 scroll-view 内生效（本页是普通 view），去掉无效属性 -->
          <image class="love-center__quick-icon" :src="entry.icon" mode="aspectFit" alt="" />
          <text class="love-center__quick-title">{{ t(entry.titleKey) }}</text>
          <text class="love-center__quick-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 恋爱咨询 4 板块（R6-L09-D06：不再整段 v-if 消失，未开放的课程板块降级为置灰 + 封存标记） -->
    <view class="love-center__section">
      <text class="love-center__section-title">{{ t('home.loveConsulting') }}</text>
      <view class="love-center__board-grid">
        <view
          v-for="board in consultingBoards"
          :key="board.id"
          class="love-center__board press-feedback"
          :class="{ 'love-center__board--sealed': isBoardSealed(board.id) }"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t(board.titleKey)"
          :aria-disabled="isBoardSealed(board.id) ? 'true' : 'false'"
          @tap="onBoardTap(board.id)"
        >
          <image class="love-center__board-icon" :src="board.icon" mode="aspectFit" alt="" />
          <text class="love-center__board-title">{{ t(board.titleKey) }}</text>
          <text class="love-center__board-desc">{{ t(board.descKey) }}</text>
          <text v-if="isBoardSealed(board.id)" class="love-center__board-sealed">{{ t('commerce.sealedTitle') }}</text>
        </view>
      </view>
    </view>

    <!-- 恋爱测试 -->
    <view class="love-center__section">
      <text class="love-center__section-title">{{ t('home.loveTestEntry') }}</text>
      <view class="love-center__test-list">
        <view
          v-for="test in testEntries"
          :key="test.id"
          class="love-center__test press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t(test.titleKey)"
          @tap="onTestTap(test.id)"
        >
          <image class="love-center__test-icon" :src="test.icon" mode="aspectFit" alt="" />
          <text class="love-center__test-title">{{ t(test.titleKey) }}</text>
          <text class="love-center__test-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- R6-L09-D07①：删掉 120rpx 固定留白 —— 页底留白由 AppShell 的安全区/内容容器给，
         固定 spacer 在 814px 视口里只把「滚到底」变成一片 #EEF7F2 空底（实测 bottom 帧 y=147 以下 667px 全空） -->
    </view>
  </AppShell>
</template>

<style scoped lang="scss">
.love-center {
  min-height: 100vh;
  background: var(--c-bg-page, #f4f6fa);
  padding-bottom: env(safe-area-inset-bottom);
}

.love-center__section {
  /* R6-L09-D03（间距 P2）：水平方向归 0 —— AppShell `.shell__content` 已给 `padding: 0 32rpx`
     （components/layout/AppShell.vue:297），本页再叠 var(--sp-4)=16rpx 即成双重 gutter
     （实测卡片左缘 x=24px=48rpx，规范页边距 32rpx=16px 的 1.5 倍）。水平单一来源交回 AppShell。 */
  margin: var(--sp-5) 0;
}

.love-center__section-title {
  display: block;
  /* R6-L09-D04（字号 P2）：区块标题原引 var(--fs-lg, 32rpx)，兜底值与真值不符
     （theme/design-variables.scss:564 `--fs-lg: 28rpx`）⇒ 实测 14px，比规范 §1.3
     区块标题 18-20px 小 4-6px，且与同页 24rpx 正文几乎拉不开。改 --fs-3xl(36rpx=18px)。 */
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
  margin-bottom: var(--sp-4);
}

.love-center__board-grid {
  /* 2 列等宽网格（mp-weixin 不支持 grid，改 flex-wrap + 子项等宽） */
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-3);
}

.love-center__board {
  /* 2 列等宽：扣除行内 1 个间距后二等分 */
  width: calc((100% - var(--sp-3)) / 2);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  padding: var(--sp-5);
  /* R6-L09-D02（圆角 P2）：卡片语义令牌 --card-radius(40rpx=20px)，原 --r-xl=24rpx 实测 11px 只有一半 */
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

/* R6-L09-D06：封存板块的置灰态（画面在、不可点，不再是「整块内容凭空消失」） */
.love-center__board--sealed {
  opacity: 0.5;
}

.love-center__board-sealed {
  align-self: flex-start;
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-secondary, #6b7280);
  background: var(--c-bg-surface, #F3FAF6);
  padding: 2rpx 12rpx;
  border-radius: var(--r-full, 999rpx);
}

.love-center__board-icon {
  width: 56rpx;
  height: 56rpx;
  /* R6-L09-D05（颜色token P2）：删掉 `color: var(--c-brand-500)` ——
     mp-weixin 的 `<image src="*.svg">` 是外链图片，CSS color 注不进那张图，
     这条声明从落不了画（同页 :201/:235/:270 三处同病）。描边色由素材自身决定，
     已由 F1 素材车道统一烘焙（见 tmp/qa/lanes/R6fix/F1-report.md §1.2）。 */
}

.love-center__board-title {
  font-size: var(--fs-base, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.love-center__board-desc {
  font-size: var(--fs-xs, 24rpx);
  color: var(--c-text-secondary, #6b7280);
  line-height: 1.5;
}

.love-center__test-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.love-center__test {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  /* R6-L09-D07②（可达性 P1）：纵向 padding 8rpx→24rpx，热区实测 38px(75rpx) → ≥88rpx 触控下限 */
  padding: var(--sp-6) var(--sp-5);
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.love-center__test-icon {
  width: 48rpx;
  height: 48rpx;
  /* R6-L09-D05：同上，`color` 注不进 `<image>` 外链 SVG，死代码已删 */
}

.love-center__test-title {
  flex: 1;
  font-size: var(--fs-base, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.love-center__test-arrow {
  font-size: var(--fs-2xl, 36rpx);
  color: var(--c-text-tertiary, #9ca3af);
}

/* ========== 任务 E3：快捷入口 ========== */
.love-center__quick-grid {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.love-center__quick {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  /* R6-L09-D07②：与 .love-center__test 同口径，热区 ≥88rpx */
  padding: var(--sp-6) var(--sp-5);
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.love-center__quick-icon {
  width: 48rpx;
  height: 48rpx;
  /* R6-L09-D05：同上，死代码已删 */
}

.love-center__quick-title {
  flex: 1;
  font-size: var(--fs-base, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.love-center__quick-arrow {
  font-size: var(--fs-2xl, 36rpx);
  color: var(--c-text-tertiary, #9ca3af);
}
</style>
