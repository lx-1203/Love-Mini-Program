# 发布档（mp-weixin real）主包体积复现报告 — 2026-10-05

## 目的与结论

复现 decisions-v33 §39 / #10 裁定中「发布形态主包数不可复现」的缺失数字：
当日发布链停在 `verify-env-release`（`.env.real` 为 `http://127.0.0.1:8080/api`，
门要求 HTTPS 且非本机）。本次不改 tracked 的 `.env.real`，新建临时
`apps/client/.env.real.local`（gitignore 的 `*.local` 规则覆盖，不入库）写入
`VITE_API_BASE_URL=https://release-measure.invalid/api` 完成度量，**测后已删除该临时文件**。

**结论：主包 1.42MB（1,487,318 字节），≤ 2MB 上限，`PACKAGE_SIZE_RESULT=PASS`。**

> 说明：`release-measure.invalid` 是不可解析的占位域名，仅用于通过 env 门的
> HTTPS/非本机校验以复现体积；真正提审需在 `.env.real` 配置真实后端域名
> （见 `docs/wechat-submission-materials-checklist.md` 第 2 节）。
> API 基址是字符串常量，占位域名与真实域名字节数差异可忽略（<40B）。

## 执行环境

- 构建：`pnpm -C apps/client build:mp-weixin:real`（已收编为 `scripts/release-chain.mjs` 编排）
- Node：v22.17.0（PATH 上的 v16.13.1 不满足 engines `>=18 <23`；首次尝试在
  node16 下未跑构建，仅确认版本冲突后改用 node22）
- pnpm：11.17.0
- 被测物：`apps/client/dist/build/mp-weixin`
- 产物档位自证：`PACKAGE_SIZE_BAND=MODE:real API:real SHOWCASE:off`

## 体积数字（verify-package-size 口径：主包 = 总包 − app.json 声明的各分包）

| 口径 | 字节 | 换算 | 上限 | 判定 |
| --- | --- | --- | --- | --- |
| **主包** | 1,487,318 B | 1,452.5KB ≈ **1.42MB** | 2.00MB（2,097,152 B） | **PASS** |
| 总包 | 2,560,790 B | 2,500.8KB ≈ 2.44MB | 10.00MB | PASS |
| 分包合计 | 1,073,472 B | 1,048.3KB | — | — |

各分包（KB）：village 189.9 / profile-extra 152.2 / tools 135.2 / circles 112.2 /
campus 95.3 / discover-extra 89.2 / chat 85.2 / vip 47.3 / market 35.9 /
discover 29.9 / setup 60.2 / support 14.8 / legal 1.0。

机读行：`PACKAGE_SIZE_RESULT=PASS（被测物档位见上面的 PACKAGE_SIZE_BAND，只指那一档）`。

## 本轮新增的减负项对数字的影响

1. **showcase 编译期剔除**（`pages.json` 路由 `#ifdef SHOWCASE`，
   `package.json uni-app.scripts.mp-weixin-showcase` define 注入；real 档以
   `--platform mp-weixin` 构建时符号为假，路由剔除）：
   产物自证 `SHOWCASE:off`，`subpackages/setup` 中无 `showcase/index`
   （setup 分包 60.2KB）。
2. **lazyCodeLoading=requiredComponents**：当前 uni alpha 不透传该字段
   （`uni-cli-shared dist/json/mp/pages.js` 的 appJson 白名单只有
   preloadRule/workers/plugins/entryPagePath），由新增
   `scripts/add-lazy-code-loading.mjs` 挂在构建后补写进 app.json；
   字段只影响运行时注入行为，不改变包内字节数（体积影响体现在真机启动注入量）。

## 链路其他环节实测

- `prune-unreferenced-static`：removed 50 files, 312KB, kept(no backend copy): 0
- `strip-mock-for-mp`：mock/en-US 桩化完成，源码已恢复
- `verify-package-size`：无 mp4、en-US 文案无泄漏、mock 数据桩化生效
- 构建期 sass `legacy-js-api` DEPRECATION WARNING 若干（上游 Dart Sass 弃用告警，
  不影响产物，非本轮范围）

## 过程记录（与本报告同时落地的工程改动）

- `build:mp-weixin:real` 的 `&&` 长串收编为 `scripts/release-chain.mjs`：
  prepare-static 动手前对 `src/static` 打快照，链中任一步失败即按
  decisions-v33 §39 派生事项① 原子还原（本轮首次运行在
  `check-tabbar-consistency` 因 pages.json 尾逗号误报失败时未触发还原属
  预期——失败发生在快照点之前，src/static 未被触碰）。
- `check-tabbar-consistency.mjs` 剥注释后容忍尾逗号（pages.json 属 JSONC，
  uni 侧 jsonc-parser 本就容忍；`#ifdef` 块剔除后可能留下尾逗号）。
- `check-project-rules` 446 files 0 errors PASS；`typecheck`（vue-tsc --noEmit）通过。

## 复核方式

```bash
# 复现（需 node>=18；占位域名仅供度量）
printf 'VITE_API_BASE_URL=https://release-measure.invalid/api\n' > apps/client/.env.real.local
pnpm -C apps/client build:mp-weixin:real   # 看 PACKAGE_SIZE_RESULT 行
rm apps/client/.env.real.local             # 测后删除
```
