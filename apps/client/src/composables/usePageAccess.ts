import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
import { useSessionStore } from "../stores/session";
import { resolveSessionAccess, type PageRequirements } from "../guards/session-guard";
import { resolveProfileGuard } from "../guards/profile-guard";
import { useUnlockGuideStore } from "../stores/unlock-guide";
import { replaceAppPath } from "../utils/navigation";
import { getToken } from "../services/http";

/**
 * 获取当前页面路径（用于 profile-guard 弹窗文案）
 * 返回标准化的路径，带前导斜杠。
 */
function getCurrentPagePath(): string {
  try {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    if (!current) return "";
    // 兼容 H5/小程序：route 不带前导斜杠，统一补上
    const route: string | undefined =
      (current as { route?: string }).route ??
      (current as { $page?: { fullPath?: string } }).$page?.fullPath;
    if (!route) return "";
    return route.startsWith("/") ? route : `/${route}`;
  } catch (_e) {
    return "";
  }
}

/**
 * 模块级刷新标志，防止多个页面 onShow 并发触发 refreshSession。
 * 修复（P0 BUG）：原实现 token 存在但 userSession 为空时直接放行，
 * 不尝试恢复会话，导致用户带着失效 token 进入受保护页面，
 * 直到下次 API 401 才被拦截。现主动尝试 refresh，失败则跳登录。
 */
let isRefreshingSession = false;

export function usePageAccess(requirements: PageRequirements) {
  const sessionStore = useSessionStore();
  const unlockGuideStore = useUnlockGuideStore();
  const { userSession } = storeToRefs(sessionStore);

  onShow(() => {
    // 会话还在加载中，跳过守卫检查（避免误判 isLoggedIn=false）
    if (sessionStore.loading) {
      return;
    }

    // 离线状态下不重定向，让页面自行处理离线 UI
    // （bootstrap 因网络异常失败时 isOffline=true，但用户可能仍持有有效 token）
    if (sessionStore.isOffline) {
      return;
    }

    const current = userSession.value;

    // 修复（P0 BUG）：token 存在但 userSession 为空时，主动尝试 refresh 恢复会话，
    // 而非直接放行。refresh 失败（认证类错误）则跳登录；网络/业务错误由 isOffline / 页面处理。
    // 原实现直接 return 放行，用户可能带着失效 token 进入受保护页面，
    // 直到触发 API 401 才被拦截，存在安全隐患（页面可能已渲染敏感数据）。
    if (!current && requirements.requiresAuth && getToken()) {
      if (!isRefreshingSession) {
        isRefreshingSession = true;
        sessionStore
          .refreshSession()
          .catch((err: unknown) => {
            console.warn("[usePageAccess] 会话刷新失败:", err);
            // 认证类错误（401/403）：跳登录
            // http 层 401 处理通常已触发跳转，此处兜底确保跳转（避免竞态遗漏）
            const category = (err as { category?: string })?.category;
            if (category === "auth") {
              uni.reLaunch({ url: "/pages/login/index" });
            }
            // 网络错误 / 业务错误：不跳转，由 isOffline 状态或页面自行处理
          })
          .finally(() => {
            isRefreshingSession = false;
          });
      }
      // 暂时放行，等 refresh 完成后由反应式系统（userSession 变更）触发下次 onShow 重新检查
      return;
    }

    // Phase 4 任务 20：先用 profile-guard 检查是否需要弹出解锁引导弹窗
    // 仅对 LOCKED_PAGES（likes/village/messages）生效；非锁定页面返回 allowed=true 直接放行
    const currentPath = getCurrentPagePath();
    if (currentPath) {
      const profileDecision = resolveProfileGuard(currentPath);
      if (!profileDecision.allowed && profileDecision.shouldShowModal) {
        // 触发响应式 store 状态，由 App.vue 全局挂载的 UnlockGuideModal 展示
        // 不再调用 replaceAppPath 静默重定向，提升用户体验
        unlockGuideStore.show(
          profileDecision.featureName ?? "此功能",
          profileDecision.completionPercent
        );
        return;
      }
    }

    const decision = resolveSessionAccess(
      {
        isLoggedIn: Boolean(current?.loggedIn),
        profileCompleted: Boolean(current?.profileCompleted),
        campusCompleted: Boolean(current?.campusVerified),
        scheduleCompleted: Boolean(current?.scheduleCompleted),
        featureFlags: current?.featureFlags ?? {},
      },
      requirements
    );

    if (!decision.allowed && decision.redirectTo) {
      // 需要登录但本地无 token，说明登录态已失效，给出友好提示而非静默跳转
      if (requirements.requiresAuth && !getToken()) {
        uni.showToast({ title: "登录已过期，请重新登录", icon: "none" });
      }
      replaceAppPath(decision.redirectTo);
    }
  });
}