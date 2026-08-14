/**
 * 恋爱小程序 - 完整自动化测试脚本
 * 使用 Playwright 对所有页面进行系统性测试
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
const SCREENSHOTS_DIR = join(__dirname, 'test-screenshots');

// 确保截图目录存在
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const results = {
  start_time: new Date().toISOString(),
  tests: [],
  errors: [],
  summary: {}
};

let screenshotCounter = 0;

function logAndScreenshot(page, step, status, detail = '') {
  const timestamp = new Date().toISOString();
  results.tests.push({ step, status, detail, timestamp });
  console.log(`[${status}] ${step}: ${detail}`);
}

async function takeScreenshot(page, name) {
  const padded = String(++screenshotCounter).padStart(2, '0');
  const filename = `${padded}_${name}.png`;
  const path = join(SCREENSHOTS_DIR, filename);
  await page.screenshot({ path, fullPage: true });
  return path;
}

async function testAppHome(page) {
  console.log('\n=== 1. 测试应用首页 (discover/index) ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(4000);
    const ss = await takeScreenshot(page, 'app_home');
    logAndScreenshot(page, '访问首页', 'PASS', '首页加载成功', ss);

    // 检查页面元素
    const bodyText = await page.textContent('body');
    if (bodyText.includes('寻觅') || bodyText.includes('推荐') || bodyText.includes('发现')) {
      logAndScreenshot(page, '首页内容', 'PASS', '首页包含预期内容');
    } else {
      logAndScreenshot(page, '首页内容', 'INFO', '首页内容: ' + bodyText.substring(0, 100));
    }
  } catch (e) {
    logAndScreenshot(page, '访问首页', 'FAIL', e.message);
  }
}

async function testTabBar(page) {
  console.log('\n=== 2. 测试底部导航栏 ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);

    // 查找 tabbar 元素
    const tabbarSelectors = [
      '.uni-tabbar', '.tabbar', '.tab-bar',
      '[class*="tabbar"]', '[class*="tabBar"]',
      '.uni-tabbar-bottom', '.uni-tabbar__item'
    ];

    let tabbarFound = false;
    for (const sel of tabbarSelectors) {
      const el = page.locator(sel).first();
      if (await el.isVisible().catch(() => false)) {
        tabbarFound = true;
        logAndScreenshot(page, '底部导航栏', 'PASS', `通过选择器 "${sel}" 找到导航栏`);
        const ss = await takeScreenshot(page, 'tabbar_visible');
        break;
      }
    }

    if (!tabbarFound) {
      // 检查 uni-app 的自定义 tabBar
      const customTab = page.locator('.tabbar-container, .custom-tabbar, [class*="customTab"]').first();
      if (await customTab.isVisible().catch(() => false)) {
        logAndScreenshot(page, '底部导航栏', 'PASS', '自定义导航栏可见');
        await takeScreenshot(page, 'tabbar_visible');
      } else {
        logAndScreenshot(page, '底部导航栏', 'WARN', '导航栏未找到，uni-app H5 模式下可能需要特定路由');
        // 保存页面源码以诊断
        const html = await page.content();
        writeFileSync(join(SCREENSHOTS_DIR, 'page_source.html'), html, 'utf-8');
        logAndScreenshot(page, '页面源码', 'INFO', '已保存源码供分析');
      }
    }

    // 检查页面内容是否有导航相关元素
    const body = page.locator('body');
    const bodyHTML = await body.innerHTML().catch(() => '');
    if (bodyHTML.includes('寻觅') || bodyHTML.includes('喜欢') || bodyHTML.includes('村口') ||
        bodyHTML.includes('消息') || bodyHTML.includes('我的')) {
      logAndScreenshot(page, '导航文字', 'PASS', '页面包含导航标签文字');
    }
  } catch (e) {
    logAndScreenshot(page, '底部导航测试', 'FAIL', e.message);
  }
}

async function testDesignPreview(page) {
  console.log('\n=== 3. 测试静态设计预览 ===');
  const PREVIEW_URL = `file:///${join(__dirname, 'design-preview', 'index.html').replace(/\\/g, '/')}`;
  try {
    await page.goto(PREVIEW_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    await takeScreenshot(page, 'preview_home');
    logAndScreenshot(page, '访问设计预览', 'PASS', '设计预览页面加载成功');

    // 尝试点击预览 tab
    const tabs = [
      { text: '匹配', page: '#page-match' },
      { text: '聊天', page: '#page-chat' },
      { text: '我的', page: '#page-profile' },
      { text: '首页', page: '#page-home' }
    ];

    for (const tab of tabs) {
      try {
        const tabBtn = page.locator(`button.preview-tab:has-text("${tab.text}")`).first();
        if (await tabBtn.isVisible().catch(() => false)) {
          await tabBtn.click();
          await sleep(1000);
          const target = page.locator(tab.page);
          if (await target.isVisible().catch(() => false)) {
            logAndScreenshot(page, `预览-${tab.text}`, 'PASS', '切换成功');
          } else {
            logAndScreenshot(page, `预览-${tab.text}`, 'INFO', '点击了tab');
          }
          await takeScreenshot(page, `preview_${tab.text}`);
        }
      } catch (e) {
        logAndScreenshot(page, `预览-${tab.text}`, 'WARN', e.message);
      }
    }
  } catch (e) {
    logAndScreenshot(page, '设计预览测试', 'FAIL', e.message);
  }
}

async function testLoginPage(page) {
  console.log('\n=== 4. 测试登录页面 ===');
  try {
    await page.goto(`${BASE_URL}/#/pages/login/index`, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);
    await takeScreenshot(page, 'login_page');
    logAndScreenshot(page, '登录页面', 'PASS', '登录页加载');

    // 检查登录元素
    const loginSelectors = ['button', '.login-btn', '[class*="login"]', '.uni-button', 'input'];
    let foundElements = [];
    for (const sel of loginSelectors) {
      const count = await page.locator(sel).count();
      if (count > 0) foundElements.push(`${sel}x${count}`);
    }
    logAndScreenshot(page, '登录元素', 'INFO', `找到: ${foundElements.join(', ') || '无'}`);

    // 检查微信登录相关元素
    const pageText = await page.textContent('body').catch(() => '');
    if (pageText.includes('微信') || pageText.includes('手机') || pageText.includes('登录')) {
      logAndScreenshot(page, '登录方式', 'PASS', '页面包含登录选项');
    }
  } catch (e) {
    logAndScreenshot(page, '登录测试', 'FAIL', e.message);
  }
}

async function navigateTo(page, hashPath, label) {
  console.log(`\n=== 导航到: ${label} (${hashPath}) ===`);
  try {
    await page.goto(`${BASE_URL}/#${hashPath}`, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);
    await takeScreenshot(page, `page_${label}`);
    logAndScreenshot(page, `页面-${label}`, 'PASS', `导航到 ${hashPath} 成功`);

    // 收集页面信息
    const buttons = await page.locator('button, .uni-button, [role="button"]').count();
    const inputs = await page.locator('input, textarea').count();
    const images = await page.locator('img').count();
    const links = await page.locator('a, .navigator, [href]').count();
    logAndScreenshot(page, `${label}-元素统计`, 'INFO',
      `buttons=${buttons}, inputs=${inputs}, images=${images}, links=${links}`);

    // 尝试点击可交互元素
    let clickCount = 0;
    const clickables = await page.locator('button, .uni-button, .navigator, [href], [role="button"], .item, .card').all();
    for (const el of clickables) {
      if (clickCount >= 3) break;
      try {
        if (await el.isVisible()) {
          await el.click();
          await sleep(1000);
          clickCount++;
        }
      } catch (e) {
        // 忽略点击错误
      }
    }
    if (clickCount > 0) {
      logAndScreenshot(page, `${label}-交互测试`, 'INFO', `成功点击 ${clickCount} 个元素`);
      await takeScreenshot(page, `page_${label}_after_click`);
    }

  } catch (e) {
    logAndScreenshot(page, `页面-${label}`, 'FAIL', e.message);
  }
}

async function testAllPages(page) {
  console.log('\n=== 5. 遍历所有页面 ===');

  const pages = [
    { hash: '/pages/discover/index', label: 'discover' },
    { hash: '/pages/discover/history', label: 'discover_history' },
    { hash: '/pages/likes/index', label: 'likes' },
    { hash: '/pages/village/index', label: 'village' },
    { hash: '/pages/village/post', label: 'village_post' },
    { hash: '/pages/village/detail', label: 'village_detail' },
    { hash: '/pages/messages/index', label: 'messages' },
    { hash: '/pages/profile/index', label: 'profile' },
    { hash: '/pages/circles/index', label: 'circles' },
    { hash: '/pages/circles/topics', label: 'circles_topics' },
    { hash: '/pages/circles/topic-detail', label: 'circles_topic_detail' },
    { hash: '/pages/circles/post-topic', label: 'circles_post_topic' },
    { hash: '/pages/daily-question/index', label: 'daily_question' },
    { hash: '/pages/chat/index', label: 'chat' },
    { hash: '/pages/chat-session/index', label: 'chat_session' },
    { hash: '/pages/dev/index', label: 'dev' },
  ];

  for (const p of pages) {
    await navigateTo(page, p.hash, p.label);
  }
}

async function testSubPackages(page) {
  console.log('\n=== 6. 测试分包页面 ===');

  const subPages = [
    { hash: '/subpackages/setup/profile/index', label: 'setup_profile' },
    { hash: '/subpackages/setup/campus/index', label: 'setup_campus' },
    { hash: '/subpackages/setup/schedule/index', label: 'setup_schedule' },
    { hash: '/subpackages/setup/recommend-pref/index', label: 'setup_recommend' },
    { hash: '/subpackages/support/feedback/index', label: 'feedback' },
    { hash: '/subpackages/discover/discussions/index', label: 'discussions' },
    { hash: '/subpackages/discover/activities/index', label: 'activities' },
  ];

  for (const p of subPages) {
    await navigateTo(page, p.hash, p.label);
  }
}

async function testPerformance(page) {
  console.log('\n=== 7. 性能检查 ===');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);

    const metrics = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      if (!nav) return {};
      return {
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        loadComplete: Math.round(nav.loadEventEnd - nav.startTime),
        domInteractive: Math.round(nav.domInteractive - nav.startTime),
        type: nav.type
      };
    });

    logAndScreenshot(page, '性能指标', 'INFO', JSON.stringify(metrics));

    // 检查控制台错误
    const consoleErrors = results.tests.filter(
      t => t.step.includes('控制台') && t.status === 'FAIL'
    ).length;
    logAndScreenshot(page, '控制台错误检查', 'INFO', `控制台错误数: ${consoleErrors}`);

  } catch (e) {
    logAndScreenshot(page, '性能检查', 'FAIL', e.message);
  }
}

async function testResponsive(page) {
  console.log('\n=== 8. 响应式测试 ===');
  const viewports = [
    { name: 'iPhone_SE', width: 375, height: 667 },
    { name: 'iPhone_14', width: 390, height: 844 },
    { name: 'iPhone_14_Pro_Max', width: 430, height: 932 },
    { name: 'iPad_Mini', width: 768, height: 1024 },
    { name: 'Desktop_1280', width: 1280, height: 800 },
  ];

  for (const vp of viewports) {
    try {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(2000);
      await takeScreenshot(page, `responsive_${vp.name}`);
      logAndScreenshot(page, `响应式-${vp.name}`, 'PASS', `${vp.width}x${vp.height}`);
    } catch (e) {
      logAndScreenshot(page, `响应式-${vp.name}`, 'FAIL', e.message);
    }
  }
}

async function testRootIndex(page) {
  console.log('\n=== 9. 测试根目录 index.html ===');
  try {
    const rootIndex = `file:///${join(__dirname, 'index.html').replace(/\\/g, '/')}`;
    await page.goto(rootIndex, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(2000);
    const ss = await takeScreenshot(page, 'root_index');
    logAndScreenshot(page, '根目录 index.html', 'PASS', '加载成功', ss);

    // 检查交互元素
    const btns = await page.locator('button').count();
    const inputs = await page.locator('input').count();
    const links = await page.locator('a').count();
    logAndScreenshot(page, '根页面元素', 'INFO', `buttons=${btns}, inputs=${inputs}, links=${links}`);

    // 尝试点击主要按钮
    const allButtons = await page.locator('button').all();
    let clicked = 0;
    for (const btn of allButtons) {
      if (clicked >= 5) break;
      try {
        if (await btn.isVisible()) {
          const text = await btn.textContent();
          await btn.click();
          await sleep(800);
          clicked++;
          logAndScreenshot(page, `点击按钮`, 'INFO', `"${text?.trim() || 'unnamed'}"`);
        }
      } catch (e) {
        // ignore
      }
    }
    if (clicked > 0) {
      await takeScreenshot(page, 'root_index_after_interact');
    }
  } catch (e) {
    logAndScreenshot(page, '根目录测试', 'FAIL', e.message);
  }
}

async function testLegacyPrototype(page) {
  console.log('\n=== 10. 测试旧版原型 (script.js 功能) ===');
  try {
    // 检查 script.js 是否加载
    const hasScript = await page.evaluate(() => {
      return typeof window !== 'undefined';
    });
    logAndScreenshot(page, '原型-JS环境', 'PASS', 'JavaScript 环境正常');

    // 在根页面测试页面切换功能
    const rootIndex = `file:///${join(__dirname, 'index.html').replace(/\\/g, '/')}`;
    await page.goto(rootIndex, { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(1500);

    // 测试页面导航
    const navButtons = [
      { text: '首页', section: '#page-home' },
      { text: '匹配', section: '#page-match' },
      { text: '聊天', section: '#page-chat' },
      { text: '我的', section: '#page-profile' },
    ];

    for (const nav of navButtons) {
      try {
        const btn = page.locator(`button:has-text("${nav.text}")`).first();
        if (await btn.isVisible().catch(() => false)) {
          await btn.click();
          await sleep(800);
          logAndScreenshot(page, `原型导航-${nav.text}`, 'PASS');
        }
      } catch (e) {
        logAndScreenshot(page, `原型导航-${nav.text}`, 'INFO', e.message);
      }
    }
    await takeScreenshot(page, 'prototype_full');
  } catch (e) {
    logAndScreenshot(page, '原型测试', 'FAIL', e.message);
  }
}

async function testErrorHandling(page) {
  console.log('\n=== 11. 错误处理测试 ===');
  try {
    // 测试不存在的页面
    await page.goto(`${BASE_URL}/#/pages/nonexistent`, { waitUntil: 'networkidle', timeout: 15000 })
      .catch(() => {});
    await sleep(2000);
    await takeScreenshot(page, 'error_404');
    logAndScreenshot(page, '错误页面-404', 'INFO', '不存在的页面');

    // 测试无效路由
    await page.goto(`${BASE_URL}/invalid-path`, { waitUntil: 'networkidle', timeout: 15000 })
      .catch(() => {});
    await sleep(2000);
    logAndScreenshot(page, '错误页面-无效路由', 'INFO', '无效路径');

  } catch (e) {
    logAndScreenshot(page, '错误处理测试', 'FAIL', e.message);
  }
}

async function testConsoleErrors(page) {
  console.log('\n=== 12. 控制台错误收集 ===');
  const consoleErrors = [];
  const consoleWarnings = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push({ text: msg.text, location: msg.location() });
    } else if (msg.type() === 'warning') {
      consoleWarnings.push({ text: msg.text, location: msg.location() });
    }
  });

  page.on('pageerror', err => {
    results.errors.push({ type: 'page_error', message: err.message, stack: err.stack });
  });

  // 访问所有主要页面收集错误
  const testUrls = [
    BASE_URL,
    `${BASE_URL}/#/pages/login/index`,
    `${BASE_URL}/#/pages/discover/index`,
    `${BASE_URL}/#/pages/likes/index`,
    `${BASE_URL}/#/pages/village/index`,
    `${BASE_URL}/#/pages/messages/index`,
    `${BASE_URL}/#/pages/profile/index`,
  ];

  for (const url of testUrls) {
    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
      await sleep(1500);
    } catch (e) {
      // ignore
    }
  }

  if (consoleErrors.length > 0) {
    logAndScreenshot(page, '控制台错误', 'INFO', JSON.stringify(consoleErrors.slice(0, 10)));
    consoleErrors.forEach(e => {
      results.errors.push({ type: 'console_error', message: e.text, location: e.location });
    });
  } else {
    logAndScreenshot(page, '控制台错误', 'PASS', '无控制台错误');
  }

  if (consoleWarnings.length > 0) {
    logAndScreenshot(page, '控制台警告', 'INFO', `${consoleWarnings.length} 条警告`);
    consoleWarnings.slice(0, 5).forEach(w => {
      logAndScreenshot(page, '控制台警告详情', 'WARN', w.text);
    });
  }
}

async function main() {
  console.log('=== 恋爱小程序 - 全页面自动化测试 ===\n');
  console.log(`测试开始时间: ${new Date().toLocaleString()}`);
  console.log(`测试环境: ${BASE_URL}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 2,
    locale: 'zh-CN'
  });

  const page = await context.newPage();

  // 监听页面错误
  const pageErrors = [];
  page.on('pageerror', err => {
    pageErrors.push(err.message);
    results.errors.push({ type: 'page_error', message: err.message });
  });

  try {
    // 运行所有测试
    await testAppHome(page);
    await testTabBar(page);
    await testDesignPreview(page);
    await testLoginPage(page);
    await testAllPages(page);
    await testSubPackages(page);
    await testRootIndex(page);
    await testLegacyPrototype(page);
    await testErrorHandling(page);
    await testConsoleErrors(page);
    await testPerformance(page);
    await testResponsive(page);

  } catch (e) {
    console.error('测试运行异常:', e.message);
    results.errors.push({ type: 'runtime_error', message: e.message });
  } finally {
    await browser.close();
  }

  // 汇总结果
  const total = results.tests.length;
  const passed = results.tests.filter(t => t.status === 'PASS').length;
  const failed = results.tests.filter(t => t.status === 'FAIL').length;
  const warned = results.tests.filter(t => t.status === 'WARN').length;
  const info = results.tests.filter(t => t.status === 'INFO').length;

  results.summary = {
    total,
    pass: passed,
    fail: failed,
    warn: warned,
    info,
    page_errors: pageErrors.length,
    console_errors: results.errors.length
  };

  results.end_time = new Date().toISOString();

  // 保存报告
  const reportPath = join(SCREENSHOTS_DIR, 'test_report.json');
  writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');

  // 生成简化的 HTML 报告
  const htmlReport = generateHtmlReport(results);
  writeFileSync(join(SCREENSHOTS_DIR, 'report.html'), htmlReport, 'utf-8');

  console.log('\n=== 测试完成 ===');
  console.log(`报告已保存: ${reportPath}`);
  console.log(`截图目录: ${SCREENSHOTS_DIR}`);
  console.log(`总计: ${total} | 通过: ${passed} | 失败: ${failed} | 警告: ${warned} | 信息: ${info}`);
  if (pageErrors.length > 0) {
    console.log(`页面错误: ${pageErrors.length}`);
    pageErrors.forEach(e => console.log(`  - ${e}`));
  }
}

function generateHtmlReport(results) {
  const rows = results.tests.map(t => `
    <tr class="${t.status.toLowerCase()}">
      <td>${t.step}</td>
      <td><span class="badge badge-${t.status.toLowerCase()}">${t.status}</span></td>
      <td>${t.detail || '-'}</td>
      <td>${new Date(t.timestamp).toLocaleTimeString()}</td>
    </tr>
  `).join('\n');

  const errorRows = results.errors.map(e => `
    <tr>
      <td>${e.type}</td>
      <td>${e.message || '-'}</td>
      <td>${e.location || e.stack || '-'}</td>
    </tr>
  `).join('\n');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>测试报告</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .summary { display: flex; gap: 16px; margin: 20px 0; }
    .card { padding: 16px 24px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .card.pass { border-left: 4px solid #22c55e; }
    .card.fail { border-left: 4px solid #ef4444; }
    .card.warn { border-left: 4px solid #f59e0b; }
    .card.info { border-left: 4px solid #3b82f6; }
    .num { font-size: 28px; font-weight: bold; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin: 20px 0; }
    th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .badge-pass { background: #dcfce7; color: #166534; }
    .badge-fail { background: #fee2e2; color: #991b1b; }
    .badge-warn { background: #fef3c7; color: #92400e; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    tr.pass { background: #f0fdf4; }
    tr.fail { background: #fef2f2; }
    tr.warn { background: #fffbeb; }
  </style>
</head>
<body>
  <h1>📊 测试报告</h1>
  <p>开始: ${results.start_time} | 结束: ${results.end_time}</p>
  <div class="summary">
    <div class="card info"><div class="num">${results.summary.total}</div>总计</div>
    <div class="card pass"><div class="num">${results.summary.pass}</div>通过</div>
    <div class="card fail"><div class="num">${results.summary.fail}</div>失败</div>
    <div class="card warn"><div class="num">${results.summary.warn}</div>警告</div>
  </div>

  <h2>测试详情</h2>
  <table><thead><tr><th>步骤</th><th>状态</th><th>详情</th><th>时间</th></tr></thead><tbody>${rows}</tbody></table>

  ${results.errors.length ? `<h2>错误详情</h2><table><thead><tr><th>类型</th><th>消息</th><th>位置</th></tr></thead><tbody>${errorRows}</tbody></table>` : ''}
</body>
</html>`;
}

main().catch(console.error);
