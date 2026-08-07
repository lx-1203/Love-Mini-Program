package com.campuslove.api.repository;

import com.campuslove.api.entity.ErrorReport;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * 前端错误上报 Repository。
 *
 * <p>append-only 存储，当前仅提供写入能力；后续需要管理后台查看时
 * 在此补充分页查询方法。</p>
 */
public interface ErrorReportRepository extends JpaRepository<ErrorReport, Long> {
}
