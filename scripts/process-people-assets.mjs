#!/usr/bin/env node
/**
 * process-people-assets.mjs — 素材/人物 → 4:5 WebP 卡片图(640×800) + 方形头像(200×200)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = path.join(ROOT, "素材", "人物");
const PEOPLE_DIR = path.join(ROOT, "apps", "client", "src", "static", "assets", "images", "people");
const AVATAR_DIR = path.join(ROOT, "apps", "client", "src", "static", "assets", "images", "avatars");

fs.mkdirSync(PEOPLE_DIR, { recursive: true });
fs.mkdirSync(AVATAR_DIR, { recursive: true });

const files = fs.readdirSync(SRC_DIR)
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
  .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));

const mapping = [];
let i = 0;
for (const f of files) {
  i += 1;
  const id = `person-${String(i).padStart(2, "0")}`;
  const src = path.join(SRC_DIR, f);
  const card = path.join(PEOPLE_DIR, `${id}.webp`);
  const avatar = path.join(AVATAR_DIR, `${id}-avatar.webp`);
  const img = sharp(src);
  const meta = await img.metadata();
  await sharp(src).resize(560, 700, { fit: "cover", position: "attention" }).webp({ quality: 72 }).toFile(card);
  await sharp(src).resize(160, 160, { fit: "cover", position: "attention" }).webp({ quality: 72 }).toFile(avatar);
  mapping.push({ id, file: f, w: meta.width, h: meta.height });
  console.log(`✓ ${id} <- ${f} (${meta.width}x${meta.height})`);
}
fs.writeFileSync(path.join(ROOT, "docs", "design", "people-fixture.json"), JSON.stringify(mapping, null, 2), "utf8");
console.log(`done: ${mapping.length} photos`);
