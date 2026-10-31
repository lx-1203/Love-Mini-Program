import { test, expect, request } from '@playwright/test';

/**
 * 真实栈冒烟（2026-10-25）。
 *
 * 只在 E2E_API_MODE=real 时运行；mock E2E 会跳过本文件。
 * 目标不是替代全量 UI 巡检，而是让至少一条链路真实触达后端：
 *   游客登录 → 村口帖子列表 → 上传 1x1 PNG → 签名 URL → 无 Authorization 取回原字节
 *   → 无凭据访问同一路径必须 401。
 *
 * 这条链路正是 2026-10-25 真机实跑抓到「签名过滤器 200 + 0 字节」的形态：
 * 只断言状态码会绿，必须比对响应字节数。
 */

// Playwright 的 baseURL 解析把不带尾斜杠的 /api 当作"文件名"：new URL('v1/x', '…/api')
// 会得到 /v1/x（丢掉 /api），实测 401。统一补尾斜杠后再拼相对路径。
const API_BASE = (process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080/api').replace(/\/+$/u, '') + '/';
const ORIGIN = API_BASE.replace(/\/api\/?$/u, '');

function absoluteMediaUrl(raw: string): string {
  if (/^https?:\/\//u.test(raw)) return raw;
  if (raw.startsWith('/api/')) return `${ORIGIN}${raw}`;
  return `${ORIGIN}/api${raw.startsWith('/') ? '' : '/'}${raw}`;
}

test.skip(
  process.env.E2E_API_MODE !== 'real',
  'real-stack smoke only runs with E2E_API_MODE=real',
);

test('real stack: guest login → feed → upload → signed media → 401 control', async () => {
  const api = await request.newContext({ baseURL: API_BASE, timeout: 30_000 });
  try {
    // 1) 游客登录：每次调用创建独立访客，拿到完整会话 token
    const login = await api.post('v1/auth/guest-login');
    expect(login.status(), await login.text()).toBe(200);
    const loginBody = await login.json();
    const token: string | undefined = loginBody.token ?? loginBody.data?.token;
    expect(token, 'guest-login 必须返回 token').toBeTruthy();
    const auth = { Authorization: `Bearer ${token}` };

    // 2) 真实业务读：村口帖子列表（空列表也是合法 200，但端点必须存在且鉴权链放行）
    const posts = await api.get('v1/posts?page=1&pageSize=5', { headers: auth });
    expect(posts.status(), await posts.text()).toBe(200);

    // 3) 上传 1x1 PNG（68 字节），走真实 multipart + 存储
    const pngBytes = Uint8Array.from(
      atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z1ZkAAAAASUVORK5CYII='),
      (ch) => ch.charCodeAt(0),
    );
    const form = new FormData();
    form.append('file', new Blob([pngBytes], { type: 'image/png' }), 'smoke.png');
    form.append('type', 'image');
    form.append('category', 'GENERAL');
    const upload = await api.post('v1/media/upload', { headers: { ...auth, 'Idempotency-Key': `e2e-upload-${Date.now()}` }, multipart: form });
    expect(upload.status(), await upload.text()).toBe(200);
    const uploadBody = await upload.json();
    const mediaUrl: string | undefined = uploadBody.data?.url ?? uploadBody.url;
    expect(mediaUrl, '上传响应必须带媒体 URL').toBeTruthy();

    // 4) 能力型签名：签发即授权，签名 URL 不再携带会话凭据
    const sign = await api.post('v1/media/sign', {
      headers: { ...auth, 'Idempotency-Key': `e2e-sign-${Date.now()}` },
      data: { paths: [mediaUrl] },
    });
    expect(sign.status(), await sign.text()).toBe(200);
    const signBody = await sign.json();
    const signedUrl: string | undefined =
      signBody.items?.[0]?.url ?? signBody.data?.items?.[0]?.url;
    expect(signedUrl, '签名响应必须包含该路径').toBeTruthy();
    expect(signedUrl).toContain('sig=');
    expect(signedUrl).not.toContain('token=');

    // 5) 无 Authorization 取回原始字节：这是过滤器必须真正放行到下游的判点
    const media = await api.get(absoluteMediaUrl(signedUrl!));
    expect(media.status(), await media.text()).toBe(200);
    const body = await media.body();
    expect(body.length, '签名 URL 必须返回与原文件等长的字节，而不是 200 空体').toBe(pngBytes.length);

    // 6) 反向对照：同一路径无凭据必须 401
    const control = await api.get(absoluteMediaUrl(mediaUrl!));
    expect(control.status()).toBe(401);
  } finally {
    await api.dispose();
  }
});

test('real stack: H5 real shell renders non-empty content', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  const text = (await page.locator('body').innerText()).trim();
  expect(text.length, 'H5 real 首屏不得是空白壳').toBeGreaterThan(0);
});
