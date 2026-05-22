<script setup lang="ts">
import { onShow } from "@dcloudio/uni-app";
import AppShell from "../../src/components/layout/AppShell.vue";
import SectionCard from "../../src/components/common/SectionCard.vue";
import BottomActionBar from "../../src/components/common/BottomActionBar.vue";
import { usePageAccess } from "../../src/composables/usePageAccess";
import { useActivityStore } from "../../src/stores/activity";
import { openAppPath } from "../../src/utils/navigation";

const activityStore = useActivityStore();

usePageAccess({
  requiresAuth: true,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
});

onShow(() => {
  void activityStore.fetchActivities();
});

/** 报名/取消报名 */
function toggleEnroll(activityId: string) {
  void activityStore.enrollActivity(activityId);
}
</script>

<template>
  <AppShell
    title="线下活动"
    subtitle="从时间清晰、地点明确的小活动开始，把线下见面的压力降下来。"
    :show-tab-bar="false"
  >
    <!-- 加载中 -->
    <view v-if="activityStore.loading" class="status-box">
      <text class="status-text">正在加载活动内容...</text>
    </view>

    <!-- 加载失败 -->
    <view v-else-if="activityStore.errorMessage" class="status-box">
      <text class="status-text status-text--error">{{ activityStore.errorMessage }}</text>
      <button class="retry-btn" @click="activityStore.fetchActivities()">重试</button>
    </view>

    <!-- 暂无活动 -->
    <view v-else-if="!activityStore.activities.length" class="status-box">
      <text class="status-text">暂无活动</text>
    </view>

    <!-- 活动列表 -->
    <view v-else class="activity-list">
      <view
        v-for="item in activityStore.activities"
        :key="item.id"
        class="activity-row"
      >
        <text class="row-title">{{ item.title }}</text>
        <view class="row-detail">
          <view class="row-detail-item">
            <text class="row-icon">📌</text>
            <text class="row-detail-text">{{ item.location }}</text>
          </view>
          <view class="row-detail-item">
            <text class="row-icon">🕐</text>
            <text class="row-detail-text">{{ item.scheduleText }}</text>
          </view>
        </view>
        <button
          class="enroll-btn"
          :class="{ 'enroll-btn--active': item.isEnrolled }"
          @click="toggleEnroll(item.id)"
        >
          {{ item.isEnrolled ? '已感兴趣' : '感兴趣' }}
        </button>
      </view>
    </view>

    <!-- 底部操作栏 -->
    <SectionCard title="下一步" subtitle="看到合适活动后，可以继续去寻觅，也可以提交新的活动提案。">
      <BottomActionBar
        primary-label="去寻觅"
        secondary-label="提交活动提案"
        @primary="openAppPath('/pages/discover/index')"
        @secondary="openAppPath('/subpackages/support/feedback/index')"
      />
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.status-box {
  display: grid;
  place-items: center;
  gap: 16rpx;
  padding: 64rpx 28rpx;
}

.status-text {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

.status-text--error {
  color: var(--td-error-color-6);
}

.retry-btn {
  padding: 14rpx 36rpx;
  border: 1px solid var(--td-border-level-1-color);
  border-radius: 14rpx;
  background: var(--td-bg-color-container);
  font-size: 26rpx;
  color: var(--td-brand-color-7);
}

.activity-list {
  display: grid;
  gap: 16rpx;
}

.activity-row {
  display: grid;
  gap: 12rpx;
  padding: 24rpx;
  border-radius: 20rpx;
  background: var(--td-bg-color-container);
  box-shadow: var(--td-shadow-1);
}

.row-title {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--td-text-color-primary);
}

.row-detail {
  display: grid;
  gap: 4rpx;
}

.row-detail-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.row-icon {
  font-size: 24rpx;
  line-height: 1;
}

.row-detail-text {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
}

.enroll-btn {
  width: 100%;
  height: 64rpx;
  border: 2rpx solid var(--td-border-level-2-color);
  border-radius: 14rpx;
  background: transparent;
  font-size: 24rpx;
  font-weight: 600;
  color: var(--td-text-color-primary);
  margin-top: 4rpx;
}

.enroll-btn--active {
  border-color: var(--td-brand-color-7);
  background: var(--td-brand-color-1);
  color: var(--td-brand-color-7);
}
</style>