<script setup lang="ts">
/**
 * 权限设置 - 同校推荐开关（Phase Feedback5）
 *
 * - allowSameSchoolRecommend：是否把自己的信息推荐给本校学生（默认关）
 * - receiveSameSchoolInfo：是否接收同校学生的信息（默认开）
 *
 * 注意：允许"接收同校信息"但默认不"推荐给本校"，
 * 符合反馈"是自己的信息推给别人，但可以收到同校的信息，尤其重要"。
 */
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useProfileStore } from "../../../stores/profile";
import { designTokens } from "../../../theme/tokens";
// infra R2-00084: 路由路径常量化
import { ROUTES } from "../../../constants/routes";
// 2026-09-04 视觉验收：statusBarHeight 注入，var(--statusbar, env(safe-area-inset-top)) 模拟器为 0 会压刘海
import { useStatusBarHeight } from "../../../composables/useStatusBarHeight";

const { t } = useI18n();
const statusBarHeightPx = useStatusBarHeight();
const profileStore = useProfileStore();

/** 是否允许推荐给本校学生 */
const allowRecommend = computed({
  get: () => profileStore.allowSameSchoolRecommend,
  set: (val: boolean) => {
    profileStore.setAllowSameSchoolRecommend(val);
    // MP-R1-PRIVACY-001：开关当前仅本机持久化（后端偏好接口未接入，服务端推荐行为
    // 暂不受开关控制）——文案如实说明「已在本机保存」，不强化「已同步」假象
    uni.showToast({ title: t("profile.privacySavedLocal"), icon: "none" });
  },
});

/** 是否接收同校信息 */
const receiveInfo = computed({
  get: () => profileStore.receiveSameSchoolInfo,
  set: (val: boolean) => {
    profileStore.setReceiveSameSchoolInfo(val);
    // MP-R1-PRIVACY-001：同上，如实文案
    uni.showToast({ title: t("profile.privacySavedLocal"), icon: "none" });
  },
});

/** switch change 事件处理（允许推荐给本校学生） */
function onAllowRecommendChange(e: Event) {
  const detail = (e as unknown as { detail?: { value?: boolean } }).detail;
  allowRecommend.value = !!detail?.value;
}

/** switch change 事件处理（接收同校信息） */
function onReceiveInfoChange(e: Event) {
  const detail = (e as unknown as { detail?: { value?: boolean } }).detail;
  receiveInfo.value = !!detail?.value;
}

/** 返回上一页 */
function goBack() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: ROUTES.TAB.PROFILE }); // infra R2-00084
  }
}
</script>

<template>
  <view class="privacy-page">
    <!-- 顶部栏（statusBarHeight 注入，避免模拟器 env()=0 压刘海） -->
    <view class="privacy-page__header" :style="{ paddingTop: `calc(var(--sp-4) + ${statusBarHeightPx}px)` }">
      <view class="privacy-page__back press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('common.backAria')" @tap="goBack">
        <text class="privacy-page__back-text">‹</text>
      </view>
      <!-- R6-B59/D14（需新建 P2）：页头信息层补上 locale 里早已配好、但全页无消费方的
           副标题 profile.privacyPermissionDesc（zh-CN.ts:1732「控制你的信息展示范围」/
           en-US.ts:1681），未新增任何文案。 -->
      <view class="privacy-page__titles">
        <text class="privacy-page__title">{{ t('profile.privacyPermission') }}</text>
        <text class="privacy-page__subtitle">{{ t('profile.privacyPermissionDesc') }}</text>
      </view>
      <view class="privacy-page__header-spacer" />
    </view>

    <!-- 开关列表 -->
    <view class="privacy-page__section">
      <view class="privacy-item">
        <view class="privacy-item__info">
          <text class="privacy-item__title">{{ t('profile.allowSameSchoolRecommend') }}</text>
          <text class="privacy-item__desc">{{ t('profile.allowSameSchoolRecommendDesc') }}</text>
        </view>
        <switch
          class="privacy-item__switch privacy-item__switch--allow"
          :checked="allowRecommend"
          :color="designTokens.color.brand[500]"
          @change="onAllowRecommendChange"
        />      </view>

      <view class="privacy-item">
        <view class="privacy-item__info">
          <text class="privacy-item__title">{{ t('profile.receiveSameSchoolInfo') }}</text>
          <text class="privacy-item__desc">{{ t('profile.receiveSameSchoolInfoDesc') }}</text>
        </view>
        <switch
          class="privacy-item__switch privacy-item__switch--receive"
          :checked="receiveInfo"
          :color="designTokens.color.brand[500]"
          @change="onReceiveInfoChange"
        />
      </view>
    </view>

    <!-- 底部留白 -->
    <view class="privacy-page__footer-space" />
  </view>
</template>

<style scoped lang="scss">
.privacy-page {
  min-height: 100vh;
  background: var(--c-bg-page, #f4f6fa);
  padding-bottom: env(safe-area-inset-bottom);
}

.privacy-page__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(var(--sp-4) + var(--statusbar, env(safe-area-inset-top))) var(--sp-4) var(--sp-3);
  background: linear-gradient(135deg, var(--c-brand-500, #36C99A) 0%, var(--c-brand-400, #6fe0b0) 100%);
}

/* R6-B59/D13（颜色token P3，2026-10-20）：返回钮圆底原引 --c-overlay-white-bg-tint，
   该令牌真值是 rgba(255,255,255,0.08)（design-variables.scss:914），而这里写的兜底 0.2
   永不生效 ⇒ 实测圆底 #4ACFA4 vs 头图 #3ACA9C 只差 Δ(16,5,8)，"可点圆钮"压成脏印。
   改引同域 other.vue:479 已用的 --c-overlay-bg-light（0.2 档，:739），不改 theme/**、
   不提浓度、不留假兜底。 */
.privacy-page__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-circle, 50%);
  background: var(--c-overlay-bg-light);
}

.privacy-page__back-text {
  font-size: var(--fs-3xl, 40rpx);
  color: var(--c-text-inverse, #ffffff);
  line-height: 1;
}

.privacy-page__titles {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
  min-width: 0;
}

/* R6-B57/D10 同族顺手项：同域三页页头标题原为 44/36/30rpx 三档，按建议统一到 var(--fs-4xl)；
   顺带修掉原 `var(--fs-xl, 34rpx)` 的假兜底（--fs-xl 真值是 30rpx，兜底却写 34rpx）。 */
.privacy-page__title {
  font-size: var(--fs-4xl);
  font-weight: 700;
  color: var(--c-text-inverse, #ffffff);
}

.privacy-page__subtitle {
  font-size: var(--fs-sm);
  color: var(--c-text-inverse, #ffffff);
  opacity: 0.85;
}

.privacy-page__header-spacer {
  width: 64rpx;
}

/* R6-B59/D11（间距 P2，2026-10-20）：卡横向 margin 原取 --sp-4（真值 16rpx），
   实测白卡 x=9..369 ⇒ 左右各 18/16rpx，是同域 location(34rpx)/album(32rpx) 的一半，
   规范 §1.4 页边距是 --page-padding=32rpx ⇒ 横向换成该令牌，纵向保留 --sp-5。 */
.privacy-page__section {
  margin: var(--sp-5) var(--page-padding);
  background: var(--c-bg-container, #ffffff);
  border-radius: var(--r-xl, 24rpx);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
  overflow: hidden;
}

.privacy-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-4);
  padding: var(--sp-5);
  border-bottom: 1rpx solid var(--c-divider-light, #f0f0f0);
}

.privacy-item:last-child {
  border-bottom: none;
}

.privacy-item__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

/* R6-B59/D12（字号 P2，2026-10-20）：设置行主文字原落 --fs-base=24rpx(12px)「标签/时间戳」档、
   说明行 --fs-xs=20rpx(10px)「角标/法务」档（实测字形带高 11px / 9px），列表行主文字按规范
   §1.3 该走 30/28rpx；同时 :188 那条 `var(--fs-xs, 24rpx)` 的兜底 24rpx 与令牌真值 20rpx
   不符（实际渲的是真值），属假兜底 ⇒ 一并去掉。 */
.privacy-item__title {
  font-size: var(--fs-xl);
  font-weight: 600;
  color: var(--c-text-primary, #333A37);
}

.privacy-item__desc {
  font-size: var(--fs-lg);
  color: var(--c-text-tertiary, #9AA39F);
  line-height: 1.5;
}

.privacy-page__footer-space {
  height: 120rpx;
}
</style>
