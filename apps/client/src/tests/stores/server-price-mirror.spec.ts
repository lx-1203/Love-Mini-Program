import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { UNLOCK_COST_YUAN, unlockCostCents, unlockCostYuan } from "../../stores/coins";
import { VIP_PLANS } from "../../config/vip-plans";

/**
 * 客户端价格镜像 vs 服务端在册定价（P2 修复，2026-10-31）。
 *
 * 为什么是这个写法：客户端这两份表都是**手抄的服务端镜像**，此前没有任何判点，
 * 于是 `stores/coins.ts` 敢写着 MESSAGE=5 元（注释还声称「与服务端默认价 300 分=3 元对齐」），
 * 而服务端 `app.wallet.price.MESSAGE_UNLOCK` 实际是 **100 分**。调价不需要动前端 ⇒
 * 镜像就会静默漂到与资金口径无关的数字上，而页面拿它向用户报价。
 *
 * 判据来源按服务端**真正声明的地方**取（核过源码，2026-10-31）：
 * - 交友币扣费价：`apps/api/src/main/resources/application.yml` **没有** `app.wallet.price.*`
 *   这些 key（只有 `app.unlock-price.liked-me/visitor`，是 /wallet/unlock 那条链路的服务端定价）；
 *   扣费价的真身在 `apps/api/.../wallet/WalletController.java` 的
 *   `@Value("${app.wallet.price.X:${APP_WALLET_PRICE_X:默认}}")` 里 —— 所以本测解析的是这个，
 *   并同时解析 application.yml：一旦运营把 key 落进 yml（覆盖默认值），判点立刻改吃 yml 的值。
 * - VIP 套餐价：`apps/api/.../vip/VipPlanCatalog.java` 的 DEFAULT_PLANS（Javadoc 自称
 *   「服务端定价唯一真相源，客户端 src/config/vip-plans.ts 仅为展示镜像」）。
 *
 * 没有新依赖：只做正则解析（本仓同类静态判点一贯如此，见 tests/deployment-config.spec.mjs）。
 */

const REPO = resolve(__dirname, "../../../../..");
const CONTROLLER = resolve(
  REPO,
  "apps/api/src/main/java/com/campuslove/api/wallet/WalletController.java",
);
const APP_YML = resolve(REPO, "apps/api/src/main/resources/application.yml");
const CATALOG = resolve(REPO, "apps/api/src/main/java/com/campuslove/api/vip/VipPlanCatalog.java");

const controllerSrc = readFileSync(CONTROLLER, "utf8");
const ymlSrc = readFileSync(APP_YML, "utf8");
const catalogSrc = readFileSync(CATALOG, "utf8");

/**
 * 取 `@Value("${app.wallet.price.KEY:${ENV_KEY:默认}}")` 的服务端默认价（分）。
 * 解析不到就抛 —— 判据不许在读不到依据时假装通过。
 */
function serverValuePriceCents(key: string): number {
  const re = new RegExp(`\\$\\{app\\.wallet\\.price\\.${key}:(?:\\$\\{[A-Z_]+:)?(\\d+)\\}`, "u");
  const m = controllerSrc.match(re);
  if (!m) throw new Error(`WalletController.java 里找不到 app.wallet.price.${key} 的 @Value 声明`);
  return Number(m[1]);
}

/**
 * 取 application.yml 里 `app:` 命名空间下的一个 key（支持 env 占位 `${VAR:默认}`）。
 * 只按**在册层级**匹配（yml 里 app 段之下的 `wallet: price: KEY:` / `unlock-price: liked-me:`），
 * 找不到返回 null（表示该 key 未在配置层覆盖，取 @Value 默认）。
 */
function ymlAppValue(path: string[]): number | null {
  const lines = ymlSrc.replace(/\r\n/g, "\n").split("\n");
  // 定位 `app:` 顶层块（缩进 0）
  const appIndex = lines.findIndex((l) => /^app:\s*$/u.test(l));
  if (appIndex < 0) return null;
  let cursor = appIndex;
  let parentIndent = 0;
  for (const key of path) {
    const needle = key.toLowerCase();
    let found = -1;
    for (let i = cursor + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^\S/u.test(line) && line.trim().length > 0) break; // 出了 app 块
      const m = line.match(/^(\s*)([A-Za-z0-9_.-]+):\s*(.*)$/u);
      if (!m) continue;
      const indent = m[1].length;
      if (indent !== parentIndent + 2) continue;
      if (m[2].toLowerCase() === needle) {
        found = i;
        parentIndent = indent;
        break;
      }
    }
    if (found < 0) return null;
    cursor = found;
    const rest = lines[cursor].slice(lines[cursor].indexOf(":") + 1).trim();
    if (path.indexOf(key) < path.length - 1) continue;
    const num = rest.match(/\d+/u);
    return num ? Number(num[0]) : null;
  }
  return null;
}

/** 服务端对某一 relatedType 的生效价（分）：yml 覆盖优先，否则 @Value 默认。 */
function effectiveUnlockPriceCents(relatedType: string): number {
  const fromYml = ymlAppValue(["wallet", "price", relatedType.toLowerCase().replace(/_/g, "-")]);
  return fromYml ?? serverValuePriceCents(relatedType);
}

/** 场景 → 服务端 relatedType（与 stores/coins.ts 的 UNLOCK_RELATED_TYPE 一一对应） */
const SCENE_TO_RELATED_TYPE: Record<string, string> = {
  MESSAGE: "MESSAGE_UNLOCK",
  VISITORS: "VISITORS_UNLOCK",
  LIKES: "LIKES_UNLOCK",
  WHISPER: "WHISPER_UNLOCK",
};

describe("交友币定价镜像（stores/coins.ts）必须等于服务端在册价", () => {
  it("服务端四条价都能解析出来（判据本身不是空转）", () => {
    for (const relatedType of Object.values(SCENE_TO_RELATED_TYPE)) {
      expect(effectiveUnlockPriceCents(relatedType), relatedType).toBeGreaterThan(0);
    }
    // 在册读数：MESSAGE=100 分（1 元）、VISITORS/LIKES=300 分（3 元）、WHISPER=200 分（2 元）
    expect(effectiveUnlockPriceCents("MESSAGE_UNLOCK")).toBe(100);
  });

  it.each(Object.entries(SCENE_TO_RELATED_TYPE))(
    "%s 的镜像价与服务端 app.wallet.price 一致",
    (scene, relatedType) => {
      const serverCents = effectiveUnlockPriceCents(relatedType as string);
      const clientCents = Math.round(UNLOCK_COST_YUAN[scene as keyof typeof UNLOCK_COST_YUAN] * 100);
      expect(
        clientCents,
        `客户端 ${scene} 镜像 = ${clientCents} 分，服务端 ${relatedType} = ${serverCents} 分 ⇒ 镜像漂移`,
      ).toBe(serverCents);
    },
  );

  it("/wallet/unlock 那条链路的服务端定价（app.unlock-price.*）与 LIKES/VISITORS 镜像一致", () => {
    // LIKES / VISITORS 走 POST /wallet/unlock（服务端配置定价，客户端不传金额），
    // 展示用的镜像必须跟这一档也对得上，否则同一个场景会在两条链路里报两个数。
    const likedMe = ymlAppValue(["unlock-price", "liked-me"]);
    const visitor = ymlAppValue(["unlock-price", "visitor"]);
    expect(likedMe, "application.yml 应声明 app.unlock-price.liked-me").not.toBeNull();
    expect(visitor, "application.yml 应声明 app.unlock-price.visitor").not.toBeNull();
    expect(UNLOCK_COST_YUAN.LIKES * 100).toBe(likedMe);
    expect(UNLOCK_COST_YUAN.VISITORS * 100).toBe(visitor);
  });

  it("展示金额单一来源：服务端实测扣费价优先于镜像表", () => {
    // 资金权威是扣费响应里的 amountCents（WalletDeductView）⇒ 收到过就按它报。
    expect(unlockCostCents("MESSAGE", 100)).toBe(100);
    expect(unlockCostYuan("MESSAGE", 100)).toBe(1);
    // 没收到过才回落镜像表，且回落值与镜像表逐字相等（不另算一遍）
    expect(unlockCostCents("MESSAGE")).toBe(
      Math.round(UNLOCK_COST_YUAN.MESSAGE * 100),
    );
    // 非法/缺省值不得污染报价
    expect(unlockCostCents("MESSAGE", null)).toBe(100);
    expect(unlockCostCents("MESSAGE", 0)).toBe(100);
  });
});

describe("VIP 套餐价格镜像（config/vip-plans.ts）必须等于 VipPlanCatalog 目录价", () => {
  /** 从 `new VipPlanDef("monthly", "月卡", 1800, 30, true)` 里取分价 */
  function catalogPriceCents(planId: string): number {
    const re = new RegExp(
      `new VipPlanDef\\(\\s*"${planId}"\\s*,\\s*"[^"]*"\\s*,\\s*(\\d+)`,
      "u",
    );
    const m = catalogSrc.match(re);
    if (!m) throw new Error(`VipPlanCatalog.java 里找不到套餐 ${planId} 的目录价`);
    return Number(m[1]);
  }

  it("目录三条价都能解析出来", () => {
    for (const planId of ["monthly", "quarterly", "yearly"]) {
      expect(catalogPriceCents(planId), planId).toBeGreaterThan(0);
    }
  });

  it.each(VIP_PLANS.map((p) => [p.id, p] as const))(
    "%s 展示镜像价与目录价一致",
    (_planId, plan) => {
      const cents = Math.round(plan.price * 100);
      expect(
        cents,
        `客户端 ${plan.id} = ${cents} 分，服务端目录 = ${catalogPriceCents(plan.id)} 分`,
      ).toBe(catalogPriceCents(plan.id));
    },
  );

  /**
   * 去注释后的 promo-code 源码。
   *
   * 为什么必须去注释：本页的在册修复说明里**逐字写着** `VIP_PLANS.find(...).price`
   * （「此前正是这么做的」那两段注释）。判据若连注释一起扫，要么恒红、要么被迫删掉
   * 那段说明——两种都是判点失真。剥离口径与本仓 apps/client/vitest.config.ts 的
   * jsonc-strip 插件一致（`(^|[^:])//` 那一支避开 `https://` 这类串内斜杠）。
   */
  function codeOnly(src: string): string {
    return src
      .replace(/\/\*[\s\S]*?\*\//gu, "")
      .replace(/(^|[^:])\/\/.*$/gmu, "$1");
  }

  it("页面上没有任何一处把这份镜像当上送金额（promo-code 的 baseAmount 不得取 VIP_PLANS）", () => {
    const src = readFileSync(
      resolve(REPO, "apps/client/src/subpackages/vip/promo-code.vue"),
      "utf8",
    );
    const code = codeOnly(src);
    // 判**可执行代码**里的用法，不判字符串：注释里写「不再从 vip-plans 取价」是修复说明，不是违规。
    // 反向验证（去掉 codeOnly 即红）说明这条不是靠注释糊过去的空判点。
    expect(code).not.toContain("VIP_PLANS");
    expect(code).not.toMatch(/from\s+["'][^"']*config\/vip-plans["']/u);
    expect(src).not.toMatch(/import\s*\{[^}]*VIP_PLANS[^}]*\}\s*from\s*"[^"]*vip-plans"/u);
    // 输入框不得再被任何常量播种（改前是 String(VIP_PLANS.find(...)) === "48"）。
    // 判点写成「初值必须是空串」这一条正向断言，而不是「初值首字符不许是 )/"'」：
    // 后一种写法放过了 ref<string>("48") —— 那正是 P2 修复前的缺陷形态（硬编码 48 元）。
    expect(src).toMatch(/const orderAmountInput = ref<string>\(""\)/u);
    expect(src).not.toMatch(/orderAmountInput = ref<string>\([^)]*\d/u);
    // 上送的 baseAmount 只能是用户输入换算出来的那一个变量，不许是字面量
    expect(src).toMatch(/baseAmount:\s*orderAmountCents\.value/u);
    expect(src).not.toMatch(/baseAmount:\s*\d/u);
    // 应付金额只能来自服务端字段（finalAmount 是后端契约名），且不得回落本地自算金额。
    // ⚠️ 这三条负向判点必须跑在 code（去注释）上：page 的修复说明里逐字抄了改前那行
    // `payableAmount ?? orderAmountCents.value`，拿 src 判会把自己写的注释判成违规。
    expect(code).toMatch(/\["finalAmount",\s*"payableAmount"\]/u);
    expect(code).not.toMatch(/payableAmount\s*\?\?\s*orderAmountCents/u);
    expect(code).not.toMatch(/discountAmount\s*\?\?\s*0/u);
    // 报价展示位只认服务端下发值：readCentsFromView 读不到就返回 null ⇒ 空串 ⇒ 整行不渲染
    // （在册口径「宁可不显示，不许编」）。把 null 分支改成倒推本地金额即红。
    expect(code).toMatch(/function readCentsFromView/u);
    expect(code).toMatch(/return cents === null \? ""/u);
    expect(code).toMatch(/v-if="codeAvailable && payableYuan"/u);
  });
});
