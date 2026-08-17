<script setup lang="ts">
/**
 * 校园圈 Hub（v3 Nearby 冻结 · 04_campus_circle）
 * 加入校园圈引导 + 校园列表（未认证/认证中/已认证/非本校 四态）+ 校园圈推荐。
 * 点击学校：已认证本校 → 私域（campus/index?school=）；其他 → 公开浏览。
 */
import { ref, computed } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useCampusStore } from "../../stores/campus";
import { useSessionStore } from "../../stores/session";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";
import { SCHOOLS } from "../../config/schools";
import { useMenuButtonRect } from "../../composables/useMenuButtonRect";
import { IMAGE_PATHS } from "../../config/images";

const { t } = useI18n();
const campusStore = useCampusStore();
const sessionStore = useSessionStore();
const { styleVars: menuStyleVars } = useMenuButtonRect();
const { certificationStatus, certificationInfo, isVerified } = storeToRefs(campusStore);

const selectedSchool = ref("");
const schools = SCHOOLS.slice(0, 6);

const isPending = computed(() => certificationStatus.value === "pending");
const ownSchool = computed(() => certificationInfo.value?.schoolName || sessionStore.userSession?.campusName || "");

onLoad((query) => {
  if (query && typeof query.school === "string" && query.school.trim()) {
    selectedSchool.value = query.school.trim();
  }
});

onShow(() => {
  void campusStore.fetchCertificationStatus().catch(() => {});
});

/** 学校状态：verified-own / pending-own / public */
function schoolStatus(schoolName: string): "own-verified" | "own-pending" | "public" {
  if (schoolName === ownSchool.value) {
    if (isVerified.value) return "own-verified";
    if (isPending.value) return "own-pending";
  }
  return "public";
}

function statusText(schoolName: string): string {
  const s = schoolStatus(schoolName);
  if (s === "own-verified") return t("campus.hub.statusVerified");
  if (s === "own-pending") return t("campus.hub.statusPending");
  return t("campus.hub.statusPublic");
}

function goSchool(schoolName: string) {
  openAppPath(`${ROUTES.CAMPUS.INDEX}?school=${encodeURIComponent(schoolName)}`);
}

function goCertification() {
  openAppPath(ROUTES.CAMPUS.CERTIFICATION);
}

function goBack() {
  uni.navigateBack();
}
</script>

<template>
  <view class="campus-hub" :style="menuStyleVars">
    <view class="campus-hub__header">
      <view class="campus-hub__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.back')" @tap="goBack">
        <text class="campus-hub__back-text">‹</text>
      </view>
      <text class="campus-hub__title">{{ t('campus.hub.title') }}</text>
      <view class="campus-hub__spacer" />
    </view>

    <!-- 加入引导 -->
    <view class="campus-guide card-base">
      <view class="campus-guide__icon">
        <image class="campus-guide__icon-img" :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG" mode="aspectFit" alt="" />
      </view>
      <view class="campus-guide__body">
        <text class="campus-guide__title">{{ t('campus.hub.guideTitle') }}</text>
        <text class="campus-guide__desc">{{ t('campus.hub.guideDesc') }}</text>
      </view>
      <view
        v-if="!isVerified"
        class="campus-guide__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('campus.hub.goCertify')"
        @tap="goCertification"
      >
        <text class="campus-guide__btn-text">{{ isPending ? t('campus.hub.viewProgress') : t('campus.hub.goCertify') }}</text>
      </view>
      <view v-else class="campus-guide__badge">
        <text class="campus-guide__badge-text">{{ t('campus.hub.certified') }}</text>
      </view>
    </view>

    <!-- 校园列表 -->
    <view class="campus-hub__section">
      <text class="campus-hub__section-title">{{ t('campus.hub.schoolListTitle') }}</text>
      <text class="campus-hub__section-desc">{{ t('campus.hub.schoolListDesc') }}</text>
      <view
        v-for="school in schools"
        :key="school.id"
        class="campus-school press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="school.name"
        @tap="goSchool(school.name)"
      >
        <view class="campus-school__icon">
          <image class="campus-school__icon-img" :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG" mode="aspectFit" alt="" />
        </view>
        <view class="campus-school__body">
          <text class="campus-school__name">{{ school.name }}</text>
          <text class="campus-school__city">{{ school.city ?? '' }}</text>
        </view>
        <view class="campus-school__status" :class="`campus-school__status--${schoolStatus(school.name)}`">
          <text class="campus-school__status-text">{{ statusText(school.name) }}</text>
        </view>
        <text class="campus-school__arrow">›</text>
      </view>
    </view>

    <!-- 校园圈推荐 -->
    <view class="campus-hub__section">
      <text class="campus-hub__section-title">{{ t('campus.hub.recommendTitle') }}</text>
      <text class="campus-hub__section-desc">{{ t('campus.hub.recommendDesc') }}</text>
      <view
        v-for="school in schools.slice(0, 3)"
        :key="`rec-${school.id}`"
        class="campus-reco press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="school.name"
        @tap="goSchool(school.name)"
      >
        <view class="campus-reco__icon">
          <image class="campus-reco__icon-img" :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG" mode="aspectFit" alt="" />
        </view>
        <view class="campus-reco__body">
          <text class="campus-reco__name">{{ school.name }}</text>
          <text class="campus-reco__desc">{{ t('campus.hub.recommendDesc') }}</text>
        </view>
        <view class="campus-reco__cta">
          <text class="campus-reco__cta-text">{{ statusText(school.name) }}</text>
        </view>
      </view>
    </view>

    <view class="campus-hub__footer" />
  </view>
</template>

<style scoped lang="scss">
.campus-hub {
  min-height: 100%;
  background: var(--c-bg-page, #F7FAF9);
  padding: calc(env(safe-area-inset-top) + 20rpx) 32rpx 0;
  box-sizing: border-box;
}

.campus-hub__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.campus-hub__back {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container, #ffffff);
  border: 1rpx solid var(--c-line, #ECEFF2);
}

.campus-hub__back-text {
  font-size: 40rpx;
  color: var(--c-text-primary, #222222);
  line-height: 1;
}

.campus-hub__title {
  font-size: 32rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.campus-hub__spacer {
  width: 64rpx;
}

.campus-guide {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx;
  border-radius: 22rpx;
  background: linear-gradient(135deg, #EAF8F2 0%, #FFFFFF 100%);
  border: 1rpx solid var(--c-line, #ECEFF2);
  margin-bottom: 32rpx;
}

.campus-guide__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-container, #ffffff);
  flex-shrink: 0;
}

.campus-guide__icon-img {
  width: 40rpx;
  height: 40rpx;
}

.campus-guide__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.campus-guide__title {
  font-size: 28rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.campus-guide__desc {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.campus-guide__btn {
  flex-shrink: 0;
  padding: 14rpx 28rpx;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, #36C99A 0%, #36C99A 100%);
}

.campus-guide__btn-text {
  font-size: 24rpx;
  font-weight: 700;
  color: #ffffff;
}

.campus-guide__badge {
  flex-shrink: 0;
  padding: 12rpx 24rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-brand-50, #E6F8F1);
}

.campus-guide__badge-text {
  font-size: 24rpx;
  font-weight: 700;
  color: var(--c-brand-600, #36C99A);
}

.campus-hub__section {
  margin-bottom: 32rpx;
}

.campus-hub__section-title {
  display: block;
  font-size: 30rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.campus-hub__section-desc {
  display: block;
  margin-top: 6rpx;
  margin-bottom: 16rpx;
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.campus-school {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: var(--c-bg-container, #ffffff);
  border-radius: 20rpx;
  border: 1rpx solid var(--c-line, #ECEFF2);
}

.campus-school__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-blue-light, #EEF3FF);
  flex-shrink: 0;
}

.campus-school__icon-img {
  width: 40rpx;
  height: 40rpx;
}

.campus-school__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.campus-school__name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.campus-school__city {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.campus-school__status {
  flex-shrink: 0;
  padding: 8rpx 20rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-surface, #F7FAF9);
}

.campus-school__status--own-verified {
  background: var(--c-brand-50, #E6F8F1);
}

.campus-school__status--own-pending {
  background: var(--c-warning-light, #FFF7ED);
}

.campus-school__status-text {
  font-size: 20rpx;
  color: var(--c-text-tertiary, #666666);
}

.campus-school__status--own-verified .campus-school__status-text {
  color: var(--c-brand-600, #36C99A);
}

.campus-school__status--own-pending .campus-school__status-text {
  color: var(--c-warning-600, #C2410C);
}

.campus-school__arrow {
  font-size: 30rpx;
  color: var(--c-text-quaternary, #C8CFCD);
}

.campus-reco {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  background: var(--c-bg-container, #ffffff);
  border-radius: 20rpx;
  border: 1rpx solid var(--c-line, #ECEFF2);
}

.campus-reco__icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-brand-50, #E6F8F1);
  flex-shrink: 0;
}

.campus-reco__icon-img {
  width: 40rpx;
  height: 40rpx;
}

.campus-reco__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.campus-reco__name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

.campus-reco__desc {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.campus-reco__cta {
  flex-shrink: 0;
  padding: 10rpx 24rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-surface, #F7FAF9);
}

.campus-reco__cta-text {
  font-size: 22rpx;
  color: var(--c-text-secondary, #666666);
}

.campus-hub__footer {
  height: 48rpx;
}
</style>
