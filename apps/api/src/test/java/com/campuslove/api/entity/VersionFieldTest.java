package com.campuslove.api.entity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.persistence.Version;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * Task 2.1.1 数据一致性基础设施 - @Version 字段存在性测试。
 *
 * <p>验证至少 5 个核心 Entity 已正确添加 {@code @Version private Long version} 字段，
 * 对应数据库列 {@code version BIGINT DEFAULT 0}（Flyway V2026.07.26.0003）。</p>
 *
 * <p>验证策略：</p>
 * <ol>
 *   <li>反射获取声明的 {@code version} 字段，断言存在</li>
 *   <li>断言字段类型为 {@code Long}</li>
 *   <li>断言字段标注 {@link Version} 注解</li>
 *   <li>反射调用 {@code getVersion()} 断言初始值为 {@code 0L}</li>
 *   <li>反射调用 {@code setVersion(Long)} 后再 {@code getVersion()} 断言值一致</li>
 * </ol>
 *
 * <p>覆盖实体（共 7 个，超出最低要求 5 个）：</p>
 * <ul>
 *   <li>{@link User} - 用户主表</li>
 *   <li>{@link UserBasicProfile} - 用户基础资料</li>
 *   <li>{@link Like} - 喜欢记录</li>
 *   <li>{@link Notification} - 通知</li>
 *   <li>{@link Report} - 举报</li>
 *   <li>{@link PrivateMessage} - 私信消息</li>
 *   <li>{@link AuditLog} - 审计日志</li>
 * </ul>
 */
class VersionFieldTest {

    /**
     * 校验单个实体类的 @Version 字段定义、初始值与 getter/setter。
     *
     * @param entityClass 实体类
     * @param <T>         实体类型
     */
    private <T> void assertVersionFieldValid(Class<T> entityClass) throws Exception {
        // 1. 反射获取 version 字段
        Field versionField = entityClass.getDeclaredField("version");
        assertNotNull(versionField, entityClass.getSimpleName() + " 必须声明 version 字段");

        // 2. 字段类型必须为 Long
        assertEquals(Long.class, versionField.getType(),
                entityClass.getSimpleName() + ".version 类型必须为 Long");

        // 3. 字段必须标注 @Version 注解
        Version versionAnnotation = versionField.getAnnotation(Version.class);
        assertNotNull(versionAnnotation,
                entityClass.getSimpleName() + ".version 必须标注 @jakarta.persistence.Version 注解");

        // 4. 反射调用无参构造创建实例
        T entity = entityClass.getDeclaredConstructor().newInstance();

        // 5. 反射调用 getVersion() 断言初始值为 0L
        Method getVersion = entityClass.getMethod("getVersion");
        Object initialValue = getVersion.invoke(entity);
        assertNotNull(initialValue,
                entityClass.getSimpleName() + ".getVersion() 初始值不应为 null");
        assertEquals(0L, initialValue,
                entityClass.getSimpleName() + ".getVersion() 初始值必须为 0L");

        // 6. 反射调用 setVersion(Long) 后再 getVersion() 断言值一致
        Method setVersion = entityClass.getMethod("setVersion", Long.class);
        setVersion.invoke(entity, 42L);
        assertEquals(42L, getVersion.invoke(entity),
                entityClass.getSimpleName() + ".setVersion(42L) 后 getVersion() 必须返回 42L");

        // 7. 允许设置回 0L
        setVersion.invoke(entity, 0L);
        assertEquals(0L, getVersion.invoke(entity),
                entityClass.getSimpleName() + ".setVersion(0L) 后 getVersion() 必须返回 0L");
    }

    @Test
    @DisplayName("User 实体的 @Version 字段定义正确")
    void user_versionField_shouldBeValid() throws Exception {
        assertVersionFieldValid(User.class);
    }

    @Test
    @DisplayName("UserBasicProfile 实体的 @Version 字段定义正确")
    void userBasicProfile_versionField_shouldBeValid() throws Exception {
        assertVersionFieldValid(UserBasicProfile.class);
    }

    @Test
    @DisplayName("Like 实体的 @Version 字段定义正确")
    void like_versionField_shouldBeValid() throws Exception {
        assertVersionFieldValid(Like.class);
    }

    @Test
    @DisplayName("Notification 实体的 @Version 字段定义正确")
    void notification_versionField_shouldBeValid() throws Exception {
        assertVersionFieldValid(Notification.class);
    }

    @Test
    @DisplayName("Report 实体的 @Version 字段定义正确")
    void report_versionField_shouldBeValid() throws Exception {
        assertVersionFieldValid(Report.class);
    }

    @Test
    @DisplayName("PrivateMessage 实体的 @Version 字段定义正确")
    void privateMessage_versionField_shouldBeValid() throws Exception {
        assertVersionFieldValid(PrivateMessage.class);
    }

    @Test
    @DisplayName("AuditLog 实体的 @Version 字段定义正确")
    void auditLog_versionField_shouldBeValid() throws Exception {
        assertVersionFieldValid(AuditLog.class);
    }

    @Test
    @DisplayName("PassRecord 实体的 @Version 字段定义正确（discover_swipes 对应表）")
    void passRecord_versionField_shouldBeValid() throws Exception {
        assertVersionFieldValid(PassRecord.class);
    }

    @Test
    @DisplayName("所有核心实体的 @Version 字段批量校验（≥5 个核心 Entity）")
    void allCoreEntities_versionField_shouldBeValid() throws Exception {
        // 任务规格要求至少 5 个核心 Entity，本测试覆盖 8 个核心 Entity
        Class<?>[] coreEntities = {
                User.class,
                UserBasicProfile.class,
                Like.class,
                Notification.class,
                Report.class,
                PrivateMessage.class,
                AuditLog.class,
                PassRecord.class
        };

        for (Class<?> entityClass : coreEntities) {
            assertVersionFieldValid(entityClass);
        }

        assertTrue(coreEntities.length >= 5,
                "核心实体数量必须 ≥ 5，当前：" + coreEntities.length);
    }
}
