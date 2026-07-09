<script setup lang="ts">
/**
 * VIP 开通页
 * 展示 VIP 权益 + 套餐选择 + 立即开通
 * mock 模式下套餐数据硬编码
 */
import { ref, computed } from "vue";
import { lightHaptic } from "../../utils/haptic";
import { IMAGE_PATHS } from "../../config/images";

/** 套餐 ID */
type PlanId = "monthly" | "quarterly" | "yearly";

/** 套餐接口 */
interface VipPlan {
  id: PlanId;
  name: string;
  price: number;
  originalPrice?: number;
  period: string;
  perDay?: string;
  badge?: string;
  popular?: boolean;
}

/** VIP 权益项 */
interface VipBenefit {
  /** Emoji 字符（作为 fallback，当 icon 未提供时使用） */
  emoji: string;
  /** SVG 图标路径（优先于 emoji 渲染） */
  icon?: string;
  title: string;
  desc: string;
}

/** 套餐列表 */
const plans = ref<VipPlan[]>([
  {
    id: "monthly",
    name: "月卡",
    price: 18,
    originalPrice: 28,
    period: "30 天",
    perDay: "0.6 元/天",
  },
  {
    id: "quarterly",
    name: "季卡",
    price: 48,
    originalPrice: 84,
    period: "90 天",
    perDay: "0.53 元/天",
    badge: "超值",
    popular: true,
  },
  {
    id: "yearly",
    name: "年卡",
    price: 158,
    originalPrice: 336,
    period: "365 天",
    perDay: "0.43 元/天",
    badge: "最划算",
  },
]);

/** VIP 权益列表 */
const benefits = ref<VipBenefit[]>([
  { emoji: "👀", title: "查看谁喜欢我", desc: "无限次查看喜欢我的用户列表" },
  { emoji: "💝", title: "无限喜欢", desc: "每日喜欢次数无上限" },
  { emoji: "👑", title: "专属标识", desc: "个人主页 VIP 皇冠徽章" },
  { emoji: "🚀", title: "匹配加权", desc: "匹配概率提升 2 倍" },
  { emoji: "🎨", title: "专属主题", desc: "解锁 5 套 VIP 专属主题" },
  { emoji: "", icon: IMAGE_PATHS.ICONS_EMOJI.CHAT, title: "超级喜欢", desc: "每日 3 次超级喜欢机会" },
]);

/** 当前选中的套餐 ID */
const selectedPlanId = ref<PlanId>("quarterly");

/** 当前选中的套餐对象 */
const selectedPlan = computed(() =>
  plans.value.find((p) => p.id === selectedPlanId.value)
);

/** 是否正在处理开通 */
const processing = ref(false);

/** 选择套餐 */
function selectPlan(plan: VipPlan) {
  lightHaptic();
  selectedPlanId.value = plan.id;
}

/** 立即开通 */
function subscribe() {
  lightHaptic();
  if (processing.value) return;

  processing.value = true;
  uni.showLoading({ title: "处理中..." });

  setTimeout(() => {
    processing.value = false;
    uni.hideLoading();
    uni.showModal({
      title: "开通成功",
      content: `已成功开通 VIP ${selectedPlan.value?.name}\n有效期：${selectedPlan.value?.period}\n\n（mock 模式演示，未实际支付）`,
      showCancel: false,
      confirmText: "知道了",
      success: () => {
        uni.navigateBack({ delta: 1 });
      },
    });
  }, 1200);
}

/** 查看权益详情 */
function viewBenefitDetail(benefit: VipBenefit) {
  lightHaptic();
  uni.showModal({
    title: benefit.title,
    content: benefit.desc,
    showCancel: false,
    confirmText: "知道了",
  });
}

/** 返回上一页 */
function goBack() {
  lightHaptic();
  uni.navigateBack({ delta: 1 });
}
</script>

<template>
  <view class="vip-page page-fade-in">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-bar__back press-feedback" @tap="goBack" hover-class="nav-bar__back--hover" hover-stay-time="100">
        <text class="nav-bar__back-icon">‹</text>
      </view>
      <text class="nav-bar__title">开通 VIP</text>
      <view class="nav-bar__placeholder" />
    </view>

    <!-- 顶部安全区占位 -->
    <view class="safe-top" />

    <!-- VIP 头部卡片 -->
    <view class="vip-header">
      <view class="vip-header__crown">
        <text class="vip-header__crown-emoji">👑</text>
      </view>
      <text class="vip-header__title">校园恋爱 VIP</text>
      <text class="vip-header__subtitle">解锁专属权益 · 遇见更多可能</text>
    </view>

    <!-- 权益列表 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">VIP 专属权益</text>
      </view>
      <view class="benefits-grid">
        <view
          v-for="(item, index) in benefits"
          :key="index"
          class="benefit-item press-feedback"
          @tap="viewBenefitDetail(item)"
          hover-class="benefit-item--hover"
          hover-stay-time="100"
        >
          <view class="benefit-item__icon">
            <image
              v-if="item.icon"
              class="benefit-item__icon-img"
              :src="item.icon"
              mode="aspectFit"
            />
            <text v-else class="benefit-item__emoji">{{ item.emoji }}</text>
          </view>
          <view class="benefit-item__content">
            <text class="benefit-item__title">{{ item.title }}</text>
            <text class="benefit-item__desc">{{ item.desc }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 套餐选择 -->
    <view class="section">
      <view class="section__title">
        <text class="section__title-text">选择套餐</text>
      </view>
      <view class="plans-grid">
        <view
          v-for="plan in plans"
          :key="plan.id"
          class="plan-card press-feedback"
          :class="{
            'plan-card--selected': plan.id === selectedPlanId,
            'plan-card--popular': plan.popular,
          }"
          @tap="selectPlan(plan)"
          hover-class="plan-card--hover"
          hover-stay-time="100"
        >
          <!-- 角标 -->
          <view v-if="plan.badge" class="plan-card__badge">
            <text class="plan-card__badge-text">{{ plan.badge }}</text>
          </view>

          <!-- 选中标记 -->
          <view v-if="plan.id === selectedPlanId" class="plan-card__check">
            <text class="plan-card__check-icon">✓</text>
          </view>

          <!-- 套餐名称 -->
          <text class="plan-card__name">{{ plan.name }}</text>

          <!-- 价格 -->
          <view class="plan-card__price-row">
            <text class="plan-card__currency">¥</text>
            <text class="plan-card__price">{{ plan.price }}</text>
          </view>

          <!-- 原价（划线） -->
          <text v-if="plan.originalPrice" class="plan-card__original-price">¥{{ plan.originalPrice }}</text>

          <!-- 周期 -->
          <text class="plan-card__period">{{ plan.period }}</text>

          <!-- 每日均价 -->
          <text v-if="plan.perDay" class="plan-card__per-day">{{ plan.perDay }}</text>
        </view>
      </view>
    </view>

    <!-- 用户协议 -->
    <view class="agreement">
      <text class="agreement__text">开通即表示同意</text>
      <text class="agreement__link">《VIP 服务协议》</text>
      <text class="agreement__text">·</text>
      <text class="agreement__link">《自动续费协议》</text>
    </view>

    <!-- 底部开通按钮（固定） -->
    <view class="footer">
      <view class="footer__price-row">
        <text class="footer__label">应付：</text>
        <text class="footer__currency">¥</text>
        <text class="footer__price">{{ selectedPlan?.price }}</text>
        <text v-if="selectedPlan?.originalPrice" class="footer__original-price">¥{{ selectedPlan?.originalPrice }}</text>
      </view>
      <view
        class="footer__btn press-feedback"
        :class="{ 'footer__btn--disabled': processing }"
        @tap="subscribe"
        hover-class="footer__btn--hover"
        hover-stay-time="100"
      >
        <text class="footer__btn-text">{{ processing ? '处理中...' : '立即开通' }}</text>
      </view>
    </view>

    <!-- 底部安全区占位 -->
    <view class="safe-bottom" />
  </view>
</template>

<style scoped lang="scss">
/* ==================== 页面容器 ==================== */
.vip-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  box-sizing: border-box;
  position: relative;
  padding-bottom: 200rpx;
}

/* ==================== 顶部导航栏 ==================== */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
  height: 88rpx;
  background: transparent;
  position: relative;
  z-index: 1;
}

.nav-bar__back {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;

  &--hover {
    background: rgba(255, 255, 255, 0.1);
    transform: scale(0.94);
  }
}

.nav-bar__back-icon {
  font-size: 56rpx;
  color: #FFFFFF;
  font-weight: 300;
  line-height: 1;
}

.nav-bar__title {
  font-size: 32rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.nav-bar__placeholder {
  width: 64rpx;
  height: 64rpx;
}

/* ==================== 安全区占位 ==================== */
.safe-top {
  height: calc(constant(safe-area-inset-top) + 0rpx);
  height: calc(env(safe-area-inset-top) + 0rpx);
  flex-shrink: 0;
}

.safe-bottom {
  height: calc(constant(safe-area-inset-bottom) + 0rpx);
  height: calc(env(safe-area-inset-bottom) + 0rpx);
  flex-shrink: 0;
}

/* ==================== VIP 头部 ==================== */
.vip-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 32rpx 48rpx;
  position: relative;
  z-index: 1;
}

.vip-header__crown {
  width: 144rpx;
  height: 144rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 32rpx rgba(255, 215, 0, 0.4);
}

.vip-header__crown-emoji {
  font-size: 72rpx;
  line-height: 1;
}

.vip-header__title {
  font-size: 44rpx;
  font-weight: 800;
  color: #FFD700;
  margin-bottom: 8rpx;
  letter-spacing: 2rpx;
}

.vip-header__subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* ==================== 分组 ==================== */
.section {
  position: relative;
  z-index: 1;
  margin: 24rpx 24rpx 0;
}

.section__title {
  padding: 0 12rpx 12rpx;
}

.section__title-text {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  font-weight: 600;
}

/* ==================== 权益网格 ==================== */
.benefits-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.benefit-item {
  flex: 1 1 calc(50% - 8rpx);
  min-width: 280rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1rpx solid rgba(255, 215, 0, 0.2);
  border-radius: 20rpx;
  padding: 20rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
  transition: all 0.15s ease;

  &--hover {
    transform: scale(0.98);
    background: rgba(255, 215, 0, 0.1);
  }
}

.benefit-item__icon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.benefit-item__emoji {
  font-size: 28rpx;
}

.benefit-item__icon-img {
  width: 32rpx;
  height: 32rpx;
  /* SVG 使用 currentColor，与 VIP 金色主题对齐 */
  color: #FFD700;
}

.benefit-item__content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}

.benefit-item__title {
  font-size: 26rpx;
  font-weight: 600;
  color: #FFD700;
}

.benefit-item__desc {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ==================== 套餐网格 ==================== */
.plans-grid {
  display: flex;
  gap: 16rpx;
}

.plan-card {
  flex: 1;
  position: relative;
  background: rgba(255, 255, 255, 0.08);
  border: 2rpx solid rgba(255, 255, 255, 0.1);
  border-radius: 20rpx;
  padding: 32rpx 16rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  transition: all 0.2s ease;

  &--hover {
    transform: scale(0.97);
  }

  &--selected {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.18) 0%, rgba(255, 165, 0, 0.08) 100%);
    border-color: #FFD700;
    box-shadow: 0 4rpx 16rpx rgba(255, 215, 0, 0.25);
  }

  &--popular {
    border-color: rgba(255, 215, 0, 0.5);
  }
}

.plan-card__badge {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  padding: 4rpx 16rpx;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border-radius: 0 0 12rpx 12rpx;
  box-shadow: 0 2rpx 8rpx rgba(255, 165, 0, 0.3);
}

.plan-card__badge-text {
  font-size: 20rpx;
  color: #5D4E37;
  font-weight: 700;
}

.plan-card__check {
  position: absolute;
  top: 12rpx;
  right: 12rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: #FFD700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plan-card__check-icon {
  font-size: 20rpx;
  color: #5D4E37;
  font-weight: 700;
  line-height: 1;
}

.plan-card__name {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.plan-card__price-row {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
  margin-top: 4rpx;
}

.plan-card__currency {
  font-size: 22rpx;
  color: #FFD700;
  font-weight: 600;
}

.plan-card__price {
  font-size: 48rpx;
  color: #FFD700;
  font-weight: 800;
  line-height: 1;
}

.plan-card__original-price {
  font-size: 20rpx;
  color: rgba(255, 255, 255, 0.4);
  text-decoration: line-through;
}

.plan-card__period {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4rpx;
}

.plan-card__per-day {
  font-size: 20rpx;
  color: rgba(255, 215, 0, 0.8);
  margin-top: 2rpx;
}

/* ==================== 用户协议 ==================== */
.agreement {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  padding: 32rpx 24rpx 16rpx;
  position: relative;
  z-index: 1;
  gap: 4rpx;
}

.agreement__text {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.5);
}

.agreement__link {
  font-size: 22rpx;
  color: #FFD700;
}

/* ==================== 底部固定按钮 ==================== */
.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: rgba(26, 26, 46, 0.95);
  border-top: 1rpx solid rgba(255, 215, 0, 0.2);
  z-index: 10;
}

.footer__price-row {
  display: flex;
  align-items: baseline;
  gap: 2rpx;
}

.footer__label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.footer__currency {
  font-size: 24rpx;
  color: #FFD700;
  font-weight: 600;
}

.footer__price {
  font-size: 44rpx;
  color: #FFD700;
  font-weight: 800;
  line-height: 1;
}

.footer__original-price {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.4);
  text-decoration: line-through;
  margin-left: 8rpx;
}

.footer__btn {
  padding: 24rpx 56rpx;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border-radius: 999rpx;
  box-shadow: 0 4rpx 16rpx rgba(255, 165, 0, 0.4);
  transition: all 0.15s ease;

  &--hover {
    transform: scale(0.96);
    box-shadow: 0 2rpx 8rpx rgba(255, 165, 0, 0.3);
  }

  &--disabled {
    opacity: 0.6;
  }
}

.footer__btn-text {
  font-size: 30rpx;
  color: #5D4E37;
  font-weight: 700;
}
</style>
