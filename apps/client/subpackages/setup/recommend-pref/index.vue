<script setup lang="ts">
import { onMounted, ref, computed } from "vue";
import AppShell from "../../../src/components/layout/AppShell.vue";
import SectionCard from "../../../src/components/common/SectionCard.vue";
import BottomActionBar from "../../../src/components/common/BottomActionBar.vue";

// ==================== 状态定义 ====================

/** 加载状态 */
const loading = ref(true);
/** 错误状态 */
const error = ref(false);

/** 每日推荐时间 */
const dailyNotifyTime = ref("12:00");
/** 推荐范围 */
const scope = ref<"campus_first" | "city" | "unlimited">("campus_first");
/** 保存中 */
const saving = ref(false);

// ==================== 选项列表 ====================

const timeOptions = [
  { label: "10:00", value: "10:00" },
  { label: "12:00", value: "12:00" },
  { label: "14:00", value: "14:00" },
  { label: "18:00", value: "18:00" },
];

const scopeOptions = [
  { label: "同校优先", value: "campus_first" as const },
  { label: "同城", value: "city" as const },
  { label: "不限", value: "unlimited" as const },
];

// ==================== 数据获取 ====================

/** 模拟获取偏好设置 */
async function fetchPreferences() {
  loading.value = true;
  error.value = false;
  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    // 模拟默认数据
    dailyNotifyTime.value = "12:00";
    scope.value = "campus_first";
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
  }
}

/** 重试获取 */
function retry() {
  fetchPreferences();
}

// ==================== 保存操作 ====================

/** 保存偏好设置 */
async function savePreferences() {
  if (saving.value) return;
  saving.value = true;
  try {
    // 模拟保存 API
    await new Promise<void>((resolve) => setTimeout(resolve, 300));
    uni.showToast({ title: "保存成功", icon: "success" });
  } finally {
    saving.value = false;
  }
}

/** 返回上一页 */
function goBack() {
  uni.navigateBack();
}

// ==================== 生命周期 ====================

onMounted(() => {
  fetchPreferences();
});
</script>

<template>
  <AppShell title="推荐计划" :show-tab-bar="false">
    <!-- 加载状态 -->
    <SectionCard v-if="loading" title="加载中..." compact>
      <view class="loading-container">
        <text class="loading-text">正在获取推荐偏好设置…</text>
      </view>
    </SectionCard>

    <!-- 错误状态 -->
    <SectionCard v-else-if="error" title="加载失败" compact>
      <view class="error-container">
        <text class="error-text">获取偏好设置时出现问题，请重试</text>
        <button class="retry-btn" @click="retry">重新加载</button>
      </view>
    </SectionCard>

    <!-- 正常表单 -->
    <template v-else>
      <!-- 每日推荐时间 -->
      <SectionCard title="每日推荐时间" subtitle="每天在这个时间为你刷新推荐卡片" compact>
        <view class="option-group">
          <view
            v-for="opt in timeOptions"
            :key="opt.value"
            class="option-item"
            :class="{ 'option-item--active': dailyNotifyTime === opt.value }"
            @click="dailyNotifyTime = opt.value"
          >
            <text class="option-label">{{ opt.label }}</text>
          </view>
        </view>
      </SectionCard>

      <!-- 推荐范围 -->
      <SectionCard title="推荐范围" subtitle="优先推荐哪些范围的人" compact>
        <view class="option-group">
          <view
            v-for="opt in scopeOptions"
            :key="opt.value"
            class="option-item"
            :class="{ 'option-item--active': scope === opt.value }"
            @click="scope = opt.value"
          >
            <text class="option-label">{{ opt.label }}</text>
          </view>
        </view>
      </SectionCard>

      <!-- 保存按钮 -->
      <BottomActionBar
        :primary-label="saving ? '保存中…' : '保存'"
        @primary="savePreferences"
      />
    </template>
  </AppShell>
</template>

<style scoped lang="scss">
// ==================== 加载/错误状态 ====================

.loading-container,
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 0;
  gap: 20rpx;
}

.loading-text {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
}

.error-text {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
  text-align: center;
}

.retry-btn {
  height: 72rpx;
  padding: 0 36rpx;
  border: 0;
  border-radius: 18rpx;
  font-size: 26rpx;
  font-weight: 600;
  background: var(--td-brand-color-7);
  color: #fff;
  line-height: 72rpx;
}

// ==================== 选项组 ====================

.option-group {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.option-item {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 120rpx;
  height: 72rpx;
  padding: 0 28rpx;
  border-radius: 18rpx;
  border: 2rpx solid var(--td-border-level-1-color);
  background: var(--td-bg-color-container);
  transition: all 0.2s ease;
}

.option-item--active {
  border-color: var(--td-brand-color-7);
  background: var(--td-brand-color-1);
  .option-label {
    color: var(--td-brand-color-7);
    font-weight: 700;
  }
}

.option-label {
  font-size: 28rpx;
  color: var(--td-text-color-primary);
}
</style>