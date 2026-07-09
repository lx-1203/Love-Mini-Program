import { defineStore } from "pinia";
import { ref, computed } from "vue";

/**
 * 管理员会话 Store
 *
 * 安全修复说明：
 * 原代码硬编码 admin/admin123 凭据在前端源码中，且 token 为可预测字符串，
 * 任何查看源码的人都能获取凭据，或直接在浏览器 console 伪造 localStorage 绕过登录。
 *
 * 修复方案：
 * 1. 开发环境（import.meta.env.DEV）：保留 mock 登录便于本地调试
 * 2. 生产环境：强制调用后端 /api/auth/admin/login 接口，凭据校验在服务端完成
 * 3. token 由服务端签发真实 JWT，前端只负责存储和提交
 *
 * 后端需实现 POST /api/auth/admin/login 接口：
 *   请求体：{ username, password }
 *   返回：{ token, user: { id, username, displayName, role } }
 *   并要求用户 role = "ADMIN" 才允许登录
 */
export const useSessionStore = defineStore("session", () => {
  const user = ref<any>(null);
  const token = ref<string>("");

  const isLoggedIn = computed(() => !!user.value && !!token.value);

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

  async function login(credentials: { username: string; password: string }) {
    const isDev = import.meta.env.DEV;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8080/api";

    // 生产环境：强制调用后端登录接口
    if (!isDev) {
      try {
        const response = await fetch(`${apiBaseUrl}/auth/admin/login`, {
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

    // 开发环境：保留 mock 登录（仅用于本地调试）
    // ⚠️ 警告：此 mock 仅限开发环境使用，生产环境必须配置 VITE_API_BASE_URL 并启用真实登录
    if (credentials.username === "admin" && credentials.password === "admin123") {
      const mockUser = {
        id: 1,
        username: "admin",
        displayName: "系统管理员",
        role: "ADMIN",
      };
      // 使用更随机的 token，但仍为开发用，生产环境必须由服务端签发
      const mockToken = `dev-admin-token-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      user.value = mockUser;
      token.value = mockToken;

      localStorage.setItem("admin_token", mockToken);
      localStorage.setItem("admin_user", JSON.stringify(mockUser));

      console.warn("[Admin Session] 当前为开发环境 mock 登录，生产环境请配置 VITE_API_BASE_URL 并启用真实登录接口");
      return true;
    }

    throw new Error("用户名或密码错误");
  }

  async function logout() {
    // 修复：登出时通知后端使 token 失效（生产环境）
    const isDev = import.meta.env.DEV;
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8080/api";

    if (!isDev && token.value) {
      try {
        await fetch(`${apiBaseUrl}/auth/admin/logout`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token.value}`,
          },
        });
      } catch {
        // 登出失败不阻塞前端清理，但记录日志
        console.warn("[Admin Session] 后端登出接口调用失败，前端仍清理本地状态");
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
