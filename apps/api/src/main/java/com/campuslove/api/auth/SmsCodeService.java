/**
 * 短信验证码服务。
 *
 * <p>按运行 profile 分两条路径（安全修复：验证码去假 fail-closed）：</p>
 * <ul>
 *   <li><b>mock profile（本地演示）</b>：模拟短信——固定 mock 码（默认 123456），
 *       sendCode 返回验证码供联调回填；写入 Redis（key: sms:code:{keyRef}，TTL 5 分钟），
 *       无 Redis 时回退内存 Map。{@code keyRef} 是手机号的 HMAC-SHA256 定长引用，
 *       <b>key 名不含手机号</b>（见下「key 名隐私」）。</li>
 *   <li><b>非 mock（real 等）</b>：验证码一律不下发——未配置真实短信网关
 *       （{@code app.sms.gateway-enabled=false}，默认）或仅打开开关但尚未接入 provider 时，
 *       send-code 均返回 503 配置缺失错误，且不生成、不保存任何验证码。</li>
 * </ul>
 *
 * <p>verify(phone, code)：校验逻辑与 profile 无关（与已发送验证码一致即通过，
 * 校验通过后删除防重放）。</p>
 *
 * <p><b>失败尝试上限（2026-10-31 限流轨 P1，缺陷 4）</b>：verify 自带按手机号的
 * 失败计数（Redis {@code sms:fail:<keyRef>} INCR+EXPIRE，无 Redis 时内存兜底），
 * 达到 {@code app.sms.max-failed-attempts}（默认 5）即<b>作废当前码</b>并要求重新发码。
 * 算术：6 位码＝{@code 10^6} 空间、TTL 300 秒；修复前尝试次数只受调用端点
 * （注册，capacity 10 / refill 0.1/s）约束 ⇒ 单码生命周期约 40 次猜测
 * ＝{@code 4×10^-5} 命中率，且分散到多 IP/多号码后可继续放大；
 * 现在每码预算 5 次＝{@code 5×10^-6}，超出必须重新发短信（发码受每号 1 次/分钟 +
 * 每 IP 10 突发/每分钟 1 次封顶）。真实 provider 尚未接入，所以本轮消除的是
 * <b>潜在</b>成本与潜在爆破面，不是当前已发生的损失。</p>
 *
 * <p><b>key 名隐私（2026-10-31 数据轨 P2）</b>：Redis 以 AOF 持久化运行，
 * key 名会原样追加进 {@code appendonly.aof} 并随备份长期留存，value 的 5 分钟 TTL
 * 管不到它。故 key 段不再拼裸手机号，改用 {@link PiiKeyReference} 的
 * HMAC-SHA256 定长引用（带域分隔标签，不可逆、不可跨服务当字典表）。
 * 日志仍只出 {@link #maskPhone} 的掩码号。</p>
 *
 * <p><b>一次性上线副作用（不是 bug，勿回滚）</b>：key 引用格式变更后，
 * 变更<b>之前</b>已写入、仍活在 Redis 里的旧 {@code sms:code:<手机号>} key
 * 对新代码不可达——那些「正在输入验证码」的会话会在最长 5 分钟
 * （{@code app.sms.expire-seconds}）内需重新点一次「获取验证码」。
 * 老 key 会自行按 TTL 过期，无需手工清理；上线窗口后该现象自然消失。</p>
 */
package com.campuslove.api.auth;

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

    /**
     * 失败尝试计数 key 前缀（缺陷 4）：与验证码本体同域引用（{@link #KEYREF_PURPOSE}），
     * 因此同样是"HMAC 引用、key 名不含手机号"，不会把号码写进 AOF。
     */
    private static final String FAILED_KEY_PREFIX = "sms:fail:";

    /** 默认失败尝试上限（可通过 {@code app.sms.max-failed-attempts} 覆盖）。 */
    static final int MAX_FAILED_ATTEMPTS_DEFAULT = 5;

    /**
     * key 引用域分隔用途（见 {@link PiiKeyReference}）。
     * 与登录失败计数的用途不同，故同一手机号在两个服务下的 key 引用值不同。
     */
    private static final String KEYREF_PURPOSE = "sms-code";

    /**
     * PII key 引用派生用的服务端密钥，来源与 {@code AesEncryptor} 一致
     * （{@code app.security.aes-secret} / {@code APP_AES_SECRET}）。
     *
     * <p>字段注入，不走构造器：{@code SmsCodeServiceGatewayTest} 等单测按位置
     * 两参构造本服务，改签名会连带破坏它们。real profile 下 strict-aes 已强制非空；
     * 为空（mock profile / 手工 new 的测试对象）时 {@link PiiKeyReference}
     * 回退不加密钥摘要并全 JVM 打一次 warn。</p>
     */
    @Value("${app.security.aes-secret:}")
    private String piiKeySecret;

    /** mock 验证码（仅 mock profile 联调固定值；真实短信路径永不使用） */
    @Value("${app.sms.mock-code:123456}")
    private String mockCode;

    /** 验证码有效期（秒） */
    @Value("${app.sms.expire-seconds:300}")
    private long expireSeconds;

    /**
     * 同一手机号的验证码失败尝试上限（{@code app.sms.max-failed-attempts}，默认 5）。
     *
     * <p>算术口径（诚实版，2026-10-31）：6 位数字码＝{@code 10^6} 种可能，
     * 码 TTL＝{@code app.sms.expire-seconds}（默认 300 秒）。修复前没有任何失败计数，
     * 尝试次数只受"调用端点的 @RateLimit"约束：唯一的调用方是注册链路
     * （{@code POST /api/v1/auth/register}，capacity=10、refill=0.1/s），
     * 也就是单桶 {@code 10 + 300/10 = 40} 次尝试／一个码的生命周期
     * ⇒ 命中率 {@code 40 / 10^6 = 4×10^-5}，且桶会随 IP（缺陷 2 下塌成全站单桶）
     * 与多号码/多 IP 分散而放大。加限后：单码预算 {@code max-failed-attempts=5}
     * ⇒ {@code 5 / 10^6 = 5×10^-6}，超出即作废本码，再猜必须重新发码
     * （发码受每号 1 次/分钟 + 每 IP 10 突发/1 次每分钟封顶，见
     * {@code SmsCodeController}），于是爆破的代价从"免费请求"变成"真实短信"。</p>
     *
     * <p>手工 {@code new} 出来的实例（单测）该字段为 0，由
     * {@link #resolveMaxFailedAttempts()} 回退到默认 5，不会出现"0 次即锁死"。</p>
     */
    @Value("${app.sms.max-failed-attempts:5}")
    private int maxFailedAttempts;

    /**
     * 真实短信网关就绪开关（配置 app.sms.gateway-enabled，默认 false）。
     * 当前仓库尚无真实 provider：即使误设为 true，send-code 仍 fail-closed 返回 503，
     * 绝不生成验证码或向客户端声称已发送。接入 provider 后才可在此路径实现下发。
     */
    @Value("${app.sms.gateway-enabled:${APP_SMS_GATEWAY_ENABLED:false}}")
    private boolean gatewayEnabled;

    /** Redis 模板（real profile 注入；为空时回退内存 Map） */
    private final StringRedisTemplate redisTemplate;

    /** 运行环境（判断 mock profile） */
    private final Environment environment;

    /** 内存回退存储（仅当 Redis 不可用时使用；key=手机号安全引用, value=code） */
    private final Map<String, String> memoryStore = new ConcurrentHashMap<>();

    /** 内存失败尝试计数（仅当 Redis 不可用时使用；key=手机号安全引用）。 */
    private final Map<String, FailureWindow> memoryFailures = new ConcurrentHashMap<>();

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
        // 仅打开开关不等于网关可用：本仓尚无真实短信 provider 接入。
        // 绝不能先生成/保存验证码再向客户端返回“已发送”——那会让用户收到成功提示却永远收不到短信。
        log.error("短信验证码发送被拒绝：gateway-enabled=true 但 provider 尚未接入, phone={}",
                maskPhone(phone));
        throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                "短信网关尚未接入，暂时无法发送验证码，请联系管理员");
    }

    /** 存储验证码：Redis 优先，异常回退内存 Map。key 段用手机号的安全引用，不含号码本体。 */
    private void store(String phone, String code) {
        String storeKey = keyRef(phone);
        // 新码 = 新的尝试预算：清掉上一个码遗留的失败计数（发码本身受每号 1 次/分钟 +
        // 每 IP 维度限流封顶，所以"靠重新发码刷新预算"不是免费的，见类注释算术）。
        clearFailedAttempts(storeKey);
        try {
            if (redisTemplate != null) {
                redisTemplate.opsForValue().set(REDIS_KEY_PREFIX + storeKey, code,
                        Duration.ofSeconds(expireSeconds));
            } else {
                memoryStore.put(storeKey, code);
            }
        } catch (RuntimeException e) {
            // Redis 异常时回退内存
            memoryStore.put(storeKey, code);
            log.warn("Redis 存储验证码失败，回退内存: {}", e.getMessage());
        }
    }

    /**
     * 校验验证码。
     *
     * <p><b>失败次数上限（2026-10-31 限流轨 P1，缺陷 4）</b>：本方法自带
     * 按手机号的失败尝试计数（Redis 优先、内存兜底），超过
     * {@code app.sms.max-failed-attempts}（默认 {@value #MAX_FAILED_ATTEMPTS_DEFAULT} 次）
     * 后立即<b>作废当前验证码</b>（删除已存码）并拒绝后续尝试——调用方必须重新
     * {@code send-code} 才能继续，从而把爆破尝试绑定到"每号 1 条短信"的昂贵成本上。</p>
     *
     * <p>为什么必须由本方法自己数，而不是靠调用端点的 {@code @RateLimit}：
     * 唯一的调用方是注册链路（{@code RealAuthService#registerUser} →
     * {@code POST /api/v1/auth/register}，桶容量 10、补充 0.1/s），
     * 那个桶限的是"注册请求条数"而不是"同一个码的错误尝试条数"；
     * 一旦 IP 维度因反代塌成全站单桶（缺陷 2），谁都刷不动——反过来攻击者
     * 只要把尝试分散到多个注册桶（多 IP/多号码）就没有任何地方在数"猜了几次"。
     * 现在两个维度都由本服务闭合。</p>
     *
     * <p>校验通过时同时删除失败计数，避免遗留状态影响下一次发码。</p>
     *
     * @param phone 手机号
     * @param code  用户输入的验证码
     * @return true 通过
     */
    public boolean verify(String phone, String code) {
        if (phone == null || code == null || code.isBlank()) {
            return false;
        }
        String storeKey = keyRef(phone);
        String redisKey = REDIS_KEY_PREFIX + storeKey;
        int maxFailedAttempts = resolveMaxFailedAttempts();

        // 缺陷 4：先查失败次数闸门，超限直接作废本码（不读出码本体比对）
        if (failedAttempts(storeKey) >= maxFailedAttempts) {
            log.error("短信验证码失败尝试次数超限，本码作废并要求重新发送："
                    + "phone={}, attempts={}, max={}", maskPhone(phone),
                    failedAttempts(storeKey), maxFailedAttempts);
            invalidateCode(storeKey, redisKey);
            return false;
        }

        String stored;
        try {
            if (redisTemplate != null) {
                stored = redisTemplate.opsForValue().get(redisKey);
            } else {
                stored = memoryStore.get(storeKey);
            }
        } catch (RuntimeException e) {
            stored = memoryStore.get(storeKey);
        }
        boolean ok = code.trim().equals(stored);
        if (ok) {
            if (redisTemplate != null) {
                // 一次性验证码：校验通过后删除，防重放
                try {
                    redisTemplate.delete(redisKey);
                } catch (RuntimeException e) {
                    log.warn("Redis 删除验证码失败（重放窗口由 TTL 兜底）: {}", e.getMessage());
                }
            }
            clearFailedAttempts(storeKey);
            memoryStore.remove(storeKey);
        } else {
            // 记一次失败尝试（含"根本没有码"的情况：枚举不存在/已过期号码同样计数）
            recordFailedAttempt(storeKey);
        }
        return ok;
    }

    /**
     * 记录一次失败尝试。
     *
     * <p>Redis 路径用 {@code INCR + EXPIRE}（原子递增，窗口 = 验证码 TTL，
     * 因为计数只在"当前这个码还活着"的时候有意义）；Redis 不可用或异常时
     * 落内存计数（每实例语义——真实 provider 上线后仍需 Redis 才能跨副本合并，
     * 这一条属于"需真实 Redis 验证"清单）。</p>
     */
    private void recordFailedAttempt(String storeKey) {
        long ttlSeconds = Math.max(60L, expireSeconds);
        try {
            if (redisTemplate != null) {
                Long count = redisTemplate.opsForValue().increment(FAILED_KEY_PREFIX + storeKey);
                if (count != null && count == 1L) {
                    redisTemplate.expire(FAILED_KEY_PREFIX + storeKey, Duration.ofSeconds(ttlSeconds));
                }
                return;
            }
        } catch (RuntimeException e) {
            log.warn("Redis 记录验证码失败次数异常，回退内存计数: {}", e.getMessage());
        }
        memoryFailures.compute(storeKey, (k, existing) -> {
            long now = System.currentTimeMillis();
            if (existing == null || now - existing.startedAtMillis > ttlSeconds * 1000L) {
                return new FailureWindow(1, now);
            }
            return new FailureWindow(existing.count + 1, existing.startedAtMillis);
        });
    }

    /** 读取当前失败次数（Redis 优先，异常/无 Redis 走内存）。 */
    private int failedAttempts(String storeKey) {
        try {
            if (redisTemplate != null) {
                String raw = redisTemplate.opsForValue().get(FAILED_KEY_PREFIX + storeKey);
                if (raw == null) {
                    return 0;
                }
                return Integer.parseInt(raw.trim());
            }
        } catch (RuntimeException e) {
            log.warn("Redis 读取验证码失败次数异常，回退内存计数: {}", e.getMessage());
        }
        FailureWindow window = memoryFailures.get(storeKey);
        if (window == null) {
            return 0;
        }
        if (System.currentTimeMillis() - window.startedAtMillis
                > Math.max(60L, expireSeconds) * 1000L) {
            memoryFailures.remove(storeKey);
            return 0;
        }
        return window.count;
    }

    /** 校验成功后清除失败计数（Redis + 内存）。 */
    private void clearFailedAttempts(String storeKey) {
        memoryFailures.remove(storeKey);
        try {
            if (redisTemplate != null) {
                redisTemplate.delete(FAILED_KEY_PREFIX + storeKey);
            }
        } catch (RuntimeException e) {
            log.debug("Redis 清除验证码失败次数失败: {}", e.getMessage());
        }
    }

    /** 作废验证码（超限或异常场景）：删除已存码，使后续任何输入都不可能被接受。 */
    private void invalidateCode(String storeKey, String redisKey) {
        memoryStore.remove(storeKey);
        try {
            if (redisTemplate != null) {
                redisTemplate.delete(redisKey);
            }
        } catch (RuntimeException e) {
            log.warn("Redis 作废验证码失败（将由 TTL 自然过期，最长 {} 秒）: {}",
                    expireSeconds, e.getMessage());
        }
    }

    /** 失败尝试上限（配置非法/非正时回退默认值）。 */
    private int resolveMaxFailedAttempts() {
        return maxFailedAttempts > 0 ? maxFailedAttempts : MAX_FAILED_ATTEMPTS_DEFAULT;
    }

    /** 内存失败计数窗口（Redis 不可用时的兜底，单实例语义）。 */
    private static final class FailureWindow {
        final int count;
        final long startedAtMillis;

        FailureWindow(int count, long startedAtMillis) {
            this.count = count;
            this.startedAtMillis = startedAtMillis;
        }
    }

    /** 手机号 → Redis/内存 key 段（HMAC-SHA256 定长引用，不可逆、不含号码数字）。 */
    private String keyRef(String phone) {
        return PiiKeyReference.of(piiKeySecret, KEYREF_PURPOSE, phone);
    }

    private static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
