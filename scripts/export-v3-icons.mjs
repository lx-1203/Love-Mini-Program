#!/usr/bin/env node
/**
 * export-v3-icons.mjs — v3 图标导出（palette #34C98A / #FF6FA3 / #8A9694 / #333333）
 * 读 docs/design/icon-src/*.svg → tabbar PNG(81) + v2 运行态 PNG(96) + 白/品牌色变体。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "docs", "design", "icon-src");
const V2_DIR = path.join(ROOT, "apps", "client", "src", "static", "assets", "icons", "v2");
const TAB_DIR = path.join(ROOT, "apps", "client", "src", "static", "assets", "icons", "tabbar");

const COLOR_NEUTRAL = "#333333";
const COLOR_INACTIVE = "#8A9694";
const COLOR_BRAND = "#34C98A";
const COLOR_LOVE = "#FF6FA3";
const COLOR_WHITE = "#FFFFFF";

function normalize(svg) {
  let out = svg.replace(/<\?xml[^>]*\?>\s*/i, "").replace(/<!--[\s\S]*?-->/g, "").trim();
  out = out.replace(/\s(width|height)="[^"]*"/g, "");
  if (!out.includes("viewBox=")) out = out.replace(/<svg([^>]*)>/, '<svg$1 viewBox="0 0 512 512">');
  if (!out.includes("xmlns=")) out = out.replace(/<svg([^>]*)>/, '<svg$1 xmlns="http://www.w3.org/2000/svg">');
  return out;
}
function colorize(svg, color) {
  return svg
    .replace(/fill="([^"]*)"/g, (m, v) => (v.toLowerCase() === "none" ? m : `fill="${color}"`))
    .replace(/stroke="([^"]*)"/g, (m, v) => (v.toLowerCase() === "none" ? m : `stroke="${color}"`));
}
async function exportPng(svg, outFile, color, size = 81) {
  await sharp(Buffer.from(colorize(normalize(svg), color))).resize(size, size).png().toFile(outFile);
}
function readIcon(name) {
  const f = path.join(SRC, `${name}.svg`);
  return fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
}

const icons = ["discover", "nearby", "heart", "chat", "profile", "star", "x", "search", "more", "back", "plus", "edit", "bell", "sliders", "verify", "online"];
const svgs = {};
for (const n of icons) {
  const raw = readIcon(n);
  if (raw) svgs[n] = normalize(raw);
}

fs.mkdirSync(V2_DIR, { recursive: true });
fs.mkdirSync(TAB_DIR, { recursive: true });

const tabDefs = [
  ["discover.png", "discover", COLOR_INACTIVE],
  ["discover-active.png", "discover", COLOR_BRAND],
  ["nearby.png", "nearby", COLOR_INACTIVE],
  ["nearby-active.png", "nearby", COLOR_BRAND],
  ["chat.png", "chat", COLOR_INACTIVE],
  ["chat-active.png", "chat", COLOR_BRAND],
  ["profile.png", "profile", COLOR_INACTIVE],
  ["profile-active.png", "profile", COLOR_BRAND],
  ["match-heart.png", "heart", COLOR_WHITE],
  ["match-heart-active.png", "heart", COLOR_WHITE],
  ["match-heart-brand.png", "heart", COLOR_BRAND],
];
for (const [file, icon, color] of tabDefs) {
  if (!svgs[icon]) { console.log(`skip ${file} (no ${icon})`); continue; }
  await exportPng(svgs[icon], path.join(TAB_DIR, file), color, 81);
  console.log(`tabbar ✓ ${file}`);
}

const v2Defs = [
  ...icons.map((n) => [`${n}.png`, n, COLOR_NEUTRAL]),
  ["heart-pink.png", "heart", COLOR_LOVE],
  ["heart-white.png", "heart", COLOR_WHITE],
  ["heart-brand.png", "heart", COLOR_BRAND],
  ["chat-white.png", "chat", COLOR_WHITE],
  ["x-white.png", "x", COLOR_WHITE],
  ["x-gray.png", "x", COLOR_INACTIVE],
  ["star-blue.png", "star", "#4D8DFF"],
];
for (const [file, icon, color] of v2Defs) {
  if (!svgs[icon]) { console.log(`skip v2 ${file} (no ${icon})`); continue; }
  await exportPng(svgs[icon], path.join(V2_DIR, file), color, 96);
  console.log(`v2 ✓ ${file}`);
}
console.log("done");
