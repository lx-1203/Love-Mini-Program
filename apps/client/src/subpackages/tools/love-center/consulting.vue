<script setup lang="ts">
/**
 * 恋爱咨询课程（任务 E3）
 *
 * R10-P1-002（2026-09-17 全站审查）：本页带付费课程与「报名」交易动作，
 * 必须接商业化封存闸 —— commerce.consult（含总闸）为 false 时渲染封存卡，
 * 与 market 三页（ADR-2）表现一致；此前封存态下仍展示 ¥ 课程可报名。
 *
 * 支持后台配置 H5 URL：onLoad 读取 contentPageUrls.consultingUrl，
 * 非空则渲染 <web-view>；为空则展示本地示例课程列表。
 *
 * R10-P2-014：导航从绿色实心渐变头改为全站统一 AppShell（白底 + 居中标题 + 返回），
 * 同时消除该模块的状态栏叠印（R10-P1-003 家族：原 env-only 避让在 DevTools 恒 0）。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import { lightHaptic } from "../../../utils/haptic";
import { contentPageUrls } from "../../../config/content-pages";
import { IMAGE_PATHS } from "../../../config/images";
import { useAppConfigStore } from "../../../stores/app-config";
// R4-00976：toast 时长走统一常量（TOAST_DURATION.NORMAL_MS = 2000ms）
import { TOAST_DURATION } from "../../../constants/limits";

const { t } = useI18n();
const appConfig = useAppConfigStore();

/** 后台配置的 H5 URL（非空时展示 web-view） */
const webUrl = ref("");

/**
 * R10-P1-002：咨询/课程属付费项目，commerce.consult 子闸（受总闸管辖）关闭即封存。
 * 缺省封存（=== true 才放行），mock 后端未下发 commerce.* 时恒为封存态。
 */
const commerceSealed = computed(() => !appConfig.isCommerceOn("consult"));

onLoad(() => {
  webUrl.value = contentPageUrls.consultingUrl ?? "";
});

/**
 * R4-00032: 本地示例课程价格（元）集中配置，调价只需改此处。
 * 后续接入真实报名/支付链路后，价格应改由后端课程配置下发，此常量即移除。
 */
const COURSE_PRICES = {
  communication: 99,   // 恋爱沟通课
  dating: 129,         // 脱单攻略课
  intimacyRepair: 159, // 亲密关系修复课
} as const;

/** 本地示例课程（文案走 i18n contentPages.consulting.course*） */
const courses = [
  { id: "c-1", titleKey: "contentPages.consulting.course1.title", lecturerKey: "contentPages.consulting.course1.lecturer", descKey: "contentPages.consulting.course1.desc", price: COURSE_PRICES.communication },
  { id: "c-2", titleKey: "contentPages.consulting.course2.title", lecturerKey: "contentPages.consulting.course2.lecturer", descKey: "contentPages.consulting.course2.desc", price: COURSE_PRICES.dating },
  { id: "c-3", titleKey: "contentPages.consulting.course3.title", lecturerKey: "contentPages.consulting.course3.lecturer", descKey: "contentPages.consulting.course3.desc", price: COURSE_PRICES.intimacyRepair },
] as const;

/** 课程价格文案（¥{price}） */
function priceLabel(price: number): string {
  return t("contentPages.consulting.pricePrefix", { price });
}

/** 报名课程：toast 提示（真实报名/支付链路接入后端） */
function handleSignup() {
  lightHaptic();
  uni.showToast({ title: t("contentPages.consulting.signupSuccess"), icon: "none", duration: TOAST_DURATION.NORMAL_MS });
}
</script>

<template>
  <view class="content-page">
    <!-- 后台配置 H5 URL：web-view 加载（封存态优先，不下发外部付费内容） -->
    <web-view v-if="!commerceSealed && webUrl" :src="webUrl" class="content-webview" />

    <!-- R10-P1-002：商业化封存态（commerce.consult=false）→ 封存卡，与 market/ADR-2 一致 -->
    <AppShell v-else-if="commerceSealed" :title="t('contentPages.consulting.title')" show-back>
      <view class="consult-sealed" aria-live="polite">
        <image class="consult-sealed__icon" :src="IMAGE_PATHS.ICONS_COMMON.LOCK_SVG" mode="aspectFit" alt="" />
        <text class="consult-sealed__title">{{ t('commerce.sealedTitle') }}</text>
        <text class="consult-sealed__desc">{{ t('commerce.sealedDesc') }}</text>
      </view>
    </AppShell>

    <!-- 本地示例内容 -->
    <AppShell v-else :title="t('contentPages.consulting.title')" show-back>
      <scroll-view scroll-y class="content-scroll" :show-scrollbar="false">
        <view class="content-section">
          <text class="content-section__title">{{ t('contentPages.consulting.subtitle') }}</text>
          <view class="course-list" role="list">
            <view v-for="course in courses" :key="course.id" class="course-card">
              <view class="course-card__info">
                <text class="course-card__title">{{ t(course.titleKey) }}</text>
                <text class="course-card__desc">{{ t(course.descKey) }}</text>
                <view class="course-card__meta">
                  <text class="course-card__lecturer">{{ t(course.lecturerKey) }}</text>
                  <text class="course-card__price">{{ priceLabel(course.price) }}</text>
                </view>
              </view>
              <view class="course-card__signup press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('contentPages.consulting.signup')" @tap="handleSignup">
                <text class="course-card__signup-text">{{ t('contentPages.consulting.signup') }}</text>
              </view>
            </view>
          </view>
        </view>
        <view class="content-footer-space" />
      </scroll-view>
    </AppShell>
  </view>
</template>

<style scoped lang="scss">
.content-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: var(--c-bg-page, #f4f6fa);
}

.content-webview {
  flex: 1;
}

.content-scroll {
  flex: 1;
  height: 0;
}

.content-section {
  margin: var(--sp-5) var(--sp-4);
}

.content-section__title {
  display: block;
  font-size: var(--fs-lg, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
  margin-bottom: var(--sp-4);
}

/* ========== R10-P1-002：商业化封存卡（对齐 market/ADR-2 表现） ========== */
.consult-sealed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  margin: var(--sp-6) var(--sp-4);
  padding: calc(var(--sp-8) + var(--sp-4)) var(--sp-5);
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.consult-sealed__icon {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: var(--sp-2);
  opacity: 0.85;
}

.consult-sealed__title {
  font-size: var(--fs-xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.consult-sealed__desc {
  font-size: var(--fs-sm, 26rpx);
  color: var(--c-text-secondary, #5b6470);
  text-align: center;
  line-height: 1.6;
}

/* ========== 课程列表 ========== */
.course-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
}

.course-card {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-5);
  border-radius: var(--r-xl, 24rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

.course-card__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.course-card__title {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1f2937);
}

.course-card__desc {
  font-size: var(--fs-xs, 22rpx);
  color: var(--c-text-secondary, #5b6470);
  line-height: 1.5;
}

.course-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-2);
}

.course-card__lecturer {
  font-size: var(--fs-xs, 20rpx);
  color: var(--c-text-tertiary, #9aa1ab);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.course-card__price {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 700;
  color: var(--c-error, #e5454d);
  flex-shrink: 0;
}

.course-card__signup {
  flex-shrink: 0;
  background: var(--c-gradient-brand, linear-gradient(135deg, #36C99A, #6fe0b0));
  padding: 12rpx var(--sp-5);
  border-radius: var(--r-full);
}

.course-card__signup-text {
  font-size: var(--fs-base, 24rpx);
  font-weight: 600;
  color: var(--c-text-inverse, #ffffff);
}

.content-footer-space {
  height: calc(120rpx + env(safe-area-inset-bottom));
}
</style>
