<script setup lang="ts">
import { ref, onMounted } from "vue";
import { onLaunch, onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useI18n } from "vue-i18n";
import { useSessionStore } from "./stores/session";
import { useUnlockGuideStore } from "./stores/unlock-guide";
import { reportGlobalError } from "./main";
import UnlockGuideModal from "./components/UnlockGuideModal.vue";
import UnlockGuideOverlay from "./components/UnlockGuideOverlay.vue";
import { useNetworkStatus } from "./composables/useNetworkStatus";
import { useUnreadBadge } from "./composables/useUnreadBadge";

const sessionStore = useSessionStore();
const unlockGuideStore = useUnlockGuideStore();
const { visible, featureName, completionPercent, overlayVisible } = storeToRefs(unlockGuideStore);
const { t } = useI18n();

/**
 * 全局网络状态监听：注册 uni.onNetworkStatusChange 监听器，
 * 在网络断开/恢复时通过 toast 提示用户。
 * - onLaunch 阶段初始化网络状态 + 注册监听器
 * - isOnline / networkType 为响应式状态，可被页面消费
 *
 * SubTask 5.4.3：网络状态变化主动提示用户（断网/恢复）
 */
useNetworkStatus();

/**
 * SubTask 5.4.2：未读消息计数实时同步 TabBar 红点。
 *
 * 监听 useMessagesStore.totalUnreadCount getter，当 WebSocket 推送
 * 新消息导致 session.unreadCount 变化时，自动更新 TabBar 红点数字。
 */
useUnreadBadge();

/**
 * 应用是否已就绪。
 * 修复（P0 BUG）：App.vue 作为根组件在小程序启动瞬间即渲染全局弹窗，
 * 此时 WeChat 页面/组件 $scope 尚未挂载到 Vue 实例上，
 * Vue 运行时在缓存事件处理器（e.o / Ui）时会访问 undefined.e0，
 * 导致登录页（首个页面）出现 [Vue Error] TypeError: Cannot read properties of undefined (reading 'e0')。
 * 通过 appReady 标志位，在 onLaunch / onMounted 完成后再渲染含事件处理器的组件，
 * 确保 $scope 已就绪，事件处理器可正常缓存。
 */
const appReady = ref(false);

/** @update:visible 事件处理 - 使用命名函数避免 Vue 编译器对箭头函数的缓存问题 */
function handleUpdateVisible(val: boolean) {
  if (!val) unlockGuideStore.hide();
}

/**
 * 标记应用已就绪，允许渲染全局事件组件。
 * 使用双重保障：onMounted 在 Vue 挂载后触发，onLaunch 在小程序启动后触发，
 * 先触发者设置标志，后者不再重复触发。
 */
function markAppReady() {
  if (!appReady.value) {
    appReady.value = true;
  }
}

onLaunch(() => {
  try {
    // 修复（P0 隐私合规 Task 0.2.2）：注册微信隐私协议授权回调。
    // 自 2023-09 起微信小程序要求所有调用敏感接口的应用接入隐私协议，
    // 在 onLaunch 中调用 wx.onNeedPrivacyAuthorization 注册弹窗回调，
    // 用户首次使用涉及隐私的 API 时弹出协议确认框。
    // 实现策略：
    //   1. 弹出 uni.showModal 提示用户阅读《隐私协议》
    //   2. 提供"查看协议"入口（cancelText）跳转 wx.openPrivacyContract
    //   3. 用户点"同意并继续"→ resolve({ buttonId: 'accept', event: 'agree' })
    //   4. 用户点"查看协议"→ 跳转协议页后回到 modal 继续选择
    //   5. 用户关闭/拒绝 → resolve({ event: 'disagree' })，由微信决定后续行为
    // 兼容性：H5/APP 端 wx 对象可能不存在，需条件编译包裹。
    // #ifdef MP-WEIXIN
    try {
      // 通过 unknown 收敛替代 `as any`，避免 any 类型污染；
      // wx 在 mp-weixin 端为全局对象，H5/APP 端可能不存在，需运行时判空。
      const wxApi = (globalThis as unknown as { wx?: Record<string, unknown> }).wx;
      if (wxApi && typeof wxApi.onNeedPrivacyAuthorization === "function") {
        // 隐私协议 resolve 参数类型：{ event: 'agree' | 'disagree', buttonId?: string }
        // buttonId 为自定义弹窗中"同意"按钮的 id，供微信事件埋点使用。
        type PrivacyResolveArg = {
          event: "agree" | "disagree";
          buttonId?: string;
        };
        type PrivacyResolve = (arg: PrivacyResolveArg) => void;
        const onNeed = wxApi.onNeedPrivacyAuthorization as (
          cb: (resolve: PrivacyResolve) => void
        ) => void;

        // 弹窗标题/文案（Task 28：已迁移至 locale 文件 legal.consent 命名空间）
        const PRIVACY_TITLE = t("legal.consent.protectionTitle");
        const PRIVACY_CONTENT = t("legal.consent.protectionContent");

        // "查看协议"跳转：调用 wx.openPrivacyContract 打开微信托管的隐私协议页面
        const openPrivacyContract = (
          onSuccess: () => void,
          onFail: () => void
        ): void => {
          try {
            const openFn = wxApi.openPrivacyContract as
              | ((opts: { success?: () => void; fail?: () => void }) => void)
              | undefined;
            if (typeof openFn === "function") {
              openFn({ success: onSuccess, fail: onFail });
            } else {
              // 不支持时直接成功回调，避免阻塞
              onSuccess();
            }
          } catch (_e) {
            // 兜底：异常时按失败处理
            onFail();
          }
        };

        onNeed((resolve: PrivacyResolve) => {
          // 弹出隐私协议确认 modal，提供"同意并继续"与"查看协议"两个按钮
          uni.showModal({
            title: PRIVACY_TITLE,
            content: PRIVACY_CONTENT,
            confirmText: t("legal.consent.agree"),
            cancelText: t("legal.consent.viewAgreementShort"),
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 用户点击"同意并继续"→ 同意隐私协议，buttonId='accept' 供埋点
                resolve({ buttonId: "accept", event: "agree" });
              } else if (modalRes.cancel) {
                // 用户点击"查看协议"→ 跳转隐私协议页面，返回后再次弹窗
                openPrivacyContract(
                  () => {
                    // 阅读完毕后重新弹出同意弹窗
                    uni.showModal({
                      title: PRIVACY_TITLE,
                      content: PRIVACY_CONTENT,
                      confirmText: t("legal.consent.agree"),
                      cancelText: t("legal.consent.disagree"),
                      success: (res2) => {
                        if (res2.confirm) {
                          resolve({ buttonId: "accept", event: "agree" });
                        } else {
                          resolve({ event: "disagree" });
                        }
                      },
                      fail: () => resolve({ event: "disagree" }),
                    });
                  },
                  () => resolve({ event: "disagree" })
                );
              }
            },
            fail: () => {
              // modal 调用失败（如小程序环境异常）→ 默认不同意，避免静默同意
              resolve({ event: "disagree" });
            },
          });
        });
      }
    } catch (_privacyErr) {
      // 隐私协议注册失败不应阻断启动，仅记录
    }
    // #endif

    // 修复（P0 BUG）：uni.onError / uni.onUnhandledRejection 已迁移至 main.ts 的
    // registerGlobalErrorListeners 统一注册，避免与 App.vue 重复监听导致同一错误被上报两次。
    sessionStore.bootstrap().catch((err: unknown) => {
      // 修复：bootstrap 异常上报到 main.ts 全局错误处理器，统一出口便于排查
      reportGlobalError("App.onLaunch.bootstrap", err);
    });
  } catch (error) {
    // 修复：启动异常上报到 main.ts 全局错误处理器，避免仅 console.error 后丢失上下文
    reportGlobalError("App.onLaunch", error);
  } finally {
    markAppReady();
  }
});

/**
 * 修复（P1 BUG）：原实现缺少 onShow 错误监控。
 * 应用切前台 / 被重新展示时若发生异常（如 store 恢复、定时任务恢复），
 * 现通过 try-catch 捕获并上报到 main.ts 的全局错误处理器。
 * 当前无具体业务逻辑，仅作错误监控兜底；后续扩展切前台恢复逻辑时可在此添加。
 */
onShow(() => {
  try {
    // 应用切前台时的轻量恢复逻辑可在此扩展
    // 目前仅作错误监控兜底，无具体业务逻辑
  } catch (error) {
    reportGlobalError("App.onShow", error);
  }
});

/**
 * onMounted 在应用挂载后触发，此时小程序运行时已为根组件准备好 $scope，
 * 可以安全渲染带事件处理器的全局组件。
 */
onMounted(markAppReady);
</script>

<template>
  <!-- App.vue 不直接渲染页面内容（由 pages.json 配置驱动），仅作为全局根容器 -->
  <!-- Phase 4 任务 20：全局挂载解锁引导弹窗 + 首次教学蒙层，监听 store 状态自动显隐 -->
  <!-- v-if="appReady" 防止小程序启动瞬间 $scope 未就绪时创建事件处理器导致 e0 异常 -->
  <UnlockGuideModal
    v-if="appReady"
    :visible="visible"
    :feature-name="featureName"
    :completion-percent="completionPercent"
    @update:visible="handleUpdateVisible"
    @confirm="unlockGuideStore.confirm"
    @cancel="unlockGuideStore.hide"
  />
  <UnlockGuideOverlay
    v-if="appReady"
    :visible="overlayVisible"
    @known="unlockGuideStore.hideOverlay"
  />
</template>

<style lang="scss">
// 引入底层设计变量与基础 CSS 自定义属性
@import "./theme/design-variables.scss";
// 引入全局工具类
@import "./theme/global.scss";
// 引入统一设计 token 入口（含语义别名与 dark mode 适配）
// 说明：本文件整合了语义化 token 别名与深色模式覆盖，提供 kebab-case 命名
@import "./styles/tokens.scss";
// 引入无障碍工具类（.sr-only / .sr-only-focusable），供屏幕阅读器读取的视觉隐藏文本使用
@import "./styles/a11y.scss";
// 引入共享 SCSS Mixins（修复 P3 样式重复：集中管理 flex-center / text-ellipsis 等常用 mixin）
@import "./styles/_mixins.scss";
// 引入组件级共享样式（修复 P3 样式重复：base-card / base-btn / base-avatar / base-tag 等基础类）
@import "./styles/_components.scss";

page {
  background: var(--c-gradient-page);
  color: var(--c-text-primary);
  font-family:
    -apple-system,
    "SF Pro Text",
    "PingFang SC",
    "Hiragino Sans GB",
    "Microsoft YaHei",
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
  width: 100%;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}

/* P3 修复：以下基础重置样式已迁移至 theme/global.scss，避免重复定义
   - view, text, image { box-sizing: border-box; } → global.scss
   - view, button, scroll-view, ... { -webkit-tap-highlight-color: transparent; } → global.scss
   此处删除重复声明 */

/* ================================================================
   全局微动效系统
   ================================================================ */

/* 页面进入动画 - 向上淡入 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 简单淡入动画 */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* 弹性缩放进入动画 */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* 脉冲动画（在线红点） */
@keyframes pulseDot {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.4);
    opacity: 0.7;
  }
}

/* 弹性弹出动画（点赞爱心） */
@keyframes bounceIn {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    transform: scale(1.1);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 上下漂浮动画（FAB提示气泡） */
@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8rpx);
  }
}

/* 心跳动画（喜欢按钮） */
@keyframes heartBeat {
  0%, 100% {
    transform: scale(1);
  }
  14% {
    transform: scale(1.2);
  }
  28% {
    transform: scale(1);
  }
  42% {
    transform: scale(1.2);
  }
  70% {
    transform: scale(1);
  }
}

/* 光泽流动效果 */
@keyframes gradientShine {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

/* 页面进入动画类 */
.animate-fade-in {
  animation: fadeInUp var(--d-bounce, 400ms) cubic-bezier(0.4, 0, 0.2, 1) both;
  will-change: transform, opacity;
}

/* 列表/卡片交错入场延迟类 */
.stagger-1 {
  animation-delay: 100ms;
}
.stagger-2 {
  animation-delay: 200ms;
}
.stagger-3 {
  animation-delay: 300ms;
}

/* 淡入动画类 */
.animate-fade {
  animation: fadeIn var(--d-normal, 200ms) ease-out both;
  will-change: opacity;
}

/* 弹性缩放入场类 */
.animate-scale-in {
  animation: scaleIn var(--d-fade, 300ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
  will-change: transform, opacity;
}

/* 按钮点击缩放 —— P3 修复：已迁移至 _components.scss .base-press 与 theme/global.scss .btn-press
   此处保留 .btn-press / .press-scale 别名以兼容现有页面引用，但不再重复声明 */

/* 在线红点脉冲 */
.pulse-dot {
  animation: pulseDot var(--d-loop-slow, 2000ms) ease-in-out infinite;
  will-change: transform, opacity;
}

/* 点赞爱心弹出 */
.bounce-in {
  animation: bounceIn var(--d-slower, 500ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
  will-change: transform, opacity;
}

/* 漂浮动画 */
.float {
  animation: float var(--d-breathe, 3000ms) ease-in-out infinite;
  will-change: transform;
}

/* 心跳动画 */
.heart-beat {
  animation: heartBeat var(--d-loop, 1200ms) ease-in-out infinite;
  will-change: transform;
}

/* 光泽流动按钮 */
.gradient-shine {
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--c-overlay-bg-mid, var(--c-overlay-border-strong, var(--c-overlay-border-strong, rgba(255, 255, 255, 0.3)))) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: gradientShine var(--d-loop-slow, 2000ms) linear infinite;
}

/* 滚动条隐藏 —— P3 修复：原 App.vue 中重复定义两次 ::-webkit-scrollbar，此处仅保留一处 */
::-webkit-scrollbar {
  display: none;
  width: 0;
  height: 0;
  color: transparent;
}

/* ================================================================
   工具类 —— P3 修复：以下工具类已迁移至 theme/global.scss 与 _components.scss
   - .radius-card → global.scss
   - .text-brand / .text-brand-romance / .text-pink / .text-vip → global.scss
   - .gradient-brand / .gradient-romance / .gradient-pink / .gradient-vip → global.scss
   - .float-shadow / .shadow-card-soft / .shadow-brand / .shadow-romance → global.scss
   - .safe-area-top / .safe-area-bottom → global.scss
   - .card-base / .card-base--pressed / .card-base--elevated → global.scss 与 _components.scss .base-card
   - .section-divider 系列 → _components.scss .base-divider
   - .img-rounded / .section-title-brand → global.scss 与 _components.scss .base-section-title
   - .press-feedback → global.scss
   此处删除重复声明，避免样式冲突与维护负担
   ================================================================ */

/* 页面根容器默认高度 */
.page-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
}

/* ================================================================
   页面过渡动画 - 350ms 淡入+上移（全局唯一定义）
   - .page-fade-in 直接由 CSS 类应用，无需 JS 状态切换
   - 350ms + cubic-bezier(0.34, 1.56, 0.64, 1) 弹性缓动
   - opacity 0→1 + translateY(8rpx)→0，从下方滑入
   - P3 修复：原 translateY(8px) 与其他动画（translateY(8rpx)/translateY(20rpx) 等）单位不统一，
     现统一为 rpx（uni-app 自动转换为对应平台的响应式像素）
   - mp-weixin 兼容：纯 CSS 动画，无 DOM API 依赖
   ================================================================ */
@keyframes pageFadeIn {
  from { opacity: 0; transform: translateY(8rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.page-fade-in {
  animation: pageFadeIn var(--d-slower, 350ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* ================================================================
   列表项 stagger 入场动画（解决"切换时需要能明显感知切换过程"）
   - 在列表容器上添加 .list-stagger
   - 列表项添加 .list-item
   - mp-weixin 支持 :nth-child 和 animation-delay
   ================================================================ */
@keyframes list-item-enter {
  from { opacity: 0; transform: translateY(16rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.list-item {
  animation: list-item-enter var(--d-fade, 300ms) cubic-bezier(0.4, 0, 0.2, 1) both;
}

.list-item:nth-child(1) { animation-delay: 0ms; }
.list-item:nth-child(2) { animation-delay: 60ms; }
.list-item:nth-child(3) { animation-delay: 120ms; }
.list-item:nth-child(4) { animation-delay: 180ms; }
.list-item:nth-child(5) { animation-delay: 240ms; }
.list-item:nth-child(6) { animation-delay: 300ms; }
.list-item:nth-child(n+7) { animation-delay: 360ms; }

/* ================================================================
   卡片错位入场动画（Phase F3）
   - 在卡片容器上添加 .card-stagger
   - 子卡片自动按 100ms 间隔错位入场
   - 用于首页推荐卡片、寻觅页权益卡片、村口页帖子卡片
   - mp-weixin 兼容：:nth-child + animation-delay
   ================================================================ */
@keyframes cardStaggerIn {
  from {
    opacity: 0;
    transform: translateY(32rpx) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* mp-weixin 兼容：WXSS 不支持 * 通配符选择器，使用 view 元素选择器替代。
   实际使用中 .card-stagger 的直接子元素均为 <view>（见 home/discover/village 页面）。 */
.card-stagger > view {
  animation: cardStaggerIn var(--d-bounce, 400ms) cubic-bezier(0.16, 1, 0.3, 1) both;
  will-change: transform, opacity;
}

.card-stagger > view:nth-child(1) { animation-delay: 0ms; }
.card-stagger > view:nth-child(2) { animation-delay: 100ms; }
.card-stagger > view:nth-child(3) { animation-delay: 200ms; }
.card-stagger > view:nth-child(4) { animation-delay: 300ms; }
.card-stagger > view:nth-child(5) { animation-delay: 400ms; }
.card-stagger > view:nth-child(n+6) { animation-delay: 500ms; }

/* ================================================================
   Tab 切换动画工具类（下划线滑动 + 内容淡入）
   - 在 tab 容器上添加 .tab-bar-slide
   - 在 tab 下划线上添加 .tab-underline（使用 transform 控制位置）
   - 在 tab 内容上添加 .tab-content-fade
   ================================================================ */
.tab-underline {
  transition: transform var(--d-slow, 250ms) cubic-bezier(0.4, 0, 0.2, 1),
              width var(--d-slow, 250ms) cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-content-fade {
  animation: tab-content-enter var(--d-slow, 250ms) cubic-bezier(0.4, 0, 0.2, 1) both;
}

@keyframes tab-content-enter {
  from { opacity: 0; transform: translateY(8rpx); }
  to { opacity: 1; transform: translateY(0); }
}

/* ================================================================
   页面滑入动画（从下往上，更强的切换感知）
   ================================================================ */
@keyframes page-slide-up {
  from { opacity: 0; transform: translateY(40rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.page-slide-up {
  animation: page-slide-up var(--d-slower, 350ms) cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* ================================================================
   页面缩放淡入动画（modal 风格切换）
   ================================================================ */
@keyframes page-scale-in {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}

.page-scale-in {
  animation: page-scale-in var(--d-fade, 300ms) cubic-bezier(0.4, 0, 0.2, 1) both;
}

/* ================================================================
   通用按压反馈工具类（mp-weixin :active 伪类不可靠，用 JS 控制）
   - 200ms cubic-bezier(0.4, 0, 0.2, 1) 标准缓动
   - 按压时 scale + box-shadow + opacity 三重视觉反馈
   - P3 修复：基础 .press-feedback 已迁移至 theme/global.scss
     此处仅保留 ripple 涟漪扩散动画（App.vue 独有，global.scss 未实现）
   ================================================================ */

/* 按钮按下时的涟漪扩散动画（替代单纯震动） */
.press-feedback--ripple::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: var(--r-circle, 50%);
  background: var(--c-secondary-blue-bg-tint-light, var(--c-secondary-blue-bg-tint-light, var(--c-secondary-blue-bg-tint-light, rgba(91, 127, 255, 0.15))));
  transform: translate(-50%, -50%);
  pointer-events: none;
  opacity: 0;
  transition: width var(--d-bounce, 400ms) ease-out, height var(--d-bounce, 400ms) ease-out, opacity var(--d-bounce, 400ms) ease-out;
}

.press-feedback--ripple.press-feedback--active::after {
  width: 200%;
  height: 200%;
  opacity: 0.6;
  transition: width var(--d-fade, 300ms) ease-out, height var(--d-fade, 300ms) ease-out, opacity var(--d-slowest, 600ms) ease-out;
}

/* ================================================================
   全局滚动条美化 —— P3 修复：与上方重复，已删除（仅保留一处定义）
   ================================================================ */

/* ================================================================
   骨架屏 Shimmer 动画（全局可用）
   ================================================================ */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* ================================================================
   P6 a11y：prefers-reduced-motion 回退
   为前庭功能障碍/动效敏感用户禁用所有动画与过渡。
   覆盖 15+ CSS 动画类：fadeIn/fadeInUp/scaleIn/pulseDot/bounceIn/
   float/heartBeat/gradientShine/pageFadeIn/list-item-enter/cardStaggerIn/
   tab-content-enter/page-slide-up/page-scale-in/pulse-badge/shimmer/
   tabBounce/iconSpin/dotPop/publishBreath/heart-burst
   ================================================================ */
@media (prefers-reduced-motion: reduce) {
  .animate-fade-in,
  .animate-fade,
  .animate-scale-in,
  .pulse-dot,
  .bounce-in,
  .float,
  .heart-beat,
  .gradient-shine,
  .page-fade-in,
  .page-slide-up,
  .page-scale-in,
  .tab-content-fade,
  .list-item,
  .card-stagger > view {
    animation: none !important;
    transition: none !important;
    will-change: auto !important;
    opacity: 1 !important;
    transform: none !important;
  }

  /* 通用过渡也禁用 */
  .card-hover,
  .clickable,
  .tab-underline,
  .tab-icon-wrap,
  .tab-icon-image,
  .tab-label,
  input,
  textarea {
    animation: none !important;
    transition: none !important;
  }

  /* 骨架屏 shimmer 也降级为静态 */
  .skeleton,
  .shimmer {
    animation: none !important;
  }
}

/* ================================================================
   基础卡片 hover 提升
   ================================================================ */
.card-hover {
  transition: transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}
.card-hover:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx var(--c-neutral-shadow-md, var(--c-neutral-shadow-md, var(--c-neutral-shadow-md, rgba(15, 23, 42, 0.06))));
}

/* ================================================================
   视觉层级与边缘强化工具类 —— P3 修复：
   - .card-base / .card-base--pressed / .card-base--elevated 已迁移至 theme/global.scss
   - .section-divider 系列已迁移至 _components.scss .base-divider
   - .img-rounded / .section-title-brand 已迁移至 theme/global.scss
   此处仅保留 .edge-accent / .edge-romance（App.vue 独有，global.scss 未定义）
   ================================================================ */

/* 强调边缘（品牌色/浪漫色） */
.edge-accent {
  border: var(--border-accent);
}

.edge-romance {
  border: var(--border-romance);
}

/* ================================================================
   底部安全区 - 为自定义 TabBar 预留空间（固定底部 ~160rpx）
   ================================================================ */
.page-bottom-safe {
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
}

/* 带缩进的底部安全区（内边距与左右边距一致） */
.page-bottom-safe--inset {
  padding-bottom: calc(160rpx + env(safe-area-inset-bottom));
  padding-left: var(--sp-7);
  padding-right: var(--sp-7);
}

/* TabBar 容器高度参考（供页面计算偏移用） */
page {
  --tabbar-height: calc(140rpx + env(safe-area-inset-bottom));
}

/* ================================================================
   P2 修复 · 表单输入框焦点状态（全局）
   - 焦点时边框变品牌色 + 轻微阴影，明确视觉反馈
   - 适配 H5/微信小程序双端，避免依赖组件级 scoped 样式
   - P6 a11y：使用 box-shadow 替代 outline（mp-weixin 不支持 outline），
     为键盘导航提供清晰焦点指示；触控操作时不显示焦点环（:focus-visible 语义）
   ================================================================ */
input,
textarea {
  /* 默认过渡：边框/阴影变化时 200ms 平滑过渡 */
  transition: border-color var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
}

/* H5 端：使用 :focus-visible 仅在键盘导航时显示焦点环 */
input:focus-visible,
textarea:focus-visible,
button:focus-visible,
view:focus-visible {
  outline: none;
  border-color: var(--c-brand, #3FCF8E);
  box-shadow: 0 0 0 4rpx var(--c-brand-bg-tint, rgba(63, 207, 142, 0.12));
}

/* mp-weixin / 触控端：保留原 :focus 行为（无 outline，仅 box-shadow） */
input:focus,
textarea:focus {
  outline: none;
  border-color: var(--c-brand, #3FCF8E);
  box-shadow: 0 0 0 4rpx var(--c-brand-bg-tint, rgba(63, 207, 142, 0.12));
}

/* 高对比度模式：强制显示焦点环（a11y 增强） */
@media (prefers-contrast: high) {
  input:focus,
  textarea:focus,
  button:focus,
  view:focus {
    outline: 2rpx solid var(--c-brand, #3FCF8E) !important;
    outline-offset: 2rpx;
  }
}

/* ================================================================
   P2 修复 · 列表项点击反馈（全局工具类 .clickable）
   - 使用：在可点击的 <view> 上添加 class="clickable"
   - 反馈：按下时 opacity 0.7 + scale(0.98)，松开自动恢复
   - 注意：mp-weixin 的 :active 伪类不可靠，已配合 hover-class 使用
   ================================================================ */
.clickable {
  transition: opacity var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1),
              transform var(--d-normal, 200ms) cubic-bezier(0.4, 0, 0.2, 1);
  /* mp-weixin 不支持 cursor:pointer，已通过 hover-class 提供按下反馈 */
}

.clickable:active {
  opacity: 0.7;
  transform: scale(0.98);
}

</style>