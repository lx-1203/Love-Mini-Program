import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./Users.vue", import.meta.url), "utf8");

describe("用户管理页 AUDITOR 只读权限门禁", () => {
  it("所有写控件与写入口由 sessionStore.canWrite 统一守护", () => {
    expect(source).toContain('import { useSessionStore } from "@/stores/session"');
    expect(source).toContain("const sessionStore = useSessionStore()");

    // 创建、编辑、选择、批量、启停都必须有显式 canWrite 判断。
    expect(source).toMatch(/v-if="sessionStore\.canWrite"[^>]*openCreateUser/u);
    expect(source).toMatch(/v-if="sessionStore\.canWrite"[^>]*handleEdit\(user\)/u);
    expect(source).toContain('v-if="sessionStore.canWrite && selectedCount > 0"');
    expect(source).toMatch(/v-if="sessionStore\.canWrite"[\s\S]{0,160}allSelectableSelected/u);
    expect(source).toMatch(
      /function canToggleUser[\s\S]{0,120}if \(!sessionStore\.canWrite\) return false/u,
    );

    // 防止只藏按钮、函数仍可被程序化调用。
    expect(source).toMatch(/function openCreateUser[\s\S]{0,80}if \(!sessionStore\.canWrite\) return/u);
    expect(source).toMatch(/async function handleEdit[\s\S]{0,80}if \(!sessionStore\.canWrite\) return/u);
    expect(source).toMatch(/async function runBatch[\s\S]{0,100}if \(!sessionStore\.canWrite\) return/u);
  });
});
