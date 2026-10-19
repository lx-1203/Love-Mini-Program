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
// R6-B66/D22（素材缺失）：返回键由「字符按 40rpx 渲染」换成包内已登记 SVG/PNG 素材，
// 与同域 tasks/album/visitors/favorites 页头同一枚 ICONS_COMMON.BACK（localPrefixes 已登记）。
import { IMAGE_PATHS } from "../../../config/images";
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

/* R6-B66/D21（颜色token，2026-10-20）：主按钮原写死
   linear-gradient(135deg, #36C99A 0%, #36C99A 100%) —— 两端同值＝纯色平铺，
   而同为注册流程的 schedule / recommend-pref 两页主按钮走 --c-gradient-brand
   （#36C99A→#55D5A7，design-variables.scss:171/386）⇒ 走完三步时最后一步的
   主按钮色相与前两页不一致。改引同一令牌，不在页面重抄渐变。 */
.interest-save {
  margin-top: 32rpx;
  padding: 24rpx 0;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-gradient-brand);
  text-align: center;
}

.interest-save__text {
  font-size: 30rpx;
  font-weight: 800;
  color: #ffffff;
}


/* R16（2026-09-07）：页面背景统一纯白（对齐「他人显示主页」理想图色调）
   R6-B65/D17 同族顺手项：裸字面量换 --c-bg-container（渲染值同为 #FFFFFF，零像素变化）。 */
page {
  background: var(--c-bg-container);
}

</style>
