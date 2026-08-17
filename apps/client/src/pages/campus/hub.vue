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

/** 校园圈展示数据（参考图视觉对齐；后续可由后端 campuses 接口扩展提供） */
const schoolStats: Record<string, { members: string; posts: string; peers: string }> = {
  pku: { members: "3.2k 位同学", posts: "2.8w 条动态", peers: "等 342 位同学" },
  thu: { members: "2.6k 位同学", posts: "2.1w 条动态", peers: "等 256 位同学" },
  ruc: { members: "2.1k 位同学", posts: "9,823 条动态", peers: "等 301 位同学" },
  fudan: { members: "1.8k 位同学", posts: "1.5w 条动态", peers: "等 210 位同学" },
  sjtu: { members: "2.4k 位同学", posts: "1.9w 条动态", peers: "等 278 位同学" },
  tongji: { members: "1.7k 位同学", posts: "1.3w 条动态", peers: "等 194 位同学" },
  zju: { members: "1.4k 位同学", posts: "1.1w 条动态", peers: "等 163 位同学" },
};

function statsOf(school: { id: string }): { members: string; posts: string; peers: string } {
  return schoolStats[school.id] || { members: "1.0k 位同学", posts: "8,000 条动态", peers: "等 120 位同学" };
}

/** 我加入的（本校已认证） */
const joinedSchools = computed(() => schools.filter((sc) => sc.name === ownSchool.value));
/** 推荐圈子（其他学校） */
const recommendedSchools = computed(() => schools.filter((sc) => sc.name !== ownSchool.value));

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
      <view class="campus-hub__title-col">
        <text class="campus-hub__title">{{ t('campusHub.title') }}</text>
        <text class="campus-hub__subtitle">{{ t('campusHub.subtitle') }}</text>
      </view>
      <view
        v-if="!isVerified"
        class="campus-hub__cert-btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('campusHub.goCertify')"
        @tap="goCertification"
      >
        <text class="campus-hub__cert-btn-text">{{ t('campusHub.goCertify') }}</text>
      </view>
      <view v-else class="campus-hub__cert-badge">
        <text class="campus-hub__cert-badge-text">{{ t('campusHub.certified') }}</text>
      </view>
    </view>

    <!-- 加入引导 -->
    <view class="campus-guide card-base">
      <view class="campus-guide__icon">
        <image class="campus-guide__icon-img" :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG" mode="aspectFit" alt="" />
      </view>
      <view class="campus-guide__body">
        <text class="campus-guide__title">{{ t('campusHub.guideTitle') }}</text>
        <text class="campus-guide__desc">{{ t('campusHub.guideDesc') }}</text>
      </view>
      <view
        v-if="!isVerified"
        class="campus-guide__btn press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('campusHub.goCertify')"
        @tap="goCertification"
      >
        <text class="campus-guide__btn-text">{{ isPending ? t('campusHub.viewProgress') : t('campusHub.goCertify') }}</text>
      </view>
      <view v-else class="campus-guide__badge">
        <text class="campus-guide__badge-text">{{ t('campusHub.certified') }}</text>
      </view>
    </view>

    <!-- 我加入的 -->
    <view v-if="joinedSchools.length > 0" class="campus-hub__section">
      <text class="campus-hub__section-title">{{ t('campusHub.joinedTitle') }}</text>
      <view
        v-for="school in joinedSchools"
        :key="school.id"
        class="campus-school-card press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="school.name"
        @tap="goSchool(school.name)"
      >
        <view class="campus-school-card__thumb">
          <image class="campus-school-card__thumb-img" :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG" mode="aspectFill" alt="" />
        </view>
        <view class="campus-school-card__body">
          <view class="campus-school-card__name-row">
            <text class="campus-school-card__name">{{ school.name }}</text>
            <view class="campus-school-card__badge" :class="'campus-school-card__badge--' + (isVerified ? 'verified' : 'pending')">
              <text class="campus-school-card__badge-text">{{ isVerified ? t('campusHub.certified') : t('campusHub.statusPending') }}</text>
            </view>
          </view>
          <text class="campus-school-card__stats">{{ statsOf(school).members }} · {{ statsOf(school).posts }}</text>
          <text class="campus-school-card__peers">{{ statsOf(school).peers }}</text>
        </view>
        <view class="campus-school-card__cta">
          <text class="campus-school-card__cta-text">{{ t('campusHub.enter') }}</text>
        </view>
      </view>
    </view>

    <!-- 推荐圈子 -->
    <view class="campus-hub__section">
      <text class="campus-hub__section-title">{{ t('campusHub.recommendTitle2') }}</text>
      <view
        v-for="school in recommendedSchools"
        :key="'rec-' + school.id"
        class="campus-school-card press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="school.name"
        @tap="goSchool(school.name)"
      >
        <view class="campus-school-card__thumb">
          <image class="campus-school-card__thumb-img" :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG" mode="aspectFill" alt="" />
        </view>
        <view class="campus-school-card__body">
          <view class="campus-school-card__name-row">
            <text class="campus-school-card__name">{{ school.name }}</text>
            <view class="campus-school-card__badge campus-school-card__badge--plain">
              <text class="campus-school-card__badge-text">{{ t('campusHub.unverified') }}</text>
            </view>
          </view>
          <text class="campus-school-card__stats">{{ statsOf(school).members }} · {{ statsOf(school).posts }}</text>
          <text class="campus-school-card__peers">{{ statsOf(school).peers }}</text>
        </view>
        <view class="campus-school-card__cta">
          <text class="campus-school-card__cta-text">{{ t('campusHub.join') }}</text>
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

.campus-hub__title-col {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4rpx;
}

.campus-hub__subtitle {
  font-size: 24rpx;
  font-weight: 400;
  color: #8A9694;
}

.campus-hub__cert-btn {
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #36C99A;
  box-shadow: 0 6rpx 16rpx rgba(54, 201, 154, 0.32);
}

.campus-hub__cert-btn-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #ffffff;
}

.campus-hub__cert-badge {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: #E8FAF3;
}

.campus-hub__cert-badge-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #36C99A;
}

.campus-school-card {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-top: 20rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 6rpx 24rpx rgba(26, 55, 48, 0.08);
}

.campus-school-card__thumb {
  width: 112rpx;
  height: 112rpx;
  border-radius: 20rpx;
  overflow: hidden;
  background: #E8FAF3;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.campus-school-card__thumb-img {
  width: 64rpx;
  height: 64rpx;
}

.campus-school-card__body {
  flex: 1;
  min-width: 0;
}

.campus-school-card__name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.campus-school-card__name {
  font-size: 30rpx;
  font-weight: 700;
  color: #222222;
}

.campus-school-card__badge {
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}

.campus-school-card__badge--verified {
  background: #E8FAF3;
}

.campus-school-card__badge--verified .campus-school-card__badge-text {
  color: #36C99A;
}

.campus-school-card__badge--pending {
  background: #FFF4E5;
}

.campus-school-card__badge--pending .campus-school-card__badge-text {
  color: #FF9A57;
}

.campus-school-card__badge--plain {
  background: #F2F4F3;
}

.campus-school-card__badge--plain .campus-school-card__badge-text {
  color: #8A9694;
}

.campus-school-card__badge-text {
  font-size: 20rpx;
  font-weight: 600;
}

.campus-school-card__stats {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #4A524E;
}

.campus-school-card__peers {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #9AA39F;
}

.campus-school-card__cta {
  flex-shrink: 0;
  padding: 12rpx 26rpx;
  border-radius: 999rpx;
  background: #36C99A;
}

.campus-school-card__cta-text {
  font-size: 24rpx;
  font-weight: 600;
  color: #ffffff;
}

</style>
