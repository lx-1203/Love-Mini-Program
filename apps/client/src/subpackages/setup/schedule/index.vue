<script setup lang="ts">
/**
 * 时间安排页（课表导入，可选工具）。
 *
 * P0-35 修复（2026-08-08）：时间安排回到注册主流程（学生：基本资料→校园→日程→
 * 推荐偏好；非学生：基本资料→日程→推荐偏好）。完成度链路：
 * 基本资料30 + 校园30(学生) + 日程20 = 80 → profileCompleted=true → 解锁全部功能。
 */
import { onMounted, reactive } from "vue";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
import { useProfileStore } from "../../../stores/profile";
import { replaceAppPath } from "../../../utils/navigation";
import { SUBPACKAGE_ROUTES } from "../../../constants/routes";
// R4-batch2: 页面文案 i18n 化
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const profileStore = useProfileStore();
// R4-00045/46 修复：注册流程表单不再预填示例值（"图书馆和北草坪"/["今晚","本周"]/设计课课表），
// 全部置空——避免新用户直接保存即提交示例假数据入库；courseBlocks 未在模板渲染，
// 不随 {...form} 提交后端（以空数组提交，符合 ScheduleProfile 契约）。
const form = reactive({
  preferredCampusArea: "",
  preferredTimeWindows: [] as string[],
  courseBlocks: [] as Array<{ id: string; weekday: string; start: string; end: string; label: string }>,
});

onMounted(async () => {
  await profileStore.load();
  Object.assign(form, profileStore.scheduleProfile || form);
});

async function save() {
  // 修复：添加输入验证
  if (!form.preferredCampusArea.trim()) {
    uni.showToast({ title: t("setup.schedule.locationRequired"), icon: "none" });
    return;
  }
  // 确保 preferredTimeWindows 至少有一项且非空
  const validWindows = (form.preferredTimeWindows || []).filter((w: string) => w && w.trim());
  if (validWindows.length === 0) {
    uni.showToast({ title: t("setup.schedule.timeWindowRequired"), icon: "none" });
    return;
  }

  try {
    await profileStore.saveScheduleProfile({ ...form });
    // P0-35 修复：日程保存后进入推荐偏好（注册流程最后一步），
    // 走完 = 基本资料30+校园30(学生)+日程20 = 80 → profileCompleted=true → 解锁
    replaceAppPath(SUBPACKAGE_ROUTES.SETUP_PROGRESS.RECOMMEND_PREF);
  } catch (error) {
    // R4-00047：错误兜底文案走 i18n
    const message = error instanceof Error ? error.message : t("setup.schedule.saveFailed");
    uni.showToast({ title: message, icon: "none" });
  }
}
</script>

<template>
  <AppShell :title="t('setup.schedule.pageTitle')" :subtitle="t('setup.schedule.pageSubtitle')" :show-tab-bar="false" show-back>
    <SectionCard :title="t('setup.schedule.prefTitle')" compact>
      <input v-model="form.preferredCampusArea" class="field" :placeholder="t('setup.schedule.placePlaceholder')" :aria-label="t('setup.schedule.placePlaceholder')" />
      <!-- review #66：原模板仅绑定 preferredTimeWindows[0]，其余时段无法编辑；
           现按数组渲染全部时段输入框，提交时完整保留。 -->
      <view
        v-for="(_win, idx) in form.preferredTimeWindows"
        :key="idx"
        class="time-window-field"
      >
        <input
          v-model="form.preferredTimeWindows[idx]"
          class="field"
          maxlength="60"
          :placeholder="idx === 0 ? t('setup.schedule.timeWindowPlaceholder') : t('setup.schedule.timeWindowPlaceholderExtra')"
          :aria-label="idx === 0 ? t('setup.schedule.timeWindowPlaceholder') : t('setup.schedule.timeWindowPlaceholderExtra')"
        />
      </view>
      <BottomActionBar :primary-label="t('setup.schedule.saveButton')" @primary="save" />
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

/* review #66：多个时段输入框间距 */
.time-window-field {
  margin-top: var(--sp-3);
}

.time-window-field:first-of-type {
  margin-top: var(--sp-3);
}
</style>
