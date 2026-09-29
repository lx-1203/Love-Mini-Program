/**
 * 兼容入口（**这里不放逻辑**）。
 *
 * 2026-09-27 这个文件曾是 build-real-isolated.mjs 的一份**抄本**，用来把展示版隔离到
 * `dist/build/mp-weixin-showcase`。抄本会漂移：它先补上了「uni 必须走 node_modules/.bin/uni.CMD 绝对路径」
 * 这一手而原件没有，`scripts/qa/run-npm-script.mjs:31` 的构建标记正则里也只列了原件的名字。
 * 2026-09-29 那份逻辑已经收进唯一载具 `build-real-isolated.mjs` 的 BANDS.showcase 一行里，
 * 本文件只做转发，好让按老路径调用的地方（`scripts/qa/round7-post-b-slice.sh:62`、
 * 各 ui-queue.round7-*.json 腿）继续可用 —— 但**不要再往这个文件里加判点**。
 *
 * 用法：node scripts/build-showcase-isolated.mjs [--out <dir>] [--check-only] [--full-chain]
 * 退出码 / 机读行（SHOWCASE_RESULT=）与抄本时代一致，由载具打印。
 */
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const carrier = join(__dirname, "build-real-isolated.mjs");
const r = spawnSync(process.execPath, [carrier, "--band", "showcase", ...process.argv.slice(2)], {
  cwd: resolve(__dirname, ".."),
  stdio: "inherit",
});
if (r.error) console.error(`[showcase-shim] 载具起不来：${r.error.message}`);
process.exit(r.status === null || r.status === undefined ? 1 : r.status);
