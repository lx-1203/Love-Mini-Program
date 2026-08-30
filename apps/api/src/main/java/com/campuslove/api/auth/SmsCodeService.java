/**
 * 短信验证码服务（模拟实现）。
 *
 * 背景：项目当前无短信基础设施（短信网关/模板均未接入）。
 * 本服务提供**模拟短信验证码**收发：
 *   - sendCode(phone)：生成 6 位验证码并"发送"（默认固定 mock 码 123456，便于联调），
 *     同时写入 Redis（key: sms:code:{phone}，TTL 5 分钟）；无 Redis 时回退内存 Map。
 *   - verify(phone, code)：校验验证码（与已发送的 mock 码一致即通过）。
 *
 * 生产接入真实短信网关时：仅需替换本类的发送实现（对接短信服务商），
 * 校验逻辑与接口契约保持不变。
 */
package com.campuslove.api.auth;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
public class SmsCodeService {

    private static final Logger log = LoggerFactory.getLogger(SmsCodeService.class);

    /** Redis key 前缀 */
    private static final String REDIS_KEY_PREFIX = "sms:code:";

    /** mock 验证码（联调固定值；真实短信网关接入后由生成逻辑替换） */
    @Value("${app.sms.mock-code:123456}")
    private String mockCode;

    /** 验证码有效期（秒） */
    @Value("${app.sms.expire-seconds:300}")
    private long expireSeconds;

    /** Redis 模板（real profile 注入；为空时回退内存 Map） */
    private final StringRedisTemplate redisTemplate;

    /** 内存回退存储（仅当 Redis 不可用时使用；key=phone, value=code） */
    private final Map<String, String> memoryStore = new ConcurrentHashMap<>();

    public SmsCodeService(ObjectProvider<StringRedisTemplate> redisTemplateProvider) {
        // mock profile 不装配 Redis（RedisAutoConfiguration 已排除），getIfAvailable() 返回 null，
        // 使验证码回退内存 Map（见 sendCode/verify 的 null 分支），保持"无 Redis 可用"的本地演示能力。
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
    }

    /**
     * 模拟发送验证码：返回验证码（联调用），并存储供校验。
     *
     * @param phone 手机号
     * @return 本次"发送"的验证码（真实短信场景不返回给调用方，此处为模拟联调）
     */
    public String sendCode(String phone) {
        // 模拟发送：固定 mock 码（真实实现：随机 6 位 + 短信网关下发）
        String code = mockCode;
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(REDIS_KEY_PREFIX + phone, code, Duration.ofSeconds(expireSeconds));
            } else {
                memoryStore.put(phone, code);
            }
            log.info("模拟短信发送成功: phone={}, code={}（联调 mock，真实短信网关接入后不再打印）",
                    maskPhone(phone), code);
        } catch (RuntimeException e) {
            // Redis 异常时回退内存
            memoryStore.put(phone, code);
            log.warn("Redis 存储验证码失败，回退内存: {}", e.getMessage());
        }
        return code;
    }

    /**
     * 校验验证码。
     *
     * @param phone 手机号
     * @param code  用户输入的验证码
     * @return true 通过
     */
    public boolean verify(String phone, String code) {
        if (phone == null || code == null || code.isBlank()) {
            return false;
        }
        String stored;
        try {
            if (redisTemplate != null) {
                stored = redisTemplate.opsForValue().get(REDIS_KEY_PREFIX + phone);
            } else {
                stored = memoryStore.get(phone);
            }
        } catch (RuntimeException e) {
            stored = memoryStore.get(phone);
        }
        boolean ok = code.trim().equals(stored);
        if (ok && redisTemplate != null) {
            // 一次性验证码：校验通过后删除，防重放
            redisTemplate.delete(REDIS_KEY_PREFIX + phone);
        }
        return ok;
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
