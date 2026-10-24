<template>
  <!--
    统一标签页组件 BaseTabs
    - 支持三种样式变体：underline（下划线）、pill（胶囊）、block（块状）
    - 支持横向滚动（scrollable）和等分宽度（equalSplit）
    - 支持徽章（数字 > 99 显示 99+）
    - 通过 CSS 变量适配暗色主题
  -->
  <view
    class="base-tabs"
    :class="[`base-tabs--${variant}`, { 'is-scrollable': scrollable }]"
    role="tablist"
  >
    <scroll-view
      v-if="scrollable"
      scroll-x
      :scroll-into-view="`tab-${modelValue}`"
      scroll-with-animation
      class="base-tabs-scroll"
    >
      <view class="base-tabs-list">
        <view
          v-for="tab in tabs"
          :id="`tab-${tab.key}`"
          :key="tab.key"
          class="base-tab-item"
          :class="{ 'is-active': isActive(tab.key) }"
          hover-class="base-tab-item--pressed"
          :hover-stay-time="80"
          @tap="handleClick(tab)"
          role="tab"
          :aria-selected="isActive(tab.key)"
          :aria-label="tab.label"
        >
          <text class="base-tab-label">{{ tab.label }}</text>
          <view
            v-if="tab.badge !== undefined && tab.badge !== null && tab.badge !== ''"
            class="base-tab-badge"
            :style="badgeStyleFor(isActive(tab.key))"
          >{{ formatBadge(tab.badge) }}</view>
          <view v-if="variant === 'underline'" class="base-tab-underline" />
        </view>
      </view>
    </scroll-view>

    <view v-else class="base-tabs-list">
      <view
        v-for="tab in tabs"
        :key="tab.key"
        class="base-tab-item"
        :class="{ 'is-active': isActive(tab.key) }"
        :style="equalSplit ? { flex: '1 1 0' } : {}"
        hover-class="base-tab-item--pressed"
        :hover-stay-time="80"
        @tap="handleClick(tab)"
        role="tab"
        :aria-selected="isActive(tab.key)"
        :aria-label="tab.label"
      >
        <text class="base-tab-label">{{ tab.label }}</text>
        <view
          v-if="tab.badge !== undefined && tab.badge !== null && tab.badge !== ''"
          class="base-tab-badge"
          :style="badgeStyleFor(isActive(tab.key))"
        >{{ formatBadge(tab.badge) }}</view>
        <view v-if="variant === 'underline'" class="base-tab-underline" />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
/**
 * BaseTabs 统一标签页组件
 *
 * 使用方式：
 * <BaseTabs v-model="activeKey" :tabs="tabs" variant="underline" />
 */

import { computed } from "vue";
// R4-batch4: 徽章底色兜底色值统一引自 designTokens（theme/tokens.ts），避免 JS 侧硬编码
import { designTokens } from "../../theme/tokens";

/** 单个 Tab 配置 */
export interface BaseTab {
  /** 唯一标识 */
  key: string;
  /** 显示文本 */
  label: string;
  /** 可选徽章：数字（>99 显示 99+）或字符串 */
  badge?: number | string;
}

interface Props {
  /** Tab 列表 */
  tabs: BaseTab[];
  /** 当前激活的 tab key（v-model） */
  modelValue: string;
  /** 样式变体：underline（下划线）/ pill（胶囊）/ block（块状） */
  variant?: "underline" | "pill" | "block";
  /** 是否支持横向滚动（默认 false，与 equalSplit 互斥） */
  scrollable?: boolean;
  /** 是否等分宽度（默认 true，scrollable=true 时失效） */
  equalSplit?: boolean;
  /** 激活颜色（默认使用品牌色 CSS 变量） */
  activeColor?: string;
  /** 徽章背景色（默认使用品牌色） */
  badgeColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: "underline",
  scrollable: false,
  equalSplit: true,
  activeColor: "",
  badgeColor: "",
});

const emit = defineEmits<{
  (e: "update:modelValue", key: string): void;
  (e: "change", key: string, tab: BaseTab): void;
}>();

/** 当前激活颜色：优先使用 props 传入，否则使用品牌色 CSS 变量 */
// 修复（严格模式 noUnusedLocals）：activeColorValue 计算属性未被模板/脚本引用，
// 模板内通过 CSS 类切换激活样式，无需读取 activeColor 值，故移除。
/* R14-L06-D11（颜色token P1 · likes top 帧）连带：徽章底原取 --c-brand #36C99A
   （design-variables.scss:270 → $brand-500 :15），前景是 .95 透明白 ⇒ 白字压 #36C99A
   实测 2.10:1（与本页签选中态同一个数，见样式段），低于正文 4.5:1。
   与选中态胶囊同批归到全站「深绿实心 + 白字」口径：底色改 --c-brand-800 #156B51
   （design-variables.scss:18 / theme/tokens.ts:27 同值），纯白压其 6.45:1。
   ⚠️ 为什么必须连带改徽章：选中态胶囊底本轮从 #36C99A 换成 #156B51，徽章若仍吃 #36C99A
   就从「与底同色（整块 2.10:1）」变成「深色胶囊上的一枚亮绿孤岛，孤岛上的白字仍是 2.10:1」
   —— 把一条没修的低对比从隐身改成显身，等于新增缺陷。
   未传 badgeColor 的消费点全仓只有 likes/index.vue:433-435 一处（BaseTabs 全仓唯一消费者，
   grep "<BaseTabs" 证；badgeColor/badgeColor prop 无任何调用点传值，已 grep 证）⇒ 零外溢。 */
const badgeColorValue = computed(() => props.badgeColor || `var(--c-brand-800, ${designTokens.color.brand[800]})`);

/**
 * 徽章内联样式。
 *
 * R15-L06-D11（颜色token P2 · likes top 帧）：R14-L06-D11 把选中胶囊底从 #36C99A 换到
 * --c-brand-800（:301），却没复算「徽章默认底也是 --c-brand-800」（:137）——同色共存后
 * 徽章圆片在帧上整枚消失，只剩一枚裸白「1」；未选中行的徽章仍是深片压浅底、清晰成块。
 * 对比度本身没坏（白字压 brand-800 仍 6.45:1），坏的是「片 vs 底」这对非文本边界 = 1:1。
 * 修法取卡上第一条（选中行反相）：徽章底 --c-neutral-0 纯白 + 字 --c-brand-800，
 * 白片压 #156B51 胶囊 = 6.45:1（≥非文本 3:1），片内 brand-800 字压白片 = 6.45:1（≥正文 4.5:1），
 * 两个方向同时达标；未选中行（深片压 --c-bg-page #EEF7F2 = 5.91:1）一个像素不动。
 * 只在 variant 有实心选中底（pill / block）时反相：underline 变体选中行无底色，
 * 深片仍成立，不动。只在消费点未显式传 badgeColor 时反相：传了自定义色即由消费点自管
 * 徽章取色，组件不去猜它与选中底的关系（全仓当前零调用点传值，见 :135 注）。
 */
function badgeStyleFor(active: boolean): Record<string, string> {
  if (active && props.variant !== "underline" && !props.badgeColor) {
    return {
      backgroundColor: "var(--c-neutral-0, #FFFFFF)",
      color: badgeColorValue.value,
    };
  }
  return { backgroundColor: badgeColorValue.value };
}

/** 判断 tab 是否激活 */
function isActive(key: string): boolean {
  return key === props.modelValue;
}

/** 处理 tab 点击 */
function handleClick(tab: BaseTab): void {
  if (isActive(tab.key)) return;
  emit("update:modelValue", tab.key);
  emit("change", tab.key, tab);
}

/** 格式化徽章显示：数字超过 99 显示 99+ */
function formatBadge(badge: number | string): string {
  if (typeof badge === "number") {
    if (badge > 99) return "99+";
    return String(badge);
  }
  return badge;
}
</script>

<style lang="scss" scoped>
/* P3 修复：扁平化 SCSS 嵌套（原 4 层嵌套 → 最多 2 层），使用 BEM 风格命名提升可读性
   原 .base-tabs--pill > .base-tab-item > &.is-active > .base-tab-label 改为平级 .base-tabs--pill .base-tab-item.is-active .base-tab-label */

.base-tabs {
  width: 100%;
  // 使用 design tokens，自动适配主题
  background: var(--c-bg-container, #FFFFFF);
}

.base-tabs.is-scrollable .base-tabs-list {
  display: inline-flex;
  white-space: nowrap;
}

.base-tabs-list {
  display: flex;
  align-items: center;
  width: 100%;
  // 底部分隔线
  border-bottom: 1rpx solid var(--c-divider-light, rgba(15, 23, 42, 0.06));
}

.base-tab-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-5) var(--sp-6);
  // 过渡动画
  transition: all var(--d-base, 300ms) ease;
}

/* mp-weixin hover-class 按压态；H5 通过 :active 实现 */
.base-tab-item--pressed {
  opacity: 0.7;
}

.base-tab-label {
  font-size: var(--fs-lg, 28rpx);
  color: var(--c-text-secondary, #666666);
  transition: color var(--d-base, 300ms) ease, font-weight var(--d-base, 300ms) ease;
}

.base-tab-badge {
  margin-left: var(--sp-2);
  /* 固定布局尺寸（徽章 32rpx），无对应 token */
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 var(--sp-2);
  border-radius: var(--r-lg, 16rpx);
  font-size: var(--fs-sm, 22rpx);
  /* R14-L06-D11 连带：原 --c-text-inverse（= rgba(255,255,255,.95)，design-variables.scss:369）
     的语义是「图片遮罩白字」，用作实心色片前景属令牌误配，且那 5% 透明白把
     白压 brand-800 从 6.45:1 削到 6.01:1 —— 与 EmptyState.vue:241-248、
     LegalTextPage.vue:568 的已修口径一致，归位到 --c-neutral-0（纯白）。 */
  color: var(--c-neutral-0, #FFFFFF);
  line-height: 32rpx;
  text-align: center;
}

.base-tab-underline {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 48rpx;
  height: 4rpx; /* 固定布局尺寸（下划线厚度），无对应 token */
  border-radius: var(--r-xs, 4rpx);
  background: var(--c-brand, #36C99A);
  transition: transform var(--d-base, 300ms) cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 激活态：标签文字加粗 + 下划线展开 */
.base-tab-item.is-active .base-tab-label {
  color: var(--c-text-primary, #222222);
  font-weight: 600;
}

.base-tab-item.is-active .base-tab-underline {
  transform: translateX(-50%) scaleX(1);
}

/* 胶囊变体（扁平化：避免 4 层嵌套） */
.base-tabs--pill .base-tabs-list {
  border-bottom: none;
  gap: var(--sp-4);
  padding: var(--sp-4) var(--sp-6);
}

.base-tabs--pill .base-tab-item {
  padding: var(--sp-3) var(--sp-7);
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-page, #EEF7F2);
}

.base-tabs--pill .base-tab-label {
  font-size: var(--fs-md, 26rpx);
  /* R9-L06-D09（尺寸比例 P2 · likes）：equal-split=true 时每枚 tab 拿的是
     `flex:1 1 0`（模板 :52 的内联样式）≈1/3 容器宽；likes 页 third=「喜欢我的」4 字、
     second=「我发出的喜欢」5 字，26rpx 下光字形就需 104 / 130rpx，而内容盒
     （1/3 宽 − pill 内距 2×--sp-7 − badge 32rpx+8rpx）只剩 ~88rpx ⇒ 这两个 label
     各折成两行，前两枚 pill 高度约为第三枚的 1.7 倍（帧测）。
     补单行 + 溢出省略：三枚回到等高；min-width:0 是让 flex 项能收缩到 min-content 以下
     （否则 nowrap 会把 pill 顶宽、挤掉邻居），ellipsis 需要 overflow:hidden 才出省略号。
     不放开 flex 基宽（改成 1 1 auto 会改掉 equalSplit 对全站 pill 消费点的等分语义）。 */
  display: block;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* R14-L06-D11（颜色token P1 · likes/index top 帧「喜欢我的 1」）：选中态出口漏改。
   原底 var(--c-brand)（真值 36C99A，:266）+ 前景 var(--c-text-inverse)（= rgba(255,255,255,.95)，:270）
   ⇒ 帧上实测底 RGB(54,201,154) 逐像素同值，13px（--fs-md 26rpx）页签白字对比 =
     (1.0+0.05)/(0.44896+0.05) = 2.10:1，不达正文 4.5:1（本环境裸 node 复算，与
     EmptyState.vue:222-227 记的同一条数一致）。
   同一判据 R10-L06-D18 已在 EmptyState.vue:230 收口过（空态主按钮底 → --c-brand-800），
   pill / block 两个变体的选中态是漏网的同型出口 ⇒ 复用同档同口径，不自创值：
   --c-brand-800（真值 156B51，design-variables.scss:18）压纯白 = 6.45:1 ≥ 4.5:1。
   卡上第二条口径（浅绿底 + brand-800 深绿字，同分包 nearby/people.vue:372-380 的
   `.people-tab--active`：--c-brand-100 底 + --c-brand-800 字，复算 5.49:1）不取，
   理由是这里的「选中」信号算不过账：本组件非选中胶囊的底是 --c-bg-page（真值 EEF7F2），
   而 --c-brand-100（D1F5E7）压它只有 1.07:1 —— people.vue 那一页靠 2rpx 描边撑块边界，
   本胶囊没有描边档，浅底档会把「选中 / 未选中」两块压成同一块；
   深档 --c-brand-800 压非选中底 EEF7F2 = 5.91:1（LegalTextPage.vue 吸底条注、
   LockScreen.vue .lock-screen__btn-link-text 注两处同数实算），
   选中态在帧上是唯一深块，一眼分得出。
   另外浅底档下徽章（--c-brand 底 + 白字 2.10:1）会原样留在选中胶囊里，
   深底白字档连同前景一起归到已修口径，不留第二个 2.10:1 出口。 */
.base-tabs--pill .base-tab-item.is-active {
  background: var(--c-brand-800, #156B51);
}

/* R15-L06-D11（颜色token P2 · likes top 帧）：选中行徽章改由脚本反相（白片 + brand-800 字，
   badgeStyleFor 内联输出；内联样式优先级高于本段类规则，故不在此处写 background 覆盖），
   理由与实算见 script 段 badgeStyleFor 上方注。 */

.base-tabs--pill .base-tab-item.is-active .base-tab-label {
  color: var(--c-neutral-0, #FFFFFF);
}

/* 块状变体（扁平化：避免 4 层嵌套） */
.base-tabs--block .base-tabs-list {
  border-bottom: none;
  gap: var(--sp-3);
  padding: var(--sp-4) var(--sp-6);
}

.base-tabs--block .base-tab-item {
  padding: var(--sp-4) var(--sp-6);
  border-radius: var(--r-md, 12rpx);
  background: var(--c-bg-page, #EEF7F2);
}

.base-tabs--block .base-tab-label {
  font-size: var(--fs-md, 26rpx);
}

/* R14-L06-D11 同型出口：block 变体的选中态与 pill 是同一对写死的
   `--c-brand` 底 + `--c-text-inverse` 前景（原 :291 / :295），同一把尺一次收口。
   当前全仓无 block 消费者（grep variant="block" = 0 命中），改它是为了不留第二个
   2.10:1 的出口给下一个调用点，对本批帧零像素影响。 */
.base-tabs--block .base-tab-item.is-active {
  background: var(--c-brand-800, #156B51);
}

.base-tabs--block .base-tab-item.is-active .base-tab-label {
  color: var(--c-neutral-0, #FFFFFF);
}

// scroll-view 兼容
.base-tabs-scroll {
  width: 100%;
  white-space: nowrap;
}
</style>
