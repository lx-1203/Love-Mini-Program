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
    // P0-35 修复：日程保存后进入推荐偏好（注册流程最后一步），
    // 走完 = 基本资料30+校园30(学生)+日程20 = 80 → profileCompleted=true → 解锁
    replaceAppPath(SUBPACKAGE_ROUTES.SETUP_PROGRESS.RECOMMEND_PREF);
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存失败，请稍后重试";
    uni.showToast({ title: message, icon: "none" });
  }
}
</script>

<template>
  <AppShell title="时间安排" subtitle="这里会驱动首页默认推荐和可聊天时段。" :show-tab-bar="false">
    <SectionCard title="偏好设置" compact>
      <input v-model="form.preferredCampusArea" class="field" placeholder="常去区域" aria-label="常去区域" />
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
          :placeholder="idx === 0 ? '常用空闲时段，例如今晚或本周三下午' : '补充空闲时段，例如周日下午'"
          :aria-label="idx === 0 ? '常用空闲时段，例如今晚或本周三下午' : '补充空闲时段，例如周日下午'"
        />
      </view>
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

/* review #66：多个时段输入框间距 */
.time-window-field {
  margin-top: var(--sp-3);
}

.time-window-field:first-of-type {
  margin-top: var(--sp-3);
}
</style>
