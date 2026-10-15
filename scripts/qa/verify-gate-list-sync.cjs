#!/usr/bin/env node
/* 门禁清单的两个载具是否还指同一批门 —— 以及更重要的：两侧共享的那条禁忌还在不在。
 *
 * 为什么存在：这份"全清单"有两个载具（DSL 的门调用点与 bash 收口脚本），
 * 两边各自硬编码。谱系里记着实测教训：曾经 DSL 15 条、bash 18 步，缺面板与面板后两条复量，
 * 而两边都自称"全清单"——于是一条门在其中一个载具里被删掉时，另一个还在印 PASS。
 * 所以"两个载具清单一致"必须是一条能红的判据，而不是每次靠人对eye。
 *
 * DSL 侧取的是**全文所有门调用点**（args: [...] 形状：GATE_SUITE/PANEL_SUITE 条目与数组外的内联
 * runGate({...}) 同形，v3.7:1007 红探针、:1048 总报告回填就是数组外那两条），不再只切两个数组之间的窗口——
 * 窗口会把数组外调用点变成盲区，盲区里的门在 bash 少跑一条也不会红，等于自废。
 * 放宽窗口的代价必须由注释剥离兜住：注释里点名脚本是散文不是执行（v3.7:26/:32/:54、bash:106/:124），
 * 把它当调用点就会凭空造出一条差集。先剥注释再匹配，判点空转以 FAIL 收。
 *
 * 判的是属性，不是字面旗标：emit-round-report 这一发两侧本来就该不同
 *   —— bash 是人跑的终局收口，可以取 UI 租约复跑实时门；
 *   —— DSL 的面板腿在 Promise.all 的门清单里，取租约会和巡检车道抢同一个模拟器 ⇒ 必须 --dry。
 * 两侧真正共享的禁忌是：**面板不许把它 spawn 的子门的输出落到权威件上**（那会改写下游的输入）。
 * 这条判据因此盯的是 emit-round-report 给 verify-source-shape / verify-guest-landing /
 * verify-evidence-holes 传的 --dry 与 --out 落点，而不是它自己有没有 --dry。
 *
 * 用法：node scripts/qa/verify-gate-list-sync.cjs [--dsl <f>] [--sh <f>]
 * 机器行：GATESYNC_RESULT=PASS|FAIL|NOSUCHFILE；判点空转（两侧一条门都没解析到）以 FAIL 收。
 * 只读：不写盘、不取租约、不连设备。
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "..", "..");
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const DSL_REL = arg("dsl", ".zcode/workflows/miniprogram-ui-audit-v38.dwf.ts");
const SH_REL = arg("sh", "scripts/qa/run-final-verify-v33.sh");
const PANEL_REL = "scripts/qa/emit-round-report.mjs";

const read = (rel) => {
  const p = path.resolve(REPO, rel);
  if (!fs.existsSync(p)) { console.log(`GATESYNC_RESULT=NOSUCHFILE ${rel}`); process.exit(2); }
  return fs.readFileSync(p, "utf8");
};
const dsl = read(DSL_REL);
const sh = read(SH_REL);
const panel = read(PANEL_REL);

const base = (p) => p.replace(/^scripts\/qa\//, "").replace(/^scripts\//, "");
/* 解析式必须同时吃 .mjs / .cjs / .js：本门自己是 .cjs，
   若只匹配 .mjs，把它接进两个载具之后它会报"只在 bash 出现"——
   判据因自身扩展名而误红，这种红比不判更坏（它会教下一程去删门）。 */
const SCRIPT_RE = /"(scripts\/[^"]+\.(?:mjs|cjs|js))"/g;
const namesFrom = (s) => [...s.matchAll(SCRIPT_RE)].map((m) => base(m[1]));
/* bash 的 g 行是不带引号的裸路径，单独一把；也用来抓"正文里点名但没人执行"的冒充步骤 */
const BARE_RE = /scripts\/[^\s"'|)]+\.(?:mjs|cjs|js)/g;

/* ── 剥注释（放宽窗口的前置条件）─────────────────────────────────────────────
 * 逐字符扫，维护字符串状态（' / " / ` ，含反斜杠转义）与块注释状态：
 *   ts 载具：串外的 // 或 /* 起（或块内）一律丢弃 ⇒ 纯注释行被剥成空行，匹配不到调用点；
 *   sh 载具：串外、且位于词首（行首或空白/括号/等号之后）的 # 起丢弃；bash 没有块注释，
 *            而 // 在 shell 里是路径分隔符，绝不能当注释切。
 * 之后两侧的所有匹配都只在剥过注释的文本上做。 */
const stripComments = (src, lang) => {
  const lines = [];
  let inBlock = false;
  for (const raw of src.split(/\r?\n/)) {
    let out = "";
    let q = null;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (inBlock) {
        if (c === "*" && raw[i + 1] === "/") { inBlock = false; i++; }
        continue;
      }
      if (q) {
        out += c;
        if (c === "\\") out += raw[++i] || "";
        else if (c === q) q = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") { q = c; out += c; continue; }
      if (lang === "ts") {
        if (c === "/" && raw[i + 1] === "/") break;
        if (c === "/" && raw[i + 1] === "*") { inBlock = true; i++; continue; }
      } else if (c === "#" && (i === 0 || /[\s({=]/.test(raw[i - 1]))) break;
      out += c;
    }
    lines.push(out);
  }
  return lines.join("\n");
};
const dslCode = stripComments(dsl, "ts");
const shCode = stripComments(sh, "sh");

/* DSL 侧清单 = 全文每一个 args: [ ... ] 里的脚本路径（括号深度配对到 ] 再取，不吃行尾之后的东西）。
 * GATE_SUITE/PANEL_SUITE 的条目与数组外的内联 runGate({ name, args: [...], timeoutMs }) 是同一个形状，
 * 所以一把规则就能同时覆盖"数组里"与"数组外"两类调用点 —— 旧写法只切数组之间，数组外是盲区。 */
const pathsInArgsArrays = (src) => {
  const found = [];
  const re = /args\s*:\s*\[/g;
  let m;
  while ((m = re.exec(src))) {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let close = -1;
    for (let i = open; i < src.length; i++) {
      if (src[i] === "[") depth++;
      else if (src[i] === "]" && --depth === 0) { close = i; break; }
    }
    if (close < 0) continue;
    for (const p of namesFrom(src.slice(open, close))) found.push(p);
    re.lastIndex = close;
  }
  return found;
};
const dslSet = [...new Set(pathsInArgsArrays(dslCode))].sort();
const shSet = [...new Set([...shCode.matchAll(/^g\s+\S+\s+\d+\s+(scripts\/[^\s]+)/gm)].map((m) => base(m[1])))].sort();

/* 判据自身的可观测性：老窗口（只切两个数组）留在这里做对照，
 * 数组外调用点一旦为空 ⇒ 说明窗口效应又回来了（或 DSL 改写法了），打印出来让人看见。 */
const legacyWin = [...new Set([
  ...namesFrom(dsl.slice(dsl.indexOf("const GATE_SUITE"), dsl.indexOf("const PANEL_SUITE"))),
  ...namesFrom(dsl.slice(dsl.indexOf("const PANEL_SUITE"), dsl.indexOf("// ===== 看板"))),
])];
const outOfArray = dslSet.filter((x) => !legacyWin.includes(x));

/* 判点空转检查：任何一侧一条都没解析到 ⇒ 是扫描集坏了，不是"两侧一致"
 * （剥注释或改形状都可能把两侧扫成空集，空集对空集是"一致"，那种 PASS 是假的）。 */
if (dslSet.length === 0 || shSet.length === 0) {
  console.log(`GATESYNC_FAIL 扫描集空转 DSL=${dslSet.length} bash=${shSet.length} ⇒ 解析式与文件形状不符，本判据当前无否决力`);
  console.log("GATESYNC_RESULT=FAIL");
  process.exit(1);
}

/* 差集：两侧一律按同一把尺比，不再有任何豁免名单。
 * 原先 ALLOW_BASH_ONLY 把 prove-gates-can-fail 白名单成"只在 bash"，其依据是"DSL 没列它"——
 * 而窗口一放宽，DSL :1007 那次 redProbe 就跑不掉，依据已经不成立；
 * 依据没了的豁免必须删掉而不是留着（留着就是拿旧理由为新现实开后门）。 */
const onlyDsl = dslSet.filter((x) => !shSet.includes(x));
const onlySh = shSet.filter((x) => !dslSet.includes(x));
/* 散文冒充步骤：bash 正文里点名的每一个脚本路径，必须真在一行 g 步骤上。
 * （:130 曾用 echo「下一步跑 scripts/qa/gen-round8-report.mjs」顶替那一步 —— 收口者把 bash 当全清单时
 *   就漏掉总报告回填，报告 §7 印的是上一轮读数，且没有门能看见这次漏跑。） */
const gStepPaths = new Set([...shCode.matchAll(/^g\s+\S+\s+\d+\s+(\S+)/gm)].map((m) => base(m[1])));
const shPretend = [...new Set([...shCode.matchAll(BARE_RE)].map((m) => base(m[0])))].filter((x) => !gStepPaths.has(x));
/* 兜底：DSL 正文（剥注释后）里出现、但不属于任何 args 调用点的路径 ⇒ 要么是新写法的调用点（该进清单），
 * 要么是代码串里的散文提及（该改措辞）。两种都不该被静默忽略，故如实印出来（不作判定，避免教下一程去删门）。 */
const dslBare = [...new Set([...dslCode.matchAll(BARE_RE)].map((m) => base(m[0])))];
const dslUnattributed = [...new Set([...namesFrom(dslCode), ...dslBare])].filter((x) => !dslSet.includes(x));
const dslCount = (dsl.match(/\{ name: "/g) || []).length;
console.log(`GATESYNC_COUNTS dslEntries=${dslCount} dslScripts=${dslSet.length} bashSteps=${shSet.length} dslOldWindow=${legacyWin.length} dslOutOfArray=${outOfArray.length}${outOfArray.length ? "(" + outOfArray.join(",") + ")" : ""}${dslUnattributed.length ? " dslUnattributed=" + dslUnattributed.join(",") : ""}`);

let bad = 0;
let checked = 0;
const t = (label, ok, extra) => {
  checked++;
  if (!ok) bad++;
  console.log((ok ? "  OK   " : "  FAIL ") + label + (extra ? " :: " + extra : ""));
};
t("清单差集：门只在一侧出现（两侧一律同一把尺，无豁免名单）",
  onlyDsl.length === 0 && onlySh.length === 0,
  (onlyDsl.length ? "只在DSL=" + onlyDsl.join(",") : "") + (onlySh.length ? " 只在bash=" + onlySh.join(",") : ""));
t("bash 里不许有「点名了却没执行」的假步骤（echo 顶替 g 等于少跑一条门）",
  shPretend.length === 0, shPretend.length ? "正文点名但不在 g 步骤=" + shPretend.join(",") : "");
t("扫描集不止旧窗口：数组外的 runGate 调用点也在清单里（盲区回来=判据自废）",
  outOfArray.length > 0, outOfArray.length ? "数组外=" + outOfArray.join(",") : "数组外一条都没解析到 ⇒ 解析式退化回窗口");
/* 解释器单一来源：nodeBin 声明之外不许再出现第二处硬编码盘符路径（除注释行） */
const hardcodedNode = dsl.split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .filter((l) => /D:\/codex-tools\/node-v22/.test(l) && !/nodeBin:/.test(l));
t("解释器单一来源：正文里除 nodeBin 声明外无第二处硬编码 Node22 路径", hardcodedNode.length === 0,
  hardcodedNode.length ? "命中 " + hardcodedNode.length + " 行：" + hardcodedNode[0].trim().slice(0, 90) : "");
t("干跑预检测的是本版文件（DSL 侧带 --file 指 v3.8）",
  /--file",\s*"\.zcode\/workflows\/miniprogram-ui-audit-v38\.dwf\.ts"/.test(dsl));
t("干跑预检测的是本版文件（bash 侧同一旗标）",
  /dryrun-workflow\.mjs --profile all --file \.zcode\/workflows\/miniprogram-ui-audit-v38\.dwf\.ts/.test(sh));
t("降级结论诚实性门在两个载具都接线（写了没人跑=没写）",
  /verify-degraded-conclusion/.test(dsl) && /verify-degraded-conclusion/.test(sh));
t("DSL 的覆盖门带 --dir（判本轮写出的腿目录，不默认扫历史轮）",
  /verify-real-coverage\.mjs",\s*"--ops",\s*WORKFLOW\.opsDir,\s*"--dir",\s*WORKFLOW\.execDir/.test(dsl));
/* 共享禁忌：面板不得把子门输出落到权威件 */
t("面板给 verify-source-shape 传 --dry（否则重写 cellplan-source-shape 这份下游输入）",
  /verify-source-shape\.mjs",\s*\["--dry"/.test(panel));
t("面板给 verify-guest-landing(book) 传 --out 侧车（否则重写 guest-landing-booked）",
  /--mode",\s*"book",\s*"--out",\s*GUEST_BOOK_SIDECAR/.test(panel));
t("面板给 verify-evidence-holes 传 --out 侧车（否则重写 evidence-holes-verdict）",
  /"--out",\s*HOLES_SIDECAR/.test(panel));
/* 陈旧口径检测：一句已经不成立的危险声明留在脚本里，会诱导下一程去修一个不存在的问题 */
t("bash 里不留「面板会重写判决件」的旧说法（三处落点已改，这句话现在只制造误导）",
  !/并且会重写\n# reports\/audit\/round-7\/\{evidence-holes-verdict/.test(sh));
/* 不许写死条数：任何自称"全清单"的地方都不该出现硬编码的门条数 */
const hardcodedCount = /"(十项|十二项|\d+\s*项)门禁/.test(dsl) || /"(十项|十二项|\d+\s*项)门禁/.test(sh);
t("两个载具都不许把门禁条数写进措辞（清单会长，条数是承诺不是事实）", !hardcodedCount);

console.log(`GATESYNC_RESULT=${bad === 0 ? "PASS" : "FAIL"}（判点数=${checked}，不一致=${bad}）`);
process.exit(bad === 0 ? 0 : 1);
