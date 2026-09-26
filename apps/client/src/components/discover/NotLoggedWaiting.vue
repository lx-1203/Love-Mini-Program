<script setup lang="ts">
/**
 * 未登录等待页（2026-08-25 P0 全面重构）
 *
 * 规格书 12 节要点：
 * - 主标题"正在为你寻找 同频的那个人"（两行）
 * - 副标：静态无计数文案（规格书原文"附近有 12 位同频的你"已判定不落，见下方裁定）
 * - "登录后即可解锁全部功能"
 * - 4 个 icon 行（精确匹配 / 聊天互动 / 校园趣遇 / 关系成长）
 * - 三个按钮：微信一键登录 / 手机号登录 / 稍后再看
 * - 整图为吉祥物+6人围成圈（背景图 IMAGE_PATHS.POSTERS.NOT_LOGGED_WAITING）
 *
 * 缺素材：理想图吉祥物插画（带 6 人围成圈 + 散落爱心）→ 暂用现有 notlogged-waiting.png
 * 全屏可点跳登录；按钮各自处理 goLogin/goPhoneLogin/later。
 *
 * MP-R2VIS-PAGES-MESSAGES-INDEX-002 裁定（2026-09-25 store 接线收口）：
 * 本页副标不设计数位、不加 subtitleWithCount 键，:54 恒渲染 t('notLoggedWaiting.subtitle')。
 * 依据（游客态无任何语义正确的计数真源，详见 .zcode/tmp/subtitle-wire/REPORT.md）：
 *  1) 两个宿主（pages/messages/index.vue:369、subpackages/discover-extra/likes/index.vue:606）
 *     都在 !sessionStore.isLoggedIn 时整页替换成本组件——本页是登录墙，不是可逛列表；
 *  2) discoverStore.cards 初始为空（stores/discover/index.ts:105），fetchCards 的触发点全在
 *     寻觅域（pages/discover/index.vue:190/211、…/discover/history.vue:42、FilterDrawer），
 *     两个宿主无一触发 → 接 cards.length 得到的是恒 0 的计数（比不接更糟）；
 *  3) mock 侧 services/mocks/fixtures.ts:1879 → buildRecommendedPersonsMock 只有固定 9 条
 *     演示人格（id 4001-4009），是演示池规模而非人群规模；且 messages 页在 mock 下根本不渲染本页；
 *  4) real 侧游客确实可调 GET /recommendations（apps/api SecurityConfig.java:133-134 permitAll），
 *     但返回值被 GUEST_LIST_LIMIT=30 截断（RealRecommendationService.java:505-529，注释自陈
 *     "截断到前端卡片展示所需上限"）→ 列表长度是响应体上限而非"附近有 N 人"；游客无定位/无校园，
 *     "附近"语义不成立（RecommendationController.java:298-301 按 distanceText 过滤）；
 *  5) 理想效果图 素材/理想效果图/未登录等待页面.png 自证 12 是拼版值：副标写 12、同一张图围圈
 *     只画 6 个头像；既有裁定 MP-R2-CIRCLES-INDEX-002（subpackages/circles/circles/index.vue:258-266、
 *     :440）口径为"取不到真值就不渲染，宁缺不展示伪造社交证明"，游客引导注册亦为用户既成裁定。
 */
import { useI18n } from "vue-i18n";
import { IMAGE_PATHS } from "../../config/images";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";

const { t } = useI18n();
const emit = defineEmits<{
  (e: "goLogin"): void;
  (e: "goPhoneLogin"): void;
}>();

function goWechatLogin() {
  emit("goLogin");
}

function goPhoneLogin() {
  emit("goPhoneLogin");
}

function goLater() {
  // 稍后再看：返回首页（避免停留在不可交互页）
  openAppPath(ROUTES.TAB.HOME);
}
</script>

<template>
  <view class="not-logged">
    <!-- 整图背景（吉祥物+6 人围圈；缺素材时用现有 notlogged-waiting.png） -->
    <image
      class="not-logged__bg"
      :src="IMAGE_PATHS.POSTERS.NOT_LOGGED_WAITING"
      mode="widthFix"
    />

    <!-- 标题 + 副标 + 解锁提示 + 4 icon + 3 按钮（压底） -->
    <view class="not-logged__overlay">
      <view class="not-logged__title-wrap">
        <text class="not-logged__title">{{ t('notLoggedWaiting.title') }}</text>
        <text class="not-logged__subtitle">{{ t('notLoggedWaiting.subtitle') }}</text>
      </view>

      <view class="not-logged__features">
        <view class="not-logged__feature">
          <image class="not-logged__feature-icon" :src="IMAGE_PATHS.ICONS_V2.SPROUT" mode="aspectFit" alt="" />
          <text class="not-logged__feature-label">{{ t('notLoggedWaiting.feature1') }}</text>
        </view>
        <view class="not-logged__feature">
          <image class="not-logged__feature-icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHAT" mode="aspectFit" alt="" />
          <text class="not-logged__feature-label">{{ t('notLoggedWaiting.feature2') }}</text>
        </view>
        <view class="not-logged__feature">
          <image class="not-logged__feature-icon" :src="IMAGE_PATHS.ICONS_COMMON.SCHOOL_SVG" mode="aspectFit" alt="" />
          <text class="not-logged__feature-label">{{ t('notLoggedWaiting.feature3') }}</text>
        </view>
        <view class="not-logged__feature">
          <image class="not-logged__feature-icon" :src="IMAGE_PATHS.ICONS_COMMON.HEART_FILLED_SVG" mode="aspectFit" alt="" />
          <text class="not-logged__feature-label">{{ t('notLoggedWaiting.feature4') }}</text>
        </view>
      </view>

      <text class="not-logged__hint">{{ t('notLoggedWaiting.unlockHint') }}</text>

      <view class="not-logged__btn-row">
        <view
          class="not-logged__btn not-logged__btn--primary press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('notLoggedWaiting.wechatLogin')"
          @tap="goWechatLogin"
        >
          <image class="not-logged__btn-icon" :src="IMAGE_PATHS.ICONS_V2.WECHAT_GREEN_SVG" mode="aspectFit" alt="" />
          <text class="not-logged__btn-text not-logged__btn-text--primary">{{ t('notLoggedWaiting.wechatLogin') }}</text>
        </view>
        <view
          class="not-logged__btn not-logged__btn--secondary press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('notLoggedWaiting.phoneLogin')"
          @tap="goPhoneLogin"
        >
          <text class="not-logged__btn-text">{{ t('notLoggedWaiting.phoneLogin') }}</text>
        </view>
        <view
          class="not-logged__btn not-logged__btn--ghost press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('notLoggedWaiting.later')"
          @tap="goLater"
        >
          <text class="not-logged__btn-text not-logged__btn-text--ghost">{{ t('notLoggedWaiting.later') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.not-logged {
  position: relative;
  width: 100%;
  min-height: 100vh;
  overflow: hidden;
  background: var(--c-bg-page);
  display: flex;
  flex-direction: column;
  align-items: center;
  box-sizing: border-box;
}

.not-logged__bg {
  display: block;
  width: 100%;
  height: auto;
}

.not-logged__overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 48rpx calc(env(safe-area-inset-bottom) + 60rpx);
}

/* 2026-08-25 P0：主标题/副标（规格书 12.1 / 12.2） */
.not-logged__title-wrap {
  text-align: center;
  margin-bottom: 32rpx;
}

.not-logged__title {
  display: block;
  font-size: 56rpx;
  font-weight: 800;
  color: #36C99A;
  line-height: 1.4;
  letter-spacing: 2rpx;
}

.not-logged__subtitle {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  font-weight: 500;
  color: #1A1E1C;
  opacity: 0.7;
}

/* 2026-08-25 P0：4 个 icon 行（规格书 12.6） */
.not-logged__features {
  display: flex;
  justify-content: space-between;
  width: 100%;
  /* V-05（第五轮 QA）：4 icon 行加左右留白，避免贴屏幕边缘 */
  padding: 0 8rpx;
  margin-bottom: 32rpx;
}

.not-logged__feature {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.not-logged__feature-icon {
  width: 64rpx;
  height: 64rpx;
}

.not-logged__feature-label {
  font-size: 22rpx;
  color: #6B7571;
  text-align: center;
}

/* 2026-08-25 P0：解锁提示（规格书 12.5） */
.not-logged__hint {
  font-size: 22rpx;
  color: #9AA39F;
  margin-bottom: 28rpx;
}

/* 2026-08-25 P0：3 个按钮（规格书 12.7 / 12.8 / 12.9） */
.not-logged__btn-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  /* V-05（第五轮 QA）：3 按钮间距 20→24rpx，视觉分层更清晰 */
  gap: 24rpx;
}

.not-logged__btn {
  width: 100%;
  height: var(--btn-height-md, 96rpx);
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.not-logged__btn--primary {
  background: linear-gradient(135deg, var(--c-brand, #36C99A) 0%, var(--c-brand-600, #2AAE83) 100%);
  box-shadow: 0 8rpx 24rpx rgba(54, 201, 154, 0.32);
}

.not-logged__btn--secondary {
  background: #FFFFFF;
  border: 2rpx solid #36C99A;
}

.not-logged__btn--ghost {
  background: transparent;
  border: none;
}

.not-logged__btn--ghost::before,
.not-logged__btn--ghost::after {
  content: "";
  flex: 1;
  height: 1rpx;
  background: var(--c-divider-light, rgba(15, 23, 42, 0.06));
}

.not-logged__btn-icon {
  width: 32rpx;
  height: 32rpx;
}

.not-logged__btn-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #1A1E1C;
  letter-spacing: 2rpx;
}

.not-logged__btn-text--primary {
  color: #FFFFFF;
}

.not-logged__btn-text--ghost {
  color: #9AA39F;
  font-weight: 500;
}
</style>
