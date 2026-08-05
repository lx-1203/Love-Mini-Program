import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  installAbortControllerPolyfill,
  installUrlSearchParamsPolyfill,
} from "../compat";

describe("compat polyfills", () => {
  const g = globalThis as Record<string, unknown>;

  beforeEach(() => {
    // 强制安装（先删除原生实现，模拟 mp-weixin 环境）
    delete g.AbortController;
    delete g.URLSearchParams;
  });

  afterEach(() => {
    // 恢复原生实现
    delete g.AbortController;
    delete g.URLSearchParams;
  });

  it("AbortController polyfill 可安装并可 abort", () => {
    installAbortControllerPolyfill();
    const controller = new (g.AbortController as new () => AbortController)();
    expect(controller.signal.aborted).toBe(false);
    controller.abort();
    expect(controller.signal.aborted).toBe(true);
  });

  it("URLSearchParams polyfill 覆盖 构造/append/get/toString", () => {
    installUrlSearchParamsPolyfill();
    const Ctor = g.URLSearchParams as new (
      init?: string | Record<string, string> | Array<[string, string]>
    ) => {
      append(k: string, v: string): void;
      get(k: string): string | null;
      set(k: string, v: string): void;
      has(k: string): boolean;
      delete(k: string): void;
      toString(): string;
      forEach(cb: (v: string, k: string) => void): void;
    };

    // 字符串构造
    const fromQuery = new Ctor("categoryId=cat-discover&city=南京");
    expect(fromQuery.get("categoryId")).toBe("cat-discover");
    expect(fromQuery.get("city")).toBe("南京");

    // 记录构造 + append/toString（中文与特殊字符 encode）
    const params = new Ctor();
    params.append("keyword", "搭子");
    params.append("limit", "20");
    expect(params.get("limit")).toBe("20");
    expect(params.toString()).toBe("keyword=%E6%90%AD%E5%AD%90&limit=20");

    // set/has/delete
    params.set("limit", "50");
    expect(params.get("limit")).toBe("50");
    expect(params.has("keyword")).toBe(true);
    params.delete("keyword");
    expect(params.has("keyword")).toBe(false);
  });

  it("polyfill 幂等：存在原生实现时不覆盖", () => {
    // 先安装 polyfill
    installUrlSearchParamsPolyfill();
    const first = g.URLSearchParams;
    // 再次安装应跳过
    installUrlSearchParamsPolyfill();
    expect(g.URLSearchParams).toBe(first);
  });

  it("非法编码兜底：a=% 不抛 URIError，保留原样", () => {
    installUrlSearchParamsPolyfill();
    const Ctor = g.URLSearchParams as new (init?: string) => {
      get(k: string): string | null;
    };
    const params = new Ctor("a=%&b=正常");
    expect(params.get("a")).toBe("%");
    expect(params.get("b")).toBe("正常");
  });
});
