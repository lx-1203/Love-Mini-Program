/* 实测台账（guest-landing-measured.json）的合并写入判据 —— 纯函数、零 IO。
 *
 * 为什么单独成模块（与 guest-landing-status.mjs 同一个理由）：
 *   verify-guest-landing.mjs 的主流程在 import 期就会跑 buildPlan() 并拿 UI 租约，
 *   测试没法 import 它。守卫要既能被载具调用、又能被负例直接打进参数，
 *   就必须有一个无副作用的落点。
 *
 * 病灶（2026-09-30 01:18 实测，编排方逐字节比对了运行前的具名备份）：
 *   measure 腿在 for 循环【之前】就把 `rows: []` 的空壳写进了权威台账，
 *   随后第一条 clearSession 就抛（cli-automator.mjs:349 ← verify-guest-landing.mjs:271，
 *   `cant find runtimeid by projectpath …mp-weixin-real`），exit 1、0 帧落点，
 *   但台账已经被改写：rows 28→[]、generatedAt 换成崩溃那次的时间戳、repeat 1→3。
 *   ⇒ 一条【没有产出任何证据】的腿把 2026-09-28 real@f0677920 那 28 行测量清光了，
 *     只剩编排方手工备份救回来。这正是本仓已点名的失败族：
 *     "rejection/crash 路径仍然把它自己的报告要读的那些字段填掉了"。
 *
 * 三条硬规矩（判据本身，不含 IO）：
 *   1) 零行 = 不写：本轮没有一行可归属的成功测量 ⇒ 权威台账一个字节都不许动。
 *   2) 合并而不是替换：本轮量到的 groupKey 覆盖同名旧行（复测就是该覆盖），
 *      本轮没量的 groupKey 原样留着 ⇒ 部分成功的腿不被守卫挡住，行数只增不减。
 *   3) 减行必须显式点名：`--allow-shrink SHRINK_ROWS`（SHRINK_TOKEN），
 *      缺令牌 / 拼错 / 裸给 flag 一律拒（照旧走合并），永不默认减行。
 */

/** 台账的行策略：机读字段，报告与人都能据此复核"这本账是不是可减的"。 */
export const ROW_POLICY = "merge-never-shrink";
/** 唯一允许减行的显式令牌。刻意做成"值"而不是布尔 flag：布尔 flag 会被脚本变量、
 *  会被复制粘贴的上一条命令带进来，而一个必须拼对的词是一次可归因的决定。 */
export const SHRINK_TOKEN = "SHRINK_ROWS";

const rowKey = (r) => String((r && r.groupKey) || "").trim();

/** 把"上一本账 + 本轮量到的行"合成下一本账。纯函数：不读文件、不写文件、不看时钟之外的东西。
 *
 *  @param prev      已解析的旧台账（null 表示文件不存在）
 *  @param incoming  本轮【已成功量到】的行数组（量失败时调用方根本不该走到这里）
 *  @param runMeta   本轮运行参数（project/band/repeat/guestCapable/mode/generatedAt）
 *  @param opts      { allowShrink:boolean, shrinkTokenGiven:string }
 *  @returns {write, reason, doc, counts}
 *    write=false 时 doc 必为 null —— 调用方拿到 false 就【不许碰文件】。
 */
export function mergeMeasuredLedger(prev, incoming, runMeta = {}, opts = {}) {
  const allowShrink = opts.allowShrink === true && String(opts.shrinkTokenGiven || "") === SHRINK_TOKEN;
  const prevRows = Array.isArray(prev && prev.rows) ? prev.rows : [];
  const prevHadRowsField = !!(prev && Array.isArray(prev.rows));
  const inc = (Array.isArray(incoming) ? incoming : []).filter((r) => rowKey(r));
  const rejectedNoKey = (Array.isArray(incoming) ? incoming : []).length - inc.length;

  /* 规矩 1：本轮没有任何可归属的行 ⇒ 不写。generatedAt / repeat / band 这些头字段
     跟着一起不动 —— 编排方正是拿 generatedAt 当"文件被谁改写过"的探针用的，
     没有新证据却推进时间戳 = 伪造新鲜度。 */
  if (!inc.length) {
    return {
      write: false,
      doc: null,
      reason: "no-rows-contributed",
      counts: { prevRows: prevRows.length, nextRows: prevRows.length, updated: 0, added: 0, keptFromPrev: prevRows.length, dropped: 0, rejectedNoKey },
    };
  }

  const byKey = new Map();
  for (const r of prevRows) { const k = rowKey(r); if (k && !byKey.has(k)) byKey.set(k, r); }
  const seenKey = new Set();
  let updated = 0, added = 0;
  for (const r of inc) {
    const k = rowKey(r);
    if (seenKey.has(k)) continue;            // 本轮同一组重复：后到的不覆盖先到的（同组两次落点谁都不该冒充谁）
    seenKey.add(k);
    if (byKey.has(k)) updated++; else added++;
    byKey.set(k, r);
  }

  let rows;
  let dropped = 0;
  if (allowShrink) {
    /* 规矩 3：显式点名过的整体替换。丢掉的是旧 groupKey，逐条具名交回调用方打印。 */
    rows = inc.slice();
    dropped = prevRows.filter((r) => !seenKey.has(rowKey(r))).length;
  } else {
    /* 规矩 2：合并。顺序 = 旧账原序（复测就地替换）+ 本轮新增组追加。
       旧账里的行**永远不会**因为"本轮没量到"而消失 —— 那是本次事故的形状。 */
    const ordered = [];
    const placed = new Set();
    for (const r of prevRows) { const k = rowKey(r); if (!k || placed.has(k)) continue; placed.add(k); ordered.push(byKey.get(k)); }
    for (const r of inc) { const k = rowKey(r); if (placed.has(k)) continue; placed.add(k); ordered.push(byKey.get(k)); }
    rows = ordered;
    dropped = 0;
  }

  const base = prev && typeof prev === "object" ? prev : {};
  const doc = Object.assign({}, base, runMeta || {}, {
    rows,
    /* rowPolicy 是新增机读字段：读台账的人必须能看出这本账是"合并不可减"出来的，
       还是"某次显式点名替换"出来的；否则下一次减行就没法归因。 */
    rowPolicy: allowShrink ? "explicit-shrink-" + SHRINK_TOKEN : ROW_POLICY,
    /* lastRun：合并账必然混着不同批次（不同 band / 不同 repeat / 不同 measuredAt）。
       头字段描述【最近一次真正写进行的那趟腿】，混装事实由这里显式说出，
       不许让人把"25 行 2026-09-28 + 3 行今天"读成一次全量复测。 */
    lastRun: {
      at: (runMeta && runMeta.generatedAt) || new Date().toISOString(),
      project: (runMeta && runMeta.project) || null,
      band: (runMeta && runMeta.band) || null,
      repeat: (runMeta && runMeta.repeat) || null,
      rowsWritten: inc.length,
      groupsUpdated: updated,
      groupsAdded: added,
      rowsKeptFromPrevious: rows.length - inc.length,
      rowsDropped: dropped,
      shrinkToken: allowShrink ? SHRINK_TOKEN : null,
      prevHadRowsField,
    },
  });

  return {
    write: true,
    doc,
    reason: allowShrink ? "explicit-shrink" : "merged",
    counts: { prevRows: prevRows.length, nextRows: rows.length, updated, added, keptFromPrev: rows.length - inc.length, dropped, rejectedNoKey },
  };
}

/** 减行令牌的判据（与 ui-lease 的 RECLAIM_CONFIRM 同一口径：拼错/漏了都拒，没有默认值）。 */
export function shrinkRequested(flagValue) {
  const given = String(flagValue === undefined || flagValue === null ? "" : flagValue);
  if (!given) return { requested: false, ok: false, why: "未给 --allow-shrink ⇒ 默认合并，永不减行" };
  if (given === SHRINK_TOKEN) return { requested: true, ok: true, why: "显式点名 " + SHRINK_TOKEN };
  return { requested: true, ok: false, why: "--allow-shrink 的值是「" + given + "」，不是 " + SHRINK_TOKEN + " ⇒ 拒绝减行（宁可不写也不许悄悄清台账）" };
}
