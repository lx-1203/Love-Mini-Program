/**
 * 后台写权限的唯一判定口径。
 *
 * 视图（v-if="sessionStore.canWrite"）与 HTTP 层（api/http.ts 的 request）共用本函数，
 * 免得 role 字符串在 20 多个视图里各比一次而漂移。
 * 未知角色一律按只读处理（fail-closed）。
 *
 * ⚠ 权限位是两档而不是三档（DEFECT 1，2026-10-31；档位 3 于第五轮删除，见下）：
 *   1) canWrite          ↔ SecurityConfig 对 /api/v1/admin/** 的 POST/PUT/PATCH/DELETE
 *                           放行的 ADMIN + SUPER_ADMIN（写操作总开关）；
 *   2) canSuperAdminWrite ↔ 方法级 @PreAuthorize("hasRole('SUPER_ADMIN')")，
 *                           例如 admin/AdminSchoolController.java:129（新增高校）、
 *                           admin/AdminRoleController.java:57（类级，整个角色 CRUD）。
 *
 * 为什么删掉档位 3（canAdminOnlyWrite，第五轮 B-FINDING 12）：
 *   它对应 @PreAuthorize("hasRole('ADMIN')")（feedback/FeedbackController.java:143）。
 *   但 SUPER_ADMIN 同样持有 ROLE_ADMIN —— 依据：config/JwtAuthenticationFilter.java:374 按
 *   User#isWriteAdmin()（entity/User.java:414-416，ADMIN 与 SUPER_ADMIN 皆为真）注入
 *   ROLE_ADMIN，SUPER_ADMIN 只是「额外」再带 ROLE_SUPER_ADMIN（:380）。故 hasRole('ADMIN')
 *   端点的【实际可接受角色集合】= {ADMIN, SUPER_ADMIN}，与 canWrite 逐字相同：这一档永远无法
 *   比 canWrite 更窄，是「为将来收紧预留」的空位，而今天没有任何视图消费它（grep canAdminOnlyWrite
 *   apps/admin/src/views = 0）。空位 + 无消费者 = 既无价值又给「42 处」这类过期口径供弹药，故删除。
 *   若后端真的把某端点收紧为纯 ADMIN（SUPER_ADMIN 拿不到 ROLE_ADMIN），届时新增一个真实更窄的位，
 *   并由 tests/admin-write-gate.spec.mjs 的「档位↔消费方」判点保证它不会又变成死位。
 *
 * 档位 2「共多少处」不再手写死数（第五轮 B-FINDING 13）：以
 *   ADMIN_WRITE_GATE_VERBOSE=1 node tests/admin-write-gate.spec.mjs
 * 实跑为准 —— 该门会打印「Java 注解 hasRole('SUPER_ADMIN') 命中数」与「门归档的 super-only
 * TS 写函数数」两个读数并断言「归档函数数 ≤ 注解数」。注解数与归档函数数本就不等（门只归档
 * 落在 /api/v1/admin/** 且被 TS 命中的端点），拿任一数去对账都会得出错误结论，故不再写死。
 */

/**
 * 两档权限位对应的角色集合（唯一事实来源，必须是字面量数组）。
 *
 * 为什么先写字面量再由它构造 Set：契约门（tests/admin-write-gate.spec.mjs）是从本文件
 * **源码文本**正则出档位角色的。写成 `[...WRITE_ROLES]` 时门读到的是空集合，
 * 「UI 位放行的角色 ⊆ 后端接受的角色」会因空集而恒成立 —— 一条假装在跑的交叉核对
 * （2026-10-31 DEFECT 1 修复时踩到，门里已加「档位不得为空」的下限断言）。
 * 档位↔消费方的对应关系由 tests/admin-write-gate.spec.mjs 的「死位判点」兜底：
 * 声明了但没有视图引用的位即红（第五轮 B-FINDING 12 新增），所以本表里每个键都必须有真实消费方。
 */
export const ROLE_TIER_SNAPSHOT = {
  /** 档位 1：URL 层可写管理员（SecurityConfig 对 /api/v1/admin/** 的写方法放行集）。 */
  canWrite: ["ADMIN", "SUPER_ADMIN"],
  /** 档位 2：后端 hasRole('SUPER_ADMIN') 的超管端点（处数见文件头：以门实跑为准）。 */
  canSuperAdminWrite: ["SUPER_ADMIN"],
} as const;

/** 档位 1：允许提交写操作（POST/PUT/PATCH/DELETE）的角色 = URL 层可写管理员。 */
const WRITE_ROLES = new Set<string>(ROLE_TIER_SNAPSHOT.canWrite);

/** 档位 2：超管专属写操作（后端 hasRole('SUPER_ADMIN')）。 */
const SUPER_WRITE_ROLES = new Set<string>(ROLE_TIER_SNAPSHOT.canSuperAdminWrite);

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
