#!/usr/bin/env node
/**
 * 为加载状态容器批量添加无障碍属性（role="status" aria-live="polite"）。
 *
 * 策略：
 *   识别包含 loading-spinner / load-more / loading-state 等类名的容器 view，
 *   为这些容器添加 role="status" aria-live="polite"，便于屏幕阅读器播报加载状态。
 *
 * 已存在的 role 属性不重复添加（避免重复）。
 *
 * 注意：仅处理"明确为加载状态"的容器，不修改其他 view。
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "d:/6/恋爱小程序/apps/client/src";
let totalFixed = 0;
const fixedFiles = [];

// 加载状态容器的类名特征
const LOADING_CONTAINER_CLASSES = [
  "load-more",
  "loading-more",
  "loading-state",
  "campus-state",
  "comments-loading",
  "history-loading",
];

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

  // 模式 1：`<view class="loading-spinner" />` 单独的加载图标，补充 aria-label
  // 注意：这种情况下加载文案在兄弟节点，给 spinner 自身加 role 即可
  newContent = newContent.replace(
    /(<view\s+class="loading-spinner[^"]*"\s*)(?:\/>|>)(?![^]*?role=)/g,
    (match, prefix) => {
      // 仅当同行未包含 role= 时才添加
      if (/role=/.test(prefix)) return match;
      fixCount++;
      const isSelfClose = match.trim().endsWith("/>");
      return `${prefix}role="status" aria-live="polite" aria-label="加载中"${isSelfClose ? " />" : ">"}`;
    }
  );

  // 模式 2：包裹加载状态的容器（如 <view v-if="isLoadingMore" class="load-more">）
  // 为这些容器补充 role="status" aria-live="polite"
  for (const cls of LOADING_CONTAINER_CLASSES) {
    const pattern = new RegExp(
      `(<view\\b[^>]*\\bclass="${cls}"[^>]*?)(\\s*>)`,
      "g"
    );
    newContent = newContent.replace(pattern, (match, prefix, close) => {
      // 跳过已有 role= 的容器
      if (/role=/.test(prefix)) return match;
      fixCount++;
      return `${prefix} role="status" aria-live="polite"${close}`;
    });
  }

  if (fixCount > 0) {
    writeFileSync(filePath, newContent, "utf8");
    fixedFiles.push({ file: relative("d:/6/恋爱小程序/apps/client/src", filePath), count: fixCount });
    totalFixed += fixCount;
  }
}

walk(ROOT);

if (totalFixed === 0) {
  console.log("✅ 未发现需要补充无障碍属性的加载状态。");
  process.exit(0);
}

console.log(`✅ 共为 ${totalFixed} 处加载状态补充无障碍属性，涉及 ${fixedFiles.length} 个文件：\n`);
for (const f of fixedFiles) {
  console.log(`  ${f.file}  (${f.count} 处)`);
}
process.exit(0);
