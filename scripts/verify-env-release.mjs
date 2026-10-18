/* eslint-env node */
/**
 * release 构建环境校验脚本（R4-00199 / R4-00200）
 *
 * 用途：
 *   校验 release 构建（build:h5:real / build:mp-weixin:real，mode=real）所加载的
 *   环境变量中 VITE_API_BASE_URL 是否满足发布要求：
 *     - 必须为 https
 *     - 不得指向本机地址（127.0.0.1 / localhost / 0.0.0.0）
 *     - 不得使用示例域名（example.com）
 *   校验失败时以非 0 退出码终止构建（&& 串联在 build 脚本前），
 *   避免把 .env.mp-weixin / .env.production 中的本机/示例域名打包进生产包。
 *
 * 在座（本地真机验证）形态的豁免（2026-10-18 · MP-FIDELITY Phase A1）：
 *   本地后端只有 8080 HTTP，而微信合法域名要求 HTTPS ⇒ 这两条判点在"在座跑发布形态"时必然红，
 *   整条发布链因此红在第 8 步（实测）。豁免只允许**点名载具**取得，且：
 *     - 只免 https 与 loopback 两条；example.com 照旧拒；
 *     - 缺 --carrier、载具不在白名单、env 目录读不到 ⇒ 一律退 2（NOT-EVIDENCED / 旗标用错），
 *       绝不退 1 冒充"产品判红"，也绝不退 0 放行；
 *     - 放行时打的是 ENVCHECK_RESULT=WAIVED_LOOPBACK 而不是 PASS，并写一张带 sha/时刻的凭证券，
 *       产物目录里另落 LOOPBACK_WAIVER.json —— 让"这份产物不可上线"在账上看得见，
 *       而不是把豁免伪装成一次干净的通过。
 *   否决的两种做法：改 .env.real.local（动 env 值即动 config/env.js 字节 ⇒ band 漂移、覆盖账整批过期）、
 *   裸环境变量开关（会被每个子进程继承，等于静默永久缴械这道门；同 ui-lease.mjs:217-220 拒裸跳过的理由）。
 *
 * 使用方式：
 *   已接入 apps/client/package.json 的 build:h5:real / build:mp-weixin:real，无需手动执行。
 *   在座发布形态：node scripts/verify-env-release.mjs --allow-loopback --carrier release-chain
 *   自证：      node scripts/verify-env-release.mjs --self-test
 *
 * 退出码：
 *   0 - 校验通过（含被点名豁免通过，此时机读行为 WAIVED_LOOPBACK 而非 PASS）
 *   1 - 校验失败（输出具体错误项）
 *   2 - 仪器前提不成立：豁免没点名载具 / 载具不在白名单 / env 目录读不到 / self-test 找不到守卫标记段
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..");
const SELF = fileURLToPath(import.meta.url);

const RK = "ENVCHECK_RESULT";
/** 允许取得 loopback 豁免的载具名（只有这两个；写错或匿名一律退 2）。 */
const WAIVER_CARRIERS = ["release-chain", "build-real-isolated"];

const arg = (k, dflt) => {
  const i = process.argv.indexOf("--" + k);
  if (i < 0) return dflt;
  const v = process.argv[i + 1];
  return v === undefined || String(v).startsWith("--") ? dflt : v;
};
const flag = (k) => process.argv.indexOf("--" + k) >= 0;

/** Vite 环境变量加载顺序（后加载覆盖先加载）：.env → .env.[mode]
 * 2026-10-05 补充 .env.real.local：与 Vite 的 *.local 本地覆盖约定对齐
 * （.local 被 gitignore，供本机度量/联调覆盖正式值，不入库）。 */
const ENV_FILES = [".env", ".env.real", ".env.real.local"];

/** 解析 .env 文件的 KEY=VALUE 行（忽略注释与空行，支持引号包裹的值）。 */
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
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/** 读取客户端 env 配置（.env.real 覆盖 .env）。 */
function loadClientEnv(clientDir) {
  const merged = {};
  for (const file of ENV_FILES) {
    const filePath = resolve(clientDir, file);
    if (!existsSync(filePath)) continue;
    Object.assign(merged, parseEnv(readFileSync(filePath, "utf8")));
  }
  return merged;
}

/**
 * 判点本体（纯函数 ⇒ 返回 {errors, waivedHttps, waivedLoopback}）。
 * ENV_GUARD 标记段是 --self-test 的靶：把这段删掉后同一输入必须**不再**判红，
 * 否则"它必须拒绝"这条断言测的不是那道守卫（仓内既有同形自证：
 * apps/client/scripts/build-real-isolated.mjs:292-362 的 BAND_GUARD）。
 */
// <<ENV_GUARD_BEGIN>>
function checkReleaseEnv(apiBaseUrl, allowLoopback) {
  const errors = [];
  let waivedHttps = false;
  let waivedLoopback = false;
  if (!apiBaseUrl) {
    errors.push("未配置 VITE_API_BASE_URL（apps/client/.env.real）");
    return { errors, waivedHttps, waivedLoopback };
  }
  const lower = apiBaseUrl.toLowerCase();
  if (!lower.startsWith("https://")) {
    if (allowLoopback) waivedHttps = true;
    else errors.push(`VITE_API_BASE_URL 必须为 https（当前: ${apiBaseUrl}）`);
  }
  if (lower.includes("127.0.0.1") || lower.includes("localhost") || lower.includes("0.0.0.0")) {
    if (allowLoopback) waivedLoopback = true;
    else errors.push(`VITE_API_BASE_URL 不得指向本机地址（当前: ${apiBaseUrl}）`);
  }
  // example.com 不在豁免范围内：豁免只解决"本地后端只有 HTTP"，不是把判点整体缴械。
  if (lower.includes("example.com")) {
    errors.push(`VITE_API_BASE_URL 不得使用示例域名 example.com（当前: ${apiBaseUrl}）`);
  }
  return { errors, waivedHttps, waivedLoopback };
}
// <<ENV_GUARD_END>>

function shortSha() {
  try {
    const r = spawnSync("git", ["rev-parse", "HEAD"], { cwd: REPO, encoding: "utf8" });
    const out = String(r.stdout || "").trim();
    return r.status === 0 && out.length >= 8 ? out.slice(0, 8) : "unknown";
  } catch {
    return "unknown";
  }
}

function stateOf(out) {
  const m = String(out).match(/ENVCHECK_RESULT=(\S+)/);
  return m ? m[1] : "(无)";
}

function runGate() {
  const clientDir = resolve(arg("client-dir", join(REPO, "apps/client")));
  const allowLoopback = flag("allow-loopback");
  const carrier = String(arg("carrier", "")).trim();
  const waiverDir = String(arg("write-waiver-to", "")).trim();

  if (allowLoopback && !carrier) {
    console.error("[verify-env-release] NOT-EVIDENCED: --allow-loopback 没带 --carrier ⇒ 匿名豁免不收（旗标用错既不算通过，也不算产品判红）");
    console.error(`${RK}=NOT-EVIDENCED reason=waiver-carrier-missing allowed=${WAIVER_CARRIERS.join(",")}`);
    return 2;
  }
  if (allowLoopback && !WAIVER_CARRIERS.includes(carrier)) {
    console.error(`[verify-env-release] NOT-EVIDENCED: --carrier=${carrier} 不在白名单 ${WAIVER_CARRIERS.join("/")} 内`);
    console.error(`${RK}=NOT-EVIDENCED reason=carrier-not-allowed carrier=${carrier}`);
    return 2;
  }
  if (!existsSync(clientDir)) {
    console.error(`[verify-env-release] NOT-EVIDENCED: env 目录不存在 ${clientDir}`);
    console.error(`${RK}=NOT-EVIDENCED reason=env-dir-missing dir=${clientDir}`);
    return 2;
  }
  let env;
  try {
    env = loadClientEnv(clientDir);
  } catch (e) {
    console.error(`[verify-env-release] NOT-EVIDENCED: env 目录读不到 ${clientDir}（${String(e && e.message).slice(0, 80)}）`);
    console.error(`${RK}=NOT-EVIDENCED reason=env-dir-unreadable dir=${clientDir}`);
    return 2;
  }

  const apiBaseUrl = String(env.VITE_API_BASE_URL ?? "").trim();
  const { errors, waivedHttps, waivedLoopback } = checkReleaseEnv(apiBaseUrl, allowLoopback);
  const git = shortSha();
  const at = new Date().toISOString();

  if (errors.length > 0) {
    console.error("[verify-env-release] FAIL: release 构建环境校验未通过：");
    for (const msg of errors) console.error(`  - ${msg}`);
    console.error(
      "[verify-env-release] 正式发布请在 apps/client/.env.real 配置真实 HTTPS 后端域名后重试（微信小程序合法域名必须为 HTTPS）；" +
      "在座本地联调请由发布链显式传 --allow-loopback --carrier release-chain（产物将标记为不可上线）。"
    );
    console.error(`${RK}=FAIL carrier=${carrier || "(default)"} api=${apiBaseUrl || "(未配置)"} errors=${errors.length} git=${git} at=${at}`);
    return 1;
  }

  if (waivedHttps || waivedLoopback) {
    console.error(`[verify-env-release] !! 本产物不可真机发布：API 基底 ${apiBaseUrl} 的 https/合法域名判点已由点名载具 ${carrier} 豁免（https:${waivedHttps} loopback:${waivedLoopback}）`);
    console.error(`${RK}=WAIVED_LOOPBACK carrier=${carrier} api=${apiBaseUrl} waived_https=${waivedHttps ? "yes" : "no"} waived_loopback=${waivedLoopback ? "yes" : "no"} git=${git} at=${at} shippable=no`);
    if (waiverDir) {
      try {
        mkdirSync(waiverDir, { recursive: true });
        const p = join(waiverDir, "LOOPBACK_WAIVER.json");
        writeFileSync(p, JSON.stringify({
          schema: "loopback-waiver/v1",
          shippable: false,
          note: "本产物由点名载具豁免 https/loopback 判点后构建，仅供在座真机验证，不可上传发布。",
          carrier,
          apiBaseUrl,
          git,
          at,
          gate: "scripts/verify-env-release.mjs",
        }, null, 2) + "\n", "utf-8");
        console.error(`ENVCHECK_ATTESTATION=${p}`);
      } catch (e) {
        // 凭证券写不进去不许静默：豁免没留痕＝事后没人能查出这份产物不可上线。
        console.error(`ENVCHECK_ATTESTATION=FAILED dir=${waiverDir} err=${String(e && e.message).slice(0, 80)}`);
      }
    }
    return 0;
  }

  console.error(`[verify-env-release] OK: release 构建环境校验通过（VITE_API_BASE_URL=${apiBaseUrl}）`);
  console.error(`${RK}=PASS carrier=${carrier || "(default)"} api=${apiBaseUrl} git=${git} at=${at}`);
  return 0;
}

/**
 * --self-test：证明 ENV_GUARD 那段是承重的，而豁免不是"永远放行"的橡皮章。
 * 做法沿用仓内既有自证形状（build-real-isolated.mjs:292-362）：把**本文件自己**复制到临时目录，
 * 用 --client-dir 喂合成 env 树，跑真子进程读真机进行为；负例靠删标记段构造。
 *   A 本机 HTTP + 不带豁免 ⇒ 必须 FAIL(1)
 *   B 换成宽松桩的变异体 + 同一输入 ⇒ 必须退 0 打 PASS（证明 A 的红确实是那段给的）
 *   C 真 HTTPS 域名 ⇒ 必须 PASS(0) 且态是 PASS 不是 WAIVED（这道门不永远红）
 *   D 带豁免却不点名载具 ⇒ 必须 NOT-EVIDENCED(2)
 *   E 点名 release-chain 豁免本机 HTTP ⇒ 必须 WAIVED_LOOPBACK(0) 且凭证券落盘标 shippable=false
 *   F example.com + 豁免 ⇒ 照旧 FAIL(1)（豁免没把判点整体缴械）
 *   G 白名单外的载具名 ⇒ 必须 NOT-EVIDENCED(2)（白名单不是摆设）
 * 全程只写临时目录，不碰 apps/client 与任何 dist。
 */
function selfTest() {
  const SRK = "ENVCHECK_SELFTEST";
  const GUARD_RE = /\n\/\/ <<ENV_GUARD_BEGIN>>[\s\S]*?\/\/ <<ENV_GUARD_END>>\n/;
  const src = readFileSync(SELF, "utf-8");
  if (!GUARD_RE.test(src)) {
    console.error(`${SRK}_NOTE=在 ${SELF} 里找不到 ENV_GUARD 标记段 ⇒ 无法构造负例，本自证判红`);
    console.error(`${SRK}=FAIL problems=1`);
    return 1;
  }
  const scratch = join(REPO, ".zcode", "tmp", "env-release-selftest");
  rmSync(scratch, { recursive: true, force: true });

  const mkTree = (name, scriptText, envReal) => {
    const root = join(scratch, name);
    const client = join(root, "apps", "client");
    mkdirSync(client, { recursive: true });
    writeFileSync(join(client, ".env"), 'VITE_API_BASE_URL="http://127.0.0.1:8080/api"\n', "utf-8");
    writeFileSync(join(client, ".env.real"), envReal, "utf-8");
    mkdirSync(join(root, "scripts"), { recursive: true });
    const script = join(root, "scripts", "verify-env-release.mjs");
    writeFileSync(script, scriptText, "utf-8");
    return { root, client, script };
  };
  const exec = (t, args) => {
    const r = spawnSync(process.execPath, [t.script, ...args], { cwd: REPO, encoding: "utf8" });
    return { code: r.status, out: `${r.stdout || ""}${r.stderr || ""}` };
  };

  const HTTP = 'VITE_API_BASE_URL="http://127.0.0.1:8080/api"\n';
  const HTTPS = 'VITE_API_BASE_URL="https://api.campus-prod.internal"\n';
  const BADDOM = 'VITE_API_BASE_URL="https://api.example.com/v1"\n';

  const A = mkTree("A-guarded", src, HTTP);
  // B 是**宽松桩变异体**（不是删段崩掉的变异体）：守卫换成永不判红的桩，其余代码原样。
  // 若 A 的红不是那段给的，B 也会照样红 ⇒ 这条断言就白写了；反过来 B 必须退 0 打 PASS。
  const PERMISSIVE = "\n// (ENV_GUARD 已被自证换成宽松桩)\nfunction checkReleaseEnv() { return { errors: [], waivedHttps: false, waivedLoopback: false }; }\n";
  const B = mkTree("B-mutant", src.replace(GUARD_RE, PERMISSIVE), HTTP);
  const C = mkTree("C-guarded-https", src, HTTPS);
  const E = mkTree("E-guarded-waived", src, HTTP);
  const F = mkTree("F-guarded-example", src, BADDOM);

  const problems = [];

  const a = exec(A, ["--client-dir", A.client]);
  console.log(`ENVCHECK_SELFTEST_A 本机HTTP+无豁免：exit=${a.code} 态=${stateOf(a.out)}`);
  if (a.code !== 1) problems.push(`A：本机 HTTP 无豁免应退 1，实测 ${a.code} ⇒ 判点没在咬`);
  if (stateOf(a.out) !== "FAIL") problems.push(`A：应打 ENVCHECK_RESULT=FAIL，实测 ${stateOf(a.out)} ⇒ 红了也没人读得见`);

  const b = exec(B, ["--client-dir", B.client]);
  console.log(`ENVCHECK_SELFTEST_B 宽松桩变异体同输入：exit=${b.code} 态=${stateOf(b.out)}（必须退 0 打 PASS，否则 A 的红不是那段给的）`);
  if (b.code !== 0 || stateOf(b.out) !== "PASS") problems.push(`B：把守卫换成宽松桩后仍不放行（exit=${b.code} 态=${stateOf(b.out)}）⇒ A 的 FAIL 不是 ENV_GUARD 那段给的，负例不承重`);

  const c = exec(C, ["--client-dir", C.client]);
  console.log(`ENVCHECK_SELFTEST_C 真 HTTPS 域名：exit=${c.code} 态=${stateOf(c.out)}`);
  if (c.code !== 0 || stateOf(c.out) !== "PASS") problems.push(`C：合法 HTTPS 被误拒或态不对（exit=${c.code} 态=${stateOf(c.out)}）⇒ 这道门过宽，会把真发布一起拦死`);

  const d = exec(A, ["--client-dir", A.client, "--allow-loopback"]);
  console.log(`ENVCHECK_SELFTEST_D 匿名豁免：exit=${d.code} 态=${stateOf(d.out)}`);
  if (d.code !== 2) problems.push(`D：--allow-loopback 不带 --carrier 应退 2（NOT-EVIDENCED），实测 ${d.code} ⇒ 匿名豁免被当成通过或当成判红`);

  const e = exec(E, ["--client-dir", E.client, "--allow-loopback", "--carrier", "release-chain", "--write-waiver-to", E.root]);
  const waiverFile = join(E.root, "LOOPBACK_WAIVER.json");
  const waiverOk = existsSync(waiverFile) && /"shippable":\s*false/.test(readFileSync(waiverFile, "utf-8"));
  console.log(`ENVCHECK_SELFTEST_E 点名豁免：exit=${e.code} 态=${stateOf(e.out)} 凭证券=${waiverOk ? "已落盘且标 shippable=false" : "缺失或没标"}`);
  if (e.code !== 0 || stateOf(e.out) !== "WAIVED_LOOPBACK") problems.push(`E：点名豁免应打 WAIVED_LOOPBACK 并退 0，实测 态=${stateOf(e.out)} exit=${e.code}`);
  if (!waiverOk) problems.push("E：豁免没在产物目录留下 LOOPBACK_WAIVER.json（shippable=false）⇒ 事后没人能查出这份产物不可上线");

  const f = exec(F, ["--client-dir", F.client, "--allow-loopback", "--carrier", "release-chain"]);
  console.log(`ENVCHECK_SELFTEST_F example.com+豁免：exit=${f.code} 态=${stateOf(f.out)}`);
  if (f.code !== 1) problems.push(`F：example.com 被豁免放行（exit=${f.code}）⇒ 豁免把判点整体缴械了`);

  const g = exec(A, ["--client-dir", A.client, "--allow-loopback", "--carrier", "whoever"]);
  console.log(`ENVCHECK_SELFTEST_G 白名单外载具：exit=${g.code} 态=${stateOf(g.out)}`);
  if (g.code !== 2) problems.push(`G：--carrier=whoever 应退 2，实测 ${g.code} ⇒ 载具白名单是摆设`);

  rmSync(scratch, { recursive: true, force: true });
  console.log(problems.length ? `${SRK}=FAIL cases=7 problems=${problems.length}` : `${SRK}=PASS cases=7 负例可红=是`);
  for (const p of problems) console.error(`  - ${p}`);
  return problems.length ? 1 : 0;
}

if (flag("self-test")) process.exit(selfTest());
else process.exit(runGate());
