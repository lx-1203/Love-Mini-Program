<script setup lang="ts">
import { onMounted, ref } from "vue";
import { getProfileConfig, saveProfileConfig, type ProfileConfigView } from "@/api/config";
import { ApiError } from "@/api/http";

const loading = ref(false);
const saving = ref(false);
const errorMsg = ref("");
const successMsg = ref("");
const form = ref<ProfileConfigView>({
  showMBTI: true,
  showVoice: true,
  showCircle: true,
  maxStories: 6,
  minHighQualityScore: 90,
});

onMounted(async () => {
  loading.value = true;
  errorMsg.value = "";
  try {
    form.value = (await getProfileConfig()) ?? form.value;
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : "加载失败";
  } finally {
    loading.value = false;
  }
});

async function handleSave() {
  saving.value = true;
  errorMsg.value = "";
  successMsg.value = "";
  try {
    form.value = await saveProfileConfig(form.value);
    successMsg.value = "保存成功";
  } catch (err) {
    errorMsg.value = err instanceof ApiError ? err.message : "保存失败";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="profile-config-page">
    <h2>主页运营配置</h2>
    <p class="desc">控制个人主页各模块的显隐与数量上限。</p>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="form">
      <label class="row">
        <span>显示 MBTI</span>
        <input v-model="form.showMBTI" type="checkbox" />
      </label>
      <label class="row">
        <span>显示语音介绍</span>
        <input v-model="form.showVoice" type="checkbox" />
      </label>
      <label class="row">
        <span>显示兴趣圈</span>
        <input v-model="form.showCircle" type="checkbox" />
      </label>
      <label class="row">
        <span>最大故事数量</span>
        <input v-model.number="form.maxStories" type="number" min="1" max="20" />
      </label>
      <label class="row">
        <span>高质量主页分数下限</span>
        <input v-model.number="form.minHighQualityScore" type="number" min="0" max="100" />
      </label>

      <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
      <p v-if="successMsg" class="success">{{ successMsg }}</p>

      <button class="save-btn" :disabled="saving" @click="handleSave">
        {{ saving ? "保存中..." : "保存" }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.profile-config-page {
  padding: 24px;
  max-width: 520px;
}

.desc {
  color: #666;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 20px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.error {
  color: #e5454d;
}

.success {
  color: #10b981;
}

.save-btn {
  align-self: flex-start;
  padding: 8px 20px;
  border: 0;
  border-radius: 6px;
  background: #35c99a;
  color: #fff;
  cursor: pointer;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
