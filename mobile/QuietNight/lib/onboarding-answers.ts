/**
 * Persist and load onboarding answers.
 * Builds API payload for POST /api/onboarding/complete.
 */

import { getStorage } from "./storage";
import { STORAGE_KEYS } from "@/constants/app";
import type { OnboardingAnswers, OnboardingCompletionPayload } from "@/types/onboarding";

export function loadOnboardingAnswers(): OnboardingAnswers {
  const storage = getStorage();
  const raw = storage.getString(STORAGE_KEYS.ONBOARDING_ANSWERS);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as OnboardingAnswers;
    return parsed ?? {};
  } catch {
    return {};
  }
}

export function saveOnboardingAnswers(answers: OnboardingAnswers): void {
  const storage = getStorage();
  storage.set(STORAGE_KEYS.ONBOARDING_ANSWERS, JSON.stringify(answers));
}

export function buildOnboardingPayload(answers: OnboardingAnswers): OnboardingCompletionPayload {
  const sleeping_arrangement =
    answers.has_partner === false ? "SLEEP_ALONE" : answers.sleeping_arrangement;
  return {
    user_name: answers.user_name,
    has_partner: answers.has_partner,
    partner_name: answers.partner_name,
    partner_email: answers.partner_email,
    attribution_source: answers.attribution_source,
    prior_app_usage: answers.prior_app_usage,
    role: answers.role,
    sleeping_arrangement,
    relationship_severity: answers.relationship_severity,
    problem_duration: answers.problem_duration,
    remedies_tried: answers.remedies_tried,
    primary_goal: answers.primary_goal,
    target_weeks: answers.target_weeks,
    bedtime_reminder_time: answers.bedtime_reminder_time,
  };
}
