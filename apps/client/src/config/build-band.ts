/**
 * 构建档身份（GAP 4 / round-3 缺口，2026-10-31）。
 *
 * 判据**不在这里发明**：发布闸门是 scripts/verify-env-release.mjs（拒绝 loopback /
 * 非 HTTPS / example.com / 匿名豁免），产物身份章是 scripts/mark-build-band.mjs
 * （其 `judgeBand()` 口径：`/^(real|release)/.test(band)` 才算发布档）。本模块只做一件事
 * —— 把「这一枚运行时判的是哪个档」按同一套口径映射进客户端，供路由档位闸门
 * （constants/routes.ts 的 ROUTE_BAND_FLAGS + utils/navigation.ts 的
 * routeAvailableInBand）消费。
 *
 * 为什么运行时也需要一枚：pages.json 里的 `// #ifdef DEV` / `// #ifdef SHOWCASE`
 * 只在 uni 编译器认得的那些构建命令里生效。同一条链路的 DEV 档产物
 * （`build:mp-weixin` / `build:h5`）由 mark-build-band 标成「不可发布」，而它**不定义**
 * DEV 条件符号（uni 的 `dev-debug` 档才定义）⇒ 那一包里 dev/showcase 两页是被编译进去的，
 * 运行时此前只靠「页面上没入口」挡。深链、历史分享卡片、开发者工具直接打开页面路径，
 * 走的都不是入口。
 *
 * ⚠️ 与 config/env.ts 的 isDev 的区别（不许混用）：isDev 是「本机调试友好」的信号
 * （H5 localhost / NODE_ENV=development），发布闸门用的档位身份比它严——一个
 * 127.0.0.1 的 h5 产物在 isDev 下为 true，但它不是 DEV 构建档。这里读的是构建档，
 * 不是主机名。
 *
 * 三档语义（与 scripts/qa/generate-e2e-routes.mjs 的 buildConditions 派生一致）：
 * - dev      ：NODE_ENV=development 的构建档（uni 的 dev / dev-debug 链）；vitest 也算
 *              dev 档，否则「dev 档可达」这一半判据在测试运行时里永远造不出来。
 * - showcase ：VITE_SHOWCASE_MODE 为真（独立展示包）。
 * - release  ：**从严**——既不是 dev 也不是 showcase 就按发布档对待。档位闸门失效的
 *              形态必须是「功能进不去」，不能是「调试页上线」。
 */

/** 构建档三态（互不排斥：一个包可以同时是 dev 与 showcase） */
export interface BuildBands {
  /** DEV 构建档（pages.json 的 #ifdef DEV 在这一档成立） */
  dev: boolean;
  /** 展示档（VITE_SHOWCASE_MODE；pages.json 的 #ifdef SHOWCASE 在这一档成立） */
  showcase: boolean;
  /** 发布档（可上线的那一包；从严口径 = 非 dev 且非 showcase） */
  release: boolean;
}

/** 档位闸门的输入（与运行时解耦，判点可以显式打靶而不必重灌模块图） */
export interface BandSignals {
  /** NODE_ENV 原值（uni/vite 编译期定义） */
  nodeEnv?: string;
  /** VITE_SHOWCASE_MODE 原值 */
  showcaseMode?: unknown;
}

/** 字符串真值口径：与 config/showcase.ts、config/env.ts 一致（"true" / "1"） */
function isTruthyFlag(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === 1 || raw === "1";
}

/**
 * 由信号推导档位（纯函数）。
 *
 * `bandsFor({ nodeEnv: "development" })` ⇒ dev；
 * `bandsFor({ showcaseMode: "true" })` ⇒ showcase；
 * 两个都不成立 ⇒ release（从严）。
 *
 * @param signals 档位信号（缺省读运行时）
 * @returns 构建档三态
 */
export function bandsFor(signals: BandSignals = readRuntimeBandSignals()): BuildBands {
  const nodeEnv = signals.nodeEnv ?? "";
  const dev = nodeEnv === "development" || nodeEnv === "test";
  const showcase = isTruthyFlag(signals.showcaseMode);
  return { dev, showcase, release: !dev && !showcase };
}

/** 读运行时档位信号（NODE_ENV / VITE_SHOWCASE_MODE，双端回退口径与 config/env.ts 同构） */
export function readRuntimeBandSignals(): BandSignals {
  let nodeEnv: string | undefined;
  let showcaseMode: unknown;
  try {
    const env = (import.meta as unknown as { env?: Record<string, unknown> }).env;
    if (env) {
      nodeEnv = typeof env.DEV === "boolean" ? (env.DEV ? "development" : "production") : undefined;
      showcaseMode = env.VITE_SHOWCASE_MODE;
    }
  } catch (_e) {
    // Vite 未注入（mp-weixin 运行时）时回退 process.env
  }
  try {
    const proc = (
      globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
    ).process;
    if (proc?.env) {
      nodeEnv = nodeEnv ?? proc.env.NODE_ENV ?? undefined;
      showcaseMode = showcaseMode ?? proc.env.VITE_SHOWCASE_MODE;
      // vitest 明确置位 VITEST=true：单测运行时按 dev 档对待（见文件头三档语义）
      if (proc.env.VITEST === "true") nodeEnv = "test";
    }
  } catch (_e) {
    // 无 process（浏览器/小程序）时静默
  }
  return { nodeEnv, showcaseMode };
}

/** 当前构建档 */
export function currentBuildBands(): BuildBands {
  return bandsFor(readRuntimeBandSignals());
}
