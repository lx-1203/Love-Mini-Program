package com.campuslove.api.feedback;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Service;

@Service
public class FeedbackService {

  private final AtomicLong ids = new AtomicLong(1000);
  private final List<SubmissionRecordView> seedRecords = new ArrayList<>();

  public FeedbackService() {
    seedRecords.add(new SubmissionRecordView(
        1L,
        FeedbackTicketType.FEEDBACK,
        "视频主视觉在媒体缺失时需要稳定切到动画兜底",
        SubmissionStatus.PROCESSING,
        "兜底行为已经纳入新的客户端壳层处理。",
        "2026-05-18 09:18",
        null
    ));
    seedRecords.add(new SubmissionRecordView(
        2L,
        FeedbackTicketType.SUGGESTION,
        "首页保留讨论入口",
        SubmissionStatus.REVIEWED,
        "已接受，纳入首页第一版信息架构调整。",
        "2026-05-17 18:42",
        null
    ));
    seedRecords.add(new SubmissionRecordView(
        3L,
        FeedbackTicketType.ACTIVITY_PROPOSAL,
        "图书馆南门咖啡散步",
        SubmissionStatus.PLANNED,
        "运营已接收这个想法，正在整理活动草案。",
        "2026-05-17 20:30",
        501L
    ));
  }

  public SubmissionRecordView submit(FeedbackTicketType type, FeedbackSubmissionRequest request) {
    SubmissionRecordView created = new SubmissionRecordView(
        ids.incrementAndGet(),
        type,
        request.title(),
        SubmissionStatus.SUBMITTED,
        "你的提交已进入待处理队列。",
        "刚刚",
        null
    );
    seedRecords.add(0, created);
    return created;
  }

  public List<SubmissionRecordView> listMine(FeedbackTicketType type) {
    if (type == null) {
      return List.copyOf(seedRecords);
    }

    return seedRecords.stream()
        .filter(record -> record.type() == type)
        .toList();
  }

  public List<SubmissionRecordView> listAdminFeedback() {
    return seedRecords.stream()
        .filter(record -> record.type() != FeedbackTicketType.ACTIVITY_PROPOSAL)
        .toList();
  }

  public SubmissionRecordView convertProposal(long proposalId) {
    return seedRecords.stream()
        .filter(record -> record.id() == proposalId && record.type() == FeedbackTicketType.ACTIVITY_PROPOSAL)
        .findFirst()
        .map(record -> new SubmissionRecordView(
            record.id(),
            record.type(),
            record.title(),
            SubmissionStatus.CONVERTED,
            "已转成活动草案，正在补充执行细节。",
            record.submittedAt(),
            9000L + proposalId
        ))
        .orElseThrow(() -> new IllegalArgumentException("proposal not found"));
  }
}
