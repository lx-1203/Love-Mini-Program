/**
 * 后台写权限的唯一判定口径。
 *
 * 视图（v-if="sessionStore.canWrite"）与 HTTP 层（api/http.ts 的 request）共用本函数，
 * 免得 role 字符串在 20 多个视图里各比一次而漂移。
 * 未知角色一律按只读处理（fail-closed）。
 *
 * ⚠ 权限位是三个而不是一个（DEFECT 1，2026-10-31）：后端 @PreAuthorize 本身就是三档，
 * 只留 canWrite 一档会让校区 ADMIN 在每个超管端点上白吃一次 403。档位对照（取自 Java 源码）：
 *   1) canWrite          ↔ SecurityConfig 对 /api/v1/admin/** 的 POST/PUT/PATCH/DELETE
 *                           放行的 ADMIN + SUPER_ADMIN（写操作总开关）；
 *   2) canSuperAdminWrite ↔ 方法级 @PreAuthorize("hasRole('SUPER_ADMIN')")，共 42 处，
 *                           例如 admin/AdminSchoolController.java:129（新增高校）、
 *                           admin/AdminRoleController.java:57（类级，整个角色 CRUD）；
 *   3) canAdminOnlyWrite  ↔ @PreAuthorize("hasRole('ADMIN')")，例如
 *                           feedback/FeedbackController.java:143（回复反馈）。
 *                           注意 SUPER_ADMIN 同样满足 hasRole('ADMIN')：
 *                           config/JwtAuthenticationFilter.java:374 按 User#isWriteAdmin()
 *                           （entity/User.java:414-416，ADMIN 与 SUPER_ADMIN 皆为真）注入
 *                           ROLE_ADMIN，SUPER_ADMIN 只是「额外」再带 ROLE_SUPER_ADMIN（:380）。
 *                           所以本档位 today 的角色集合是 {ADMIN, SUPER_ADMIN}，与 canWrite 相同；
 *                           单独设位是为了让「后端一旦收紧为纯 ADMIN」这件事变成前端可见的契约，
 *                           而不是等运营点一次 403 才发现（tests/admin-write-gate.spec.mjs 判此轴）。
 */

/**
 * 三档权限位对应的角色集合（唯一事实来源，必须是字面量数组）。
 *
 * 为什么先写字面量再由它构造 Set：契约门（tests/admin-write-gate.spec.mjs）是从本文件
 * **源码文本**正则出档位角色的。写成 `[...WRITE_ROLES]` 时门读到的是空集合，
 * 「UI 位放行的角色 ⊆ 后端接受的角色」会因空集而恒成立 —— 一条假装在跑的交叉核对
 * （2026-10-31 DEFECT 1 修复时踩到，门里已加「档位不得为空」的下限断言）。
 * 下面的档位也单独有 src/utils/write-policy.test.ts 的行为测试兜底。
 */
export const ROLE_TIER_SNAPSHOT = {
  /** 档位 1：URL 层可写管理员（SecurityConfig 对 /api/v1/admin/** 的写方法放行集）。 */
  canWrite: ["ADMIN", "SUPER_ADMIN"],
  /** 档位 2：后端 hasRole('SUPER_ADMIN') 的 42 个超管端点。 */
  canSuperAdminWrite: ["SUPER_ADMIN"],
  /** 档位 3：后端 hasRole('ADMIN') 端点（SUPER_ADMIN 亦持有 ROLE_ADMIN，见文件头）。 */
  canAdminOnlyWrite: ["ADMIN", "SUPER_ADMIN"],
} as const;

/** 档位 1：允许提交写操作（POST/PUT/PATCH/DELETE）的角色 = URL 层可写管理员。 */
const WRITE_ROLES = new Set<string>(ROLE_TIER_SNAPSHOT.canWrite);

/** 档位 2：超管专属写操作（后端 hasRole('SUPER_ADMIN')）。 */
const SUPER_WRITE_ROLES = new Set<string>(ROLE_TIER_SNAPSHOT.canSuperAdminWrite);

/**
 * 档位 3：后端 hasRole('ADMIN') 端点的实际可接受角色集合。
 * 与档位 1 同集合，理由见文件头注释（JwtAuthenticationFilter 给 SUPER_ADMIN 也注入了 ROLE_ADMIN）。
 */
const ADMIN_ONLY_WRITE_ROLES = new Set<string>(ROLE_TIER_SNAPSHOT.canAdminOnlyWrite);

/** 归一化角色字符串（去空白、大写；非字符串一律视为空）。 */
export function normalizeRole(role: unknown): string {
  return typeof role === "string" ? role.trim().toUpperCase() : "";
}

/** 该角色能否执行写操作（档位 1，总开关）。 */
export function roleCanWrite(role: unknown): boolean {
  return WRITE_ROLES.has(normalizeRole(role));
}

/** 该角色能否执行超管专属写操作（档位 2）。 */
export function roleCanSuperAdminWrite(role: unknown): boolean {
  return SUPER_WRITE_ROLES.has(normalizeRole(role));
}

/** 该角色能否执行 hasRole('ADMIN') 端点的写操作（档位 3）。 */
export function roleCanAdminOnlyWrite(role: unknown): boolean {
  return ADMIN_ONLY_WRITE_ROLES.has(normalizeRole(role));
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
