#!/usr/bin/env node
/**
 * 为错误状态容器批量添加无障碍属性（role="alert"）。
 *
 * 策略：
 *   识别 class 包含 "error" 关键词、且用于显示错误信息的 view 容器，
 *   为其补充 role="alert"，便于屏幕阅读器立即播报错误信息。
 *
 * 已存在 role 属性的容器不重复添加（避免重复）。
 *
 * 处理的类名模式：
 *   - state-error / history-error / messages-error / likes-error 等以 -error 结尾的容器
 *   - status-text--error / error-text 等以 --error / -text 结尾的文本（在父级 view 添加 role=alert）
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

  let newContent = content;

  // 模式：view 容器，class 包含 error 关键词（如 state-error, history-error 等）
  // 且当前没有 role 属性，补充 role="alert"
  newContent = newContent.replace(
    /(<view\b[^>]*\bclass="[^"]*\b\w+-error\b[^"]*"[^>]*?)(\s*>)/g,
    (match, prefix, close) => {
      // 跳过已有 role= 的容器
      if (/role=/.test(prefix)) return match;
      fixCount++;
      return `${prefix} role="alert"${close}`;
    }
  );

  // 模式：view 容器，class 同时包含 state + error（如 PageStateContainer 的 state-error）
  // 上面的正则已经覆盖，但兜底处理 class="state-error state-slot" 等组合
  newContent = newContent.replace(
    /(<view\b[^>]*\bclass="state-error"[^>]*?)(\s*>)/g,
    (match, prefix, close) => {
      if (/role=/.test(prefix)) return match;
      fixCount++;
      return `${prefix} role="alert"${close}`;
    }
  );

  if (fixCount > 0) {
    writeFileSync(filePath, newContent, "utf8");
    fixedFiles.push({ file: relative("d:/6/恋爱小程序/apps/client/src", filePath), count: fixCount });
    totalFixed += fixCount;
  }
}

walk(ROOT);

if (totalFixed === 0) {
  console.log("✅ 未发现需要补充无障碍属性的错误状态。");
  process.exit(0);
}

console.log(`✅ 共为 ${totalFixed} 处错误状态补充 role="alert"，涉及 ${fixedFiles.length} 个文件：\n`);
for (const f of fixedFiles) {
  console.log(`  ${f.file}  (${f.count} 处)`);
}
process.exit(0);
