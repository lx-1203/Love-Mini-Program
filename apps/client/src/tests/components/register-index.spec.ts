import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { reactive, ref } from "vue";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { i18n, t } from "../../i18n";
import zhCN from "../../i18n/locales/zh-CN";
import enUS from "../../i18n/locales/en-US";

/**
 * 注册页（pages/register/index.vue）两行台账的回归测试：
 *
 * MP-R2-PAGES-REGISTER-INDEX-012：确认密码的一致性比对时机 = 失焦后（设计规范 §6.1
 * 「密码框失焦后实时比对」），@input 只负责「已有错误时清除」。
 * 原实现在 @input 里即时比对置错，用户还没打完第二遍密码就被判红框。
 *
 * MP-R2-PAGES-REGISTER-INDEX-013：校验/toast 文案走 t("register.*")，
 * 键在 zh-CN.ts / en-US.ts 的 register 命名空间成对维护（zh 值逐字取自
 * 设计规范 §7 错误文案表，en 为真实英文）。
 */

vi.mock("@dcloudio/uni-app", () => ({
  onShow: vi.fn(),
}));

vi.mock("../../stores/session", () => ({
  useSessionStore: vi.fn(() =>
    reactive({
      refreshSession: vi.fn(() => Promise.resolve()),
    }),
  ),
}));

vi.mock("../../stores/app-config", () => ({
  useAppConfigStore: vi.fn(() =>
    reactive({
      isRegisterOpen: ref(true),
    }),
  ),
}));

vi.mock("../../services/auth", () => ({
  registerUser: vi.fn(() => Promise.resolve({ userId: 1 })),
  sendSmsCode: vi.fn(() => Promise.resolve({ success: true })),
}));

vi.mock("../../services/sentry", () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock("../../services/api-error", () => ({
  AppApiError: class AppApiError extends Error {},
}));

// MP-R7 轮修复：改为部分 mock。原窄 mock 仅提供 isDev/isMockMode，而注册页经
// services/config → services/http → services/env 引入 `export const appEnv =
// clientEnv`（services/env.ts:31），模块求值期读取 clientEnv 时因 mock 缺该导出
// 整套件挂（"No clientEnv export is defined on the config/env mock"）。
// 用 importOriginal 保留真实导出，仅覆盖本用例关心的两个开关。
vi.mock("../../config/env", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  isDev: false,
  isMockMode: () => true,
}));

vi.mock("../../utils/debounce", () => ({
  createButtonGuard: (fn: (...args: unknown[]) => unknown) => fn,
}));

import RegisterIndex from "../../pages/register/index.vue";
import { registerUser } from "../../services/auth";

const CJK = /[\u4e00-\u9fa5]/;

function mountRegister() {
  return mount(RegisterIndex, {
    global: {
      plugins: [i18n],
      stubs: {
        view: { template: '<div class="mock-view"><slot /></div>', name: "uni-view" },
        text: { template: '<span class="mock-text"><slot /></span>', name: "uni-text" },
        image: { template: '<img class="mock-image" />', name: "uni-image" },
        input: { template: '<input class="mock-input" />', name: "uni-input" },
        picker: { template: '<div class="mock-picker"><slot /></div>', name: "uni-picker" },
      },
    },
  });
}

/** 按 DOM 顺序取字段输入框：手机号 → 验证码 → 密码 → 确认密码 → 昵称 */
function fieldInput(wrapper: ReturnType<typeof mountRegister>, index: number) {
  const el = wrapper.findAll(".field__input")[index];
  if (!el) throw new Error(`第 ${index + 1} 个 .field__input 不存在（字段增删需同步本用例）`);
  return el;
}

function typeInto(el: ReturnType<typeof fieldInput>, value: string) {
  return el.trigger("input", { detail: { value } });
}

/** 字段 wrapper（.field）当前的类名集合：红框/聚焦态都挂在这一层 */
function fieldClasses(el: ReturnType<typeof fieldInput>): string[] {
  const host = el.element.closest(".field");
  return host ? Array.from(host.classList) : [];
}

describe("确认密码比对时机（MP-R2-PAGES-REGISTER-INDEX-012）", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    i18n.global.locale.value = "zh-CN";
  });

  it("输入不一致的第二遍密码时不判错（比对不在 @input 上做）", async () => {
    const wrapper = mountRegister();
    await typeInto(fieldInput(wrapper, 2), "Abcdefgh1");
    await typeInto(fieldInput(wrapper, 3), "Abcdefgh");

    expect(wrapper.text()).not.toContain(t("register.errPasswordMismatch"));
    expect(fieldClasses(wrapper.find(".field__input--confirm"))).not.toContain("field--error");
  });

  it("失焦才比对：与密码不一致 → 行内错误 + 确认框标红", async () => {
    const wrapper = mountRegister();
    await typeInto(fieldInput(wrapper, 2), "Abcdefgh1");
    const confirm = fieldInput(wrapper, 3);
    await typeInto(confirm, "Abcdefgh");
    await confirm.trigger("blur");

    expect(wrapper.text()).toContain(t("register.errPasswordMismatch"));
    expect(fieldClasses(confirm)).toContain("field--error");
  });

  it("失焦比对一致 → 无错误；两框任一为空时不误判不一致", async () => {
    const wrapper = mountRegister();
    await typeInto(fieldInput(wrapper, 2), "Abcdefgh1");
    const confirm = fieldInput(wrapper, 3);
    await typeInto(confirm, "Abcdefgh1");
    await confirm.trigger("blur");
    expect(wrapper.text()).not.toContain(t("register.errPasswordMismatch"));

    // 清空确认框后失焦：密码有值、确认无值 ⇒ 不报「不一致」（交给提交时的「请再次输入密码」）
    await typeInto(confirm, "");
    await confirm.trigger("blur");
    expect(wrapper.text()).not.toContain(t("register.errPasswordMismatch"));
  });

  it("@input 只清除已显示的错误，不重新置错", async () => {
    const wrapper = mountRegister();
    await typeInto(fieldInput(wrapper, 2), "Abcdefgh1");
    const confirm = fieldInput(wrapper, 3);
    await typeInto(confirm, "Abcdefgh");
    await confirm.trigger("blur");
    expect(wrapper.text()).toContain(t("register.errPasswordMismatch"));

    await typeInto(confirm, "Abcdefgh2");
    expect(wrapper.text()).not.toContain(t("register.errPasswordMismatch"));
  });

  it("打字后从未失焦直接提交，仍能给出「不一致」判定（blur 缺席不跳过校验）", async () => {
    const toastSpy = vi.spyOn(uni, "showToast");
    const wrapper = mountRegister();
    await typeInto(fieldInput(wrapper, 0), "13888888888");
    await typeInto(fieldInput(wrapper, 1), "123456");
    await typeInto(fieldInput(wrapper, 2), "Abcdefgh1");
    await typeInto(fieldInput(wrapper, 3), "Abcdefgh");
    await wrapper.find(".submit-btn").trigger("tap");

    expect(wrapper.text()).toContain(t("register.errPasswordMismatch"));
    expect(toastSpy).toHaveBeenCalledWith({
      title: t("register.errPasswordMismatch"),
      icon: "none",
      duration: 2000,
    });
    expect(registerUser).not.toHaveBeenCalled();
    toastSpy.mockRestore();
  });

  it("失焦时复位 focusField（确认框离开焦点后不再保留聚焦态）", async () => {
    const wrapper = mountRegister();
    const confirm = fieldInput(wrapper, 3);
    await confirm.trigger("focus");
    expect(fieldClasses(confirm)).toContain("field--focus");
    await confirm.trigger("blur");
    expect(fieldClasses(confirm)).not.toContain("field--focus");
  });
});

/**
 * MP-R2-PAGES-REGISTER-INDEX-013：判据是「toast() 收到的是 t() 而不是中文字面量」。
 * 挂载态只能看到中文（默认 locale），故按源码扫描 + 双语键位配对两侧验。
 */
describe("校验/toast 文案的 i18n 接线（MP-R2-PAGES-REGISTER-INDEX-013）", () => {
  const source = readFileSync(resolve(__dirname, "../../pages/register/index.vue"), "utf-8");
  const scriptBlock = source.slice(source.indexOf("<script"), source.indexOf("</script>"));

  it("toast() 的参数里不再有中文字面量", () => {
    const code = scriptBlock.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    const offenders = [...code.matchAll(/toast\(([^;]*)\);/g)]
      .filter((m) => /["'`][^"'`]*[\u4e00-\u9fa5]/.test(String(m[1])))
      .map((m) => String(m[1]).trim());
    expect(offenders).toEqual([]);
  });

  it("校验分支的 return / message 不再返回中文字面量", () => {
    const hardcoded = [
      ...scriptBlock.matchAll(/(?:return|message:)\s*"[^"]*[\u4e00-\u9fa5][^"]*"/g),
    ];
    expect(hardcoded.map((m) => m[0])).toEqual([]);
  });

  it("页面引用的每个 register.* 键在 zh-CN/en-US 都存在，且英文为真实英文", () => {
    const keys = [...scriptBlock.matchAll(/t\(\s*"register\.([A-Za-z0-9_]+)"/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThanOrEqual(20);
    const zh = (zhCN as unknown as { register: Record<string, string> }).register;
    const en = (enUS as unknown as { register: Record<string, string> }).register;
    for (const key of new Set(keys)) {
      expect(typeof zh[key], `zh-CN register.${key}`).toBe("string");
      expect(zh[key]).not.toBe("");
      expect(typeof en[key], `en-US register.${key}`).toBe("string");
      expect(en[key]).not.toBe("");
      // 缺失的英文键会回退中文：en 侧不得含汉字
      expect(en[key]).not.toMatch(CJK);
    }
  });

  it("设计规范 §7 错误文案在 zh-CN 侧逐字保留（改键值即改可见文案）", () => {
    const zh = (zhCN as unknown as { register: Record<string, string> }).register;
    expect(zh.errPhoneRequired).toBe("请输入手机号");
    expect(zh.errSmsLength).toBe("验证码为 6 位数字");
    expect(zh.errPasswordRequired).toBe("请设置登录密码");
    expect(zh.errPasswordNoSpace).toBe("密码不能包含空格或全角字符");
    expect(zh.errAgreeRequired).toBe("请先阅读并勾选同意《用户协议》和《隐私政策》");
    expect(zh.errMinorBlocked).toBe("未满 18 岁暂无法注册");
  });

  it("空表单提交的首个提示取自 register.errPhoneRequired（已接线键，非硬编码）", async () => {
    const toastSpy = vi.spyOn(uni, "showToast");
    i18n.global.locale.value = "en-US";
    const wrapper = mountRegister();
    await wrapper.find(".submit-btn").trigger("tap");

    expect(toastSpy).toHaveBeenCalledWith({
      title: "Enter your phone number",
      icon: "none",
      duration: 2000,
    });
    i18n.global.locale.value = "zh-CN";
    toastSpy.mockRestore();
  });
});
