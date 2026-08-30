package com.campuslove.api.admin.circle;

import com.campuslove.api.common.ApiResponse;
import com.campuslove.api.entity.circle.AdminLayer;
import com.campuslove.api.repository.circle.AdminLayerRepository;
import com.campuslove.api.repository.circle.CircleLayerRepository;
import com.campuslove.api.config.SecurityUtils;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * 举报调阅取证 Controller（Frame 04/05/09 调阅证据 chip）。
 * 按 viewer 圈层 scope 过滤可见性（viewerPath LIKE ownerPath%）。
 */
@Profile("real")
@RestController
@RequestMapping("/api/v1/admin/evidence")
@PreAuthorize("hasRole('SUPER_ADMIN') or hasRole('ADMIN')")
public class EvidenceController {

    private final AdminLayerRepository adminLayerRepository;
    private final CircleLayerRepository circleLayerRepository;
    private final JdbcTemplate jdbcTemplate;

    public EvidenceController(
        AdminLayerRepository adminLayerRepository,
        CircleLayerRepository circleLayerRepository,
        JdbcTemplate jdbcTemplate
    ) {
        this.adminLayerRepository = adminLayerRepository;
        this.circleLayerRepository = circleLayerRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    /** 调阅管辖内容（按类型：chat/image/post/tempChat） */
    @GetMapping
    public ApiResponse<Map<String, Object>> getEvidence(
        @RequestParam(name = "userId", required = false) Long userId,
        @RequestParam(name = "type", defaultValue = "post") String type,
        @RequestParam(name = "page", defaultValue = "1") int page,
        @RequestParam(name = "size", defaultValue = "20") int size
    ) {
        Long viewerId = SecurityUtils.getCurrentUserId();
        List<String> viewerPaths = adminLayerRepository.findByAdminId(viewerId).stream()
            .map(AdminLayer::getCircleLayerId)
            .map(circleLayerRepository::findById)
            .filter(Optional::isPresent)
            .map(Optional::get)
            .map(c -> c.getCirclePath())
            .collect(Collectors.toList());

        if (viewerPaths.isEmpty()) {
            return ApiResponse.ok(Map.of("items", List.of(), "total", 0));
        }

        // 构造前缀匹配 WHERE：owner_circle_path LIKE 'C1%' OR ...
        StringBuilder whereClause = new StringBuilder();
        List<Object> params = new ArrayList<>();
        if (userId != null) {
            whereClause.append("author_id = ?");
            params.add(userId);
        } else {
            whereClause.append("1=1");
        }
        whereClause.append(" AND (");
        for (int i = 0; i < viewerPaths.size(); i++) {
            if (i > 0) whereClause.append(" OR ");
            whereClause.append("owner_circle_path LIKE ?");
            params.add(viewerPaths.get(i) + "%");
        }
        whereClause.append(")");

        String table = switch (type) {
            case "chat" -> "private_messages";
            case "image" -> "user_images";
            case "post" -> "posts";
            case "tempChat" -> "temp_chat_message";
            default -> "posts";
        };

        String sql = "SELECT id, content, owner_circle_path FROM " + table
            + " WHERE " + whereClause
            + " ORDER BY id DESC LIMIT ? OFFSET ?";
        params.add(size);
        params.add((page - 1) * size);

        List<Map<String, Object>> items = jdbcTemplate.query(sql, (rs, i) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("id", rs.getLong("id"));
            try { row.put("content", rs.getString("content")); } catch (Exception e) { /* ignore */ }
            row.put("ownerCirclePath", rs.getString("owner_circle_path"));
            return row;
        }, params.toArray());

        return ApiResponse.ok(Map.of("items", items, "total", items.size(), "page", page));
    }

    /** 获取某圈层下的用户列表（圈层下钻） */
    @GetMapping("/circle/{layerId}/users")
    public ApiResponse<List<Map<String, Object>>> getUsersInCircle(@PathVariable Long layerId) {
        var layer = circleLayerRepository.findById(layerId).orElseThrow();
        String path = layer.getCirclePath();
        String sql = "SELECT id, openid, nickname, role, campus_name, circle_path FROM users WHERE circle_path LIKE ? LIMIT 100";
        List<Map<String, Object>> users = jdbcTemplate.query(sql, (rs, i) -> {
            Map<String, Object> row = new HashMap<>();
            row.put("id", rs.getLong("id"));
            row.put("openid", rs.getString("openid"));
            try { row.put("nickname", rs.getString("nickname")); } catch (Exception e) { /* ignore */ }
            try { row.put("role", rs.getString("role")); } catch (Exception e) { /* ignore */ }
            try { row.put("campusName", rs.getString("campus_name")); } catch (Exception e) { /* ignore */ }
            try { row.put("circlePath", rs.getString("circle_path")); } catch (Exception e) { /* ignore */ }
            return row;
        }, path + "%");
        return ApiResponse.ok(users);
    }
}
