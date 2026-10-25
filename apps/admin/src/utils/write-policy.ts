/**
 * 后台写权限的唯一判定口径。
 *
 * 视图（v-if="sessionStore.canWrite"）与 HTTP 层（api/http.ts 的 request）共用本函数，
 * 免得 role 字符串在 20 多个视图里各比一次而漂移。
 * 未知角色一律按只读处理（fail-closed）。
 */

/** 允许提交写操作（POST/PUT/PATCH/DELETE）的角色。 */
const WRITE_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

/** 归一化角色字符串（去空白、大写；非字符串一律视为空）。 */
export function normalizeRole(role: unknown): string {
  return typeof role === "string" ? role.trim().toUpperCase() : "";
}

/** 该角色能否执行写操作。 */
export function roleCanWrite(role: unknown): boolean {
  return WRITE_ROLES.has(normalizeRole(role));
}

/**
 * 读取本地会话中记录的管理员角色，供非组件场景（HTTP 拦截器）使用。
 *
 * @returns 已落盘会话时返回归一化角色（可能是空串，表示角色缺失/不可识别）；
 *          本地无会话记录（登录请求本身、登出之后）时返回 null，调用方据此不拦截，
 *          交由后端 401 走既有跳登录流程。
 */
export function persistedSessionRole(): string | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem("admin_v2_user");
  if (raw === null) return null;
  try {
    return normalizeRole((JSON.parse(raw) as { role?: unknown })?.role);
  } catch {
    // 会话记录被写坏时按「已登录但角色不明」处理，交由调用方 fail-closed
    return "";
  }
}
