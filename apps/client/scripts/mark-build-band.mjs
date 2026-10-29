/**
 * mark-build-band.mjs — 给构建产物盖「档位身份」章。
 *
 * 背景（2026-10-29 全量排查）：客户端有 8 条构建脚本，只有 `:real` 链会跑
 * verify-env-release；`build:h5` / `build:mp-weixin` 读的是 .env.production /
 * .env.mp-weixin，里面写的是 127.0.0.1 或 example.com 占位域名。这两个命令的产物
 * 本身没有任何「我不是发布包」的痕迹，被人直接从 dist 目录拖进微信开发者工具上传，
 * 线上就得到一个所有请求都打本机的包。
 *
 * 本脚本把这个判断写进产物：
 *   1) `<dist>/BUILD_IDENTITY.json` —— 机读身份（档位/mode/API 基址/可否发布/原因）；
 *   2) 不可发布时另存 `<dist>/NOT-SHIPPABLE.txt` —— 人读，放在目录第一屏；
 *   3)  stdout 打印一行 `BUILD_BAND=... SHIPPABLE=...` 供 CI/日志检索。
 *
 * 退出码恒为 0：它是「盖章」而不是「闸门」。真正的发布闸门是
 * scripts/verify-env-release.mjs（拒绝 loopback / 非 HTTPS / example.com / 匿名豁免），
 * 判点不重复实现，只在产物上留下可审计的身份。
 *
 * 用法：
 *   node scripts/mark-build-band.mjs --band mp-mock-dev --mode mp-weixin --dist dist/build/mp-weixin
 *   node scripts/mark-build-band.mjs --self-test
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = resolve(__dirname, "..");

/**
 * Vite 的 env 加载顺序（后者覆盖前者），与 scripts/verify-env-release.mjs 口径一致：
 * .env → .env.local → .env.[mode] → .env.[mode].local
 */
function envFilesForMode(mode) {
  return [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`];
}

/** 解析 .env 的 KEY=VALUE（忽略注释/空行，支持引号值） */
function parseEnv(content) {
  const result = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/**
 * 判点本体：给定 env 合并结果，返回该产物可否发布。
 * 纯函数，供 --self-test 直接打靶。
 */
export function judgeBand(mergedEnv, band) {
  const apiBaseUrl = (mergedEnv.VITE_API_BASE_URL ?? "").trim();
  const apiMode = (mergedEnv.VITE_API_MODE ?? "").trim();
  const reasons = [];
  if (!apiBaseUrl) {
    reasons.push("未配置 VITE_API_BASE_URL");
  } else {
    const lower = apiBaseUrl.toLowerCase();
    if (!lower.startsWith("https://")) reasons.push(`非 HTTPS（${apiBaseUrl}）`);
    if (lower.includes("127.0.0.1") || lower.includes("localhost") || lower.includes("0.0.0.0")) {
      reasons.push("指向本机回环");
    }
    if (lower.includes("example.com") || lower.includes("campuslove.example")) {
      reasons.push("示例占位域名");
    }
    if (lower.includes("ci.invalid")) reasons.push("CI 专用占位域名");
  }
  if (apiMode === "mock") reasons.push("VITE_API_MODE=mock（数据来自本地 fixtures）");
  if (!/^(real|release)/.test(band)) reasons.push(`档位 ${band} 不是发布档`);
  return {
    band,
    apiBaseUrl,
    apiMode,
    shippable: reasons.length === 0,
    reasons,
  };
}

/** 读某档位实际生效的 env 值 */
function loadEnvForMode(mode) {
  const merged = {};
  for (const file of envFilesForMode(mode)) {
    const filePath = join(CLIENT_DIR, file);
    if (!existsSync(filePath)) continue;
    Object.assign(merged, parseEnv(readFileSync(filePath, "utf-8")));
  }
  return merged;
}

// ── self-test ───────────────────────────────────────────────
// 打靶点：把 judgeBand 里的任一 reasons.push 删掉，对应用例必须变红。
function selfTest() {
  const cases = [
    {
      name: "loopback 真模式仍判不可发布",
      env: { VITE_API_BASE_URL: "http://127.0.0.1:8080/api", VITE_API_MODE: "real" },
      band: "mp-mock-dev",
      expectShippable: false,
      expectReason: "指向本机回环",
    },
    {
      name: "示例域名判不可发布",
      env: { VITE_API_BASE_URL: "https://api.campuslove.example.com/api", VITE_API_MODE: "real" },
      band: "h5-dev",
      expectShippable: false,
      expectReason: "示例占位域名",
    },
    {
      name: "mock 模式判不可发布",
      env: { VITE_API_BASE_URL: "https://api.real-domain.com/api", VITE_API_MODE: "mock" },
      band: "mp-mock",
      expectShippable: false,
      expectReason: "VITE_API_MODE=mock（数据来自本地 fixtures）",
    },
    {
      name: "真域名 + real 档 + 发布档名 ⇒ 可发布",
      env: { VITE_API_BASE_URL: "https://api.real-domain.com/api", VITE_API_MODE: "real" },
      band: "real",
      expectShippable: true,
      expectReason: null,
    },
    {
      name: "空配置判不可发布",
      env: {},
      band: "showcase",
      expectShippable: false,
      expectReason: "未配置 VITE_API_BASE_URL",
    },
  ];
  let failures = 0;
  for (const c of cases) {
    const got = judgeBand(c.env, c.band);
    const ok = got.shippable === c.expectShippable
      && (c.expectReason === null || got.reasons.some((r) => r.includes(c.expectReason)));
    if (!ok) {
      failures++;
      console.error(`[bandmark][selftest] FAIL ${c.name} ⇒ shippable=${got.shippable} reasons=${got.reasons.join("|")}`);
    }
  }
  if (failures > 0) {
    console.error(`[bandmark][selftest] ${failures}/${cases.length} 条失败`);
    process.exit(1);
  }
  // 正向计数下限：用例集被清空时不允许「0/0 ⇒ 全绿」
  if (cases.length < 5) {
    console.error("[bandmark][selftest] 用例数 < 5，本自测已失效");
    process.exit(1);
  }
  console.log(`[bandmark][selftest] OK ${cases.length}/${cases.length}`);
  process.exit(0);
}

// ── CLI ─────────────────────────────────────────────────────
const flagArg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i < 0 ? dflt : process.argv[i + 1];
};

if (process.argv.includes("--self-test")) selfTest();

const band = flagArg("band", "");
const mode = flagArg("mode", "");
const distRel = flagArg("dist", "");
if (!band || !mode || !distRel) {
  console.error("[bandmark] 用法: --band <档位> --mode <vite mode> --dist <产物目录>");
  process.exit(1);
}

const verdict = judgeBand(loadEnvForMode(mode), band);
const distDir = resolve(CLIENT_DIR, distRel);
const stamp = {
  band,
  viteMode: mode,
  dist: distRel,
  apiBaseUrl: verdict.apiBaseUrl,
  apiMode: verdict.apiMode,
  shippable: verdict.shippable,
  reasons: verdict.reasons,
  builtAt: new Date().toISOString(),
  note: "本文件由 apps/client/scripts/mark-build-band.mjs 生成，描述该产物的档位身份",
};

if (!existsSync(distDir)) {
  console.warn(`[bandmark] 产物目录不存在，跳过盖章：${distRel}`);
  console.log(`BUILD_BAND=${band} SHIPPABLE=${verdict.shippable ? "yes" : "no"} IDENTITY=SKIPPED reason=dist-missing`);
  process.exit(0);
}

mkdirSync(distDir, { recursive: true });
writeFileSync(join(distDir, "BUILD_IDENTITY.json"), `${JSON.stringify(stamp, null, 2)}\n`, "utf-8");
if (!verdict.shippable) {
  writeFileSync(
    join(distDir, "NOT-SHIPPABLE.txt"),
    [
      `档位：${band}（vite mode=${mode}）`,
      `API 基址：${verdict.apiBaseUrl || "(未配置)"}`,
      `数据模式：${verdict.apiMode || "(未配置)"}`,
      "不可上传/发布的原因：",
      ...verdict.reasons.map((r) => `  - ${r}`),
      "",
      "发布形态请跑：pnpm --filter @campus-love/client run build:mp-weixin:real",
      "（H5 为 build:h5:real），它会先经 scripts/verify-env-release.mjs 校验域名与密钥。",
      "",
    ].join("\n"),
    "utf-8",
  );
}
console.log(
  `BUILD_BAND=${band} SHIPPABLE=${verdict.shippable ? "yes" : "no"}`
  + ` IDENTITY=${join(distRel, "BUILD_IDENTITY.json")}`
  + `${verdict.shippable ? "" : ` reasons=${verdict.reasons.join("|")}`}`,
);
