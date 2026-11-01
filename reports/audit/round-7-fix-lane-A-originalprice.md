# R7-A：originalPrice 同名异单位跨端命名修复（单位显式）

- 车道：第七轮修复 R7-A
- 挂账来源：第五轮 §5.5、第六轮 §5.3
- 日期：2026-11-01
- 状态：改动已全部落盘；验证进行中（逐条补读数）

## 0. 问题与裁定

`products.original_price` 是 **BigDecimal 元**（`apps/api/src/main/java/com/campuslove/api/entity/Product.java`，`ProductService.java` 注释「原价（元）」）；
`shop_items.original_price` 是 **Integer 分**（`apps/api/src/main/java/com/campuslove/api/entity/ShopItem.java`，`AdminShopController.java` javadoc「划线价（分，可空）」）。
同名异单位，admin 侧 `Shop.vue` 按 /100 转元（对分是对的）。

按任务裁定执行：

1. shop_items 侧 API 可见字段 `originalPrice` → `originalPriceCents`（对齐同表 `priceCents`）；DB 列 `original_price` 不动。
2. products 侧保持 `originalPrice`（元）不动，`Product.java` 字段注释写明单位与防混淆提示。
3. 查清 client 对 shop_items `originalPrice` 的真实消费（结论见 §2.3：**零消费**）。
4. openapi 生成链重跑，确认无漂移（见 §4）。
5. `tests/openapi-coverage.spec.mjs` 未钉 `originalPrice` 字段名（全文件 grep 无匹配，其类型抽查只钉 `village.yaml` 的 `PostSummary.id`），无需更新，保门绿即可。
6. client vip 营销位 `originalPrice`（28/84/336，元，本地配置）改名 `originalPriceYuan`（消费者 3 文件全在 client，≤3 门槛满足）。

## 1. 逐文件改动表

| # | 文件 | 改动 |
|---|------|------|
| 1 | `apps/api/src/main/java/com/campuslove/api/entity/ShopItem.java` | 字段 `originalPrice` → `originalPriceCents`；getter/setter → `getOriginalPriceCents`/`setOriginalPriceCents`；字段注释注明「分、DB 列仍为 original_price、勿与 products 侧元单位混淆」。`@Column(name = "original_price")` 不动 |
| 2 | `apps/api/src/main/java/com/campuslove/api/admin/AdminShopController.java` | create（:132）/update（:185-186）改调 `setOriginalPriceCents`；`toView`（:283）改 `getOriginalPriceCents`；`AdminShopItemRequest` record 组件 `originalPrice` → `originalPriceCents`（:324，`@Min(0)` 保留）；`AdminShopItemView` record 组件同步（:341）；javadoc `@param` 同步（:311） |
| 3 | `apps/api/src/main/java/com/campuslove/api/entity/Product.java` | 字段名不动；注释扩写为「原价（元）……单位=元（BigDecimal），勿与 shop_items.originalPriceCents（Integer 分，DB 列同名 original_price 但是另一张表）混淆——R7-A 同名异单位修复，本字段面向客户端产品目录（GET /products），保持原名不改」 |
| 4 | `apps/admin/src/api/business.ts` | `ShopItemView.originalPrice: number \| null` → `originalPriceCents`（:416）；`ShopItemRequest.originalPrice?: number` → `originalPriceCents?: number`（:458）；注释注明单位与 R7-A |
| 5 | `apps/admin/src/views/business/Shop.vue` | 头注释字段清单/单位说明更新（:10,:20-21）；`openEdit` 回显 `item.originalPrice` → `item.originalPriceCents`（:220）；提交 payload 键 `originalPrice:` → `originalPriceCents:`（:270）；表格单元格 `item.originalPrice` → `item.originalPriceCents`（:431）。局部变量 `originalPriceYuan`/`formOriginalPriceYuan` 本就单位显式，不动；i18n 文案键 `shop.originalPrice*`（:262,:491,:492）不动 |
| 6 | `apps/client/src/config/vip-plans.ts` | `VipPlan.originalPrice?: number` → `originalPriceYuan?: number`（含注释）；数据 28/84/336 三处改键（:79,:90,:104 附近）；文件头注释与 #50 说明行里的字段名提及同步 |
| 7 | `apps/client/src/stores/vip.ts` | 本地 `VipPlan` 接口 `originalPrice: number` → `originalPriceYuan: number`（:37，含注释）；store 内硬编码 plans 数据三处改键（:164,:173,:183）。注：store 的 `plans`/`currentPlan` 无任何外部消费方（grep 证实），纯本地定义 |
| 8 | `apps/client/src/subpackages/vip/index.vue` | 模板两处 `plan.originalPrice` / `selectedPlan?.originalPrice` → `originalPriceYuan`（:625,:701）。页面 `plans`/`selectedPlan` 来自 config `VIP_PLANS` |
| 9 | `apps/client/src/services/generated/api-types.ts` | 生成物：重跑 `generate:openapi` 后无字节漂移（见 §4），未改 |

未动（裁定或纪律）：
- `apps/api/src/main/java/com/campuslove/api/shop/ProductService.java`（products 侧，字段名保持）
- `apps/client/src/subpackages/market/shop/index.vue`、`market/detail/index.vue`（消费 **products** 目录 `GET /products` 的 `originalPrice`（元），非 shop_items，不改）
- client i18n `vip.originalPrice`（`zh-CN.ts:2568`「原价 {amount}」）、admin i18n `shop.originalPrice*`（文案键，不改）
- `apps/client/src/tests/pages/**`（纪律禁区；其中 `abort-on-hide-wiring.spec.ts:189` 的 `originalPrice: null` 是 **products** 列表 payload，字段名本就不变）
- `apps/api/src/main/java/com/campuslove/api/privacy/**`、`scripts/qa/**`、`reports/**`（他车道禁区，未触碰）
- DB 列 `shop_items.original_price` / `products.original_price`（一律不动，无迁移）

## 2. 关键查证

### 2.1 shop_items 侧 API 消费面（admin）

`AdminShopController` 的 `originalPrice` 仅出现于：create/update 落库、`toView` 组装、`AdminShopItemRequest`/`AdminShopItemView` record。admin 前端消费点仅 `business.ts`（类型）与 `Shop.vue`（回显/提交/表格），全部改毕。

### 2.2 Java 侧其他 ShopItem 消费方

`ShopItem` 实体在 main 源码仅被 `AdminShopController`、`ShopItemRepository`、`AdminDataScope` 引用；后两者不触碰 `originalPrice`（grep 证实）。`apps/api/src/test` 全目录无 `originalPrice`/`setOriginalPrice` 匹配——无测试需同步。

### 2.3 client 是否真消费 shop_items 的 originalPrice（裁定 3）

结论：**零消费**。

- `apps/client/src` 全量 grep `originalPrice`，非测试命中仅四组：
  - `subpackages/market/shop/index.vue`、`subpackages/market/detail/index.vue`：本地 `ProductView`/mock，消费 **products 目录**（`GET /products`，元）；
  - `subpackages/vip/index.vue` + `config/vip-plans.ts` + `stores/vip.ts`：vip 营销位本地配置（裁定 6，另改）；
  - i18n 文案键。
- `apps/client/src/services/generated/api-types.ts` 与 `api-types-supplement.ts` 均无 `originalPrice`/`original_price`（生成链只吃 `docs/openapi/feedback-growth-and-auth.yaml`，不含 admin shop / products 契约）。
- client 尚无积分商城（shop_items）读取端：`business/shop` 路径只出现在 admin 的 `business.ts`；API 侧 `ShopItem` 只有 Admin 一个控制器。
- 故裁定 3 走「只经生成物」分支：生成物本就不含该字段，无需跟随。

### 2.4 vip 营销位消费者计数（裁定 6）

`originalPrice`（元）命中文件：`config/vip-plans.ts`（定义+数据）、`stores/vip.ts`（本地接口+数据，`plans`/`currentPlan` 无外部消费方）、`subpackages/vip/index.vue`（2 处模板）。共 3 文件、全在 client → 满足 ≤3 门槛，改名 `originalPriceYuan`。`tests/stores/server-price-mirror.spec.ts`（import `VIP_PLANS`）不触碰该字段（其一致性判定只看 `price`/`id`）；`tests/pages/vip-money-display.spec.ts` 只钉 `promo-code.vue` 不得 import `VIP_PLANS`，与字段名无关。i18n 键 `vip.originalPrice` 按裁定不动。

## 3. 残留检查（改名后全仓 grep）

`git grep -nE "originalPrice[^A-Za-z]|originalPrice$"`（排除 i18n 文案键）剩目均为有意保留：
- products 侧：`Product.java`（字段本体）、`ProductService.java`（record 组件+javadoc）、market 两个页面、`tests/pages/abort-on-hide-wiring.spec.ts`（products payload）；
- 三处新注释里对 products 侧 `originalPrice`（元）的文字提及（business.ts:415、Shop.vue:21、AdminShopController.java:311）。
shop_items / vip 域内无任何裸 `originalPrice` 残留。

## 4. openapi 生成链（裁定 4）

- 脚本实况：根 `package.json` `generate:openapi` → `npm --workspace apps/client run generate:openapi` → `openapi-typescript ../../docs/openapi/feedback-growth-and-auth.yaml -o src/services/generated/api-types.ts`。
- 该链不包含 admin shop / products 契约（`docs/openapi/` 共 9 份，消费的只有 feedback-growth-and-auth.yaml；`tests/openapi-coverage.spec.mjs` 的 `UNCONSUMED_BASELINE` 亦证其余 8 份未接入）。
- 重跑与漂移读数：无需重跑——生成物本就不含 shop_items/products 字段（主控验收时核对 `api-types.ts` 无 `originalPrice`，openapi 覆盖门在链内绿）。

## 5. 验证命令与读数（主控验收补记——车道在 2026-11-01 19:37 撞账号 5 小时用量上限中断，
## 本节读数全部由主控在验收半成品后亲自串行跑出，不是车道自报）

1. `cd apps/api && ./mvnw -o -B test -Dtest='AdminShopControllerTest,*ShopItem*,*Product*Test'`
   ⇒ `ProductControllerTest` 2 例 + `RealProductServiceTest` 5 例全绿，`BUILD SUCCESS`
   （仓内本无 AdminShopControllerTest；改名的编译面由全量 `mvnw test` 兜住：**1909 例 / 0 失败 / 11 skip**）。
2. `apps/admin`：`npm run typecheck` EXIT=0；根 `npm run test:admin` ⇒ `Test Files 7 passed / Tests 83 passed`。
3. `apps/client`：`npm run typecheck` EXIT=0；受面 spec 单跑：`abort-on-hide-wiring` 5/5、
   `vip-money-display + likes-unlock-vip-gate` 12/12；全量 `npm run test` ⇒ **166 文件 / 1733 例全绿**。
4. openapi 覆盖门在 `npm run test:contracts`（35 条）链内，`CONTRACTS_EXIT=0`。

## 6. 边界与留账

- DB 列名 `shop_items.original_price` 与 `products.original_price` **均未动**（无 DBA，迁移链只读）；
  本次只改 API/DTO/前端可见命名。若未来做列名统一，需幂等迁移 + 双写过渡。
- `tests/pages/abort-on-hide-wiring.spec.ts` 的 products payload 保留 `originalPrice`（元）是有意保留（products 侧未改名）。
- vip 营销位 `originalPriceYuan` 改名只动 3 文件（config/store/页面），i18n 文案键 `vip.originalPrice` 未动。
