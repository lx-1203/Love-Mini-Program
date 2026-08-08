import { onShow } from "@dcloudio/uni-app";
import { storeToRefs } from "pinia";
// 展示模式（全功能展示版）：旁路全部页面守卫，演示者可无摩擦跳转任意页面
import { isShowcaseMode } from "../config/showcase";
import { useSessionStore } from "../stores/session";
import { resolveSessionAccess, type PageRequirements } from "../guards/session-guard";
import { resolveProfileGuard } from "../guards/profile-guard";
import { useUnlockGuideStore } from "../stores/unlock-guide";
import { replaceAppPath } from "../utils/navigation";
import { getToken } from "../services/http";
// Task 33：路由路径常量化，避免硬编码字符串
import { ROUTES } from "../constants/routes";
// infra R2-00140: 复用 compat 的 getCurrentPagePath（含 H5/MP 平台差异处理），
// 消除本文件与 compat/index.ts 的重复实现（原审计项：守卫双实现/重复工具）。
import { getCurrentPagePath } from "../compat";
// R4-batch2: 会话过期 toast 文案 i18n 化
import { t } from "@/i18n";

/**
 * 模块级刷新标志，防止多个页面 onShow 并发触发 refreshSession。
 * 修复（P0 BUG）：原实现 token 存在但 userSession 为空时直接放行，
 * 不尝试恢复会话，导致用户带着失效 token 进入受保护页面，
 * 直到下次 API 401 才被拦截。现主动尝试 refresh，失败则跳登录。
 */
let isRefreshingSession = false;

/**
 * 页面访问守卫组合式函数：在 onShow 时根据会话状态与页面要求决定是否放行或重定向。
 *
 * <p>处理流程（顺序）：</p>
 * <ol>
 *   <li>会话加载中 / 离线状态：跳过守卫，避免误判与阻塞离线访问</li>
 *   <li>token 存在但 userSession 为空：主动调用 refreshSession 恢复会话，
 *       认证类错误跳登录，其他错误暂时放行等下次 onShow 重新检查</li>
 *   <li>profile-guard 检查：锁定页面（likes/village/messages）未完善资料时
 *       触发 UnlockGuideModal 弹窗，不放行</li>
 *   <li>session-guard 检查：按 requiresAuth / profileCompleted / campusVerified /
 *       scheduleCompleted 等条件决定放行或重定向到登录/完善资料页</li>
 * </ol>
 *
 * <p>修复（P0 BUG）：原实现 token 存在但 userSession 为空时直接放行，
 * 用户可能带着失效 token 进入受保护页面。现主动尝试 refresh，失败则跳登录。</p>
 *
 * @param requirements - 页面访问要求（requiresAuth / requiresProfileCompleted 等）
 */
export function usePageAccess(requirements: PageRequirements) {
  const sessionStore = useSessionStore();
  const unlockGuideStore = useUnlockGuideStore();
  const { userSession } = storeToRefs(sessionStore);

  onShow(() => {
    // 展示模式（全功能展示版）：旁路全部守卫，演示者可无摩擦跳转任意页面。
    // 仅在 VITE_SHOWCASE_MODE=true 的展示构建中生效，正式包恒为 false。
    if (isShowcaseMode) {
      return;
    }

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
              uni.reLaunch({ url: ROUTES.LOGIN });
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
        uni.showToast({ title: t("apiErrors.unauthorized"), icon: "none" });
      }
      replaceAppPath(decision.redirectTo);
    }
  });
}