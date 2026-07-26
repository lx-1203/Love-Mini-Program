#!/usr/bin/env node
/**
 * 检测 .vue 文件中错误地放在开标签内部的 `<!-- #ifdef H5 -->` 条件编译注释。
 *
 * 背景：uni-app 的条件编译注释只能用于"元素级"（即包裹整个 <view>...</view>），
 * 不能放在开标签的属性列表内部。错误放置会破坏 Vue 模板解析，导致下游变量
 * 被 vue-tsc 误判为"已声明但未使用"（TS6133）。
 *
 * 检测思路：
 *   1. 逐行扫描 .vue 文件的 <template> 区域
 *   2. 维护一个"当前是否处于开标签内"的状态
 *   3. 当遇到 `<!-- #ifdef -->` 时，如果当前在开标签内，则报告为问题
 *
 * 输出：列出所有有问题的文件及行号，便于后续修复。
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "d:/6/恋爱小程序/apps/client/src";
const problems = [];

function walk(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      walk(full);
    } else if (entry.endsWith(".vue")) {
      scanFile(full);
    }
  }
}

function scanFile(filePath) {
  const content = readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);

  // 状态机：是否在 <template> 内；是否在开标签内
  let inTemplate = false;
  let inTag = false; // 是否在开标签属性列表内
  let tagStartLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    if (!inTemplate) {
      if (/^<template>/.test(line.trim())) {
        inTemplate = true;
      }
      continue;
    }

    // 在 template 内
    // 检测 <template> 结束
    if (/^<\/template>/.test(line.trim())) {
      inTemplate = false;
      inTag = false;
      continue;
    }

    // 简化检测：当遇到 <标签名（非闭合 </），开始 inTag
    // 但需要排除 <script> <style> <template> 等块级标签
    // 遇到 > 时，如果之前没有遇到 </ ，则结束 inTag
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === "<") {
        // 看下一个字符
        const next = line[j + 1];
        if (next && next !== "/" && next !== "!") {
          // 检查是否是块级标签
          const rest = line.slice(j + 1);
          if (!/^(template|script|style)\b/.test(rest)) {
            inTag = true;
            tagStartLine = lineNum;
          }
        }
      } else if (ch === ">" && inTag) {
        // 关闭当前标签
        inTag = false;
      }
    }

    // 检测条件编译注释
    if (inTag && /<!--\s*#ifdef/.test(line)) {
      problems.push({
        file: relative("d:/6/恋爱小程序/apps/client/src", filePath),
        line: lineNum,
        content: line.trim(),
        tagStartLine,
      });
    }
  }
}

walk(ROOT);

if (problems.length === 0) {
  console.log("✅ 未发现开标签内部条件编译注释问题。");
  process.exit(0);
}

console.log(`❌ 发现 ${problems.length} 处开标签内部条件编译注释问题：\n`);
for (const p of problems) {
  console.log(`  ${p.file}:${p.line}  ${p.content}`);
}
process.exit(1);
