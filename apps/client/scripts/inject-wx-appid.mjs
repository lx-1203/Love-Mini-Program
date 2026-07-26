/**
 * 微信小程序 AppID 占位符注入脚本
 *
 * 用途：
 *   微信小程序 manifest.json 中的 mp-weixin.appid 字段需要真实 AppID 才能上传/审核。
 *   本项目将 AppID 占位符 __WX_APPID_PLACEHOLDER__ 写入 manifest.json，
 *   构建时通过此脚本读取环境变量 WX_APPID 并替换占位符，
 *   避免 AppID 提交到代码仓库造成泄露。
 *
 * 使用方式：
 *   1. 开发：pnpm run build:mp-weixin（不替换占位符，使用占位符值，微信开发者工具会用游客模式）
 *   2. 体验版/正式版：WX_APPID=wx1234567890abcdef pnpm run build:mp-weixin:real
 *
 * 环境变量：
 *   - WX_APPID: 微信小程序 AppID（必填，构建真实版本时）
 *
 * 退出码：
 *   0 - 成功（或未设置 WX_APPID，跳过替换）
 *   1 - 替换失败（文件不存在/写入失败）
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(__dirname, "../src/manifest.json");
const PLACEHOLDER = "__WX_APPID_PLACEHOLDER__";

const wxAppid = process.env.WX_APPID;

if (!wxAppid) {
  console.log("[inject-wx-appid] 未设置 WX_APPID 环境变量，跳过 AppID 替换。");
  console.log("[inject-wx-appid] 提示：构建真实版本时请设置 WX_APPID 环境变量。");
  process.exit(0);
}

// 简单的 AppID 格式校验（微信小程序 AppID 通常为 18 位字符，wx 开头）
if (!/^wx[0-9a-f]{16}$/i.test(wxAppid)) {
  console.warn(`[inject-wx-appid] 警告：WX_APPID 格式可能不正确（${wxAppid}），期望格式 wx + 16位十六进制字符。`);
}

if (!existsSync(manifestPath)) {
  console.error(`[inject-wx-appid] 错误：manifest.json 不存在 (${manifestPath})`);
  process.exit(1);
}

try {
  const content = readFileSync(manifestPath, "utf8");
  if (!content.includes(PLACEHOLDER)) {
    console.log(`[inject-wx-appid] manifest.json 中未发现占位符 ${PLACEHOLDER}，跳过替换。`);
    process.exit(0);
  }
  const updated = content.replace(new RegExp(PLACEHOLDER, "g"), wxAppid);
  writeFileSync(manifestPath, updated, "utf8");
  console.log(`[inject-wx-appid] 成功替换 AppID 占位符为 ${wxAppid}`);
  process.exit(0);
} catch (error) {
  console.error(`[inject-wx-appid] 替换失败：`, error);
  process.exit(1);
}
