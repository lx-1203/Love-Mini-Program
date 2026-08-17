<script setup lang="ts">
/**
 * 兴趣选择（v3.1 契约 11 / 14）：注册引导可跳过；主动进入必须 ≥3 个才能保存。
 */
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import { clientApi } from "../../../services/api";
import TagSelector from "../../../components/profile/TagSelector.vue";
import type { ProfileTagGroupKey } from "../../../config/profile-tags";

const { t } = useI18n();

const selected = ref<Partial<Record<ProfileTagGroupKey, string[]>>>({ interest: [] });
const saving = ref(false);

onLoad(async () => {
  try {
    const profile = await clientApi.getBasicProfile();
    const tags = (profile as unknown as { interestTags?: string[] }).interestTags;
    if (tags?.length) {
      selected.value = { interest: tags };
    }
  } catch (_e) {
    // 静默
  }
});

async function handleSave() {
  const interests = selected.value.interest ?? [];
  if (interests.length < 3) {
    uni.showToast({ title: t("interestSelect.minThree"), icon: "none" });
    return;
  }
  saving.value = true;
  try {
    await clientApi.saveBasicProfile({ interestTags: interests } as never);
    uni.showToast({ title: t("interestSelect.saved"), icon: "success" });
    setTimeout(() => uni.navigateBack(), 600);
  } catch (error) {
    uni.showToast({
      title: error instanceof Error ? error.message : t("interestSelect.saveFailed"),
      icon: "none",
    });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <view class="interest-page">
    <view class="interest-header">
      <text class="interest-header__title">{{ t('interestSelect.title') }}</text>
      <text class="interest-header__sub">{{ t('interestSelect.subtitle') }}</text>
    </view>

    <TagSelector v-model="selected" />

    <view class="interest-save press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('interestSelect.save')" @tap="handleSave">
      <text class="interest-save__text">{{ saving ? t('common.loading') : t('interestSelect.save') }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.interest-page {
  min-height: 100%;
  background: var(--c-bg-page, #F7FAF9);
  padding: 24rpx 32rpx 64rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.interest-header {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 24rpx;
}

.interest-header__title {
  font-size: 44rpx;
  font-weight: 800;
  color: var(--c-text-primary, #222222);
}

.interest-header__sub {
  font-size: 24rpx;
  color: var(--c-text-secondary, #666666);
}

.interest-save {
  margin-top: 32rpx;
  padding: 24rpx 0;
  border-radius: var(--r-full, 9999rpx);
  background: linear-gradient(135deg, #36C99A 0%, #36C99A 100%);
  text-align: center;
}

.interest-save__text {
  font-size: 30rpx;
  font-weight: 800;
  color: #ffffff;
}
</style>
