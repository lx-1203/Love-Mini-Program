import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { t } from "../i18n";

/**
 * 管理员用户信息（复制自旧后台 apps/admin，新增 campusName 字段）。
 *
 * 显式接口约束类型，避免字段拼写错误与未定义字段的隐式访问。
 */
export interface AdminUser {
  id: number;
  username: string;
  displayName?: string;
  role: "ADMIN" | "SUPER_ADMIN" | string;
  /** 管辖校区名（校区管理员非空；全局超级管理员可为空） */
  campusName?: string;
  avatarUrl?: string | null;
}

/**
 * 管理员会话 Store（复制自旧后台 apps/admin，token key 改为 admin_v2_token）。
 *
 * 安全说明：
 * - 开发环境（env.isDev）：优先调用真实后端登录接口；仅当后端不可达（网络层
 *   TypeError）时回退本地 dev token 分支，凭据与 token 由环境变量注入，
 *   不硬编码在源码中。
 * - 生产环境：强制调用后端 /api/v1/auth/admin/login，凭据校验在服务端完成，
 *   token 为后端签发的真实 JWT，前端只负责存储和提交。
 *
 * 登录接口：
 *   POST /api/v1/auth/admin/login（见 com.campuslove.api.auth.AuthController#adminLogin）
 *   请求体：{ username, password }
 *   返回：ApiResponse{ code, message, data: { token, user: { id, username, displayName, role, campusName } } }
 *   并要求用户 role = "ADMIN"（或 SUPER_ADMIN）才允许登录
 *
 * localStorage key 约定（v2 与旧后台隔离）：
 *   - admin_v2_token：JWT
 *   - admin_v2_user：序列化的 AdminUser JSON
 */
export const useSessionStore = defineStore("session", () => {
  const user = ref<AdminUser | null>(null);
  const token = ref<string>("");

  const isLoggedIn = computed(() => !!user.value && !!token.value);

  /**
   * 从 localStorage 恢复管理员会话。
   *
   * 应用启动时调用一次，尝试读取 admin_v2_token / admin_v2_user 并填充响应式状态。
   * 解析失败时清空 user，避免残留脏数据影响后续登录流程。
   */
  async function bootstrap() {
    const savedToken = localStorage.getItem("admin_v2_token");
    const savedUser = localStorage.getItem("admin_v2_user");

    if (savedToken && savedUser) {
      token.value = savedToken;
      try {
        user.value = JSON.parse(savedUser) as AdminUser;
      } catch {
        user.value = null;
      }
    }
  }

  /**
   * 管理员登录（真实后端 /api/v1/auth/admin/login）。
   *
   * 双环境策略：
   * - 开发环境：优先调用真实后端；后端不可达（网络层错误）时回退本地 dev 凭据分支。
   * - 生产环境：强制调用后端，仅 role=ADMIN/SUPER_ADMIN 允许登录。
   *
   * 登录成功后将 token 与 user 写入 localStorage（admin_v2_token / admin_v2_user）。
   *
   * @param credentials - 用户名 + 密码
   * @returns 登录成功返回 true；失败抛出 Error（含用户可读 message）
   */
  async function login(credentials: { username: string; password: string }) {
    const { isDev, apiBaseUrl, devAdminToken, devDefaultUsername, devDefaultPassword } = env;

    // 后端登录调用（isDev 与 !isDev 共用同一实现，通过 try/catch 区分回退策略）
    const callBackend = async (): Promise<boolean> => {
      const response = await fetch(`${apiBaseUrl}/v1/auth/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // 后端 loginAsAdmin 标注 @Idempotent(required=true)，
          // 必须携带唯一幂等键，否则返回 422 缺少 Idempotency-Key 请求头
          "Idempotency-Key": `admin-login-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        const data = await response.json();
        // 兼容 ApiResponse 包装 {code,message,data:{token,user}} 与直出两种形态
        const payload = data?.data ?? data;
        if (
          payload?.token && payload?.user
          && ["ADMIN", "SUPER_ADMIN"].includes(String(payload.user.role || "").toUpperCase())
        ) {
          const loggedInUser = payload.user as AdminUser;
          user.value = loggedInUser;
          token.value = payload.token;
          localStorage.setItem("admin_v2_token", payload.token);
          localStorage.setItem("admin_v2_user", JSON.stringify(loggedInUser));
          logger.info("[AdminV2 Session] 真实后端登录成功", { username: credentials.username });
          return true;
        }
        // 后端可达但凭据错误 / 角色不符：继续按错误抛出，不静默回退
        throw new Error(payload.message || t("errors.invalidCredentials"));
      }

      // 后端可达但返回非 2xx：透出真实错误
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || t("errors.invalidCredentials"));
    };

    if (isDev) {
      try {
        return await callBackend();
      } catch (error) {
        // 仅网络层错误（TypeError，如后端不可达）才回退 dev token 分支；
        // 凭据错误/业务错误（Error）一律抛出，防止 dev 构建下真实后端认证被本地凭据绕过。
        if (error instanceof TypeError) {
          logger.warn("[AdminV2 Session] 真实后端不可达，回退 dev token 分支", error);
        } else {
          throw error;
        }
      }

      // 开发环境：从环境变量读取开发凭据（仅用于本地调试）
      if (!devDefaultUsername || !devDefaultPassword) {
        throw new Error(t("login.loginFailed"));
      }
      if (!devAdminToken) {
        throw new Error(t("login.loginFailed"));
      }
      if (credentials.username === devDefaultUsername && credentials.password === devDefaultPassword) {
        const devUser: AdminUser = {
          id: 1,
          username: devDefaultUsername,
          displayName: devDefaultUsername,
          role: "ADMIN",
        };
        user.value = devUser;
        token.value = devAdminToken;
        localStorage.setItem("admin_v2_token", devAdminToken);
        localStorage.setItem("admin_v2_user", JSON.stringify(devUser));
        logger.warn("[AdminV2 Session] 当前为开发环境登录，token 由 VITE_DEV_ADMIN_TOKEN 注入");
        return true;
      }
      throw new Error(t("errors.invalidCredentials"));
    }

    // 生产环境：强制调用后端登录接口
    try {
      return await callBackend();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(t("errors.network"));
    }
  }

  /**
   * 管理员登出。
   *
   * 生产环境先调用后端 /v1/auth/admin/logout 使服务端 token 失效，
   * 随后无论后端调用是否成功都清理前端本地状态（token / user / localStorage），
   * 避免后端不可达时用户被困在已登录状态。
   */
  async function logout() {
    const { isDev, apiBaseUrl } = env;

    if (!isDev && token.value) {
      try {
        await fetch(`${apiBaseUrl}/v1/auth/admin/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token.value}`,
          },
        });
      } catch {
        logger.warn("[AdminV2 Session] 后端登出接口调用失败，前端仍清理本地状态");
      }
    }

    user.value = null;
    token.value = "";
    localStorage.removeItem("admin_v2_token");
    localStorage.removeItem("admin_v2_user");
  }

  return {
    user,
    token,
    isLoggedIn,
    bootstrap,
    login,
    logout,
  };
});
