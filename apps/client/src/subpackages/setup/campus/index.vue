<script setup lang="ts">
/**
 * 校园认证页（学生注册流程第 2 步 / 共 5 步）。
 *
 * 跳转链路（真实链序；2026-08-08 P0-35 把「时间安排」补回主流程）：
 *   学生：  profile(1) → campus(2) → schedule(3) → recommend-pref(4) → 完成(5)
 *   非学生：profile(1) → schedule(2) → recommend-pref(3) → 完成(4)（本页不出现）
 * 本页给 SetupProgress 传**真实链序**第 2 屏（2026-10-27 组件契约收敛，旧表映射已删），
 * 画面读数即「第 2/5 步 · 校园认证」。
 *
 * 2026-08-07 审查重构：
 * - 表单升级：城市/学校/专业由自由输入框改为三级联动选择器
 *   （城市 → 该城市高校 → 该校专业目录，全部点选、禁止手动输入，保证数据规范统一）
 * - 命名统一：页面标题与步骤名统一为「校园认证」，移除被状态栏截断的副标题
 * - 跳过入口强化：非学生/暂不认证 → 醒目文字按钮，点击进入下一步（时间安排）
 * - 空白填补：表单下方增加价值提示，降低填写顾虑
 * - 隐私说明：标题旁「?」图标，弹窗说明认证信息仅用于匹配、不会公开
 * - 按钮状态：三项未选完时主按钮不再禁用点击（R11-L12-D09），缺项由 save() 的
 *   setup.campus.errIncomplete toast 就地定位
 */
import { computed, onMounted, reactive, ref } from "vue";
// MP-R7-GUEST-LANDING：游客进引导流程同样要被引导到登录/注册（裁定：setup 不豁免），需要 onLoad 入口
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import SectionCard from "../../../components/common/SectionCard.vue";
import BottomActionBar from "../../../components/common/BottomActionBar.vue";
// 功能5：引导流程进度条（学生分支当前步骤 = 2：校园认证）
import SetupProgress from "../../../components/setup/SetupProgress.vue";
import { useProfileStore } from "../../../stores/profile";
import { SUBPACKAGE_ROUTES } from "../../../constants/routes";
import { replaceAppPath } from "../../../utils/navigation";
// R11-L12-D10：行尾箭头由字符 › 换成包内既有素材（与同域 profile 的 8 个滚轮字段同一枚）
import { IMAGE_PATHS } from "../../../config/images";
// MP-R7-GUEST-LANDING：游客进入引导流程同样必须被送到登录/注册（裁定：setup 不豁免）
import { guideGuestToLogin } from "../../../guards/guest-access";
import { lightHaptic, successHaptic } from "../../../utils/haptic";
import {
  loadSchools,
  getCities,
  getSchoolsByCity,
  getMajorsForSchool,
  type School,
} from "../../../config/schools";

const { t } = useI18n();
const profileStore = useProfileStore();
/** 跳过入口文案（非学生/暂不认证） */
const skipLabel = t("setup.campus.skipLabel");

/**
 * 表单数据：城市 / 学校名 / 专业。
 * 仅通过三级联动选择器赋值，禁止手动输入，保证地名与校名数据规范统一。
 */
const form = reactive({
  city: "",
  campusName: "",
  department: "",
});

/** 学校列表（后端 /config/campuses 优先，失败回退本地静态列表） */
const schools = ref<School[]>([]);

/** 城市选项：仅展示存在高校的城市，保证下一级必有结果 */
const cityOptions = computed(() => getCities(schools.value));

/** 学校选项：按已选城市筛选 */
const schoolOptions = computed(() => getSchoolsByCity(schools.value, form.city));

/** 当前选中的学校对象（专业选项与专业档位文案共用同一次查找） */
const selectedSchool = computed(() =>
  schoolOptions.value.find((s) => s.name === form.campusName),
);

/** 专业选项：已选学校专属目录（缺省时回退通用目录） */
const majorOptions = computed(() => getMajorsForSchool(selectedSchool.value));

/**
 * 专业档位文案（2026-10-28）：后端把 majors 的来源档一起下发，命中通用基线档时标签要写明，
 * 否则 67 条通用专业会被当成「本校专业目录」（实测 17 所学校当前全部在基线档）。
 * 档位未知（本地常量 / 旧响应没有这个键）时维持原文案——不知道就不声称。
 */
const majorOnBaseline = computed(() => selectedSchool.value?.majorsSource === "baseline");
const majorLabelKey = computed(() =>
  majorOnBaseline.value ? "setup.campus.labelMajorBaseline" : "setup.campus.labelMajor",
);
const majorPlaceholderKey = computed(() =>
  majorOnBaseline.value ? "setup.campus.placeholderMajorBaseline" : "setup.campus.placeholderMajor",
);

/** 主按钮可用性：三项信息全部完成才可继续 */
const isComplete = computed(() =>
  Boolean(form.city && form.campusName && form.department),
);

/** 保存中（防重复提交） */
const saving = ref(false);

/* ==================== 三级联动选择 ==================== */

/** 城市 picker change：更新城市并清空学校/专业（联动重置） */
function onCityChange(e: { detail: { value: number } }): void {
  const opt = cityOptions.value[e.detail.value];
  if (!opt || opt === form.city) return;
  form.city = opt;
  form.campusName = "";
  form.department = "";
  lightHaptic();
}

/** 学校 picker change：更新学校并清空专业（联动重置） */
function onSchoolChange(e: { detail: { value: number } }): void {
  const opt = schoolOptions.value[e.detail.value];
  if (!opt || opt.name === form.campusName) return;
  form.campusName = opt.name;
  form.department = "";
  lightHaptic();
}

/** 专业 picker change */
function onMajorChange(e: { detail: { value: number } }): void {
  const opt = majorOptions.value[e.detail.value];
  if (!opt || opt === form.department) return;
  form.department = opt;
  lightHaptic();
}

/* ==================== 隐私说明 ==================== */

/** 隐私说明弹窗（标题旁「?」图标触发） */
function showPrivacyInfo(): void {
  uni.showModal({
    title: t("setup.campus.privacyTitle"),
    content: t("setup.campus.privacyContent"),
    showCancel: false,
    confirmText: t("setup.campus.privacyConfirm"),
  });
}

/* ==================== 生命周期 ==================== */

/**
 * 游客落点守卫（round-7 裁定：游客一律引导到登录/注册，setup 引导流程不豁免）。
 * 本页原先对游客零门控：学校列表拉取失败会静默回退本地静态表（config/schools.ts:131-141
 * 的 loadSchools catch），mock 带下 profileStore.load() 直接吃 fixture
 * （stores/profile.ts:322），两趟都不产生 401 ⇒ 唯一的弹登录动作只剩 HTTP 401 兜底，
 * 游客可以一路点「保存/跳过」把引导流程走完（终点见 recommend-pref/index.vue 的 discover 跳转）。
 */
let guestGuarded = false;

onLoad(() => {
  if (guideGuestToLogin()) {
    guestGuarded = true;
    return;
  }
});

onMounted(async () => {
  if (guestGuarded) return;
  // 学校数据优先走后端，失败回退本地静态列表（见 loadSchools 内部兜底）
  schools.value = await loadSchools();
  await profileStore.load();
  // 回显已有校园资料（「我的 → 校园认证」补认证场景）；
  // 若历史值不在选项内（数据变更），保持空白等待用户重新选择。
  const campus = profileStore.campusProfile;
  if (campus?.city && cityOptions.value.includes(campus.city)) {
    form.city = campus.city;
  }
  if (campus?.campusName) {
    const matched = schoolOptions.value.find((s) => s.name === campus.campusName);
    if (matched) form.campusName = campus.campusName;
  }
  if (campus?.department && majorOptions.value.includes(campus.department)) {
    form.department = campus.department;
  }
});

/* ==================== 保存 / 跳过 ==================== */

/**
 * 保存校园资料并进入下一步（时间安排，真实链序第 3/5 步）。
 * 2026-08-08 P0-35 链路调整：「时间安排」回到注册主流程（原「课表导入」移出后，
 * 本页保存曾直跳推荐偏好，完成度 30+30+0=60 < 80 导致注册后全功能被锁）。
 */
/**
 * R4-00044：按来源区分保存后跳转目标。
 * - 补认证场景（campusProfile 已存在，如「我的 → 校园认证」进入）：
 *   保存后返回「我的」页，而非被带到注册流程时间安排页；
 * - 注册流程（无历史校园资料，从 setup/profile 学生分支进入）：
 *   继续时间安排步骤（完成度链路 30+30+20=80 → profileCompleted=true）。
 */
function isReauthScenario(): boolean {
  return Boolean(profileStore.campusProfile?.campusName);
}

async function save() {
  if (saving.value) return;
  if (!isComplete.value) {
    uni.showToast({ title: t("setup.campus.errIncomplete"), icon: "none" });
    return;
  }
  saving.value = true;
  try {
    await profileStore.saveCampusProfile({ ...form });
    successHaptic();
    uni.showToast({ title: t("setup.campus.saveSuccess"), icon: "success" });
    if (isReauthScenario()) {
      replaceAppPath("/pages/profile/index");
    } else {
      // P0-35 修复（2026-08-08）：注册流程补回「时间安排」步骤（原直接跳推荐偏好，
      // 完成度 30+30+0=60 < 80 → profileCompleted 恒 false → 注册后锁屏全部功能）
      replaceAppPath(SUBPACKAGE_ROUTES.SETUP_PROGRESS.SCHEDULE);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : t("setup.campus.saveFailed");
    uni.showToast({ title: message, icon: "none" });
  } finally {
    saving.value = false;
  }
}

/**
 * 跳过入口（暂不认证）。
 * 校园认证为可选项——不填写学校资料直接进入下一步（时间安排，真实链序 3/5），
 * 后续可在「我的 → 校园认证」中补认证（同校匹配能力随之解锁）。
 */
function skip() {
  // R4-00044：补认证场景跳过时同样返回「我的」页；注册流程保持完成度链路完整
  if (isReauthScenario()) {
    replaceAppPath("/pages/profile/index");
    return;
  }
  // P0-35 修复：跳过校园认证同样进入时间安排步骤（保持完成度链路完整）
  replaceAppPath(SUBPACKAGE_ROUTES.SETUP_PROGRESS.SCHEDULE);
}
</script>

<template>
  <AppShell :title="t('setup.campus.pageTitle')" :subtitle="t('setup.campus.pageSubtitle')" :show-tab-bar="false" show-back>
    <!-- 功能5：引导流程进度条（传真实链序 2，实得「第 2/5 步 · 校园认证」） -->
    <SetupProgress :current-step="2" variant="student" />

    <!-- 学校资料表单：三级联动选择器（城市 → 学校 → 专业） -->
    <SectionCard compact>
      <!-- 标题行：学校资料 + 隐私说明「?」图标 -->
      <view class="card-header">
        <text class="card-header__title">{{ t('setup.campus.sectionSchool') }}</text>
        <view
          class="card-header__help"
          role="button"
          :aria-label="t('setup.campus.privacyAria')"
          @tap="showPrivacyInfo"
        >
          <view class="card-header__help-circle">
            <text class="card-header__help-icon">?</text>
          </view>
        </view>
      </view>

      <!-- 城市 -->
      <view class="form-row">
        <text class="form-row__label">{{ t('setup.campus.labelCity') }}</text>
        <picker
          mode="selector"
          :range="cityOptions"
          :value="cityOptions.indexOf(form.city)"
          @change="onCityChange"
        >
          <view class="field field--picker">
            <text :class="['field__text', !form.city && 'field__text--placeholder']">
              {{ form.city || t('setup.campus.placeholderCity') }}
            </text>
            <image class="field__arrow" :src="IMAGE_PATHS.REGISTER_ICONS.CHEVRON_RIGHT" mode="aspectFit" alt="" />
          </view>
        </picker>
      </view>

      <!-- 学校（随城市联动） -->
      <view class="form-row">
        <text class="form-row__label">{{ t('setup.campus.labelSchool') }}</text>
        <picker
          mode="selector"
          :range="schoolOptions"
          range-key="name"
          :value="schoolOptions.findIndex((s) => s.name === form.campusName)"
          @change="onSchoolChange"
        >
          <view class="field field--picker">
            <text :class="['field__text', !form.campusName && 'field__text--placeholder']">
              {{ form.campusName || t('setup.campus.placeholderSchool') }}
            </text>
            <image class="field__arrow" :src="IMAGE_PATHS.REGISTER_ICONS.CHEVRON_RIGHT" mode="aspectFit" alt="" />
          </view>
        </picker>
      </view>

      <!-- 专业（随学校联动） -->
      <view class="form-row">
        <text class="form-row__label">{{ t(majorLabelKey) }}</text>
        <picker
          mode="selector"
          :range="majorOptions"
          :value="majorOptions.indexOf(form.department)"
          @change="onMajorChange"
        >
          <view class="field field--picker">
            <text :class="['field__text', !form.department && 'field__text--placeholder']">
              {{ form.department || t(majorPlaceholderKey) }}
            </text>
            <image class="field__arrow" :src="IMAGE_PATHS.REGISTER_ICONS.CHEVRON_RIGHT" mode="aspectFit" alt="" />
          </view>
        </picker>
      </view>
    </SectionCard>

    <!-- 2026-08-07 审查重构：价值提示（填补下半屏空白，提升填写意愿） -->
    <SectionCard compact class="value-card">
      <text class="value-card__text">{{ t('setup.campus.valueText') }}</text>
    </SectionCard>

    <!-- 2026-08-07 审查重构：跳过入口强化（醒目文字按钮，置于主按钮上方） -->
    <view class="skip-bar" role="button" :aria-label="skipLabel" @tap="skip">
      <text class="skip-bar__text">{{ skipLabel }}</text>
      <image class="skip-bar__arrow" :src="IMAGE_PATHS.REGISTER_ICONS.CHEVRON_RIGHT" mode="aspectFit" alt="" />
    </view>

    <!-- R11-L12-D11（位置 P2）：吸底 CTA 脱离文档流，正文尾部自行留出
         88rpx 按钮 + 上下 --sp-4 内边距 + 机型安全区（与 schedule:213 同档）。
         R11-L12-D09（可达性 P1）：原 :disabled="!isComplete || saving" 在三项未选全时
         把按钮压成 #DCE5E2 且 bar 的 @tap 守卫永久吞掉点击 ⇒ save() 里
         setup.campus.errIncomplete 的提示成为不可达死代码，用户点灰钮没有任何反馈。
         按卡去掉 :disabled（与 profile:1092「置灰仍可点、给定位提示」同口径）：
         按钮常亮 88rpx 可点，缺项时由 save() 内的 toast 守卫给出反馈；防重复提交
         仍由 save() 开头的 saving 守卫与 saving 置位承担。 -->
    <view class="cta-spacer" />
    <BottomActionBar
      :primary-label="saving ? t('setup.campus.saveSaving') : t('setup.campus.saveLabel')"
      fixed
      @primary="save"
    />
  </AppShell>
</template>

<style scoped lang="scss">
/* ========== 卡片标题行（学校资料 + 隐私说明） ========== */
.card-header {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
}

.card-header__title {
  font-size: var(--fs-2xl, 32rpx);
  font-weight: 700;
  color: var(--c-text-primary);
}

/* 隐私说明「?」图标：小号圆形按钮，点击弹窗说明
   R6-B65/D14（可达性 P2，2026-10-20）：可点元素原先只有 40rpx×40rpx（=20px），
   实测墨迹 52×64rpx，两种口径都低于仓内自陈热区标准 AppShell.vue:334 的 88rpx（44px），
   而它是本页唯一的信息披露入口。修法按 defect 给的「外层 88rpx 热区 + 视觉尺寸不变」：
   .card-header__help 只承担热区（88×88rpx，透明底），40rpx 圆底与描边移进
   .card-header__help-circle；margin-left: -24rpx 让圆底左缘仍落在原位置（gap 不变）。 */
.card-header__help {
  width: 88rpx;
  height: 88rpx;
  margin-left: -24rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-header__help-circle {
  width: 40rpx;
  height: 40rpx;
  border-radius: var(--r-circle, 50%);
  border: 2rpx solid var(--c-border-default);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--c-bg-page);
}

.card-header__help-icon {
  font-size: var(--fs-md);
  font-weight: 700;
  color: var(--c-text-tertiary);
  line-height: 1;
}

/* ========== 表单行（标签 + 点选字段） ========== */
.form-row {
  display: flex;
  flex-direction: column;
  gap: var(--sp-2);
}

.form-row__label {
  font-size: var(--fs-sm);
  color: var(--c-text-secondary);
  font-weight: 500;
}

.field {
  width: 100%;
  min-height: 88rpx;
  padding: 0 var(--sp-4);
  box-sizing: border-box;
  border-radius: var(--r-lg);
  /* R11-L12-D08（颜色token P2）：原 background:var(--c-bg-page) 与 :453 的页面底逐字同值
     （#EEF7F2）⇒ 输入框在白卡上「没有自己的底」，只靠描边分区；同域 schedule/index.vue:226
     与 setup/profile 同类字段已按 §1.2 走 --c-bg-surface（#F3FAF6，design-variables.scss:377）。
     本页是 R6-B69/D02 在 schedule 上已修掉的同一写法的最后一个落点 ⇒ 同档归口。 */
  background: var(--c-bg-surface, #F3FAF6);
  border: var(--c-border-card);
}

/* 选择器字段：文字 + 右侧箭头，明确「点选而非输入」 */
.field--picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field__text {
  font-size: var(--fs-lg);
  color: var(--c-text-primary);

  &--placeholder {
    color: var(--c-text-placeholder);
  }
}

.field__arrow {
  /* R11-L12-D10（素材缺失 P2）：原为字符 ›（--fs-2xl），换包内既有
     /static/assets/icons/register/chevron-right.svg（config/images.ts:961 已登记，
     同域 profile/index.vue:888 的 .field__chevron 用的就是这枚，32rpx + opacity .6）。
     图像尺寸写在 <image> 上才生效，故本类只留几何。 */
  width: 32rpx;
  height: 32rpx;
  flex-shrink: 0;
  opacity: 0.6;
}

/* ========== 价值提示（填补下半屏空白） ========== */
.value-card {
  background: var(--c-bg-brand);
  border-color: var(--c-brand-200);
}

.value-card__text {
  font-size: var(--fs-base);
  line-height: 1.7;
  /* R15-L12-D06（颜色token P2）：原 --c-brand-700 #1F8D6A 压 --c-bg-brand #E8FBF2
     实算 3.84:1（帧上最深墨 #2C9372 ⇒ 3.53:1），24rpx=12px 正文远低于 4.5:1。
     改同族下一档 --c-brand-800 #156B51：压 #E8FBF2 实算 6.00:1。
     #E8FBF2 底与 --c-brand-200 边框保留不动。 */
  color: var(--c-brand-800, #156B51);
}

/* ========== 跳过入口（强化：醒目文字按钮 + 箭头，置于主按钮上方） ========== */
.skip-bar {
  /* R10-L12-D04（可达性 P1）：非学生用户在本页唯一出口（主按钮在 3 个字段填全前一直禁用 :307），
     原纵向 padding --sp-4(8rpx)+--sp-2(4rpx) 整行实测 ~48–56rpx(<88rpx)。按本页帮助徽标
     (.card-header__help :331-335) 同款手法补 min-height:88rpx + box-sizing:border-box；
     既有 flex 两轴居中 ⇒ 文字视觉位置不变、热区抬到 44px。 */
  min-height: 88rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--sp-1);
  padding: var(--sp-4) 0 var(--sp-2);
}

.skip-bar__text {
  font-size: var(--fs-md);
  /* R15-L12-D05（可达性 P1）：原 --c-brand-700 #1F8D6A 压页面底 --c-bg-page #EEF7F2
     实算 3.79:1（帧上最深墨 #2C9372 ⇒ 3.48:1），而跳过入口是非学生用户在本页的唯一出口
     （主按钮三项未选全前不可用）。改同族下一档 --c-brand-800 #156B51：同底实算 5.91:1。
     字号 26rpx、下划线、.skip-bar 的 88rpx 热区均不动。 */
  color: var(--c-brand-800, #156B51);
  font-weight: 600;
  text-decoration: underline;
}

.skip-bar__arrow {
  /* R11-L12-D10：:302 跳过入口的字符 › 一并换成 chevron-right.svg（同一枚素材、同源色 #4A524E），
     尺寸取下一档 28rpx 以匹配 --fs-lg 文字行高。 */
  width: 28rpx;
  height: 28rpx;
  flex-shrink: 0;
}

/* R11-L12-D11：吸底 BottomActionBar 走 position:fixed 脱离文档流，
   正文尾部留出「88rpx 按钮 + 上下 --sp-4 内边距 + 机型安全区」，否则末行会被 CTA 盖住。
   与同域 schedule/index.vue:213 的 .cta-spacer 同值。 */
.cta-spacer {
  height: calc(152rpx + env(safe-area-inset-bottom));
  flex-shrink: 0;
}


/* R10-L12-D03（颜色token P2）：R16（2026-09-07）为对齐"他人显示主页"理想图把页面底定成纯白
   --c-bg-container #FFFFFF，但底部动作条区是 --c-bg-page #EEF7F2（BottomActionBar.vue:90），
   帧上"保存并继续"条上缘可见一条白→浅绿横向断层、页头区整片白底与全站浅绿底不符。
   与规范 §1.1（页面底取 --c-bg-page，全站 AppShell/动作条同档）冲突 ⇒ 按卡上定档回退到 --c-bg-page。 */
page {
  background: var(--c-bg-page, #EEF7F2);
}

</style>
