import type { components } from "../services/generated/api-types";
// 修复（R4-00218）：反馈状态文案 i18n 化
import { t } from "@/i18n";

type Schemas = components["schemas"];

export function toSubmissionStatusTone(status: Schemas["SubmissionRecord"]["status"]) {
  if (status === "processing" || status === "planned") {
    return "warning";
  }
  if (status === "reviewed" || status === "converted") {
    return "success";
  }
  return "brand";
}

/** 反馈状态 → i18n key（修复 R4-00218：文案收敛到 locales/feedbackStatus.*） */
const SUBMISSION_STATUS_KEYS: Record<Schemas["SubmissionRecord"]["status"], string> = {
  submitted: "feedbackStatus.submitted",
  processing: "feedbackStatus.processing",
  reviewed: "feedbackStatus.reviewed",
  planned: "feedbackStatus.planned",
  converted: "feedbackStatus.converted",
};

export function toSubmissionStatusLabel(status: Schemas["SubmissionRecord"]["status"]) {
  return t(SUBMISSION_STATUS_KEYS[status] ?? "feedbackStatus.submitted");
}
