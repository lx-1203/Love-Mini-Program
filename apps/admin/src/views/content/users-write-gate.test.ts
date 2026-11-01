import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./Users.vue", import.meta.url), "utf8");

describe("用户管理页 AUDITOR 只读权限门禁", () => {
  it("所有写控件与写入口由 sessionStore.canWrite 统一守护", () => {
    expect(source).toContain('import { useSessionStore } from "@/stores/session"');
    expect(source).toContain("const sessionStore = useSessionStore()");

    // 创建、编辑、选择、批量、启停都必须有显式 canWrite 判断。
    // 第五轮 B-FINDING 4/5：新增用户改挂超管位（后端 hasRole('SUPER_ADMIN')），
    // 修改密码改挂总写档 canWrite（后端 change-password 经 URL 写档收敛为 ADMIN/SUPER_ADMIN）。
    expect(source).toMatch(/v-if="sessionStore\.canSuperAdminWrite"[^>]*openCreateUser/u);
    expect(source).toMatch(/v-if="sessionStore\.canWrite"[^>]*openChangePwd/u);
    expect(source).toMatch(/v-if="sessionStore\.canWrite"[^>]*handleEdit\(user\)/u);
    expect(source).toContain('v-if="sessionStore.canWrite && selectedCount > 0"');
    expect(source).toMatch(/v-if="sessionStore\.canWrite"[\s\S]{0,160}allSelectableSelected/u);
    expect(source).toMatch(
      /function canToggleUser[\s\S]{0,120}if \(!sessionStore\.canWrite\) return false/u,
    );

    // 防止只藏按钮、函数仍可被程序化调用。
    expect(source).toMatch(/function openCreateUser[\s\S]{0,80}if \(!sessionStore\.canWrite\) return/u);
    // 修改密码的两个入口（打开弹窗 + 提交）都必须挡 canWrite（第五轮 B-FINDING 4：
    // 此前 handleChangePwd 无任何档位守卫，被一条理由不成立的白名单抹掉计数）。
    expect(source).toMatch(/function openChangePwd[\s\S]{0,80}if \(!sessionStore\.canWrite\) return/u);
    expect(source).toMatch(/async function handleChangePwd[\s\S]{0,80}if \(!sessionStore\.canWrite\) return/u);
    expect(source).toMatch(/async function handleEdit[\s\S]{0,80}if \(!sessionStore\.canWrite\) return/u);
    expect(source).toMatch(/async function runBatch[\s\S]{0,100}if \(!sessionStore\.canWrite\) return/u);
  });
});
