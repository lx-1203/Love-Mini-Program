import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { env } from "../config/env";
import { logger } from "../utils/logger";

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
 * 后端需实现 POST /api/v1/auth/admin/login 接口：
 *   请求体：{ username, password }
 *   返回：{ token, user: { id, username, displayName, role } }
 *   并要求用户 role = "ADMIN" 才允许登录
 */
export const useSessionStore = defineStore("session", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const user = ref<any>(null);
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
          throw new Error(errorData.message || "用户名或密码错误");
        }

        const data = await response.json();
        if (!data.token || !data.user || data.user.role !== "ADMIN") {
          throw new Error("非管理员账号，禁止登录");
        }

        user.value = data.user;
        token.value = data.token;

        localStorage.setItem("admin_token", data.token);
        localStorage.setItem("admin_user", JSON.stringify(data.user));

        return true;
      } catch (error) {
        // 网络错误或服务端错误
        if (error instanceof Error) {
          throw error;
        }
        throw new Error("登录失败，请检查网络连接");
      }
    }

    // 开发环境：从环境变量读取开发凭据（仅用于本地调试）
    // Task 5：移除 mock token 生成，token 改由 .env.development 的 VITE_DEV_ADMIN_TOKEN 注入
    if (!devDefaultUsername || !devDefaultPassword) {
      throw new Error("开发凭据未配置");
    }

    if (!devAdminToken) {
      throw new Error("开发环境管理员 token 未配置（请在 .env.development 设置 VITE_DEV_ADMIN_TOKEN）");
    }

    if (credentials.username === devDefaultUsername && credentials.password === devDefaultPassword) {
      const devUser = {
        id: 1,
        username: "admin",
        displayName: "系统管理员",
        role: "ADMIN",
      };

      user.value = devUser;
      token.value = devAdminToken;

      localStorage.setItem("admin_token", devAdminToken);
      localStorage.setItem("admin_user", JSON.stringify(devUser));

      logger.warn("[Admin Session] 当前为开发环境登录，token 由 VITE_DEV_ADMIN_TOKEN 注入，生产环境请配置 VITE_API_BASE_URL 并启用真实登录接口");
      return true;
    }

    throw new Error("用户名或密码错误");
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
