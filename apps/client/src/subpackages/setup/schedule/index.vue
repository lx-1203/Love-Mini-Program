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
import { computed, onMounted, reactive, ref } from "vue";
import { IMAGE_PATHS } from "../../../config/images";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
// R15-L12-D08：注册流程进度条（第 3 步「时间安排」），与 campus:26 / recommend-pref:181 同一组件（variant 取法见模板注释）
import SetupProgress from "../../../components/setup/SetupProgress.vue";
import { useProfileStore } from "../../../stores/profile";
import { replaceAppPath } from "../../../utils/navigation";
import { SUBPACKAGE_ROUTES } from "../../../constants/routes";
import { loadIdentity } from "../../../config/identity";
// R4-batch2: 页面文案 i18n 化
import { useI18n } from "vue-i18n";

const { t } = useI18n();

/* 进度条读数随身份切（与 recommend-pref 同一写法、同一真值源 loadIdentity）：
   学生第 3/5 屏，非学生跳过校园认证后是第 2/4 屏。 */
const identity = loadIdentity();
const setupCurrentStep = computed(() => (identity === "non_student" ? 2 : 3));
const setupVariant = computed(() => (identity === "non_student" ? "non-student" : "student"));

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

/**
 * R15-L12-D10（可达性 P1）：撤回 R9-L12-D11 引入的 canSave 禁用档。
 * 该判据在空态把主 CTA 压成 --c-status-disabled #DCE5E2、并由 BottomActionBar:64 的
 * `@tap="!disabled && emit('primary')"` 吞掉点击 ⇒ 本文件 save() 里 :82-90 两条 toast 守卫
 * （locationRequired / timeWindowRequired）在空态永不可达：用户点灰钮零反馈，
 * 也不知道本步缺哪项才能交付。campus:316-320 已在 R11-L12-D09 按同一裁定去掉 :disabled
 * （按钮常亮、缺项交给 save() 的 toast 定位），本页自此与 campus 同口径。
 * canSave 的唯一消费点就是那条 :disabled，随之一并删除（tsconfig.base.json:41 noUnusedLocals）。
 */

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
    <!-- R8-L12-D06（位置）+ R8-L12-D07（尺寸比例）：主 CTA 原作为 SectionCard 的最后一个
         body 子节点（原 :141），既没吸底（BottomActionBar.vue:82 的 .bar--fixed 分支需要宿主
         显式传 fixed）又被卡体 --sp-7 内边距二次缩进 ⇒ 实测落在 y364-406、x32-345，
         悬在视口 45% 高度、按钮下方还压着 15px 白卡内边距，其下 393px（48% 视口）全是空底。
         现：① BottomActionBar 移出卡片成为其后继兄弟节点并传 fixed（贴视口底 + 安全区，
         落回拇指可及区，横向也回到 --page-padding 一档而非卡内缩进）；
         ② 按本页实际职责（常去区域 / 空闲时段两类输入，见文件头 R6-B69/D01 说明）把原来
         一整张「偏好设置」卡拆成两张分区卡，内容列纵向占比向 campus / recommend-pref 两步看齐；
         ③ 卡片与吸底条之间补 cta-spacer，吸底条不再盖住末行。
         两张卡套一层普通 view 作纵向堆叠容器——不给 SectionCard 标签本身写宿主页 scoped 类，
         因为 uni-app mp-weixin 把子组件编译成自定义组件，宿主 scoped 选择器落在组件根上不可靠
         （SafeImage 同型前例，见共享基件车道结论）。 -->
    <!-- 进度条传**真实链路位置**（2026-10-27 组件契约收敛后不再做旧表映射）：
         学生链 基本信息→校园认证→时间安排→推荐偏好→完成，本页是第 3/5 屏；
         非学生跳过校园认证，本页是其第 2/4 屏，故 variant 也要随身份切。 -->
    <SetupProgress :current-step="setupCurrentStep" :variant="setupVariant" />

    <view class="card-stack">
      <SectionCard :title="t('setup.schedule.prefTitle')" compact>
        <!-- R11-L12-D13（可达性）：本框原先只有灰占位文「常去区域」（zh-CN.ts:3223），
             输入后占位消失、画面上再无任何文字说明这一栏是什么；占位本身 #A0A2A1 压
             #F3FAF6 也只有 2.42:1，不足以承载字段语义。现按卡在框上方补一行可见标签，
             文案复用 setup.schedule 命名空间既有 key placePlaceholder（locale 属并行车道，
             不自造文案）；字段名从占位提升为常驻标签。框内占位此后曾留空，R15-L12-D09 起
             改为示例值（见下一条），不再重复字段名。
             档位与 campus .form-row__label 同值（--fs-sm / --c-text-secondary / 500）。 -->
        <text class="field-label">{{ t('setup.schedule.placePlaceholder') }}</text>
        <!-- R15-L12-D09（空态文案 P2）：:placeholder="''" 让 88rpx×296px 的框内零字符引导，
             而同一卡下方的时段框有完整示例句。仓内 setup.schedule 块（zh-CN.ts:3214-3232）
             没有「常去区域」的示例值键、locale 属并行车道不可改，故按卡给示例值直接落字面量
             （两框都没挂 placeholder-class ⇒ 与下方时段框走同一档 UA 占位灰，视觉同源）；常驻标签行不动，
             占位只承担「该怎么填」的示例，不重复字段名。 -->
        <input
          cursor-spacing="20" v-model="form.preferredCampusArea" class="field" placeholder="如：图书馆 / 北草坪" :aria-label="t('setup.schedule.placePlaceholder')" />
      </SectionCard>

      <!-- R8-L12-D07：分区二「空闲时段」。标题/副标题走仓内既有 i18n 键 homeSetup.scheduleTitle /
           scheduleSubtitle（zh-CN.ts:4795-4796，view-models/home.ts:97-98 已用同一对键描述这一步），
           语义与本页职责逐字对应。本车道可改文件只有这两个 .vue（任务书硬规矩 1），
           locale 文件属并行车道，故复用既有键、不自造文案、不编造后端数据。 -->
      <SectionCard
        :title="t('homeSetup.scheduleTitle')"
        :subtitle="t('homeSetup.scheduleSubtitle')"
        compact
      >
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
      </SectionCard>
    </view>

    <!-- R8-L12-D06：吸底条脱离文档流，正文侧自行留位（BottomActionBar.vue:18 的约定）
         R9-L12-D10（文案 P2）：原 label 取 setup.schedule.saveButton「保存并进入应用」，
         但 save() 实际 replaceAppPath 到 SETUP_PROGRESS.RECOMMEND_PREF（注册第 4 步），
         按钮承诺的终点与真实去向不一致。setup.schedule 文案块（zh-CN.ts:3219-3232）里没有
         「保存并继续」这一档，locale 属并行车道不可改，故复用同一 setup 命名空间下
         上一步 campus（campus/index.vue:306 同一个键、同一语义「保存后进下一步」）
         的 saveLabel「保存并继续」（zh-CN.ts:3208）。
         R9-L12-D11（已被 R15-L12-D10 撤回）：空态禁用档曾由 canSave 判据给出。
         R15-L12-D10（可达性 P1）：该禁用档已撤回——:disabled="!canSave || saving" 在空态
         把整条 CTA 填成 #DCE5E2 且吞掉点击，画面上没有任何「缺哪项」的就地说明，
         save() 的两条 toast 守卫也永不可达。现改为常亮可点（与 campus:316-320 同口径），
         缺项由 save() 的 toast（locationRequired / timeWindowRequired）就地定位；
         防重复提交仍由 save() 开头的 saving 守卫承担。 -->
    <view class="cta-spacer" />
    <BottomActionBar
      :primary-label="t('setup.campus.saveLabel')"
      fixed
      @primary="save"
    />
  </AppShell>
</template>

<style scoped lang="scss">
/* R8-L12-D07：两张分区卡的纵向堆叠容器（普通页面级 view，scoped 选择器必定命中）。
   卡间留 --sp-6(24rpx)，与仓内多卡页的卡片节奏一致。 */
.card-stack {
  display: flex;
  flex-direction: column;
  gap: var(--sp-6, 24rpx);
}

/* R8-L12-D06：吸底 BottomActionBar 走 position:fixed 脱离文档流，
   正文尾部自行留出吸底条高度（88rpx 按钮 + 上下 --sp-4 内边距）+ 机型安全区，
   否则「+ 添加时段」盒会被 CTA 盖住。 */
.cta-spacer {
  height: calc(152rpx + env(safe-area-inset-bottom));
  flex-shrink: 0;
}

/* R11-L12-D13：可见字段名，档位与同流程 campus 的 .form-row__label 逐条同值。
   间距交给父级 .card__body 的 gap（SectionCard 已是 flex 列 + gap），这里不再写 margin。 */
.field-label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  font-weight: 500;
}

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
  /* R9-L12-D09（可达性 P1）：原 --c-brand #36C99A 压白卡 2.12:1（帧上 y429-440 的浅绿字），
     14px 功能标签远低于正文 4.5:1，而这是「再加一个时段」的唯一入口。
     改 --c-brand-800 #156B51：对 --c-bg-container #FFFFFF 6.45:1
     （L=0.1127 ⇒ (1.0+0.05)/(0.1127+0.05)=6.45），虚线盒保留不动。 */
  color: var(--c-brand-800, #156B51);
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

