import type { components } from "../services/generated/api-types";

type Schemas = components["schemas"];

export function toProfileCompletion(session: Schemas["UserSession"]) {
  return [
    {
      id: "profile",
      title: "基础资料",
      done: session.profileCompleted,
    },
    {
      id: "campus",
      title: "学校信息",
      done: session.campusVerified,
    },
    {
      id: "schedule",
      title: "时间安排",
      done: session.scheduleCompleted,
    },
  ];
}
