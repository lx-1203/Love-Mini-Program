<script setup lang="ts">
import { onMounted, reactive } from "vue";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
import { useProfileStore } from "../../../stores/profile";
import { replaceAppPath } from "../../../utils/navigation";

const profileStore = useProfileStore();
const form = reactive({
  preferredCampusArea: "图书馆和北草坪",
  preferredTimeWindows: ["今晚", "本周"],
  courseBlocks: [
    { id: "b-1", weekday: "周一", start: "09:00", end: "10:30", label: "设计课" },
  ],
});

onMounted(async () => {
  await profileStore.load();
  Object.assign(form, profileStore.scheduleProfile || form);
});

async function save() {
  // 修复：添加输入验证
  if (!form.preferredCampusArea.trim()) {
    uni.showToast({ title: "请输入偏好地点", icon: "none" });
    return;
  }
  // 确保 preferredTimeWindows 至少有一项且非空
  const validWindows = (form.preferredTimeWindows || []).filter((w: string) => w && w.trim());
  if (validWindows.length === 0) {
    uni.showToast({ title: "请至少添加一个时间窗口", icon: "none" });
    return;
  }

  try {
    await profileStore.saveScheduleProfile({ ...form });
    replaceAppPath("/pages/discover/index");
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请稍后重试";
    uni.showToast({ title: message, icon: "none" });
  }
}
</script>

<template>
  <AppShell title="时间安排" subtitle="这里会驱动首页默认推荐和可聊天时段。" :show-tab-bar="false">
    <SectionCard title="偏好设置" compact>
      <input v-model="form.preferredCampusArea" class="field" placeholder="常去区域" />
      <textarea
        v-model="form.preferredTimeWindows[0]"
        class="field field--textarea"
        maxlength="60"
        placeholder="常用空闲时段，例如今晚或本周三下午"
      />
      <BottomActionBar primary-label="保存并进入应用" @primary="save" />
    </SectionCard>
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

.field--textarea {
  min-height: 120rpx;
}
</style>
