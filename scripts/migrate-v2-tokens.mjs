#!/usr/bin/env node
/**
 * migrate-v2-tokens.mjs — 「寻觅」v2 Token 迁移（一次性/可重跑）
 *
 * 将 v1 纯匹配版色值升级为 v2 规范（素材/2.0/xunmi_redesign_v2/DESIGN_GUIDE.md）：
 *   背景 #F7F9F8 · 品牌绿 #34C98F · 深绿 #159C6C · 心动粉 #F35C9D
 *   消息蓝 #4D8DFF（不变）· 主文字 #20242A · 次文字 #7A838D · 分隔线 #E9EDF0
 *
 * 覆盖范围：apps/client/src、apps/admin/src、apps/client/src/pages.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const HEX_MAP = {
  "#3FCF8E": "#34C98F", // 旧品牌 → v2 品牌绿
  "#34C38F": "#34C98F", // v1 品牌 → v2 品牌绿
  "#FF5D9E": "#F35C9D", // v1 心动粉 → v2 心动粉
  "#F7FAF9": "#F7F9F8", // v1 背景 → v2 背景
  "#2DB97A": "#3ECB97", // brand-400
  "#25A86C": "#159C6C", // brand-600 → v2 深绿
  "#1D8A5A": "#12805A", // brand-700
  "#15744A": "#0F6848", // brand-800
  "#0D5E3A": "#0B5038", // brand-900
  "#E8F8F0": "#E6F8F1", // brand-50
  "#D1F0E0": "#CCF0E0", // brand-100 / bg-secondary
  "#A3E0C0": "#A5E2C6", // brand-200 / secondary-200
  "#7CD9A6": "#6FD4AA", // brand-300 / secondary-400
  "#7A7A7A": "#7A838D", // 次文字
  "#222222": "#20242A", // 主文字
  "#EEF2F1": "#E9EDF0", // 分隔线
};

// rgba/rgb 三元组变体（对应四个主色，容忍空格差异）
const RGB_MAP = [
  { re: /rgba?\(\s*52\s*,\s*195\s*,\s*143\s*(?:,\s*([\d.]+)\s*)?\)/gi, repl: (m, a) => (a ? `rgba(52, 201, 143, ${a})` : "rgb(52, 201, 143)") },
  { re: /rgba?\(\s*63\s*,\s*207\s*,\s*142\s*(?:,\s*([\d.]+)\s*)?\)/gi, repl: (m, a) => (a ? `rgba(52, 201, 143, ${a})` : "rgb(52, 201, 143)") },
  { re: /rgba?\(\s*255\s*,\s*93\s*,\s*158\s*(?:,\s*([\d.]+)\s*)?\)/gi, repl: (m, a) => (a ? `rgba(243, 92, 157, ${a})` : "rgb(243, 92, 157)") },
  { re: /rgba?\(\s*247\s*,\s*250\s*,\s*249\s*(?:,\s*([\d.]+)\s*)?\)/gi, repl: (m, a) => (a ? `rgba(247, 249, 248, ${a})` : "rgb(247, 249, 248)") },
];

const roots = [
  path.join(ROOT, "apps", "client", "src"),
  path.join(ROOT, "apps", "admin", "src"),
  path.join(ROOT, "apps", "client", "src", "pages.json"),
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!["node_modules", "dist", ".git"].includes(entry.name)) walk(full, out);
    } else if (/\.(vue|ts|js|json|scss|css|wxml|wxss)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

let totalFiles = 0;
let totalChanges = 0;
for (const root of roots) {
  const files = fs.existsSync(root) && fs.statSync(root).isDirectory() ? walk(root) : (fs.existsSync(root) ? [root] : []);
  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    const before = content;
    for (const [hex, to] of Object.entries(HEX_MAP)) {
      content = content.replace(new RegExp(hex.replace("#", "\\#"), "gi"), to);
    }
    for (const { re, repl } of RGB_MAP) {
      content = content.replace(re, repl);
    }
    if (content !== before) {
      fs.writeFileSync(file, content, "utf8");
      totalFiles++;
      totalChanges += (before.match(/#/g) || []).length; // 粗略计数
    }
  }
}
console.log(`[migrate-v2-tokens] 更新文件数: ${totalFiles}`);

