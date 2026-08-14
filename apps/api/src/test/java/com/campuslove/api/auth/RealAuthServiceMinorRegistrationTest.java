package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.common.MinorNotAllowedException;
import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.config.JwtTokenProvider;
import com.campuslove.api.config.PasswordEncoderConfig;
import com.campuslove.api.entity.User;
import com.campuslove.api.repository.SchoolRepository;
import com.campuslove.api.repository.UserBasicProfileRepository;
import com.campuslove.api.repository.UserCampusProfileRepository;
import com.campuslove.api.repository.UserRepository;
import com.campuslove.api.repository.UserScheduleProfileRepository;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * 注册未成年人校验单元测试（3-N）。
 *
 * <p>覆盖 {@link RealAuthService#registerUser} 的年龄校验：</p>
 * <ul>
 *   <li>未满 18 周岁 → 拒绝注册并返回 MINOR_NOT_ALLOWED 业务错误码</li>
 *   <li>已成年 → 注册成功并落库 birthDate</li>
 * </ul>
 */
class RealAuthServiceMinorRegistrationTest {

    private UserRepository userRepository;
    private JwtTokenProvider jwtTokenProvider;
    private RealAuthService realAuthService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        jwtTokenProvider = mock(JwtTokenProvider.class);
        PasswordEncoder passwordEncoder = new PasswordEncoderConfig().passwordEncoder();
        realAuthService = new RealAuthService(
                mock(WeChatClient.class),
                jwtTokenProvider,
                userRepository,
                mock(UserBasicProfileRepository.class),
                mock(UserCampusProfileRepository.class),
                mock(UserScheduleProfileRepository.class),
                passwordEncoder,
                mock(AesEncryptor.class),
                mock(TokenBlacklistService.class),
                mock(OnlineUserService.class),
                mock(SchoolRepository.class),
                "",
                true,
                "13900000000"
        );
        when(jwtTokenProvider.generateToken(any())).thenReturn("mock-jwt-token");
        when(userRepository.findByPhone(any())).thenReturn(Optional.empty());
        // save 返回传入实体（模拟 JPA 托管实体回填 id），否则注册内 save 返回 null 导致 NPE
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void registerUser_minor_birthDate_rejectedWithMinorNotAllowed() {
        LocalDate minorBirthDate = LocalDate.now().minusYears(17);

        MinorNotAllowedException ex = assertThrows(MinorNotAllowedException.class,
                () -> realAuthService.registerUser("13800000001", "Pass@2026", "小张",
                        minorBirthDate, null));

        assertEquals("MINOR_NOT_ALLOWED", ex.getErrorCode(), "未满 18 周岁应返回 MINOR_NOT_ALLOWED 业务错误码");
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void registerUser_nullBirthDate_rejectedWithMinorNotAllowed() {
        assertThrows(MinorNotAllowedException.class,
                () -> realAuthService.registerUser("13800000001", "Pass@2026", "小张",
                        null, null),
                "出生日期缺失应从严拒绝（@NotNull 兜底 + 服务端校验）");
    }

    @Test
    void registerUser_adult_birthDatePersisted() {
        LocalDate adultBirthDate = LocalDate.now().minusYears(20);

        UserSessionView session = realAuthService.registerUser(
                "13800000002", "Pass@2026", "小张", adultBirthDate, "device-1");

        assertEquals("mock-jwt-token", session.token(), "已成年注册应成功并签发会话");
        // 验证落库的 birthDate
        org.mockito.ArgumentCaptor<User> captor = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertEquals(adultBirthDate, captor.getValue().getBirthDate(), "birthDate 应随注册落库");
    }

    /** 确保 OnlineUserService/recordLogin 不因设备记录路径产生 NPE（mock 降级为 null 场景）。 */
    @Test
    void registerUser_adult_deviceRecordingSkippedWhenServiceMissing() {
        LocalDate adultBirthDate = LocalDate.now().minusYears(20);

        // deviceSessionService 未注入（null）——注册主流程不受影响
        Mockito.when(jwtTokenProvider.getJtiFromToken("mock-jwt-token")).thenReturn("jti-1");

        UserSessionView session = realAuthService.registerUser(
                "13800000003", "Pass@2026", "小张", adultBirthDate, "device-1");

        assertEquals("mock-jwt-token", session.token(), "设备记录服务缺失不应影响注册");
    }
}
