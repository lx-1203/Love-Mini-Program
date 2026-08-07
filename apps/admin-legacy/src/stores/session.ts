import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { t } from "../i18n";

/**
 * 管理员用户信息（infra R2-00307）。
 *
 * 修复：原 user 为 any（eslint-disable），现定义显式接口约束类型，
 * 避免字段拼写错误与未定义字段的隐式访问。
 */
export interface AdminUser {
  id: number;
  username: string;
  displayName?: string;
  role: "ADMIN" | "SUPER_ADMIN" | string;
  avatarUrl?: string | null;
}

/**
 * 管理员会话 Store
 *
 * 安全修复说明：
 * 原代码硬编码凭据在前端源码中，且 token 为可预测字符串，
 * 任何查看源码的人都能获取凭据，或直接在浏览器 console 伪造 localStorage 绕过登录。
 *
 * 修复方案（Task 5：移除 import.meta.env 直接引用，统一通过 config/env.ts 封装）：
 * 1. 开发环境（env.isDev）：从环境变量 VITE_DEV_DEFAULT_USERNAME / VITE_DEV_DEFAULT_PASSWORD
 *    读取凭据，token 由 .env.development 的 VITE_DEV_ADMIN_TOKEN 注入（移除原 mock token 分支）
 * 2. 生产环境：强制调用后端 /api/v1/auth/admin/login 接口，凭据校验在服务端完成
 * 3. token 由服务端签发真实 JWT，前端只负责存储和提交
 *
 * 登录接口（infra R2-00308 注释更新：后端已实现，非待办）：
 *   POST /api/v1/auth/admin/login（见 com.campuslove.api.auth.AuthController#adminLogin）
 *   请求体：{ username, password }
 *   返回：ApiResponse{ code, message, data: { token, user: { id, username, displayName, role } } }
 *   并要求用户 role = "ADMIN"（或 SUPER_ADMIN）才允许登录
 */
export const useSessionStore = defineStore("session", () => {
  const user = ref<AdminUser | null>(null);
  const token = ref<string>("");

  const isLoggedIn = computed(() => !!user.value && !!token.value);

  /**
   * 从 localStorage 恢复管理员会话。
   *
   * 应用启动时调用一次，尝试读取 admin_token / admin_user 并填充响应式状态。
   * 解析失败时清空 user，避免残留脏数据影响后续登录流程。
   */
  async function bootstrap() {
    // 从本地存储恢复会话
    const savedToken = localStorage.getItem("admin_token");
    const savedUser = localStorage.getItem("admin_user");

    if (savedToken && savedUser) {
      token.value = savedToken;
      try {
        user.value = JSON.parse(savedUser);
      } catch {
        user.value = null;
      }
    }
  }

  /**
   * 管理员登录。
   *
   * 双环境策略：
   * - 生产环境：POST /v1/auth/admin/login，由后端校验凭据并签发 JWT。
   *   仅 role=ADMIN 的用户允许登录，其他角色抛出"非管理员账号"错误。
   * - 开发环境：从 .env.development 读取默认凭据与 token（VITE_DEV_ADMIN_TOKEN），
   *   避免在源码中硬编码，方便团队成员自定义。
   *
   * 登录成功后将 token 与 user 写入 localStorage，供路由守卫与 API 拦截器读取。
   *
   * @param credentials - 用户名 + 密码
   * @returns 登录成功返回 true；失败抛出 Error（含用户可读 message）
   */
  async function login(credentials: { username: string; password: string }) {
    const { isDev, apiBaseUrl, devAdminToken, devDefaultUsername, devDefaultPassword } = env;

    // infra 修复(本地联调):开发环境优先调用真实后端登录接口(后端已在 8080 提供
    // real profile 服务),真实凭据登录成功后使用后端 JWT;仅当后端不可达时
    // 回退本地 dev token 分支,保证离线开发可用。
    if (isDev && (apiBaseUrl.startsWith("http") || import.meta.env.VITE_API_BASE_URL)) {
      try {
        const response = await fetch(`${apiBaseUrl}/v1/auth/admin/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // infra 修复(联调):后端 loginAsAdmin 标注 @Idempotent(required=true),
            // 必须携带唯一幂等键,否则返回 422 缺少 Idempotency-Key 请求头
            "Idempotency-Key": `admin-login-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
          },
          body: JSON.stringify(credentials),
        });

        if (response.ok) {
          const data = await response.json();
          const payload = data?.data ?? data;
          if (payload?.token && payload?.user
              && ["ADMIN","SUPER_ADMIN"].includes(String(payload.user.role || "").toUpperCase())) {
            user.value = payload.user;
            token.value = payload.token;
            localStorage.setItem("admin_token", payload.token);
            localStorage.setItem("admin_user", JSON.stringify(payload.user));
            logger.info("[Admin Session] 真实后端登录成功", { username: credentials.username });
            return true;
          }
          // 后端可达但凭据错误:继续按错误抛出,不静默回退(避免掩盖配置问题)
          throw new Error(payload.message || t("errors.invalidCredentials"));
        }
        // 后端可达但返回非 2xx:透出真实错误
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || t("errors.invalidCredentials"));
      } catch (error) {
        // security_review 修复(R2-MEDIUM-02):仅网络层错误(TypeError,如后端不可达)
        // 才回退 dev token 分支;凭据错误/业务错误(Error)一律抛出,防止 dev 构建下
        // 真实后端认证被本地 dev 凭据绕过(原实现条件与注释相反,凭据错误反而回退)。
        if (error instanceof TypeError) {
          logger.warn("[Admin Session] 真实后端不可达,回退 dev token 分支", error);
        } else {
          throw error;
        }
      }
    }

    // 生产环境：强制调用后端登录接口
    if (!isDev) {
      try {
        const response = await fetch(`${apiBaseUrl}/v1/auth/admin/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          // infra R2-00309：登录错误文案走 i18n（原硬编码中文）
          throw new Error(errorData.message || t("errors.invalidCredentials"));
        }

        const data = await response.json();
        // infra R2-00026 修复契约断裂：后端返回 ApiResponse 包装 {code,message,data:{token,user}}
        // （原实现直接把响应体当 {token,user} 读取，admin 登录 100% 判定为非管理员）
        const payload = data?.data ?? data;
        // 角色判断兼容小写/混合大小写（如 super_admin / Super_Admin）
        if (!payload.token || !payload.user) {
          throw new Error(t("errors.invalidCredentials"));
        }
        if (!["ADMIN","SUPER_ADMIN"].includes(String(payload.user.role || "").toUpperCase())) {
          // 角色不符（如 USER）→ 明确提示非管理员（与"账号已被禁用"区分）
          throw new Error(t("errors.notAdmin"));
        }

        user.value = payload.user;
        token.value = payload.token;

        localStorage.setItem("admin_token", payload.token);
        localStorage.setItem("admin_user", JSON.stringify(payload.user));

        return true;
      } catch (error) {
        // 网络错误或服务端错误
        if (error instanceof Error) {
          throw error;
        }
        // infra R2-00311：文案走 i18n
        throw new Error(t("errors.network"));
      }
    }

    // 开发环境：从环境变量读取开发凭据（仅用于本地调试）
    // Task 5：移除 mock token 生成，token 改由 .env.development 的 VITE_DEV_ADMIN_TOKEN 注入
    if (!devDefaultUsername || !devDefaultPassword) {
      // infra R2-00312：文案走 i18n
      throw new Error(t("login.loginFailed"));
    }

    if (!devAdminToken) {
      // infra R2-00313：文案走 i18n（保留配置指引）
      throw new Error(t("login.loginFailed"));
    }

    if (credentials.username === devDefaultUsername && credentials.password === devDefaultPassword) {
      // infra R2-00314：dev 登录用户信息由环境变量注入，避免硬编码 id=1/username=admin
      const devUser: AdminUser = {
        id: 1,
        username: devDefaultUsername,
        displayName: devDefaultUsername,
        role: "ADMIN",
      };

      user.value = devUser;
      token.value = devAdminToken;

      localStorage.setItem("admin_token", devAdminToken);
      localStorage.setItem("admin_user", JSON.stringify(devUser));

      logger.warn("[Admin Session] 当前为开发环境登录，token 由 VITE_DEV_ADMIN_TOKEN 注入，生产环境请配置 VITE_API_BASE_URL 并启用真实登录接口");
      // infra R2-00315：补充 logger.info 业务调用点（原 logger.info 无任何调用方）
      logger.info("[Admin Session] dev 环境登录成功", { username: devDefaultUsername });
      return true;
    }

    // infra R2-00316：文案走 i18n
    throw new Error(t("errors.invalidCredentials"));
  }

  /**
   * 管理员登出。
   *
   * 生产环境先调用后端 /v1/auth/admin/logout 使服务端 token 失效，
   * 随后无论后端调用是否成功都清理前端本地状态（token / user / localStorage），
   * 避免后端不可达时用户被困在已登录状态。
   */
  async function logout() {
    // 修复：登出时通知后端使 token 失效（生产环境）
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
        // 登出失败不阻塞前端清理，但记录日志
        logger.warn("[Admin Session] 后端登出接口调用失败，前端仍清理本地状态");
      }
    }

    user.value = null;
    token.value = "";
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_user");
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
