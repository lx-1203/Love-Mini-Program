import { expect, test, request } from '@playwright/test';

/**
 * 主流程 5：越权访问必须被拒（S4-2，2026-10-30）。
 *
 * 为什么这条只能在 real 档钉：mock 档（playwright webServer 起的 `dev:h5`）压根不经过
 * Spring Security——`MockSecurityConfig` 免真实认证，任何 401/403 语义都不存在。
 * 所以本文件与 specs/real-stack-smoke.spec.ts 同口径由 `E2E_API_MODE=real` 门控
 * （CI 的 e2e-real job 注入），mock 档整文件 skip。
 *
 * 可证的三条判点（都是"未认证 / 已认证但无角色"这两类边界）：
 *   1) 无 token 打用户侧端点 ⇒ 401（认证层拒绝）；
 *   2) 游客 token（USER 角色）打管理侧端点 ⇒ 403（授权层拒绝，AdminWhisperController
 *      与 AdminUserController 都是类级 @PreAuthorize('ADMIN','SUPER_ADMIN','AUDITOR')）；
 *   3) 无 token 打同一个管理端点 ⇒ 401 而不是 403——这条负判据防的是"匿名请求被当成
 *      已认证无权限"，那会让认证与授权两层职责混成一团，也会把未登录用户暴露成"有账号"。
 *
 * 明确不在本文件能力范围内的（留给后端用例与有凭据的载具）：
 *   - <b>同角色跨校区</b>的 403（校区管理员读/删别的校区的悄悄话）——这需要两个不同校区的
 *     ADMIN 账号，CI 的 e2e-real job 没有注入这类凭据；该判点由
 *     `AdminWhisperScopeTest`（8 例）与 `tests/admin-scope-parity.spec.mjs` 在源码层钉住。
 *   - 付费/资金侧越权（orderId 跨用户碰撞）由 `WalletDeductOrderIdTest` 钉。
 */

const API_BASE = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:8080/api/';
const IS_REAL_STACK = process.env.E2E_API_MODE === 'real';

test.skip(!IS_REAL_STACK, '越权判点必须走真实 Spring Security，仅在 E2E_API_MODE=real 下运行');

async function guestToken(api: Awaited<ReturnType<typeof request.newContext>>): Promise<string> {
  const login = await api.post('v1/auth/guest-login');
  expect(login.status(), await login.text()).toBe(200);
  const body = await login.json();
  const token: string | undefined = body.token ?? body.data?.token;
  expect(token, 'guest-login 必须返回会话 token').toBeTruthy();
  return token as string;
}

test.describe('@flow-403 越权访问拒绝', () => {
  test('匿名请求是 401，而不是被降级成 403', async () => {
    const api = await request.newContext({ baseURL: API_BASE, timeout: 30_000 });
    try {
      const anonymousUserScoped = await api.get('v1/profile/me');
      expect(anonymousUserScoped.status(), await anonymousUserScoped.text()).toBe(401);

      const anonymousAdminScoped = await api.get('v1/admin/whispers?page=1&size=10');
      // 未认证的请求应停在认证层（401）；若返回 403，说明匿名请求被当成
      // "已认证的无权限账号"处理，认证与授权两层职责就混成一团了。
      expect(
        anonymousAdminScoped.status(),
        `匿名打管理端点：${await anonymousAdminScoped.text()}`,
      ).toBe(401);
    } finally {
      await api.dispose();
    }
  });

  test('普通 USER token 打管理端点一律 403，且不泄露任何业务数据', async () => {
    const api = await request.newContext({ baseURL: API_BASE, timeout: 30_000 });
    try {
      const token = await guestToken(api);
      const headers = { Authorization: `Bearer ${token}` };

      // 悄悄话是 v3.1 的审核红线对象（含正文）；本轮 S3-7 刚把它接上作用域轴，
      // 角色轴这一层必须在 HTTP 上真的挡住。
      for (const path of ['v1/admin/whispers?page=1&size=10', 'v1/admin/users?page=1&size=10']) {
        const denied = await api.get(path, { headers });
        const body = await denied.text();
        expect(denied.status(), `${path} ⇒ ${body}`).toBe(403);
        // 负判据：403 的响应体不得夹带列表数据（一旦将来序列化顺序改变或拦截器放行，这里会红）
        expect(body, `${path} 被拒后不得返回业务内容`).not.toContain('records');
        expect(body, `${path} 被拒后不得返回业务内容`).not.toContain('totalElements');
      }

      // 同一 token 打自己该能读到的端点仍是 200——否则上面的 403 可能只是"整个服务挂了"
      const selfRead = await api.get('v1/profile/me', { headers });
      expect([200, 404].includes(selfRead.status()), await selfRead.text()).toBe(true);
    } finally {
      await api.dispose();
    }
  });

  test('USER token 也不能用 DELETE 绕过角色轴（删除与列表同一条 @PreAuthorize）', async () => {
    const api = await request.newContext({ baseURL: API_BASE, timeout: 30_000 });
    try {
      const token = await guestToken(api);
      // id 取一个必然存在的正数：判点是"被角色轴拦下"，不是"记录不存在"。
      // 若角色校验被误删，这条请求会走到作用域校验/删除逻辑，得到 403（跨校区）或 200/404，
      // 三者都不是这里期望的"因角色被拒"，用例即红。
      const denied = await api.delete('v1/admin/whispers/1', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await denied.text();
      expect(denied.status(), body).toBe(403);
    } finally {
      await api.dispose();
    }
  });
});
