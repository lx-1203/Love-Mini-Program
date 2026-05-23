<script setup lang="ts">
import { onMounted, reactive } from "vue";
import AppShell from "../../../src/components/layout/AppShell.vue";
import SectionCard from "../../../src/components/common/SectionCard.vue";
import BottomActionBar from "../../../src/components/common/BottomActionBar.vue";
import { useProfileStore } from "../../../src/stores/profile";
import { replaceAppPath } from "../../../src/utils/navigation";

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
  await profileStore.saveScheduleProfile({ ...form });
  replaceAppPath("/pages/discover/index");
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
  padding: 18rpx;
  box-sizing: border-box;
  border-radius: 18rpx;
  background: var(--td-bg-app-page);
}

.field--textarea {
  min-height: 120rpx;
}
</style>
