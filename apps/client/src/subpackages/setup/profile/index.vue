<script setup lang="ts">
import { onMounted, reactive } from "vue";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
import { useProfileStore } from "../../../stores/profile";

const profileStore = useProfileStore();
const form = reactive({
  nickname: "星野",
  bio: "安静、好奇，更喜欢一对一慢慢聊。",
  grade: "大三",
  pronouns: "她/她",
});

onMounted(async () => {
  await profileStore.load();
  Object.assign(form, profileStore.basicProfile || form);
});

async function save() {
  await profileStore.saveBasicProfile({ ...form });
  uni.redirectTo({ url: "/subpackages/setup/campus/index" });
}
</script>

<template>
  <AppShell title="基础资料" subtitle="第一版尽量简短，后面都可以继续修改。" :show-tab-bar="false">
    <SectionCard title="资料草稿" compact>
      <input v-model="form.nickname" class="field" placeholder="昵称" />
      <textarea v-model="form.bio" class="field field--textarea" maxlength="160" />
      <input v-model="form.grade" class="field" placeholder="年级" />
      <input v-model="form.pronouns" class="field" placeholder="称呼偏好" />
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

.field--textarea {
  min-height: 180rpx;
}
</style>
