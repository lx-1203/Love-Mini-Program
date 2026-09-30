/* 门替身的相对依赖搬运（两把自检共用的**一个**实现；CJS 因为两个调用方都是 .cjs，
   同仓先例：change-verbs.cjs / deny-tap.cjs 也是 .cjs 供两侧取用）。
 *
 * 起因（2026-09-30 盘上实测，不是假想）：test-corpus-denominator.cjs 与
 * test-corpus-legacy-window.cjs 都会把 scripts/qa/verify-evidence-corpus.mjs **复制**到
 * .zcode/tmp 下的替身目录（锚定夹具仓根、或翻转一条谓词）再跑。当被复制的门 import 了
 * ./evidence-store-read.mjs 之后，替身目录下没有这个文件 ⇒ ESM 按"导入方自身位置"解析 ⇒
 * ERR_MODULE_NOT_FOUND ⇒ 门一个字节都没输出。
 *   denominator 那一发因此 14 格读数全成 null（跑得飞快、退出码却像"正常跑完"）；
 *   legacy-window 那一发的"变异必红"则被同一个崩溃**假满足**（node 未捕获异常也 exit 1，
 *   于是坏读数被当成反证成功）。两类都是"测的是空气"。
 *
 * 搬运清单必须**从替身文本里派生**，不许写死文件名：门以后再加一条 import，
 * 写死的清单会静默漏掉它，而漏掉的后果正是上面两种形状之一。
 */
const { copyFileSync, existsSync, mkdirSync } = require("node:fs");
const { basename, dirname, join } = require("node:path");

/** 抽出一段模块文本里的相对 import/export-from 说明符（`./x.mjs`、`../y/z.mjs`）。
 *  只认字面量说明符；动态 import() 不在门的写法里，落到 missing 侧暴露出来。 */
function relativeImportSpecifiers(text) {
  const out = new Set();
  const re = /(?:^|[\s;])(?:import|export)\b[^;]*?\bfrom\s*['"](\.[^'"]+)['"]/g;
  let m;
  while ((m = re.exec(text)) !== null) out.add(m[1]);
  return [...out].sort();
}

/** 把替身引用的相对依赖从 srcDir 复制到替身自己的目录。
 *  返回 {specifiers, carried, missing}：missing 非空 ⇒ 调用方必须判红，
 *  不许"少一个也继续跑"（继续跑的结果就是上面那个假满足）。 */
function carryRelativeDeps({ dstPath, text, srcDir }) {
  const spec = relativeImportSpecifiers(text);
  const dest = dirname(dstPath);
  mkdirSync(dest, { recursive: true });
  const carried = [], missing = [];
  for (const s of spec) {
    const name = basename(s);
    if (!s.startsWith("./")) { missing.push(`${s}(替身不支持上跳说明符)`); continue; }
    const source = join(srcDir, name);
    if (!existsSync(source)) { missing.push(`${s}(源文件不在 ${srcDir})`); continue; }
    const abs = join(dest, name);
    copyFileSync(source, abs);
    if (!existsSync(abs)) { missing.push(`${s}(复制后复核不在盘上)`); continue; }
    carried.push(name);
  }
  return { specifiers: spec, carried, missing };
}

module.exports = { relativeImportSpecifiers, carryRelativeDeps };
