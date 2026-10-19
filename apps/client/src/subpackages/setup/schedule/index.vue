<script setup lang="ts">
/**
 * 时间安排页（常去区域 + 空闲时段，注册流程第 3 步）。
 *
 * R6-B69/D01（需新建，2026-10-20）：本页**只**渲染常去区域与空闲时段两类输入；
 * `courseBlocks`（ScheduleBlock 契约，api-types.ts:962）在本页无渲染入口，
 * 只在提交时按空数组带上——"课表块编辑器"属需新建的目标功能（要补星期×节次增删 UI
 * 与 i18n 文案），不在本批次内，已在报告登记 NEEDS-RULING。原头注释自称"课表导入"
 * 与实际渲染不一致，是 D01 的取证依据，故按实际职责改写，不再声称课表。
 *
 * P0-35 修复（2026-08-08）：时间安排回到注册主流程（学生：基本资料→校园→日程→
 * 推荐偏好；非学生：基本资料→日程→推荐偏好）。完成度链路：
 * 基本资料30 + 校园30(学生) + 日程20 = 80 → profileCompleted=true → 解锁全部功能。
 */
import { onMounted, reactive, ref } from "vue";
import { IMAGE_PATHS } from "../../../config/images";
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
// R6-B69/D04（空态文案，2026-10-20）：preferredTimeWindows 原初值为 [] ⇒ 首次进入
// 一个时段输入框都不渲染，写好的引导 placeholder「常用空闲时段，例如今晚或本周三下午」
// 永远不可见，而保存校验（见 save()）又强制至少填一个时段。改为初值即给 1 行**空串**
// 输入框：空串不是示例值、不违反 R4-00045/46，save() 的 filter(w => w.trim()) 仍会拦下空值。
const form = reactive({
  preferredCampusArea: "",
  preferredTimeWindows: [""] as string[],
  courseBlocks: [] as Array<{ id: string; weekday: string; start: string; end: string; label: string }>,
});

onMounted(async () => {
  await profileStore.load();
  Object.assign(form, profileStore.scheduleProfile || form);
  // R6-B69/D04：store 回来的时段列表为空（新用户/后端返回 []）时补一行空输入框，
  // 保证引导 placeholder 在空态可见；已有值时不覆盖用户数据。
  if (!Array.isArray(form.preferredTimeWindows) || form.preferredTimeWindows.length === 0) {
    form.preferredTimeWindows = [""];
  }
});

/**
 * 2026-08-10 功能补齐：添加时段输入框（原实现只能编辑已有时段，初始为空时无法新增）。
 */
function addTimeWindow() {
  form.preferredTimeWindows.push("");
}

/** 删除指定时段输入框 */
function removeTimeWindow(idx: number) {
  form.preferredTimeWindows.splice(idx, 1);
}

// MP-R2-SCHEDULE-001：保存防重入标志（原连点并发两次 PUT）
const saving = ref(false);

async function save() {
  if (saving.value) return;
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

  saving.value = true;
  try {
    await profileStore.saveScheduleProfile({ ...form });
    // P0-35 修复：日程保存后进入推荐偏好（注册流程最后一步），
    // 走完 = 基本资料30+校园30(学生)+日程20 = 80 → profileCompleted=true → 解锁
    replaceAppPath(SUBPACKAGE_ROUTES.SETUP_PROGRESS.RECOMMEND_PREF);
  } catch (error) {
    // R4-00047：错误兜底文案走 i18n
    const message = error instanceof Error ? error.message : t("setup.schedule.saveFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <AppShell :title="t('setup.schedule.pageTitle')" :subtitle="t('setup.schedule.pageSubtitle')" :show-tab-bar="false" show-back>
    <SectionCard :title="t('setup.schedule.prefTitle')" compact>
      <input
  cursor-spacing="20" v-model="form.preferredCampusArea" class="field" :placeholder="t('setup.schedule.placePlaceholder')" :aria-label="t('setup.schedule.placePlaceholder')" />
      <!-- review #66：原模板仅绑定 preferredTimeWindows[0]，其余时段无法编辑；
           现按数组渲染全部时段输入框，提交时完整保留。
           2026-08-10 功能补齐：新增「+ 添加时段」按钮与删除按钮，初始为空也可新增。 -->
      <view
        v-for="(_win, idx) in form.preferredTimeWindows"
        :key="idx"
        class="time-window-field"
      >
        <view class="time-window-row">
          <input
  cursor-spacing="20"
            v-model="form.preferredTimeWindows[idx]"
            class="field time-window-input"
            maxlength="60"
            :placeholder="idx === 0 ? t('setup.schedule.timeWindowPlaceholder') : t('setup.schedule.timeWindowPlaceholderExtra')"
            :aria-label="idx === 0 ? t('setup.schedule.timeWindowPlaceholder') : t('setup.schedule.timeWindowPlaceholderExtra')"
          />
          <view
            v-if="form.preferredTimeWindows.length > 1"
            class="time-window-remove press-feedback"
            hover-class="press-feedback--active"
            role="button"
            :aria-label="t('setup.schedule.removeTimeWindow')"
            @tap="removeTimeWindow(idx)"
          >
            <image class="time-window-remove__text" :src="IMAGE_PATHS.ICONS_EMOJI.CLOSE" mode="aspectFit" alt="" />
          </view>
        </view>
      </view>
      <view
        class="time-window-add press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="50"
        role="button"
        :aria-label="t('setup.schedule.addTimeWindow')"
        @tap="addTimeWindow"
      >
        <text class="time-window-add__text">＋ {{ t('setup.schedule.addTimeWindow') }}</text>
      </view>
      <BottomActionBar :primary-label="t('setup.schedule.saveButton')" @primary="save" />
    </SectionCard>
  </AppShell>
</template>

<style scoped lang="scss">
/* R6-B69/D02（颜色token，2026-10-20）：输入框底色原写 var(--c-bg-page)（#EEF7F2），
   与页面底逐字同值、落在白卡上等于"没有输入底"。规范 §1.2 的输入底令牌是
   --c-bg-surface（#F3FAF6，theme/design-variables.scss:377），--c-bg-page 只留给页面/AppShell。 */
.field {
  width: 100%;
  min-height: 88rpx;
  padding: var(--sp-4) var(--sp-4);
  box-sizing: border-box;
  border-radius: var(--r-lg);
  background: var(--c-bg-surface);
  font-size: var(--fs-lg);
  color: var(--c-text-primary);
  border: var(--c-border-card);
}

.field--textarea {
  min-height: 120rpx;
}

/* review #66：多个时段输入框间距
   R6-B69/D06（间距，2026-10-20）：父级 SectionCard 的 .card__body 已是
   display:flex; gap: var(--sp-4)（SectionCard.vue:66-70），这里再写 margin-top
   就是 gap + margin 叠加（实测 16px = 声明值两倍）⇒ 间距全部交给父级 gap 统一控制。 */
.time-window-field {
  margin-top: 0;
}

/* 2026-08-10 功能补齐：时段行 + 删除按钮 */
.time-window-row {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.time-window-input {
  flex: 1;
  min-width: 0;
}

.time-window-remove {
  width: 72rpx;
  height: 72rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--r-full);
  background: var(--c-bg-surface, #EEF7F2);
}

.time-window-remove__text {
  width: 32rpx;
  height: 32rpx;
  color: var(--c-text-tertiary, #999999);
}

/* 添加时段按钮
   R6-B69/D06（间距）：删掉自带 margin-top，与上方输入框的间距交给父级 .card__body 的 gap。
   R6-B69/D08（可达性）：实测虚线盒 32px=64rpx 高，低于仓内自陈热区口径
   AppShell.vue:334 `min-height: 88rpx`（44px）⇒ 补 min-height 到同档，视觉不改。 */
.time-window-add {
  min-height: 88rpx;
  box-sizing: border-box;
  padding: var(--sp-4) var(--sp-4);
  border-radius: var(--r-lg);
  border: 1rpx dashed var(--c-border-strong, #C2CAC6);
  display: flex;
  align-items: center;
  justify-content: center;
}

.time-window-add__text {
  color: var(--c-brand, #36C99A);
  font-size: var(--fs-lg);
  font-weight: 500;
}


/* R16（2026-09-07）：页面背景统一纯白（对齐「他人显示主页」理想图色调）
   R6-B65/D17 同族顺手项：本文件与 campus/interest/recommend-pref 三页同一处裸字面量，
   一并换成 --c-bg-container（渲染值同为 #FFFFFF，零像素变化），避免逐页字面量。 */
page {
  background: var(--c-bg-container);
}

</style>

