<script setup lang="ts">
/**
 * Profile Setup Page - 基础资料编辑页
 * 包含：头像上传、表单字段、表单验证、加载/错误状态
 */
import { onMounted, reactive, ref, computed } from "vue";
import AppShell from "../../../src/components/layout/AppShell.vue";
import SectionCard from "../../../src/components/common/SectionCard.vue";
import BottomActionBar from "../../../src/components/common/BottomActionBar.vue";
import AvatarUploader from "../../../src/components/profile/AvatarUploader.vue";
import LoadingState from "../../../src/components/common/LoadingState.vue";
import ErrorState from "../../../src/components/common/ErrorState.vue";
import { useProfileStore } from "../../../src/stores/profile";

/** 有效年级列表 */
const VALID_GRADES = ["大一", "大二", "大三", "大四", "研一", "研二", "研三"];

const profileStore = useProfileStore();
const loading = ref(false);
const loadError = ref("");
const saving = ref(false);

const form = reactive({
  nickname: "",
  bio: "",
  grade: "",
  pronouns: "",
  avatarUrl: "",
});

/** 表单校验错误 */
const errors = reactive({
  nickname: "",
  bio: "",
  grade: "",
});

/** 校验昵称：必填，最长20字符 */
function validateNickname(): string {
  if (!form.nickname.trim()) {
    return "昵称不能为空";
  }
  if (form.nickname.length > 20) {
    return "昵称最多20个字符";
  }
  return "";
}

/** 校验个人简介：最长160字符 */
function validateBio(): string {
  if (form.bio.length > 160) {
    return "个人简介最多160个字符";
  }
  return "";
}

/** 校验年级：必须是有效年级 */
function validateGrade(): string {
  if (!form.grade.trim()) {
    return "请选择年级";
  }
  if (!VALID_GRADES.includes(form.grade)) {
    return `年级须为：${VALID_GRADES.join("、")}`;
  }
  return "";
}

/** 执行全部校验，返回是否通过 */
function validateAll(): boolean {
  errors.nickname = validateNickname();
  errors.bio = validateBio();
  errors.grade = validateGrade();
  return !errors.nickname && !errors.bio && !errors.grade;
}

/** 是否已有数据（区分初次加载和已加载状态） */
const hasData = computed(() => !!profileStore.basicProfile);

async function loadData() {
  loading.value = true;
  loadError.value = "";
  try {
    await profileStore.load();
    const profile = profileStore.basicProfile;
    if (profile) {
      form.nickname = profile.nickname || "";
      form.bio = profile.bio || "";
      form.grade = profile.grade || "";
      form.pronouns = profile.pronouns || "";
    }
  } catch (err: unknown) {
    loadError.value = err instanceof Error ? err.message : "加载资料失败";
  } finally {
    loading.value = false;
  }
}

async function save() {
  // 点击保存时执行全量校验
  errors.nickname = validateNickname();
  errors.bio = validateBio();
  errors.grade = validateGrade();

  if (errors.nickname || errors.bio || errors.grade) {
    uni.showToast({ title: "请修正表单中的错误", icon: "none", duration: 2000 });
    return;
  }

  saving.value = true;
  try {
    await profileStore.saveBasicProfile({
      nickname: form.nickname.trim(),
      bio: form.bio.trim(),
      grade: form.grade.trim(),
      pronouns: form.pronouns.trim(),
    });
    uni.redirectTo({ url: "/subpackages/setup/campus/index" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "保存失败";
    uni.showToast({ title: msg, icon: "none", duration: 2000 });
  } finally {
    saving.value = false;
  }
}

function handleAvatarUploaded(url: string) {
  form.avatarUrl = url;
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <AppShell title="基础资料" subtitle="第一版尽量简短，后面都可以继续修改。" :show-tab-bar="false">
    <!-- 加载中 -->
    <LoadingState
      v-if="loading && !hasData"
      text="加载资料中..."
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
      <!-- 头像上传 -->
      <SectionCard title="头像" compact>
        <AvatarUploader
          :current-avatar="form.avatarUrl"
          @uploaded="handleAvatarUploaded"
        />
      </SectionCard>

      <!-- 资料表单 -->
      <SectionCard title="资料草稿" compact>
        <!-- 昵称 -->
        <view class="form-group">
          <input
            v-model="form.nickname"
            class="field"
            placeholder="昵称"
            maxlength="20"
            @blur="errors.nickname = validateNickname()"
          />
          <text v-if="errors.nickname" class="field-error">{{ errors.nickname }}</text>
        </view>

        <!-- 个人简介 -->
        <view class="form-group">
          <textarea
            v-model="form.bio"
            class="field field--textarea"
            maxlength="160"
            placeholder="简短介绍一下自己..."
            @blur="errors.bio = validateBio()"
          />
          <view class="field-footer">
            <text v-if="errors.bio" class="field-error">{{ errors.bio }}</text>
            <text class="field-count">{{ form.bio.length }}/160</text>
          </view>
        </view>

        <!-- 年级 -->
        <view class="form-group">
          <input
            v-model="form.grade"
            class="field"
            placeholder="年级（如：大一、研二）"
            @blur="errors.grade = validateGrade()"
          />
          <text v-if="errors.grade" class="field-error">{{ errors.grade }}</text>
        </view>

        <!-- 称呼偏好 -->
        <view class="form-group">
          <input v-model="form.pronouns" class="field" placeholder="称呼偏好（如：她/她）" />
        </view>

        <BottomActionBar
          :primary-label="saving ? '保存中...' : '保存并继续'"
          @primary="save"
        />
      </SectionCard>

      <!-- 顶部加载指示器（已有数据时的刷新加载） -->
      <LoadingState v-if="loading && hasData" text="刷新中..." />
    </template>
  </AppShell>
</template>

<style scoped lang="scss">
.form-group {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

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

.field-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4rpx;
}

.field-error {
  font-size: 22rpx;
  color: #be123c;
  line-height: 1.4;
}

.field-count {
  font-size: 22rpx;
  color: var(--td-text-color-placeholder, #94a3b8);
  margin-left: auto;
}
</style>