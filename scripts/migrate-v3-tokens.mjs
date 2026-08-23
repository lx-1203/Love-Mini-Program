#!/usr/bin/env node
/**
 * migrate-v3-tokens.mjs — 「寻觅」v3 Token 迁移（一次性/可重跑）
 *
 * v2 → v3（docs/design/v3.1-contract.md §1/§2）：
 *   主文字 #333333 · 次文字 #8A9694 · 分隔线 #E8EEEE
 *   Primary #34C98A · Love #FF6FA3 · brand-600 #22A976 · 背景 #F7FAF9
 * 覆盖：apps/client/src、apps/admin/src。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const HEX_MAP = {
  "#34C98F": "#34C98A", // v2 primary → v3 primary
  "#F35C9D": "#FF6FA3", // v2 love → v3 love
  "#20242A": "#333333", // v2 主文字 → v3 主文字
  "#7A838D": "#8A9694", // v2 次文字 → v3 次文字
  "#E9EDF0": "#E8EEEE", // v2 分隔线 → v3 分隔线
  "#159C6C": "#22A976", // v2 brand-600 → v3 brand-600
  "#F7F9F8": "#F7FAF9", // v2 背景 → v3 背景
};

const RGB_MAP = [
  { re: /rgba?\(\s*52\s*,\s*201\s*,\s*143\s*(?:,\s*([\d.]+)\s*)?\)/gi, repl: (m, a) => (a ? `rgba(52, 201, 138, ${a})` : "rgb(52, 201, 138)") },
  { re: /rgba?\(\s*243\s*,\s*92\s*,\s*157\s*(?:,\s*([\d.]+)\s*)?\)/gi, repl: (m, a) => (a ? `rgba(255, 111, 163, ${a})` : "rgb(255, 111, 163)") },
  { re: /rgba?\(\s*32\s*,\s*36\s*,\s*42\s*(?:,\s*([\d.]+)\s*)?\)/gi, repl: (m, a) => (a ? `rgba(51, 51, 51, ${a})` : "rgb(51, 51, 51)") },
  { re: /rgba?\(\s*122\s*,\s*131\s*,\s*141\s*(?:,\s*([\d.]+)\s*)?\)/gi, repl: (m, a) => (a ? `rgba(138, 150, 148, ${a})` : "rgb(138, 150, 148)") },
  { re: /rgba?\(\s*233\s*,\s*237\s*,\s*240\s*(?:,\s*([\d.]+)\s*)?\)/gi, repl: (m, a) => (a ? `rgba(232, 238, 238, ${a})` : "rgb(232, 238, 238)") },
  { re: /rgba?\(\s*21\s*,\s*156\s*,\s*108\s*(?:,\s*([\d.]+)\s*)?\)/gi, repl: (m, a) => (a ? `rgba(34, 169, 118, ${a})` : "rgb(34, 169, 118)") },
  { re: /rgba?\(\s*247\s*,\s*249\s*,\s*248\s*(?:,\s*([\d.]+)\s*)?\)/gi, repl: (m, a) => (a ? `rgba(247, 250, 249, ${a})` : "rgb(247, 250, 249)") },
];

const roots = [path.join(ROOT, "apps", "client", "src"), path.join(ROOT, "apps", "admin", "src")];

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
for (const root of roots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
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
    }
  }
}
console.log(`[migrate-v3-tokens] 更新文件数: ${totalFiles}`);
