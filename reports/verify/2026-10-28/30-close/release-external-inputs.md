# 发布外部输入与前置检查（2026-10-28）

> 代码/数据/构建链已收口；真实提审发布仍依赖下列外部输入。它们无法由本仓库伪造，
> 未提供前产物保持 `shippable=no`，不声称真机/提审/发布完成。

## 当前实测缺项

运行 `node scripts/verify-env-release.mjs`：

```text
FAIL:
- VITE_API_BASE_URL 必须为 https（当前 http://127.0.0.1:8080/api）
- VITE_API_BASE_URL 不得指向本机地址（当前 http://127.0.0.1:8080/api）
ENVCHECK_RESULT=FAIL errors=2
```

补充检查（不打印值）：

| 输入 | 当前 | 影响 |
|---|---|---|
| `WX_APPID` | 未配置 | 发布包 AppID 注入缺失；`manifest.json` 内为现有测试号 `wxc67cd233d72388d0` |
| `WECHAT_SECRET` | 未配置 | `wx.login` 换取 session 不可用；本地只能游客/体验号登录 |
| HTTPS API 域名 | 未提供 | 微信合法域名/提审必须 HTTPS；当前 loopback 仅本地联调 |
| `CORS_ALLOWED_ORIGINS` | 未配置 | 生产后台/网页跨域需显式域名 |

## 提供后按此顺序收口

1. `apps/client/.env.real`：
   ```bash
   VITE_API_MODE=real
   VITE_API_BASE_URL=https://<你的域名>/api
   ```
2. 根 `.env`：
   ```bash
   WX_APPID=wx<真实AppID>
   WECHAT_SECRET=<真实小程序密钥>
   CORS_ALLOWED_ORIGINS=https://<后台域名>
   ```
3. 微信公众平台：把 `<你的域名>` 加入 request/socket/uploadFile/downloadFile 合法域名，并配置业务域名。
4. 环境门（必须 PASS）：
   ```bash
   node scripts/verify-env-release.mjs
   ```
5. 发布构建（**不要**带 `--allow-loopback`）：
   ```bash
   PATH="/d/codex-tools/node-v22.17.0-win-x64:$PATH" node apps/client/scripts/release-chain.mjs
   ```
   期望：`RELEASECHAIN_RESULT=PASS` 且 `shippable=yes`；`LOOPBACK_WAIVER.json` 不应作为放行依据。
6. 真机验收：用真实 AppID 打开开发版/体验版，验证 `wx.login`、图片上传、临时会话图片、通知中心与后台登录。
7. 提审材料：按 `docs/wechat-submission-materials-checklist.md` 与 `docs/WECHAT-MINI-PROGRAM-ACCEPTANCE.md` 执行。

## 当前可交付范围

- 本地真实栈（MySQL/Redis/API real/微信开发者工具模拟器/Admin 5177）已验收。
- 本地产物：`apps/client/dist/build/mp-weixin-real`，`shippable=no`；
  可用于模拟器验收，不可用于提审/真机发布。
