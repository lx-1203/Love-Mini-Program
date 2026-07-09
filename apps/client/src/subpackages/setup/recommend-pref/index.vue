<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
import { request } from "../../../services/http";
import { appEnv } from "../../../services/env";
import { useSessionStore } from "../../../stores/session";

// ==================== 类型定义 ====================

/** 推荐偏好响应 */
interface RecommendationPreferences {
  dailyNotifyTime: string;
  scope: string;
  /** 校园优先：同校用户排序靠前 */
  campusPriority?: boolean;
}

// ==================== 状态定义 ====================

/** 加载状态 */
const loading = ref(true);
/** 错误状态 */
const error = ref(false);
/** 每日推荐时间 */
const dailyNotifyTime = ref("12:00");
/** 推荐范围 */
const scope = ref<"campus_first" | "city" | "unlimited">("campus_first");
/** 校园优先开关 */
const campusPriority = ref(true);
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

/** 获取偏好设置 */
async function fetchPreferences() {
  loading.value = true;
  error.value = false;
  try {
    const sessionStore = useSessionStore();
    const userId = sessionStore.userSession?.userId;

    if (userId) {
      // 从后端 API 获取偏好设置
      const data = await request<RecommendationPreferences>({
        url: `/recommendations/preferences/${userId}`,
      });
      dailyNotifyTime.value = data.dailyNotifyTime || "12:00";
      scope.value = (data.scope as "campus_first" | "city" | "unlimited") || "campus_first";
      campusPriority.value = data.campusPriority ?? true;
    } else {
      // 未登录时使用默认值
      dailyNotifyTime.value = "12:00";
      scope.value = "campus_first";
      campusPriority.value = true;
    }
  } catch (_e) {
    // API 调用失败时使用默认值
    dailyNotifyTime.value = "12:00";
    scope.value = "campus_first";
    campusPriority.value = true;
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
    const sessionStore = useSessionStore();
    const userId = sessionStore.userSession?.userId;

    if (userId) {
      // 调用后端 API 保存偏好设置
      await request<RecommendationPreferences, { dailyNotifyTime: string; scope: string; campusPriority: boolean }>({
        url: `/recommendations/preferences/${userId}`,
        method: "PUT",
        data: {
          dailyNotifyTime: dailyNotifyTime.value,
          scope: scope.value,
          campusPriority: campusPriority.value,
        },
      });
    }

    uni.showToast({ title: "保存成功", icon: "success" });
  } catch (_e) {
    uni.showToast({ title: "保存失败，请重试", icon: "none" });
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
  <AppShell title="推荐计划设置" :show-tab-bar="false">
    <!-- 加载状态 -->
    <SectionCard v-if="loading" title="加载中..." compact>
      <view class="loading-container">
        <text class="loading-text">正在获取推荐偏好设置...</text>
      </view>
    </SectionCard>

    <!-- 错误状态 -->
    <SectionCard v-else-if="error" title="加载失败" compact>
      <view class="error-container">
        <text class="error-text">获取偏好设置时出现问题，请重试</text>
        <button class="retry-btn" @tap="retry">重新加载</button>
      </view>
    </SectionCard>

    <!-- 正常表单 -->
    <template v-else>
      <!-- 每日推荐时间 -->
      <SectionCard title="推荐时间" subtitle="每天在这个时间为你刷新推荐卡片" compact>
        <view class="option-group">
          <view
            v-for="opt in timeOptions"
            :key="opt.value"
            class="option-item"
            :class="{ 'option-item--active': dailyNotifyTime === opt.value }"
            @tap="dailyNotifyTime = opt.value"
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
            @tap="scope = opt.value"
          >
            <text class="option-label">{{ opt.label }}</text>
          </view>
        </view>
      </SectionCard>

      <!-- 校园优先 -->
      <SectionCard title="校园优先" subtitle="启用后同校用户推荐权重+30%并排序靠前" compact>
        <view class="toggle-row" @tap="campusPriority = !campusPriority">
          <text class="toggle-label">校园优先</text>
          <view class="toggle-switch" :class="{ 'toggle-switch--on': campusPriority }">
            <view class="toggle-knob" />
          </view>
        </view>
      </SectionCard>

      <!-- 保存按钮 -->
      <BottomActionBar
        :primary-label="saving ? '保存中...' : '保存'"
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
  color: var(--c-text-secondary);
}

.error-text {
  font-size: 26rpx;
  color: var(--c-text-secondary);
  text-align: center;
}

.retry-btn {
  height: 72rpx;
  padding: 0 var(--sp-9);
  border: 0;
  border-radius: var(--r-md);
  font-size: var(--fs-md);
  font-weight: 600;
  background: var(--c-brand-700);
  color: var(--c-text-inverse);
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
  border: 2rpx solid var(--c-border-light);
  background: var(--c-bg-container);
  transition: all 0.2s ease;
}

.option-item--active {
  border-color: var(--c-brand-700);
  background: var(--c-bg-brand);
  .option-label {
    color: var(--c-brand-700);
    font-weight: 700;
  }
}

.option-label {
  font-size: 28rpx;
  color: var(--c-text-primary);
}

// ==================== 校园优先开关 ====================

.toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12rpx 0;
}

.toggle-label {
  font-size: 28rpx;
  color: var(--c-text-primary);
}

.toggle-switch {
  width: 88rpx;
  height: 48rpx;
  border-radius: 24rpx;
  background: var(--c-bg-surface);
  position: relative;
  transition: background 0.2s ease;
}

.toggle-switch--on {
  background: var(--c-brand-700);
}

.toggle-knob {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  background: var(--c-bg-container);
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  transition: left 0.2s ease;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
}

.toggle-switch--on .toggle-knob {
  left: 44rpx;
}
</style>
