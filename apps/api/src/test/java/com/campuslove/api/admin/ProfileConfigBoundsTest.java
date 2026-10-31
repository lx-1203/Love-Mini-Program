package com.campuslove.api.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.campuslove.api.profile.ProfileConfigView;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Valid;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import java.lang.annotation.Annotation;
import java.util.Set;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/**
 * 主页运营配置的数值边界（第三轮遗留项 {@code @RequestBody} 缺 {@code @Valid} 的收口）。
 *
 * <p>这个 PUT 把值原样序列化进 {@code app_config} 再下发给客户端解释——本仓 Java 侧
 * 没有任何消费方，所以越界的值不会在服务端留下任何症状，只会在客户端表现为
 * 「主页一条故事都不出」或「高质量阈值形同虚设」。校验必须守在写入边界。</p>
 *
 * <p>两半都必须能红，缺一半这份证明就作废：
 * <ul>
 *   <li><b>约束本体</b>：越界必须产生违例、界内必须不产生（正控）；</li>
 *   <li><b>约束的接线</b>：{@code save} 的参数上必须真的挂着 {@code @Valid}——
 *       没有它，record 里写多少 {@code @Min/@Max} 都不会被 MVC 执行，
 *       而这正是本项在第三轮被判「未修」的原状。</li>
 * </ul></p>
 */
class ProfileConfigBoundsTest {

    private static ValidatorFactory factory;
    private static Validator validator;

    @BeforeAll
    static void openValidator() {
        factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        if (factory != null) {
            factory.close();
        }
    }

    private static ProfileConfigView view(int maxStories, int minHighQualityScore) {
        return new ProfileConfigView(true, true, true, maxStories, minHighQualityScore);
    }

    @Test
    @DisplayName("越界的两个数值字段必须各自产生违例，界内不得产生")
    void outOfRangeValuesAreRejected() {
        Set<ConstraintViolation<ProfileConfigView>> zeroStories = validator.validate(view(0, 90));
        assertEquals(1, zeroStories.size(), "maxStories=0 应恰有一条违例：" + describe(zeroStories));
        assertTrue(zeroStories.stream().anyMatch(v -> v.getPropertyPath().toString().equals("maxStories")));

        Set<ConstraintViolation<ProfileConfigView>> hugeStories = validator.validate(view(51, 90));
        assertEquals(1, hugeStories.size(), "maxStories=51 应恰有一条违例：" + describe(hugeStories));

        Set<ConstraintViolation<ProfileConfigView>> negativeScore = validator.validate(view(6, -5));
        assertEquals(1, negativeScore.size(), "minHighQualityScore=-5 应恰有一条违例：" + describe(negativeScore));
        assertTrue(negativeScore.stream()
                .anyMatch(v -> v.getPropertyPath().toString().equals("minHighQualityScore")));

        Set<ConstraintViolation<ProfileConfigView>> overHundred = validator.validate(view(6, 101));
        assertEquals(1, overHundred.size(), "minHighQualityScore=101 应恰有一条违例：" + describe(overHundred));

        // 正控：默认值必须干净，否则上面四条「有违例」说明不了是越界造成的
        assertTrue(validator.validate(view(6, 90)).isEmpty(),
                "默认值 (6, 90) 被判违例 ⇒ 约束写错了：" + describe(validator.validate(view(6, 90))));
        // 边界本身也算界内
        assertTrue(validator.validate(view(1, 0)).isEmpty(), "下边界 (1, 0) 应合法");
        assertTrue(validator.validate(view(50, 100)).isEmpty(), "上边界 (50, 100) 应合法");
    }

    @Test
    @DisplayName("约束的接线：save 的请求体参数必须带 @Valid，否则 record 里的边界永不生效")
    void saveParameterCarriesValid() {
        Annotation[][] annotations = null;
        try {
            annotations = AdminProfileConfigController.class
                    .getMethod("save", ProfileConfigView.class)
                    .getParameterAnnotations();
        } catch (NoSuchMethodException ex) {
            throw new AssertionError("AdminProfileConfigController#save(ProfileConfigView) 签名变了，"
                    + "本判点无法再证明校验被接线", ex);
        }
        assertEquals(1, annotations.length, "save 的参数个数变了，判点需人工重定");
        assertTrue(java.util.Arrays.stream(annotations[0]).anyMatch(a -> a instanceof Valid),
                "save 的请求体参数上没有 @Valid：@Min/@Max 只是写在 record 里的装饰，"
                        + "越界值会照原样落进 app_config 并下发给客户端");
    }

    private static String describe(Set<ConstraintViolation<ProfileConfigView>> violations) {
        return violations.stream()
                .map(v -> v.getPropertyPath() + "=" + v.getInvalidValue() + " " + v.getMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("(无)");
    }
}
