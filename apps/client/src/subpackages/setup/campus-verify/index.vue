<script setup lang="ts">
/**
 * campus-verify - 校园认证独立页面
 * 包含学生证上传组件，并显示认证状态
 * 状态：pending(审核中)、approved(已通过)、rejected(已拒绝)
 */
import { ref, onMounted, computed } from "vue";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import StatusState from "../../../components/common/StatusState.vue";
import StudentCardUploader from "../../../components/verification/StudentCardUploader.vue";
import { clientApi } from "../../../services/api";
import { useProfileStore } from "../../../stores/profile";

const profileStore = useProfileStore();

const loading = ref(false);
const errorMsg = ref("");
const verificationStatus = ref<"pending" | "approved" | "rejected" | null>(null);
const rejectionReason = ref<string | null>(null);
const studentId = ref("");

const statusLabel = computed(() => {
  switch (verificationStatus.value) {
    case "pending":
      return "审核中";
    case "approved":
      return "已通过";
    case "rejected":
      return "已拒绝";
    default:
      return "未认证";
  }
});

const statusTone = computed<"brand" | "success" | "warning">(() => {
  switch (verificationStatus.value) {
    case "pending":
      return "brand";
    case "approved":
      return "success";
    case "rejected":
      return "warning";
    default:
      return "brand";
  }
});

const canResubmit = computed(() => {
  return (
    !verificationStatus.value ||
    verificationStatus.value === "rejected"
  );
});

async function loadStatus() {
  loading.value = true;
  errorMsg.value = "";
  try {
    await profileStore.load();
    studentId.value = profileStore.campusProfile?.studentId || "";

    const status = await clientApi.getVerificationStatus();
    verificationStatus.value = status.status;
    rejectionReason.value = status.rejectionReason ?? null;
  } catch (err: unknown) {
    errorMsg.value = err instanceof Error ? err.message : "加载认证状态失败";
  } finally {
    loading.value = false;
  }
}

function handleSubmitted(newStatus: typeof verificationStatus.value) {
  verificationStatus.value = newStatus;
}

function retry() {
  loadStatus();
}

onMounted(() => {
  loadStatus();
});
</script>

<template>
  <AppShell
    title="校园认证"
    subtitle="上传学生证完成校园身份认证"
    :show-tab-bar="false"
  >
    <SectionCard v-if="loading" title="认证状态" compact>
      <view class="verify-loading">
        <text class="verify-loading__text">加载中...</text>
      </view>
    </SectionCard>

    <SectionCard v-else-if="errorMsg" title="认证状态" compact>
      <view class="verify-error" @click="retry">
        <text class="verify-error__text">{{ errorMsg }}</text>
        <text class="verify-error__retry">点击重试</text>
      </view>
    </SectionCard>

    <SectionCard v-else title="认证状态" compact>
      <view class="verify-status">
        <StatusState :label="statusLabel" :tone="statusTone" />
        <text v-if="rejectionReason" class="verify-status__reason">
          拒绝原因：{{ rejectionReason }}
        </text>
      </view>
    </SectionCard>

    <SectionCard v-if="canResubmit" title="提交认证" compact>
      <StudentCardUploader
        :student-id-initial="studentId"
        :verification-status="verificationStatus || undefined"
        @submitted="handleSubmitted"
      />
    </SectionCard>

    <SectionCard v-else title="认证完成" compact>
      <view class="verify-approved">
        <text class="verify-approved__icon">&#10003;</text>
        <text class="verify-approved__text">校园身份认证已通过</text>
      </view>
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
.verify-loading,
.verify-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 40rpx 0;
}

.verify-loading__text {
  font-size: 26rpx;
  color: var(--td-text-color-secondary);
}

.verify-error__text {
  font-size: 26rpx;
  color: #be123c;
  text-align: center;
}

.verify-error__retry {
  font-size: 24rpx;
  color: var(--td-brand-color-7);
}

.verify-status {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.verify-status__reason {
  font-size: 24rpx;
  color: var(--td-text-color-secondary);
  line-height: 1.6;
}

.verify-approved {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  padding: 28rpx 0;
}

.verify-approved__icon {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(15, 118, 110, 0.1);
  color: var(--td-success-color);
  font-size: 36rpx;
  font-weight: 700;
}

.verify-approved__text {
  font-size: 28rpx;
  color: var(--td-success-color);
  font-weight: 600;
}
</style>