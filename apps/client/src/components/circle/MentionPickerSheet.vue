<script setup lang="ts">
/**
 * @提及选择器（2026-10-28）：圈子话题/回复共用。
 * 候选由父页面按圈子拉取（只列同圈成员）；最多选 10 人；确认后父页面插入 @昵称。
 */
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { resolveMediaUrl } from "../../utils/media";

interface MentionCandidate {
  userId: number;
  nickname: string;
  avatarUrl?: string | null;
}

const props = withDefaults(defineProps<{
  visible: boolean;
  candidates: MentionCandidate[];
  loading?: boolean;
  selectedIds?: number[];
  title?: string;
  emptyText?: string;
}>(), {
  loading: false,
  selectedIds: () => [],
  title: "",
  emptyText: "",
});

const emit = defineEmits<{
  (e: "close"): void;
  (e: "confirm", ids: number[]): void;
}>();

const { t } = useI18n();
const selected = ref<number[]>([]);
const MAX_MENTIONS = 10;

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      selected.value = [...(props.selectedIds ?? [])];
    }
  }
);

function toggle(userId: number): void {
  const index = selected.value.indexOf(userId);
  if (index >= 0) {
    selected.value.splice(index, 1);
    return;
  }
  if (selected.value.length >= MAX_MENTIONS) {
    uni.showToast({ title: t("circle.mentionLimit"), icon: "none" });
    return;
  }
  selected.value.push(userId);
}

function confirm(): void {
  emit("confirm", [...selected.value]);
}

function initialOf(name: string): string {
  return name && name.length > 0 ? name.charAt(0) : "?";
}
</script>

<template>
  <view v-if="visible" class="mention-mask" @tap="emit('close')">
    <view class="mention-sheet" @tap.stop>
      <view class="mention-head">
        <text class="mention-title">{{ title || t("circle.mentionTitle") }}</text>
        <text class="mention-count">{{ selected.length }}/{{ MAX_MENTIONS }}</text>
      </view>
      <scroll-view scroll-y class="mention-list">
        <view v-if="loading" class="mention-hint">
          <text class="mention-hint-text">{{ t("common.loading") }}</text>
        </view>
        <view v-else-if="candidates.length === 0" class="mention-hint">
          <text class="mention-hint-text">{{ emptyText || t("circle.mentionEmpty") }}</text>
        </view>
        <template v-else>
          <view
            v-for="item in candidates"
            :key="item.userId"
            class="mention-item"
            :class="{ 'mention-item--selected': selected.includes(item.userId) }"
            @tap="toggle(item.userId)"
          >
            <image
              v-if="item.avatarUrl"
              class="mention-avatar"
              :src="resolveMediaUrl(item.avatarUrl)"
              mode="aspectFill"
            />
            <text v-else class="mention-avatar mention-avatar--char">{{ initialOf(item.nickname) }}</text>
            <text class="mention-name">{{ item.nickname }}</text>
            <text class="mention-check">{{ selected.includes(item.userId) ? "✓" : "" }}</text>
          </view>
        </template>
      </scroll-view>
      <view class="mention-actions">
        <view class="mention-cancel" @tap="emit('close')">
          <text class="mention-cancel-text">{{ t("common.cancel") }}</text>
        </view>
        <view class="mention-confirm" @tap="confirm">
          <text class="mention-confirm-text">{{ t("circle.mentionConfirm") }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.mention-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
}

.mention-sheet {
  width: 100%;
  max-height: 72vh;
  background: #ffffff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 32rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

.mention-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.mention-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--c-text-primary);
}

.mention-count {
  font-size: 24rpx;
  color: var(--c-text-tertiary);
}

.mention-list {
  flex: 1;
  max-height: 50vh;
}

.mention-hint {
  padding: 48rpx 0;
  text-align: center;
}

.mention-hint-text {
  font-size: 26rpx;
  color: var(--c-text-tertiary);
}

.mention-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 20rpx 8rpx;
  border-bottom: 1rpx solid var(--c-border-light);
}

.mention-item--selected {
  background: var(--c-brand-50);
}

.mention-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  flex-shrink: 0;
}

.mention-avatar--char {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-brand-100);
  color: var(--c-brand-700);
  font-size: 28rpx;
}

.mention-name {
  flex: 1;
  font-size: 28rpx;
  color: var(--c-text-primary);
}

.mention-check {
  font-size: 30rpx;
  color: var(--c-brand-600);
}

.mention-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}

.mention-cancel,
.mention-confirm {
  flex: 1;
  padding: 22rpx;
  border-radius: 16rpx;
  text-align: center;
}

.mention-cancel {
  background: var(--c-bg-page);
}

.mention-cancel-text {
  font-size: 28rpx;
  color: var(--c-text-secondary);
}

.mention-confirm {
  background: var(--c-brand-600);
}

.mention-confirm-text {
  font-size: 28rpx;
  color: #ffffff;
  font-weight: 600;
}
</style>
