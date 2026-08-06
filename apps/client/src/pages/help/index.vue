<script setup lang="ts">
/**
 * 帮助与客服页（Phase Feedback5 P2.6）
 *
 * 功能：
 * - 常见问题 FAQ（可展开折叠）
 * - 客服入口：在线客服（官方号恋爱助手会话）/ 意见反馈
 * - 客服联系方式（复制邮箱）
 */
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import AppShell from "../../components/layout/AppShell.vue";
import SectionCard from "../../components/common/SectionCard.vue";
import { IMAGE_PATHS } from "../../config/images";
import { lightHaptic } from "../../utils/haptic";
import { openAppPath } from "../../utils/navigation";
import { ROUTES } from "../../constants/routes";
import { usePageAccess } from "../../composables/usePageAccess";
import { chatPageRequirements } from "../../config/page-access";

/** 帮助页访问要求（复用聊天页要求，需登录） */
usePageAccess(chatPageRequirements);

const { t } = useI18n();

/** 当前展开的 FAQ 索引（null 表示全部收起） */
const expandedIndex = ref<number | null>(null);

/** 常见问题列表（i18n 文案键） */
const faqItems = [
  { q: "help.faqVerifyQ", a: "help.faqVerifyA" },
  { q: "help.faqCoinsQ", a: "help.faqCoinsA" },
  { q: "help.faqUnlockQ", a: "help.faqUnlockA" },
  { q: "help.faqVoiceQ", a: "help.faqVoiceA" },
  { q: "help.faqReportQ", a: "help.faqReportA" },
  { q: "help.faqVipQ", a: "help.faqVipA" },
] as const;

/** 展开/折叠 FAQ 项 */
function toggleFaq(index: number): void {
  lightHaptic();
  expandedIndex.value = expandedIndex.value === index ? null : index;
}

/** 在线客服：跳转官方号「恋爱助手」会话 */
function goOnlineService(): void {
  lightHaptic();
  openAppPath("/pages/official-chat/index?accountId=official-assistant");
}

/** 意见反馈：跳转反馈历史页（含提交通道） */
function goFeedback(): void {
  lightHaptic();
  openAppPath(ROUTES.FEEDBACK_HISTORY);
}

/** 复制客服邮箱到剪贴板 */
function copyEmail(): void {
  lightHaptic();
  uni.setClipboardData({
    data: t("help.contactEmail"),
    success: () => {
      uni.showToast({ title: t("help.emailCopied"), icon: "success" });
    },
  });
}
</script>

<template>
  <AppShell :title="t('help.navTitle')" :subtitle="t('help.subtitle')" show-back>
    <!-- 常见问题 -->
    <SectionCard :title="t('help.faqTitle')" compact>
      <view class="help-faq" role="list">
        <view
          v-for="(item, idx) in faqItems"
          :key="item.q"
          class="help-faq__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-expanded="expandedIndex === idx"
          :aria-label="t(item.q)"
          @tap="toggleFaq(idx)"
        >
          <view class="help-faq__question">
            <text class="help-faq__question-text">{{ t(item.q) }}</text>
            <text class="help-faq__chevron" :class="{ 'help-faq__chevron--open': expandedIndex === idx }">›</text>
          </view>
          <view v-if="expandedIndex === idx" class="help-faq__answer">
            <text class="help-faq__answer-text">{{ t(item.a) }}</text>
          </view>
        </view>
      </view>
    </SectionCard>

    <!-- 联系客服 -->
    <SectionCard :title="t('help.contactTitle')" compact>
      <view class="help-contact">
        <view
          class="help-contact__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('help.onlineService')"
          @tap="goOnlineService"
        >
          <view class="help-contact__icon-wrap" :style="{ background: 'var(--c-tint-pink-soft, #FFF0F5)' }">
            <image class="help-contact__icon" :src="IMAGE_PATHS.ICONS_EMOJI.CHAT" mode="aspectFit" alt="" />
          </view>
          <view class="help-contact__info">
            <text class="help-contact__label">{{ t('help.onlineService') }}</text>
            <text class="help-contact__desc">{{ t('help.onlineServiceDesc') }}</text>
          </view>
          <text class="help-contact__arrow">›</text>
        </view>

        <view
          class="help-contact__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('help.feedbackEntry')"
          @tap="goFeedback"
        >
          <view class="help-contact__icon-wrap" :style="{ background: 'var(--c-tint-blue-soft, #E8F4FF)' }">
            <image class="help-contact__icon" :src="IMAGE_PATHS.ICONS_EMOJI.CLIPBOARD" mode="aspectFit" alt="" />
          </view>
          <view class="help-contact__info">
            <text class="help-contact__label">{{ t('help.feedbackEntry') }}</text>
            <text class="help-contact__desc">{{ t('help.feedbackDesc') }}</text>
          </view>
          <text class="help-contact__arrow">›</text>
        </view>

        <view
          class="help-contact__item press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('help.contactEmail')"
          @tap="copyEmail"
        >
          <view class="help-contact__icon-wrap" :style="{ background: 'var(--c-tint-green-soft, #E8F8F0)' }">
            <image class="help-contact__icon" :src="IMAGE_PATHS.ICONS_EMOJI.MAIL" mode="aspectFit" alt="" />
          </view>
          <view class="help-contact__info">
            <text class="help-contact__label">{{ t('help.contactEmail') }}</text>
            <text class="help-contact__desc">{{ t('help.serviceHours') }}</text>
          </view>
          <text class="help-contact__copy">{{ t('help.copy') }}</text>
        </view>
      </view>
    </SectionCard>

    <!-- 服务说明 -->
    <view class="help-footer">
      <text class="help-footer__text">{{ t('help.footerTip') }}</text>
    </view>
  </AppShell>
</template>

<style lang="scss" scoped>
.help-faq {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.help-faq__item {
  background: var(--c-neutral-0);
  border-radius: var(--r-md);
  padding: 24rpx 28rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.help-faq__question {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.help-faq__question-text {
  font-size: var(--f-md);
  font-weight: 600;
  color: var(--c-text-primary);
  flex: 1;
}

.help-faq__chevron {
  font-size: var(--f-lg);
  color: var(--c-text-tertiary);
  transform: rotate(90deg);
  transition: transform 0.2s ease;
}

.help-faq__chevron--open {
  transform: rotate(270deg);
}

.help-faq__answer {
  padding-top: 8rpx;
  border-top: 1rpx solid var(--c-border, #eef0f4);
}

.help-faq__answer-text {
  font-size: var(--f-sm);
  color: var(--c-text-secondary);
  line-height: 1.7;
}

.help-contact {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
}

.help-contact__item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx 8rpx;
  border-radius: var(--r-md);
}

.help-contact__icon-wrap {
  width: 80rpx;
  height: 80rpx;
  border-radius: var(--r-full);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.help-contact__icon {
  width: 40rpx;
  height: 40rpx;
}

.help-contact__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  min-width: 0;
}

.help-contact__label {
  font-size: var(--f-md);
  font-weight: 600;
  color: var(--c-text-primary);
}

.help-contact__desc {
  font-size: var(--f-xs);
  color: var(--c-text-tertiary);
}

.help-contact__arrow {
  font-size: var(--f-lg);
  color: var(--c-text-tertiary);
}

.help-contact__copy {
  font-size: var(--f-xs);
  color: var(--c-brand-600);
  background: var(--c-tint-brand, #E8F8F0);
  padding: 8rpx 20rpx;
  border-radius: var(--r-full);
}

.help-footer {
  padding: 32rpx 24rpx 16rpx;
  display: flex;
  justify-content: center;
}

.help-footer__text {
  font-size: var(--f-xs);
  color: var(--c-text-tertiary);
  text-align: center;
  line-height: 1.6;
}
</style>
