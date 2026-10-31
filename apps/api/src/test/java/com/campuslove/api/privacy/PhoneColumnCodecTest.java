package com.campuslove.api.privacy;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.campuslove.api.config.AesEncryptor;
import com.campuslove.api.utils.SensitiveDataMasker;
import java.lang.reflect.Field;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * {@code users.phone} 列语义收敛的测试（P0 第 3 项）。
 *
 * <p>要钉住的三件事：</p>
 * <ol>
 *   <li>写入侧只有一种表示：AES-GCM 密文，或 {@link PhoneColumnCodec#ERASED_VALUE}（NULL）。
 *       {@code RealAuthService#registerUser}、{@code PhoneBindingController#bindPhone}、
 *       {@code RealAccountSecurityService#changePhone} 三个写入口共用
 *       {@link PhoneColumnCodec#store}——口径不再各自拼字符串。</li>
 *   <li>读取侧任何一条路径遇到「已注销」值都不崩、也不误读：
 *       {@link PhoneColumnCodec#displayMasked}（导出）、
 *       {@link SensitiveDataMasker#maskPhone}（管理端列表 {@code AdminUserController}）、
 *       {@link AesEncryptor#decrypt}（任何按密文处理的读取路径，含
 *       {@code RealRealNameCertificationService#decryptIdCardNo} 那类同构实现）都必须是安全降级。</li>
 *   <li>旧哨兵 {@code "1****" + userId} 被明确否决：它把 userId 写进了手机号列，
 *       在导出/管理端会被当成「一个真实绑定过的号码」显示，属可反推化名。
 *       {@code retiredSentinelLeaksSubjectId} 直接把这件事断言出来，防止有人「顺手改回去」。</li>
 * </ol>
 */
class PhoneColumnCodecTest {

    private static final long SUBJECT = 100L;
    private static final String PLAIN_PHONE = "13812345678";
    private static final String MASKED_PHONE = "138****5678";

    private AesEncryptor encryptor;

    @BeforeEach
    void setUp() throws Exception {
        encryptor = realEncryptor();
    }

    @Test
    @DisplayName("store 写的是密文：可解回明文、掩码后是本来的号码")
    void storeWritesCiphertextAndReadsBackAsMaskedPhone() {
        String stored = PhoneColumnCodec.store(encryptor, PLAIN_PHONE);
        assertTrue(encryptor.isEncrypted(stored), "写入值必须是密文形态");
        assertEquals(PLAIN_PHONE, encryptor.decrypt(stored));
        assertEquals(MASKED_PHONE, PhoneColumnCodec.displayMasked(encryptor, stored));
    }

    @Test
    @DisplayName("三个写入口共用 store：同一手机号两次写入是不同密文、但都解回同一明文；空白归一为 NULL")
    void allWritersAgreeOnRepresentation() {
        // RealAuthService.registerUser / PhoneBindingController.bindPhone /
        // RealAccountSecurityService.changePhone 全部经由此方法写 users.phone
        String first = PhoneColumnCodec.store(encryptor, PLAIN_PHONE);
        String second = PhoneColumnCodec.store(encryptor, PLAIN_PHONE);
        assertNotEquals(first, second,
                "AES-GCM 随机 IV：同明文不同密文（因此手机号唯一性只能靠 phone: 派生键，见 RealAuthService）");
        assertEquals(PLAIN_PHONE, encryptor.decrypt(first));
        assertEquals(PLAIN_PHONE, encryptor.decrypt(second));
        assertNull(PhoneColumnCodec.store(encryptor, null), "null 手机号必须写 NULL");
        assertNull(PhoneColumnCodec.store(encryptor, "   "),
                "空串必须归一为 NULL：V2026.08.08.0003 就是为清理空串行做过一次数据修复");
        assertNull(PhoneColumnCodec.ERASED_VALUE, "已注销的唯一表示是 NULL");
    }

    @Test
    @DisplayName("已注销值经任何读取路径都不崩、也不误读")
    void erasedValueIsSafeThroughEveryReadPath() {
        // 1) 导出路径（PersonalDataService → PhoneColumnCodec.displayMasked）
        assertEquals("", PhoneColumnCodec.displayMasked(encryptor, PhoneColumnCodec.ERASED_VALUE));
        assertEquals("", PhoneColumnCodec.displayMasked(null, PhoneColumnCodec.ERASED_VALUE));
        // 2) 管理端列表路径（AdminUserController → SensitiveDataMasker.maskPhone）
        assertEquals("", SensitiveDataMasker.maskPhone(PhoneColumnCodec.ERASED_VALUE));
        // 3) 按密文处理的路径（AesEncryptor.decrypt）
        assertNull(assertDoesNotThrow(() -> encryptor.decrypt(PhoneColumnCodec.ERASED_VALUE)));
        // 4) 「是否已注销/未绑定」判定（RealAuthService#buildSessionView / ThirdPartyAuthService 的
        //    phoneBound 布尔口径）必须为 true，不能把墓碑行显示成「已绑定手机号」
        assertTrue(PhoneColumnCodec.isErasedOrAbsent(PhoneColumnCodec.ERASED_VALUE));
    }

    @Test
    @DisplayName("历史明文行仍按明文掩码（读取侧兼容，不猜密文）")
    void legacyPlaintextRowsStillMask() {
        // AdminUserController#createUser 写的是明文；读取侧必须不把它当密文解
        assertEquals(MASKED_PHONE, PhoneColumnCodec.displayMasked(encryptor, PLAIN_PHONE));
        assertFalse(encryptor.isEncrypted(PLAIN_PHONE));
    }

    @Test
    @DisplayName("解密失败的密文：安全降级为空串，不把 500 抛给读接口")
    void undecryptableCiphertextDegradesToEmpty() {
        String tampered = encryptor.encrypt(PLAIN_PHONE);
        String flipped = tampered.substring(0, tampered.length() - 2) + "AA";
        assertThrows(IllegalStateException.class, () -> encryptor.decrypt(flipped),
                "前提核对：R4-00247 之后认证标签不匹配会抛 IllegalStateException");
        assertEquals("", PhoneColumnCodec.displayMasked(encryptor, flipped));
    }

    @Test
    @DisplayName("被否决的旧哨兵：它会带着 userId 被当成真实掩码手机号显示出来")
    void retiredSentinelLeaksSubjectId() {
        String retiredSentinel = "1****" + SUBJECT; // 旧 RealAccountSecurityService#maskPhone
        // 读侧无法把它和「一个真的绑定过的号」区分开：判定为「已绑定」，且原样出现在导出/管理端
        assertFalse(PhoneColumnCodec.isErasedOrAbsent(retiredSentinel),
                "旧哨兵会被当成有效手机号——这正是它被判定为「未删除」的原因");
        assertTrue(PhoneColumnCodec.displayMasked(encryptor, retiredSentinel).contains(
                String.valueOf(SUBJECT)), "旧哨兵经掩码后仍泄露 userId");
        // 收敛后的表示不含任何主体标识
        assertFalse(String.valueOf(PhoneColumnCodec.ERASED_VALUE).contains(String.valueOf(SUBJECT)));
    }

    @Test
    @DisplayName("墓碑 openid 也不会被解密路径当成密文（同列语义的横向检查）")
    void tombstoneOpenidIsNotCipherShaped() {
        String openid = ErasedValues.erasedOpenid();
        assertFalse(encryptor.isEncrypted(openid));
        assertEquals(openid, assertDoesNotThrow(() -> encryptor.decrypt(openid)));
        assertTrue(ErasedValues.isErasedOpenid(openid));
    }

    /** 反射注入密钥并跑 {@code @PostConstruct}，用真实 AES 行为（不 mock 掉关键分支）。 */
    private static AesEncryptor realEncryptor() throws Exception {
        AesEncryptor encryptor = new AesEncryptor();
        Field secret = AesEncryptor.class.getDeclaredField("secret");
        secret.setAccessible(true);
        secret.set(encryptor, "0123456789abcdef0123456789abcdef-test-only");
        Field strict = AesEncryptor.class.getDeclaredField("strictAes");
        strict.setAccessible(true);
        strict.set(encryptor, Boolean.TRUE);
        encryptor.init();
        return encryptor;
    }
}
