-- ============================================================
-- 迁移：task_claim.claim_date 收敛为 NOT NULL（2026-10-30）
-- ============================================================
-- 背景（缺陷：唯一键被可空列击穿）：
--   V2026.08.10.0024 建表时 claim_date 声明为 `DATE NULL`
--   （该文件第 24 行），同时第 26 行又建了
--     UNIQUE KEY uk_task_claim_user_code_date (user_id, task_code, claim_date)
--   InnoDB/MySQL 的唯一索引里任意多个 NULL 彼此不相等，
--   因此所有 claim_date IS NULL 的行完全不受这条唯一约束约束。
--   而写入方 RealTaskService.claim 正是对一次性任务写 NULL
--   （修复前：claim.setClaimDate(def.daily ? today : null)），
--   complete-profile / first-post / campus-verify 三类任务的领取行
--   全都是 NULL —— 这条「防重复领取」的唯一键对它们一直是假护栏。
--   叠加服务层的「先查后写」（existsByUserIdAndTaskCode → saveAndFlush）之间
--   没有任何锁，并发双击可同时通过检查并各插入一行，
--   于是同一任务的奖励被 walletService.recharge 发放两次（重复发奖，可写库）。
--   每日任务（daily-checkin）写当日日期，是唯一真正受约束保护的一类。
--
-- 修复：
--   1) claim_date 改为 NOT NULL（列类型不变，仍是建表 DDL 的 DATE）；
--   2) 写入方对四类任务一律显式落业务时区当日
--      （LocalDate.now(TimeZones.BUSINESS)，与同方法内防重查询用的 today 同一口径），
--      使 uk_task_claim_user_code_date 对四类任务都真正生效；
--   3) 一次性任务的「终身一次」语义不变：仍由不按日期分片的
--      existsByUserIdAndTaskCode 做主校验；claim_date 落当日后，
--      唯一键在其之上补上「同日并发重复领取」的数据库护栏
--      （跨日窗口的极端并发仍需服务层，必要时后续为 task_claim 加悲观锁）。
--
-- 存量数据回填：
--   claim_date IS NULL 的行按行创建时间回填 DATE(created_at)。
--   task_claim 只有 created_at 这一个时间列（建表 DDL 第 25 行
--   `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '领取时间'`），
--   没有 claimed_at / used_at 之类业务时间列，故以 created_at 的日期作为领取日期：
--   领取记录是写入即定型的流水行，created_at 就是领取时刻（同一时区口径下
--   与应用层写入的 today 一致）。
--
-- 安全（重复预检 fail-loud，绝不删行）：
--   回填完成后先数重复组：若 (user_id, task_code, claim_date) 出现多于一次，
--   说明库里已经叠着重复领取行——即历史上很可能真发过重复奖励。
--   本表是奖励账本，迁移绝不 DELETE 静默合并（那等于替运维决定哪笔奖励该收回）。
--   故检测到任何重复组即 SIGNAL 让迁移失败，必须由人工核对、处置重复发奖后重跑。
--   注：MySQL DDL 隐式提交，预检失败时上方 UPDATE 已生效——回填是确定性且语义正确的，
--   重跑时它自然变成无操作，无需回滚。
--   人工定位重复组（迁移失败后执行）：
--     SELECT user_id, task_code, claim_date, COUNT(*) AS cnt, GROUP_CONCAT(id) AS row_ids
--       FROM task_claim
--      GROUP BY user_id, task_code, claim_date
--     HAVING cnt > 1;
--   对照 wallet_transaction_log 中 related_type='TASK_REWARD' 且
--   order_id LIKE 'TASK-{task_code}-{user_id}%' 的流水确认哪笔是重复发奖，
--   处置（冲正/收回）后再重跑本迁移。
--
-- 幂等：回填在列已 NOT NULL 后无匹配行；预检无重复即通过；
--   MODIFY 重复执行同样安全。
--
-- 回滚（手动执行，Flyway 不自动回滚）：
--   ALTER TABLE task_claim MODIFY claim_date DATE NULL;
-- ============================================================

-- 1) 确定性回填：NULL → 行创建时间的日期
UPDATE task_claim
   SET claim_date = DATE(created_at)
 WHERE claim_date IS NULL;

-- 2) 重复预检：命中任何 (user_id, task_code, claim_date) 重复组即中止迁移
DROP PROCEDURE IF EXISTS guard_task_claim_no_duplicate_claim;

DELIMITER $$
CREATE PROCEDURE guard_task_claim_no_duplicate_claim()
BEGIN
    DECLARE v_dup_groups INT DEFAULT 0;

    SELECT COUNT(*) INTO v_dup_groups
      FROM (
        SELECT user_id, task_code, claim_date
          FROM task_claim
         GROUP BY user_id, task_code, claim_date
        HAVING COUNT(*) > 1
      ) AS dup;

    IF v_dup_groups > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = '迁移 V2026.10.30.0002 中止：task_claim 存在 (user_id, task_code, claim_date) 重复组，请人工核对重复发奖后重跑';
    END IF;
END$$
DELIMITER ;

CALL guard_task_claim_no_duplicate_claim();

DROP PROCEDURE IF EXISTS guard_task_claim_no_duplicate_claim;

-- 3) 收敛列定义：NOT NULL（类型与建表 DDL 一致：DATE）
ALTER TABLE task_claim
    MODIFY claim_date DATE NOT NULL COMMENT '领取日期（业务时区当日；四类任务统一非空，唯一键 uk_task_claim_user_code_date 据此防同日重复领取）';
