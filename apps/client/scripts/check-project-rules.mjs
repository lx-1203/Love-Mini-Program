#!/usr/bin/env node
/**
 * check-project-rules.mjs — 项目硬约束合规扫描（R11 Phase1 §1.4）
 *
 * 规则（来源：项目工程规范）：
 *  R1 [error] mp-weixin 禁用 :hover（<style> 内）
 *  R2 [error] mp-weixin 禁用 display:grid
 *  R3 [error] 禁用可选 catch 绑定（catch {）
 *  R4 [error] 组件内禁 import.meta.env.DEV（仅 config/env.ts 允许）
 *  R5 [warn]  业务组件禁 emoji 图标（<template> 内 emoji 字符；注释/文案不算）
 *  R6 [warn]  页面样式硬编码 hex（var(--token, #hex) 兜底写法不算）
 *  R7 [error] 模板内硬编码 /static/ 图片路径（须走 IMAGE_PATHS）
 *  R8 [error] backdrop-filter 未用 #ifdef H5 包裹
 *
 * 退出码：error>0 → 1（fail-fast）；仅 warn → 0。
 * 白名单：精确路径，注释写明理由。
 */
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, "../src");
const SKIP = /node_modules|dist|uni_modules|\.d\.ts$/;
// tests/ 目录豁免：测试运行于 Node（vitest），不是 mp-weixin 运行时代码，
// 可选 catch 绑定（catch {}）等基础库兼容性约束对其不适用，故整目录跳过扫描。
const TESTS_SKIP = /(^|[\\/])tests([\\/]|$)/;

const errors = [];
const warns = [];
const files = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (!SKIP.test(p) && !TESTS_SKIP.test(p)) walk(p);
      continue;
    }
    if (/\.(vue|ts|js|scss|css)$/.test(name)) files.push(p);
  }
}
walk(SRC);

const rel = (p) => path.relative(SRC, p);

/** 提取 <template> / <style> 片段 */
function sections(src) {
  const t = src.match(/<template>([\s\S]*)<\/template>/);
  const styles = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join("\n");
  return { template: t ? t[1] : "", style: styles };
}

const EMOJI_RE =
  /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

for (const file of files) {
  const r = rel(file);
  const src = fs.readFileSync(file, "utf8");
  const isVue = file.endsWith(".vue");
  const isConfig = /config[\\/]env\.ts$/.test(file) || /config[\\/]identity\.ts$/.test(file);
  const { template, style } = isVue ? sections(src) : { template: "", style: "" };

  // R1 :hover（样式内；组件库/第三方豁免清单）
  if (isVue && /[^-\w]:hover\b/.test(style)) {
    errors.push(`R1 [hover] ${r}: <style> 内使用 :hover（mp-weixin 无效，改 hover-class）`);
  }

  // R2 display:grid
  if (/display:\s*grid/.test(src) && !isConfig) {
    errors.push(`R2 [grid] ${r}: 使用 display:grid（mp-weixin 部分基础库不支持，改 flex）`);
  }

  // R3 可选 catch
  if (/\bcatch\s*\{/.test(src)) {
    errors.push(`R3 [catch] ${r}: 使用可选 catch 绑定 catch {}（需兼容目标基础库，改 catch (e)）`);
  }

  // R4 import.meta.env.DEV 进组件
  if (isVue && /import\.meta\.env\.DEV/.test(src)) {
    errors.push(`R4 [envDEV] ${r}: 组件内使用 import.meta.env.DEV（mp-weixin 不支持，走 config/env.ts）`);
  }

  // R5 template 内 emoji（仅 components/ 业务组件；排除注释）
  if (isVue && /components[\\/]/.test(r)) {
    const tplNoComment = template.replace(/<!--[\s\S]*?-->/g, "");
    if (EMOJI_RE.test(tplNoComment)) {
      warns.push(`R5 [emoji] ${r}: <template> 内出现 emoji 字符（mp-weixin 禁 emoji 图标，改 SVG/图片）`);
    }
  }

  // R6 页面样式硬编码 hex（var(--token, #hex) 兜底除外）
  if (isVue && style) {
    const bare = style.replace(/var\([^)]*\)/g, ""); // 去掉 var(...) 兜底
    const hits = bare.match(/#[0-9a-fA-F]{3,8}\b/g);
    if (hits && hits.length > 0) {
      warns.push(`R6 [hex] ${r}: 样式存在 ${hits.length} 处非 token 兜底的硬编码色值（如 ${hits[0]}）`);
    }
  }

  // R7 模板内硬编码 /static/ 图片路径
  if (isVue && /src="\/static\//.test(template)) {
    errors.push(`R7 [static] ${r}: <template> 内硬编码 /static/ 路径（须走 IMAGE_PATHS 常量）`);
  }

  // R8 backdrop-filter 未条件编译
  if (isVue && /backdrop-filter/.test(src) && !/#ifdef\s+H5[\s\S]{0,400}?backdrop-filter/.test(src)) {
    errors.push(`R8 [backdrop] ${r}: backdrop-filter 未包 #ifdef H5（mp-weixin 不支持）`);
  }
}

for (const w of warns) console.log(`[warn] ${w}`);
for (const e of errors) console.error(`[error] ${e}`);
console.log(
  `\ncheck-project-rules: ${files.length} files, ${errors.length} errors, ${warns.length} warns` +
    (errors.length ? " → FAIL" : " → PASS")
);
process.exit(errors.length ? 1 : 0);
