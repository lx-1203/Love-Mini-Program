package com.campuslove.api.growth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.SocialProgress;
import com.campuslove.api.repository.SocialProgressRepository;
import java.io.IOException;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

/**
 * C2（2026-11 第六轮修复波 W1）：社交升温漏斗计数器的原子化与空 catch 消灭。
 *
 * <p><b>缺陷</b>：{@link RealSocialProgressService} 的六层漏斗计数
 * （exposure / like / match / chat / circle / activity）全是「读实体字段 + 加 + 写回 + save」，
 * 并发下互相覆盖丢增量；实体带 {@code @Version}，冲突时抛
 * {@link org.springframework.orm.ObjectOptimisticLockingFailureException}，
 * 却在唯一调用方 {@code RecommendationCacheManager}（曝光埋点）被两处
 * 「注释写仅记录日志、实为空体」的 {@code catch (RuntimeException e)} 静默吞掉。
 * 本仓其余域（{@code CircleTopicRepository.incrementLikeCount} 等）早已用
 * {@code UPDATE ... SET x = x + 1} 原子化——本类补齐同一口径。</p>
 *
 * <p><b>判点（无真库 ⇒ 证到 SQL 形态 + 委托形态，而非真并发）</b>：</p>
 * <ol>
 *   <li>结构命题：service 源码不得再出现「读实体字段 + 加 + 写回」的六种形态；
 *       且必须委托到六个原子方法。</li>
 *   <li>SQL 形态：{@link SocialProgressRepository} 六个 increment 方法必须带
 *       {@code @Modifying} 且 JPQL 形如 {@code field = field + 1}（数据库侧原子自增）。</li>
 *   <li>委托行为：以 mock 仓库驱动 {@code recordLike}，断言走 {@code incrementLikeCount}、
 *       不再 {@code save} 递增后的实体。</li>
 *   <li>空 catch 消灭：{@code RecommendationCacheManager} 中 {@code catch (RuntimeException e)}
 *       （曝光埋点那两处）不得是「只剩注释」的空体。</li>
 * </ol>
 *
 * <p>可证伪性：把任一 increment 方法改回 {@code save} 读改写、或删掉 {@code @Modifying}、
 * 或把埋点 catch 清空 ⇒ 对应判点变红。</p>
 */
@DisplayName("C2 社交升温计数器原子化 + 埋点空 catch 消灭")
class SocialProgressCounterAtomicityTest {

    private static final Path SERVICE_SRC =
            Path.of("src", "main", "java", "com", "campuslove", "api", "growth", "RealSocialProgressService.java");
    private static final Path CACHE_SRC = Path.of("src", "main", "java", "com", "campuslove", "api", "discover",
            "RecommendationCacheManager.java");

    private static String read(Path p) throws IOException {
        assertTrue(Files.isRegularFile(p), "找不到被测源码（扫描面为空，不能当成通过）: " + p.toAbsolutePath());
        return Files.readString(p, StandardCharsets.UTF_8);
    }

    /** 六种「读实体字段 + 加 + 写回」形态，一条都不许再出现。 */
    @Test
    @DisplayName("结构命题：service 源码不再出现 getXxxCount() + 1 读改写")
    void serviceHasNoReadModifyWriteCounterPattern() throws IOException {
        String src = read(SERVICE_SRC);
        for (String field : new String[] {"Exposure", "Like", "Match", "Chat", "Circle", "Activity"}) {
            String rmw = "get" + field + "Count() + 1";
            assertFalse(src.contains(rmw), "service 仍保留读改写计数: " + rmw);
            assertFalse(src.contains("get" + field + "Count()+1"), "service 仍保留读改写计数(无空格): " + rmw);
        }
        // 必须委托到六个原子方法
        for (String m : new String[] {"incrementExposureCount", "incrementLikeCount", "incrementMatchCount",
                "incrementChatCount", "incrementCircleCount", "incrementActivityCount"}) {
            assertTrue(src.contains("socialProgressRepository." + m),
                    "service 未调用原子方法 " + m + "（计数没走原子口径）");
        }
    }

    /** SQL 形态：六个 increment 方法必须是 @Modifying 的原子自增 UPDATE。 */
    @Test
    @DisplayName("SQL 形态：六个 increment 方法是 @Modifying 且 field = field + 1")
    void repositoryIncrementsAreAtomicModifying() throws NoSuchMethodException {
        for (String field : new String[] {"exposureCount", "likeCount", "matchCount",
                "chatCount", "circleCount", "activityCount"}) {
            String methodName = "increment" + Character.toUpperCase(field.charAt(0))
                    + field.substring(1, field.length() - "Count".length()) + "Count";
            Method method = null;
            for (Method candidate : SocialProgressRepository.class.getDeclaredMethods()) {
                if (candidate.getName().equals(methodName)) {
                    method = candidate;
                    break;
                }
            }
            assertTrue(method != null, "缺少原子方法 " + methodName + "（读改写没被替换掉）");
            assertTrue(method.isAnnotationPresent(Modifying.class),
                    methodName + " 不是 @Modifying，无法做数据库侧原子自增");
            Query query = method.getAnnotation(Query.class);
            assertTrue(query != null, methodName + " 缺少 @Query（bulk JPQL 自增语句）");
            String jpql = query.value();
            // 期望形如 "s.likeCount = s.likeCount + 1"（别名前缀允许）
            assertTrue(jpql.matches("(?s).*\\b\\w+\\." + field + "\\s*=\\s*\\w+\\." + field + "\\s*\\+\\s*1.*"),
                    methodName + " 的 JPQL 不是原子自增形态 (x = x + 1): " + jpql);
            assertTrue(jpql.contains("UPDATE SocialProgress"), methodName + " 不是对 SocialProgress 的 UPDATE: " + jpql);
        }
    }

    /** 委托行为：recordLike 走原子方法、不再 save 递增后的实体。 */
    @Test
    @DisplayName("委托行为：recordLike 调 incrementLikeCount 且不 save")
    void recordLikeDelegatesToAtomicIncrementNotSave() {
        SocialProgressRepository repo = mock(SocialProgressRepository.class);
        SocialProgress existing = new SocialProgress();
        existing.setUserId(42L);
        existing.setLikeCount(3);
        when(repo.findByUserId(42L)).thenReturn(Optional.of(existing));

        RealSocialProgressService service = new RealSocialProgressService(repo);
        service.recordLike(42L);

        verify(repo).incrementLikeCount(eq(42L), any());
        verify(repo, never()).save(any(SocialProgress.class));
    }

    /** 空 catch 消灭：曝光埋点的 catch (RuntimeException e) 不得只剩注释。 */
    @Test
    @DisplayName("空 catch 消灭：RecommendationCacheManager 埋点 catch 真写日志")
    void exposureCatchIsNotSilentlyEmpty() throws IOException {
        String stripped = stripCommentsAndLiterals(read(CACHE_SRC));
        // 每个 "catch (RuntimeException e)" 的块体（到第一个 '}'）都必须非空白。
        // 注意：metrics 用的是 "catch (RuntimeException ignore)"，本判点只针对埋点的 'e' 变量。
        int idx = 0;
        int checked = 0;
        while (true) {
            int at = stripped.indexOf("catch (RuntimeException e)", idx);
            if (at < 0) {
                break;
            }
            int open = stripped.indexOf('{', at);
            int close = stripped.indexOf('}', open);
            assertTrue(open >= 0 && close > open, "catch 块结构异常，无法判定是否为空");
            String body = stripped.substring(open + 1, close).trim();
            assertFalse(body.isEmpty(),
                    "曝光埋点 catch (RuntimeException e) 仍是空体（静默吞 @Version 冲突/DB 异常）");
            checked++;
            idx = close;
        }
        assertEquals(2, checked, "本判点应覆盖到两处曝光埋点 catch（recommendation + guest 两条链路）");
    }

    /** 逐字符把块/行注释与字符串/字符字面量替换为空格（保留换行）。 */
    private static String stripCommentsAndLiterals(String src) {
        char[] a = src.toCharArray();
        int n = a.length;
        char[] out = a.clone();
        int i = 0;
        while (i < n) {
            char c = a[i];
            if (c == '/' && i + 1 < n && a[i + 1] == '/') {
                int j = i + 2;
                while (j < n && a[j] != '\n') {
                    out[j] = ' ';
                    j++;
                }
                i = j;
            } else if (c == '/' && i + 1 < n && a[i + 1] == '*') {
                int j = i;
                while (j < n && !(a[j] == '*' && j + 1 < n && a[j + 1] == '/')) {
                    if (a[j] != '\n') {
                        out[j] = ' ';
                    }
                    j++;
                }
                if (j < n) {
                    out[j] = ' ';
                    if (j + 1 < n) {
                        out[j + 1] = ' ';
                    }
                    i = j + 2;
                } else {
                    i = j;
                }
            } else if (c == '"' || c == '\'') {
                char q = c;
                out[i] = ' ';
                int j = i + 1;
                while (j < n) {
                    if (a[j] == '\\') {
                        out[j] = ' ';
                        if (j + 1 < n && a[j + 1] != '\n') {
                            out[j + 1] = ' ';
                        }
                        j += 2;
                        continue;
                    }
                    if (a[j] == q) {
                        out[j] = ' ';
                        j++;
                        break;
                    }
                    if (a[j] == '\n') {
                        break;
                    }
                    out[j] = ' ';
                    j++;
                }
                i = j;
            } else {
                i++;
            }
        }
        return new String(out);
    }
}
