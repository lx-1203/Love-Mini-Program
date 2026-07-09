/**
 * 下载 Phase B 缺失图片 - 使用 picsum.photos 的 seed 参数
 * 补齐 posts/post-1~8, activities/activity-4~6, banners/home-banner, avatars/avatar-9~12
 * 每张图片使用不同 seed 确保内容不同（MD5 唯一）
 */
import { writeFileSync, mkdirSync, existsSync, statSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import https from "https";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const STATIC_DIR = resolve(__dirname, "..", "src", "static", "assets");

const IMAGE_CONFIGS = [
  // posts/ post-1~8
  { subdir: "images/posts", filename: "post-1.jpg", seed: "love-post-campus-101", dims: "800/600" },
  { subdir: "images/posts", filename: "post-2.jpg", seed: "love-post-cafe-102", dims: "800/600" },
  { subdir: "images/posts", filename: "post-3.jpg", seed: "love-post-lake-103", dims: "800/600" },
  { subdir: "images/posts", filename: "post-4.jpg", seed: "love-post-library-104", dims: "800/600" },
  { subdir: "images/posts", filename: "post-5.jpg", seed: "love-post-sunset-105", dims: "800/600" },
  { subdir: "images/posts", filename: "post-6.jpg", seed: "love-post-party-106", dims: "800/600" },
  { subdir: "images/posts", filename: "post-7.jpg", seed: "love-post-travel-107", dims: "800/600" },
  { subdir: "images/posts", filename: "post-8.jpg", seed: "love-post-flower-108", dims: "800/600" },
  // activities/ activity-4~6
  { subdir: "images/activities", filename: "activity-4.jpg", seed: "love-act-art-109", dims: "800/600" },
  { subdir: "images/activities", filename: "activity-5.jpg", seed: "love-act-music-110", dims: "800/600" },
  { subdir: "images/activities", filename: "activity-6.jpg", seed: "love-act-volunteer-111", dims: "800/600" },
  // banners/ home-banner
  { subdir: "images/banners", filename: "home-banner.jpg", seed: "love-banner-home-112", dims: "1280/720" },
  // avatars/ avatar-9~12
  { subdir: "images/avatars", filename: "avatar-9.jpg", seed: "love-avatar-boy5-113", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-10.jpg", seed: "love-avatar-girl5-114", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-11.jpg", seed: "love-avatar-boy6-115", dims: "400/400" },
  { subdir: "images/avatars", filename: "avatar-12.jpg", seed: "love-avatar-girl6-116", dims: "400/400" },
];

function downloadImage(url, destPath, maxRedirect = 5) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 30000 }, (res) => {
      if ((res.statusCode === 301 || res.statusCode === 302) && res.headers.location && maxRedirect > 0) {
        res.resume();
        const nextUrl = res.headers.location.startsWith("http")
          ? res.headers.location
          : new URL(res.headers.location, url).href;
        return downloadImage(nextUrl, destPath, maxRedirect - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const buffer = Buffer.concat(chunks);
        if (buffer.length === 0) return reject(new Error("Empty body"));
        mkdirSync(dirname(destPath), { recursive: true });
        writeFileSync(destPath, buffer);
        resolve({ size: buffer.length });
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error("Timeout")));
  });
}

async function downloadWithRetry(cfg, destPath) {
  const url = `https://picsum.photos/seed/${cfg.seed}/${cfg.dims}.jpg`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await downloadImage(url, destPath);
      if (result.size >= 10 * 1024) return result;
      console.log(`   (重试 ${attempt}/3: 文件过小 ${result.size}B)`);
    } catch (e) {
      console.log(`   (重试 ${attempt}/3: ${e.message})`);
    }
  }
  throw new Error(`下载失败: ${cfg.filename}`);
}

async function main() {
  console.log("开始下载 Phase B 缺失图片...\n");
  const results = [];
  for (const cfg of IMAGE_CONFIGS) {
    const destPath = resolve(STATIC_DIR, cfg.subdir, cfg.filename);
    console.log(`[GET] ${cfg.filename} (seed: ${cfg.seed})...`);
    try {
      const result = await downloadWithRetry(cfg, destPath);
      const sizeKB = (result.size / 1024).toFixed(1);
      console.log(`[OK] ${cfg.filename} -> ${sizeKB} KB`);
      results.push({ name: cfg.filename, size: result.size, status: "OK" });
    } catch (e) {
      console.error(`[FAIL] ${cfg.filename}: ${e.message}`);
      results.push({ name: cfg.filename, error: e.message, status: "FAIL" });
    }
  }
  const ok = results.filter((r) => r.status === "OK").length;
  const fail = results.filter((r) => r.status === "FAIL").length;
  console.log(`\n===== 结果: 成功 ${ok}, 失败 ${fail} =====`);
  if (fail > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
