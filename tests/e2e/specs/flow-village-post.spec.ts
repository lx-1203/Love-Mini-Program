import { expect, request, test, type Page } from '@playwright/test';
import {
  API_BASE,
  byRoleLabel,
  fillable,
  gotoRoute,
  hashPath,
  loginAsMockUser,
  toastWithText,
  waitForHash,
} from '../flow-helpers';

/**
 * 流程 2：村口发帖主流程（@core-journey @village-post）。
 *
 * <p>标题长度闸的真值源（逐条核过）：</p>
 * <ul>
 *   <li>服务端：apps/api/.../village/VillagePostService.java:52-55
 *       POST_TITLE_MIN_LENGTH=5 / POST_TITLE_MAX_LENGTH=30，:262-265 越界即
 *       IllegalArgumentException → HTTP 400（GlobalExceptionHandler.java:126）；
 *       DTO 侧另有 CreatePostRequest.java:17 `@Size(min = 5, max = 30)` →
 *       ConstraintViolationException → 400（GlobalExceptionHandler.java:405-417）。</li>
 *   <li>客户端：apps/client/src/constants/village.ts:21,24 同名同值常量，
 *       发布页 publish.vue:747-753 用 `content.trim().length < POST_TITLE_MIN_LENGTH` 拦，
 *       :754 用 `.slice(0, POST_TITLE_MAX_LENGTH)` 由正文前 30 字生成标题。</li>
 * </ul>
 *
 * <p><b>在册缺口（务必读）</b>：mock 档发帖走 stores/village/index.ts:484-517 的
 * `if (useMock())` 早退分支——本地造一条 PostItem 直接 unshift，
 * <b>压根不发 POST /v1/posts</b>（载具也没有后端：playwright.config.ts 的 webServer
 * 只起 H5 dev server）。所以 mock 档这四条钉的是客户端闸与本地建帖闭环；
 * 服务端 5–30 那一档在下面 real 档用例里钉（门控口径同
 * specs/real-stack-smoke.spec.ts:26-29）。另一处已知不可证：标题 = 正文前 30 字
 * 的截断结果（publish.vue:754）在 mock 档无从观测——PostCard 只渲染正文
 * （components/village/PostCard.vue:71），列表里读不到 title 字段。</p>
 */

const PUBLISH_ROUTE = '/subpackages/village/village/publish';
const VILLAGE_ROUTE = '/subpackages/village/village/index';

/** 唯一且落在 5–30 区间内的正文（4 个汉字 + 5 位数字 = 9 字）。 */
function uniqueContent(): string {
  return `村口E2E${Date.now() % 100_000}`;
}

async function openPublishPage(page: Page): Promise<void> {
  await loginAsMockUser(page);
  await gotoRoute(page, PUBLISH_ROUTE);
  await expect(page.locator('.publish-page').first()).toBeVisible({ timeout: 20_000 });
}

test.describe('村口发帖主流程 @core-journey @village-post', () => {
  test('正文不足 5 字时客户端标题闸拦下发布，不产生帖子 @core-journey @village-post', async ({
    page,
  }) => {
    // Arrange
    await openPublishPage(page);
    const editor = fillable(page, 'publish-content__input');
    await expect(editor, '发布页应渲染正文输入框（publish.vue:45-53）').toBeVisible();

    // Act：2 字正文，低于 POST_TITLE_MIN_LENGTH=5
    await editor.fill('你好');
    await byRoleLabel(page, 'button', '发布').tap();

    // Assert 1：命中客户端最小长度闸（village.contentMinLength，zh-CN.ts:1866）
    await expect(toastWithText(page, '正文至少 5 个字再发布哦')).toBeVisible({ timeout: 10_000 });

    // Assert 2：仍停在发布页——submitPublish 在闸处 return，绝不进提交链路
    expect(hashPath(page.url())).toBe(PUBLISH_ROUTE);

    // Assert 3：负判据——成功必然离页并弹「已提交」，两者此处都不许出现
    await expect(toastWithText(page, '已提交，审核通过后展示')).toHaveCount(0);
  });

  test('空正文点发布被必填闸拦下 @village-post', async ({ page }) => {
    // Arrange
    await openPublishPage(page);

    // Act：只输入空白字符（content.trim() 为空）
    await fillable(page, 'publish-content__input').fill('   ');
    await byRoleLabel(page, 'button', '发布').tap();

    // Assert：village.contentRequired（zh-CN.ts:1867「请输入内容」）
    await expect(toastWithText(page, '请输入内容')).toBeVisible({ timeout: 10_000 });
    expect(hashPath(page.url())).toBe(PUBLISH_ROUTE);
  });

  test('正文恰好 5 字（POST_TITLE_MIN_LENGTH 下界）必须放行 @village-post', async ({ page }) => {
    // Arrange：与上一条构成分界对偶，钉住校验是 `< 5` 而不是 `<= 5`（publish.vue:747）
    await openPublishPage(page);
    await fillable(page, 'publish-content__input').fill('刚好五字帖');

    // Act
    await byRoleLabel(page, 'button', '发布').tap();

    // Assert：走到成功出口（village.postSuccess），而不是最小长度 toast
    await expect(toastWithText(page, '已提交，审核通过后展示')).toBeVisible({ timeout: 15_000 });
    await expect(toastWithText(page, '正文至少 5 个字再发布哦')).toHaveCount(0);
    await waitForHash(page, VILLAGE_ROUTE, 15_000);
  });

  test('合规标题（5–30 字）发布成功，帖子进入村口信息流 @core-journey @village-post', async ({
    page,
  }) => {
    // Arrange
    await openPublishPage(page);
    const content = uniqueContent();
    const editor = fillable(page, 'publish-content__input');
    await editor.fill(content);

    // Assert 0：字数计数器上限与 store 同源（publish.vue:56-60，MAX_CONTENT_LENGTH=500）
    await expect(page.locator('.publish-content__count').first()).toHaveText(
      `${content.length}/500`,
    );

    // Act
    await byRoleLabel(page, 'button', '发布').tap();

    // Assert 1：成功 toast（village.postSuccess，zh-CN.ts:1857）
    await expect(toastWithText(page, '已提交，审核通过后展示')).toBeVisible({ timeout: 15_000 });

    // Assert 2：400ms 后自动离页回到村口（publish.vue:838-842 navigateAway）
    await waitForHash(page, VILLAGE_ROUTE, 15_000);

    // Assert 3：新帖确实进了信息流（PostCard 正文节点，PostCard.vue:71）
    await expect(
      page.locator('.post-card__content', { hasText: content }).first(),
      'mock 档 createPost 应把新帖 unshift 进村口列表（stores/village/index.ts:512）',
    ).toBeVisible({ timeout: 20_000 });
  });
});

test.skip(
  process.env.E2E_API_MODE !== 'real',
  '服务端 5–30 字标题闸只有真实栈（E2E_API_MODE=real）可证：mock 档 stores/village/index.ts:484 早退，不发 HTTP',
);

test.describe('村口发帖：服务端标题闸（真实栈） @village-post', () => {
  test('POST /v1/posts：4 字与 31 字标题必须 400，合规标题必须 200 @core-journey @village-post', async () => {
    const api = await request.newContext({ baseURL: API_BASE, timeout: 30_000 });
    try {
      // 游客登录拿 USER token（VillageController.java:155 @PreAuthorize("hasRole('USER')")）
      const login = await api.post('v1/auth/guest-login');
      expect(login.status(), await login.text()).toBe(200);
      const loginBody = await login.json();
      const token: string | undefined = loginBody.token ?? loginBody.data?.token;
      expect(token, 'guest-login 必须返回 token').toBeTruthy();
      const headers = { Authorization: `Bearer ${token}` };

      const payload = (title: string) => ({
        title,
        content: 'E2E 真实栈标题闸校验正文',
        category: 'all',
        tags: [],
        images: [],
        targetType: 'general',
      });

      // 1) 4 字：低于 CreatePostRequest @Size(min=5) / VillagePostService.POST_TITLE_MIN_LENGTH
      const tooShort = await api.post('v1/posts', { headers, data: payload('四个字啊') });
      expect(tooShort.status(), await tooShort.text()).toBe(400);

      // 2) 31 字：高于 @Size(max=30) / POST_TITLE_MAX_LENGTH
      const tooLong = await api.post('v1/posts', { headers, data: payload('标'.repeat(31)) });
      expect(tooLong.status(), await tooLong.text()).toBe(400);

      // 3) 8 字：区间内，必须建帖成功
      const ok = await api.post('v1/posts', {
        headers: { ...headers, 'Idempotency-Key': `e2e-post-${Date.now()}` },
        data: payload('村口真实栈校验'),
      });
      expect(ok.status(), await ok.text()).toBe(200);
      const created = await ok.json();
      const postId = created.data?.id ?? created.id;
      expect(String(postId ?? ''), '建帖响应必须带回帖子 ID').not.toBe('');
    } finally {
      await api.dispose();
    }
  });
});
