import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import zhCN from "../../i18n/locales/zh-CN";
import { STORAGE_KEYS } from "../../constants/storage-keys";

/**
 * 法律文本取数模块（config/legal-texts.ts）回归用例 —— S2-6「删掉客户端的第二份法律全文」。
 *
 * 缺陷基线（改造前）：
 * - i18n 语言包 zh-CN.ts 里烘着 legal.userAgreement.content / legal.privacyPolicy.content
 *   两份约 1.5KB 的**完整条款正文**，与后端 legal_document 表（唯一正式真源，
 *   经 GET /v1/config/legal → LegalDocumentService 下发）各写各的、必然漂移；
 * - 更要命的是这份语言包副本正是「后端不可达」时上屏的那一份：用户对着它点
 *   「我已阅读并同意」，签的可能是法务早已下架的旧条款；
 * - 内存缓存又是 SPA 级单例、**不分账号分区**：H5 上 A 退出→B 登录（不重载页面）时，
 *   B 打开协议页读到的是 A 那次取回的正文，且带着版本号与日期，看起来就是正式文本。
 *
 * 本用例钉住迁移后的四条契约（任一条被改回旧写法即变红）：
 *   1. 正文只认服务端 CMS 的 { items: [...] }（字段逐一对齐后端 LegalTextView record）；
 *   2. 拉取失败 → 返回 config/legal-texts.ts 里那段自带「非正式文本」声明的离线兜底摘要，
 *      version=local-fallback、updatedAt 为空串（合规文本时间戳不许前端自造，R11-L13-D16）；
 *   3. 缓存按「当前账号」分区：换账号后拉取失败，绝不把上一账号取回的正文当正式文本呈现；
 *   4. 语言包里确实不再有法律正文（反向断言：legal.* 下没有 content 键、
 *      没有任何长字符串条款、旧副本的整句在源文件里查无此处）。
 */

/** 可控的 http / mock 开关（legal-texts 只用到 request 与 isMockMode） */
const harness = vi.hoisted(() => ({
  mockMode: false,
  /** 每次 request 的返回值（Promise）由用例设置；抛错=后端不可达 */
  responder: null as null | ((options: { url: string }) => Promise<unknown>),
  calls: [] as string[],
}));

vi.mock("../../services/http", () => ({
  request: (options: { url: string }) => {
    harness.calls.push(options.url);
    if (!harness.responder) {
      return Promise.reject(new Error("no responder — 视为后端不可达"));
    }
    return harness.responder(options);
  },
  getToken: () => "",
}));

// 只替换 isMockMode，其余导出（clientEnv 等）保持真实，避免连带影响 i18n 依赖链
vi.mock("../../config/env", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, isMockMode: () => harness.mockMode };
});

import {
  LegalTextType,
  clearLegalTextCache,
  getLegalText,
  getLegalTextSync,
} from "../../config/legal-texts";

/** 后端 CMS 的一份正式文本（字段与 LegalTextListResponse/LegalTextView 逐一对齐） */
const CMS_AGREEMENT = {
  type: "user_agreement",
  title: "用户协议（CMS 版）",
  content: "这是 legal_document 表里的正式条款全文，语言包不再携带它。",
  version: "v9.1.0",
  updatedAt: "2026-10-20T10:15:30",
};

/** 写入「当前登录账号」的 token（缓存分区的依据） */
function loginAs(token: string | null): void {
  if (token === null) {
    storage.delete(STORAGE_KEYS.AUTH_TOKEN);
    return;
  }
  storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
}

/**
 * 测试自有 storage 桩。
 *
 * 不直接用 src/tests/setup.ts 的 uni 桩：那份桩的 removeStorageSync 是空实现
 * （只写 Map、不删），「登出」这一路就测不出来 —— 而账号分区恰恰要靠
 * token 消失/变化来触发。这里整套读写都换成可控 Map。
 */
const storage = new Map<string, unknown>();
function installStorageStub(): void {
  const anyUni = uni as unknown as Record<string, unknown>;
  anyUni.setStorageSync = (key: string, value: unknown) => {
    storage.set(key, value);
  };
  anyUni.getStorageSync = (key: string) => (storage.has(key) ? storage.get(key) : "");
  anyUni.removeStorageSync = (key: string) => {
    storage.delete(key);
  };
}

describe("config/legal-texts — 法律正文只来自服务端 CMS", () => {
  beforeEach(() => {
    installStorageStub();
    storage.clear();
    harness.mockMode = false;
    harness.responder = null;
    harness.calls = [];
    clearLegalTextCache();
    loginAs("token-account-a");
  });

  it("GET /v1/config/legal?type=… 的 items 逐字段成为上屏正文（含版本与更新时间）", async () => {
    harness.responder = () => Promise.resolve({ items: [CMS_AGREEMENT] });

    const view = await getLegalText(LegalTextType.USER_AGREEMENT);

    expect(harness.calls).toEqual(["/v1/config/legal?type=user_agreement"]);
    expect(view.title).toBe(CMS_AGREEMENT.title);
    expect(view.content).toBe(CMS_AGREEMENT.content);
    expect(view.version).toBe("v9.1.0");
    expect(view.updatedAt).toBe("2026-10-20T10:15:30");
    // 正式文本不许带兜底标记（LegalTextPage 靠它决定披露药丸与是否印日期）
    expect(view.version).not.toBe("local-fallback");
  });

  it("不带 type 请求返回全量时，仍按 type 选中匹配的那一条", async () => {
    harness.responder = () =>
      Promise.resolve({
        items: [
          { ...CMS_AGREEMENT },
          { type: "privacy_policy", title: "隐私政策", content: "隐私正式全文", version: "v9.1.0" },
        ],
      });

    const view = await getLegalText(LegalTextType.PRIVACY_POLICY);
    expect(view.content).toBe("隐私正式全文");
  });

  it("后端返回空 items / 空正文等同失败：不得把空壳当正式文本缓存", async () => {
    harness.responder = () => Promise.resolve({ items: [] });
    const empty = await getLegalText(LegalTextType.USER_AGREEMENT);
    expect(empty.version).toBe("local-fallback");

    harness.responder = () =>
      Promise.resolve({ items: [{ ...CMS_AGREEMENT, content: "   " }] });
    const blank = await getLegalText(LegalTextType.USER_AGREEMENT);
    expect(blank.version).toBe("local-fallback");
    expect(blank.content).not.toBe("");
  });

  it("拉取失败 → 明确标注的离线兜底摘要，且不自造更新时间", async () => {
    harness.responder = null; // request 抛错 = 后端不可达

    const view = await getLegalText(LegalTextType.USER_AGREEMENT);

    expect(view.version).toBe("local-fallback");
    expect(view.content).toContain("离线兜底摘要");
    expect(view.content).toContain("非正式文本");
    expect(view.content).toContain("不能作为你的同意依据");
    // R11-L13-D16：兜底态的时间戳不许由前端 new Date() 现造
    expect(view.updatedAt).toBe("");
  });

  it("同一账号 5 分钟内命中缓存：不再打第二次请求", async () => {
    harness.responder = () => Promise.resolve({ items: [CMS_AGREEMENT] });

    await getLegalText(LegalTextType.USER_AGREEMENT);
    await getLegalText(LegalTextType.USER_AGREEMENT);

    expect(harness.calls).toHaveLength(1);
  });

  it("账号切换后拉取失败：绝不把上一账号取回的正文当本账号正式文本上屏", async () => {
    harness.responder = () => Promise.resolve({ items: [CMS_AGREEMENT] });
    const first = await getLegalText(LegalTextType.USER_AGREEMENT);
    expect(first.content).toBe(CMS_AGREEMENT.content);

    // 同设备换账号（H5 不重载页面）：上一账号会话取回的正文不得继续服务
    loginAs("token-account-b");
    harness.responder = null; // 且此刻断网
    const second = await getLegalText(LegalTextType.USER_AGREEMENT);

    expect(second.content).not.toBe(CMS_AGREEMENT.content);
    expect(second.version).toBe("local-fallback");
    expect(second.content).toContain("离线兜底摘要");
    // 确实重新发过请求（不是"读缓存读到别人的"，也不是"根本没尝试拉正式文本"）
    expect(harness.calls).toHaveLength(2);
  });

  it("登出（无 token）后的失败拉取同样只给兜底，不读上一会话缓存", async () => {
    harness.responder = () => Promise.resolve({ items: [CMS_AGREEMENT] });
    await getLegalText(LegalTextType.USER_AGREEMENT);

    loginAs(null);
    harness.responder = null;
    const guest = await getLegalText(LegalTextType.USER_AGREEMENT);
    expect(guest.version).toBe("local-fallback");
    expect(guest.content).not.toBe(CMS_AGREEMENT.content);
  });

  it("mock 档不发无意义请求，直接返回带披露标记的兜底摘要", async () => {
    harness.mockMode = true;
    harness.responder = () => Promise.resolve({ items: [CMS_AGREEMENT] });

    const view = await getLegalText(LegalTextType.USER_AGREEMENT);
    expect(harness.calls).toHaveLength(0);
    expect(view.version).toBe("local-fallback");
  });

  it("getLegalTextSync 只返回兜底摘要（同步路径不许冒充正式条款）", () => {
    const view = getLegalTextSync(LegalTextType.PRIVACY_POLICY);
    expect(view.version).toBe("local-fallback");
    expect(view.type).toBe("privacy_policy");
    expect(view.content).toContain("非正式文本");
  });

  it("兜底摘要保持短小（语言包全文已删，兜底不许长回第二份条款）", () => {
    const fallback = getLegalTextSync(LegalTextType.USER_AGREEMENT);
    expect(fallback.content.length).toBeLessThan(1600);
    // 旧语言包副本的单条正文约 1.5KB 整篇条款；兜底是「要点摘要」而非全文
    expect(fallback.content).not.toContain("本协议是您与校园恋爱运营方");
  });
});

describe("S2-6 — i18n 语言包不再携带第二份法律全文", () => {
  const zhSource = readFileSync(
    resolve(__dirname, "../../i18n/locales/zh-CN.ts"),
    "utf-8"
  );

  /** legal 命名空间下所有字符串值（含嵌套） */
  function collectLegalStrings(node: unknown, bucket: string[]): void {
    if (typeof node === "string") {
      bucket.push(node);
      return;
    }
    if (node && typeof node === "object") {
      for (const value of Object.values(node as Record<string, unknown>)) {
        collectLegalStrings(value, bucket);
      }
    }
  }

  it("zh-CN 的 legal.userAgreement / legal.privacyPolicy 下没有 content 键", () => {
    const legal = zhCN as unknown as {
      legal: { userAgreement: Record<string, unknown>; privacyPolicy: Record<string, unknown> };
    };
    expect(legal.legal.userAgreement.content).toBeUndefined();
    expect(legal.legal.privacyPolicy.content).toBeUndefined();
    // UI 字串仍在（标题/按钮/最后更新标签不许被顺手删掉）
    expect(legal.legal.userAgreement.title).toBe("用户协议");
    expect(legal.legal.privacyPolicy.accept).toBe("我已阅读并同意");
  });

  it("legal 命名空间里不许再有整段条款长文（单值上限 200 字）", () => {
    const bucket: string[] = [];
    collectLegalStrings(
      (zhCN as unknown as { legal: unknown }).legal,
      bucket
    );
    const offenders = bucket.filter((value) => value.length > 200);
    expect(offenders, `语言包仍携带法律正文：${offenders.join(" | ").slice(0, 120)}`).toEqual([]);
  });

  it("源文件里旧副本的整句已查无此处", () => {
    expect(zhSource).not.toContain("欢迎使用校园恋爱小程序（以下简称");
    expect(zhSource).not.toContain("我们深知个人信息对您的重要性");
    expect(zhSource).not.toContain("本协议适用中华人民共和国大陆地区法律");
  });

  it("legal 块内没有 content 键的行（防止改天又把正文塞回语言包）", () => {
    const start = zhSource.indexOf('"legal": {');
    const end = zhSource.indexOf('"errorToast"', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const block = zhSource.slice(start, end);
    expect(block).not.toMatch(/^\s*"content"\s*:/mu);
  });
});
