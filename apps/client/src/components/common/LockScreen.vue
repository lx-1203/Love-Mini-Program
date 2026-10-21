<script setup lang="ts">
/**
 * LockScreen - 权限拦截全屏引导页
 *
 * 未登录 / 未完成基础资料填写的用户访问受限功能时展示：
 * - 未登录：主文案侧重「登录」，主按钮先登录、登录成功后自动进入资料完善页；
 * - 已登录但资料未完善：主文案侧重「完善资料」，主按钮直接进入资料完善页；
 * - 提供「× 关闭」（返回上一可浏览页）与「先逛逛公开内容」备选路径，弱化强制感；
 * - 权益清单具象化完善资料的收益，提升转化意愿。
 *
 * 布局说明：原实现依赖父容器高度（height:100%），而宿主页面仅设置 min-height:100%，
 * 百分比高度退化为 auto，导致内容堆在屏幕上半区、下半屏空白；2026-08-09 改成
 * min-height:100vh 后又带来新问题（R6-L09-D25 / R6-L08-D10）——相对定位的 100vh 容器会随页滚，
 * 关闭键漂移进微信胶囊带、宿主额外安全区把底部提示顶出首屏。
 * 现改为固定铺满视口的模态层（position:fixed + 四边 0），内容纵向居中、
 * 底部提示贴近屏底、超长内容由内容区内部滚动。
 */
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "../../stores/session";
// R4-00229：路径走 ROUTES / SUBPACKAGE_ROUTES 常量
import { ROUTES, SUBPACKAGE_ROUTES } from "../../constants/routes";
// 2026-08-09：未登录「立即登录并完善」→ 登录成功后自动进入资料完善页
import { openAppPath, replaceAppPath, isTabPath, setPendingLoginRedirect } from "../../utils/navigation";
import { IMAGE_PATHS } from "../../config/images";
// R6-B06（根因①消费点侧）：所有 IMAGE_PATHS 一律过 resolveMediaUrl 再绑给 <image :src>。
// real 发布包里 icons/{v2,social,emoji,login,home,match,nearby} 与 images/** 均不随包
// （实测 apps/client/dist/build/mp-weixin-real/static/assets 下只剩 icons/{common,register,tabbar}
// 与 profile/svg、svg-spec），裸绑常量 = 直接 404 空白；解析器按 cdn-buckets.json 把它改写成
// 后端 app-assets URL（§1.6 铁律 3）。包内命中的目录（icons/common、svg-spec）幂等原样返回。
import { resolveMediaUrl } from "../../utils/media";
// compat 的 getCurrentPagePath（含 H5/MP 平台差异处理），用于判断是否处于 Tab 页（底部有 TabBar）
import { getCurrentPagePath } from "../../compat";
// R8-L07-D02（层级遮挡 P2）：组件自带 --statusbar 注入（见下方 rootStyleVars）
import { useStatusBarHeight } from "../../composables/useStatusBarHeight";

const { t } = useI18n();

const props = defineProps<{
  /** 当前资料完善度百分比（已登录未完善时展示进度） */
  completionPercent?: number;
  /**
   * R6-L09-D27（文案）：宿主按页覆盖主标题。
   * 本组件此前把「登录后解锁完整交友功能」这一句通稿铺给 5 个宿主
   * （village 广场 / 喜欢与访客 / 心动信号 / 会话 / 官方号），
   * 心动信号页 14 条墨迹带里 0 处出现页名 ⇒ 画面与页面语义脱节。
   * 不传时保持原通用口径，行为逐字不变。
   */
  titleOverride?: string;
  /** R6-L09-D27：宿主按页覆盖副标题（一句说明「这里为什么锁、解锁后拿到什么」） */
  subtitleOverride?: string;
  /** R6-L09-D27：宿主按页覆盖权益清单（不传则用通用三条） */
  benefitsOverride?: string[];
}>();

const sessionStore = useSessionStore();
/** 是否已登录：决定主文案 / 主按钮 / 行为分支 */
const loggedIn = computed(() => sessionStore.isLoggedIn);

/** 主标题：未登录侧重登录授权，已登录未完善侧重完善资料；宿主可按页覆盖 */
const title = computed(
  () => props.titleOverride || t(loggedIn.value ? "lock.titleLoggedIn" : "lock.titleLoggedOut")
);

/** 副标题：具象化说明完善后可获得的能力；宿主可按页覆盖 */
const subtitle = computed(
  () =>
    props.subtitleOverride ||
    t(loggedIn.value ? "lock.subtitleLoggedIn" : "lock.subtitleLoggedOut")
);

/** 主按钮文案 */
const primaryText = computed(() =>
  t(loggedIn.value ? "lock.primaryLoggedIn" : "lock.primaryLoggedOut")
);

/** 完善进度（已登录且进度 >0 时展示，支持中途退出后继续完善） */
const progressText = computed(() => {
  if (
    loggedIn.value &&
    props.completionPercent !== undefined &&
    props.completionPercent > 0
  ) {
    return t("lock.completionProgress", { n: props.completionPercent });
  }
  return "";
});

/** 权益清单：具象化完善资料的收益；宿主可按页覆盖 */
const benefits = computed(() =>
  props.benefitsOverride && props.benefitsOverride.length > 0
    ? props.benefitsOverride
    : [t("lock.benefitMatch"), t("lock.benefitCampus"), t("lock.benefitChat")]
);

/* ========== 素材出口：一律过 resolveMediaUrl（R6-B06，见文件头注释） ========== */
/* R8-L08-D03（颜色token P2 · heart-signals）+ R8-L02-D18（可达性 P2 · village）：
   本组件三枚图标出口的描线色都写死在 SVG 源文件里，页面令牌覆盖不到，
   而本车道只许改组件（不许动 static/** 素材），故改指「同语义、描线色已在 §1.2 色板内」的
   既有素材（均已核：dist/build/mp-weixin-real/static/assets 与 apps/api/uploads/app-assets 双份在盘）：
   · lock.svg  stroke="#94A3B8"（非色板档）→ register/lock.svg stroke="#4A524E" = --c-text-secondary，
     压 280rpx --c-gradient-brand 环（#36C99A→#55D5A7）实测 3.85:1（深端）~4.86:1（浅端），
     过非文本 3:1 门槛；原 #94A3B8 压环色 #4FD3A5 只有 1.37:1。
   · check-circle.svg stroke="#94A3B8" → register/check-green.svg stroke="#36C99A" = --c-brand，
     勾选语义全站为品牌绿；环上徽章的 6rpx --c-brand 描边（:503 上一轮刚改）与勾本身终于同色。
   × close.svg 无同语义的色板档素材可换 ⇒ 落在样式侧 filter（见 .lock-screen__close-icon）。 */
const closeIconSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.CLOSE_SVG));
const lockIconSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.REGISTER_ICONS.LOCK));
const checkIconSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.REGISTER_ICONS.CHECK_GREEN));
/**
 * 漂浮爱心（R6-L03-D02 / R6-L08-D09 / R6-L09-D22 · R8-L07-D01 颜色token P2）：
 * 上一档取 ICONS_SOCIAL.LIKE_FILLED，该文件第 1 行写死 fill="#EF4444" —— §1.2 色板里没有的
 * 正红（帧上左颗 24×20px / 右颗 17×15px 区域众数色实测 #EF4444，211 px 命中），
 * 而规范给「喜欢」的色档是 romance-500 #FF6B81（差 R-16/G+25/B+61）。
 * 本组件不许动素材，故改指仓内既有的同图形档 ICONS_COMMON.HEART_FILLED_SVG
 * （common/heart-filled.svg，fill/stroke 逐字 = #FF6B81，即 §1.2 色板档），
 * 色值来自资产本身而非组件内字面量，图标形状/位置/尺寸不变。
 */
const heartIconSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.ICONS_COMMON.HEART_FILLED_SVG));
/**
 * 同校头像（R6-L09-D26）：原绑 IMAGE_PATHS.AVATARS.AVATAR_1/2，实盘逐张打开是
 * 航拍树冠 / 暗水面礁石（apps/api/uploads/app-assets/assets/images/avatars/avatar-1.jpg 平均色
 * #3C3A21），不是人像 ⇒ 锁屏「和你一样的同学在寻觅」这层叙事崩掉。
 * 改绑同一摄影体系的**人像裁切**档 PEOPLE.AVATAR_1/2（person-01-avatar.png ~ person-09-avatar.png，
 * 后端 app-assets 盘上 9 张齐全，全站人卡同源），缺图时由 @error 整块隐藏不留灰洞。
 */
const avatarLeftSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.PEOPLE.AVATAR_1));
const avatarRightSrc = computed(() => resolveMediaUrl(IMAGE_PATHS.PEOPLE.AVATAR_2));
/** 头像取不到时不留空洞（与漂浮爱心同口径） */
const avatarLeftVisible = ref(true);
const avatarRightVisible = ref(true);
const heartsVisible = ref(true);

/**
 * 是否处于 Tab 页（底部有固定 TabBar）。
 * Tab 页中引导页底部需为 TabBar 预留空间，避免底部提示被遮挡。
 */
const isTabHost = isTabPath(getCurrentPagePath() ?? "");

/**
 * R8-L07-D02（层级遮挡 P2 · likes-visitors）：× 关闭钮的 top 写的是
 * `calc(var(--statusbar, env(safe-area-inset-top)) + var(--sp-3))`，
 * 但 env() 在本拍摄环境恒 0，而 --statusbar 是「宿主页」经 <page-meta :page-style> 注入的变量——
 * likes-visitors/index.vue:33-35 上一轮已改走 useStatusBarHeight，组件这一半却没跟上，
 * 于是 --statusbar 在组件作用域里解析不到、回落到 env()=0 ⇒ top=12px，
 * 半透明白圆顶边落在系统状态栏文字带内（帧上「0:58」字形 x=12..24/y=18..26 与圆底 x=14..56/y=8..47
 * 交叠 11×9px，× 被挤到时间右侧读成「0:58×」）。
 * 修法在组件这一半：自己测状态栏高度并把 --statusbar 以内联自定义属性挂在模态层根节点上，
 * 5 个宿主（village / likes-visitors / heart-signals / messages / 官方号）同口径一次覆盖，
 * 不依赖宿主是否注入；与 AppShell.vue:329、daily-question/index.vue:356 同源同一 API。
 */
const statusBarHeight = useStatusBarHeight();
const rootStyleVars = computed<Record<string, string>>(() => ({
  "--statusbar": `${statusBarHeight.value}px`,
}));

/**
 * 主操作：
 * - 未登录：记录「登录后待跳转资料完善」→ 跳登录页；
 * - 已登录未完善：直接进入资料完善页。
 */
function onPrimary() {
  if (!loggedIn.value) {
    setPendingLoginRedirect(SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE);
    replaceAppPath(ROUTES.LOGIN);
    return;
  }
  openAppPath(SUBPACKAGE_ROUTES.SETUP_PROGRESS.PROFILE);
}

/**
 * 「×」关闭：返回上一个可浏览的公开页面。
 * - 页面栈有上一页（如从喜欢/心动信号 navigateTo 进入）→ navigateBack；
 * - Tab 直达（栈深为 1）→ 切换到公开 Tab（匹配推荐页，无拦截可正常浏览）。
 */
function goBack() {
  if (getCurrentPages().length > 1) {
    uni.navigateBack();
  } else {
    uni.switchTab({ url: ROUTES.TAB.DISCOVER });
  }
}

/** 「先逛逛公开内容」：切换到公开 Tab（匹配推荐页），保留游客浏览路径 */
function browsePublic() {
  uni.switchTab({ url: ROUTES.TAB.DISCOVER });
}
</script>

<template>
  <view
    class="lock-screen"
    :style="rootStyleVars"
    role="dialog"
    aria-modal="true"
    :aria-label="title"
  >
    <!-- 径向渐变心动氛围叠加层 -->
    <view class="lock-screen__atmosphere" />

    <!-- 模糊头像装饰背景 -->
    <view class="lock-screen__decoration">
      <view class="blur-avatar blur-avatar--1" />
      <view class="blur-avatar blur-avatar--2" />
      <view class="blur-avatar blur-avatar--3" />
      <view class="blur-avatar blur-avatar--4" />
      <view class="blur-avatar blur-avatar--5" />
    </view>

    <!-- 顶部操作区：× 关闭按钮（返回上一个可浏览页面） -->
    <button
      class="lock-screen__close"
      @tap="goBack"
      :aria-label="t('lock.closeAria')"
    >
      <image
        class="lock-screen__close-icon"
        :src="closeIconSrc"
        mode="aspectFit"
        alt=""
      />
    </button>

    <!-- 主体内容区（纵向铺满并居中） -->
    <view class="lock-screen__body">
      <!-- 主题插画：解锁徽章 + 同校头像 + 漂浮爱心（对应「解锁同校匹配」） -->
      <view class="lock-screen__illustration">
        <view class="illustration__ring">
          <image
            class="illustration__lock"
            :src="lockIconSrc"
            mode="aspectFit"
            alt=""
          />
          <view class="illustration__badge">
            <image
              class="illustration__badge-icon"
              :src="checkIconSrc"
              mode="aspectFit"
              alt=""
            />
          </view>
        </view>
        <view v-if="avatarLeftVisible" class="illustration__avatar illustration__avatar--left">
          <image
            class="illustration__avatar-img"
            :src="avatarLeftSrc"
            mode="aspectFill"
            alt=""
            @error="avatarLeftVisible = false"
          />
        </view>
        <view v-if="avatarRightVisible" class="illustration__avatar illustration__avatar--right">
          <image
            class="illustration__avatar-img"
            :src="avatarRightSrc"
            mode="aspectFill"
            alt=""
            @error="avatarRightVisible = false"
          />
        </view>
        <view v-if="heartsVisible" class="illustration__heart illustration__heart--1">
          <image
            class="illustration__heart-img"
            :src="heartIconSrc"
            mode="aspectFit"
            alt=""
            @error="heartsVisible = false"
          />
        </view>
        <view v-if="heartsVisible" class="illustration__heart illustration__heart--2">
          <image
            class="illustration__heart-img"
            :src="heartIconSrc"
            mode="aspectFit"
            alt=""
          />
        </view>
      </view>

      <!-- 核心文案 + 权益清单 -->
      <view class="lock-screen__content">
        <text class="lock-screen__title">{{ title }}</text>
        <text class="lock-screen__subtitle">{{ subtitle }}</text>
        <text v-if="progressText" class="lock-screen__progress">{{ progressText }}</text>
        <view class="lock-screen__benefits">
          <view v-for="benefit in benefits" :key="benefit" class="benefit">
            <image
              class="benefit__icon"
              :src="checkIconSrc"
              mode="aspectFit"
              alt=""
            />
            <text class="benefit__text">{{ benefit }}</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮区：主按钮 + 备选路径 -->
      <view class="lock-screen__action">
        <button
          class="lock-screen__btn"
          @tap="onPrimary"
          :aria-label="t('lock.completeNowAria')"
        >
          <text class="lock-screen__btn-text">{{ primaryText }}</text>
        </button>
        <view class="lock-screen__btn-link" @tap="browsePublic">
          <text class="lock-screen__btn-link-text">{{ t('lock.secondary') }}</text>
        </view>
      </view>
    </view>

    <!-- 底部补充提示（贴近屏底） -->
    <view class="lock-screen__footer" :class="{ 'lock-screen__footer--tab': isTabHost }">
      <text class="lock-screen__footer-text">{{ t('lock.footerTip') }}</text>
    </view>
  </view>
</template>

<style scoped lang="scss">
/* ================================================================
   权限拦截全屏引导页
   - 修复（2026-08-09）：原 height:100% 依赖父容器确定高度，而宿主页面
     仅有 min-height:100%（height 不定），百分比高度退化为 auto，
     内容堆在屏幕上半区、下半屏空白。
   - R6-L09-D25（位置 P1）+ R6-L08-D10（可达性 P2）：上一版用
     `position: relative; min-height: 100vh`，于是
       ① 唯一的退出「×」键挂在会滚的容器上（bottom 帧实测上移 69px，
          挤进微信胶囊 y=56-71 横带）——本组件自标 role="dialog" aria-modal="true"，
          模态层不该随背景滚；
       ② 宿主 likes-visitors/index.vue:317 又额外给 paddingTop=statusBar+sp-6，
          与组件自己的 100vh 叠加 ⇒ 总高超视口，底部提示要滚 90px 才露出。
     现改为铺满视口的固定层（5 个宿主均为 v-if/v-else 独占渲染，见
     grep "<LockScreen" 的 5 处调用点，不存在与页面正文并排渲染的宿主），
     关闭键与底部提示恒在屏内，内容超长时由 __body 内部滚动。
   ================================================================ */
.lock-screen {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--c-gradient-page);
}

/* ========== 径向渐变心动氛围叠加层（M-14） ========== */
/* R4-02512：以下为品牌色低不透明度氛围光晕（青藤绿/浪漫粉的 alpha 混色），
   品牌色在深色模式下保持不变（tokens.scss 设计约定），
   低 alpha 光晕在深色底上同样成立，无需暗色覆盖。
   R4-02166~169：以下 4 处 rgba 氛围渐变（浪漫粉/绿氛围渐变），无对应 token，保留原值。 */
.lock-screen__atmosphere {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(ellipse at 20% 20%, rgba(61, 201, 148, 0.18) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 30%, rgba(249, 168, 196, 0.2) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 80%, rgba(124, 217, 166, 0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 15% 70%, rgba(244, 114, 182, 0.12) 0%, transparent 40%);
  pointer-events: none;
  z-index: 0;
}

/* ========== 模糊头像装饰（增强若隐若现感 M-14） ========== */
.lock-screen__decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.blur-avatar {
  position: absolute;
  border-radius: var(--r-full);
  /* #ifndef MP-WEIXIN */
  /* H5 / App 端：使用 filter:blur 实现真实模糊效果 */
  filter: blur(40rpx); /* 固定布局尺寸（模糊半径），无对应 token */
  /* #endif */
  /* #ifdef MP-WEIXIN */
  /* mp-weixin 不支持 filter:blur，用半透明遮罩 + 提升 opacity 兜底模拟若隐若现感 */
  opacity: 0.25;
  /* #endif */

  &--1 {
    width: 320rpx;
    height: 320rpx;
    top: -80rpx;
    left: -100rpx;
    background: linear-gradient(135deg, var(--c-brand-200), var(--c-brand-400));
    opacity: 0.15;
  }

  &--2 {
    width: 280rpx;
    height: 280rpx;
    top: 100rpx; /* 固定布局尺寸（装饰头像偏移），无对应 token */
    right: -80rpx;
    background: linear-gradient(135deg, var(--c-romance-200), var(--c-romance-400));
    opacity: 0.12;
  }

  &--3 {
    width: 360rpx;
    height: 360rpx;
    top: 200rpx;
    left: -60rpx;
    background: linear-gradient(135deg, var(--c-brand-100), var(--c-brand-300));
    opacity: 0.1;
  }

  &--4 {
    width: 240rpx;
    height: 240rpx;
    bottom: 200rpx; /* 固定布局尺寸（装饰头像偏移），无对应 token */
    right: -40rpx;
    background: linear-gradient(135deg, var(--c-romance-100), var(--c-romance-300));
    opacity: 0.13;
  }

  &--5 {
    width: 200rpx;
    height: 200rpx;
    bottom: -60rpx;
    left: 20%;
    background: linear-gradient(135deg, var(--c-brand-200), var(--c-romance-200));
    opacity: 0.12;
  }
}

/* ========== 顶部操作区：× 关闭按钮 ========== */
.lock-screen__close {
  position: absolute;
  top: calc(var(--statusbar, env(safe-area-inset-top)) + var(--sp-3));
  left: var(--sp-5);
  z-index: 2;
  /* R7-L08-D06（可达性 P3 · 【R6 已批过，未落地】）：× 是全屏锁定层里唯一「原路返回」出口
     （主按钮跳资料完善），实测直径 36px=72rpx，比仓内自陈触控下限 AppShell.vue:334
     「min-height: 88rpx(44px)」少 16rpx。同页 search/index.vue:696 .search-tab 的既有做法
     就是给按钮本体补到 88rpx（不是叠透明层）⇒ 同口径把圆钮本身扩到 88rpx。
     刻意不用「外扩透明命中区」那种写法：本车道硬规矩要求每条修复在帧上可测到像素差别，
     透明命中区在静态帧里一个像素都不动，等于没修。× 字形仍由 .lock-screen__close-icon
     的 40rpx 锁定，不随圆变大。 */
  width: 88rpx;
  height: 88rpx;
  border-radius: var(--r-circle);
  background: var(--c-overlay-white-bg-mid, rgba(255, 255, 255, 0.6));
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
  &::after {
    border: none;
  }
}

.lock-screen__close:active {
  transform: scale(0.98);
}

.lock-screen__close-icon {
  width: 40rpx;
  height: 40rpx;
  /* R8-L08-D03（颜色token P2 · heart-signals）：close.svg 第 2 行写死 stroke="#94A3B8"，
     既不在 §1.2 色板、又因写在 SVG 里而无法被页面令牌覆盖
     —— × 字形最暗 #99A8BC 压半透明白圆 #E4F6F0 只有 2.19:1，低于非文本 3:1 门槛。
     本车道不许动 static/** 素材 ⇒ 按缺陷卡给的第二条口径在组件内加 filter，
     与 EmptyState.vue:163 同口径：grayscale(1) 抹掉蓝偏（#94A3B8 → 亮度 161 的灰），
     brightness(0.7) 压到 ≈#717171，压 #E4F6F0 实测 4.34:1 ≥ 3:1。
     同批的 lock/check 两枚已在 script 侧改指同语义色板档素材（REGISTER_ICONS.LOCK /
     REGISTER_ICONS.CHECK_GREEN），三枚出口一次覆盖。 */
  /* #ifdef MP-WEIXIN */
  filter: grayscale(1) brightness(0.7);
  /* #endif */
}

/* ========== 主体内容区：纵向铺满并居中（固定层内部可滚，见 .lock-screen 注释） ========== */
.lock-screen__body {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: calc(var(--statusbar, env(safe-area-inset-top)) + var(--sp-8)) var(--sp-8) var(--sp-6);
}

/* ========== 主题插画：解锁徽章 + 同校头像 + 漂浮爱心 ========== */
.lock-screen__illustration {
  position: relative;
  width: 440rpx;
  height: 400rpx;
  margin-bottom: var(--sp-8);
}

/* 解锁徽章圆环（品牌渐变，承载锁图标与完成对勾） */
.illustration__ring {
  position: absolute;
  top: 30rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 280rpx;
  height: 280rpx;
  border-radius: var(--r-circle);
  background: var(--c-gradient-brand);
  box-shadow: var(--s-brand-lg);
  display: flex;
  align-items: center;
  justify-content: center;
}

.illustration__lock {
  width: 120rpx;
  height: 120rpx;
}

/* 完成对勾徽章：白色圆底 + 绿色对勾 + 绿色描边
   R6-L08-D12（颜色token P2）：原写 `border: 6rpx solid var(--c-gradient-brand)`，
   而 --c-gradient-brand 的值是 linear-gradient(...)（theme/design-variables.scss:171），
   它是 <background-image> 值、不是 <color>，用作 border-color 属非法声明
   ⇒ 整条 border 不生效（帧上实测 y341 一行从环绿 #4FD3A5 直接进白 #FEFEFE，
   出白圆后 x272 起即页面底 #EEF7F2，白底外没有任何品牌绿环带）。
   改纯色令牌 var(--c-brand)（#36C99A）；渐变只留给 background 用。

   R8-L02-D19（层级遮挡 P2 · village）+ R8-L08-D04（层级遮挡 P2 · heart-signals）同一条碰撞：
   徽章原挂环右下 `right:-12rpx; bottom:-12rpx` ⇒ 按两套坐标算落在盒内 x296..372 / y246..322；
   右侧同校头像 `bottom:0; right:40rpx`（112rpx + 8rpx 白描边）落在 x288..400 / y288..400，
   两盒交叠 76×34rpx ⇒ 帧上白色对勾圆徽章直接压在右头像照片上缘（x≈228..266/y≈288..322），
   人像头部被整块切掉；且两块同为 position:absolute 都没写 z-index，
   头像节点（模板 :220）排在徽章节点（:202）之后 ⇒ 后画者压上，
   绿环带在底部断成不闭合弧（实测只到 x215..263/y288..325 = 49×38px，比声明的 44px 少 6px 竖口）。
   改法取缺陷卡给的「徽章挂环正下」：left:50% 居中到环底缘（x162..238），
   左头像 x40..152、右头像 x288..400 —— 两侧包围盒都不再与徽章相交（不靠 z-index 硬压，
   几何上真正分开）；同时按 L08-D04 补 z-index:2 兜住绘制顺序，避免后续节点再盖上来。 */
.illustration__badge {
  position: absolute;
  left: 50%;
  bottom: -14rpx;
  transform: translateX(-50%);
  z-index: 2;
  width: 76rpx;
  height: 76rpx;
  border-radius: var(--r-circle);
  background: var(--c-bg-container);
  border: 6rpx solid var(--c-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-sm);
}

.illustration__badge-icon {
  width: 48rpx;
  height: 48rpx;
}

/* R9-L08-D04（可达性 P2 · heart-signals）：checkIconSrc（:109）指向 REGISTER_ICONS.CHECK_GREEN，
   该 SVG 第 1 行写死 stroke="#36C99A"（= --c-brand），同一枚素材被两处消费——
   徽章白圆内的 .illustration__badge-icon 与权益清单三条前的 .benefit__icon：
     #36C99A L=0.44896 压 --c-bg-container 白 L=1 ⇒ 1.05/0.49896 = 2.10:1
                          压浅绿页底 #EEF7F2 L=0.91111 ⇒ 0.96111/0.49896 = 1.93:1
   两处都低于非文字 3:1；R8-L08-D03 为让勾与环同色把描线定成 brand-500，浅/白底上反而更糊。
   本车道不许动 static/** 素材，盘上也没有 #156B51/#1F8D6A 描线的勾素材
   （已 grep static/assets 全量 *.svg），故按缺陷卡第二条口径在组件内压深，
   与 :484 的 .lock-screen__close-icon 同一种 filter 杠杆：brightness(0.53) 把
   (54,201,154) 逐通道乘成 (28.6,106.5,81.6) ≈ #1D6B52，L=0.11382
   ⇒ 压白 1.05/0.16382 = 6.41:1、压 #EEF7F2 0.96111/0.16382 = 5.87:1，两处均 ≥3:1，
   并与 :717 主 CTA 的 brand-800 同族。图标形状/尺寸/位置不变，仅换墨色。 */
.illustration__badge-icon,
.benefit__icon {
  filter: brightness(0.53);
}

/* 同校头像：环左右两侧，暗示「同校匹配」 */
.illustration__avatar {
  position: absolute;
  bottom: 0;
  width: 112rpx;
  height: 112rpx;
  border-radius: var(--r-circle);
  border: 8rpx solid var(--c-bg-container);
  box-shadow: var(--s-lg);
  overflow: hidden;

  &--left {
    left: 40rpx;
  }

  &--right {
    right: 40rpx;
  }
}

.illustration__avatar-img {
  border-radius: var(--r-full);

  width: 100%;
  height: 100%;
}

/* 漂浮爱心点缀 */
.illustration__heart {
  position: absolute;
  width: 52rpx;
  height: 52rpx;

  &--1 {
    top: 0;
    left: 60rpx;
    animation: float var(--d-loop-slow, 2000ms) ease-in-out infinite;
  }

  &--2 {
    top: 60rpx;
    right: 36rpx;
    width: 40rpx;
    height: 40rpx;
    animation: float var(--d-loop, 1500ms) ease-in-out infinite;
  }
}

.illustration__heart-img {
  width: 100%;
  height: 100%;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-16rpx) scale(1.1);
  }
}

/* ========== 核心文案 + 权益清单 ========== */
.lock-screen__content {
  width: 100%;
  max-width: 560rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-3);
}

.lock-screen__title {
  font-size: var(--fs-3xl);
  font-weight: 700;
  color: var(--c-text-primary);
  text-align: center;
  line-height: 1.4;
}

.lock-screen__subtitle {
  font-size: var(--fs-lg);
  color: var(--c-text-secondary);
  text-align: center;
  line-height: 1.5;
}

/* R9-L02-D21（可达性 P1 · village）+ R9-L08-D03（可达性 P2 · heart-signals）同一条：
   「当前完善度 N%」原取 var(--c-brand) #36C99A（design-variables.scss:15），L=0.44896，
   压 --c-gradient-page（:181，#DFF3EA→#EEF7F2）：
     底中段 #E8F5EE L=0.88632 ⇒ 0.93632/0.49896 = 1.88:1（下段 #EEF7F2 也只有 1.93:1）
   --fs-base 24rpx 不享大字号豁免 ⇒ 差 4.5:1 两倍多；本行还是画面里唯一的完善度数值。
   缺陷卡给的两条实算：--c-brand-800 #156B51 L=0.11271 ⇒ 5.75:1（下段 5.91:1）够；
   --c-text-secondary #4A524E L=0.08037 ⇒ 7.18:1（下段 7.37:1）更高，
   且同组件 :837 .lock-screen__footer-text 已在 R8-L08-D05 升到这一档 —— 取它能消掉
   「同一组件两档结论」的残留，故选它。
   （R10-L02-D12 之后 .lock-screen__btn-link-text 改吃 --c-brand-800（:800-804），
     那是「像不像可点」轴要的链接色，与本行的「唯一数值读数」轴不冲突，两档都 ≥4.5:1。） */
.lock-screen__progress {
  font-size: var(--fs-base);
  color: var(--c-text-secondary);
  text-align: center;
}

/* 权益清单：左对齐，勾选图标 + 文案 */
.lock-screen__benefits {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  margin-top: var(--sp-6);
}

.benefit {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
}

.benefit__icon {
  width: 36rpx;
  height: 36rpx;
  flex-shrink: 0;
}

.benefit__text {
  font-size: var(--fs-md);
  color: var(--c-text-secondary);
}

/* ========== 操作按钮区：主按钮 + 备选路径 ========== */
.lock-screen__action {
  width: 100%;
  max-width: 560rpx;
  margin-top: var(--sp-8);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-4);
}

/* R8-L07-D03（可达性 P1 · likes-visitors，village / heart-signals / messages / 官方号同源）：
   主出口「立即登录并完善」白字压 --c-gradient-brand（= linear-gradient(135deg,#36C99A,#55D5A7)，
   design-variables.scss:171）。钮面 280×47px 众数实测 #45CFA0（另见 #49D0A2/#4BD1A3 渐变段），
   白字对其只有 1.97:1；文字实测 15.3px/字 ≈ 30rpx（声明 --fs-2xl=32rpx=16.1px），
   bold 16px 不享 WCAG 大字号（≥18.66px bold）豁免 ⇒ 4.5:1 门槛差 2.5 倍。
   同一缺陷 R6 只修了 daily-question 页内那颗 CTA，LockScreen 这颗仍走渐变。
   渐变终点侧的 brand-600(#2AAE83)=2.81:1、brand-700(#1F8D6A)=4.14:1 都够不到 4.5:1，
   故取同族深档 --c-brand-800(#156B51) 纯色 ⇒ 白字 6.45:1，与 §1.2 色板同族、与
   daily-question/index.vue:484 的「深档承载白字」结论同向（该页取 brand-600，实测仍不达标，
   已在报告登记给对应页面车道）。 */
.lock-screen__btn {
  width: 100%;
  height: var(--btn-height-md);
  border-radius: var(--r-full);
  background: var(--c-brand-800);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--s-brand-lg);
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.lock-screen__btn:active {
  transform: scale(0.98);
}

.lock-screen__btn-text {
  font-size: var(--fs-2xl);
  font-weight: 600;
  color: var(--c-neutral-0);
}

/* 次按钮：文字链接（先逛逛公开内容） */
/* R10-L02-D12（可达性 P2 · village bottom）+ R10-L08-D07（P2 · heart-signals bottom）同根因：
   游客唯一的公开内容出口可点体太小——village 帧点击盒只有 44rpx(22px) 高
   （padding var(--sp-2)=4px 上下 + 26rpx 文本行），heart-signals 帧实测墨迹 x=147–232、
   y=590–601（86×12px）⇒ 热区约 170×32rpx，不到 88rpx(44px) 下限的一半，
   而同帧主 CTA 钮高实测 46px(91rpx) 达标，两者差近 3 倍。
   按两张卡的改法合并落地：纵向 padding 由 --sp-2 提到 --sp-6（4rpx→24rpx），
   补 min-height:88rpx + display:flex 居中（卡名口径 = 与 .empty-action 的 88rpx 同一把尺），
   横向 padding 由 --sp-6 提到 --sp-8，并给本体 align-self:stretch ——
   父级 .lock-screen__action 的 align-items:center 会把本体收成文字宽（帧上热区只有 86px），
   拉满后热区宽 = 该列的 560rpx，文字仍由 justify-content:center 居中、位置随高度自然下沉
   ≈6px ⇒ 帧上可核。 */
.lock-screen__btn-link {
  align-self: stretch;
  min-height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sp-6) var(--sp-8);
  box-sizing: border-box;
  transition: opacity var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.lock-screen__btn-link:active {
  opacity: 0.6;
}

/* R6-L08-D13（可达性 P2）把本行从 --c-text-tertiary（帧内 #808D88 压 --c-bg-page #EEF7F2
   只有 2.87:1）升到 --c-text-secondary #4A524E（7.37:1），读得出，但 R10-L02-D12 判的是
   「像不像可点」那一半：升到 --c-text-secondary 后它与 .lock-screen__subtitle /
   .benefit__text 逐字同色同档，游客唯一的非登录出口在画面上和普通正文没有任何区别。
   R10-L02-D12 给的三条（下划线 / 箭头 / 品牌深色）取前两条里的「品牌深色 + 下划线」：
   --c-brand-800 #156B51（design-variables.scss:18）压页面底 #EEF7F2 实测
   L=0.112709 vs 0.911098 ⇒ 5.91:1，仍 ≥4.5:1，不重开 R6 那一条；
   下划线补出链接形态。不加箭头/图标：本车道不许新增素材，行内 <image> 会改写这一行的
   布局并把热区高度重新拉回文本行高。 */
.lock-screen__btn-link-text {
  font-size: var(--fs-md);
  color: var(--c-brand-800);
  text-decoration: underline;
}

/* ========== 底部补充提示 ========== */
/* R8-L02-D21（间距 P2 · village）：下边距原写 calc(env(safe-area-inset-bottom) + var(--sp-6))，
   而本项目 env() 在拍摄环境恒为 0（该事实已在 pages/messages/index.vue:64 记录并改用 JS 注入）
   ⇒ 实际只剩 --sp-6 = 24rpx = 12px，帧上该行文字底缘 y≈772、Home Indicator 顶缘 y≈786，
   净空仅 14px≈28rpx，文字几乎坐在系统手势条上（要求 ≥68rpx）。
   改读注入变量 --safe-bottom（无注入时回落 env()），并给一个不依赖 env 的静态下限 72rpx：
   0 + 72rpx = 36px ⇒ 净空 ≈38px ≥ 68rpx 门槛；真机有安全区时 env 再叠加，不会被削减。
   72rpx 无对应 sp 档（阶梯 4/8/12/16/20/24/32/48rpx），属固定安全区尺寸，按本文件既有口径保留字面量。 */
.lock-screen__footer {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  padding: var(--sp-4) var(--sp-8)
    calc(var(--safe-bottom, env(safe-area-inset-bottom)) + 72rpx);
}

/* Tab 页宿主：底部为固定 TabBar 预留空间，避免提示被遮挡 */
.lock-screen__footer--tab {
  padding-bottom: calc(env(safe-area-inset-bottom) + 112rpx);
}

/* R8-L08-D05（可达性 P2 · heart-signals bottom）：本行原取 --c-text-tertiary。
   帧上实测墨迹 x=85..293（208px）/18 字 = 11.6px/字 ≈ 24rpx（对应 --fs-base），
   字形最暗 #76807B 压页面底 #EEF7F2 只有 3.74:1，连令牌名义值 #6B7571 也只有 4.36:1，
   两档都够不到 4.5:1。同一次 R6-L08-D13 修复已把 18 行之上的 .lock-screen__btn-link-text
   升到 --c-text-secondary（:686 注释自证「实测 #808D88 → 2.87:1 ⇒ 改 7.37:1」），
   但没带上这句 .lock-screen__footer-text ⇒ 同组件同一档文案两种结论。
   按缺陷卡给的取一：升色不升字号（升 --fs-md 会把这行提示撑大、改变底部构图），
   与 .lock-screen__subtitle / .benefit__text / .lock-screen__btn-link-text 同档 #4A524E，
   压 #EEF7F2 实测 7.37:1 ≥ 4.5:1。 */
.lock-screen__footer-text {
  font-size: var(--fs-base);
  color: var(--c-text-secondary, #4A524E);
}
</style>
