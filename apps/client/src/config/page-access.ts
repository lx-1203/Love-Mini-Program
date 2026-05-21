import type { PageRequirements } from "../guards/session-guard";

export const homePageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: true,
  requiresCampus: false,
  requiresSchedule: false,
};

export const discussionsPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: true,
  requiresCampus: false,
  requiresSchedule: false,
};

export const matchPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: true,
  requiresCampus: true,
  requiresSchedule: false,
};

export const activitiesPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: true,
  requiresCampus: false,
  requiresSchedule: false,
};

export const chatPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: true,
  requiresCampus: true,
  requiresSchedule: false,
};

export const chatSessionPageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: true,
  requiresCampus: true,
  requiresSchedule: false,
};

export const profilePageRequirements: PageRequirements = {
  requiresAuth: true,
  requiresProfile: false,
  requiresCampus: false,
  requiresSchedule: false,
};
