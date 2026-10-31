import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  CSV_BOM,
  CSV_CRLF,
  CSV_FORMULA_PREFIX_CHARS,
  csvCell,
  csvDocument,
  csvLine,
  csvRow,
} from "./csv";

/**
 * CSV 公式注入护栏（apps/admin/src/utils/csv.ts）——与后端 CsvCellUtil.java 同规则。
 *
 * 立项目标（P2 修复，2026-10-31）：`views/system/AuditLogs.vue` 的 exportCsv 在浏览器里
 * 现拼 text/csv，改前只做 RFC 4180 引号转义、**没有**公式中和。引号包裹救不了它：
 * Excel/WPS 先剥掉包裹的引号还原成 `=cmd|'/c calc'!A0`，再按公式执行。
 * 审计日志的 operatorUsername / operation / ip 都是用户或上游可控串 ⇒ 公式能一路进到
 * 管理员桌面上那份 csv 里。
 *
 * 本测钉死三件事：
 * ① 六个危险首字符各前置单引号 `'`，且该规则与「要不要引号包裹」彼此独立（同时命中时两枚都在）；
 * ② 正常值一字不改（护栏不许退化成「逢字就逃」的软失败，那等于把 bug 藏进噪音里）；
 * ③ 前后端两处规则**逐字符同集合**——否则「唯一护栏」名不副实，第 N 个导出场景仍会从缝里漏出去。
 */

/** 读后端 CsvCellUtil.java 里在册的危险首字符集（读不到就抛，判据不许空转） */
function javaFormulaPrefixChars(): string {
  const javaSrc = readFileSync(
    resolve(
      __dirname,
      "../../../api/src/main/java/com/campuslove/api/utils/CsvCellUtil.java",
    ),
    "utf8",
  );
  const m = javaSrc.match(/FORMULA_PREFIX_CHARS\s*=\s*"((?:[^"\\]|\\.)*)"/u);
  if (!m) {
    throw new Error("CsvCellUtil.java 里找不到 FORMULA_PREFIX_CHARS 声明");
  }
  // Java 源码里的 \t \r 是两字符转义序列 ⇒ 还原成真实控制字符再比对。
  // 捕获组为空时必须抛：退化成 "" 会让下面的前后端对齐判点拿空集比对，反而恒绿。
  const raw = m[1];
  if (raw === undefined) {
    throw new Error("FORMULA_PREFIX_CHARS 的正则没捕到引号内内容（Java 侧声明形状变了）");
  }
  return raw.replace(/\\t/gu, "\t").replace(/\\r/gu, "\r").replace(/\\n/gu, "\n");
}

describe("csvCell：公式注入中和（首字符集）", () => {
  it.each([
    ["=", "公式起始符", "'=cmd|'/c calc'!A0"],
    ["+", "算术/URL 拼接公式", "'+cmd|'/c calc'!A0"],
    ["-", "负数也算公式（刻意取舍：宁可看见前导引号）", "'-cmd|'/c calc'!A0"],
    ["@", "部分本地化下的公式前缀", "'@cmd|'/c calc'!A0"],
    ["\t", "制表符：某些解析器当分隔符，剥引号后重曝公式", "'\tcmd|'/c calc'!A0"],
    // CR 同时命中两条规则：中和之后这一格里还有 CR ⇒ 必须再被 RFC 4180 包裹（后端同形态）
    ["\r", "CR：同上，且触发结构包裹", '"\'\\rcmd|\'/c calc\'!A0"'],
  ])("首字符 %s（%s）必须被前置单引号中和", (prefix, _why, expected) => {
    const payload = `${prefix}cmd|'/c calc'!A0`;
    const out = csvCell(payload);
    // 判点①：中和前缀确实加上了（去掉产品码里的前置 ' 就红）
    expect(out.replace(/^"/u, "").replace(/\r/gu, "\\r")).toContain("'");
    // 判点②：整格形态逐字钉住（含 CR 那一格的 RFC 包裹）
    expect(out).toBe(expected.replace(/\\r/u, "\r"));
  });

  it("负数是唯一的例外：-5 导出成 '-5（与后端 String.valueOf 分支同形态）", () => {
    expect(csvCell(-5)).toBe("'-5");
  });

  it("与后端 CsvCellUtil 的字符集逐字符相同（护栏只该有一份规则）", () => {
    const javaChars = javaFormulaPrefixChars();
    // 双向子集 ⇒ 同集合：任一侧私自增删字符都会在这里红
    expect(CSV_FORMULA_PREFIX_CHARS).toBe(javaChars);
    // 再用行为验证一次：Java 侧每个首字符，TS 侧都必须加中和前缀
    for (const ch of Array.from(javaChars)) {
      expect(
        csvCell(`${ch}1`).replace(/^"|"$|/g, "").startsWith("'"),
        `Java 侧首字符 ${JSON.stringify(ch)} 必须同样被中和`,
      ).toBe(true);
    }
  });
});

describe("csvCell：RFC 4180 结构转义", () => {
  it("含逗号 ⇒ 双引号包裹", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
  });

  it("含双引号 ⇒ 包裹并双写", () => {
    expect(csvCell('he said "hi"')).toBe('"he said ""hi"""');
  });

  it("含换行 ⇒ 包裹（LF 与 CR 都算）", () => {
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell("line1\rline2")).toBe('"line1\rline2"');
  });

  it("一条值同时含 \" , 与换行 ⇒ 先双写引号再整体包裹", () => {
    expect(csvCell('a"b,c\nd')).toBe('"a""b,c\nd"');
  });

  it("两条规则同时命中 ⇒ 既中和又包裹，且包裹的是中和之后的串", () => {
    expect(csvCell('=a,"b"')).toBe("\"'=a,\"\"b\"\"\"");
  });

  it("null / undefined / 空串渲染为空（不写出 null 字面量，也不抛）", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
    expect(csvCell("")).toBe("");
  });
});

describe("csvCell：正常值必须一字不改", () => {
  it.each([
    "admin",
    "2026-10-31 21:42:04",
    "昵称里有中文（全角）",
    "a=b",
    "10.0.0.8",
    "/v1/admin/login",
    "GET",
  ])("%s 原样透出", (value) => {
    expect(csvCell(value)).toBe(value);
  });

  it("中间出现 = 不是公式（只有首字符才算），数字 5 也不带符号 ⇒ 不中和", () => {
    expect(csvCell("key=value")).toBe("key=value");
    expect(csvCell(5)).toBe("5");
    expect(csvCell(true)).toBe("true");
  });
});

describe("csvRow / csvLine / csvDocument：整行与整篇", () => {
  it("csvRow 逐格转义后以逗号连接，且不带行尾", () => {
    expect(csvRow([1, "=x", "a,b", null])).toBe(`1,'=x,"a,b",`);
    expect(csvRow([])).toBe("");
  });

  it("csvLine 追加 CRLF（与后端 CsvCellUtil.line 同形态）", () => {
    expect(csvLine(["a", "b"])).toBe(`a,b${CSV_CRLF}`);
  });

  it("csvDocument = BOM + 每行 CRLF；行尾不是裸 \\n（Excel 口径）", () => {
    const doc = csvDocument([
      ["id", "operator"],
      ["1", '=HYPERLINK("http://evil","点我")'],
    ]);
    expect(doc.startsWith(CSV_BOM)).toBe(true);
    expect(doc.endsWith(CSV_CRLF)).toBe(true);
    expect(doc).toBe(
      `${CSV_BOM}id,operator${CSV_CRLF}1,"'=HYPERLINK(""http://evil"",""点我"")"${CSV_CRLF}`,
    );
  });

  it("空表不产出孤零零的 BOM", () => {
    expect(csvDocument([])).toBe("");
  });

  it("审计日志那一行（真实列序）里不存在任何「未中和的公式单元格」", () => {
    const line = csvRow([
      7,
      "2026-10-31 21:42:04",
      "=cmd|'/c calc'!A0",
      "ADMIN_LOGIN",
      "ACCOUNT",
      "POST",
      200,
      12,
      "+8613800000000",
    ]);
    // 逐格拆开看：每个以危险首字符开头的格子都必须已被 ' 前置
    for (const cell of line.split(",")) {
      expect("=+-@".includes(cell.charAt(0)), `单元格 ${JSON.stringify(cell)} 仍是活公式形态`).toBe(false);
    }
    expect(line).toContain("'=cmd|'/c calc'!A0");
  });
});
