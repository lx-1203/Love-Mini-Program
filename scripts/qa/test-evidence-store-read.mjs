/* scripts/qa/evidence-store-read.mjs 的负例（两把门现在共用这一个实现，它错了两边一起错）。
   用合成库跑，不碰真仓外库；三态 + 唯一命中 + 碰撞 + 短哈希各一格。
   自报格式跟仓库方言：*_SUMMARY cases=N fail=M + *_TEST=PASS|FAIL。 */
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openEvidenceStore, storeVouches, STORE_HASH_PREFIX } from "./evidence-store-read.mjs";

let checks = 0, failures = 0;
const ok = (c, msg, extra = "") => { checks++; if (!c) { failures++; console.log(`  FAIL ${msg} ${extra}`); } else console.log(`  ok   ${msg}`); };

const root = mkdtempSync(join(tmpdir(), "st-"));
const repo = join(root, "repo");
const storeDir = join(root, "store");
mkdirSync(repo, { recursive: true });

const H1 = "a".repeat(64), H2 = "b".repeat(64);
const shard = (h) => h.slice(0, 2);
function putObject(dir, hash, ext = ".img") {
  mkdirSync(join(dir, shard(hash)), { recursive: true });
  writeFileSync(join(dir, shard(hash), hash + ext), "x");
}

/* 1) 未配库 ⇒ unconfigured，且调用方拿到的 index 是 null（不许误当成"库里没有"） */
{
  const s = openEvidenceStore({ argv: [], repo, dir: "" });
  ok(s.mode === "unconfigured" && s.index === null, "未配库 ⇒ unconfigured/index=null", `mode=${s.mode}`);
  ok(storeVouches(s, H1).vouchable === false, "未配库时任何帧都不算被背书（不许默认放行）");
}

/* 2) 配了但够不着 ⇒ unreachable（不是"当没有库"） */
{
  const s = openEvidenceStore({ argv: [], repo, dir: join(root, "nope") });
  ok(s.mode === "unreachable", "目录不存在 ⇒ unreachable", `mode=${s.mode}`);
  ok(storeVouches(s, H1).vouchable === false, "unreachable 时不算被背书");
}

/* 3) 库在仓内 ⇒ inside-repo（视同没配，不把证据塞回 git） */
{
  const inRepo = join(repo, "ev");
  mkdirSync(inRepo, { recursive: true });
  const s = openEvidenceStore({ argv: [], repo, dir: inRepo });
  ok(s.mode === "inside-repo", "库落在仓内 ⇒ inside-repo", `mode=${s.mode}`);
}

/* 4) 可达 + 前缀唯一命中 ⇒ 可背书；长度门槛按实现口径 */
{
  putObject(storeDir, H1);
  const s = openEvidenceStore({ argv: [], repo, dir: storeDir });
  ok(s.mode === "reachable" && s.objects === 1, "可达 ⇒ reachable 且数到对象", `mode=${s.mode} objects=${s.objects}`);
  ok(storeVouches(s, H1).vouchable === true, "唯一前缀命中 ⇒ 可背书");
  ok(storeVouches(s, H1).why === "unique_prefix_hit", "命中理由具名", storeVouches(s, H1).why);
  ok(storeVouches(s, "short").vouchable === false, "哈希太短 ⇒ 不可背书（不许猜）");
  ok(storeVouches(s, "f".repeat(64)).vouchable === false, "库里没有这枚 ⇒ 不可背书");
}

/* 5) 同前缀两枚 ⇒ 碰撞，宁可判红也不许"取第一个当命中" */
{
  const collide = "c".repeat(64);
  const other = "c".repeat(64).slice(0, 63) + "9";
  putObject(storeDir, collide); putObject(storeDir, other);
  const s = openEvidenceStore({ argv: [], repo, dir: storeDir });
  const v = storeVouches(s, collide);
  ok(v.vouchable === false && /^collision=/.test(v.why), "同前缀多枚 ⇒ collision 且不可背书", `vouchable=${v.vouchable} why=${v.why}`);
}

rmSync(root, { recursive: true, force: true });
console.log(`STORE_READ_SUMMARY cases=${checks} fail=${failures}`);
console.log(`STORE_READ_TEST=${failures ? "FAIL" : "PASS"} prefix=${STORE_HASH_PREFIX}`);
process.exit(failures ? 1 : 0);
