<script setup lang="ts">
/**
 * Campus Setup Page - 学校信息编辑页
 * 包含：校区表单、学号字段、认证状态徽章、"去认证"入口
 */
import { onMounted, reactive, ref, computed } from "vue";
import AppShell from "../../../src/components/layout/AppShell.vue";
import SectionCard from "../../../src/components/common/SectionCard.vue";
import BottomActionBar from "../../../src/components/common/BottomActionBar.vue";
import StatusState from "../../../src/components/common/StatusState.vue";
import LoadingState from "../../../src/components/common/LoadingState.vue";
import ErrorState from "../../../src/components/common/ErrorState.vue";
import { useProfileStore } from "../../../src/stores/profile";

const profileStore = useProfileStore();
const loading = ref(false);
const loadError = ref("");
const saving = ref(false);

const form = reactive({
  city: "",
  campusName: "",
  department: "",
  studentId: "",
});

/** 认证状态标签文案 */
const verificationLabel = computed(() => {
  const status = profileStore.campusProfile?.verificationStatus;
  switch (status) {
    case "pending":
      return "审核中";
    case "verified":
      return "已认证";
    default:
      return "未认证";
  }
});

/** 认证状态色调 */
const verificationTone = computed<"brand" | "success" | "warning">(() => {
  const status = profileStore.campusProfile?.verificationStatus;
  if (status === "verified") return "success";
  if (status === "pending") return "brand";
  return "warning";
});

/** 是否已有数据 */
const hasData = computed(() => !!profileStore.campusProfile);

async function loadData() {
  loading.value = true;
  loadError.value = "";
  try {
    await profileStore.load();
    const profile = profileStore.campusProfile;
    if (profile) {
      form.city = profile.city || "";
      form.campusName = profile.campusName || "";
      form.department = profile.department || "";
      form.studentId = profile.studentId || "";
    }
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "加载学校信息失败";
  } finally {
    loading.value = false;
  }
}

async function save() {
  if (!form.campusName.trim()) {
    uni.showToast({ title: "请填写学校名称", icon: "none", duration: 2000 });
    return;
  }

  saving.value = true;
  try {
    await profileStore.saveCampusProfile({
      city: form.city.trim(),
      campusName: form.campusName.trim(),
      department: form.department.trim(),
      studentId: form.studentId.trim(),
    });
    uni.redirectTo({ url: "/subpackages/setup/schedule/index" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "保存失败";
    uni.showToast({ title: msg, icon: "none", duration: 2000 });
  } finally {
    saving.value = false;
  }
}

/** 跳转到校园认证页面 */
function goVerify() {
  uni.navigateTo({ url: "/subpackages/setup/campus-verify/index" });
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <AppShell title="学校信息" subtitle="先手动填写，认证状态以后端回传为准。" :show-tab-bar="false">
    <!-- 加载中 -->
    <LoadingState
      v-if="loading && !hasData"
      text="加载学校信息..."
      :fullscreen="true"
    />

    <!-- 加载失败 -->
    <ErrorState
      v-else-if="loadError && !hasData"
      :message="loadError"
      fullscreen
      @retry="loadData"
    />

    <!-- 正常内容 -->
    <template v-else>
      <!-- 认证状态卡片 -->
      <SectionCard v-if="hasData" title="认证状态" compact>
        <view class="verify-row">
          <StatusState :label="verificationLabel" :tone="verificationTone" />
          <text
            v-if="profileStore.campusProfile?.verificationStatus !== 'verified'"
            class="verify-link"
            @click="goVerify"
          >
            去认证
          </text>
        </view>
      </SectionCard>

      <!-- 学校资料表单 -->
      <SectionCard title="学校资料" compact>
        <input v-model="form.city" class="field" placeholder="城市" />
        <input v-model="form.campusName" class="field" placeholder="学校名称" />
        <input v-model="form.department" class="field" placeholder="院系" />
        <input
          v-model="form.studentId"
          class="field"
          placeholder="学号"
          maxlength="20"
        />
        <BottomActionBar
          :primary-label="saving ? '保存中...' : '保存并继续'"
          @primary="save"
        />
      </SectionCard>

      <!-- 刷新加载 -->
      <LoadingState v-if="loading && hasData" text="刷新中..." />
    </template>
  </AppShell>
</template>

<style scoped lang="scss">
.field {
  width: 100%;
  min-height: 88rpx;
  padding: 18rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: var(--td-bg-app-page);
}

.verify-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.verify-link {
  font-size: 26rpx;
  color: var(--td-brand-color-7, #1d4ed8);
  font-weight: 600;
}
</style>