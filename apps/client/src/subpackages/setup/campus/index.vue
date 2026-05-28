<script setup lang="ts">
import { onMounted, reactive } from "vue";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
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
  await profileStore.saveCampusProfile({ ...form });
  uni.redirectTo({ url: "/subpackages/setup/schedule/index" });
}
</script>

<template>
  <AppShell title="学校信息" subtitle="先手动填写，认证状态以后端回传为准。" :show-tab-bar="false">
    <SectionCard title="学校资料" compact>
      <input v-model="form.city" class="field" placeholder="城市" />
      <input v-model="form.campusName" class="field" placeholder="学校名称" />
      <input v-model="form.department" class="field" placeholder="院系" />
      <BottomActionBar primary-label="保存并继续" @primary="save" />
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
</style>
