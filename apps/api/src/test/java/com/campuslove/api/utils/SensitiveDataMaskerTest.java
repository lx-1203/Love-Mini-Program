package com.campuslove.api.utils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * {@link SensitiveDataMasker} 单元测试（P0 CRITICAL FIN-00001/00002 Task 1.4）。
 *
 * <p>覆盖范围：</p>
 * <ul>
 *   <li>7 个静态方法：{@link SensitiveDataMasker#mask} / {@link SensitiveDataMasker#maskPhone}
 *       / {@link SensitiveDataMasker#maskIdCard} / {@link SensitiveDataMasker#maskRealName}
 *       / {@link SensitiveDataMasker#maskToken} / {@link SensitiveDataMasker#maskSecret}
 *       / {@link SensitiveDataMasker#maskEmail}</li>
 *   <li>每个方法覆盖：正常值、null、空串、短串场景</li>
 *   <li>关键安全断言：脱敏结果中不得包含原始敏感字段的任何"中间明文"片段</li>
 *   <li>工具类不可实例化：构造器抛 {@link UnsupportedOperationException}</li>
 * </ul>
 *
 * <p>测试策略：纯单元测试（无 Spring 上下文），直接调用静态方法验证返回值，
 * 断言脱敏前后的字符串关系符合预期。所有断言使用 JUnit 5 {@code assertEquals} /
 * {@code assertFalse} / {@code assertNotNull}。</p>
 *
 * @since 2026-07-28
 */
class SensitiveDataMaskerTest {

    /* ========== mask(openId) ========== */

    /**
     * 场景 1：标准 openId（15 位）脱敏 → 前 4 + 中间 7 个 * + 后 4。
     */
    @Test
    void mask_standardOpenId_shouldKeepFirst4AndLast4() {
        String openId = "oK5aBcDeFgHiJkL"; // 15 位
        String masked = SensitiveDataMasker.mask(openId);
        assertEquals("oK5a*******iJkL", masked,
                "openId 脱敏应保留前 4 + 后 4，中间用 * 填充");
        // 安全断言：脱敏结果不应包含原始 openId 中间的任何明文片段
        assertFalse(masked.contains("BcDeFgH"),
                "脱敏结果不应包含 openId 中间明文片段");
    }

    /**
     * 场景 2：13 位 openId → 前 4 + 5 个 * + 后 4。
     */
    @Test
    void mask_13CharOpenId_shouldHave5Stars() {
        String openId = "o1234567890ab"; // 13 位
        String masked = SensitiveDataMasker.mask(openId);
        assertEquals("o123*****90ab", masked);
        assertFalse(masked.contains("45678"),
                "脱敏结果不应包含 openId 中间明文片段");
    }

    /**
     * 场景 3：8 位 openId（边界） → 前 4 + 后 4 直接拼接，无中间星号。
     */
    @Test
    void mask_8CharOpenId_shouldConcatWithoutStars() {
        String openId = "o1234567"; // 8 位
        String masked = SensitiveDataMasker.mask(openId);
        assertEquals("o1234567", masked,
                "8 位 openId 前 4 + 后 4 直接拼接，无中间星号");
    }

    /**
     * 场景 4：5 位短串 openId → 全部星号（长度 &lt; 8 视为异常）。
     */
    @Test
    void mask_shortOpenId_shouldReturnAllStars() {
        String masked = SensitiveDataMasker.mask("abcde");
        assertEquals("*****", masked, "短串 openId 应全部星号");
        assertFalse(masked.contains("abc"),
                "短串脱敏后不应包含任何原始字符");
    }

    /**
     * 场景 5：null openId → 返回空串。
     */
    @Test
    void mask_nullOpenId_shouldReturnEmptyString() {
        assertEquals("", SensitiveDataMasker.mask(null),
                "null openId 应返回空串");
    }

    /**
     * 场景 6：空串 openId → 返回空串。
     */
    @Test
    void mask_emptyOpenId_shouldReturnEmptyString() {
        assertEquals("", SensitiveDataMasker.mask(""),
                "空串 openId 应返回空串");
    }

    /* ========== maskPhone(phone) ========== */

    /**
     * 场景 7：标准 11 位手机号脱敏 → 138****5678。
     */
    @Test
    void maskPhone_standard11Digit_shouldReturn138Format() {
        String masked = SensitiveDataMasker.maskPhone("13812345678");
        assertEquals("138****5678", masked, "标准手机号脱敏格式应为 138****5678");
        assertFalse(masked.contains("1234"),
                "脱敏结果不应包含手机号中间 4 位明文");
    }

    /**
     * 场景 8：8 位短号 → 前 3 + 1 个 * + 后 4（落入 8-10 位分支）。
     */
    @Test
    void maskPhone_8Digit_shouldKeepFirst3AndLast4() {
        String masked = SensitiveDataMasker.maskPhone("13856789"); // 8 位
        assertEquals("138*6789", masked, "8 位手机号应保留前 3 后 4，中间 1 个 *");
    }

    /**
     * 场景 9：3 位短串 → 全部星号。
     */
    @Test
    void maskPhone_3Digit_shouldReturnAllStars() {
        String masked = SensitiveDataMasker.maskPhone("138");
        assertEquals("***", masked, "3 位手机号应全部星号");
    }

    /**
     * 场景 10：null phone → 返回空串。
     */
    @Test
    void maskPhone_null_shouldReturnEmptyString() {
        assertEquals("", SensitiveDataMasker.maskPhone(null),
                "null 手机号应返回空串");
    }

    /**
     * 场景 11：空串 phone → 返回空串。
     */
    @Test
    void maskPhone_empty_shouldReturnEmptyString() {
        assertEquals("", SensitiveDataMasker.maskPhone(""),
                "空串手机号应返回空串");
    }

    /* ========== maskIdCard(idCard) ========== */

    /**
     * 场景 12：标准 18 位身份证号 → 前 6 + 8 个 * + 后 4。
     */
    @Test
    void maskIdCard_standard18Digit_shouldKeepFirst6AndLast4() {
        String idCard = "110101199001011234";
        String masked = SensitiveDataMasker.maskIdCard(idCard);
        assertEquals("110101********1234", masked,
                "18 位身份证脱敏应保留前 6 后 4，中间 8 个 *");
        assertFalse(masked.contains("19900101"),
                "脱敏结果不应包含出生日期明文");
    }

    /**
     * 场景 13：15 位老式身份证 → 前 6 + 5 个 * + 后 4。
     */
    @Test
    void maskIdCard_15Digit_shouldKeepFirst6AndLast4() {
        String idCard = "110101900101123"; // 15 位
        String masked = SensitiveDataMasker.maskIdCard(idCard);
        assertEquals("110101*****1123", masked);
        assertFalse(masked.contains("900101"),
                "脱敏结果不应包含出生日期明文");
    }

    /**
     * 场景 14：6 位短串 → 全部星号（长度 &lt; 10）。
     */
    @Test
    void maskIdCard_short6Digit_shouldReturnAllStars() {
        String masked = SensitiveDataMasker.maskIdCard("110101");
        assertEquals("******", masked, "6 位身份证短串应全部星号");
    }

    /**
     * 场景 15：null idCard → 返回空串。
     */
    @Test
    void maskIdCard_null_shouldReturnEmptyString() {
        assertEquals("", SensitiveDataMasker.maskIdCard(null),
                "null 身份证号应返回空串");
    }

    /**
     * 场景 16：空串 idCard → 返回空串。
     */
    @Test
    void maskIdCard_empty_shouldReturnEmptyString() {
        assertEquals("", SensitiveDataMasker.maskIdCard(""),
                "空串身份证号应返回空串");
    }

    /* ========== maskRealName(name) ========== */

    /**
     * 场景 17：双字姓名 "张三" → "张*"。
     */
    @Test
    void maskRealName_twoCharName_shouldKeepSurnameAndMaskRest() {
        assertEquals("张*", SensitiveDataMasker.maskRealName("张三"));
    }

    /**
     * 场景 18：三字姓名 "欧阳修" → "欧**"。
     */
    @Test
    void maskRealName_threeCharName_shouldKeepSurnameAndMaskRest() {
        assertEquals("欧**", SensitiveDataMasker.maskRealName("欧阳修"));
    }

    /**
     * 场景 19：四字姓名 "司马相如" → "司***"。
     */
    @Test
    void maskRealName_fourCharName_shouldKeepSurnameAndMaskRest() {
        assertEquals("司***", SensitiveDataMasker.maskRealName("司马相如"));
    }

    /**
     * 场景 20：单字姓名 "张" → 原样返回（无法脱敏）。
     */
    @Test
    void maskRealName_singleCharName_shouldReturnAsIs() {
        assertEquals("张", SensitiveDataMasker.maskRealName("张"),
                "单字姓名无法脱敏，原样返回");
    }

    /**
     * 场景 21：null name → 返回空串。
     */
    @Test
    void maskRealName_null_shouldReturnEmptyString() {
        assertEquals("", SensitiveDataMasker.maskRealName(null),
                "null 姓名应返回空串");
    }

    /**
     * 场景 22：空串 name → 返回空串。
     */
    @Test
    void maskRealName_empty_shouldReturnEmptyString() {
        assertEquals("", SensitiveDataMasker.maskRealName(""),
                "空串姓名应返回空串");
    }

    /* ========== maskToken(token) ========== */

    /**
     * 场景 23：标准 JWT token → 前 4 + 中间 * + 后 4。
     */
    @Test
    void maskToken_standardJwt_shouldKeepFirst4AndLast4() {
        String token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature";
        String masked = SensitiveDataMasker.maskToken(token);
        // token 末 4 位为 "ture"（signature 的末尾），前 4 位为 "eyJh"
        assertEquals("eyJh" + repeat('*', token.length() - 8) + "ture", masked,
                "token 脱敏应保留前 4 + 后 4，中间用 * 填充");
        // 安全断言：脱敏结果不应包含 token 主体明文（sub payload 部分）
        assertFalse(masked.contains("eyJzdWIiOiIxMjM"),
                "脱敏结果不应包含 token payload 明文");
        assertFalse(masked.contains(".signature"),
                "脱敏结果不应包含完整 signature 后缀明文");
    }

    /**
     * 场景 24：8 位 token → 前 4 + 后 4 直接拼接。
     */
    @Test
    void maskToken_8Char_shouldConcatWithoutStars() {
        assertEquals("abcdwxyz", SensitiveDataMasker.maskToken("abcdwxyz"),
                "8 位 token 前 4 + 后 4 直接拼接");
    }

    /**
     * 场景 25：7 位短 token → 返回 ***（视为异常）。
     */
    @Test
    void maskToken_shortToken_shouldReturnStars() {
        assertEquals("***", SensitiveDataMasker.maskToken("abcdefg"),
                "7 位短 token 视为异常，返回 ***");
    }

    /**
     * 场景 26：null token → 返回 ***。
     */
    @Test
    void maskToken_null_shouldReturnStars() {
        assertEquals("***", SensitiveDataMasker.maskToken(null),
                "null token 应返回 *** 而非空串（避免误判无 token）");
    }

    /**
     * 场景 27：空串 token → 返回 ***。
     */
    @Test
    void maskToken_empty_shouldReturnStars() {
        assertEquals("***", SensitiveDataMasker.maskToken(""),
                "空串 token 应返回 *** 而非空串");
    }

    /* ========== maskSecret(secret) ========== */

    /**
     * 场景 28：标准密钥 → 全部星号，长度与输入一致（12 个字符）。
     */
    @Test
    void maskSecret_standardSecret_shouldReturnAllStars() {
        String secret = "sk-abc123xyz"; // 12 个字符
        String masked = SensitiveDataMasker.maskSecret(secret);
        assertEquals("************", masked,
                "密钥应全部星号，长度与输入一致（12 个 *）");
        assertFalse(masked.contains("sk-abc"),
                "脱敏结果不应包含任何密钥明文片段");
    }

    /**
     * 场景 29：单字符密钥 → 返回 1 个 *。
     */
    @Test
    void maskSecret_singleChar_shouldReturnSingleStar() {
        assertEquals("*", SensitiveDataMasker.maskSecret("a"),
                "单字符密钥返回 1 个 *");
    }

    /**
     * 场景 30：null secret → 返回 ***。
     */
    @Test
    void maskSecret_null_shouldReturnStars() {
        assertEquals("***", SensitiveDataMasker.maskSecret(null),
                "null 密钥应返回 *** 而非空串");
    }

    /**
     * 场景 31：空串 secret → 返回 ***。
     */
    @Test
    void maskSecret_empty_shouldReturnStars() {
        assertEquals("***", SensitiveDataMasker.maskSecret(""),
                "空串密钥应返回 *** 而非空串");
    }

    /* ========== maskEmail(email) ========== */

    /**
     * 场景 32：标准邮箱 → @ 前 1 + 中间 * + 后 1，域名保留。
     */
    @Test
    void maskEmail_standardEmail_shouldMaskLocalPartAndKeepDomain() {
        String masked = SensitiveDataMasker.maskEmail("test@example.com");
        assertEquals("t**t@example.com", masked,
                "邮箱脱敏：@ 前前 1 后 1，中间 *；域名完整保留");
        assertFalse(masked.contains("es"),
                "脱敏结果不应包含 local part 中间明文");
    }

    /**
     * 场景 33：@ 前 2 位邮箱 → 前 1 + 1 个 * + 后 1。
     */
    @Test
    void maskEmail_twoCharLocalPart_shouldKeepFirstAndLast() {
        String masked = SensitiveDataMasker.maskEmail("ab@b.com");
        assertEquals("a*b@b.com", masked,
                "@ 前 2 位邮箱：前 1 + 1 个 * + 后 1");
    }

    /**
     * 场景 34：@ 前 1 位邮箱 → 原样返回（无法脱敏）。
     */
    @Test
    void maskEmail_singleCharLocalPart_shouldReturnAsIs() {
        assertEquals("a@b.com", SensitiveDataMasker.maskEmail("a@b.com"),
                "@ 前 1 位无法脱敏，原样返回");
    }

    /**
     * 场景 35：无 @ 的字符串 → 原样返回。
     */
    @Test
    void maskEmail_noAtSign_shouldReturnAsIs() {
        assertEquals("invalid-email", SensitiveDataMasker.maskEmail("invalid-email"),
                "无 @ 的字符串原样返回");
    }

    /**
     * 场景 36：null email → 返回空串。
     */
    @Test
    void maskEmail_null_shouldReturnEmptyString() {
        assertEquals("", SensitiveDataMasker.maskEmail(null),
                "null 邮箱应返回空串");
    }

    /**
     * 场景 37：空串 email → 返回空串。
     */
    @Test
    void maskEmail_empty_shouldReturnEmptyString() {
        assertEquals("", SensitiveDataMasker.maskEmail(""),
                "空串邮箱应返回空串");
    }

    /* ========== 工具类不可实例化 ========== */

    /**
     * 场景 38：尝试实例化工具类 → 反射抛 {@link java.lang.reflect.InvocationTargetException}，
     * 其 cause 为 {@link UnsupportedOperationException}。
     *
     * <p>说明：{@code Constructor.newInstance()} 会将构造器内抛出的异常包装为
     * {@link java.lang.reflect.InvocationTargetException}，需解包 cause 后才能验证
     * 真正抛出的异常类型。</p>
     */
    @Test
    void constructor_shouldThrowUnsupportedOperationException() {
        // 通过反射调用私有构造器
        java.lang.reflect.Constructor<SensitiveDataMasker> ctor;
        try {
            ctor = SensitiveDataMasker.class.getDeclaredConstructor();
        } catch (NoSuchMethodException e) {
            throw new AssertionError("应为工具类自动生成默认无参构造器", e);
        }
        ctor.setAccessible(true);
        // 反射调用 newInstance 时，JDK 会把目标构造器抛出的异常包装为 InvocationTargetException
        java.lang.reflect.InvocationTargetException thrown = assertThrows(
                java.lang.reflect.InvocationTargetException.class,
                () -> ctor.newInstance(),
                "工具类不可实例化，构造器内抛 UnsupportedOperationException，被反射包装为 InvocationTargetException");
        // 验证 cause 为 UnsupportedOperationException（真正的异常类型）
        assertNotNull(thrown.getCause(),
                "InvocationTargetException 的 cause 不应为 null");
        assertTrue(thrown.getCause() instanceof UnsupportedOperationException,
                "InvocationTargetException 的 cause 应为 UnsupportedOperationException，实际为: "
                        + thrown.getCause().getClass().getName());
    }

    /* ========== 综合安全断言 ========== */

    /**
     * 场景 39：所有脱敏方法返回值不为 null（避免 NPE 蔓延到调用方）。
     */
    @Test
    void allMaskMethods_shouldNeverReturnNull() {
        assertNotNull(SensitiveDataMasker.mask(null));
        assertNotNull(SensitiveDataMasker.maskPhone(null));
        assertNotNull(SensitiveDataMasker.maskIdCard(null));
        assertNotNull(SensitiveDataMasker.maskRealName(null));
        assertNotNull(SensitiveDataMasker.maskToken(null));
        assertNotNull(SensitiveDataMasker.maskSecret(null));
        assertNotNull(SensitiveDataMasker.maskEmail(null));
    }

    /**
     * 场景 40：综合验证 - 脱敏后结果不含原始敏感字段的关键明文片段。
     *
     * <p>覆盖任务要求"验证脱敏后不含原始敏感子串"。</p>
     */
    @Test
    void allMaskMethods_shouldNotContainOriginalSensitiveSubstring() {
        String openId = "oK5aBcDeFgHiJkL";
        assertFalse(SensitiveDataMasker.mask(openId).contains("BcDeFgH"));

        String phone = "13812345678";
        assertFalse(SensitiveDataMasker.maskPhone(phone).contains("1234"));

        String idCard = "110101199001011234";
        assertFalse(SensitiveDataMasker.maskIdCard(idCard).contains("19900101"));

        String token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature";
        assertFalse(SensitiveDataMasker.maskToken(token).contains("eyJzdWIiOiIxMjM"));

        String secret = "sk-abc123xyz";
        assertFalse(SensitiveDataMasker.maskSecret(secret).contains("abc123"));
    }

    /**
     * 辅助方法：将字符重复 n 次（与被测类内部 repeat 逻辑保持独立，避免循环依赖）。
     *
     * @param c 字符
     * @param n 重复次数
     * @return 由 n 个 c 组成的字符串
     */
    private static String repeat(char c, int n) {
        if (n <= 0) {
            return "";
        }
        char[] arr = new char[n];
        java.util.Arrays.fill(arr, c);
        return new String(arr);
    }
}
