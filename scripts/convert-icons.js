/**
 * SVG 转 PNG 脚本
 * 将 Tabler Icons SVG 转换为 uni-app tabBar 所需的 PNG 图标
 * - outline 版本：灰色 #64748b
 * - filled 版本：品牌蓝 #2563EB
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ICONS_DIR = 'D:\\6\\恋爱小程序\\apps\\client\\src\\static\\assets\\icons';

// 图标映射：[outline文件, filled文件, 输出基础名]
const icons = [
  ['home.svg', 'home-active.svg', 'home'],
  ['circle.svg', 'circle-active.svg', 'circle'],
  ['chat.svg', 'chat-active.svg', 'chat'],
  ['shop.svg', 'shop-active.svg', 'shop'],
  ['profile-new.svg', 'profile-new-active.svg', 'profile'],
];

const SIZE = 81; // tabBar 图标推荐 81x81px
const INACTIVE_COLOR = '#64748b';
const ACTIVE_COLOR = '#2563EB';

async function convertSvgToPng(svgPath, outputPath, color) {
  let svg = fs.readFileSync(svgPath, 'utf-8');
  
  // 替换 stroke 颜色为指定颜色
  svg = svg.replace(/stroke="[^"]*"/g, `stroke="${color}"`);
  // 替换 fill 颜色（filled 图标）
  svg = svg.replace(/fill="[^"]*"/g, (match) => {
    if (match.includes('none')) return match; // 保留 fill="none"
    return `fill="${color}"`;
  });
  // 确保 xmlns 存在
  if (!svg.includes('xmlns')) {
    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  await sharp(Buffer.from(svg))
    .resize(SIZE, SIZE)
    .png()
    .toFile(outputPath);
  
  console.log(`✓ ${path.basename(outputPath)}`);
}

async function main() {
  console.log('开始转换 SVG → PNG...\n');

  for (const [outlineFile, filledFile, baseName] of icons) {
    const outlinePath = path.join(ICONS_DIR, outlineFile);
    const filledPath = path.join(ICONS_DIR, filledFile);

    // 检查文件是否存在
    if (!fs.existsSync(outlinePath)) {
      console.log(`⚠ 跳过 ${outlineFile}（文件不存在）`);
      continue;
    }

    // outline → 灰色 PNG（未选中态）
    await convertSvgToPng(
      outlinePath,
      path.join(ICONS_DIR, `${baseName}.png`),
      INACTIVE_COLOR
    );

    // filled → 品牌蓝 PNG（选中态）
    if (fs.existsSync(filledPath)) {
      await convertSvgToPng(
        filledPath,
        path.join(ICONS_DIR, `${baseName}-active.png`),
        ACTIVE_COLOR
      );
    } else {
      // 如果没有 filled 版本，用 outline 版本着色
      console.log(`⚠ ${filledFile} 不存在，使用 outline 版本着色`);
      await convertSvgToPng(
        outlinePath,
        path.join(ICONS_DIR, `${baseName}-active.png`),
        ACTIVE_COLOR
      );
    }
  }

  console.log('\n转换完成！');
}

main().catch(console.error);
