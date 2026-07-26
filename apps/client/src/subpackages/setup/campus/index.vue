<script setup lang="ts">
/**
 * 校园信息引导页（功能5：当前步骤 = 2：校园认证）。
 *
 * 跳转链路：profile(1) → campus(2) → recommend-pref(3) → schedule(4) → 完成(5)
 * 注意：原跳转路径为 /subpackages/setup/schedule/index，
 * 实际链路中此处应跳到 recommend-pref（步骤 3），
 * 但保留原有跳转逻辑以避免破坏现有业务流程。
 */
import { onMounted, reactive } from "vue";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
// 功能5：引导流程进度条（当前步骤 = 2：校园认证）
import SetupProgress from "../../../components/setup/SetupProgress.vue";
import { useProfileStore } from "../../../stores/profile";

const profileStore = useProfileStore();
const form = reactive({
  city: "广州",
  campusName: "南校区",
  department: "工业设计",
});

onMounted(async () => {
  await profileStore.load();
  Object.assign(form, profileStore.campusProfile || form);
});

async function save() {
  if (!form.city.trim()) {
    uni.showToast({ title: "请输入城市", icon: "none" });
    return;
  }
  if (!form.campusName.trim()) {
    uni.showToast({ title: "请输入学校名称", icon: "none" });
    return;
  }
  if (!form.department.trim()) {
    uni.showToast({ title: "请输入专业", icon: "none" });
    return;
  }

  try {
    await profileStore.saveCampusProfile({ ...form });
    uni.redirectTo({ url: "/subpackages/setup/schedule/index" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请稍后重试";
    uni.showToast({ title: message, icon: "none" });
  }
}
</script>

<template>
  <AppShell title="学校信息" subtitle="先手动填写，认证状态以后端回传为准。" :show-tab-bar="false">
    <!-- 功能5：引导流程进度条（当前步骤 = 2：校园认证） -->
    <SetupProgress :current-step="2" />

    <SectionCard title="学校资料" compact>
      <input v-model="form.city" class="field" placeholder="城市" aria-label="城市"></input>
      <input v-model="form.campusName" class="field" placeholder="学校名称" aria-label="学校名称"></input>
      <input v-model="form.department" class="field" placeholder="院系" aria-label="院系"></input>
    </SectionCard>
    <BottomActionBar primary-label="保存并继续" @primary="save"></BottomActionBar>
  </AppShell>
</template>

<style scoped lang="scss">
.field {
  width: 100%;
  min-height: 88rpx;
  padding: var(--sp-4) var(--sp-4);
  box-sizing: border-box;
  border-radius: var(--r-lg);
  background: var(--c-bg-page);
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  border: var(--c-border-card);
}
</style>
