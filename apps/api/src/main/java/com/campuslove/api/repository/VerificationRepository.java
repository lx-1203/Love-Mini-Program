package com.campuslove.api.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;
import javax.sql.DataSource;
import java.sql.PreparedStatement;

/**
 * 学生身份验证数据访问层。
 * 仅在 DataSource 可用时创建（db profile）。
 */
@Repository
@ConditionalOnBean(DataSource.class)
public class VerificationRepository {

    private final JdbcTemplate jdbcTemplate;

    private static final VerificationRowMapper ROW_MAPPER = new VerificationRowMapper();

    public VerificationRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * 插入一条认证申请。
     */
    public VerificationRecord insert(Long userId, String studentId, String imagePath) {
        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO verification_request (user_id, student_id, image_path, status) VALUES (?, ?, ?, 'pending')",
                    new String[]{"id"});
            ps.setLong(1, userId);
            ps.setString(2, studentId);
            ps.setString(3, imagePath);
            return ps;
        }, keyHolder);

        long id = keyHolder.getKey().longValue();
        return findById(id).orElseThrow(() ->
                new IllegalStateException("Failed to create verification_request"));
    }

    /**
     * 根据 ID 查找。
     */
    public Optional<VerificationRecord> findById(Long id) {
        List<VerificationRecord> results = jdbcTemplate.query(
                "SELECT id, user_id, student_id, image_path, status, review_notes, reviewed_by, reviewed_at, created_at, updated_at FROM verification_request WHERE id = ?",
                ROW_MAPPER, id);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    /**
     * 查找某用户的最新认证申请。
     */
    public Optional<VerificationRecord> findLatestByUserId(Long userId) {
        List<VerificationRecord> results = jdbcTemplate.query(
                "SELECT id, user_id, student_id, image_path, status, review_notes, reviewed_by, reviewed_at, created_at, updated_at FROM verification_request WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
                ROW_MAPPER, userId);
        return results.isEmpty() ? Optional.empty() : Optional.of(results.get(0));
    }

    /**
     * 按状态分页查询认证申请列表。
     */
    public List<VerificationRecord> findByStatus(String status, int limit, int offset) {
        return jdbcTemplate.query(
                "SELECT id, user_id, student_id, image_path, status, review_notes, reviewed_by, reviewed_at, created_at, updated_at FROM verification_request WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?",
                ROW_MAPPER, status, limit, offset);
    }

    /**
     * 审核认证申请（通过或拒绝）。
     */
    public void review(Long id, String status, String reviewNotes, Long reviewedBy) {
        jdbcTemplate.update(
                "UPDATE verification_request SET status = ?, review_notes = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?",
                status, reviewNotes, reviewedBy, LocalDateTime.now(), id);
    }

    /**
     * 认证申请记录。
     */
    public record VerificationRecord(
            Long id,
            Long userId,
            String studentId,
            String imagePath,
            String status,
            String reviewNotes,
            Long reviewedBy,
            LocalDateTime reviewedAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }

    private static class VerificationRowMapper implements RowMapper<VerificationRecord> {
        @Override
        public VerificationRecord mapRow(ResultSet rs, int rowNum) throws SQLException {
            Timestamp reviewedAt = rs.getTimestamp("reviewed_at");
            return new VerificationRecord(
                    rs.getLong("id"),
                    rs.getLong("user_id"),
                    rs.getString("student_id"),
                    rs.getString("image_path"),
                    rs.getString("status"),
                    rs.getString("review_notes"),
                    rs.getObject("reviewed_by", Long.class),
                    reviewedAt != null ? reviewedAt.toLocalDateTime() : null,
                    rs.getTimestamp("created_at").toLocalDateTime(),
                    rs.getTimestamp("updated_at").toLocalDateTime()
            );
        }
    }
}