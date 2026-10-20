import { describe, expect, it, vi } from "vitest";
import { toLocalImage } from "../../utils/image-local";
import { resolveMediaUrl } from "../../utils/media";
import { clientEnv } from "../../config/env";
import { IMAGE_PATHS, IN_PACKAGE_ASSETS } from "../../config/images";
import cdnBuckets from "../../../config/cdn-buckets.json";

/**
 * pexels 外链本地化兜底（2026-08-16）：
 * - toLocalImage：按 URL 尺寸规则确定性映射到本地包内素材；
 * - resolveMediaUrl：统一出口对 pexels 外链直接返回本地路径，不再暴露外链
 *   （此前 PostCard 等裸 <image> 场景绕过 SafeImage 导致渲染层网络错误）。
 */
describe("pexels 外链本地化兜底", () => {
  it("toLocalImage: w=600 动态配图映射为本地 posts 素材", () => {
    const url = "https://images.pexels.com/photos/313630/pexels-photo-313630.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop";
    const local = toLocalImage(url);
    expect(local).not.toContain("pexels");
    expect(local.startsWith("/static/")).toBe(true);
  });

  it("toLocalImage: w=800 背景图映射为本地 campus 素材", () => {
    const url = "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?w=800";
    const local = toLocalImage(url);
    expect(local).not.toContain("pexels");
    expect(local.startsWith("/static/")).toBe(true);
  });

  it("toLocalImage: 普通 URL 原样返回", () => {
    expect(toLocalImage("https://example.com/a.png")).toBe("https://example.com/a.png");
    expect(toLocalImage("/static/assets/icons/x.svg")).toBe("/static/assets/icons/x.svg");
    expect(toLocalImage(null)).toBe("");
  });

  it("resolveMediaUrl: pexels 外链直接本地化（不再暴露外链）", () => {
    const url = "https://images.pexels.com/photos/313630/pexels-photo-313630.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop";
    const resolved = resolveMediaUrl(url);
    expect(resolved).not.toContain("pexels");
    expect(resolved.startsWith("/static/")).toBe(true);
  });

  it("resolveMediaUrl: 非 pexels 绝对 URL 原样返回（行为不变）", () => {
    expect(resolveMediaUrl("https://example.com/a.png")).toBe("https://example.com/a.png");
  });
});

/* =========================================================================
 * R6/L01（2026-10-19）资产分桶单一真源：apps/client/config/cdn-buckets.json
 * ─────────────────────────────────────────────────────────────────────────
 * 契约语义：包内相对路径（/static/…）命中 cdnPrefixes ⇒ real 档不随主包发布、
 * 运行时解析成 `${apiRoot}/api/v1/media/app-assets/${rel}`；命中 localPrefixes
 * 或未登记 ⇒ 留包内。非 real 档（mock/dev/showcase/H5）一律留包内，且 http 形态的
 * app-assets URL 仍反写成 /static（保持这几档「不依赖后端」的原行为）。
 *
 * 档位不是靠 mock 模块伪造的：clientEnv 是 config/env 的进程内单例，
 * 这里直接改写它的 apiMode 再恢复，避免 vi.mock 掉 config/env 后
 * 牵连 media.ts 的其它依赖（getToken / privacy 等）。
 * ========================================================================= */

const API_ROOT = (clientEnv.apiBaseUrl || "").replace(/\/api\/?$/, "");
const APP_ASSETS = `${API_ROOT}/api/v1/media/app-assets/`;

/** 在单个用例里强制档位（结束后必须恢复，否则污染同文件其它用例） */
function withApiMode(mode: "real" | "mock", fn: () => void): void {
  const env = clientEnv as unknown as { apiMode: string };
  const before = env.apiMode;
  env.apiMode = mode;
  try {
    fn();
  } finally {
    env.apiMode = before;
  }
}

/** 清单里读桶前缀（测试侧独立实现一遍判据，作为对实现的交叉校验） */
function bucketList(kind: "cdnPrefixes" | "localPrefixes"): string[] {
  const raw = (cdnBuckets as unknown as Record<string, unknown>)[kind];
  return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === "string") : [];
}

/** 包内路径是否命中 cdnPrefixes（localPrefixes 优先否） */
function hitsCdn(pkgPath: string): boolean {
  const key = pkgPath.replace(/^\//, "");
  if (bucketList("localPrefixes").some((p) => key.startsWith(p))) return false;
  return bucketList("cdnPrefixes").some((p) => key.startsWith(p));
}

describe("cdn-buckets 清单自洽（契约形状）", () => {
  it("schema 与两组前缀齐备，且都以 static/ 开头", () => {
    expect((cdnBuckets as unknown as { schema: string }).schema).toBe("mp-cdn-buckets/v1");
    expect(bucketList("cdnPrefixes").length).toBeGreaterThan(0);
    expect(bucketList("localPrefixes").length).toBeGreaterThan(0);
    for (const p of [...bucketList("cdnPrefixes"), ...bucketList("localPrefixes")]) {
      expect(p.startsWith("static/")).toBe(true);
      expect(p.endsWith("/")).toBe(true);
    }
  });

  it("两组不重叠：同一个 rel 不可能既被判包内又被判出后端", () => {
    for (const cdn of bucketList("cdnPrefixes")) {
      for (const local of bucketList("localPrefixes")) {
        expect(cdn.startsWith(local) || local.startsWith(cdn)).toBe(false);
      }
    }
  });
});

describe("resolveMediaUrl：real 档按 cdnPrefixes 出后端", () => {
  /* 按目录取样的真实 rel（均来自 apps/client/src/static，后端 200 且字节一致，
     实测表见 tmp/qa/lanes/R6/L01-media.md；契约里 `static/assets/images/`、`static/generated/`
     这类整目录桶一次覆盖多个子目录）。后四枚是 3af02dd4 把契约从 6 桶扩到 10 桶
     （`static/assets/images/` 整目录 + `static/assets/icons/home/` 等）之后**新出包的**，
     逐枚 sha1 与后端 apps/api/uploads/app-assets 同字节实测一致；它们进这张表是为了钉住
     「扩桶」这件事本身——谁把某个目录从 cdnPrefixes 里摘回去、或把包内声称加回来，这里就红。 */
  const BUCKET_SAMPLES = [
    "/static/generated/images/campus/campus-gate.jpg",
    "/static/assets/images/covers/circle-studybuddy.png",
    "/static/assets/images/posters/home-poster.jpg",
    "/static/assets/images/avatars/avatar-39.jpg",
    "/static/assets/images/people/person-01.png",
    "/static/assets/images/posts/post-1.jpg",
    // ↓ 3af02dd4 扩桶新增的桶位（旧 6 桶口径下这四枚都算「未登记 ⇒ 留包内」，那是过期的）
    "/static/assets/images/activities/activity-1.jpg",
    "/static/assets/images/register/reg-hero-illustration.jpg",
    "/static/assets/images/mascot/default.png",
    "/static/assets/icons/home/toolbar/toolbar_row7_01.png",
  ];

  it("命中桶的包内路径 → 后端 app-assets 绝对 URL", () => {
    withApiMode("real", () => {
      for (const pkg of BUCKET_SAMPLES) {
        expect(hitsCdn(pkg)).toBe(true);
        expect(resolveMediaUrl(pkg)).toBe(`${APP_ASSETS}${pkg.slice("/static/".length)}`);
      }
    });
  });

  it("localPrefixes 与未登记目录留包内（icons / svg-spec / mascot）", () => {
    withApiMode("real", () => {
      for (const pkg of [
        // localPrefixes：icons/common、icons/register、icons/tabbar、svg-spec
        "/static/assets/icons/common/user.svg",
        "/static/assets/icons/register/alert.svg",
        "/static/assets/icons/tabbar/chat.png",
        "/static/assets/svg-spec/03-icons/star.svg",
        /* 吉祥物默认那尊 = svg-spec/08-mascot 的 SVG（唯一真源，见 IN_PACKAGE_ASSETS.MASCOT_DEFAULT
           的三条证据）；PNG 那枚 `assets/images/mascot/default.png` 已进 cdn 桶，
           它在上面 BUCKET_SAMPLES 里被正向钉住，不能再出现在这张包内名单里。 */
        "/static/assets/svg-spec/08-mascot/sprout-default.svg",
        // 两表都没登记 ⇒ 留包内
        "/static/assets/icons/gift.svg",
        "/static/audio/voice-demo-1.wav",
        "/static/default-avatar.png",
      ]) {
        expect(hitsCdn(pkg)).toBe(false);
        expect(resolveMediaUrl(pkg)).toBe(pkg);
      }
    });
  });

  it("http 形态的 app-assets URL：桶内 rel 不反写，包内 rel 仍落回 /static", () => {
    withApiMode("real", () => {
      // 不反写：反写 = 强制随包 = 主包 12.19MB 下不来的根因
      const cdnUrl = `${APP_ASSETS}assets/images/posts/post-1.jpg`;
      expect(resolveMediaUrl(cdnUrl)).toBe(cdnUrl);
      // 仍反写：icons/svg-spec 是 localPrefixes，包内一定有一份，不该依赖后端
      expect(resolveMediaUrl(`${APP_ASSETS}assets/icons/common/user.svg`)).toBe(
        "/static/assets/icons/common/user.svg"
      );
      /* 吉祥物的唯一真源是 svg-spec/08-mascot 那尊（localPrefixes ⇒ 包内一定有，
         dist/build/mp-weixin-real/static/assets/svg-spec/08-mascot/sprout-default.svg 实测在包里），
         所以它的 http 形态照样反写回 /static。 */
      expect(resolveMediaUrl(`${APP_ASSETS}assets/svg-spec/08-mascot/sprout-default.svg`)).toBe(
        "/static/assets/svg-spec/08-mascot/sprout-default.svg"
      );
      /* 而 `assets/images/mascot/default.png` 自 3af02dd4 起在 `static/assets/images/` 桶内：
         包内那份已经不随主包发布，反写它 = real 档空白（消息页空态就是这么坏的），
         所以这一支必须**不**反写。谁再把它加回「包内声称」，这一行就红。 */
      const mascotPkgUrl = `${APP_ASSETS}assets/images/mascot/default.png`;
      expect(resolveMediaUrl(mascotPkgUrl)).toBe(mascotPkgUrl);
      expect(resolveMediaUrl(mascotPkgUrl)).not.toBe("/static/assets/images/mascot/default.png");
    });
  });

  it("相对形态的 app-assets 路径在 real 档补全成绝对 URL（mp 会把相对路径当包内文件）", () => {
    withApiMode("real", () => {
      expect(resolveMediaUrl("/api/v1/media/app-assets/assets/images/avatars/avatar-1.jpg")).toBe(
        `${APP_ASSETS}assets/images/avatars/avatar-1.jpg`
      );
    });
  });

  it("改写幂等：resolve 的输出再 resolve 结果不变", () => {
    withApiMode("real", () => {
      for (const pkg of BUCKET_SAMPLES) {
        const once = resolveMediaUrl(pkg);
        expect(resolveMediaUrl(once)).toBe(once);
      }
    });
  });

  it("用户上传媒体仍走鉴权代理（不被分桶逻辑劫持）", () => {
    withApiMode("real", () => {
      const out = resolveMediaUrl("/uploads/100/202607/uuid.jpg");
      expect(out.startsWith(`${API_ROOT}/api/v1/media/100/202607/uuid.jpg`)).toBe(true);
      expect(out).not.toContain("app-assets");
    });
  });
});

describe("resolveMediaUrl：非 real 档保持原行为（一律包内）", () => {
  it("mock/dev/showcase/H5 档：cdn 桶路径不改指后端", () => {
    withApiMode("mock", () => {
      for (const pkg of [
        "/static/assets/images/avatars/avatar-39.jpg",
        "/static/assets/images/people/person-01.png",
        "/static/assets/images/posts/post-1.jpg",
        "/static/generated/images/campus/campus-gate.jpg",
        // 扩桶后进桶的三枚：mock 档照样不许指后端（后端可能根本没起）
        "/static/assets/images/activities/activity-1.jpg",
        "/static/assets/images/mascot/default.png",
        "/static/assets/icons/home/toolbar/toolbar_row7_01.png",
      ]) {
        expect(resolveMediaUrl(pkg)).toBe(pkg);
      }
    });
  });

  it("mock/dev 档：http 形态 app-assets URL 一律反写 /static（含桶内 rel）", () => {
    withApiMode("mock", () => {
      expect(resolveMediaUrl(`${APP_ASSETS}assets/images/posts/post-1.jpg`)).toBe(
        "/static/assets/images/posts/post-1.jpg"
      );
      expect(resolveMediaUrl("/api/v1/media/app-assets/assets/images/avatars/avatar-1.jpg")).toBe(
        "/static/assets/images/avatars/avatar-1.jpg"
      );
    });
  });
});

describe("config/images.ts 与 cdn-buckets 不打架（同一张图不能两侧都认）", () => {
  /** 单测环境里 VITE_API_MODE 未注入 → images.ts 的 REAL_ASSETS 为空 → 全部包内 */
  it("非 real 档：所有常量都是包内 /static 路径", () => {
    const flat: string[] = [];
    const visit = (node: unknown): void => {
      if (typeof node === "string") {
        flat.push(node);
        return;
      }
      if (node && typeof node === "object") {
        for (const v of Object.values(node)) visit(v);
      }
    };
    visit(IMAGE_PATHS);
    expect(flat.length).toBeGreaterThan(100);
    for (const p of flat) {
      expect(p.startsWith("/static/")).toBe(true);
      expect(resolveMediaUrl(p)).toBe(p);
    }
  });

  it("real 档：只有 cdnPrefixes 命中的目录直出后端，localPrefixes 恒包内", async () => {
    vi.stubEnv("VITE_API_MODE", "real");
    vi.stubEnv("VITE_API_BASE_URL", clientEnv.apiBaseUrl || "http://127.0.0.1:8080/api");
    vi.resetModules();
    try {
      const { IMAGE_PATHS: realPaths, IN_PACKAGE_ASSETS: realInPkg } = await import("../../config/images");
      const assets = `${API_ROOT}/api/v1/media/app-assets/`;
      // 桶内目录 → 后端
      expect(realPaths.POSTS.POST_1).toBe(`${assets}assets/images/posts/post-1.jpg`);
      expect(realPaths.CIRCLE_COVERS.STUDY).toBe(`${assets}assets/images/covers/circle-studybuddy.png`);
      expect(realPaths.POSTERS.HOME).toBe(`${assets}assets/images/posters/home-poster.jpg`);
      expect(realPaths.AVATARS.AVATAR_1).toBe(`${assets}assets/images/avatars/avatar-1.jpg`);
      expect(realPaths.PEOPLE.CARD_1).toBe(`${assets}assets/images/people/person-01.png`);
      expect(realPaths.GENERATED.CAMPUS_GATE).toBe(`${assets}generated/images/campus/campus-gate.jpg`);
      // localPrefixes / 未登记目录 → 包内
      expect(realPaths.ICONS_COMMON.USER_SVG).toBe("/static/assets/icons/common/user.svg");
      expect(realPaths.ICONS_EMOJI.STAR).toBe("/static/assets/svg-spec/03-icons/star.svg");
      /* 吉祥物唯一真源：localPrefixes 里那尊 SVG，任何档都在包里，且与 ICONS_EMOJI.SPROUT
         同值（NotLoggedWaiting.vue:105 绑的就是后者）⇒ 本表 / 契约 / 组件三处一致。 */
      expect(realPaths.MASCOT.DEFAULT).toBe("/static/assets/svg-spec/08-mascot/sprout-default.svg");
      expect(realPaths.MASCOT.DEFAULT).toBe(realPaths.ICONS_EMOJI.SPROUT);
      /* 3af02dd4 把 `static/assets/images/` 整目录划进 cdnPrefixes ⇒ activities / home-split /
         mascot 这些旧「未登记 ⇒ 留包内」的基址组在 real 档直出后端。下面两条钉的是扩桶后的口径，
         谁把目录摘回包内（或让 assetDir 不看清单），这两行先红。 */
      expect(realPaths.ACTIVITIES.ACTIVITY_1).toBe(`${assets}assets/images/activities/activity-1.jpg`);
      expect(realPaths.HOME_SPLIT.CIRCLE_PHOTO).toBe(
        `${assets}assets/images/home-split/circle/circle_row6_01.png`
      );
      // 同一枚吉祥物光栅版仍在桶内（它不是包内资产，别拿它当包内证据）
      expect(hitsCdn(realPaths.MASCOT.STAR)).toBe(true);
      // MESSAGE_ICONS 是就地字面量（不随档位改值），出后端由 resolveMediaUrl 按 message/ 桶负责
      expect(realPaths.MESSAGE_ICONS.HEART).toBe("/static/assets/message/svg/icon/heart.svg");
      // 双登记表与 localPrefixes 对齐：不得登记任何 cdn 桶里的文件
      for (const entry of Object.values(realInPkg)) {
        expect(hitsCdn(entry.pkg)).toBe(false);
        expect(entry.pkg.startsWith("/static/")).toBe(true);
      }
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
