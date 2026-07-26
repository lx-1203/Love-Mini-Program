<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <view
    class="terms"
    role="paragraph"
    :aria-label="t('login.agreedPrefix')"
  >
    <text class="terms-text">{{ t('login.termsAgreePrefix') }}</text>
    <text class="terms-link">{{ t('login.userAgreementLink') }}</text>
    <text class="terms-text">{{ t('login.and') }}</text>
    <text class="terms-link">{{ t('login.privacyPolicyLink') }}</text>
  </view>
</template>

<style scoped>
.terms {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4rpx;
}
.terms-text {
  font-size: var(--fs-sm);
  color: rgba(255,255,255,0.5);
}
.terms-link {
  font-size: var(--fs-sm);
  color: rgba(255,255,255,0.7);
  text-decoration: underline;
}
</style>
