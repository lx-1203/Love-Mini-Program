<script setup lang="ts">
import { useI18n } from "vue-i18n";

withDefaults(
  defineProps<{
    active: "all" | "nearby";
  }>(),
  { active: "all" }
);

const emit = defineEmits<{
  (e: "change", scope: "all" | "nearby"): void;
}>();

const { t } = useI18n();

const tabs = [
  { key: "all", label: () => t("discover.recommend") },
  { key: "nearby", label: () => t("discover.nearby") },
] as const;
</script>

<template>
  <view class="match-scope-tabs">
    <view
      v-for="tab in tabs"
      :key="tab.key"
      class="match-scope-tabs__item"
      :class="{ 'match-scope-tabs__item--active': active === tab.key }"
      role="button"
      :aria-label="tab.label()"
      @tap="emit('change', tab.key)"
    >
      <text class="match-scope-tabs__text">{{ tab.label() }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.match-scope-tabs {
  display: inline-flex;
  padding: 6rpx;
  border-radius: 999rpx;
  background: #eaf3ef;
}

.match-scope-tabs__item {
  padding: 12rpx 32rpx;
  border-radius: 999rpx;
}

.match-scope-tabs__item--active {
  background: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(30, 80, 65, 0.08);
}

.match-scope-tabs__text {
  font-size: 26rpx;
  color: #5f6f6b;
  font-weight: 600;
}

.match-scope-tabs__item--active .match-scope-tabs__text {
  color: #36C99A;
}
</style>