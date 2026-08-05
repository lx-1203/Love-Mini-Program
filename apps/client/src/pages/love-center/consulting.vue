<script setup lang="ts">
/**
 * 恋爱咨询课程（任务 E3）
 *
 * 支持后台配置 H5 URL：onLoad 读取 contentPageUrls.consultingUrl，
 * 非空则渲染 <web-view>；为空则展示本地示例课程列表
 * （恋爱沟通课 / 脱单攻略课 / 亲密关系修复课）。
 */
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { lightHaptic } from "../../utils/haptic";
import { contentPageUrls } from "../../config/content-pages";
import { IMAGE_PATHS } from "../../config/images";

const { t } = useI18n();

/** 后台配置的 H5 URL（非空时展示 web-view） */
const webUrl = ref("");

/** 返回按钮图标 */
const backIcon = IMAGE_PATHS.ICONS_COMMON.BACK;

onLoad(() => {
  webUrl.value = contentPageUrls.consultingUrl ?? "";
});

/** 本地示例课程（文案走 i18n contentPages.consulting.course*） */
const courses = [
  { id: "c-1", titleKey: "contentPages.consulting.course1.title", lecturerKey: "contentPages.consulting.course1.lecturer", descKey: "contentPages.consulting.course1.desc", price: 99 },
  { id: "c-2", titleKey: "contentPages.consulting.course2.title", lecturerKey: "contentPages.consulting.course2.lecturer", descKey: "contentPages.consulting.course2.desc", price: 129 },
  { id: "c-3", titleKey: "contentPages.consulting.course3.title", lecturerKey: "contentPages.consulting.course3.lecturer", descKey: "contentPages.consulting.course3.desc", price: 159 },
] as const;

/** 课程价格文案（¥{price}） */
function priceLabel(price: number): string {
  return t("contentPages.consulting.pricePrefix", { price });
}

/** 报名课程：toast 提示（真实报名/支付链路接入后端） */
function handleSignup() {
  lightHaptic();
  uni.showToast({ title: t("contentPages.consulting.signupSuccess"), icon: "none", duration: 2000 });
}

/** 返回上一页（右上角固定按钮） */
function goBack() {
  uni.navigateBack();
}
</script>

<template>
  <view class="content-page page-fade-in">
    <!-- 后台配置 H5 URL：web-view 加载 -->
    <web-view v-if="webUrl" :src="webUrl" class="content-webview" />

    <!-- 本地示例内容 -->
    <template v-else>
      <view class="content-header">
        <text class="content-header__title">{{ t('contentPages.consulting.title') }}</text>
        <view class="content-header__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
          <image class="content-header__back-icon" :src="backIcon" mode="aspectFit" alt="" />
        </view>
      </view>

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
    </template>
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

/* ========== 顶部栏（标题 + 右上角固定返回按钮） ========== */
.content-header {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(var(--sp-4) + env(safe-area-inset-top)) var(--sp-4) var(--sp-3);
  background: linear-gradient(135deg, var(--c-brand-500, #3fcf8e) 0%, var(--c-brand-400, #6fe0b0) 100%);
}

.content-header__title {
  font-size: var(--fs-xl, 34rpx);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
}

.content-header__back {
  position: absolute;
  top: calc(var(--sp-4) + env(safe-area-inset-top));
  right: var(--sp-4);
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-white-bg-tint, rgba(255, 255, 255, 0.2));
}

.content-header__back-icon {
  width: 36rpx;
  height: 36rpx;
  color: var(--c-text-inverse, #ffffff);
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
  background: var(--c-gradient-brand, linear-gradient(135deg, #3fcf8e, #6fe0b0));
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
