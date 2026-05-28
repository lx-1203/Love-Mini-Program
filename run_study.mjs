/**
 * 恋爱小程序 - 深度研究脚本
 * 系统性探索所有页面、功能、交互和代码结构
 */
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
import { mkdirSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { setTimeout as sleep } from 'timers/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:5173';
const REPORT_DIR = join(__dirname, 'test-screenshots');

mkdirSync(REPORT_DIR, { recursive: true });

const study = {
  pages: {},
  components: {},
  interactions: [],
  issues: [],
  observations: []
};

let ssCounter = 0;

async function ss(page, name) {
  const n = String(++ssCounter).padStart(2, '0');
  const path = join(REPORT_DIR, `study_${n}_${name}.png`);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function explorePage(page, label, path, options = {}) {
  console.log(`\n=== 探索: ${label} (${path}) ===`);
  const result = { label, path, elements: {}, interactions: [] };

  try {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
    await sleep(options.wait || 2000);

    const screenshotPath = await ss(page, label.replace(/[^a-z0-9]/gi, '_'));
    result.screenshot = screenshotPath;

    // 获取页面关键信息
    result.elements = await page.evaluate(() => ({
      title: document.title,
      buttons: document.querySelectorAll('button, [role="button"], [class*="btn"], [class*="action"], [class*="tap"]').length,
      inputs: document.querySelectorAll('input, textarea').length,
      images: document.querySelectorAll('img, image').length,
      links: document.querySelectorAll('a, [href]').length,
      textBlocks: document.querySelectorAll('p, span, text, label, h1, h2, h3, h4').length,
      scrollHeight: document.documentElement.scrollHeight,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    }));

    // 获取可见文本内容（前1000字符）
    result.visibleText = (await page.evaluate(() => {
      const walker = document.createTreeWalker(document.body, 4, null, Infinity);
      const texts = [];
      let node;
      while (node = walker.nextNode()) {
        const t = node.textContent.trim();
        if (t.length > 2) texts.push(t);
      }
      return [...new Set(texts)].slice(0, 80).join(' | ');
    })).substring(0, 1000);

    // 检查控制台
    result.consoleErrors = options.consoleErrors || [];

    console.log(`  ✓ 加载成功 | 按钮:${result.elements.buttons} 输入:${result.elements.inputs} 图片:${result.elements.images}`);
    console.log(`  文本片段: ${result.visibleText.substring(0, 200)}...`);

  } catch (err) {
    result.error = err.message;
    console.log(`  ✗ 加载失败: ${err.message}`);
    const screenshotPath = await ss(page, `error_${label}`);
    result.screenshot = screenshotPath;
  }

  study.pages[label] = result;
  return result;
}

async function clickElement(page, label, selector) {
  try {
    const el = await page.$(selector);
    if (el) {
      await el.click();
      await sleep(1000);
      console.log(`  ✓ 点击 "${selector}"`);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function main() {
  console.log('══════════════════════════════════════');
  console.log('  恋爱小程序 - 深度研究');
  console.log('══════════════════════════════════════\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text(), type: msg.type() });
    }
  });

  page.on('pageerror', err => {
    consoleErrors.push({ text: err.message, type: 'pageerror' });
  });

  // ============================
  // 1. 首页 - 发现页 (discover)
  // ============================
  await explorePage(page, '发现页', '/pages/discover/index', { consoleErrors });

  // ============================
  // 2. 喜欢页
  // ============================
  await explorePage(page, '喜欢页', '/pages/likes/index', { consoleErrors });

  // ============================
  // 3. 村口页 (社区)
  // ============================
  await explorePage(page, '村口页', '/pages/village/index', { consoleErrors, wait: 3000 });

  // ============================
  // 4. 发帖页
  // ============================
  await explorePage(page, '发帖页', '/pages/village/post', { consoleErrors });

  // 尝试发帖交互
  const postPage = study.pages['发帖页'];
  if (!postPage.error) {
    await page.fill('textarea', '这是一条测试帖子内容，来自自动化研究脚本。');
    await sleep(500);
    const ssPath = await ss(page, 'post_filled');
    postPage.interactions.push({ action: '填写内容', screenshot: ssPath });
    console.log('  ✓ 填写帖子内容');
  }

  // ============================
  // 5. 帖子详情页
  // ============================
  await explorePage(page, '帖子详情页', '/pages/village/detail?id=post-1', { consoleErrors, wait: 3000 });

  // ============================
  // 6. 消息页
  // ============================
  await explorePage(page, '消息页', '/pages/messages/index', { consoleErrors });

  // ============================
  // 7. 我的 (个人中心)
  // ============================
  await explorePage(page, '个人中心', '/pages/profile/index', { consoleErrors });

  // ============================
  // 8. 每日一问
  // ============================
  await explorePage(page, '每日一问', '/pages/daily-question/index', { consoleErrors, wait: 3000 });

  // ============================
  // 9. 兴趣圈
  // ============================
  await explorePage(page, '兴趣圈', '/pages/circles/index', { consoleErrors });

  // ============================
  // 10. 聊天会话页
  // ============================
  await explorePage(page, '聊天会话', '/pages/chat-session/index?sessionId=session-1', { consoleErrors, wait: 2000 });

  // ============================
  // 11. 聊天页
  // ============================
  await explorePage(page, '聊天列表', '/pages/chat/index', { consoleErrors });

  // ============================
  // 12. 资料完善子包
  // ============================
  await explorePage(page, '资料编辑', '/subpackages/setup/profile/index', { consoleErrors });
  await explorePage(page, '学校认证', '/subpackages/setup/campus/index', { consoleErrors });
  await explorePage(page, '时间安排', '/subpackages/setup/schedule/index', { consoleErrors });
  await explorePage(page, '推荐偏好', '/subpackages/setup/recommend-pref/index', { consoleErrors });

  // ============================
  // 13. 支持子包
  // ============================
  await explorePage(page, '反馈中心', '/subpackages/support/feedback/index', { consoleErrors });

  // ============================
  // 14. 发现子包
  // ============================
  await explorePage(page, '讨论专区', '/subpackages/discover/discussions/index', { consoleErrors });
  await explorePage(page, '活动专区', '/subpackages/discover/activities/index', { consoleErrors });

  // ============================
  // 15. 设计预览
  // ============================
  await explorePage(page, '设计预览', '/design-preview/index.html', { consoleErrors });

  // ============================
  // 16. 根目录首页
  // ============================
  await explorePage(page, '根首页', '/index.html', { consoleErrors });

  // ============================
  // 17. 开发者页面
  // ============================
  await explorePage(page, '开发者模式', '/pages/dev/index', { consoleErrors });

  // ============================
  // 分析报告
  // ============================
  const allPages = Object.values(study.pages);
  const loadedPages = allPages.filter(p => !p.error);
  const failedPages = allPages.filter(p => p.error);
  const totalErrors = consoleErrors.length;

  console.log('\n══════════════════════════════════════');
  console.log('  研究总结');
  console.log('══════════════════════════════════════\n');
  console.log(`  总页面数: ${allPages.length}`);
  console.log(`  加载成功: ${loadedPages.length}`);
  console.log(`  加载失败: ${failedPages.length}`);
  console.log(`  控制台错误: ${totalErrors}`);

  if (failedPages.length > 0) {
    console.log('\n  失败页面:');
    failedPages.forEach(p => console.log(`    ✗ ${p.label}: ${p.error}`));
  }

  if (totalErrors > 0) {
    console.log('\n  控制台错误详情:');
    consoleErrors.forEach(e => console.log(`    [${e.type}] ${e.text.substring(0, 200)}`));
  }

  console.log('\n  页面元素统计:');
  loadedPages.forEach(p => {
    const e = p.elements;
    console.log(`    ${p.label.padEnd(12)} | 按钮:${String(e.buttons).padStart(3)} 输入:${String(e.inputs).padStart(2)} 图片:${String(e.images).padStart(3)} 文本块:${String(e.textBlocks).padStart(4)} 高度:${e.scrollHeight}`);
  });

  // 保存完整报告
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: allPages.length,
      loaded: loadedPages.length,
      failed: failedPages.length,
      consoleErrors: totalErrors,
    },
    pages: study.pages,
    consoleErrors,
  };

  writeFileSync(join(REPORT_DIR, 'study_report.json'), JSON.stringify(report, null, 2));
  console.log(`\n  报告已保存: ${join(REPORT_DIR, 'study_report.json')}`);

  await browser.close();
  console.log('\n══════════════════════════════════════');
  console.log('  研究完成');
  console.log('══════════════════════════════════════');
}

main().catch(console.error);
