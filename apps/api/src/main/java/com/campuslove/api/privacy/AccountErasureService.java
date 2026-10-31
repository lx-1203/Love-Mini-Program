package com.campuslove.api.privacy;

import com.campuslove.api.common.TimeZones;
import com.campuslove.api.entity.User;
import com.campuslove.api.media.MediaStorageService;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 账号注销（账户清除）的唯一执行路径——PIPL 第 47 条「删除权」的服务端实现。
 *
 * <p>与 {@link PersonalDataTables} 的关系：清单声明「删什么、怎么删、为什么不删」，
 * 本类只负责<b>按清单逐条执行</b>。新增一类数据只需在清单里加一项，不需要动本类，
 * 也不可能出现「清单有、代码没实现」（{@code everyActionableEntryExecutesAtLeastOneStatement}
 * 与 {@code registryCoversEveryExportCategory} 两条断言把这件事钉在测试里）。</p>
 *
 * <p><b>为什么全用原生 SQL 而不是 JPA</b>：主体的数据横跨 40+ 张表，其中相当一部分没有实体
 * （media_asset、interaction_events、payment_callback_log……）；更重要的是，用 JPA 就得
 * 先把行 load 成托管实体再 save，而 {@code User} 等实体没有 {@code @DynamicUpdate}，
 * Hibernate 会在提交时<b>整行回写所有列</b>——那会把我们刚删掉/墓碑化的值又写回旧值，
 * 即「注销把数据复活」。原生语句 + 一条 users 实体墓碑写（列值由本类显式设置）不存在这个问题。</p>
 *
 * <p><b>幂等</b>：每条语句都是「DELETE ... WHERE 归属列 = uid」或「UPDATE ... SET 常量」，
 * 第二次执行影响 0 行、不抛异常；users.openid 每次生成新 UUIDv4，唯一约束照样满足。
 * 因此部分失败（前一条已提交、后面炸了）之后重新调用即可补齐——不会出现
 * 「昵称已经是已注销用户，于是直接 return，身份证还留在库里」的旧行为。</p>
 *
 * <p><b>事务</b>：{@link #erase(Long)} 标 {@code @Transactional}，任一条语句失败整体回滚，
 * 不留半注销状态。对象存储文件的物理删除<b>不在</b>事务里（文件系统无回滚），
 * 通过 {@link TransactionSynchronization#afterCompletion(int)} 只在提交成功后执行，
 * 避免「事务回滚、文件已经没了」导致数据指向不存在的对象。</p>
 *
 * <p><b>哪些后台任务可能与注销竞态（以及本类怎么应对）</b>：</p>
 * <ol>
 *   <li>{@code TempChatCleanupService#cleanupExpiredSessions}（每小时整点）与
 *       {@code cleanupRetainedMaterials}（每小时 30 分）：它们 UPDATE/DELETE 临时会话。
 *       本类已把会话整行删掉，任务再扫到同一批只是 0 行；若任务在注销前已 load 出实体、
 *       注销后才 flush，Hibernate 的 UPDATE 命中 0 行（可能抛乐观锁异常，被任务自身的
 *       try/catch 吞掉）——<b>不会把会话写回来</b>，因为 MySQL 的 UPDATE 不隐式插入。</li>
 *   <li>{@code RealRealNameCertificationService#purgeExpiredCertificationPhotos}（每日 04:30）：
 *       它 UPDATE real_name_certifications 的照片 URL；本类已 DELETE 该表，同样 0 行、不复活。
 *       照片文件的删除已由本类在提交后接管，与该任务不冲突。</li>
 *   <li>{@code AutoRenewService}（每 6 小时，扫描 {@code findByAutoRenewEnabledTrue()}）：
 *       这是<b>真正会写新行</b>的任务（续费产生 vip_order / vip_bills 并扣款）。
 *       墓碑写把 {@code auto_renew_enabled} 置 false，扫描条件不再命中——所以必须在同一次
 *       注销里做，不能等运营补。</li>
 *   <li>{@code MessageProducer} 的 outbox 补偿投递（fixedDelay 30s）+
 *       {@code NotificationConsumer#handleNotification}：outbox_event 没有 user_id 列，
 *       注销无法定向清除；消费者按消息里的 userId 直接 INSERT notifications，
 *       <b>确实可能在注销之后再补出一条通知行</b>。本类的应对是「可重跑」：
 *       再调用一次 erase 即清干净；根治需要消费者按 status=deactivated 短路，
 *       属另一条改动（见交付说明的 NOT VERIFIED / 后续建议）。</li>
 *   <li>{@code VipOrderService} 超时关单、{@code HotScoreScheduler} 热度重算：
 *       只对保留的财务行/帖子做 UPDATE，不写主体身份列，与注销顺序无关。</li>
 * </ol>
 */
@Profile("real")
@Service
public class AccountErasureService {

    private static final Logger log = LoggerFactory.getLogger(AccountErasureService.class);

    /** 清单 SQL 里的主体 ID 占位符。 */
    private static final String UID_PLACEHOLDER = "{uid}";

    private final JdbcTemplate jdbcTemplate;
    /** 媒体存储（对象/本地文件删除）；未装配时只删库里的 URL 引用，不影响注销成功。 */
    private final ObjectProvider<MediaStorageService> mediaStorageProvider;

    public AccountErasureService(JdbcTemplate jdbcTemplate,
                                 ObjectProvider<MediaStorageService> mediaStorageProvider) {
        this.jdbcTemplate = jdbcTemplate;
        this.mediaStorageProvider = mediaStorageProvider;
    }

    /**
     * 一次注销清除的产出。
     *
     * @param statements 实际执行的 SQL 条数
     * @param rowsAffected 累计影响行数（幂等复跑时为 0）
     * @param fileUrls 事务提交后被物理删除的对象存储 URL 清单
     */
    public record ErasureResult(int statements, int rowsAffected, List<String> fileUrls) {
    }

    /**
     * 按 {@link PersonalDataTables#INVENTORY} 清除该主体的全部关联数据（不含 {@code users} 行的身份列，
     * 那部分必须走 {@link #tombstone(User)} 的 JPA 写）。
     *
     * @param userId 主体用户 ID（非空）
     * @return 执行统计（含提交后待删文件清单）
     */
    @Transactional
    public ErasureResult erase(Long userId) {
        if (userId == null) {
            throw new IllegalArgumentException("注销主体 userId 不可为空");
        }
        List<String> fileUrls = new ArrayList<>();
        int statements = 0;
        int rows = 0;
        for (PersonalDataTable table : PersonalDataTables.INVENTORY) {
            // 先取文件 URL：语句一旦执行，行就不在了，再无可能定位到对象存储里的文件
            for (String selectSql : table.fileUrlSelects()) {
                fileUrls.addAll(collectNonBlank(selectSql, userId));
            }
            for (String sql : table.statements()) {
                String expanded = sql.replace(UID_PLACEHOLDER, "?");
                Object[] args = repeatUserId(userId, countPlaceholders(expanded));
                rows += jdbcTemplate.update(expanded, args);
                statements++;
            }
        }
        purgeFilesAfterTransactionCommit(fileUrls);
        log.info("账号注销数据清除完成: userId={}, 语句数={}, 影响行数={}, 待删文件数={}",
                userId, statements, rows, fileUrls.size());
        return new ErasureResult(statements, rows, List.copyOf(fileUrls));
    }

    /**
     * 写 {@code users} 墓碑：把清单 {@code users} 项声明的每个身份列在<b>托管实体</b>上置成
     * {@link ErasedValues} 里的常量（未映射的 JSON 列由 {@link #erase(Long)} 的原生语句负责）。
     *
     * <p>必须由调用方（注销主流程）在 {@code userRepository.save(user)} 之前调用，
     * 且只在实体上写：{@code users} 的其余列会被 Hibernate 整行回写，
     * 若改用原生 SQL 写 users，回写会把旧值还原（见类注释）。</p>
     *
     * @param user 已加载的托管用户实体
     * @return 本次写出的墓碑 openid（供日志/测试断言唯一性）
     */
    public String tombstone(User user) {
        String erasedOpenid = ErasedValues.erasedOpenid();
        user.setOpenid(erasedOpenid);
        user.setNickname(ErasedValues.NICKNAME);
        user.setAvatarUrl(null);
        user.setBio(null);
        user.setGradeLabel(null);
        user.setPronouns(null);
        // 手机号列的唯一「已注销」表示：NULL，不是任何含 userId 的哨兵（见 PhoneColumnCodec）
        user.setPhone(PhoneColumnCodec.ERASED_VALUE);
        user.setBirthDate(null);
        user.setCampusName(null);
        user.setCirclePath(null);
        // 凭据与登录面：密码散列销毁后，任何「知道旧手机号」的人都无法再通过密码路径回来
        user.setPassword(null);
        user.setLatitude(null);
        user.setLongitude(null);
        user.setGeoUpdatedAt(null);
        user.setRole("USER");
        user.setStatus("deactivated");
        // 防复活：AutoRenewService 的扫描条件是 auto_renew_enabled=true
        user.setAutoRenewEnabled(false);
        user.setProfileCompletion(0);
        user.setFollowingCount(0);
        user.setFollowersCount(0);
        user.setUpdatedAt(LocalDateTime.now(TimeZones.BUSINESS));
        return erasedOpenid;
    }

    /** 墓碑 openid 生成（供单测与日志）。 */
    public static String newTombstoneOpenid() {
        return ErasedValues.erasedOpenid();
    }

    // ---- 私有 ----

    private List<String> collectNonBlank(String selectSql, Long userId) {
        String expanded = selectSql.replace(UID_PLACEHOLDER, "?");
        List<String> values = jdbcTemplate.queryForList(expanded, String.class,
                repeatUserId(userId, countPlaceholders(expanded)));
        List<String> kept = new ArrayList<>(values.size());
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                kept.add(v);
            }
        }
        return kept;
    }

    /**
     * 事务提交成功后再删文件；当前线程没有活动事务时（单测直连、脚本调用）立即执行。
     */
    private void purgeFilesAfterTransactionCommit(List<String> fileUrls) {
        if (fileUrls.isEmpty()) {
            return;
        }
        MediaStorageService storage = mediaStorageProvider == null
                ? null : mediaStorageProvider.getIfAvailable();
        if (storage == null) {
            log.warn("媒体存储未装配，{} 个注销主体的文件仅清除了库内引用（对象存储需运营侧兜底清理）",
                    fileUrls.size());
            return;
        }
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            purgeQuietly(storage, fileUrls);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                purgeQuietly(storage, fileUrls);
            }
        });
    }

    /** 单文件删除失败只记日志：注销的库内清除已经提交，不能因对象存储抖动而回滚/报错。 */
    private void purgeQuietly(MediaStorageService storage, List<String> fileUrls) {
        for (String url : fileUrls) {
            try {
                storage.delete(url);
            } catch (RuntimeException ex) {
                log.warn("注销后删除主体文件失败（库内引用已清除，不影响注销结果）: {}", ex.getMessage());
            }
        }
    }

    private static int countPlaceholders(String sql) {
        int count = 0;
        for (int i = 0; i < sql.length(); i++) {
            if (sql.charAt(i) == '?') {
                count++;
            }
        }
        return count;
    }

    private static Object[] repeatUserId(Long userId, int count) {
        Object[] args = new Object[count];
        java.util.Arrays.fill(args, userId);
        return args;
    }
}
