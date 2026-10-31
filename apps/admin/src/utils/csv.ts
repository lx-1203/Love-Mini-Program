/**
 * CSV 单元格安全化（前端侧唯一实现，与后端 `CsvCellUtil.java` 同口径）。
 *
 * 为什么前端也要有一份（P2 修复，2026-10-31）：后台有两条写 CSV 的路径——
 * 1. **服务端产文件流**（活动报名 `exportEnrollments`、兑换码 `exportPromoCodes`），
 *    这两条由 `apps/api/.../utils/CsvCellUtil.java` 逐格加工，前端只是把字节落盘；
 * 2. **浏览器现拼**（`views/system/AuditLogs.vue` 的 exportCsv：把当前页日志
 *    在客户端 join 成 text/csv 再 Blob 下载）。
 *    本工具就是把第 2 条也接到与第 1 条相同的规则上——此前它只有 RFC 4180 引号转义，
 *    而**引号救不了公式注入**：Excel/WPS 会先把包裹的引号剥掉还原成 `=cmd|...`，
 *    再按公式执行。审计日志里的 `operatorUsername` / `operation` / `ip` 都是
 *    用户或上游系统可控字符串（注册接口不限制昵称首字符），于是
 *    「昵称 = `=HYPERLINK(...)` 的管理员」能把一条公式写进下一份审计导出。
 *
 * 两条规则互相独立、必须同时生效（与 Java 版逐字对齐，改一处要改两处）：
 * 1. **公式中和**：首字符 ∈ `= + - @ \t \r` 时前置单引号 `'`。
 *    代价是「负数」导出形态变成 `'-5`——这是刻意的取舍，宁可看见前导引号也不给公式留门。
 * 2. **RFC 4180 结构转义**：含 `,` `"` CR LF 时用双引号包裹，内部双引号双写。
 *
 * 只作用于渲染：不改数据本身，转义发生在写文件的最后一米。
 */

/** RFC 4180 行分隔符（CRLF） */
export const CSV_CRLF = "\r\n";

/** UTF-8 BOM：Excel 直接打开中文表头不乱码（与后端 CsvCellUtil.BOM 同值） */
export const CSV_BOM = "\uFEFF";

/**
 * 公式注入危险首字符集（与 CsvCellUtil.FORMULA_PREFIX_CHARS 同集合，导出供判点对账）：
 * `=` 公式、`+`/`-` 算术公式、`@` 某些本地化下的公式前缀、
 * `\t` 与 `\r`（部分解析器当分隔符，且 Excel 剥离引号后会重新暴露公式首字符）。
 */
export const CSV_FORMULA_PREFIX_CHARS = "=+-@\t\r";

/** 中和前缀：单引号让电子表格把该格当纯文本 */
const NEUTRALISING_PREFIX = "'";

/**
 * 单个 CSV 单元格：公式中和 + RFC 4180 转义（写出 CSV 前唯一允许的字符串处理入口）。
 *
 * @param value 原始值（string/number/boolean/null/undefined）；null/undefined 渲染为空串
 * @returns 可安全写入 CSV 的单元格文本
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  // 与 Java 版 String.valueOf 同口径：非字符串先转串，因此 -5 这类负数同样被中和
  const raw = typeof value === "string" ? value : String(value);
  if (raw === "") return "";
  const guarded =
    CSV_FORMULA_PREFIX_CHARS.indexOf(raw.charAt(0)) >= 0 ? NEUTRALISING_PREFIX + raw : raw;
  if (
    guarded.indexOf(",") >= 0 ||
    guarded.indexOf('"') >= 0 ||
    guarded.indexOf("\n") >= 0 ||
    guarded.indexOf("\r") >= 0
  ) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

/**
 * 一行（逐格走 {@link csvCell}，逗号连接，**不含**行尾符）。
 * 调用方无法「漏掉」某一列：转义是内置的。
 *
 * @param values 单元格值列表
 * @returns 一行 CSV 文本
 */
export function csvRow(values: readonly unknown[]): string {
  return values.map((value) => csvCell(value)).join(",");
}

/**
 * 一行并追加 CRLF 行尾（表头与数据行都推荐用它）。
 *
 * @param values 单元格值列表
 * @returns 以 {@link CSV_CRLF} 结尾的一行 CSV 文本
 */
export function csvLine(values: readonly unknown[]): string {
  return `${csvRow(values)}${CSV_CRLF}`;
}

/**
 * 整份 CSV 文档：`BOM + 各行以 CRLF 连接 + 末行 CRLF`（与后端三个导出场景同形态）。
 *
 * @param rows 行数组（第一行通常是表头）
 * @returns 可直接喂给 `new Blob([text], { type: "text/csv;charset=utf-8" })` 的文本
 */
export function csvDocument(rows: readonly (readonly unknown[])[]): string {
  if (rows.length === 0) return "";
  return CSV_BOM + rows.map((row) => csvLine(row)).join("");
}
