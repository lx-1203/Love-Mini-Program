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

    // 边界处理：userSession 为空但本地仍有 token，说明会话信息丢失但用户可能仍处于登录态
    // （例如 bootstrap 因网络异常失败，userSession 未加载，但 token 仍在本地存储中）
    // 此时不应误判 isLoggedIn=false 而跳转登录页，让页面正常加载，
    // 后续 API 若返回 401 会由 HTTP 拦截器走标准的刷新/登出流程
    if (!current && requirements.requiresAuth && getToken()) {
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