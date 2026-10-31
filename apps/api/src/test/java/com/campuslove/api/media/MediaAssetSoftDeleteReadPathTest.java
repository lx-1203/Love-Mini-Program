package com.campuslove.api.media;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.campuslove.api.entity.MediaAsset;
import com.campuslove.api.entity.Post;
import com.campuslove.api.repository.MediaAssetRepository;
import com.campuslove.api.repository.PostRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.data.repository.query.parser.Part;
import org.springframework.data.repository.query.parser.PartTree;

/**
 * S3-D（2026-10-31）软删除读取口径的防回归测试。
 *
 * <p>分两层，两层都会「把过滤器删掉就变红」，但覆盖的失手方式不同：</p>
 * <ol>
 *   <li><b>调用层</b>（{@link CallSiteTests}）：用 Mockito strict stubs 断言服务
 *       走的是带 {@code AndDeletedAtIsNull} 的查询入口。有人把调用改回
 *       {@code findByUrlIn} 时，stub 不被命中（UnnecessaryStubbingException）
 *       且 verify/never 双失败。</li>
 *   <li><b>派生查询层</b>（{@link DerivedQueryTests}）：用 Spring Data 自己的
 *       {@link PartTree} 解析方法名，断言解析出的谓词里真的含
 *       {@code deletedAt IS NULL} / {@code status <> deleted}。
 *       有人把方法名里的 {@code AndDeletedAtIsNull} 去掉（＝悄悄不过滤）时，
 *       这一层失败。这一层不需要数据库，因此在任何环境都会执行。</li>
 * </ol>
 *
 * <p>【本测试没有覆盖的】：它证明的是「仓储会生成带软删除条件的查询」，
 * 不是「数据库里已删资产确实查不出来」。后者要在真库上跑
 * （本仓无 H2/@DataJpaTest 基建，DB 级测试由 CI 的 db-integration job 承担），
 * 已登记为未验证项。</p>
 */
class MediaAssetSoftDeleteReadPathTest {

    @Mock private MediaAssetRepository mediaAssetRepository;

    private MediaAssetService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new MediaAssetService(mediaAssetRepository);
    }

    private static MediaAsset asset(String url, LocalDateTime deletedAt) {
        MediaAsset a = new MediaAsset();
        a.setUrl(url);
        a.setDeletedAt(deletedAt);
        return a;
    }

    @Nested
    @DisplayName("调用层：面向用户展示的读路径必须走排除墓碑的查询入口")
    class CallSiteTests {

        @Test
        @DisplayName("findByUrls 只返回未软删除资产：墓碑即便被下游 mock 返回也不展示")
        void findByUrls_usesSoftDeleteAwareFinder() {
            String url = "/api/v1/media/1001/a.jpg";
            when(mediaAssetRepository.findByUrlInAndDeletedAtIsNull(List.of(url)))
                    .thenReturn(List.of(asset(url, null)));

            Map<String, MediaAsset> result = service.findByUrls(List.of(url));

            assertThat(result).containsKey(url);
            verify(mediaAssetRepository).findByUrlInAndDeletedAtIsNull(List.of(url));
            // 过滤器一旦被改回 findByUrlIn，下面这行立刻失败
            verify(mediaAssetRepository, never()).findByUrlIn(anyCollection());
        }

        @Test
        @DisplayName("findByUrls 排除墓碑的行即便混入结果集也不会被展示（服务侧二次防御）")
        void findByUrls_neverResolvesTombstonedAsset() {
            String live = "/api/v1/media/1001/live.jpg";
            String dead = "/api/v1/media/1001/dead.jpg";
            // 故意模拟仓储「漏过滤」的极端情况：返回了一条 deleted_at 非空的行。
            // 服务侧必须把它挡掉——否则 markTempDeleted 留下的墓碑仍然可解析。
            when(mediaAssetRepository.findByUrlInAndDeletedAtIsNull(List.of(live, dead)))
                    .thenReturn(List.of(asset(live, null), asset(dead, LocalDateTime.now())));

            Map<String, MediaAsset> result = service.findByUrls(List.of(live, dead));

            assertThat(result).containsKey(live);
            assertThat(result).doesNotContainKey(dead);
        }

        @Test
        @DisplayName("findByUrl（头像审核状态入口）走排除墓碑的查询入口")
        void findByUrl_usesSoftDeleteAwareFinder() {
            String url = "/api/v1/media/1001/avatar.jpg";
            when(mediaAssetRepository.findByUrlInAndDeletedAtIsNull(List.of(url)))
                    .thenReturn(List.of(asset(url, null)));

            Optional<MediaAsset> result = service.findByUrl(url);

            assertThat(result).isPresent();
            verify(mediaAssetRepository).findByUrlInAndDeletedAtIsNull(List.of(url));
            verify(mediaAssetRepository, never()).findByUrlIn(anyCollection());
        }

        @Test
        @DisplayName("deleteByUrl 反向约定：物理清理【必须】看得见墓碑，否则墓碑行永久残留")
        void deleteByUrl_mustStillReadTombstones() {
            String url = "/api/v1/media/1001/gone.jpg";
            List<MediaAsset> tombstones = List.of(asset(url, LocalDateTime.now()));
            when(mediaAssetRepository.findByUrlIn(List.of(url))).thenReturn(tombstones);

            service.deleteByUrl(url);

            verify(mediaAssetRepository).findByUrlIn(List.of(url));
            verify(mediaAssetRepository).delete(tombstones.get(0));
        }
    }

    @Nested
    @DisplayName("派生查询层：整张仓储的墓碑口径必须逐条登记，新增读方法默认挡住")
    class DerivedQueryTests {

        /**
         * 「故意可读墓碑」的白名单——每条都必须有具名理由，见注释。
         * 不在名单里的 MediaAsset 查询方法，一律必须过滤 deleted_at。
         */
        private static final Map<String, String> TOMBSTONE_VISIBLE_ALLOWED = Map.of(
                // 1) MediaAssetService.deleteByUrl 要清掉墓碑行本身；
                // 2) MediaAccessService.resolveAccessProfile 的分类是「只收紧不放松」，
                //    丢掉已登记行的分类会把 ID_CARD 放松到 IMAGE 档。
                "findByUrlIn", "物理清理 + 访问分级收紧-only，两处具名调用方见方法注释",
                // 后台审核/取证视角：AdminMediaAssetController 列表 + RealAdminStatsService 待审计数。
                "searchForAdmin", "管理后台审核队列需要看见被删资产");

        /** 找出方法名派生查询里针对某个属性的谓词。 */
        private Optional<Part> findPart(PartTree tree, String property) {
            for (Part part : tree.getParts()) {
                if (property.equals(part.getProperty().getSegment())) {
                    return Optional.of(part);
                }
            }
            return Optional.empty();
        }

        @Test
        @DisplayName("MediaAssetRepository 每个读方法：要么过滤 deletedAt，要么在白名单里写明理由")
        void everyReadMethodIsAccountedFor() {
            List<String> violations = new java.util.ArrayList<>();
            List<String> unaccounted = new java.util.ArrayList<>();
            for (java.lang.reflect.Method m : MediaAssetRepository.class.getDeclaredMethods()) {
                if (TOMBSTONE_VISIBLE_ALLOWED.containsKey(m.getName())) {
                    unaccounted.add(m.getName());   // 白名单里的条目也必须仍然存在于代码中
                    continue;
                }
                PartTree tree = new PartTree(m.getName(), MediaAsset.class);
                Optional<Part> deletedAt = findPart(tree, "deletedAt");
                if (deletedAt.isEmpty() || deletedAt.get().getType() != Part.Type.IS_NULL) {
                    violations.add(m.getName());
                }
            }
            assertThat(violations)
                    .as("这些 MediaAsset 查询会把 markTempDeleted 留下的墓碑当活资产返回；"
                            + "若确属有意可读，请把它加进 TOMBSTONE_VISIBLE_ALLOWED 并写出具名调用方")
                    .isEmpty();
            // 反向防漂移：白名单里不允许留着已经不存在的方法名
            TOMBSTONE_VISIBLE_ALLOWED.keySet().forEach(n ->
                    assertThat(unaccounted).as("白名单条目 %s 在仓储上已不存在，应删除该例外", n).contains(n));
        }

        @Test
        @DisplayName("三个展示读入口的谓词确实是 deletedAt IS NULL（不只是名字里有）")
        void mediaAssetReadFinders_filterDeletedAt() {
            for (String name : List.of(
                    "findByUserIdAndTypeAndDeletedAtIsNull",
                    "findByUserIdAndDeletedAtIsNullOrderByCreatedAtDesc",
                    "findByUrlInAndDeletedAtIsNull",
                    "findByUrlAndTypeAndDeletedAtIsNull")) {
                PartTree tree = new PartTree(name, MediaAsset.class);
                Optional<Part> deletedAt = findPart(tree, "deletedAt");
                assertThat(deletedAt)
                        .as("%s 必须保留 deletedAt 谓词，否则会把墓碑当活资产", name)
                        .isPresent();
                assertThat(deletedAt.get().getType())
                        .as("%s 的 deletedAt 谓词必须是 IS_NULL", name)
                        .isEqualTo(Part.Type.IS_NULL);
            }
        }

        @Test
        @DisplayName("Post 聚合口径：findByAuthorIdAndStatusNot 带 status Not 谓词")
        void postAggregateFinder_excludesOneStatus() {
            PartTree tree = new PartTree("findByAuthorIdAndStatusNot", Post.class);
            Optional<Part> status = findPart(tree, "status");
            assertThat(status).as("公开主页总获赞数必须按 status 过滤").isPresent();
            assertThat(status.get().getType())
                    .as("必须用 Not（排除 deleted 墓碑），而不是把它当普通等值条件")
                    .isEqualTo(Part.Type.NEGATING_SIMPLE_PROPERTY);
        }

        @Test
        @DisplayName("Post 的本人查阅入口保持含墓碑（PIPL 数据主体访问权）")
        void personalDataFinder_keepsTombstones() {
            PartTree tree = new PartTree("findByAuthorId", Post.class);
            assertThat(findPart(tree, "status"))
                    .as("findByAuthorId 必须【不过滤】status：它是本人查阅/导出专用（PersonalDataService）")
                    .isEmpty();
        }

        @Test
        @DisplayName("留存清理只认 created_at 一个时间轴（防止误加条件少删/多删）")
        void retentionDelete_usesCreatedAtAxisOnly() {
            PartTree tree = new PartTree("deleteByCreatedAtBefore",
                    com.campuslove.api.entity.ErrorReport.class);
            Optional<Part> createdAt = findPart(tree, "createdAt");
            assertThat(createdAt).isPresent();
            assertThat(createdAt.get().getType()).isEqualTo(Part.Type.BEFORE);
            assertThat(tree.getParts()).hasSize(1);
        }
    }
}
