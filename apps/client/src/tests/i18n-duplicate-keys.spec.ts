import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * i18n 同层重复键判点（第六轮修复波 W2c 条目 2）。
 *
 * ── 为什么既有判点抓不到（结论，不是猜测）──────────────────────────────
 * `src/tests/i18n.spec.ts` 的「zh-CN 键集应自洽：叶子路径唯一且文案值非空」判的是
 * **运行时对象的叶子路径**：`collectLeafEntries(zhCN)` 用 `Object.keys()` 递归已求值的
 * 模块对象，再 `new Set(paths).size === entries.length`。
 * TS/JS 对象字面量里的同层重复键在**求值时就被静默合并**（后写的整块覆盖先写的同名片段），
 * 运行时对象的键名按语言规范不可能重复 ⇒ 这条判据对**任何** locale 文件恒真，
 * 它既不是「叶子名全局唯一」也不是「路径唯一」，而是「路径唯一」的**平凡重述**。
 * 实测口径（本文件 §判据自证 那组用例把它钉住了）：
 *   zh-CN.ts 源文本级键出现次数 4475、去重后的运行时叶子路径 4176、同层重复 0 对。
 *   往 storeErrors 下再插一个 "vip" 块 ⇒ 源文本键数继续增加、运行时叶子路径一条不多
 *   （前块被整块吞掉）、「路径唯一」照绿、`t("storeErrors.vip.statusPending")` 退回裸键名。
 *
 * ── 所以判点必须文本级扫描 ──────────────────────────────────────────
 * 见下方 `scanObjectLiteralKeys`：按花括号深度 + 父路径追踪，找**同一父路径下重复出现的键**。
 * 它带三样东西，缺一不可：
 *   1) 扫描面下限（§判据自证 前的「扫描面下限」组）——源文本读不到 3000+ 个键就说明尺子塌了，
 *      不许空转报绿（本仓已知坑：空集上恒过）；
 *   2) 阳性对照（§阳性对照）——喂一个已知重复的合成片段必须报红，且给出父路径 + 两处行号；
 *      同时喂「同名不同父」的近邻反例，证明它不是把「重名字符串」当重复；
 *   3) 存量基线（§存量基线）——只减不增，出现新重复时失败信息逐条点名 parent/key/行号。
 */

const LOCALES_DIR = resolve(__dirname, "../i18n/locales");

/* ───────────────────────────── 词法 ───────────────────────────── */

type TokenType = "string" | "template" | "name" | "punct" | "unknown";
interface Token {
  type: TokenType;
  value: string;
  line: number;
}

/**
 * 极简 tokenizer：剥注释（// 与 /* *\/，字符串内部不误伤）、区分字符串字面量与结构符。
 * 为什么不用正则逐行扫：locale 的值里大量出现 `//`（URL）、`:`、`,`、`{`/`}`，
 * 行级正则会把这些当结构；而重复键判据要的恰恰是「这个键出现在哪一层的哪一行」。
 */
function tokenize(src: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === "\n") {
      line++;
      i++;
      continue;
    }
    if (c === " " || c === "\t" || c === "\r") {
      i++;
      continue;
    }
    if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && n === "*") {
      i += 2;
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] === "\n") line++;
        i++;
      }
      i += 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let value = "";
      i++;
      while (i < src.length) {
        if (src[i] === "\\") {
          value += src[i] + (src[i + 1] ?? "");
          i += 2;
          continue;
        }
        if (src[i] === quote) {
          i++;
          break;
        }
        if (src[i] === "\n") line++;
        value += src[i];
        i++;
      }
      tokens.push({ type: quote === "`" ? "template" : "string", value, line });
      continue;
    }
    if ("{}[]:,(;)".includes(c)) {
      tokens.push({ type: "punct", value: c, line });
      i++;
      continue;
    }
    const ident = /^[A-Za-z_$][A-Za-z0-9_$]*/u.exec(src.slice(i));
    if (ident) {
      tokens.push({ type: "name", value: ident[0], line });
      i += ident[0].length;
      continue;
    }
    // 数字/中文等裸片段：整段吞掉，不让游标卡住
    const rest = /^[^\s{}[\]:,()'";`]+/u.exec(src.slice(i));
    tokens.push({ type: "unknown", value: rest ? rest[0] : c, line });
    i += rest ? rest[0].length : 1;
  }
  return tokens;
}

/** 去引号与转义，把 `"a"` / `'a'` / `a` 归一到同一个键名（同层重复不认引号写法）。 */
function normalizeKey(token: Token): string {
  const unescaped = token.value.replace(/\\(["'`\\nrt])/gu, (_all, ch: string) =>
    ch === "n" ? "\n" : ch === "t" ? "\t" : ch === "r" ? "\r" : ch
  );
  return unescaped;
}

/* ───────────────────────────── 结构扫描 ───────────────────────────── */

export interface DuplicateKey {
  /** 所在父路径（数组元素的对象记作 `父路径[]`；根层记 `<root>`） */
  parentPath: string;
  key: string;
  /** 首次出现的行号 */
  firstLine: number;
  /** 被覆盖写法出现的行号（后者整体覆盖前者） */
  dupLine: number;
  /** 键名是否写在数组元素对象里（不是 t() 可寻址路径，但仍是被静默合并的字面量） */
  insideArray: boolean;
}

export interface ScanResult {
  dups: DuplicateKey[];
  /** 源文本级键出现次数（含被静默合并掉的） */
  keyOccurrences: number;
  /** 数组元素对象里的键出现次数（keyOccurrences 的子集） */
  arrayKeyOccurrences: number;
  /** 出现过的父路径数（含根） */
  parentPaths: number;
  /** 最大嵌套深度 */
  maxDepth: number;
  tokens: number;
  lines: number;
}

/**
 * 文本级扫描对象字面量的同层重复键。
 *
 * 口径：
 * - 只在**同一个对象字面量内部**比键名（父路径不同不算重复，那是两条不同 t() 路径）；
 * - 计算键 `[expr]:` 的键名要运行时才知道 ⇒ 整段跳过，不参与同层比对；
 * - 数组元素对象里的重复同样报出（TS 一样静默合并），但打上 insideArray 标记，
 *   因为它不是 `t("a.b")` 可寻址的文案位。
 */
export function scanObjectLiteralKeys(src: string): ScanResult {
  const tokens = tokenize(src);
  const dups: DuplicateKey[] = [];
  const parents = new Set<string>();
  let keyOccurrences = 0;
  let arrayKeyOccurrences = 0;
  let maxDepth = 0;
  let depth = 0;
  let pos = 0;

  const at = (value: string): boolean => {
    const t = tokens[pos];
    return !!t && t.type === "punct" && t.value === value;
  };

  /** 标量值：吃到下一个 , } ] 为止（字符串已整体成 token，内部逗号不会截断） */
  function skipScalar(): void {
    while (pos < tokens.length) {
      const cur = tokens[pos];
      if (cur.type === "punct" && (cur.value === "," || cur.value === "}" || cur.value === "]")) return;
      pos++;
    }
  }

  function parseValue(path: string): void {
    const t = tokens[pos];
    if (!t) return;
    if (t.type === "punct" && t.value === "{") {
      parseObject(path, false);
      return;
    }
    if (t.type === "punct" && t.value === "[") {
      parseArray(path);
      return;
    }
    skipScalar();
  }

  function parseArray(path: string): void {
    pos++; // [
    depth++;
    maxDepth = Math.max(maxDepth, depth);
    while (pos < tokens.length && !at("]")) {
      if (at(",")) {
        pos++;
        continue;
      }
      if (at("{")) {
        parseObject(`${path}[]`, true);
        continue;
      }
      if (at("[")) {
        parseArray(`${path}[]`);
        continue;
      }
      skipScalar();
    }
    if (at("]")) pos++;
    depth--;
  }

  function parseObject(parentPath: string, insideArray: boolean): void {
    pos++; // {
    depth++;
    maxDepth = Math.max(maxDepth, depth);
    parents.add(parentPath || "<root>");
    const seen = new Map<string, number>();
    while (pos < tokens.length) {
      const t = tokens[pos];
      if (t.type === "punct" && t.value === "}") {
        pos++;
        depth--;
        return;
      }
      if (t.type === "punct" && (t.value === "," || t.value === ";" || t.value === ":")) {
        pos++;
        continue;
      }
      if (t.type === "punct" && t.value === "[") {
        // 计算键：键名运行时才知道 ⇒ 跳过 [expr] 与其值
        let bracket = 1;
        pos++;
        while (pos < tokens.length && bracket > 0) {
          if (at("[")) bracket++;
          if (at("]")) bracket--;
          pos++;
        }
        if (at(":")) pos++;
        parseValue(parentPath);
        continue;
      }
      if (t.type === "string" || t.type === "template" || t.type === "name" || t.type === "unknown") {
        const key = normalizeKey(t);
        const keyLine = t.line;
        pos++;
        keyOccurrences++;
        if (insideArray) arrayKeyOccurrences++;
        if (seen.has(key)) {
          dups.push({
            parentPath: parentPath || "<root>",
            key,
            firstLine: seen.get(key) as number,
            dupLine: keyLine,
            insideArray,
          });
        } else {
          seen.set(key, keyLine);
        }
        if (at(":")) pos++;
        parseValue(parentPath ? `${parentPath}.${key}` : key);
        continue;
      }
      pos++;
    }
    depth--;
  }

  // 跳过 `export default` 之类的前缀，从第一个 `{` 开始
  while (pos < tokens.length && !at("{")) pos++;
  if (pos < tokens.length) parseObject("", false);

  return {
    dups,
    keyOccurrences,
    arrayKeyOccurrences,
    parentPaths: parents.size,
    maxDepth,
    tokens: tokens.length,
    lines: src.split(/\r?\n/u).length,
  };
}

/* ───────────────────────────── 在册 locale 资源清单 ───────────────────────────── */

function localeFiles(): string[] {
  return readdirSync(LOCALES_DIR)
    .filter((f) => f.endsWith(".ts"))
    .sort();
}

/**
 * 存量基线（棘轮，只减不增）。
 * 签名格式：`父路径 > 键名`。
 *
 * 2026-11-01 本车道实测：`zh-CN.ts`（4866 行 / 4475 个源文本级键 / 300 个父路径）
 * 同层重复键 **0 对** ⇒ 基线为空集。
 * 空集不是「没扫」：同一把尺在同一次跑里对合成片段报出了重复（见 §阳性对照），
 * 而扫描面下限（§扫描面下限）要求源文本读到 3000+ 个键、250+ 个父路径才允许继续判。
 * 将来若扫出新的同层重复，红信里会逐条点名 parent/key/两处行号；消掉它之后
 * 基线只能保持空集，不许为了转绿而把新条目写进这张表（本仓棘轮纪律）。
 */
const DUPLICATE_KEY_BASELINE: string[] = [];

function signature(d: DuplicateKey): string {
  return `${d.parentPath} > ${d.key}${d.insideArray ? " (数组元素)" : ""}`;
}

describe("i18n 同层重复键 - 扫描面下限（尺子塌了不许空转报绿）", () => {
  const files = localeFiles();
  const results = files.map((f) => {
    const src = readFileSync(join(LOCALES_DIR, f), "utf8");
    return { file: f, src, scan: scanObjectLiteralKeys(src) };
  });

  it("locales 目录至少有一份 .ts 语言资源（清单为空＝扫描根本没接上）", () => {
    expect(files.length, "src/i18n/locales 下没有 .ts").toBeGreaterThanOrEqual(1);
  });

  it.each(results)("《$file》源文本读到的键量/层数/深度均在下限之上", (r) => {
    // 下限取「实测值砍三成」：实测 zh-CN.ts = 4866 行 / 18002 token / 4475 键 / 300 父路径 / 深度 6。
    // 目的是防空转（tokenizer 或遍历塌了会读到 0 个键，旧判据照样绿），不是拦正常增删文案。
    expect(r.scan.lines, "行数下限").toBeGreaterThanOrEqual(3000);
    expect(r.scan.tokens, "token 数下限（tokenizer 塌了会读到 0）").toBeGreaterThanOrEqual(15000);
    expect(r.scan.keyOccurrences, "源文本级键出现次数下限").toBeGreaterThanOrEqual(3000);
    expect(r.scan.parentPaths, "父路径数下限（深度遍历塌了会只剩根）").toBeGreaterThanOrEqual(200);
    expect(r.scan.maxDepth, "最大嵌套深度下限").toBeGreaterThanOrEqual(3);
  });

  it("源文本键数 ≥ 运行时叶子路径数（静默合并掉的键就藏在这两个数的差里）", () => {
    for (const r of results) {
      const leaves = countRuntimeLeaves(r.src);
      // 关系：keyOccurrences = 叶子路径数 + 对象型键数 - 被合并掉的键数。
      // 无重复时 keyOccurrences 必然 > 叶子路径数（因为对象型键也计数）；
      // 一旦出现同层重复，「源文本多出来的键」不再等于「对象型键数」⇒ 这一条把两把尺绑在一起。
      expect(
        r.scan.keyOccurrences,
        `${r.file}: 源文本键数 ${r.scan.keyOccurrences} 应不少于运行时叶子路径 ${leaves}`,
      ).toBeGreaterThanOrEqual(leaves);
      expect(leaves, `${r.file}: 运行时叶子路径下限`).toBeGreaterThanOrEqual(1500);
    }
  });
});

/** 把 locale 文件求值成对象后数叶子路径（与 scripts/qa/verify-i18n-orphan.mjs 的 loadLocale 同口径）。 */
function countRuntimeLeaves(src: string): number {
  const obj = evalLocale(src);
  let leaves = 0;
  const walk = (node: Record<string, unknown>): void => {
    for (const key of Object.keys(node)) {
      const value = node[key];
      if (value !== null && typeof value === "object" && !Array.isArray(value)) {
        walk(value as Record<string, unknown>);
      } else {
        leaves++;
      }
    }
  };
  walk(obj);
  return leaves;
}

function evalLocale(src: string): Record<string, unknown> {
  if (!/export default/u.test(src)) {
    throw new Error("locale 文件里没有 export default，取数方式已变，别硬猜");
  }
  const body = src.replace(/export default/u, "return ").replace(/\bas const\b/gu, "");
  return new Function(body)() as Record<string, unknown>;
}

describe("i18n 同层重复键 - 阳性对照（这把尺必须能报红）", () => {
  it("同一父路径下的重复块必须报出，且带父路径与两处行号", () => {
    const src = `export default {
  "storeErrors": {
    "vip": { "statusPending": "等待审核" },
    "checkin": { "timeout": "超时" },
    "vip": { "statusActive": "已开通" }
  }
} as const;`;
    const r = scanObjectLiteralKeys(src);
    expect(r.dups.length, "应报出 1 对同层重复").toBe(1);
    expect(r.dups[0]?.parentPath).toBe("storeErrors");
    expect(r.dups[0]?.key).toBe("vip");
    expect(r.dups[0]?.firstLine).toBe(3);
    expect(r.dups[0]?.dupLine).toBe(5);
    expect(r.dups[0]?.insideArray).toBe(false);
    // 键计数：storeErrors / vip / statusPending / checkin / timeout / vip / statusActive = 7 次
    expect(r.keyOccurrences).toBe(7);
  });

  it("同名但不同父＝两条不同 t() 路径，不得误报（否则判据退化成『重名字符串』扫描）", () => {
    const src = `export default {
  "a": { "same": { "x": "1" } },
  "b": { "same": { "x": "2" } }
} as const;`;
    expect(scanObjectLiteralKeys(src).dups).toEqual([]);
  });

  it("同层三连写报 2 对（第 2、3 次都相对首次计），行号逐条给", () => {
    const src = `export default {
  "x": "1",
  "x": "2",
  "x": "3"
} as const;`;
    const r = scanObjectLiteralKeys(src);
    expect(r.dups.length).toBe(2);
    expect(r.dups.map((d) => `${d.firstLine}->${d.dupLine}`)).toEqual(["2->3", "2->4"]);
    expect(r.dups.every((d) => d.parentPath === "<root>" && d.key === "x")).toBe(true);
  });

  it("引号写法不同也认（\"a\" 与 a 与 'a' 是同一个键）", () => {
    const src = `export default {
  "a": "1",
  b: "2",
  a: "3"
} as const;`;
    const r = scanObjectLiteralKeys(src);
    expect(r.dups.length).toBe(1);
    expect(r.dups[0]?.key).toBe("a");
  });

  it("注释里的假键、值里的 // 与冒号逗号都不得算成键", () => {
    const src = `export default {
  "a": "https://example.com/x?q=1,r=2",
  // "dup": 1,
  /* "later": 2, */
  "dup": 2
} as const;`;
    const r = scanObjectLiteralKeys(src);
    expect(r.dups).toEqual([]);
    // 只剩真键 2 枚：a、dup（注释里的 "dup":1 与 "later":2 都不该进计数）
    expect(r.keyOccurrences).toBe(2);
  });

  it("数组元素对象里的同层重复同样报出，并标 insideArray", () => {
    const src = `export default {
  "list": [
    { "k": "1", "k": "2" }
  ]
} as const;`;
    const r = scanObjectLiteralKeys(src);
    expect(r.dups.length).toBe(1);
    expect(r.dups[0]?.parentPath).toBe("list[]");
    expect(r.dups[0]?.insideArray).toBe(true);
    expect(r.arrayKeyOccurrences).toBe(2);
  });

  it("计算键 [expr] 不参与同层比对（键名运行时才知道）", () => {
    const src = `export default {
  [KEY]: "1",
  "x": "2"
} as const;`;
    const r = scanObjectLiteralKeys(src);
    expect(r.dups).toEqual([]);
  });
});

describe("i18n 同层重复键 - 判据自证（旧判点为什么抓不到）", () => {
  const srcWithDup = `export default {
  "storeErrors": {
    "vip": { "statusPending": "等待审核" },
    "vip": { "statusActive": "已开通" }
  }
} as const;`;

  it("旧判点的谓词（运行时叶子路径唯一）对含重复的源**照样成立** ⇒ 它是恒真的平凡重述", () => {
    // 复刻 src/tests/i18n.spec.ts:163-176 的 collectLeafEntries + Set 去重口径
    const entries: Array<[string, unknown]> = [];
    const collect = (node: Record<string, unknown>, prefix = ""): void => {
      for (const key of Object.keys(node)) {
        const path = prefix ? `${prefix}.${key}` : key;
        const value = node[key];
        if (value !== null && typeof value === "object" && !Array.isArray(value)) {
          collect(value as Record<string, unknown>, path);
        } else {
          entries.push([path, value]);
        }
      }
    };
    collect(evalLocale(srcWithDup));
    const uniquePaths = new Set(entries.map((e) => e[0]));
    // 这一行就是「旧判点在那一发全绿」的机器证明：Object.keys 不可能给出重复路径。
    expect(uniquePaths.size).toBe(entries.length);
    // 而文本级这把尺在同一份源上报 1 对。
    expect(scanObjectLiteralKeys(srcWithDup).dups.length).toBe(1);
  });

  it("同层重复的实害：后块整体覆盖前块 ⇒ 前块的叶子路径从 t() 面上消失（退回裸键名）", () => {
    const obj = evalLocale(srcWithDup);
    const vip = (obj.storeErrors as Record<string, unknown>).vip as Record<string, unknown>;
    // 运行时只剩后写的那一块：statusPending 根本不存在
    expect(Object.keys(vip)).toEqual(["statusActive"]);
    // vue-i18n 对查不到的 key 原样回吐键名 ⇒ 页面印出 "storeErrors.vip.statusPending"
    // （这里不挂 i18n 实例，用同一份语义写死：路径不存在就是会被回吐）
    expect(vip.statusPending).toBeUndefined();
  });

  it("在册 zh-CN.ts 的实测读数入账（4475 源文本键 / 4176 运行时叶子路径 / 0 同层重复）", () => {
    const src = readFileSync(join(LOCALES_DIR, "zh-CN.ts"), "utf8");
    const r = scanObjectLiteralKeys(src);
    const leaves = countRuntimeLeaves(src);
    // 恒等式的前提：locale 里不该出现「数组元素对象」——数组按 collectLeafEntries 口径整体算一枚叶子，
    // 其内部对象的键会被源文本计到、却不被运行时计入。这条断言把这个前提钉住，
    // 将来真有人往语言包里塞对象数组，它先红并要求重推口径，而不是让恒等式悄悄失配。
    expect(r.arrayKeyOccurrences, "locale 里出现了数组元素对象 ⇒ 下面那条恒等式的口径要重推").toBe(0);
    expect(r.dups).toEqual([]);
    // 源文本键数 = 运行时叶子路径数 + 对象型键数（父路径数含根，故 -1）；无同层重复时该式成立
    expect(r.keyOccurrences - leaves).toBe(r.parentPaths - 1);
    expect(r.keyOccurrences).toBeGreaterThanOrEqual(4000);
    expect(leaves).toBeGreaterThanOrEqual(4000);
  });
});

describe("i18n 同层重复键 - 存量基线（棘轮，只减不增）", () => {
  const files = localeFiles();
  const all = files.flatMap((f) =>
    scanObjectLiteralKeys(readFileSync(join(LOCALES_DIR, f), "utf8")).dups.map((d) => ({
      ...d,
      file: f,
    }))
  );

  it("在册 locale 的同层重复键与基线逐条相等（新增即红、消掉一条也要同步降基线）", () => {
    const found = all.map((d) => `${d.file}: ${signature(d)}`);
    const unexpected = all.filter((d) => !DUPLICATE_KEY_BASELINE.includes(signature(d)));
    expect(
      unexpected.map((d) => `${d.file} ${signature(d)} 首次 ${d.firstLine} 行、被覆盖写法 ${d.dupLine} 行`),
      `扫出基线之外的同层重复键（TS 求值时后块整体覆盖前块，前块的 t() 路径会退回裸键名）：\n${found.join("\n")}`
    ).toEqual([]);
    expect(DUPLICATE_KEY_BASELINE).toEqual([]);
  });
});
