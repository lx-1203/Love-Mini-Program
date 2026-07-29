// Task 28: 扫描 apps/client/src 中剩余的非注释中文硬编码
// 排除：zh-CN.ts、en-US.ts、注释（单行、块、HTML）
// 排除：已抽取的 $t() / t() 调用中的字符串字面量
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..", "..", "..", "apps", "client", "src");
const SKIP_FILES = new Set(["zh-CN.ts", "en-US.ts"]);

/**
 * 移除单行注释、块注释、HTML 注释
 */
function stripComments(code) {
  let out = "";
  let i = 0;
  let n = code.length;
  while (i < n) {
    const c = code[i];
    const next = code[i + 1];
    // 块注释 /* */
    if (c === "/" && next === "*") {
      let j = i + 2;
      while (j < n && !(code[j] === "*" && code[j + 1] === "/")) j++;
      i = j + 2;
      continue;
    }
    // 单行注释 //
    if (c === "/" && next === "/") {
      let j = i + 2;
      while (j < n && code[j] !== "\n") j++;
      i = j;
      continue;
    }
    // HTML 注释 <!-- -->
    if (c === "<" && next === "!" && code[i + 2] === "-" && code[i + 3] === "-") {
      let j = i + 4;
      while (j < n && !(code[j] === "-" && code[j + 1] === "-" && code[j + 2] === ">")) j++;
      i = j + 3;
      continue;
    }
    // 字符串字面量（保留，因为可能含中文硬编码）
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      out += c;
      i++;
      while (i < n) {
        if (code[i] === "\\" && i + 1 < n) {
          out += code[i] + code[i + 1];
          i += 2;
          continue;
        }
        if (code[i] === quote) {
          out += code[i];
          i++;
          break;
        }
        out += code[i];
        i++;
      }
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * 移除已存在的 t() / $t() 调用：把里面的字符串字面量替换为空字符串
 * 简化版：检测 t('...') / $t('...')，将参数字符串置空
 */
function stripI18nCalls(code) {
  // 移除 $t('xxx') 或 t('xxx') 调用中的字符串字面量
  return code.replace(/(\$?t)\s*\(\s*['"`][^'"`]*['"`]/g, (m) =>
    m.replace(/['"`][^'"`]*['"`]/, '""')
  );
}

const results = [];

function scanFile(filePath) {
  const ext = path.extname(filePath);
  if (![".vue", ".ts"].includes(ext)) return;
  const fileName = path.basename(filePath);
  if (SKIP_FILES.has(fileName)) return;

  const content = fs.readFileSync(filePath, "utf-8");
  // 仅保留代码（去注释）
  const stripped = stripComments(content);
  // 移除 t()/&t() 调用中的字符串参数
  const withoutI18n = stripI18nCalls(stripped);

  const lines = withoutI18n.split("\n");
  lines.forEach((line, idx) => {
    // 忽略 import / require / console 语句中的中文（开发日志）
    if (/^\s*(import|export|require|console\.)/.test(line)) return;
    // 检测中文字符
    const m = line.match(/[\u4e00-\u9fa5]/);
    if (m) {
      // 排除纯注释行（已通过 stripComments 处理，但保留双斜杠开头的代码行如 `url: "/api/中文"`）
      results.push({
        file: path.relative(ROOT, filePath),
        line: idx + 1,
        text: line.trim().slice(0, 200),
      });
    }
  });
}

function walk(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else {
      scanFile(full);
    }
  }
}

walk(ROOT);

// 按文件分组输出
const byFile = {};
results.forEach((r) => {
  if (!byFile[r.file]) byFile[r.file] = [];
  byFile[r.file].push(r);
});

let output = "";
output += `=== 扫描结果：共 ${results.length} 处疑似中文硬编码，分布在 ${Object.keys(byFile).length} 个文件 ===\n`;
Object.keys(byFile)
  .sort()
  .forEach((file) => {
    output += `\n--- ${file} (${byFile[file].length} 处) ---\n`;
    byFile[file].slice(0, 50).forEach((r) => {
      output += `  L${r.line}: ${r.text}\n`;
    });
    if (byFile[file].length > 50) {
      output += `  ... 还有 ${byFile[file].length - 50} 处\n`;
    }
  });

output += `\n=== Top 15 文件（按硬编码数量） ===\n`;
Object.entries(byFile)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 15)
  .forEach(([file, items]) => {
    output += `  ${file}: ${items.length} 处\n`;
  });

const outPath = path.resolve(__dirname, "scan-remaining-output.txt");
fs.writeFileSync(outPath, output, "utf-8");
console.log(`扫描完成，结果已写入: ${outPath}`);
console.log(`共 ${results.length} 处疑似中文硬编码，分布在 ${Object.keys(byFile).length} 个文件`);
