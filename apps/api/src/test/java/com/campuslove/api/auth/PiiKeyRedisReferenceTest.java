package com.campuslove.api.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Map;
import java.util.regex.Pattern;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.test.util.ReflectionTestUtils;

/**
 * PII 不得出现在 Redis key 名里（2026-10-31 数据轨 P2）。
 *
 * <p>Redis 以 AOF 持久化运行，key 名会落盘并随备份长期留存，value 的 TTL 管不到它。
 * 本类是这次改动的<b>唯一判点</b>：用 ArgumentCaptor 抓到真正传给 template 的 key，
 * 断言它匹配 {@code ^prefix:[0-9a-f]{32}$} 且不含手机号/账号本体。
 * 谁要是把 key 改回 {@code REDIS_KEY_PREFIX + phone} 字符串拼接，下面这几条立刻变红。</p>
 */
class PiiKeyRedisReferenceTest {

    private static final String PHONE = "13800001111";
    private static final String ADMIN = "admin";
    private static final String SECRET = "unit-test-aes-secret-0123456789abcdef";
    /** 定长小写十六进制引用段（128 bit 截断） */
    private static final Pattern HEX32 = Pattern.compile("^[0-9a-f]{32}$");

    @SuppressWarnings("unchecked")
    private static ObjectProvider<StringRedisTemplate> providerReturning(StringRedisTemplate template) {
        ObjectProvider<StringRedisTemplate> provider = mock(ObjectProvider.class);
        when(provider.getIfAvailable()).thenReturn(template);
        return provider;
    }

    private static SmsCodeService mockSmsService(StringRedisTemplate template, String secret) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("mock");
        SmsCodeService service = new SmsCodeService(providerReturning(template), environment);
        ReflectionTestUtils.setField(service, "piiKeySecret", secret);
        ReflectionTestUtils.setField(service, "expireSeconds", 300L);
        ReflectionTestUtils.setField(service, "mockCode", "123456");
        return service;
    }

    private static LoginAttemptService loginService(StringRedisTemplate template, String secret) {
        LoginAttemptService service = new LoginAttemptService(providerReturning(template));
        ReflectionTestUtils.setField(service, "piiKeySecret", secret);
        ReflectionTestUtils.setField(service, "maxFailures", 5);
        ReflectionTestUtils.setField(service, "lockMinutes", 15);
        return service;
    }

    /**
     * 核心断言：sendCode → verify 同手机号仍然打通（行为不变），
     * 且两次落到 Redis 的 key 都不含手机号。
     */
    @Test
    @DisplayName("SmsCodeService：Redis key 不含手机号，且 sendCode→verify 仍可往返")
    @SuppressWarnings("unchecked")
    void smsRedisKeyMustNotContainPhone_butRoundTripStillWorks() {
        StringRedisTemplate template = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(template.opsForValue()).thenReturn(valueOps);
        SmsCodeService service = mockSmsService(template, SECRET);

        String code = service.sendCode(PHONE);
        ArgumentCaptor<String> setKey = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> setValue = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Duration> setTtl = ArgumentCaptor.forClass(Duration.class);
        verify(valueOps).set(setKey.capture(), setValue.capture(), setTtl.capture());
        assertEquals("123456", code, "mock profile 仍回传固定验证码供联调");
        assertEquals("123456", setValue.getValue());
        assertEquals(Duration.ofSeconds(300), setTtl.getValue(), "TTL 语义不变");
        assertPiiFreeKey(setKey.getValue(), "sms:code:", PHONE);

        // 用写入的同一个 key 读回，模拟 Redis 真实行为。
        // 注意：verify() 现在除了读验证码键，还会读"失败次数"键（防重放/防暴力枚举），
        // 所以桩必须【按 key 分别给值】：只给验证码键返回真码，其余键返回 null。
        // 早先用 anyString() 一把梭会让失败计数键也读到 "123456"，
        // 于是被测方以为已经失败了十二万次去清理计数键 —— 那是一条假红，
        // 也是"夹具替产品撒了谎"的形状。
        final String codeKey = setKey.getValue();
        when(valueOps.get(org.mockito.ArgumentMatchers.argThat(k -> k != null && k.equals(codeKey))))
                .thenReturn("123456");
        when(valueOps.get(org.mockito.ArgumentMatchers.argThat(k -> k != null && !k.equals(codeKey))))
                .thenReturn(null);
        assertTrue(service.verify(PHONE, "123456"), "同一手机号 sendCode 后 verify 必须仍然通过");
        ArgumentCaptor<String> getKey = ArgumentCaptor.forClass(String.class);
        verify(valueOps, org.mockito.Mockito.atLeastOnce()).get(getKey.capture());
        for (String observed : getKey.getAllValues()) {
            // 前缀必须按【这条键自己的前缀】传：assertPiiFreeKey 判的是"前缀之后是一段 32 位十六进制"，
            // 把失败计数键（sms:fail:...）也按 "sms:code:" 或 "sms:" 喂进去，等于自己造一条假红。
            String observedPrefix = observed.startsWith("sms:code:") ? "sms:code:"
                    : observed.startsWith("sms:fail:") ? "sms:fail:" : null;
            assertTrue(observedPrefix != null,
                    "出现未登记的 sms 键前缀，判点覆盖面需要补齐：" + observed);
            assertPiiFreeKey(observed, observedPrefix, PHONE);
        }
        assertTrue(getKey.getAllValues().contains(codeKey),
                "读写必须命中同一个 key，否则往返不可能成立；实际读过的 key=" + getKey.getAllValues());

        ArgumentCaptor<String> delKey = ArgumentCaptor.forClass(String.class);
        verify(template, org.mockito.Mockito.atLeastOnce()).delete(delKey.capture());
        for (String deleted : delKey.getAllValues()) {
            assertTrue(deleted.startsWith("sms:code:") || deleted.startsWith("sms:fail:"),
                    "被删除的键不属于本服务应有的命名：" + deleted);
            assertPiiFreeKey(deleted, deleted.startsWith("sms:code:") ? "sms:code:" : "sms:fail:", PHONE);
        }
    }

    @Test
    @DisplayName("SmsCodeService：verify 传错码不通过（防重放删除只在成功时发生）")
    @SuppressWarnings("unchecked")
    void smsVerifyRejectsWrongCode() {
        StringRedisTemplate template = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(template.opsForValue()).thenReturn(valueOps);
        SmsCodeService service = mockSmsService(template, SECRET);
        service.sendCode(PHONE);
        ArgumentCaptor<String> storedKey = ArgumentCaptor.forClass(String.class);
        verify(valueOps).set(storedKey.capture(), any(), any(Duration.class));
        final String codeKey = storedKey.getValue();
        // 只让【验证码键】返回真码；失败计数键返回 null（与真实 Redis 里"键不存在"一致）。
        when(valueOps.get(org.mockito.ArgumentMatchers.argThat(k -> k != null && k.equals(codeKey))))
                .thenReturn("123456");
        when(valueOps.get(org.mockito.ArgumentMatchers.argThat(k -> k != null && !k.equals(codeKey))))
                .thenReturn(null);

        assertFalse(service.verify(PHONE, "000000"));
        // 判点收窄到"验证码键不能被失败尝试消费掉"：
        // 清掉【失败计数】键是正当行为，用 anyString() 一律禁止会把正当实现判成红。
        verify(template, never()).delete(org.mockito.ArgumentMatchers.eq(codeKey));
    }

    /** 内存兜底路径（无 Redis）也必须不存裸手机号，且往返可用。 */
    @Test
    @DisplayName("SmsCodeService：Redis 缺席时内存兜底仍往返，且内存 key 不含手机号")
    @SuppressWarnings("unchecked")
    void memoryFallbackRoundTripsWithoutPhoneKey() {
        SmsCodeService service = mockSmsService(null, SECRET);

        String code = service.sendCode(PHONE);
        Map<String, String> memoryStore =
                (Map<String, String>) ReflectionTestUtils.getField(service, "memoryStore");
        assertEquals(1, memoryStore.size(), "无 Redis 时必须回退内存 Map");
        String storeKey = memoryStore.keySet().iterator().next();
        assertFalse(storeKey.contains(PHONE), "内存 Map 的 key 同样不得存裸手机号");
        assertTrue(HEX32.matcher(storeKey).matches(), "内存 key 段应为定长十六进制引用，实测=" + storeKey);
        assertTrue(service.verify(PHONE, code), "内存兜底路径必须仍能 sendCode→verify 往返");
    }

    @Test
    @DisplayName("LoginAttemptService：login:fail / login:lock 的 key 不含手机号或管理员用户名")
    @SuppressWarnings("unchecked")
    void loginAttemptKeysMustNotContainAccount() {
        StringRedisTemplate template = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(template.opsForValue()).thenReturn(valueOps);
        when(valueOps.increment(anyString())).thenReturn(5L);
        LoginAttemptService service = loginService(template, SECRET);

        service.recordFailure(PHONE);

        ArgumentCaptor<String> incKey = ArgumentCaptor.forClass(String.class);
        verify(valueOps).increment(incKey.capture());
        assertPiiFreeKey(incKey.getValue(), "login:fail:", PHONE);

        ArgumentCaptor<String> lockKey = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> lockValue = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Duration> lockTtl = ArgumentCaptor.forClass(Duration.class);
        verify(valueOps).set(lockKey.capture(), lockValue.capture(), lockTtl.capture());
        assertPiiFreeKey(lockKey.getValue(), "login:lock:", PHONE);
        assertEquals("1", lockValue.getValue());
        assertEquals(Duration.ofMinutes(15), lockTtl.getValue());
        // 达到上限后清掉自己的失败计数 key
        ArgumentCaptor<String> deleted = ArgumentCaptor.forClass(String.class);
        verify(template).delete(deleted.capture());
        assertEquals(incKey.getValue(), deleted.getValue(), "锁定时清的是自己的失败计数 key");

        // 管理员用户名维度同样不得出现在 key 名里
        service.recordFailure(ADMIN);
        ArgumentCaptor<String> adminKey = ArgumentCaptor.forClass(String.class);
        verify(valueOps, org.mockito.Mockito.times(2)).increment(adminKey.capture());
        String last = adminKey.getAllValues().get(1);
        assertFalse(last.contains(ADMIN), "管理员用户名同样不能拼进 key 名，实测=" + last);
        assertPiiFreeKey(last, "login:fail:", ADMIN);
        assertNotEquals(incKey.getValue(), last, "不同账号必须落到不同计数 key，否则锁定互相串号");
    }

    @Test
    @DisplayName("LoginAttemptService：首次失败的计数窗口 TTL 与 isLocked/reset 仍命中同一个无 PII key")
    @SuppressWarnings("unchecked")
    void loginAttemptTtlAndLookupKeysAreConsistent() {
        StringRedisTemplate template = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(template.opsForValue()).thenReturn(valueOps);
        when(valueOps.increment(anyString())).thenReturn(1L);
        LoginAttemptService service = loginService(template, SECRET);

        service.recordFailure(PHONE);

        ArgumentCaptor<String> incKey = ArgumentCaptor.forClass(String.class);
        verify(valueOps).increment(incKey.capture());
        ArgumentCaptor<String> expireKey = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Duration> expireTtl = ArgumentCaptor.forClass(Duration.class);
        verify(template).expire(expireKey.capture(), expireTtl.capture());
        assertEquals(incKey.getValue(), expireKey.getValue(), "TTL 必须打在同一个计数 key 上");
        assertEquals(Duration.ofMinutes(15), expireTtl.getValue());
        assertPiiFreeKey(expireKey.getValue(), "login:fail:", PHONE);

        when(template.hasKey(anyString())).thenReturn(Boolean.TRUE);
        assertTrue(service.isLocked(PHONE));
        ArgumentCaptor<String> hasKey = ArgumentCaptor.forClass(String.class);
        verify(template).hasKey(hasKey.capture());
        assertPiiFreeKey(hasKey.getValue(), "login:lock:", PHONE);

        service.reset(PHONE);
        ArgumentCaptor<String> delAll = ArgumentCaptor.forClass(String.class);
        verify(template, org.mockito.Mockito.times(2)).delete(delAll.capture());
        assertPiiFreeKey(delAll.getAllValues().get(0), "login:fail:", PHONE);
        assertPiiFreeKey(delAll.getAllValues().get(1), "login:lock:", PHONE);
    }

    /**
     * 域分隔：同一手机号在短信链路与登录链路下的引用值必须不同，
     * 否则两类 key 互为字典表，一旦一侧被反查另一侧连带失守。
     */
    @Test
    @DisplayName("PiiKeyReference：按 purpose 域分隔，同一手机号在 sms/login 下引用值不同")
    void domainSeparationBetweenSmsAndLogin() {
        String smsRef = PiiKeyReference.of(SECRET, "sms-code", PHONE);
        String loginRef = PiiKeyReference.of(SECRET, "login-attempt", PHONE);
        assertTrue(HEX32.matcher(smsRef).matches(), "引用值应为 32 位小写十六进制");
        assertTrue(HEX32.matcher(loginRef).matches());
        assertNotEquals(smsRef, loginRef, "同一手机号在两个用途下必须得到不同引用（域分隔失效）");
        assertEquals(smsRef, PiiKeyReference.of(SECRET, "sms-code", PHONE),
                "同一 (secret, purpose, value) 必须稳定——否则 sendCode 后 verify 取不到同一个 key");
        assertNotEquals(smsRef, PiiKeyReference.of(SECRET, "sms-code", "13800001112"),
                "不同手机号必须得到不同引用，否则 key 空间被压平");
    }

    /** 裸 SHA-256 号码空间可枚举，必须用带密钥的 HMAC。 */
    @Test
    @DisplayName("PiiKeyReference：有密钥时是 HMAC（不等于裸 SHA-256 摘要），无密钥时退化为摘要")
    @SuppressWarnings("unchecked")
    void keyedDerivationIsNotBareDigest() throws Exception {
        String keyed = PiiKeyReference.of(SECRET, "sms-code", PHONE);
        MessageDigest sha = MessageDigest.getInstance("SHA-256");
        String barePhoneDigest = toHex(sha.digest(PHONE.getBytes(StandardCharsets.UTF_8))).substring(0, 32);
        assertNotEquals(barePhoneDigest, keyed, "key 段不得是「裸手机号的无密钥摘要」——号码空间可枚举");
        String bareLabelledDigest = toHex(
                sha.digest(("pii-keyref:v1:sms-code:" + PHONE).getBytes(StandardCharsets.UTF_8))).substring(0, 32);
        assertNotEquals(bareLabelledDigest, keyed, "带标签但仍不加密钥的摘要同样可被枚举，必须走 HMAC");

        // 密钥为空（mock profile / 手工 new 的测试对象）→ 不抛错、仍是不可逆定长引用
        String unkeyed = PiiKeyReference.of("", "sms-code", PHONE);
        assertTrue(HEX32.matcher(unkeyed).matches());
        assertNotEquals(PHONE, unkeyed);
        assertEquals(unkeyed, PiiKeyReference.of(null, "sms-code", PHONE));

        // 真实服务在无密钥时仍可往返（不因兜底路径炸掉本地演示）
        StringRedisTemplate template = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(template.opsForValue()).thenReturn(valueOps);
        SmsCodeService noSecret = mockSmsService(template, "");
        noSecret.sendCode(PHONE);
        ArgumentCaptor<String> key = ArgumentCaptor.forClass(String.class);
        verify(valueOps).set(key.capture(), anyString(), any(Duration.class));
        assertPiiFreeKey(key.getValue(), "sms:code:", PHONE);
        when(valueOps.get(key.getValue())).thenReturn("123456");
        assertTrue(noSecret.verify(PHONE, "123456"));
    }

    /** key 必须是「前缀 + 32 位十六进制引用」，且不含敏感原值。 */
    private static void assertPiiFreeKey(String actualKey, String expectedPrefix, String pii) {
        assertFalse(actualKey.contains(pii), "Redis key 名不得含敏感原值（AOF 会把它落盘），实测=" + actualKey);
        assertTrue(actualKey.startsWith(expectedPrefix),
                "前缀保持不变便于运维按前缀排障，实测=" + actualKey);
        String segment = actualKey.substring(expectedPrefix.length());
        assertTrue(HEX32.matcher(segment).matches(),
                "key 段应为定长十六进制引用而非拼接原值，实测=" + actualKey);
    }

    private static String toHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) {
            sb.append(Character.forDigit((b >> 4) & 0xF, 16));
            sb.append(Character.forDigit(b & 0xF, 16));
        }
        return sb.toString();
    }
}
