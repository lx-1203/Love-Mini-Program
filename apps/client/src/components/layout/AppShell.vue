<script setup lang="ts">
/**
 * AppShell 应用布局组件
 *
 * 三种变体：
 * - standard：标准头部（标题 + 副标题 + 可选返回按钮 + 右侧操作区）
 * - immersive：沉浸型（无显式头部，内容延伸到顶部状态栏）
 * - minimal：简洁型（仅安全区适配，无头部）
 *
 * 特性：
 * - 自动适配顶部 statusBar 和底部 TabBar 安全区
 * - 支持背景渐变（品牌主色到背景色）
 * - 支持自定义背景图
 */

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { IMAGE_PATHS } from '@/config/images';

/** R4-00994: 非 H5 端 pageScrollTo 滚动动画时长（毫秒），与 --d-normal 对齐 */
const PAGE_SCROLL_DURATION_MS = 200;

interface Props {
  /** 布局变体 */
  variant?: 'standard' | 'immersive' | 'minimal';
  /** 标题 */
  title?: string;
  /**
   * 副标题：渲染在**标题之下**（R6-L14-D13）。
   * 此前 subtitle 被塞进 eyebrow 槽位渲染在标题之上，而 9 个宿主传的都是描述性副标题
   * （setup.campus.pageSubtitle / setup.schedule.pageSubtitle / feedback.pageSubtitle /
   * help.subtitle / security.subtitle / discussions.subtitle / activities.sectionSubtitle /
   * feedback.historyEmptyDesc）⇒ 实测「认证后解锁同校专属匹配与校友圈子」(y108-118)
   * 压在「校园认证」(y128-148) 之上，页头层级倒置。
   * 需要「标题上方小标签」的语义请改用下面的 eyebrow。
   */
  subtitle?: string;
  /** 眉标（eyebrow）：渲染在标题**之上**的小标签，如「XUNMI · CAMPUS」 */
  eyebrow?: string;
  /** 是否显示返回按钮 */
  showBack?: boolean;
  /** 背景变体 */
  bgVariant?: 'default' | 'gradient' | 'image';
  /** 背景图（bgVariant='image' 时生效） */
  bgImage?: string;
  /** 头部是否固定（吸顶）。R8-L07-D15：默认改成 true，见 fixed 字段注释 */
  fixed?: boolean;
  /** 是否适配顶部安全区（默认 true） */
  safeArea?: boolean;
  /** 是否适配 TabBar 底部安全区（默认 true） */
  tabBarSafe?: boolean;
  /** MP-R2-APP-001：兼容历史调用方的无效属性（:show-tab-bar="false"）——映射到 tabBarSafe */
  showTabBar?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'standard',
  title: '',
  subtitle: '',
  eyebrow: '',
  showBack: false,
  bgVariant: 'default',
  bgImage: '',
  /* R8-L07-D15：吸顶改成默认行为。此前 fixed 默认 false，而 security/index.vue:540、
     love-center/index.vue:115、help/index.vue:88 等宿主都只传 show-back 没传 fixed
     ⇒ :331 的 .is-fixed 吸顶分支不生效，滚到底时列表首行齐根切在视口上沿、
     「下线」胶囊(y24..39)与系统状态栏图标(y14..30)叠印。已显式传 fixed 的四个宿主
     (feedback/index、LegalTextPage、activities、circles) 行为不变；需要非吸顶的页面
     显式传 :fixed="false" 退出。 */
  fixed: true,
  safeArea: true,
  tabBarSafe: true,
  /* MP-R2-APP-001：默认 undefined → 不影响 tabBarSafe 旧行为 */
});

const emit = defineEmits<{
  (e: 'back'): void;
}>();

const { t } = useI18n();

/** 计算容器类名 */
const shellClass = computed(() => [
  'shell',
  `shell--${props.variant}`,
  `shell-bg--${props.bgVariant}`,
  {
    'is-fixed': props.fixed,
  },
]);

/** 计算容器样式 */
const shellStyle = computed(() => {
  const style: Record<string, string> = {};
  if (props.bgVariant === 'image' && props.bgImage) {
    style.backgroundImage = `url(${props.bgImage})`;
    style.backgroundSize = 'cover';
    style.backgroundPosition = 'center top';
    style.backgroundRepeat = 'no-repeat';
  }
  return style;
});

/** 状态栏高度（px）：微信小程序 var(--statusbar, env(safe-area-inset-top)) 在模拟器/部分机型为 0，
 * 必须用 getSystemInfoSync().statusBarHeight 注入，否则自定义导航与状态栏叠印（2026-08-29 视觉验收修复） */
const statusBarHeightPx = (() => {
  try {
    const info = uni.getSystemInfoSync();
    return Number(info.statusBarHeight ?? 0) || 0;
  } catch (_e) {
    return 0;
  }
})();

/** 头部样式 */
const headerStyle = computed(() => {
  if (!props.safeArea) return {};
  // 状态栏高度优先用系统能力值，env() 仅作兜底叠加
  return {
    paddingTop: `${statusBarHeightPx + 8}px`,
  };
});

/** 底部内边距 */
const bodyPaddingBottom = computed(() => {
  // MP-R2-APP-001：显式 :show-tab-bar="false" 视为关闭 tabBar 底部适配
  if (props.showTabBar === false) return '0';
  if (!props.tabBarSafe) return '0';
  return 'calc(env(safe-area-inset-bottom) + 180rpx)';
});

/** 处理返回按钮点击 */
function handleBack(): void {
  emit('back');
  // 默认行为：返回上一页
  // #ifdef MP-WEIXIN
  // mp-weixin 的 uni.navigateBack 不返回 Promise，必须使用 success/fail 回调风格
  uni.navigateBack({
    delta: 1,
    fail: () => {
      // 2026-08-12 修复：无上一页（编辑资料/注册流程经 redirectTo/switchTab 进入，
      // 页面栈被替换）时静默失败会让用户以为「返回按钮点了没反应」——
      // 回退到首页 tab，保证退出编辑/退出流程永远可响应
      uni.switchTab({
        url: '/pages/home/index',
        fail: () => {
          // 极端兜底：switchTab 也失败时 reLaunch 首页
          uni.reLaunch({ url: '/pages/home/index' });
        },
      });
    },
  });
  // #endif
  // #ifndef MP-WEIXIN
  // H5 / App 端：navigateBack 返回 Promise，使用 catch 处理失败
  uni.navigateBack({ delta: 1 }).catch(() => {
    uni.switchTab({ url: '/pages/home/index' }).catch(() => {
      uni.reLaunch({ url: '/pages/home/index' });
    });
  });
  // #endif
}

/**
 * P6 a11y：Skip link 点击/键盘触发时，将焦点移到主内容区。
 * 通过 id="shell-main-content" 让屏幕阅读器与键盘用户跳过头部导航直达内容。
 * 兼容性：mp-weixin 不支持 DOM focus API，使用 uni.pageScrollTo 滚动到内容区作为兜底。
 */
function focusMainContent(): void {
  // #ifdef H5
  const el = document.getElementById('shell-main-content');
  if (el) {
    el.focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  // #endif
  // #ifndef H5
  // mp-weixin / APP 端：无 DOM API，使用页面滚动到主体内容
  uni.pageScrollTo({
    scrollTop: 0,
    // R4-00994：滚动动画时长（毫秒）抽常量，与 --d-normal(200ms) 对齐
    duration: PAGE_SCROLL_DURATION_MS,
  });
  // #endif
}
</script>

<template>
  <view
    :class="shellClass"
    :style="shellStyle"
    role="main"
    :aria-label="title || subtitle || ''"
  >
    <!-- P6 a11y：Skip link 跳到主内容（键盘 Tab 焦点首次进入时可见） -->
    <view
      class="shell__skip-link sr-only-focusable"
      role="link"
      :aria-label="t('common.skipToMain')"
      tabindex="0"
      @tap="focusMainContent"
      @keydown.enter="focusMainContent"
    >
      <text class="shell__skip-link-text">{{ t('common.skipToMain') }}</text>
    </view>
    <!-- 头部（仅 standard 变体显示） -->
    <view
      v-if="variant === 'standard'"
      class="shell__header"
      :style="headerStyle"
      role="banner"
      :aria-label="title || subtitle || ''"
    >
      <!-- 自定义头部插槽 -->
      <slot name="header">
        <view class="shell__header-main">
          <view
            v-if="showBack"
            class="shell__back"
            hover-class="shell__back--pressed"
            :hover-stay-time="80"
            @tap="handleBack"
            role="button"
            :aria-label="t('common.back')"
          >
            <image
              class="shell__back-icon"
              :src="IMAGE_PATHS.ICONS_COMMON.BACK"
              mode="aspectFit" alt=""
            />
            <text class="shell__back-text">{{ t('common.back') }}</text>
          </view>
          <!-- R6-L14-D13：页头层级＝眉标(可选) → 标题 → 副标题。
               原 :216 把 subtitle 渲染在 title 之前，实测说明文字压在大标题上方（层级倒置）。 -->
          <text v-if="eyebrow" class="shell__eyebrow">{{ eyebrow }}</text>
          <text v-if="title" class="shell__title">{{ title }}</text>
          <text v-if="subtitle" class="shell__subtitle">{{ subtitle }}</text>
        </view>
      </slot>
      <view class="shell__header-right">
        <slot name="header-right" />
      </view>
    </view>

    <!-- 沉浸型变体：仅占位状态栏安全区 -->
    <view
      v-else-if="variant === 'immersive' && safeArea"
      class="shell__safe-top"
      :style="{ height: 'var(--statusbar, env(safe-area-inset-top))' }"
    />

    <!-- 主体内容 -->
    <view
      class="shell__body"
      :style="{ paddingBottom: bodyPaddingBottom }"
      id="shell-main-content"
      tabindex="-1"
    >
      <slot />
    </view>

    <!-- 底部插槽 -->
    <view v-if="$slots.footer" class="shell__footer">
      <slot name="footer" />
    </view>
  </view>
</template>

<style scoped lang="scss">
.shell {
  /* 2026-08-31 滚动断层修复：禁止锁死 height:100%——
     根元素被钉在一屏高后，超屏内容既撑不开页面滚动高度（页面无法上下滚动），
     又会露出系统默认底色（与主题浅绿断层）。仅保留 min-height 让内容自然撑高。 */
  /* R8-L11-D10：min-height:100% 在 mp-weixin 里不可解析（祖先无确定高度 ⇒ 百分比高度算成 auto），
     于是宿主链给不出确定高度，子级 EmptyState 的 flex:1 伸展拿不到可用区，空态照旧贴顶
     （帧上实测空态中心 y≈312，可用区中心 y≈506）。改成视口口径 min-height:100vh：
     仍是 min-height（内容超屏照样撑开、滚动不断层），但值可解析；再把 .shell 立成 flex 列，
     .shell__body 才能用 flex:1 拿到「视口 − 头部 − 底部留白」的确定高度，空态居中自此成立。
     顺带让 .shell__footer 的 margin-top:auto（:422，此前非 flex 父级下是死样式）真正生效。 */
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  // 默认页面背景
  background: var(--c-bg-page, #EEF7F2);
}

// 背景变体
.shell-bg--default {
  background: var(--c-bg-page, #EEF7F2);
}

.shell-bg--gradient {
  // 品牌色到背景色的渐变
  background: linear-gradient(
    180deg,
    var(--c-bg-brand, #E8FAF3) 0%,
    var(--c-bg-page, #EEF7F2) 280rpx
  );
}

.shell-bg--image {
  // 背景图通过 inline style 注入
  background-color: var(--c-bg-page, #EEF7F2);
}

// 变体内边距
// MP-R2VIS-COMPONENTS-LAYOUT-APPSHELL-001：水平 gutter 取判据裁定的 32rpx（= 令牌 --page-padding
// 实值，design-variables.scss:546），与全站 var(--page-padding) 消费页同侧；旧值 28rpx 与令牌差 4rpx。
.shell--standard {
  padding: 0 32rpx;
}

.shell--immersive {
  padding: 0;
}

.shell--minimal {
  padding: 0 32rpx;
}

// 头部
.shell__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24rpx;
  margin-bottom: 28rpx;
}

/* MP-R1-APPSHELL-101：fixed prop 落样式（此前 shellClass 注入 is-fixed 但样式表
   无任何规则，传了也不生效）。is-fixed 时头部吸顶（sticky 保留布局位、无遮挡补偿
   问题），背景延伸进状态栏区——滚动时正文不得与系统状态栏文字叠印。
   注意：外层 .shell--standard 等变体自身带 32rpx 水平内边距（判据裁定的 gutter 值），吸顶行内补
   水平负边距使背景铺满整行宽度；负边距与下方 padding 的水平值必须与该 gutter 同数，
   否则吸顶行内容会与正文错位。 */
.is-fixed .shell__header {
  position: sticky;
  top: 0;
  z-index: 100;
  margin-left: -32rpx;
  margin-right: -32rpx;
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + 20rpx) 32rpx 20rpx;
  background: var(--c-bg-page, #EEF7F2);
}

.shell__header-main {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.shell__back {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  align-self: flex-start;
  margin-bottom: 16rpx;
  padding: 20rpx 24rpx 20rpx 16rpx;
  /* 修复 P2（触摸目标过小）：min-height/min-width 确保 ≥88rpx（44px @2x），满足 iOS HIG / Material Design 标准 */
  min-height: 88rpx;
  min-width: 88rpx;
  border-radius: var(--r-full, 9999rpx);
  background: var(--c-bg-container, #FFFFFF);
  border: 1rpx solid var(--c-border-light, #EEF2F0);
}

.shell__back--pressed {
  opacity: 0.7;
}

.shell__back-icon {
  width: 40rpx;
  height: 40rpx;
}

.shell__back-text {
  font-size: var(--fs-base, 24rpx);
  /* R10-L07-D07（颜色token P1）：「‹ 返回」文字原取 --c-brand #36C99A 压在 :365 的
     --c-bg-container 白胶囊上，实帧采样 (57,202,156) ⇒ 2.09:1，12px 不享大字号豁免。
     按卡走 --c-brand-800 #156B51（白底 6.45:1，design-variables.scss:18 真值）；
     卡上同时点名 brand-700 #1F8D6A 只有 4.14:1 仍不达，故不停在 700 档。
     本胶囊是 love-center / help / security 三页共用页头，三页同面同治。 */
  color: var(--c-brand-800, #156B51);
  font-weight: 500;
}

.shell__eyebrow {
  display: block;
  color: var(--c-text-secondary, #666666);
  font-size: var(--fs-base, 24rpx);
  margin-bottom: 8rpx;
  letter-spacing: 0;
}

.shell__title {
  display: block;
  /* R10-L07-D08 + R10-L13-D09（字号 P2，同一条根因两张卡）：页头主标题原取 --fs-5xl 44rpx=22px，
     落在 §1.3 的「卡片大标题」档，比页头档下限 26px 小 4px，与同页区块标题（--fs-3xl=18px）
     只差 4px，层级塌成一档（恋爱中心/帮助与客服/安全中心/用户协议四帧同病，实测字高 21px）。
     升到令牌档 --fs-7xl 56rpx=28px（design-variables.scss:572，§1.3 页头档 26–28px 的上限）：
     两卡建议的 52rpx 在档位表里没有对应令牌（--fs-6xl 只有 48rpx=24px，仍在档外），
     本仓字号统一走 --fs-* 令牌 ⇒ 取可解析的 7xl 档而不是硬写 52rpx。 */
  font-size: var(--fs-7xl, 56rpx);
  font-weight: 700;
  color: var(--c-text-primary, #222222);
}

/* R6-L14-D13：副标题档（标题之下）。字号/色阶沿用原 eyebrow 档，
   只是位置从「标题之上」改为「标题之下」，与 9 个宿主传入的描述性文案语义一致。 */
.shell__subtitle {
  display: block;
  color: var(--c-text-secondary, #666666);
  font-size: var(--fs-base, 24rpx);
  line-height: 1.5;
  margin-top: 8rpx;
}

.shell__body {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  /* R8-L11-D10：配合 .shell 的 flex 列 + 可解析 min-height，把「视口 − 头部 − 底部安全区」
     这段确定高度交给子级，EmptyState(:142 flex:1 0 auto) 的居中才有伸展对象。 */
  flex: 1 1 auto;
  /* P6 a11y：让 id=shell-main-content 可被 focus（outline 通过全局 :focus-visible 处理） */
  outline: none;
}

/* P6 a11y：Skip link 视觉隐藏，获得焦点时显示在顶部 */
.shell__skip-link {
  position: absolute;
  top: 0;
  /* R8-L11-D09：隐藏口径从「left:0 + 依赖全局 clip:rect(0,0,0,0)」改成 mp 可靠的一档。
     mp-weixin 的 WXSS 不支持 clip（styles/a11y.scss:23 那条只在 H5 生效），于是 1px×1px 的盒子
     只裁掉了宽度、没裁掉笔画 ⇒ 帧最左缘 x=0..1 / y=28..50 残留三段灰色笔画（#7F8481 / #999E9C），
     压在「返回」胶囊上方。改成整节点移出视口左缘（left:-9999px + 1px 见方 + overflow:hidden），
     焦点态再移回来，H5 键盘可达性不变，mp 端零像素。 */
  left: -9999px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  z-index: 9999;
  background: var(--c-brand, #36C99A);
  color: var(--c-text-inverse, #ffffff);
  padding: 16rpx 24rpx;
  border-radius: 0 0 var(--r-md, 12rpx) 0;
  font-size: var(--fs-sm, 22rpx);
}

.shell__skip-link:focus {
  left: 0;
}

.shell__skip-link-text {
  color: inherit;
  font-weight: 600;
}

.shell__footer {
  margin-top: auto;
}
</style>

