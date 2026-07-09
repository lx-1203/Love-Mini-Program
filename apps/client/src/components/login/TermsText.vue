<script setup lang="ts">
import { designTokens } from '../../theme/tokens';

const t = designTokens;
</script>

<template>
  <view class="terms">
    <text class="terms-text">登录即代表您同意</text>
    <text class="terms-link">《用户协议》</text>
    <text class="terms-text">和</text>
    <text class="terms-link">《隐私政策》</text>
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
  font-size: v-bind('`${t.typography.size.caption}rpx`');
  color: rgba(255,255,255,0.5);
}
.terms-link {
  font-size: v-bind('`${t.typography.size.caption}rpx`');
  color: rgba(255,255,255,0.7);
  text-decoration: underline;
}
</style>
