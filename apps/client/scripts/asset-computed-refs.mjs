/**
 * asset-computed-refs.mjs —— 把"常量 + 字面量尾串"拼出来的素材路径还原成完整路径。
 *
 * 为什么单独一个文件：prepare-static 的裁剪要拿它当判据，而这段求值逻辑本身需要能单测、能证伪。
 *
 * 三次错法都有实测数值（写在这里免得下次又走一遍）：
 *   1) 后缀匹配（片段能在备份树里对上文件就算引用）→ 主包 1.73MB 涨到 12.70MB：
 *      /location.svg 同时匹配 5 个目录，index.png / heart.svg 这类通用名几乎命中整棵树。
 *   2) 祖先目录（同目录有一个文件被字面量引用就把兄弟全留）→ 仍 4.11MB，还是邻居推断。
 *   3) 收配置文件里出现过的所有 "/x/y.ext" 字面量 → 11.38MB，同样把没在用的兄弟拉进包。
 *   本版：只还原真正写成 NAME + '...' 的表达式，且基址必须能沿常量表解出来 ⇒ 与人工逐条注册等价。
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const Q = String.fromCharCode(39);

function walkFiles(root, out = []) {
  let names = [];
  try { names = readdirSync(root); } catch { return out; }
  for (const n of names) {
    const abs = join(root, n);
    let st; try { st = statSync(abs); } catch { continue; }
    if (st.isDirectory()) { if (n !== "node_modules" && n !== "static") walkFiles(abs, out); continue; }
    if (/\.(ts|js|vue)$/.test(n)) out.push(abs);
  }
  return out;
}

/** 收集常量表的字面量值与拼接表达式。 */
function collect(files) {
  const literals = new Map();
  const concats = [];
  const reLit = /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*'([^']*)'/g;
  const reLit2 = /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*"([^"]*)"/g;
  /* 三元基址取"非 CDN 那一支"：const STATIC_BASE = (REAL_ASSETS ? REAL_ASSETS + "/assets" : "/static/assets")
     包里真正落盘的是冒号后那支；取错了就等于把远端地址当本地文件去找。 */
  const reTernary = /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*\(?\s*[A-Za-z0-9_$.]+\s*\?\s*[^:]+:\s*['"]([^'"]+)['"]/g;
  const reCat = /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*([A-Za-z0-9_$]+)\s*\+\s*'([^']*)'/g;
  /* 对象成员才是这套配置的主体：HOME_ICONS: { BELL: ICONS_BASE + '/home/toolbar/x.png' }
     第一版只匹配 const 声明 ⇒ images.ts 里 480 个成员一个都没读到，refs=0（实测）。 */
  const reCatMember = /([A-Za-z0-9_$]+)\s*:\s*([A-Za-z0-9_$.]+)\s*\+\s*['"]([^'"]+)['"]/g;
  for (const f of files) {
    let text; try { text = readFileSync(f, "utf-8"); } catch { continue; }
    for (const re of [reLit, reLit2, reTernary]) {
      let m; while ((m = re.exec(text)) !== null) if (!literals.has(m[1])) literals.set(m[1], m[2]);
    }
    let m; while ((m = reCat.exec(text)) !== null) if (!concats.some((c) => c.name === m[1])) concats.push({ name: m[1], base: m[2], tail: m[3] });
    let k = 0;
    while ((m = reCatMember.exec(text)) !== null) concats.push({ name: "@member" + k++ + m[1], base: m[2], tail: m[3] });
  }
  return { literals, concats };
}

/**
 * @param {string} srcRoot 要扫的源码根（一般是 apps/client/src）
 * @param {(rel:string)=>number|null} sizeOf 给定 static 相对路径返回字节数，返回 null 表示文件不存在
 * @param {{maxBytes?:number}} opts 单个文件补收上限（大位图必须有 /static/ 字面量引用才进包）
 * @returns {{refs:string[], orphans:string[], rejectedLarge:string[], unresolved:number}}
 */
export function collectComputedRefs(srcRoot, sizeOf, opts = {}) {
  const maxBytes = opts.maxBytes || 64 * 1024;
  /* 只自动补"图标族"。第三版把配置里所有拼接成员都算引用 ⇒ 332 个文件 / 3178KB，
     主包照样破 2MB 上限数倍：因为 config/images.ts 是**总目录**，里面绝大多数常量没有任何页面引用
     （40 张示例头像、一批帖子大图…）。"配置里定义了"不等于"应用会请求"，
     真正要判得解析 IMAGE_PATH.X.Y 的调用点，那是另一件事。
     本轮缺陷族（图标/矢量渲染空白）全部落在 icons/ 与 svg-spec/ 这两棵小文件树下，
     所以自动补收的范围限定到这里，位图/头像/海报仍按字面量引用走原路。 */
  const FAMILY = /(^|\/)(icons|svg-spec)\//;
  const files = walkFiles(srcRoot);
  const { literals, concats } = collect(files);
  const byName = new Map();
  const resolve = (name, depth) => {
    if (depth > 8) return null;
    if (byName.has(name)) return byName.get(name);
    if (literals.has(name)) { const v = literals.get(name); byName.set(name, v); return v; }
    const c = concats.find((x) => x.name === name);
    if (!c) return null;
    const b = resolve(c.base, depth + 1);
    const v = b === null ? null : b + c.tail;
    byName.set(name, v);
    return v;
  };
  const refs = new Set(), orphans = new Set(), rejectedLarge = new Set(), outOfFamily = new Set();
  let unresolved = 0;
  for (const c of concats) {
    if (literals.has(c.name)) continue;
    const base = resolve(c.base, 0);
    if (base === null) { unresolved++; continue; }
    const whole = base + c.tail;
    if (!/\.(png|jpg|jpeg|svg|gif|webp)$/.test(whole)) continue;
    const rel = whole.replace(/^\/+static\//, "").replace(/^\/+/, "");
    if (!FAMILY.test(rel)) { outOfFamily.add(rel); continue; }
    const sz = sizeOf(rel);
    if (sz === null) { orphans.add(c.name + " → /" + rel); continue; }
    if (sz > maxBytes) { rejectedLarge.add(rel + "(" + Math.round(sz / 1024) + "KB)"); continue; }
    refs.add("/static/" + rel);
  }
  return { refs: [...refs], orphans: [...orphans], rejectedLarge: [...rejectedLarge], outOfFamily: [...outOfFamily], unresolved };
}
