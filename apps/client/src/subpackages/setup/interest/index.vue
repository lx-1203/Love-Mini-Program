<script setup lang="ts">
/**
 * 兴趣选择（v3.1 契约 11 / 14）：注册引导可跳过；主动进入必须 ≥3 个才能保存。
 */
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
// MP-R9-STATUS-005：注入 --statusbar（DevTools env 恒 0，标题叠印状态栏）
import { useMenuButtonRect } from "../../../composables/useMenuButtonRect";
import { useI18n } from "vue-i18n";
import { clientApi } from "../../../services/api";
// R6-B66/D22（素材缺失）：返回键由「字符按 40rpx 渲染」换成包内已登记 SVG/PNG 素材，
// 与同域 tasks/album/visitors/favorites 页头同一枚 ICONS_COMMON.BACK（localPrefixes 已登记）。
import { IMAGE_PATHS } from "../../../config/images";
import TagSelector from "../../../components/profile/TagSelector.vue";
import type { ProfileTagGroupKey } from "../../../config/profile-tags";
// R11-L12-D19/D20/D22：主 CTA 换成共享吸底动作条（同域 schedule/campus 同一组件）
import BottomActionBar from "../../../components/common/BottomActionBar.vue";

const { t } = useI18n();
const { styleVars: menuStyleVars } = useMenuButtonRect();

const selected = ref<Partial<Record<ProfileTagGroupKey, string[]>>>({ interest: [] });
const saving = ref(false);

/** 已选兴趣数（「至少 3 个」约束的唯一计数口） */
const interestCount = computed(() => selected.value.interest?.length ?? 0);
/**
 * 是否满足「至少 3 个」。**只用于行内提示的显隐，不再挂到主按钮的 :disabled 上**：
 * R11-L12-D20 曾按选中数把 CTA 压成 BottomActionBar 的 --c-status-disabled 灰档，
 * 而组件 :64 的 `@tap="!disabled && emit('primary')"` 会连同点击一起吞掉
 * ⇒ handleSave 开头那条 `interestSelect.minThree` 守卫在 <3 时永不可达，
 * 用户点灰钮零反馈、也读不到这条约束的成句提示（同域 campus 已在 R11-L12-D09
 * 按同一裁定去掉 :disabled，schedule 已在 R15-L12-D10 撤回 canSave 禁用档）。
 * 现与另两页同口径：CTA 常亮可点，缺项由点击给出「toast + 行内提示」双通道。
 */
const canSave = computed(() => interestCount.value >= 3);
/**
 * 行内提示（复用 setup/profile 的 errors.<field> 口径：点过主按钮才出现，
 * 选够 3 个由 `!canSave` 自动消隐；文案取本页既有的 interestSelect.minThree，
 * 不新增 locale 条目）。
 */
const minThreeHint = ref(false);

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
    // 「至少 3 个」约束的两条反馈通道：行内常驻（模板 v-if）+ 即时 toast
    minThreeHint.value = true;
    uni.showToast({ title: t("interestSelect.minThree"), icon: "none" });
    return;
  }
  minThreeHint.value = false;
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
/**
 * MP-R1-REQ24-INTEREST-001：补返回键——本页为主动进入的设置页（我的→兴趣选择），
 * 全局 navigationStyle=custom 无系统返回栏且此前无任何返回/跳过出口，不选满 3 个
 * 保存就无法回「我的」（仅剩系统手势），构成导航死路
 */
function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: "/pages/profile/index" });
  }
}
</script>

<template>
  <view class="interest-page" :style="menuStyleVars">
    <view class="interest-header">
      <!-- R6-B66/D23（位置，2026-10-20）：原 .interest-header__row 把返回键与标题组排成
           一行 ⇒ 实测标题左缘 x=56、副标题 x=55，而本页其余内容（"选择你的标签"、chip、
           保存按钮）左缘都是 x=16（= 页面 padding-left 32rpx）⇒ 标题与正文左轴差 40px。
           按建议改法把返回键移出标题行、做成标题上方的独立行，标题/副标题回到 16px 主轴。
           R6-B66/D24（可达性）：返回键热区由 64rpx 提到 88rpx（仓内口径 AppShell.vue:334），
           视觉圆底仍 64rpx（.interest-header__back__circle），靠外层热区 + 负 margin 保持
           圆底原位不偏移；D22：箭头改用包内素材，不再用字符。 -->
      <view
        class="interest-header__back press-feedback"
        hover-class="press-feedback--active"
        hover-stay-time="120"
        role="button"
        :aria-label="t('common.back')"
        @tap="goBack"
      >
        <view class="interest-header__back-circle">
          <image class="interest-header__back-icon" :src="IMAGE_PATHS.ICONS_COMMON.BACK" mode="aspectFit" alt="" />
        </view>
      </view>
      <view class="interest-header__texts">
        <text class="interest-header__title">{{ t('interestSelect.title') }}</text>
        <text class="interest-header__sub">{{ t('interestSelect.subtitle') }}</text>
      </view>
    </view>

    <!-- MP-R1-SETUPINTEREST-003：仅展示「兴趣」组——本页初始化/回填/校验/保存均只处理
         interest 一组，原全量渲染 4 组使其余 3 组可见可选、保存即静默丢弃 -->
    <TagSelector v-model="selected" :groups="['interest']" />

    <!-- 「至少 3 个」的就地提示（点过主按钮后常驻，选够 3 个自动消隐）。
         样式复用本页既有 .interest-header__sub 档（24rpx / --c-text-secondary），
         不新增 <style> 规则、不新增文案（key = interestSelect.minThree）。 -->
    <text v-if="!canSave && minThreeHint" class="interest-header__sub">{{ t('interestSelect.minThree') }}</text>

    <!-- R11-L12-D22（位置 P2）：原自建按钮盒只在文档流里 margin-top:32rpx，帧上按钮占
         y=399..443（视口 54%），其下 371px=46% 视口是纯 #EEF7F2 空底 ⇒ 拇指自然位点不到
         本页唯一主操作。换成同域 schedule/campus 的 BottomActionBar（fixed 吸底 +
         safe-area 内边距），正文尾部用 .cta-spacer 让位。
         R11-L12-D19（可达性 P1）：自建按钮原走 --c-gradient-brand，帧实测底 #46CC9E、
         白字 #FDFEFE = 2.00:1；BottomActionBar 主键已按 R9 定档 --c-brand-800 #156B51
         （纯白 6.45:1，组件 :104-110），本页不再自抄渐变。
         本轮（注册链缺陷 5）：① 去掉 :disabled="!canSave || saving"——组件 :64 的
         `!disabled && emit('primary')` 会连点击一起吞掉，使「至少 3 个」的提示永不可达；
         防重复提交仍由 handleSave 开头的 saving 守卫承担，与 campus/schedule 同口径。
         ② 保存进行中的文案原误用 common.loading（zh-CN.ts:15「加载中...」，是拉取语义），
         换成同域 campus 既有的 setup.campus.saveSaving（zh-CN.ts:3204「保存中...」/
         en-US.ts:3314 "Saving..."）——schedule:220 已有跨页复用 setup.campus.saveLabel 的先例，
         不新增 locale 条目。 -->
    <view class="cta-spacer" />
    <BottomActionBar
      :primary-label="saving ? t('setup.campus.saveSaving') : t('interestSelect.save')"
      fixed
      @primary="handleSave"
    />
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

/* MP-R1-REQ24-INTEREST-001：返回键
   R6-B66/D23：原 __row 一行布局已删除，返回键独立成行（标题回到正文左轴）。
   R6-B66/D24：外层 .interest-header__back 是热区（88rpx=44px，AppShell.vue:334 口径），
   内层圆底保持 64rpx 视觉不变；margin-left: -12rpx 让圆底左缘仍落在 32rpx 页边距上。 */
.interest-header__back {
  width: 88rpx;
  height: 88rpx;
  margin-left: -12rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.interest-header__back-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-line, #EEF2F0);
  display: flex;
  align-items: center;
  justify-content: center;
}

/* R6-B66/D22：字符箭头换成包内素材（ICONS_COMMON.BACK），尺寸与同域页头同档 */
.interest-header__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.interest-header__texts {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
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

/* R11-L12-D22：吸底 CTA 脱离文档流后，正文尾部自行留出
   88rpx 按钮 + 上下 --sp-4 内边距 + 机型安全区（与 schedule/index.vue:213 同值）。
   本页根容器是 flex 列，补 flex-shrink:0 防止内容变长时占位被压缩。 */
.cta-spacer {
  height: calc(152rpx + env(safe-area-inset-bottom));
  flex-shrink: 0;
}

/* R11-L12-D19/D22 连带删除：原 .interest-save / .interest-save__text 两个类随自建按钮盒
   一并出表——按钮已换 BottomActionBar（:122-124 → 模板 CTA 段），留着重叠规则只会让下一轮
   误判「渐变按钮还在」。原 R6-B66/D21 的渐变口径由组件 --c-brand-800 承担。 */


/* R16（2026-09-07）：页面背景统一纯白（对齐「他人显示主页」理想图色调）
   R6-B65/D17 同族顺手项：裸字面量换 --c-bg-container（渲染值同为 #FFFFFF，零像素变化）。 */
page {
  background: var(--c-bg-container);
}

</style>
