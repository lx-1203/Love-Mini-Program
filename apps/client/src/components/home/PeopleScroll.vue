<script setup lang="ts">
import { useI18n } from "vue-i18n";
import PersonCard from './PersonCard.vue';

interface Person {
  id: string;
  name?: string;
  initials?: string;
  avatarUrl?: string;
  headline?: string;
  isSameSchool?: boolean;
  isSameMajor?: boolean;
  commonCircleCount?: number;
  hasCompletedProfile?: boolean;
}

defineProps<{
  items?: Person[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  tap: [personId: string];
}>();

const { t } = useI18n();

// 修复（严格模式 noUnusedLocals）：原 `const t = designTokens;` 后未使用 t，
// designTokens 导入也仅用于该别名；模板/style 未引用 designTokens，故导入与别名一并移除。

function getActionText(person: Person) {
  return person.hasCompletedProfile ? t('home.actionChat') : t('home.actionCompleteProfile');
}
</script>

<template>
  <scroll-view scroll-x class="people-scroll" :show-scrollbar="false">
    <view class="people-list" role="list">
      <view v-if="loading" class="people-skeleton" v-for="i in 3" :key="i" role="listitem">
        <view class="skeleton-card shimmer" />
      </view>
      <PersonCard
        v-else
        v-for="person in (items || []).slice(0, 5)"
        :key="person.id"
        :id="person.id"
        :name="person.name"
        :initials="person.initials"
        :avatar-url="person.avatarUrl"
        :headline="person.headline"
        :is-same-school="person.isSameSchool"
        :is-same-major="person.isSameMajor"
        :common-circle-count="person.commonCircleCount"
        :action-text="getActionText(person)"
        @tap="emit('tap', person.id)"
      />
    </view>
  </scroll-view>
</template>

<style scoped>
.people-scroll {
  width: 100%;
}
.people-list {
  display: flex;
  gap: 24rpx;
  padding: 4rpx 32rpx;
}
.people-skeleton {
  min-width: 320rpx;
  flex-shrink: 0;
}
.skeleton-card {
  height: 240rpx;
  border-radius: var(--r-xl);
  background: linear-gradient(90deg, var(--c-neutral-50, #f1f5f9) 25%, var(--c-neutral-200, #e2e8f0) 50%, var(--c-neutral-50, #f1f5f9) 75%);
  background-size: 200% 100%;
  animation: shimmer var(--d-particle, 1500ms) ease-in-out infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
