<script setup lang="ts">
/**
 * 恋爱咨询课程（任务 E3）
 *
 * R10-P1-002（2026-09-17 全站审查）：本页带付费课程与「报名」交易动作，
 * 必须接商业化封存闸 —— commerce.consult（含总闸）为 false 时渲染封存卡，
 * 与 market 三页（ADR-2）表现一致；此前封存态下仍展示 ¥ 课程可报名。
 *
 * 支持后台配置 H5 URL：onLoad 读取 contentPageUrls.consultingUrl，
 * 非空则渲染 <web-view>；为空则只落一句「内容筹备中」弱态文案（R11-L09-D01 起，
 * 原「本地示例课程列表」已撤除——课程与价目都不再有前端常量真相源）。
 *
 * R10-P2-014：导航从绿色实心渐变头改为全站统一 AppShell（白底 + 居中标题 + 返回），
 * 同时消除该模块的状态栏叠印（R10-P1-003 家族：原 env-only 避让在 DevTools 恒 0）。
 */
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useI18n } from "vue-i18n";
import AppShell from "../../../components/layout/AppShell.vue";
import { lightHaptic } from "../../../utils/haptic";
import { contentPageUrls } from "../../../config/content-pages";
import { IMAGE_PATHS } from "../../../config/images";
// R6-L10-D16：封存态次级出口跳「帮助与客服」，路由走全站常量
import { ROUTES } from "../../../constants/routes";
import { useAppConfigStore } from "../../../stores/app-config";

const { t } = useI18n();
const appConfig = useAppConfigStore();

/** 后台配置的 H5 URL（非空时展示 web-view） */
const webUrl = ref("");

/**
 * R10-P1-002：咨询/课程属付费项目，commerce.consult 子闸（受总闸管辖）关闭即封存。
 * MP-R1-CONSULTING-001：isCommerceOn 已兼容「commerce.consult / consult」双口径，
 * 传 "consult" 等价读取 commerce.consult，注释与实现口径一致。
 * 缺省封存（=== true 才放行），mock 后端未下发 commerce.* 时恒为封存态。
 */
const commerceSealed = computed(() => !appConfig.isCommerceOn("consult"));

onLoad(() => {
  webUrl.value = contentPageUrls.consultingUrl ?? "";
});

/**
 * R11-L09-D01（P0 / 需新建）的处置：**撤除无真相源的课程与价目表**，不接任何前端常量。
 *
 * 原实现（本轮已删）：`COURSE_PRICES {99,129,159}` + 三条 `courses`（课程名/讲师/描述全取
 * i18n contentPages.consulting.course*）、`priceLabel()` 拼 ¥ 数字、`handleSignup()` 只弹 toast。
 * 页面从不请求课程接口（onLoad 只读 contentPageUrls.consultingUrl）⇒ 用户看到的是一张
 * 「可下单的价目表」，但没有任何一门课、任何一个价格有后端真相源，且 `handleSignup` 不产生任何
 * 订单。按任务书 §12.4 的合法形态二（把没有真值支撑的内容撤掉/降级为不承诺）整段撤除：
 * · 不再渲染 ¥ 价目、课程名、讲师名、课程描述、「报名」控件（P0 的承载面）；
 * · 保留后台配置的真内容出口 web-view（`contentPageUrls.consultingUrl`，非空即加载）与
 *   封存卡（R10-P1-002 的在册表现，§12.1 已判不是缺陷）；
 * · 课程区改落一句既有的弱态文案 home.consultingHint（"咨询/课程内容筹备中，敬请期待"，
 *   zh-CN.ts:654），不承诺课程、不承诺价格。
 * 需新建（交业主侧）：后端课程配置/价目真相源列（course.id/course.title/course.price/
 * course.lecturer/registration_deadline），接口就绪后按真字段恢复课程卡与报名链路。
 */

function goHelpCenter() {
  lightHaptic();
  uni.navigateTo({ url: ROUTES.HELP });
}
</script>

<template>
  <view class="content-page">
    <!-- 后台配置 H5 URL：web-view 加载（封存态优先，不下发外部付费内容） -->
    <web-view v-if="!commerceSealed && webUrl" :src="webUrl" class="content-webview" />

    <!-- R10-P1-002：商业化封存态（commerce.consult=false）→ 封存说明 + 课程预览 -->
    <AppShell v-else-if="commerceSealed" :title="t('contentPages.consulting.title')" show-back>
      <view class="consult-sealed" aria-live="polite">
        <image class="consult-sealed__icon" :src="IMAGE_PATHS.ICONS_COMMON.LOCK_SVG" mode="aspectFit" alt="" />
        <text class="consult-sealed__title">{{ t('commerce.sealedTitle') }}</text>
        <text class="consult-sealed__desc">{{ t('commerce.sealedDesc') }}</text>
        <!-- R6-L10-D16（可达性 P1）：原封存卡只有 lock 图标 + 两行字，整页唯一可交互节点是
             AppShell 返回钮 ⇒ 死端。补既有出口：跳「帮助与客服」（ROUTES.HELP + 既有 i18n 键
             help.navTitle，未新增文案）。卡另建议的「开放提醒订阅」需要订阅链路与新 i18n 键，
             属需新建目标功能，见交件报告。 -->
        <view
          class="consult-sealed__action press-feedback"
          hover-class="press-feedback--active"
          hover-stay-time="120"
          role="button"
          :aria-label="t('help.navTitle')"
          @tap="goHelpCenter"
        >
          <text class="consult-sealed__action-text">{{ t('help.navTitle') }}</text>
        </view>
      </view>

      <!-- R11-L09-D01（P0）：课程卡与 ¥ 价目表整段撤除（三档价、三条课程、三位讲师均无后端
           真相源，页面也从不请求课程接口，见脚本注释）。按 §12.4 第二种合法形态降级为
           「不承诺」：只留区块标题 + 一句既有弱态文案 home.consultingHint
           （"咨询/课程内容筹备中，敬请期待"），不留空、不再出现 ¥ 数字或可报名控件。
           上一轮 R6-L10-D14 的「封存态保留课程预览」被本条 P0 覆盖：预览的每一行都是示例常量。 -->
      <view class="content-section">
        <text class="content-section__title">{{ t('contentPages.consulting.subtitle') }}</text>
        <text class="consult-hint">{{ t('home.consultingHint') }}</text>
      </view>
    </AppShell>

    <!-- 本地示例内容 -->
    <AppShell v-else :title="t('contentPages.consulting.title')" show-back>
      <scroll-view scroll-y class="content-scroll" :show-scrollbar="false">
        <view class="content-section">
          <text class="content-section__title">{{ t('contentPages.consulting.subtitle') }}</text>
          <!-- R11-L09-D01（P0）：同封存分支，课程/价目表撤除，只留弱态文案 -->
          <text class="consult-hint">{{ t('home.consultingHint') }}</text>
        </view>
        <view class="content-footer-space" />
      </scroll-view>
    </AppShell>
  </view>
</template>

<style scoped lang="scss">
.content-page {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  /* R11-L09-D05（颜色token P3）：兜底原写 slate 私值 #f4f6fa（不在 §1.2 色表），
     改回 --c-bg-page 真值 #EEF7F2（design-variables.scss:127）。 */
  background: var(--c-bg-page, #EEF7F2);
}

.content-webview {
  flex: 1;
}

.content-scroll {
  flex: 1;
  height: 0;
}

.content-section {
  /* R6-L10-D10 同族：左右外边距取规范页边距 --page-padding(32rpx)，不用 --sp-4(16rpx)。
     R8-L09-D01（位置 P1）：本页在 AppShell 自带的 32rpx gutter（AppShell.vue:297
     `.shell--standard { padding: 0 32rpx }`）之外又叠了一次 --page-padding ⇒ 双重页边距，
     实帧封存卡/课程卡列左缘 x=32 而 AppShell 大标题墨迹左缘 x=17，整列右移 15px、
     左右留白 32/31px 是规范页边距的两倍 ⇒ 水平 gutter 归零交回 AppShell 单一来源。 */
  margin: var(--sp-5) 0;
}

.content-section__title {
  display: block;
  /* R11-L09-D02（字号 P2）：区块标题原取 --fs-lg（真值 28rpx=14px），与同页课程卡标题只差 1px，
     区块级/条目级塌成同一档。升到 §1.3 区块标题档 --fs-3xl(36rpx=18px)；
     兜底字面量同步改成令牌真值 36rpx（原 32rpx 与真值不符）。
     R11-L09-D05（颜色token P3）：兜底 #1f2937 是 slate 私值，改回 --c-text-primary 真值 #1A1E1C。 */
  font-size: var(--fs-3xl, 36rpx);
  font-weight: 700;
  color: var(--c-text-primary, #1A1E1C);
  margin-bottom: var(--sp-4);
}

/* R11-L09-D01：课程区撤除后的弱态文案（既有 i18n 键 home.consultingHint，不新增文案） */
.consult-hint {
  display: block;
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-secondary, #4A524E);
  line-height: 1.6;
}

/* ========== R10-P1-002：商业化封存卡（对齐 market/ADR-2 表现） ========== */
.consult-sealed {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-3);
  /* R8-L09-D01（位置 P1）：同上，水平 32rpx 由 AppShell gutter 唯一提供，此处只留纵向间距 */
  margin: var(--sp-6) 0;
  padding: calc(var(--sp-8) + var(--sp-4)) var(--sp-5);
  /* R6-L10-D17（圆角 P2）：卡片语义令牌 --card-radius(40rpx=20px)，原 --r-xl=24rpx 实测 12px 只有一半 */
  border-radius: var(--card-radius, 40rpx);
  background: var(--c-bg-container, #ffffff);
  box-shadow: var(--card-shadow, 0 4rpx 20rpx rgba(0, 0, 0, 0.06));
}

/* R6-L10-D16：封存卡内的次级出口（帮助与客服） */
.consult-sealed__action {
  min-height: 88rpx;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: var(--sp-3);
  padding: 0 var(--sp-6);
  border-radius: var(--r-full);
  border: 2rpx solid var(--c-brand-500, #36C99A);
}

.consult-sealed__action-text {
  font-size: var(--fs-lg, 28rpx);
  font-weight: 600;
  color: var(--c-brand-700, #1f8d6a);
}

.consult-sealed__icon {
  width: 96rpx;
  height: 96rpx;
  margin-bottom: var(--sp-2);
  /* R8-L09-D04（颜色token P2）：锁描边烘焙色 #94A3B8（static/assets/icons/common/lock.svg:1）
     是 §1.2 之外的 slate 蓝灰，再被 opacity:0.85 压到白底上实测 #A2AFC2、对比只剩 2.3:1。
     mp 的 <image> 不响应 CSS color，故按全站既有做法对已渲染位图做「去饱和 + 压暗」落到
     --c-text-tertiary 档：saturate(0) → 161 灰阶，×0.71 → ≈#737373（对白底 4.74:1，过 4.5:1），
     并去掉 :243 那条 opacity 补偿（它就是被用来「显淡」的，留着会把压暗又拉回去）。
     素材本身描边改走令牌属资产车道，见交件 HANDOFF。
     （原 opacity: 0.85 一行已删除 —— 它只负责把图标压淡，留着会把上面的压暗又拉回去。） */
  filter: saturate(0) brightness(0.71);
}

.consult-sealed__title {
  font-size: var(--fs-xl, 34rpx);
  font-weight: 700;
  /* R11-L09-D05：兜底 slate #1f2937 → §1.2 真值 #1A1E1C */
  color: var(--c-text-primary, #1A1E1C);
}

.consult-sealed__desc {
  font-size: var(--fs-sm, 26rpx);
  /* R11-L09-D05：兜底 slate #5b6470 → §1.2 真值 #4A524E */
  color: var(--c-text-secondary, #4A524E);
  text-align: center;
  line-height: 1.6;
}

/* ========== 课程列表（R11-L09-D01 撤除，样式一并删除，避免留下无消费者的行动色/价目样式） ========== */

.content-footer-space {
  height: calc(120rpx + env(safe-area-inset-bottom));
}
</style>
