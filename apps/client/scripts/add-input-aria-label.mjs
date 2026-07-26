#!/usr/bin/env node
/**
 * 为缺少 aria-label 的 input/textarea 元素补充 aria-label 属性。
 *
 * 策略：
 *   1. 解析整个开标签（支持单行 / 多行）
 *   2. 已有 aria-label 的不重复添加
 *   3. 取值规则：
 *      - 静态 placeholder="xxx" -> aria-label="xxx"
 *      - 动态 :placeholder="expr" -> :aria-label="expr"
 *      - 无 placeholder -> 跳过（避免错误猜测语义）
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "d:/6/恋爱小程序/apps/client/src";
let totalFixed = 0;
const fixedFiles = [];

function walk(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
    } else if (entry.endsWith(".vue")) {
      fixFile(full);
    }
  }
}

/**
 * 解析开标签：从 <tag 开始，找到匹配的 > 或 />，跳过引号内的字符
 * 返回 { tag, attrs, close, full } 或 null
 */
function parseOpenTag(content, startIndex) {
  // content[startIndex] 应为 '<'
  let i = startIndex + 1;
  // 读取标签名
  const tagMatch = content.slice(i).match(/^(input|textarea)\b/);
  if (!tagMatch) return null;
  const tag = tagMatch[1];
  i += tagMatch[0].length;

  // 扫描属性直到 > 或 />，跳过引号内字符
  let attrs = "";
  while (i < content.length) {
    const ch = content[i];
    if (ch === '"' || ch === "'") {
      // 引号字符串，整体跳过
      const quote = ch;
      attrs += ch;
      i++;
      while (i < content.length && content[i] !== quote) {
        attrs += content[i];
        i++;
      }
      if (i < content.length) {
        attrs += content[i]; // 闭合引号
        i++;
      }
    } else if (ch === ">") {
      // 标签结束
      return { tag, attrs, close: ">", end: i + 1 };
    } else if (ch === "/" && content[i + 1] === ">") {
      // 自闭合
      return { tag, attrs, close: "/>", end: i + 2 };
    } else {
      attrs += ch;
      i++;
    }
  }
  return null;
}

function fixFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  let fixCount = 0;
  let result = "";
  let i = 0;

  while (i < content.length) {
    if (content[i] === "<" && (content.slice(i, i + 6) === "<input" || content.slice(i, i + 9) === "<textarea")) {
      const parsed = parseOpenTag(content, i);
      if (!parsed) {
        result += content[i];
        i++;
        continue;
      }

      // 检查是否已有 aria-label
      if (/\baria-label=/.test(parsed.attrs)) {
        result += content.slice(i, parsed.end);
        i = parsed.end;
        continue;
      }

      // 提取 placeholder
      const staticPlaceholder = parsed.attrs.match(/\bplaceholder="([^"]*)"/);
      const dynamicPlaceholder = parsed.attrs.match(/:placeholder="([^"]*)"/);

      let ariaLabelAttr = null;
      if (staticPlaceholder) {
        ariaLabelAttr = `aria-label="${staticPlaceholder[1]}"`;
      } else if (dynamicPlaceholder) {
        ariaLabelAttr = `:aria-label="${dynamicPlaceholder[1]}"`;
      } else {
        result += content.slice(i, parsed.end);
        i = parsed.end;
        continue;
      }

      fixCount++;
      // 在 close 之前插入 aria-label
      // attrs 末尾的空白保留在 attrs 中，aria-label 直接附在最后一个非空白字符后
      const trimmedAttrs = parsed.attrs.replace(/\s+$/, "");
      const trailingWhitespace = parsed.attrs.slice(trimmedAttrs.length);
      result += `<${parsed.tag}${trimmedAttrs} ${ariaLabelAttr}${trailingWhitespace}${parsed.close}`;
      i = parsed.end;
    } else {
      result += content[i];
      i++;
    }
  }

  if (fixCount > 0) {
    writeFileSync(filePath, result, "utf8");
    fixedFiles.push({ file: relative("d:/6/恋爱小程序/apps/client/src", filePath), count: fixCount });
    totalFixed += fixCount;
  }
}

walk(ROOT);

if (totalFixed === 0) {
  console.log("✅ 未发现需要补充 aria-label 的 input/textarea。");
  process.exit(0);
}

console.log(`✅ 共为 ${totalFixed} 个 input/textarea 补充 aria-label，涉及 ${fixedFiles.length} 个文件：\n`);
for (const f of fixedFiles) {
  console.log(`  ${f.file}  (${f.count} 处)`);
}
process.exit(0);
