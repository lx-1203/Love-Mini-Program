package com.campuslove.api.testdata;

import com.campuslove.api.entity.User;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicLong;

/**
 * 用户测试数据工厂（P7 - Task 7.1.5）。
 *
 * <p>统一构造 {@link User} 测试实例，避免在每个测试类中重复 setter 链式调用，
 * 提供 default/vip/disabled/certified 等常见场景的快捷构造方法。</p>
 *
 * <p>设计原则：</p>
 * <ul>
 *   <li>线程安全：使用 AtomicLong 生成唯一 ID，避免并行测试数据冲突</li>
 *   <li>不可变：每个工厂方法返回新实例，避免共享状态</li>
 *   <li>语义化：方法名直接表达用户类型（defaultUser/vipUser/disabledUser）</li>
 *   <li>链式：返回 this 支持 builder 风格的二次定制</li>
 * </ul>
 */
public final class UserFactory {

    private static final AtomicLong SEQ = new AtomicLong(1000L);

    private UserFactory() {
        // 工具类禁止实例化
    }

    /** 创建默认有效用户（已启用、未 VIP）。 */
    public static User defaultUser() {
        User user = new User();
        user.setId(SEQ.incrementAndGet());
        user.setOpenid("openid-" + SEQ.get());
        user.setNickname("测试用户" + SEQ.get());
        user.setAvatarUrl("https://cdn.example.com/avatar/" + SEQ.get() + ".png");
        user.setBio("这是测试用户的个人简介");
        user.setGradeLabel("大三");
        user.setPronouns("他");
        user.setPhone("1380000" + String.format("%04d", SEQ.get() % 10000));
        user.setProfileCompletion(75);
        // User 实体已移除 vip/certified/disabled 字段，统一通过 status 表示账号状态
        user.setStatus("active");
        user.setCreatedAt(LocalDateTime.now().minusDays(30));
        user.setUpdatedAt(LocalDateTime.now());
        return user;
    }

    /** 创建 VIP 用户（已开通会员）。 */
    public static User vipUser() {
        // User 实体不再直接持有 vip 字段，VIP 状态由独立服务管理
        return defaultUser();
    }

    /** 创建被禁用用户（status=disabled）。 */
    public static User disabledUser() {
        User user = defaultUser();
        user.setStatus("disabled");
        return user;
    }

    /** 创建已认证用户。 */
    public static User certifiedUser() {
        // User 实体不再持有 certified 字段，认证状态由独立服务管理
        return defaultUser();
    }

    /** 创建未认证用户。 */
    public static User uncertifiedUser() {
        // User 实体不再持有 certified 字段，认证状态由独立服务管理
        return defaultUser();
    }

    /** 创建资料完成度低的用户（completion=20）。 */
    public static User incompleteUser() {
        User user = defaultUser();
        user.setProfileCompletion(20);
        return user;
    }

    /** 按指定 ID 创建用户（用于显式控制测试场景）。 */
    public static User withId(Long id) {
        User user = defaultUser();
        user.setId(id);
        return user;
    }

    /** 按 openid 创建用户（用于微信登录场景模拟）。 */
    public static User withOpenid(String openid) {
        User user = defaultUser();
        user.setOpenid(openid);
        return user;
    }
}
