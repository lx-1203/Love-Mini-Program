import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * GAP 4 / round-3 缺口：路由档位闸门（devOnly / showcaseOnly）。
 *
 * 修前的实况（逐条核过源码，2026-10-31）：
 * - `src/constants/routes.ts` 只是一叠字符串，没有任何「这一页只属于哪一档构建」的概念
 *   ⇒ 凡是注册过的路由在任何构建档里都可直达；
 * - 编译期唯一的拦手是 `src/pages.json` 的两个条件注册块（`#ifdef DEV` 包住
 *   setup/dev/index、`#ifdef SHOWCASE` 包住 setup/showcase/index），但 DEV 档产物
 *   （`build:mp-weixin` / `build:h5`，即 scripts/mark-build-band.mjs 里
 *   `judgeBand()` 判成「不可发布」的那两包）**不定义** uni 的 DEV 条件符号
 *   —— 只有 `dev-debug` / `mp-weixin-showcase` 那两枚 package.json 的 define 才定义。
 *   于是那一包里两张调试页是编译进去的，运行时此前只靠「页面上没入口」挡：
 *   深链、历史分享卡片、开发者工具直接打开页面路径走的都不是入口。
 *
 * 三条判点各自可打靶（打靶记录见本轮报告）：
 * (a) devOnly 路由在 dev 档可达、在 release 档被拒；showcaseOnly 同理；
 * (b) 「忘记打旗标」由 pages.json 对账判点抓住（条件注册块里有、旗标表里没有 ⇒ 红；
 *     反过来旗标表里有、pages.json 里没有条件块 ⇒ 也红）；
 * (c) 闸门确实生效在跳转出口（openAppPath / replaceAppPath），不是只活在一串纯函数里。
 */

const bandRef = vi.hoisted(() => ({
  value: { dev: false, showcase: false, release: true },
}));

vi.mock("../../config/build-band", () => ({
  currentBuildBands: () => bandRef.value,
  bandsFor: (signals: { nodeEnv?: string; showcaseMode?: unknown }) => {
    const nodeEnv = signals?.nodeEnv ?? "";
    const dev = nodeEnv === "development" || nodeEnv === "test";
    const showcase = signals?.showcaseMode === "true" || signals?.showcaseMode === true;
    return { dev, showcase, release: !dev && !showcase };
  },
}));

import {
  ROUTES,
  ROUTE_BAND_FLAGS,
  TAB_BAR_ROUTES,
  blockedByRouteBand,
  routeAvailableInBand,
  routeBandFlagsOf,
} from "../../constants/routes";
import { openAppPath, replaceAppPath } from "../../utils/navigation";

const RELEASE = { dev: false, showcase: false, release: true };
const DEV_BAND = { dev: true, showcase: false, release: false };
const SHOWCASE_BAND = { dev: false, showcase: true, release: false };

/** pages.json 原文（不能 import：vitest 的 jsonc-strip 插件会把 #ifdef 注释剥掉，条件块信息就丢了） */
const pagesJsonRaw = readFileSync(resolve(__dirname, "../../pages.json"), "utf8");

/**
 * 从 pages.json 的**原文**里抽出被 `// #ifdef <符号>` 包住的注册路径。
 *
 * @param symbol 条件符号（DEV / SHOWCASE）
 * @returns 该符号下注册的完整页面路径（数组，顺序与文件一致）
 */
function routesUnderIfdef(symbol: string): string[] {
  const re = new RegExp(`//\\s*#ifdef\\s+${symbol}([\\s\\S]*?)//\\s*#endif`, "u");
  const out: string[] = [];
  let rest = pagesJsonRaw;
  while (true) {
    const m = rest.match(re);
    if (!m) break;
    const block = m[1];
    // 条件块一定嵌在某个 subPackages 里：往前找最近的 "root": "..."
    const before = pagesJsonRaw.slice(0, pagesJsonRaw.indexOf(m[0]));
    const roots = before.match(/"root"\s*:\s*"([^"]+)"/gu) ?? [];
    const root = roots.length ? /"root"\s*:\s*"([^"]+)"/u.exec(roots[roots.length - 1])![1] : "";
    for (const pathMatch of block.matchAll(/"path"\s*:\s*"([^"]+)"/gu)) {
      out.push(`/${root}/${pathMatch[1]}`);
    }
    rest = rest.slice(rest.indexOf(m[0]) + m[0].length);
  }
  return out;
}

describe("路由档位旗标在册（GAP 4 (a)）", () => {
  it("dev 调试页在册为 devOnly，showcase 总控页在册为 showcaseOnly", () => {
    expect(routeBandFlagsOf(ROUTES.DEV)).toEqual({ devOnly: true });
    expect(routeBandFlagsOf(ROUTES.SHOWCASE)).toEqual({ showcaseOnly: true });
  });

  it("devOnly：dev 档可达，release 档被拒（这一条去掉旗标即红）", () => {
    expect(routeAvailableInBand(ROUTES.DEV, DEV_BAND)).toBe(true);
    expect(blockedByRouteBand(ROUTES.DEV, DEV_BAND)).toBeNull();
    expect(routeAvailableInBand(ROUTES.DEV, RELEASE)).toBe(false);
    expect(blockedByRouteBand(ROUTES.DEV, RELEASE)).toContain("devOnly");
    // showcase 档也不算 DEV 构建档：调试页同样不可达
    expect(routeAvailableInBand(ROUTES.DEV, SHOWCASE_BAND)).toBe(false);
  });

  it("showcaseOnly：showcase 档可达，release / dev 档被拒", () => {
    expect(routeAvailableInBand(ROUTES.SHOWCASE, SHOWCASE_BAND)).toBe(true);
    expect(routeAvailableInBand(ROUTES.SHOWCASE, RELEASE)).toBe(false);
    expect(blockedByRouteBand(ROUTES.SHOWCASE, RELEASE)).toContain("showcaseOnly");
    expect(routeAvailableInBand(ROUTES.SHOWCASE, DEV_BAND)).toBe(false);
  });

  it("带 query 的深链同样在闸门口径内（拦的是路径，不是整串）", () => {
    expect(routeAvailableInBand(`${ROUTES.DEV}?tab=network`, DEV_BAND)).toBe(true);
    expect(routeAvailableInBand(`${ROUTES.DEV}?tab=network`, RELEASE)).toBe(false);
  });

  it("未注册旗标的业务页一律全档位可达（闸门不许误伤正常功能）", () => {
    for (const path of [
      ROUTES.TAB.DISCOVER,
      ROUTES.WALLET,
      ROUTES.SECURITY,
      ROUTES.VIP.PROMO_CODE,
      ROUTES.LOGIN,
    ]) {
      expect(routeBandFlagsOf(path), path).toBeNull();
      expect(routeAvailableInBand(path, RELEASE), path).toBe(true);
    }
  });

  it("TabBar 页面一枚都不许被标成档位受限（switchTab 会整片失灵）", () => {
    for (const path of TAB_BAR_ROUTES) {
      expect(ROUTE_BAND_FLAGS[path], `${path} 不是调试页`).toBeUndefined();
    }
  });

  it("旗标表的键全部取自 ROUTES 常量（不许往表里塞裸字符串）", () => {
    const allRouteStrings = new Set<string>();
    const walk = (node: unknown): void => {
      if (typeof node === "string") {
        allRouteStrings.add(node);
        return;
      }
      if (node && typeof node === "object") {
        for (const v of Object.values(node as Record<string, unknown>)) walk(v);
      }
    };
    walk(ROUTES);
    for (const key of Object.keys(ROUTE_BAND_FLAGS)) {
      expect(allRouteStrings.has(key), `旗标键 ${key} 不是 ROUTES 里的常量`).toBe(true);
    }
  });
});

describe("旗标表与 pages.json 的条件注册逐一对账（GAP 4 (b)：漏标即红）", () => {
  const devRegistered = routesUnderIfdef("DEV");
  const showcaseRegistered = routesUnderIfdef("SHOWCASE");

  it("判据本身不是空转：pages.json 里确实各有一枚条件注册块", () => {
    expect(devRegistered).toContain(ROUTES.DEV);
    expect(showcaseRegistered).toContain(ROUTES.SHOWCASE);
  });

  it("每个 #ifdef DEV 注册的路由都必须被标成 devOnly（忘记打旗标＝红）", () => {
    for (const path of devRegistered) {
      expect(routeBandFlagsOf(path), `${path} 在 pages.json 里是 #ifdef DEV 注册，旗标却缺失`).toEqual(
        { devOnly: true },
      );
    }
  });

  it("每个 #ifdef SHOWCASE 注册的路由都必须被标成 showcaseOnly", () => {
    for (const path of showcaseRegistered) {
      expect(routeBandFlagsOf(path), `${path} 在 pages.json 里是 #ifdef SHOWCASE 注册，旗标却缺失`).toEqual(
        { showcaseOnly: true },
      );
    }
  });

  it("反向：旗标表里的每一枚都必须真有条件注册块兜着（否则是在砍正常业务页）", () => {
    const conditional = new Set([...devRegistered, ...showcaseRegistered]);
    for (const path of Object.keys(ROUTE_BAND_FLAGS)) {
      expect(conditional.has(path), `${path} 被标了档位旗标，pages.json 里却没有条件注册`).toBe(true);
    }
  });
});

describe("闸门生效在跳转出口（GAP 4 (c)）", () => {
  let uniStub: {
    navigateTo: ReturnType<typeof vi.fn>;
    redirectTo: ReturnType<typeof vi.fn>;
    switchTab: ReturnType<typeof vi.fn>;
    reLaunch: ReturnType<typeof vi.fn>;
    setStorageSync: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    uniStub = {
      navigateTo: vi.fn(),
      redirectTo: vi.fn(),
      switchTab: vi.fn(),
      reLaunch: vi.fn(),
      setStorageSync: vi.fn(),
    };
    vi.stubGlobal("uni", uniStub);
    vi.stubGlobal("getCurrentPages", () => [{ route: "pages/home/index" }]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("release 档：openAppPath 打 devOnly 路由 ⇒ 不发 navigateTo，并把原因回调给 fail", () => {
    bandRef.value = RELEASE;
    const fail = vi.fn();
    openAppPath(ROUTES.DEV, { fail });
    expect(uniStub.navigateTo).not.toHaveBeenCalled();
    expect(uniStub.redirectTo).not.toHaveBeenCalled();
    expect(fail).toHaveBeenCalledTimes(1);
    const err = fail.mock.calls[0][0] as Error;
    expect(err.message).toContain("blocked by route band");
    expect(err.message).toContain("devOnly");
  });

  it("dev 档：同一条路由照旧 navigateTo（闸门不是「一律不让进」）", () => {
    bandRef.value = DEV_BAND;
    openAppPath(ROUTES.DEV);
    expect(uniStub.navigateTo).toHaveBeenCalledTimes(1);
    expect(uniStub.navigateTo.mock.calls[0][0].url).toBe(ROUTES.DEV);
  });

  it("release 档：replaceAppPath 同样拦得住（登录回跳走的是这一出口）", () => {
    bandRef.value = RELEASE;
    replaceAppPath(ROUTES.SHOWCASE);
    expect(uniStub.redirectTo).not.toHaveBeenCalled();
    expect(uniStub.switchTab).not.toHaveBeenCalled();
  });

  it("业务页在 release 档不受影响（闸门只限调试页）", () => {
    bandRef.value = RELEASE;
    openAppPath(ROUTES.WALLET);
    expect(uniStub.navigateTo).toHaveBeenCalledTimes(1);
  });
});
