import type { components } from "../services/generated/api-types";

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

export function toSubmissionStatusLabel(status: Schemas["SubmissionRecord"]["status"]) {
  if (status === "submitted") {
    return "已提交";
  }
  if (status === "processing") {
    return "处理中";
  }
  if (status === "reviewed") {
    return "已查看";
  }
  if (status === "planned") {
    return "已排期";
  }
  return "已转活动";
}
