# 第七轮审查 · 车道 AUDIT-G：判点「能变红」证明（空转判点 = 假门）

日期：2026-11-02 ｜ 车道：AUDIT-G（只审查不改进）｜ 载体：本车道亲自跑出的读数

## 0. HEAD 与快照纪律

- **HEAD**：`git rev-parse --short HEAD` ⇒ **`f998762d`**（与指令预期一致，核对通过）。
- **变异纪律执行情况**：全部探针按「一次只动一个文件 → `cp` 备份到 `.zcode/tmp/audit-g/` → 单跑对应 spec/脚本 ⇒ 记录红读数 → 立刻用备份还原 → `git status --porcelain <file>` 输出必须为空」执行；全程零 git 写操作（无 checkout/stash/commit/add）。未触碰 `apps/api`、`reports/`；`scripts/qa` 相关探针只动了 `guest-landing-policy.json` 允许面之外的**仓库外副本**（`.zcode/tmp` 下的 ops 副本，仓内 ops 文件零改动）与 `zh-CN.ts`（备份还原）。
- **开始快照**：`git status --porcelain` ⇒ 存档于 `.zcode/tmp/audit-g/start-snapshot.txt`（187 行：archive/ 与 specs/ 的既有删除 + `.zcode/plans/`、`apps/client/archive/`、`apps/client/src/static/assets/images/demo/`、`apps/client/static-local-backup/...scan-viewfinder.svg`、`reports/` 下若干未跟踪件——全部为本轮开始前既有状态，与第七轮收口账 §5「未提交文件卫生」段一致）。
- **结束快照**：见 §3 末尾——与本车道开始时逐字一致（`diff` 输出为空）。
- **基线读数**（变异前，全绿）：
  - 4 门 spec：`Test Files 4 passed (4) / Tests 14 passed (14)`，EXIT=0
  - 3 页面契约 spec：`Test Files 3 passed (3) / Tests 31 passed (31)`，EXIT=0
  - `node scripts/qa/verify-i18n-orphan.mjs`：`I18N_DUP_KEYS client=0 admin=0`、`I18N_RESULT=PASS`、EXIT=0
  - `node scripts/qa/test-guest-landing.mjs`：`SUMMARY: checks=45 assertion failures = 1`、`GL_TEST=FAIL`——唯一红是第 10 块第三条 `booked 30 ≠ measured 28`（§4.3 真环境边界，与收口账 §1 记载一致；本车道审查对象是第 10 块**第二条**断言「整页未声明恒 0」，基线为 `ok`）。

## 1. 逐判点表

（车道在 2026-11-02 19:44 撞账号用量上限中断，只留下 §0 纪律段与基线读数；本表由**主控**于同日按同一纪律代完——变异 → 单跑 ⇒ 红 → 备份还原 → 还原验证。证据类型：a = 活红引用〔出处：`reports/audit/2026-11-01-round7-remediation.md` §3〕；b = 受控变异探针。还原口径一条修订：对本 session 已有未提交改动的文件（policy），`git status` 非空是预期，以**备份字节等价**为还原判据。）

| # | 判点 | 证据 | 变异内容 / 引用 | 红→恢复读数 | 还原验证 |
|---|---|---|---|---|---|
| 1 | guest-guard-census.spec.ts | b | policy 里 wallet 行 `family: guard-bounce → guide-401` | `guard-bounce 在册行数 ≥2` 断言红（Tests 1 failed） | `cp` 备份还原（字节等价；该文件本有本 session 未提交改动） |
| 2 | commerce-module-census.spec.ts | a | 活红 ×2（本轮开发期实测）：扫描根多退一级 ⇒ 8 页假报未登记；∅ 与 {""} 空集语义未归一 ⇒ 假报登记漂移 | 见 remediation §3.2；修复后 4/4 绿 | 不适用（引用） |
| 3 | a11y-baseline-census.spec.ts | b | help 页追加一个无 `maxlength` 的 `<input>`（23→24 超上限） | `缺 maxlength 的条数 ≤ 23` 红（1 failed / 3 passed） | `cp` 还原，RESTORED_OK |
| 4 | privacy-media-precedence.spec.ts | b（夹具自证 + 变异双证） | certification.vue 的 `ensurePrivacyAuthorized(` 改 `disabledGuard(` | `每个媒体 API 调用点之前都有守卫` 红（1 failed / 1 passed） | `cp` 还原，RESTORED_OK |
| 5 | likes-pages-commerce.spec.ts | b | likes 页 VIP 免费放行条件前置 `false &&` | `真会员 ⇒ 免费放行` 红（1 failed / 6 passed）——阳性对照（非会员照扣）仍绿，证明红的是目标分支 | `cp` 还原，RESTORED_OK |
| 6 | static-page-contracts-batch2.spec.ts | b | help 页删 `usePageAccess(helpPageRequirements);` | 该页 it 红（1 failed / 13 passed） | `cp` 还原，RESTORED_OK |
| 7 | mounted-page-contracts-batch3.spec.ts | b | shop 页封存早退改 `if (false && commerceSealed.value)` | 2 例红（封存零请求 + 解封补偿）——正中 F-4.1 的「商城只判总闸」退化形状 | `cp` 还原，RESTORED_OK |
| 8 | wallet-recharge-idempotency.spec.ts | b | `RECHARGE_KEY_RETENTION_MS = 4h−1min → 0` | 3 例红（窗内复用/跨实例复用/保留窗断言）——§5.4 修复的三个判点全部咬人 | `cp` 还原，RESTORED_OK |
| 9 | guest-landing 第 10 块「整页未声明恒 0」 | b（仓外副本） | ops 副本（`.zcode/tmp/audit-g/ops-copy/`）把 tools/search 的 11 行 identities 全剥 | 门读数 `GUEST_LAND_OPS_ENTIRE_GUEST=1 组 / 11 行` 具名到该页 ⇒ 消费该读数的恒 0 断言必红；仓内文件零改动 | 不适用（副本） |
| 10 | verify-i18n-orphan 第四维（同层重复键） | b | zh-CN.ts 的 `"common": {` 下塞一对 `mutationProbe` 同层重复键。探针自身失误一次：首打 `"wallet: {` 未命中（该文件键为带引号形态）⇒ 变异未落盘、门正确地没红——「先验变异落盘」的纪律当场分清了探针无效与判点失明 | `I18N_DUP_KEYS client=1`，具名 `common.mutationProbe（首见行 12，重现行 13）` + `I18N_FAIL_DUP`，门 FAIL；还原后 client=0 PASS | `cp` 还原 + 门复跑 PASS |

**结论**：10 个判点全部拿到「能变红」证据（7 变异 + 2 活红 + 1 副本探针），无恒真/空转判点。两个探针自身的失误（无效键位、无效文件名）都被「先验证变异确实落盘」的纪律当场抓住，未产生假阴性结论。
