/* 仓外证据库的**唯一**读法（三态 + 前缀索引 + 碰撞计数）。
 *
 * 为什么要有这个文件：三态判定原先内联在 verify-evidence-corpus.mjs 里（:62-91）。
 * 当 verify-provenance-all 也需要"盘上没有、但库里按哈希能背书"这一判定时，
 * 复制一份就是本仓反复付过代价的形状（DENY_TAP 曾经三份副本各自漂移）。
 * "这枚帧能不能被背书"是一个跨门的判断，必须是**一个**实现。
 *
 * 三态语义（用户 2026-09-29 裁定③，逐字沿用，不改判据）：
 *   unconfigured（没配库）   ⇒ 本轴一句话都不说，判定与从前逐字节相同（不新增红，也不豁免任何东西）；
 *   inside-repo（库在仓内）  ⇒ 视同没配（仓内库不算"仓外证据"，且会把证据又塞回 git）；
 *   unreachable（配了够不着）⇒ 判红 —— 把证据弄丢还宣布安全是最危险的形状；
 *   reachable（配了且够得着）⇒ 盘上缺帧时可由库按哈希背书；两边都没有 ⇒ 断链，判红并指名。
 * 库里的对象名是完整 sha256（evidence-store.mjs 写的），manifest 里只有 16 位前缀 ⇒ 索引按前缀建；
 * 同一前缀命中多枚 = 碰撞，调用方必须按"宁可判红"处理，不许"取第一个当命中"。
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve, sep } from "node:path";

export const STORE_HASH_PREFIX = 16;

/** 从 argv 的 --store 或环境变量 QA_EVIDENCE_STORE 取库目录并建索引。
 *  ⚠ 环境变量是第二条配置通道：调用方"没传 --store"不等于"未配库"，两边都得看。
 *  ⚠ 反过来也成立：显式传的 `dir`（含空串）必须**压过**环境变量，否则测试与调用方
 *    在带 QA_EVIDENCE_STORE 的壳里拿到的不再是自己那一发（2026-09-30 实测：聚合器
 *    导出该变量，test-evidence-store-read 的"未配库"格读成 reachable —— 用 `||` 串联
 *    入参时，空串被当成"没传"，环境就漏了进来）。所以这里按"是否显式提供"分支，不按真假值。 */
export function openEvidenceStore({ argv = process.argv.slice(2), repo, dir: dirIn } = {}) {
  if (!repo) throw new Error("openEvidenceStore 需要 repo（判定库是否落在仓内要用它）");
  const i = argv.indexOf("--store");
  const d = dirIn !== undefined ? String(dirIn)
    : (i >= 0 && argv[i + 1] ? argv[i + 1] : (process.env.QA_EVIDENCE_STORE || ""));
  if (!d) return { mode: "unconfigured", dir: "", index: null, objects: 0 };
  const dir = resolve(d);
  const dirNorm = dir.split(sep).join("/"), repoNorm = String(repo).split(sep).join("/");
  if (dirNorm === repoNorm || dirNorm.startsWith(repoNorm + "/")) return { mode: "inside-repo", dir, index: null, objects: 0 };
  if (!existsSync(dir)) return { mode: "unreachable", dir, index: null, objects: 0 };
  const index = new Map();
  let objects = 0;
  for (const b of readdirSync(dir)) {
    const sub = join(dir, b);
    let st = null; try { st = statSync(sub); } catch { continue; }
    if (!st.isDirectory()) continue;
    for (const f of readdirSync(sub)) {
      const h = f.replace(/\.[0-9a-z]+$/i, "").toLowerCase();
      objects++;
      const k = h.slice(0, STORE_HASH_PREFIX);
      index.set(k, (index.get(k) || 0) + 1);
    }
  }
  return { mode: "reachable", dir, index, objects };
}

/** 一帧能否被库背书：只有"可达 + 有 16 位以上哈希 + 前缀唯一命中"才算。
 *  返回 vouchable / 原因，调用方据此分桶，不许自己猜。 */
export function storeVouches(store, hash) {
  if (!store || store.mode !== "reachable") return { vouchable: false, why: `store_mode=${store ? store.mode : "none"}` };
  const h = String(hash || "").toLowerCase();
  if (h.length < STORE_HASH_PREFIX) return { vouchable: false, why: "hash_short_or_missing" };
  const c = store.index.get(h.slice(0, STORE_HASH_PREFIX)) || 0;
  if (c === 1) return { vouchable: true, why: "unique_prefix_hit" };
  if (c > 1) return { vouchable: false, why: `collision=${c}` };
  return { vouchable: false, why: "no_hit_in_store" };
}

export function readJsonSafe(p) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}
