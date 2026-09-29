import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * 五组游客落地对的入口守卫（round-7 裁定：游客一律必须被引导到登录/注册，setup 不豁免）。
 *
 * 分诊台点名 landingMissing=5（判据来源 reports/audit/round-7/interact/exec-results.json，
 * 语料 gitSha=086b54f8）：page → 游客身份实测 landing
 *   subpackages/campus/campus/index            → subpackages/campus/campus/hub
 *   subpackages/discover-extra/discover/matching → pages/discover/index
 *   subpackages/village/village/tag-posts      → subpackages/village/village/index
 *   subpackages/setup/campus/index             → pages/discover/index
 *   subpackages/setup/recommend-pref/index     → pages/discover/index
 *
 * 本测断言的是「游客在这一页的 onLoad 第一句就被引导走，且页内那条会把游客留在内容页的
 * 路径排在守卫之后」——守卫自身的跳转目标/延迟/放行条件由 tests/guards/guest-access.spec.ts
 * 真跑逻辑断言，本测不重复实现判定（沿用 tests/pages/nearby-page.spec.ts 的源码结构断言口径）。
 */

type Pair = {
  /** 用例声明页（pages.json 里的 path） */
  page: string;
  /** 该页在游客身份下的实测落点 */
  landing: string;
  /** 页内那条「把游客留在内容页」的路径上的语句（必须排在守卫之后） */
  leakStatements: string[];
};

const PAIRS: Pair[] = [
  {
    page: "subpackages/campus/campus/index",
    landing: "subpackages/campus/campus/hub",
    leakStatements: [
      // 实测落点就是这一句：无 ?school= 时 onLoad 直接把游客 redirectTo 到 hub 内容页
      'uni.redirectTo({ url: "/subpackages/campus/campus/hub" })',
    ],
  },
  {
    page: "subpackages/discover-extra/discover/matching",
    landing: "pages/discover/index",
    // 游客落 discover 的那一支：无卡上下文 → setTimeout(goBack) → goBack 的 switchTab(DISCOVER)
    leakStatements: ["setTimeout(() => goBack(), 200)", "matchStore.runMatchCheck"],
  },
  {
    page: "subpackages/village/village/tag-posts",
    landing: "subpackages/village/village/index",
    // 两支：① 无 tagName → goBack（navigateBack / reLaunch 到村口列表）；② mock 带 loadPosts 吃 fixture
    leakStatements: ["setTimeout(goBack, MISSING_PARAM_NAV_DELAY_MS)", "loadPosts(true)"],
  },
  {
    page: "subpackages/setup/campus/index",
    landing: "pages/discover/index",
    leakStatements: [],
  },
  {
    page: "subpackages/setup/recommend-pref/index",
    landing: "pages/discover/index",
    leakStatements: [],
  },
];

function sourceOf(page: string): string {
  return readFileSync(resolve(__dirname, "../../", `${page}.vue`), "utf-8");
}

/** 取 onLoad 回调体（从 `onLoad(` 到该语句结束） */
function onLoadBody(src: string): string {
  const start = src.indexOf("onLoad(");
  expect(start, "页面必须注册 onLoad 入口守卫").toBeGreaterThan(-1);
  const end = src.indexOf("\n});", start);
  expect(end, "onLoad 回调体必须可被定位").toBeGreaterThan(start);
  return src.slice(start, end + 3);
}

/** 取 onMounted 回调体 */
function onMountedBody(src: string): string {
  const start = src.indexOf("onMounted(");
  expect(start, "页面必须注册 onMounted").toBeGreaterThan(-1);
  const end = src.indexOf("\n});", start);
  expect(end, "onMounted 回调体必须可被定位").toBeGreaterThan(start);
  return src.slice(start, end + 3);
}

describe("游客落地对入口守卫（5 组，round-7 裁定）", () => {
  it.each(PAIRS.map((p) => [p.page, p] as const))(
    "%s：onLoad 第一句即引导游客，落点 %s 的那条路径排在守卫之后",
    (_page, pair) => {
      const src = sourceOf(pair.page);
      // 1) 只准用共享守卫，不许各页自造一套跳转
      expect(src).toContain('from "../../../guards/guest-access"');
      const body = onLoadBody(src);
      expect(body.indexOf("guideGuestToLogin()")).toBeGreaterThan(-1);
      // 2) 守卫必须是回调体里的第一个判断（早于任何请求与页内重定向）
      expect(body).toMatch(/^onLoad\(\([^)]*\)\s*=>\s*\{\s*(\/\*[\s\S]*?\*\/|\/\/[^\n]*|\s)*if \(guideGuestToLogin\(\)\)/);
      // 3) 那条实测落点路径必须排在守卫之后（游客已经在跳转队列里）
      for (const leak of pair.leakStatements) {
        expect(body.indexOf(leak), `守卫后应能看到被让位的原路径：${leak}`).toBeGreaterThan(
          body.indexOf("guideGuestToLogin()"),
        );
      }
    },
  );

  it("campus/index：游客不再打认证/话题请求（onShow 与 onMounted 都按守卫旗标早退）", () => {
    const src = sourceOf("subpackages/campus/campus/index");
    expect(src.match(/if \(guestGuarded \|\| redirectedToHub\.value\) return;/g)).toHaveLength(2);
    // 受保护数据请求只在守卫放行的分支里发（onLoad 里不再有第二处 fetchCertificationStatus）
    expect(onLoadBody(src)).not.toContain("campusStore.");
  });

  it("setup/campus：引导流程不豁免——游客早退于 onMounted，走不到下一步（校园资料请求也不再发）", () => {
    const src = sourceOf("subpackages/setup/campus/index");
    expect(onMountedBody(src)).toContain("if (guestGuarded) return;");
    expect(onMountedBody(src)).toContain("profileStore.load()");
    // 已登录用户的下一步保持不变（守卫只拦游客，不删功能）
    expect(src).toContain("replaceAppPath(SUBPACKAGE_ROUTES.SETUP_PROGRESS.SCHEDULE)");
  });

  it("setup/recommend-pref：游客走不到漏斗出口，已登录用户的出口不变", () => {
    const src = sourceOf("subpackages/setup/recommend-pref/index");
    expect(onMountedBody(src)).toContain("if (guestGuarded) return;");
    // 漏斗出口 = 实测落点：游客进不到这里，也就停不到寻觅 Tab 上
    expect(src).toContain('replaceAppPath("/pages/discover/index")');
    // 游客原本连 GET 都不发（无 userId 即吃默认值）⇒ 没有 401 可指望，只能靠入口守卫
    expect(src).toContain("if (userId) {");
  });

  it("matching：保留 fe3338d2 的 goBack 未登录兜底（入口守卫之外再加一层）", () => {
    const src = sourceOf("subpackages/discover-extra/discover/matching");
    expect(src).toMatch(/if \(!getToken\(\)\) \{\s*replaceAppPath\(ROUTES\.LOGIN\);/);
  });

  it("五页都不得硬编码登录页字符串——引导目标统一是 ROUTES.LOGIN（守卫内单一来源）", () => {
    for (const pair of PAIRS) {
      expect(sourceOf(pair.page), pair.page).not.toContain('"/pages/login/index"');
    }
  });
});
