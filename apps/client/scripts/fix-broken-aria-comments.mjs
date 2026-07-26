#!/usr/bin/env node
/**
 * 修复 .vue 文件中错误地放在开标签内部的 `<!-- #ifdef H5 -->` 条件编译注释。
 *
 * 背景：uni-app 的条件编译注释只能用于"元素级"（即包裹整个 <view>...</view>），
 * 不能放在开标签的属性列表内部。错误放置会破坏 Vue 模板解析，导致下游变量
 * 被 vue-tsc 误判为"已声明但未使用"（TS6133）。
 *
 * 修复策略：识别"破碎模式"并删除条件编译注释行，保留其中的 ARIA 属性。
 *
 * 破碎模式示例：
 *   <view
 *     attr="..."
 *     <!-- #ifdef H5 -->
 *     role="button"
 *     aria-label="..."
 *     <!-- #endif -->
 *   >
 *
 * 修复后：
 *   <view
 *     attr="..."
 *     role="button"
 *     aria-label="..."
 *   >
 *
 * 识别依据：当 `<!-- #endif -->` 紧接着一个 `>`（闭合开标签）时，
 * 必然是属性级条件编译（破碎模式）。元素级条件编译的 `<!-- #endif -->`
 * 后面不会紧跟 `>`。
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

function fixFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  let fixCount = 0;

  // 模式 1：多行属性级条件编译
  // 匹配：<!-- #ifdef H5 -->\r?\n ...属性... \r?\n<!-- #endif -->\r?\n[空白]>
  // 替换为：...属性...\r?\n[空白]>
  // 注意：项目使用 CRLF 行尾，正则需兼容 \r\n 与 \n 两种情况
  const pattern1 = /([ \t]*)<!--\s*#ifdef\s+H5\s*-->\r?\n([\s\S]*?)[ \t]*<!--\s*#endif\s*-->\r?\n([ \t]*)>/g;

  let newContent = content.replace(pattern1, (match, indentBefore, middle, indentClose, offset) => {
    fixCount++;
    // 保留中间的 ARIA 属性，去掉条件编译注释行，保留闭合 >
    return `${middle}${indentClose}>`;
  });

  // 模式 2：单行属性级条件编译（罕见，比如 <view attr="..." <!-- #ifdef H5 --> role="button" <!-- #endif -->>
  // 这种情况罕见，暂不处理

  if (fixCount > 0) {
    writeFileSync(filePath, newContent, "utf8");
    fixedFiles.push({ file: relative("d:/6/恋爱小程序/apps/client/src", filePath), count: fixCount });
    totalFixed += fixCount;
  }
}

walk(ROOT);

if (totalFixed === 0) {
  console.log("✅ 未发现需要修复的属性级条件编译注释。");
  process.exit(0);
}

console.log(`✅ 共修复 ${totalFixed} 处属性级条件编译注释，涉及 ${fixedFiles.length} 个文件：\n`);
for (const f of fixedFiles) {
  console.log(`  ${f.file}  (${f.count} 处)`);
}
process.exit(0);
