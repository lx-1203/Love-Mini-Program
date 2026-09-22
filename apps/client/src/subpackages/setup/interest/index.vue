<script setup lang="ts">
/**
 * 兴趣选择（v3.1 契约 11 / 14）：注册引导可跳过；主动进入必须 ≥3 个才能保存。
 */
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
// MP-R9-STATUS-005：注入 --statusbar（DevTools env 恒 0，标题叠印状态栏）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
import { useI18n } from "vue-i18n";
import { clientApi } from "../../../services/api";
import TagSelector from "../../../components/profile/TagSelector.vue";
import type { ProfileTagGroupKey } from "../../../config/profile-tags";

const { t } = useI18n();
const { styleVars: menuStyleVars } = useMenuButtonRect();

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
    // MP-R2-INTEREST-001：防重入守卫（原双击并发两次保存 + 双次 navigateBack）
    if (saving.value) return;
  const interests = selected.value.interest ?? [];
  if (interests.length < 3) {
    uni.showToast({ title: t("interestSelect.minThree"), icon: "none" });
    return;
  }
  saving.value = true;
  try {
    // MP-R1-SETUPINTEREST-002：saveBasicProfile 为全量 PUT 语义（mock 全量替换、
    // real 缺字段 400）。先取全量资料合并 interestTags 后再提交，避免清空其余资料。
    let merged: Record<string, unknown> = {};
    try {
      merged = (await clientApi.getBasicProfile()) as unknown as Record<string, unknown>;
    } catch (_e) {
      // MP-R2-INTEREST-002：全量 PUT 语义下拉取失败即提交半份数据会 400 卡死流程——
      // 改为提示重试，不盲目提交
      uni.showToast({ title: t("common.networkError"), icon: "none" });
      return;
    }
    await clientApi.saveBasicProfile({ ...merged, interestTags: interests } as never);
    uni.showToast({ title: t("interestSelect.saved"), icon: "success" });
    // MP-R1-SETUPINTEREST-001：保存后返回需页面栈守卫——深链直达栈=1 时
    // navigateBack 无反应，兜底 switchTab 回「我的」Tab（tabBar 页）
    setTimeout(() => {
      if (getCurrentPages().length > 1) {
        uni.navigateBack();
      } else {
        uni.switchTab({ url: "/pages/profile/index" });
      }
    }, 600);
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
  <view class="interest-page" :style="menuStyleVars">
    <view class="interest-header">
      <text class="interest-header__title">{{ t('interestSelect.title') }}</text>
      <text class="interest-header__sub">{{ t('interestSelect.subtitle') }}</text>
    </view>

    <!-- MP-R1-SETUPINTEREST-003：仅展示「兴趣」组——本页初始化/回填/校验/保存均只处理
         interest 一组，原全量渲染 4 组使其余 3 组可见可选、保存即静默丢弃 -->
    <TagSelector v-model="selected" :groups="['interest']" />

    <view class="interest-save press-feedback" hover-class="press-feedback--active" hover-stay-time="120" role="button" :aria-label="t('interestSelect.save')" @tap="handleSave">
      <text class="interest-save__text">{{ saving ? t('common.loading') : t('interestSelect.save') }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
.interest-page {
  min-height: 100%;
  background: var(--c-bg-page, #EEF7F2);
  /* MP-R9-STATUS-005：--statusbar 兜底（DevTools var(--statusbar, env(safe-area-inset-top)) 恒 0） */
  padding-top: calc(var(--statusbar, env(safe-area-inset-top)) + 24rpx);
  padding-right: 32rpx;
  padding-bottom: 64rpx;
  padding-left: 32rpx;
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


/* R16（2026-09-07）：页面背景统一纯白（对齐「他人显示主页」理想图色调） */
page {
  background: #ffffff;
}

</style>
