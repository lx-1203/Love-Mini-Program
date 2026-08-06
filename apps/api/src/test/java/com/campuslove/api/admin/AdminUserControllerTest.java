package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.config.PasswordEncoderConfig;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.testdata.ControllerTestBase;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 管理后台 - 新增用户控制器单元测试（eladmin「新增用户」对齐，P1-B）。
 *
 * <p>覆盖：</p>
 * <ul>
 *   <li>创建成功：手机号唯一 → 创建 active/USER 用户，密码 BCrypt 加密落库</li>
 *   <li>手机号已注册 → 400 业务异常</li>
 *   <li>手机号格式非法 → 400 业务异常</li>
 *   <li>密码过短（&lt;6 位）→ 400 业务异常</li>
 *   <li>昵称非法（空/超长）→ 400 业务异常</li>
 * </ul>
 */
class AdminUserControllerTest extends ControllerTestBase {

    private static final Long ADMIN_ID = 100L;
    private static final String PHONE = "13800138000";
    private static final String PASSWORD = "User@2026";
    private static final String NICKNAME = "测试用户";

    @Mock private UserRepository userRepository;
    @Mock private UserCampusProfileRepository userCampusProfileRepository;
    @Mock private AdminCampusScopeService campusScopeService;
    private PasswordEncoder passwordEncoder;
    private AdminUserController controller;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        passwordEncoder = new PasswordEncoderConfig().passwordEncoder();
        controller = new AdminUserController(
                userRepository, userCampusProfileRepository, passwordEncoder, campusScopeService);
    }

    @Test
    @DisplayName("创建成功：手机号唯一 → 创建 active/USER 用户，密码 BCrypt 加密")
    void createUser_withValidRequest_shouldCreateActiveUser() {
        // Arrange
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(999L);
            return u;
        });

        withUserId(ADMIN_ID, () -> {
            // Act
            AdminUserSummaryView view = controller
                    .createUser(new AdminCreateUserRequest(PHONE, PASSWORD, NICKNAME))
                    .data();

            // Assert：创建后状态 active、角色 USER
            assertEquals(999L, view.id());
            assertEquals(NICKNAME, view.nickname());
            assertEquals("USER", view.role());
            assertEquals("active", view.status());

            // 密码以 BCrypt 哈希落库（可匹配原密码，非明文）
            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            User saved = captor.getValue();
            assertEquals("phone:" + PHONE, saved.getOpenid(), "openid 按约定存储 phone:{phone}");
            assertEquals(PHONE, saved.getPhone());
            assertEquals("USER", saved.getRole());
            assertEquals("active", saved.getStatus());
            assertTrue(passwordEncoder.matches(PASSWORD, saved.getPassword()),
                    "密码应以 BCrypt 哈希存储且可匹配");
        });
    }

    @Test
    @DisplayName("手机号已注册 → IllegalArgumentException（400）")
    void createUser_withExistingPhone_shouldThrow() {
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(new User()));

        withUserId(ADMIN_ID, () -> {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> controller.createUser(new AdminCreateUserRequest(PHONE, PASSWORD, NICKNAME)));
            assertEquals("该手机号已注册", ex.getMessage());
            verify(userRepository, never()).save(any(User.class));
        });
    }

    @Test
    @DisplayName("手机号格式非法 → IllegalArgumentException（400）")
    void createUser_withInvalidPhone_shouldThrow() {
        withUserId(ADMIN_ID, () -> {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> controller.createUser(new AdminCreateUserRequest("12345", PASSWORD, NICKNAME)));
            assertEquals("手机号格式不正确", ex.getMessage());
            verify(userRepository, never()).save(any(User.class));
        });
    }

    @Test
    @DisplayName("密码过短（<6 位）→ IllegalArgumentException（400）")
    void createUser_withShortPassword_shouldThrow() {
        withUserId(ADMIN_ID, () -> {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> controller.createUser(new AdminCreateUserRequest(PHONE, "123", NICKNAME)));
            assertEquals("密码长度须为 6-64 位", ex.getMessage());
            verify(userRepository, never()).save(any(User.class));
        });
    }

    @Test
    @DisplayName("昵称超长（>20 字）→ IllegalArgumentException（400）")
    void createUser_withTooLongNickname_shouldThrow() {
        String longNickname = "超长昵称".repeat(10); // 40 字
        withUserId(ADMIN_ID, () -> {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> controller.createUser(new AdminCreateUserRequest(PHONE, PASSWORD, longNickname)));
            assertEquals("昵称长度须为 1-20 字", ex.getMessage());
            verify(userRepository, never()).save(any(User.class));
        });
    }

    // ============================================================
    // 商业模式：每个高校一个管理员（campus_name 数据隔离）
    // ============================================================

    @Test
    @DisplayName("创建校区管理员：ADMIN + campusName → 落库 campus_name")
    void createAdmin_withCampusName_shouldCreateCampusAdmin() {
        String campus = "南京大学";
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(1001L);
            return u;
        });

        withUserId(ADMIN_ID, () -> {
            AdminUserSummaryView view = controller
                    .createAdmin(new AdminCreateAdminRequest(PHONE, PASSWORD, NICKNAME, "ADMIN", campus))
                    .data();

            assertEquals(1001L, view.id());
            assertEquals("ADMIN", view.role());
            assertEquals(campus, view.campusName(), "校区管理员应记录管辖校区");

            ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
            verify(userRepository).save(captor.capture());
            assertEquals(campus, captor.getValue().getCampusName());
        });
    }

    @Test
    @DisplayName("创建校区管理员缺 campusName → IllegalArgumentException（400）")
    void createAdmin_withoutCampusName_shouldThrow() {
        withUserId(ADMIN_ID, () -> {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> controller.createAdmin(
                            new AdminCreateAdminRequest(PHONE, PASSWORD, NICKNAME, "ADMIN", null)));
            assertEquals("校区管理员（ADMIN）必须指定 campusName", ex.getMessage());
            verify(userRepository, never()).save(any(User.class));
        });
    }

    @Test
    @DisplayName("创建全局超级管理员带 campusName → IllegalArgumentException（400）")
    void createAdmin_superAdminWithCampus_shouldThrow() {
        withUserId(ADMIN_ID, () -> {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> controller.createAdmin(
                            new AdminCreateAdminRequest(PHONE, PASSWORD, NICKNAME, "SUPER_ADMIN", "南京大学")));
            assertEquals("全局管理员（SUPER_ADMIN）不能指定 campusName", ex.getMessage());
            verify(userRepository, never()).save(any(User.class));
        });
    }

    @Test
    @DisplayName("创建管理员手机号已注册 → IllegalArgumentException（400）")
    void createAdmin_withExistingPhone_shouldThrow() {
        when(userRepository.findByPhone(PHONE)).thenReturn(Optional.of(new User()));
        withUserId(ADMIN_ID, () -> {
            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> controller.createAdmin(
                            new AdminCreateAdminRequest(PHONE, PASSWORD, NICKNAME, "ADMIN", "南京大学")));
            assertEquals("该手机号已注册", ex.getMessage());
            verify(userRepository, never()).save(any(User.class));
        });
    }

    @Test
    @DisplayName("校区管理员查询用户：强制按管辖校区过滤（数据隔离）")
    void listUsers_campusAdmin_shouldForceCampusScope() {
        String campus = "南京大学";
        // 当前管理员是南京大学校区管理员
        when(campusScopeService.getCurrentAdminCampusName()).thenReturn(campus);
        when(userRepository.searchForAdmin(
                any(), any(), any(), any(), any(), any(), any())).thenReturn(org.springframework.data.domain.Page.empty());

        withUserId(ADMIN_ID, () -> {
            controller.listUsers(null, null, null, null, null, null, 1, 20);

            // 即使调用方未传 campusName，查询也必须带上管辖校区
            ArgumentCaptor<String> campusCaptor = ArgumentCaptor.forClass(String.class);
            verify(userRepository).searchForAdmin(
                    any(), any(), any(), any(), any(), campusCaptor.capture(), any());
            assertEquals(campus, campusCaptor.getValue());
        });
    }

    @Test
    @DisplayName("全局管理员查询用户：透传调用方 campusName 参数")
    void listUsers_globalAdmin_shouldPassThroughCampusFilter() {
        // 全局管理员：getCurrentAdminCampusName 返回 null
        when(campusScopeService.getCurrentAdminCampusName()).thenReturn(null);
        when(userRepository.searchForAdmin(
                any(), any(), any(), any(), any(), any(), any())).thenReturn(org.springframework.data.domain.Page.empty());

        withUserId(ADMIN_ID, () -> {
            controller.listUsers(null, null, null, null, null, "杭州大学", 1, 20);

            ArgumentCaptor<String> campusCaptor = ArgumentCaptor.forClass(String.class);
            verify(userRepository).searchForAdmin(
                    any(), any(), any(), any(), any(), campusCaptor.capture(), any());
            assertEquals("杭州大学", campusCaptor.getValue());
        });
    }
}
