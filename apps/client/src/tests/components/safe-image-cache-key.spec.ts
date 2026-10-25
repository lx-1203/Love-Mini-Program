import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * SafeImage 本地化缓存键必须同源（结构级判点）。
 *
 * 媒体 URL 现在带能力型签名（?exp=&sig=，15 分钟换一次）。SafeImage 的
 * 缓存命中、在途去重、本地文件命名三处若按**整条 URL** 做键，每次换签都会
 * 被算成另一张图：本地文件全部作废、每张图每 15 分钟重下一遍。
 * 实测修过一处混合键的缺陷：add/has 用 cacheKey 而 complete 里 delete 用
 * 整条 URL，结果在途标记永久占位，该图此后再也不本地化。
 *
 * 说明：这是**源码结构**判点，不是行为判点——要跑行为得整套
 * uni.downloadFile / getFileSystemManager / USER_DATA_PATH 夹具，
 * 而 mp 侧真机验证目前仍是外部阻断项（见 reports/audit/2026-10-25-full-audit-remediation.md §8）。
 */
// 客户端 vitest 环境下 import.meta.url 不是 file: URL（实测报 ERR_INVALID_URL_SCHEME），
// 故按 vitest 的 cwd（apps/client）取相对路径。
const source = readFileSync("src/components/common/SafeImage.vue", "utf8");

const sites = [
  { name: "缓存命中", re: /httpLocalCache\.get\((\w+)\)/u },
  { name: "缓存写入", re: /httpLocalCache\.set\((\w+)/u },
  { name: "在途登记", re: /httpInFlight\.add\((\w+)\)/u },
  { name: "在途查询", re: /httpInFlight\.has\((\w+)\)/u },
  { name: "在途清除", re: /httpInFlight\.delete\((\w+)\)/u },
  { name: "本地文件命名", re: /safeimg-\$\{hashString\((\w+)\)\}/u },
];

describe("SafeImage 本地化缓存键同源", () => {
  it("缓存键必须是去掉 query 的 cacheKey，六处调用点一个不许用整条 URL", () => {
    const offenders: string[] = [];
    for (const site of sites) {
      const match = source.match(site.re);
      expect(match, `SafeImage 里找不到「${site.name}」调用点，判点已失效`).not.toBeNull();
      if (match && match[1] !== "cacheKey") offenders.push(`${site.name}=${match[1]}`);
    }
    expect(offenders, `以下调用点用了带 query 的键：${offenders.join(", ")}`).toEqual([]);
  });

  it("localCacheKey 确实剥掉 query（正向对照：不是把整条 URL 原样返回）", () => {
    const helper = source.match(/function localCacheKey\(url: string\): string \{\s*return ([^;]+);/u);
    expect(helper, "localCacheKey 定义漂移，判点读不到实现").not.toBeNull();
    expect(helper?.[1]).toContain("split(\"?\")");
  });

  it("未签出的私有媒体 URL 不得写进 resolvedUrlCache（否则签名到达后仍命中无凭据旧值）", () => {
    const guard = source.match(
      /if \(!isUnsignedPrivateMedia\(resolved\)\) \{\s*resolvedUrlCache\.set\(raw, resolved\);/u,
    );
    expect(
      guard,
      "resolveOnce 又变成无条件写缓存：异步签名到达后 computed 重算仍拿到无凭据 URL，图片永久停在 401 占位",
    ).not.toBeNull();
    expect(source).toMatch(/function isUnsignedPrivateMedia\(url: string\): boolean \{/u);
    // 公开资产不需签名，必须被排除在「未签出」判定之外
    expect(source).toMatch(/!url\.includes\("app-assets\/"\)/u);
  });
});
