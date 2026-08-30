/**
 * 2026-08-26 T05 集成验证：帖子列表与首页社区动态 images 字段冒烟。
 *
 * 前置：后端服务已启动（默认 http://127.0.0.1:8080）。
 * 流程：
 *   1. guest-login 获取体验 token；
 *   2. GET /api/v1/posts?page=1&pageSize=5 → 断言 items 每项含 images 数组；
 *   3. GET /api/v1/home/dashboard → 断言 homeFeed.communityPosts[].images 存在（数组）。
 *
 * 退出码：全部断言通过 0，任一失败 1（供 CI/QA 接入）。
 */
'use strict';

const http = require('http');

const BASE = process.env.API_BASE || 'http://127.0.0.1:8080';
const PAGE_SIZE = 5;

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const u = new URL(path, BASE);
    const payload = body === undefined ? null : JSON.stringify(body);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: `${u.pathname}${u.search}`,
        method,
        headers,
        timeout: 10000,
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(data);
          } catch (_e) {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('request timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let failures = 0;

function assert(cond, label, detail) {
  if (cond) {
    console.log(`  [PASS] ${label}`);
  } else {
    failures += 1;
    console.error(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function describeImages(images) {
  return Array.isArray(images) ? `array(${images.length})` : String(images);
}

(async () => {
  console.log(`[verify-post-images] 后端基址: ${BASE}`);

  // 1. guest-login
  console.log('[1/3] guest-login 获取体验 token');
  const login = await request('POST', '/api/v1/auth/guest-login', {});
  assert(login.status === 200 && login.body && login.body.token, 'guest-login 返回 token', `status=${login.status}`);
  const token = login.body && login.body.token;
  if (!token) {
    console.error('无法获取 token，终止验证。');
    process.exit(1);
  }

  // 2. GET /api/v1/posts
  console.log(`[2/3] GET /api/v1/posts?page=1&pageSize=${PAGE_SIZE}`);
  const posts = await request('GET', `/api/v1/posts?page=1&pageSize=${PAGE_SIZE}`, undefined, token);
  assert(posts.status === 200, 'posts 接口 200', `status=${posts.status}`);
  const items = posts.body && Array.isArray(posts.body.items) ? posts.body.items : [];
  assert(items.length > 0, `posts 返回 ${items.length} 条（>0）`, `count=${items.length}`);
  let allHaveImages = items.length > 0;
  for (const it of items) {
    if (!Array.isArray(it.images)) {
      allHaveImages = false;
      console.error(`    [detail] post id=${it.id} images=${describeImages(it.images)}`);
    }
  }
  assert(allHaveImages, 'items 每项 images 均为数组（R4.1 无字段丢失）');
  if (items.length > 0) {
    const withImg = items.filter((it) => Array.isArray(it.images) && it.images.length > 0).length;
    console.log(`    [info] ${withImg}/${items.length} 条含图片，最大条数示例: ${JSON.stringify(items[0].images)}`);
  }

  // 3. GET /api/v1/home/dashboard
  console.log('[3/3] GET /api/v1/home/dashboard');
  const dash = await request('GET', '/api/v1/home/dashboard', undefined, token);
  assert(dash.status === 200, 'dashboard 接口 200', `status=${dash.status}`);
  const feed = dash.body && dash.body.homeFeed ? dash.body.homeFeed : null;
  const communityPosts = feed && Array.isArray(feed.communityPosts) ? feed.communityPosts : [];
  let feedImagesOk = true;
  for (const p of communityPosts) {
    if (!Array.isArray(p.images)) {
      feedImagesOk = false;
      console.error(`    [detail] communityPost id=${p.id} images=${describeImages(p.images)}`);
    }
  }
  assert(feedImagesOk, `homeFeed.communityPosts[].images 均为数组（${communityPosts.length} 条）`);

  console.log('');
  if (failures > 0) {
    console.error(`[verify-post-images] 结果：${failures} 项断言失败`);
    process.exit(1);
  }
  console.log('[verify-post-images] 结果：全部断言通过 ✓');
  process.exit(0);
})().catch((e) => {
  console.error('[verify-post-images] 异常：', e && e.message ? e.message : e);
  process.exit(1);
});
