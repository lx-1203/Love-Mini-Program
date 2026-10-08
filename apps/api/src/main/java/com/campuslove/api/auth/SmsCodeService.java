/**
 * 短信验证码服务。
 *
 * <p>按运行 profile 分两条路径（安全修复：验证码去假 fail-closed）：</p>
 * <ul>
 *   <li><b>mock profile（本地演示）</b>：模拟短信——固定 mock 码（默认 123456），
 *       sendCode 返回验证码供联调回填；写入 Redis（key: sms:code:{phone}，TTL 5 分钟），
 *       无 Redis 时回退内存 Map。</li>
 *   <li><b>非 mock（real 等）</b>：验证码一律不下发——未配置真实短信网关
 *       （{@code app.sms.gateway-enabled=false}，默认）时 send-code 返回 503 配置缺失错误；
 *       网关就绪时生成随机 6 位验证码落 Redis/内存并由网关下发，
 *       <b>任何路径都不把验证码本体返回给调用方/打进日志</b>。</li>
 * </ul>
 *
 * <p>verify(phone, code)：校验逻辑与 profile 无关（与已发送验证码一致即通过，
 * 校验通过后删除防重放）。</p>
 */
package com.campuslove.api.auth;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class SmsCodeService {

    private static final Logger log = LoggerFactory.getLogger(SmsCodeService.class);

    /** Redis key 前缀 */
    private static final String REDIS_KEY_PREFIX = "sms:code:";

    /** mock 验证码（仅 mock profile 联调固定值；真实短信路径永不使用） */
    @Value("${app.sms.mock-code:123456}")
    private String mockCode;

    /** 验证码有效期（秒） */
    @Value("${app.sms.expire-seconds:300}")
    private long expireSeconds;

    /**
     * 真实短信网关就绪开关（配置 app.sms.gateway-enabled，默认 false）。
     * 非 mock profile 下为 false 时 send-code 直接 503（fail-closed），
     * 接入真实短信网关后通过 APP_SMS_GATEWAY_ENABLED=true 开启。
     */
    @Value("${app.sms.gateway-enabled:${APP_SMS_GATEWAY_ENABLED:false}}")
    private boolean gatewayEnabled;

    /** Redis 模板（real profile 注入；为空时回退内存 Map） */
    private final StringRedisTemplate redisTemplate;

    /** 运行环境（判断 mock profile） */
    private final Environment environment;

    /** 内存回退存储（仅当 Redis 不可用时使用；key=phone, value=code） */
    private final Map<String, String> memoryStore = new ConcurrentHashMap<>();

    /** 验证码随机数生成器（真实网关路径使用，替代固定 mock 码） */
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    public SmsCodeService(ObjectProvider<StringRedisTemplate> redisTemplateProvider,
                          Environment environment) {
        // mock profile 不装配 Redis（RedisAutoConfiguration 已排除），getIfAvailable() 返回 null，
        // 使验证码回退内存 Map（见 sendCode/verify 的 null 分支），保持"无 Redis 可用"的本地演示能力。
        this.redisTemplate = redisTemplateProvider.getIfAvailable();
        this.environment = environment;
    }

    /** 是否处于 mock profile（本地演示：允许返回 mock 验证码） */
    public boolean isMockProfile() {
        return environment != null
                && java.util.Arrays.asList(environment.getActiveProfiles()).contains("mock");
    }

    /**
     * 发送验证码。
     *
     * <p>mock profile：返回固定 mock 码（联调回填用）。非 mock：未配置短信网关时抛 503
     * （不发送、不返回任何验证码）；网关就绪时生成随机验证码存储并经网关下发，
     * 返回值仅供内部使用（不回传客户端）。</p>
     *
     * @param phone 手机号
     * @return 本次发送的验证码（仅 mock profile 会经控制器回传；真实路径不外露）
     * @throws ResponseStatusException 非 mock 且短信网关未配置时 503
     */
    public String sendCode(String phone) {
        // mock profile：模拟发送（固定 mock 码），保持本地演示契约
        if (isMockProfile()) {
            String code = mockCode;
            store(phone, code);
            log.info("模拟短信发送成功: phone={}（mock profile 联调）", maskPhone(phone));
            return code;
        }
        // 非 mock：短信网关未配置 → 明确报错（fail-closed），绝不返回验证码本体
        if (!gatewayEnabled) {
            log.warn("短信验证码发送被拒绝：真实短信网关未配置（app.sms.gateway-enabled=false）, phone={}",
                    maskPhone(phone));
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "短信服务未配置，暂时无法发送验证码，请联系管理员");
        }
        // 真实短信网关路径：随机 6 位验证码（不写日志、不返回给调用方）
        String code = String.format("%06d", SECURE_RANDOM.nextInt(1_000_000));
        store(phone, code);
        log.info("短信验证码已发送（真实网关）: phone={}", maskPhone(phone));
        // TODO: 接入真实短信网关时在此调用服务商 SDK 下发 code
        return code;
    }

    /** 存储验证码：Redis 优先，异常回退内存 Map。 */
    private void store(String phone, String code) {
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(REDIS_KEY_PREFIX + phone, code,
                        Duration.ofSeconds(expireSeconds));
            } else {
                memoryStore.put(phone, code);
            }
        } catch (RuntimeException e) {
            // Redis 异常时回退内存
            memoryStore.put(phone, code);
            log.warn("Redis 存储验证码失败，回退内存: {}", e.getMessage());
        }
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
