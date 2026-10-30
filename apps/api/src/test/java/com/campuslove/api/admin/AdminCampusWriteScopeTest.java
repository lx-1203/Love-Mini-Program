package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.OperationForbiddenException;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

/**
 * 归属校区<b>写入</b>作用域解析单元测试（S2-2，2026-10-30）。
 *
 * <p><b>缺陷基线（修复前）</b>：{@code AdminActivityController} 与
 * {@code AdminShopController} 都把 {@code getCurrentAdminCampusName()} 的返回值当成
 * 「管辖校区」写进业务表：
 * <pre>
 *   String scopedCampus = adminDataScope.getCurrentAdminCampusName();
 *   activity.setCampusName(scopedCampus != null ? scopedCampus : normalize(req.campusName()));
 * </pre>
 * 而 {@code getCurrentAdminCampusName()} 对「空校区的 ADMIN / AUDITOR」返回的是内部哨兵
 * {@code NO_CAMPUS_SCOPE = "__AUDITOR_NO_CAMPUS__"}——它是<b>非 null</b> 字符串，
 * 三元/if 一律走「有校区」分支，于是哨兵被写进 {@code activities.campus_name} /
 * {@code shop_items.campus_name}。后果不是异常而是静默丢失：这条记录对所有真实校区管理员
 * 不可见，管理员再点一次"改归属"仍走同一个错误分支，只能进库手改。</p>
 *
 * <p><b>修复后契约</b>：写路径统一经 {@link AdminDataScope#resolveCampusForWrite}，
 * 哨兵作用域一律 403 fail-closed；因此<b>任何不抛异常的结果都不可能是哨兵</b>——
 * 这是本测试的核心断言（把 {@code resolveCampusForWrite} 改回返回哨兵，用立即变红）。</p>
 */
@DisplayName("AdminDataScope - 写入归属校区解析（哨兵不得落库）")
class AdminCampusWriteScopeTest {

    private static final long ADMIN_ID = 5001L;

    private final UserRepository userRepository = mock(UserRepository.class);
    private final UserCampusProfileRepository profileRepository = mock(UserCampusProfileRepository.class);
    private final AdminDataScope scope = new AdminDataScope(userRepository, profileRepository);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    /** 造一个管理员账号并登录（principal 用字符串，走 SecurityUtils 的解析分支）。 */
    private void loginAs(String role, String campusName) {
        User user = new User();
        user.setId(ADMIN_ID);
        user.setRole(role);
        user.setCampusName(campusName);
        when(userRepository.findById(ADMIN_ID)).thenReturn(Optional.of(user));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(String.valueOf(ADMIN_ID), "n/a",
                        List.of(new SimpleGrantedAuthority("ROLE_" + role))));
    }

    @Test
    @DisplayName("空校区 ADMIN：哨兵作用域一律拒绝，绝不返回可落库的值")
    void blankCampusAdmin_shouldBeRejectedNotPersisted() {
        loginAs(AdminDataScope.ROLE_ADMIN, null);

        OperationForbiddenException ex = assertThrows(OperationForbiddenException.class,
                () -> scope.resolveCampusForWrite("北洋大学"));
        assertFalse(ex.getMessage().contains(AdminDataScope.NO_CAMPUS_SCOPE),
                "拒绝文案不得把内部哨兵透给用户：" + ex.getMessage());
    }

    @Test
    @DisplayName("空校区 AUDITOR：同样拒绝（旧写法会把哨兵当成管辖校区落库）")
    void blankCampusAuditor_shouldBeRejected() {
        loginAs(AdminDataScope.ROLE_AUDITOR, "   ");

        assertThrows(OperationForbiddenException.class,
                () -> scope.resolveCampusForWrite(null));
    }

    @Test
    @DisplayName("校区管理员：恒写自己的校区，请求体里的校区名不生效（与改造前一致）")
    void campusAdmin_alwaysWritesOwnCampus() {
        loginAs(AdminDataScope.ROLE_ADMIN, "北洋大学");

        assertEquals("北洋大学", scope.resolveCampusForWrite("其他大学"));
        assertEquals("北洋大学", scope.resolveCampusForWrite(null));
    }

    @Test
    @DisplayName("超级管理员：按请求体归属；未给则留空")
    void superAdmin_writesRequestedCampus() {
        loginAs(AdminDataScope.ROLE_SUPER_ADMIN, "随便");

        assertEquals("北洋大学", scope.resolveCampusForWrite("北洋大学"));
        assertNull(scope.resolveCampusForWrite(null));
    }

    @Test
    @DisplayName("核心不变式：凡是不拒绝的结果，都不可能是内部哨兵")
    void noSuccessfulResultIsEverTheSentinel() {
        // 四种作用域配置各跑一遍：能返回的必须是真实校区或 null。
        loginAs(AdminDataScope.ROLE_SUPER_ADMIN, null);
        assertNotSentinel(scope.resolveCampusForWrite("A"));

        loginAs(AdminDataScope.ROLE_ADMIN, "B");
        assertNotSentinel(scope.resolveCampusForWrite(null));

        loginAs(AdminDataScope.ROLE_AUDITOR, "C");
        assertNotSentinel(scope.resolveCampusForWrite("C"));

        loginAs(AdminDataScope.ROLE_ADMIN, null);
        assertThrows(OperationForbiddenException.class, () -> scope.resolveCampusForWrite("D"));
    }

    private static void assertNotSentinel(String campusName) {
        assertFalse(AdminDataScope.isNoCampusScope(campusName),
                "哨兵值出现在可落库的结果里，说明写路径重新引入了 S2-2 缺陷");
    }
}
