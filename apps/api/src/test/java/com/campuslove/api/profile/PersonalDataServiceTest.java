package com.campuslove.api.profile;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.AuditLog;
import com.campuslove.api.entity.CampusCertification;
import com.campuslove.api.entity.Comment;
import com.campuslove.api.entity.Like;
import com.campuslove.api.entity.Notification;
import com.campuslove.api.entity.Post;
import com.campuslove.api.entity.PrivateConversation;
import com.campuslove.api.entity.PrivateMessage;
import com.campuslove.api.entity.TaskClaim;
import com.campuslove.api.entity.TempChatMessage;
import com.campuslove.api.entity.TempChatSession;
import com.campuslove.api.entity.User;
import com.campuslove.api.entity.UserBasicProfile;
import com.campuslove.api.entity.UserCampusProfile;
import com.campuslove.api.entity.UserScheduleProfile;
import com.campuslove.api.repository.AuditLogRepository;
import com.campuslove.api.repository.CampusCertificationRepository;
import com.campuslove.api.repository.CheckInRepository;
import com.campuslove.api.repository.CommentRepository;
import com.campuslove.api.repository.HeartSignalRepository;
import com.campuslove.api.repository.LikeRepository;
import com.campuslove.api.repository.NotificationRepository;
import com.campuslove.api.repository.PostRepository;
import com.campuslove.api.repository.PrivateConversationRepository;
import com.campuslove.api.repository.PrivateMessageRepository;
import com.campuslove.api.repository.TaskClaimRepository;
import com.campuslove.api.repository.TempChatMessageRepository;
import com.campuslove.api.repository.TempChatSessionRepository;
import com.campuslove.api.repository.UserAgreementConsentRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserFollowRepository;
import com.campuslove.api.repository.UserInterestTagRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import com.campuslove.api.repository.VipBillRepository;
import com.campuslove.api.repository.VipBillingLogRepository;
import com.campuslove.api.verification.RealNameCertificationService;
import com.campuslove.api.verification.RealNameCertificationView;
import com.campuslove.api.wallet.UserWallet;
import com.campuslove.api.wallet.UserWalletRepository;
import com.campuslove.api.wallet.WalletTransactionLog;
import com.campuslove.api.wallet.WalletTransactionLogRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.client.HttpClientErrorException;

/**
 * {@link PersonalDataService} 单元测试（S2-5，2026-10-30）。
 *
 * <p>锁定个人信息导出的两条不可回退规则：</p>
 * <ol>
 *   <li><b>归属</b>：导出主体只来自认证上下文，每个仓储都按该主体 ID 查询，
 *       并且绝不按他人 ID 查询；他人写的消息行、非本人参与的会话必须被丢弃。</li>
 *   <li><b>脱敏</b>：手机号 / openid / 真实姓名 / 学信码为掩码值，
 *       密码散列与任何明文标识在 JSON 单元格与 CSV 文本里都不许出现。</li>
 * </ol>
 *
 * <p>夹具刻意把明文（手机号、他人消息正文、审计 request_body）塞进各种字段，
 * 一旦过滤或脱敏被删掉，这些值就会出现在导出里，断言随即失败——不是"非空即通过"的测试。</p>
 */
class PersonalDataServiceTest {

    /** 认证主体（导出对象） */
    private static final long CALLER = 7L;
    /** 会话另一方 */
    private static final long PEER = 99L;
    /** 与本次导出完全无关的第三方用户 */
    private static final long FOREIGN = 999L;
    private static final String PLAIN_PHONE = "13812345678";
    private static final String MASKED_PHONE = "138****5678";
    private static final String PASSWORD_HASH = "$2a$10$abcdefghijklmnopqrstuv";
    private static final String PLAIN_OPENID = "oK5aBcDeFgHiJkLmNoPqRsTu";
    private static final String PEER_MESSAGE_BODY = "对方写的私信内容不得导出";

    @Mock private UserRepository userRepository;
    @Mock private UserBasicProfileRepository userBasicProfileRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private UserScheduleProfileRepository userScheduleProfileRepository;
    @Mock private UserInterestTagRepository userInterestTagRepository;
    @Mock private CampusCertificationRepository campusCertificationRepository;
    @Mock private RealNameCertificationService realNameCertificationService;
    @Mock private PostRepository postRepository;
    @Mock private CommentRepository commentRepository;
    @Mock private LikeRepository likeRepository;
    @Mock private HeartSignalRepository heartSignalRepository;
    @Mock private UserFollowRepository userFollowRepository;
    @Mock private TempChatSessionRepository tempChatSessionRepository;
    @Mock private TempChatMessageRepository tempChatMessageRepository;
    @Mock private PrivateConversationRepository privateConversationRepository;
    @Mock private PrivateMessageRepository privateMessageRepository;
    @Mock private UserWalletRepository userWalletRepository;
    @Mock private WalletTransactionLogRepository walletTransactionLogRepository;
    @Mock private VipBillRepository vipBillRepository;
    @Mock private VipBillingLogRepository vipBillingLogRepository;
    @Mock private NotificationRepository notificationRepository;
    @Mock private CheckInRepository checkInRepository;
    @Mock private TaskClaimRepository taskClaimRepository;
    @Mock private UserAgreementConsentRepository userAgreementConsentRepository;
    @Mock private AuditLogRepository auditLogRepository;

    private PersonalDataService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new PersonalDataService(
                userRepository, userBasicProfileRepository, userCampusProfileRepository,
                userScheduleProfileRepository, userInterestTagRepository,
                campusCertificationRepository, realNameCertificationService, postRepository,
                commentRepository, likeRepository, heartSignalRepository, userFollowRepository,
                tempChatSessionRepository, tempChatMessageRepository, privateConversationRepository,
                privateMessageRepository, userWalletRepository, walletTransactionLogRepository,
                vipBillRepository, vipBillingLogRepository, notificationRepository,
                checkInRepository, taskClaimRepository, userAgreementConsentRepository,
                auditLogRepository);
        authenticate(CALLER);
        stubEmptyPages();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // ==================== 规则一：归属 ====================

    @Test
    @DisplayName("每个仓储都按认证主体的用户 ID 查询，绝不按他人 ID 查询")
    void exportForCurrentUser_shouldQueryEveryRepositoryWithCallerId() {
        PersonalDataExport export = service.exportForCurrentUser();

        assertEquals(CALLER, export.userId().longValue(), "导出主体必须是认证用户本人");

        verify(userRepository).findById(CALLER);
        verify(userBasicProfileRepository).findByUserId(CALLER);
        verify(userCampusProfileRepository).findByUserId(CALLER);
        verify(userScheduleProfileRepository).findByUserId(CALLER);
        verify(userInterestTagRepository).findByUserId(CALLER);
        verify(campusCertificationRepository).findByUserId(CALLER);
        verify(realNameCertificationService).getStatus(CALLER);
        verify(postRepository).findByAuthorId(CALLER);
        verify(userWalletRepository).findByUserId(CALLER);
        verify(tempChatSessionRepository).findByUserIdOrderByPinnedAndLastMessage(CALLER);
        verify(taskClaimRepository).findByUserIdOrderByCreatedAtDesc(CALLER);
        verify(vipBillRepository).findByUserIdOrderByCreatedAtDesc(CALLER);
        verify(vipBillingLogRepository).findByUserIdOrderByCreatedAtDesc(CALLER);
        verify(userFollowRepository).findByFollowerId(CALLER);
        verify(userFollowRepository).findByFollowingId(CALLER);
        verify(userAgreementConsentRepository).findByUserIdOrderByAgreedAtAsc(CALLER);
        verify(commentRepository, atLeastOnce())
                .findByAuthorIdOrderByCreatedAtDesc(eq(CALLER), any(Pageable.class));
        verify(walletTransactionLogRepository, atLeastOnce())
                .findByUserIdOrderByCreatedAtDesc(eq(CALLER), any(Pageable.class));
        verify(notificationRepository, atLeastOnce())
                .findByUserIdOrderByCreatedAtDesc(eq(CALLER), any(Pageable.class));
        verify(likeRepository, atLeastOnce())
                .findByUserIdAndStatus(eq(CALLER), any(Like.LikeStatus.class));
        verify(likeRepository, atLeastOnce())
                .findByTargetUserIdAndStatus(eq(CALLER), any(Like.LikeStatus.class));
        // 双 ID 参数：两处都必须是本人（写成 (CALLER, FOREIGN) 就是越权）
        verify(heartSignalRepository, atLeastOnce())
                .findByUserAIdOrUserBIdAndStatus(eq(CALLER), eq(CALLER), any());
        verify(privateConversationRepository, atLeastOnce())
                .findByUserAIdOrUserBIdOrderByLastMessageAtDesc(eq(CALLER), eq(CALLER));
        // 复用管理端查询的两个类别：第一个参数（userId / operatorId）必须是本人，
        // 其余筛选参数必须为 null（一旦传了 campusName 就变成按校区串数据）
        verify(checkInRepository).searchForAdmin(eq(CALLER), isNull(), isNull(), isNull(),
                isNull(), any(Pageable.class));
        verify(auditLogRepository).search(eq(CALLER), isNull(), isNull(), isNull(), isNull(),
                any(Pageable.class));

        // 任何"按他人 ID 取数"的入口都不该被触碰
        verify(userRepository, never()).findById(FOREIGN);
        verify(postRepository, never()).findByAuthorId(FOREIGN);
        verify(userBasicProfileRepository, never()).findByUserId(FOREIGN);
        verify(tempChatSessionRepository, never()).findByUserIdOrderByPinnedAndLastMessage(FOREIGN);
        verify(privateConversationRepository, never())
                .findByUserAIdOrUserBIdOrderByLastMessageAtDesc(FOREIGN, CALLER);
        verify(likeRepository, never()).findByTargetUserIdAndStatus(FOREIGN, Like.LikeStatus.active);
        verify(checkInRepository, never()).searchForAdmin(eq(FOREIGN), isNull(), isNull(),
                isNull(), isNull(), any(Pageable.class));
    }

    @Test
    @DisplayName("导出主体取自认证上下文：userId 由 SecurityUtils 决定，不是方法入参")
    void exportForCurrentUser_shouldTakeSubjectFromSecurityContextNotParameter() {
        // 服务签名里根本没有 userId 参数：切换登录者即切换导出数据主体
        authenticate(FOREIGN);
        when(userRepository.findById(FOREIGN)).thenReturn(Optional.of(user(FOREIGN)));

        PersonalDataExport export = service.exportForCurrentUser();

        assertEquals(FOREIGN, export.userId().longValue());
        verify(userRepository).findById(FOREIGN);
        verify(userRepository, never()).findById(CALLER);
        verify(postRepository).findByAuthorId(FOREIGN);
    }

    @Test
    @DisplayName("未登录时不产出任何导出（主体无法解析即 401，而非退化成全量导出）")
    void exportForCurrentUser_shouldThrowUnauthorizedWhenNoAuthentication() {
        SecurityContextHolder.clearContext();

        HttpClientErrorException.Unauthorized error = assertThrows(
                HttpClientErrorException.Unauthorized.class,
                () -> service.exportForCurrentUser());

        assertEquals(HttpStatus.UNAUTHORIZED, error.getStatusCode());
        verify(userRepository, never()).findById(anyLong());
        verify(postRepository, never()).findByAuthorId(anyLong());
        verify(tempChatSessionRepository, never()).findByUserIdOrderByPinnedAndLastMessage(anyLong());
        verify(privateConversationRepository, never())
                .findByUserAIdOrUserBIdOrderByLastMessageAtDesc(anyLong(), anyLong());
    }

    @Test
    @DisplayName("私信只导出本人发出的行；非本人参与的会话整条丢弃")
    void exportForCurrentUser_shouldKeepOnlyOwnPrivateMessagesAndOwnConversations() {
        PrivateConversation mine = conversation(1L, CALLER, PEER, "conv-mine");
        PrivateConversation foreign = conversation(FOREIGN, FOREIGN, FOREIGN, "conv-foreign-secret");
        when(privateConversationRepository
                .findByUserAIdOrUserBIdOrderByLastMessageAtDesc(CALLER, CALLER))
                .thenReturn(List.of(mine, foreign));
        when(privateMessageRepository.findByConversationIdOrderByCreatedAtDesc(
                eq(1L), eq(CALLER), any(Pageable.class))).thenReturn(new PageImpl<>(List.of(
                privateMessage(501L, CALLER, "我自己的私信内容"),
                privateMessage(502L, PEER, PEER_MESSAGE_BODY))));

        PersonalDataExport export = service.exportForCurrentUser();
        PersonalDataCategory messages = category(export, "private_messages");
        PersonalDataCategory conversations = category(export, "private_conversations");

        assertEquals(List.of("501"), ids(messages), "只应保留本人发出的那一条私信");
        String messageCells = String.join("|", flatten(messages));
        assertTrue(messageCells.contains("我自己的私信内容"));
        assertFalse(messageCells.contains(PEER_MESSAGE_BODY), "他人消息正文泄露");
        assertFalse(messageCells.contains("502"), "他人消息行泄露");

        assertEquals(List.of("1"), ids(conversations), "非本人参与的会话必须整条丢弃");
        String conversationCells = String.join("|", flatten(conversations));
        assertFalse(conversationCells.contains("conv-foreign-secret"), "他人会话泄露");
        assertFalse(conversationCells.contains(mine.getLastMessagePreview()),
                "会话预览承载对方内容，不得导出");
        // 他人会话的那条消息查询根本不该发生（会话先被参与方校验拦下）
        verify(privateMessageRepository, never())
                .findByConversationIdOrderByCreatedAtDesc(eq(FOREIGN), eq(CALLER), any(Pageable.class));
    }

    @Test
    @DisplayName("临时聊天按 self/peer 相对方位过滤：本人是 userA 时留 self，是 userB 时留 peer")
    void exportForCurrentUser_shouldMapTempChatOwnSenderRelativeToUserA() {
        TempChatSession asUserA = tempChatSession(10L, CALLER, PEER);
        TempChatSession asUserB = tempChatSession(11L, PEER, CALLER);
        when(tempChatSessionRepository.findByUserIdOrderByPinnedAndLastMessage(CALLER))
                .thenReturn(List.of(asUserA, asUserB));
        when(tempChatMessageRepository.findBySessionIdOrderByCreatedAtAsc(10L))
                .thenReturn(List.of(
                        tempChatMessage(201L, "self", "会话1我的消息"),
                        tempChatMessage(202L, "peer", "会话1" + PEER_MESSAGE_BODY)));
        when(tempChatMessageRepository.findBySessionIdOrderByCreatedAtAsc(11L))
                .thenReturn(List.of(
                        tempChatMessage(301L, "self", "会话2" + PEER_MESSAGE_BODY),
                        tempChatMessage(302L, "peer", "会话2我的消息")));

        PersonalDataExport export = service.exportForCurrentUser();
        PersonalDataCategory messages = category(export, "temp_chat_messages");

        assertEquals(List.of("201", "302"), ids(messages),
                "只应保留本人发出的消息：userA 会话取 self，userB 会话取 peer");
        String cells = String.join("|", flatten(messages));
        assertTrue(cells.contains("会话1我的消息") && cells.contains("会话2我的消息"));
        assertFalse(cells.contains(PEER_MESSAGE_BODY), "他人聊天内容泄露");

        PersonalDataCategory sessions = category(export, "temp_chat_sessions");
        assertEquals(2, sessions.rows().size());
        assertEquals(String.valueOf(PEER),
                sessions.rows().get(0).get(indexOf(sessions, "counterpart_user_id")));
        assertFalse(String.join("|", flatten(sessions)).contains("preview-of-peer"),
                "临时聊天会话预览承载对方内容，不得导出");
        // own 视角映射：会话1 本人是 userA → 取 A 侧未读数；会话2 本人是 userB → 取 B 侧
        assertEquals("1", sessions.rows().get(0).get(indexOf(sessions, "own_unread_count")));
        assertEquals("2", sessions.rows().get(1).get(indexOf(sessions, "own_unread_count")));
    }

    @Test
    @DisplayName("ownTempChatSenderValue 与写入侧 TempChatMessageService 判定一致")
    void ownTempChatSenderValue_shouldFollowWriterConvention() {
        assertEquals("self", PersonalDataService.ownTempChatSenderValue(
                CALLER, tempChatSession(12L, CALLER, PEER)));
        assertEquals("peer", PersonalDataService.ownTempChatSenderValue(
                CALLER, tempChatSession(13L, PEER, CALLER)));
    }

    // ==================== 规则二：脱敏 ====================

    @Test
    @DisplayName("手机号/openid/真实姓名为掩码值，密码散列与明文在 JSON 与 CSV 里都不出现")
    void exportForCurrentUser_shouldMaskIdentifiersAndOmitCredentials() {
        User user = user(CALLER);
        user.setPhone(PLAIN_PHONE);
        user.setOpenid(PLAIN_OPENID);
        user.setPassword(PASSWORD_HASH);
        when(userRepository.findById(CALLER)).thenReturn(Optional.of(user));
        when(realNameCertificationService.getStatus(CALLER)).thenReturn(
                new RealNameCertificationView(1L, CALLER, "APPROVED", "张三丰",
                        "110101********1234", "https://cdn/id-front.png", null, "已通过",
                        LocalDateTime.now(), LocalDateTime.now()));
        // 审计 request_body 里刻意塞入明文手机号：它一旦被导出，全局扫描就会红
        AuditLog audit = auditLog();
        when(auditLogRepository.search(eq(CALLER), isNull(), isNull(), isNull(), isNull(),
                any(Pageable.class))).thenReturn(new PageImpl<>(List.of(audit)));
        UserBasicProfile basic = new UserBasicProfile();
        basic.setUserId(CALLER);
        basic.setNickname("若星");
        when(userBasicProfileRepository.findByUserId(CALLER)).thenReturn(Optional.of(basic));

        PersonalDataExport export = service.exportForCurrentUser();
        PersonalDataCategory account = category(export, "account");
        List<String> accountRow = account.rows().get(0);

        assertEquals(MASKED_PHONE, accountRow.get(indexOf(account, "phone")));
        String maskedOpenid = accountRow.get(indexOf(account, "openid"));
        assertTrue(maskedOpenid.startsWith("oK5a") && maskedOpenid.endsWith("RsTu")
                        && maskedOpenid.contains("**"),
                "openid 未按前4后4掩码: " + maskedOpenid);
        assertFalse(accountRow.contains(PLAIN_PHONE), "账号行仍含明文手机号");
        assertFalse(accountRow.contains(PLAIN_OPENID), "账号行仍含明文 openid");
        assertFalse(accountRow.contains(PASSWORD_HASH), "账号行仍含密码散列");

        PersonalDataCategory realName = category(export, "real_name_certification");
        assertEquals("张**", realName.rows().get(0).get(indexOf(realName, "user_name")));
        // 上游服务已解密并掩码，本服务不得二次掩码
        assertEquals("110101********1234",
                realName.rows().get(0).get(indexOf(realName, "id_card_no")));

        // 整份导出（所有 JSON 单元格 + 渲染出的 CSV）都不得出现凭据与明文标识
        List<String> allCells = flatten(export);
        String csv = export.toCsv();
        for (String secret : List.of(PASSWORD_HASH, PLAIN_PHONE, PLAIN_OPENID, "张三丰",
                "内部堆栈，不应外泄")) {
            assertFalse(allCells.contains(secret), "导出单元格泄露明文: " + secret);
            assertFalse(csv.contains(secret), "CSV 泄露明文: " + secret);
        }
        assertTrue(csv.contains(MASKED_PHONE), "CSV 应保留掩码手机号");
        assertFalse(account.columns().contains("password"), "导出列里不该出现 password");
        // 审计类别不带 request_body / error_message（上面塞进去的明文正是从这两列来的）
        PersonalDataCategory auditCategory = category(export, "audit_logs");
        assertFalse(auditCategory.columns().contains("request_body"));
        assertFalse(auditCategory.columns().contains("error_message"));
        assertTrue(String.join("|", flatten(auditCategory)).contains("ADMIN_USER_EDIT"));
    }

    @Test
    @DisplayName("学信网验证码按标识类字段掩码")
    void exportForCurrentUser_shouldMaskChsiCode() {
        CampusCertification cert = new CampusCertification();
        cert.setId(3L);
        cert.setUserId(CALLER);
        cert.setSchoolName("北京大学");
        cert.setChsiCode("CHSI1234567890ABCD");
        when(campusCertificationRepository.findByUserId(CALLER)).thenReturn(Optional.of(cert));

        PersonalDataExport export = service.exportForCurrentUser();
        PersonalDataCategory certCategory = category(export, "campus_certification");
        String masked = certCategory.rows().get(0).get(indexOf(certCategory, "chsi_code"));

        assertEquals("CHSI", masked.substring(0, 4));
        assertTrue(masked.contains("****"), "学信码中间位未掩码: " + masked);
        assertFalse(masked.contains("12345678"), "学信码明文残留: " + masked);
    }

    // ==================== 形态与渲染 ====================

    @Test
    @DisplayName("27 个类别齐全，且每行取值数与列名数一致（防手改字段时整列错位）")
    void build_shouldCoverEveryCategoryWithAlignedColumns() {
        when(postRepository.findByAuthorId(CALLER)).thenReturn(List.of(post(700L, "我的动态内容")));
        when(commentRepository.findByAuthorIdOrderByCreatedAtDesc(eq(CALLER), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(comment(800L))));
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(eq(CALLER), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(notification())));
        when(walletTransactionLogRepository.findByUserIdOrderByCreatedAtDesc(eq(CALLER),
                any(Pageable.class))).thenReturn(new PageImpl<>(List.of(walletLog())));
        when(userWalletRepository.findByUserId(CALLER)).thenReturn(Optional.of(wallet()));
        when(userCampusProfileRepository.findByUserId(CALLER))
                .thenReturn(Optional.of(campusProfile()));
        when(userScheduleProfileRepository.findByUserId(CALLER))
                .thenReturn(Optional.of(scheduleProfile()));

        PersonalDataExport export = service.exportForCurrentUser();

        assertEquals(27, export.categories().size(), "类别数量变化意味着查阅/复制范围被改动");
        for (PersonalDataCategory category : export.categories()) {
            assertFalse(category.columns().isEmpty(), "类别 " + category.name() + " 无列定义");
            for (List<String> row : category.rows()) {
                assertEquals(category.columns().size(), row.size(),
                        "类别 " + category.name() + " 行宽与列宽不一致");
            }
        }
        // 有数据的类别确实产出了行（不是全部空转）
        assertEquals(1, category(export, "posts").rows().size());
        assertEquals(1, category(export, "comments").rows().size());
        assertEquals(1, category(export, "notifications").rows().size());
        assertEquals(1, category(export, "wallet_transactions").rows().size());
        assertEquals(1, category(export, "wallet").rows().size());
        // 空类别仍在场：区分"查过但为空"与"没查"
        assertTrue(export.categories().stream().anyMatch(c -> c.rows().isEmpty()));
    }

    @Test
    @DisplayName("CSV 渲染：BOM + 与 JSON 同一类别集合 + 公式注入与逗号引号转义")
    void toCsv_shouldRenderSameCategoriesWithInjectionGuardAndEscaping() {
        when(postRepository.findByAuthorId(CALLER))
                .thenReturn(List.of(post(701L, "=cmd|'/c calc'")));
        UserBasicProfile basic = new UserBasicProfile();
        basic.setUserId(CALLER);
        basic.setNickname("若星");
        basic.setPhotoGallery("张*,1,\"quoted\"");
        when(userBasicProfileRepository.findByUserId(CALLER)).thenReturn(Optional.of(basic));

        PersonalDataExport export = service.exportForCurrentUser();
        String csv = export.toCsv();

        assertEquals(0xFEFF, csv.charAt(0), "CSV 需带 UTF-8 BOM 供 Excel 识别中文");
        assertTrue(csv.contains("# userId," + CALLER));
        for (PersonalDataCategory category : export.categories()) {
            assertTrue(csv.contains("(" + category.name() + ")"), "CSV 缺类别块: " + category.name());
            // 表头行必须逐列齐全（少一列就是 CSV 与 JSON 形态漂移）
            assertTrue(csv.contains(String.join(",", category.columns()) + "\r\n"),
                    "CSV 表头与类别 " + category.name() + " 的列定义不一致");
        }
        // 公式注入中和：以 = + - @ 开头的值前置单引号
        assertTrue(csv.contains("'=cmd|'/c calc'"), "CSV 未中和公式注入");
        assertFalse(csv.contains("\r\n=cmd"), "CSV 仍含可执行公式单元");
        // 逗号/引号转义：整体加引号、内部引号双写
        assertTrue(csv.contains("\"张*,1,\"\"quoted\"\"\""), "CSV 逗号/引号转义不正确");
        // JSON 形态保持原值（转义只发生在 CSV 渲染层）
        assertTrue(String.join("|", flatten(category(export, "posts")))
                .contains("=cmd|'/c calc'"), "JSON 不应改写原值");
    }

    @Test
    @DisplayName("行数打满上限时类别标 truncated，不静默丢数据")
    void build_shouldFlagTruncatedCategoryWhenRowLimitReached() {
        List<TaskClaim> many = new ArrayList<>();
        for (int i = 0; i < PersonalDataService.MAX_ROWS_PER_CATEGORY + 5; i++) {
            TaskClaim claim = new TaskClaim();
            claim.setId((long) i);
            claim.setUserId(CALLER);
            claim.setTaskCode("daily_check_in");
            claim.setClaimDate(LocalDate.of(2026, 1, 1));
            many.add(claim);
        }
        when(taskClaimRepository.findByUserIdOrderByCreatedAtDesc(CALLER)).thenReturn(many);

        PersonalDataExport export = service.exportForCurrentUser();
        PersonalDataCategory claims = category(export, "task_claims");

        assertTrue(claims.truncated(), "超出上限应标 truncated");
        assertEquals(PersonalDataService.MAX_ROWS_PER_CATEGORY, claims.rows().size());
        assertTrue(export.hasTruncatedCategory());
        assertTrue(export.toCsv().contains("已截断"), "CSV 应把截断告知用户");
    }

    // ==================== 夹具 ====================

    /** 分页来源仓储的空页兜底（Mockito 对 Page 接口返回 null，会 NPE 掩盖真实断言） */
    private void stubEmptyPages() {
        when(commentRepository.findByAuthorIdOrderByCreatedAtDesc(anyLong(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
        when(walletTransactionLogRepository.findByUserIdOrderByCreatedAtDesc(anyLong(),
                any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        when(notificationRepository.findByUserIdOrderByCreatedAtDesc(anyLong(),
                any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        when(privateMessageRepository.findByConversationIdOrderByCreatedAtDesc(anyLong(), anyLong(),
                any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        when(checkInRepository.searchForAdmin(anyLong(), any(), any(), any(), any(),
                any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
        when(auditLogRepository.search(anyLong(), any(), any(), any(), any(),
                any(Pageable.class))).thenReturn(new PageImpl<>(List.of()));
    }

    private static void authenticate(long userId) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(userId, "n/a",
                        List.of(new SimpleGrantedAuthority("ROLE_USER"))));
    }

    private static User user(long id) {
        User user = new User();
        user.setId(id);
        user.setNickname("若星");
        user.setCreatedAt(LocalDateTime.now());
        return user;
    }

    private static PersonalDataCategory category(PersonalDataExport export, String name) {
        return export.categories().stream()
                .filter(c -> name.equals(c.name()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("导出缺少类别: " + name));
    }

    private static int indexOf(PersonalDataCategory category, String column) {
        int idx = category.columns().indexOf(column);
        assertTrue(idx >= 0, "类别 " + category.name() + " 缺少列 " + column);
        return idx;
    }

    private static List<String> ids(PersonalDataCategory category) {
        return category.rows().stream().map(r -> r.get(0)).toList();
    }

    private static List<String> flatten(PersonalDataCategory category) {
        List<String> cells = new ArrayList<>();
        category.rows().forEach(cells::addAll);
        return cells;
    }

    private static List<String> flatten(PersonalDataExport export) {
        List<String> cells = new ArrayList<>();
        cells.add(String.valueOf(export.userId()));
        cells.add(export.generatedAt());
        export.categories().forEach(c -> cells.addAll(flatten(c)));
        return cells;
    }

    private static PrivateConversation conversation(long id, long userA, long userB, String uid) {
        PrivateConversation c = new PrivateConversation();
        c.setId(id);
        c.setUserAId(userA);
        c.setUserBId(userB);
        c.setConversationUid(uid);
        c.setLastMessagePreview("preview-of-peer");
        c.setPinned(false);
        c.setUserAMuted(false);
        c.setUserBMuted(false);
        c.setUserAMarkedUnread(false);
        c.setUserBMarkedUnread(false);
        return c;
    }

    private static PrivateMessage privateMessage(long id, Long senderId, String content) {
        PrivateMessage m = new PrivateMessage();
        m.setId(id);
        m.setSenderId(senderId);
        m.setContent(content);
        m.setMessageKind("text");
        m.setDeliveryStatus("sent");
        m.setIsRead(false);
        m.setRecalled(false);
        m.setDeletedForSender(false);
        m.setQuoteContext("引用了对方原文");
        m.setCreatedAt(LocalDateTime.now());
        return m;
    }

    private static TempChatSession tempChatSession(long id, long userA, long userB) {
        TempChatSession s = new TempChatSession();
        s.setId(id);
        s.setUserAId(userA);
        s.setUserBId(userB);
        s.setSessionUid("tc-" + id);
        s.setUserAUnreadCount(1);
        s.setUserBUnreadCount(2);
        s.setLastMessagePreview("preview-of-peer");
        return s;
    }

    private static TempChatMessage tempChatMessage(long id, String sender, String body) {
        TempChatMessage m = new TempChatMessage();
        m.setId(id);
        m.setSender(sender);
        m.setBody(body);
        m.setKind("text");
        m.setDeliveryStatus("sent");
        m.setRecalled(false);
        m.setCreatedAt(LocalDateTime.now());
        return m;
    }

    private static Post post(long id, String content) {
        Post p = new Post();
        p.setId(id);
        p.setAuthorId(CALLER);
        p.setTitle("我的动态");
        p.setContent(content);
        p.setStatus(Post.PostStatus.active);
        p.setCreatedAt(LocalDateTime.now());
        return p;
    }

    private static Comment comment(long id) {
        Comment c = new Comment();
        c.setId(id);
        c.setAuthorId(CALLER);
        c.setContent("我的评论");
        c.setCreatedAt(LocalDateTime.now());
        return c;
    }

    private static Notification notification() {
        Notification n = new Notification();
        n.setId(900L);
        n.setUserId(CALLER);
        n.setType(Notification.NotificationType.like);
        n.setSourceUserId(PEER);
        n.setIsRead(false);
        n.setCreatedAt(LocalDateTime.now());
        return n;
    }

    private static AuditLog auditLog() {
        AuditLog a = new AuditLog();
        a.setId(950L);
        a.setOperatorId(CALLER);
        a.setOperation("ADMIN_USER_EDIT");
        a.setOperatorRole("ADMIN");
        a.setRequestBody("{\"phone\":\"" + PLAIN_PHONE + "\"}");
        a.setErrorMessage("内部堆栈，不应外泄");
        a.setCreatedAt(LocalDateTime.now());
        return a;
    }

    private static WalletTransactionLog walletLog() {
        WalletTransactionLog log = new WalletTransactionLog();
        log.setId(960L);
        log.setUserId(CALLER);
        log.setType("DEBIT");
        log.setAmount(30L);
        log.setBalanceAfter(970L);
        log.setRelatedType("MESSAGE_UNLOCK");
        log.setRelatedId(String.valueOf(PEER));
        log.setOrderId("order-1");
        log.setCreatedAt(LocalDateTime.now());
        return log;
    }

    private static UserWallet wallet() {
        UserWallet w = new UserWallet();
        w.setId(970L);
        w.setUserId(CALLER);
        w.setBalanceCents(970L);
        w.setFrozenCents(0L);
        return w;
    }

    private static UserCampusProfile campusProfile() {
        UserCampusProfile p = new UserCampusProfile();
        p.setUserId(CALLER);
        p.setCityName("北京");
        p.setCampusName("北京大学");
        p.setDepartmentName("信息科学技术学院");
        return p;
    }

    private static UserScheduleProfile scheduleProfile() {
        UserScheduleProfile p = new UserScheduleProfile();
        p.setUserId(CALLER);
        p.setPreferredCampusArea("东校区");
        return p;
    }
}
