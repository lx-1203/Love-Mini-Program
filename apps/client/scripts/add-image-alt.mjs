// ============================================================
// 批量为 .vue 文件中的 <image> 标签添加 alt 属性
// 规则：
//   1. 单行 <image ... /> 标签若无 alt，添加 alt=""（视为装饰性图标）
//   2. 多行 <image 标签跨行时，在闭合 /> 前插入 alt=""
//   3. 已有 alt 属性的图片保持不变
//   4. 跳过 SafeImage.vue 的内部 image（由组件 props 控制 alt）
// 使用：node scripts/add-image-alt.mjs
// ============================================================

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', 'src');

// 统计计数
const stats = {
  scannedFiles: 0,
  modifiedFiles: 0,
  singleLineAdded: 0,
  multiLineAdded: 0,
  skippedExisting: 0,
};

/**
 * 递归遍历目录，返回所有 .vue 文件绝对路径
 * @param {string} dir
 * @returns {string[]}
 */
function walkVueFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walkVueFiles(full));
    } else if (extname(name) === '.vue') {
      out.push(full);
    }
  }
  return out;
}

/**
 * 给单行 image 标签添加 alt=""
 * 形如：<image class="x" :src="y" mode="aspectFit" />
 * 处理：在 /> 前插入 alt=""
 */
function addAltToSingleLineImage(line) {
  // 匹配 <image ... /> 单行（不跨行）
  // 必须包含 /> 或 ></image>
  // 跳过已有 alt= 的行
  if (/\salt=/.test(line) || /\salt\s*=/.test(line) || /:alt=/.test(line)) {
    return { line, skipped: true };
  }
  // 匹配自闭合 <image ... />
  const selfCloseMatch = line.match(/^(.*?<image\b)([^>]*?)(\s*\/>\s*)$/);
  if (selfCloseMatch) {
    const [, prefix, attrs, suffix] = selfCloseMatch;
    const newLine = `${prefix}${attrs} alt=""${suffix}`;
    return { line: newLine, added: true };
  }
  // 匹配 <image ...></image>
  const pairMatch = line.match(/^(.*?<image\b)([^>]*?)(>\s*<\/image>\s*)$/);
  if (pairMatch) {
    const [, prefix, attrs, suffix] = pairMatch;
    const newLine = `${prefix}${attrs} alt=""${suffix}`;
    return { line: newLine, added: true };
  }
  return { line };
}

/**
 * 处理多行 image 标签：检测 <image 开始、跨多行、到 /> 结束
 * 在 /> 之前添加 alt=""
 */
function processMultiLineImages(content) {
  // 用正则匹配多行 image 标签（从 <image 开始到 /> 结束）
  // 注意：JS 正则不支持递归，但 Vue 模板的 image 标签属性不会包含 <image 子标签
  const multiLineImageRegex = /(<image\b[^>]*?)(\s*\/>)/gs;
  let added = 0;
  const newContent = content.replace(multiLineImageRegex, (match, attrs, closing) => {
    // 跳过已有 alt 的
    if (/\salt\s*=/.test(attrs) || /:alt\s*=/.test(attrs)) {
      return match;
    }
    // 仅处理跨多行的（含 \n）
    if (!attrs.includes('\n')) {
      return match;
    }
    added += 1;
    return `${attrs} alt=""${closing}`;
  });
  return { content: newContent, added };
}

/**
 * 处理单个文件
 */
function processFile(filePath) {
  stats.scannedFiles += 1;
  const original = readFileSync(filePath, 'utf8');
  const lines = original.split(/\r?\n/);
  let modified = false;
  const newLines = [];

  for (const line of lines) {
    // 跳过非 image 行
    if (!/<image\b/.test(line)) {
      newLines.push(line);
      continue;
    }
    // 跳过注释行
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
      newLines.push(line);
      continue;
    }
    const result = addAltToSingleLineImage(line);
    if (result.added) {
      modified = true;
      stats.singleLineAdded += 1;
    } else if (result.skipped) {
      stats.skippedExisting += 1;
    }
    newLines.push(result.line);
  }

  // 处理多行 image
  let intermediate = newLines.join('\n');
  const { content: afterMulti, added: multiAdded } = processMultiLineImages(intermediate);
  if (multiAdded > 0) {
    modified = true;
    stats.multiLineAdded += multiAdded;
    intermediate = afterMulti;
  }

  if (modified) {
    stats.modifiedFiles += 1;
    writeFileSync(filePath, intermediate, 'utf8');
    return true;
  }
  return false;
}

// 主流程
const vueFiles = walkVueFiles(ROOT);
console.log(`找到 ${vueFiles.length} 个 .vue 文件`);

const modifiedFiles = [];
for (const f of vueFiles) {
  // 跳过 SafeImage.vue 的内部 image 元素（由 props.alt 控制）
  if (f.endsWith('SafeImage.vue')) continue;
  const wasModified = processFile(f);
  if (wasModified) {
    modifiedFiles.push(relative(join(__dirname, '..'), f));
  }
}

console.log('\n========== 统计 ==========');
console.log(`扫描文件数: ${stats.scannedFiles}`);
console.log(`修改文件数: ${stats.modifiedFiles}`);
console.log(`单行 image 添加 alt: ${stats.singleLineAdded}`);
console.log(`多行 image 添加 alt: ${stats.multiLineAdded}`);
console.log(`跳过已有 alt: ${stats.skippedExisting}`);
console.log('\n修改的文件列表:');
for (const f of modifiedFiles) {
  console.log(`  ${f}`);
}
