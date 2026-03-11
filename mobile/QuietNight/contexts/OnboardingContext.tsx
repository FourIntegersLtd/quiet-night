"use client";

import React, { createContext, useCallback, useContext, useState, useEffect } from "react";
import type { OnboardingAnswers } from "@/types/onboarding";
import { loadOnboardingAnswers, saveOnboardingAnswers } from "@/lib/onboarding-answers";

const TOTAL_STEPS = 28;

/** Step 9b: extra compassionate screen when severity 4 or 5 (partner only) */
const COMPASSIONATE_STEP = 9.5;

/** Partner-only steps: shown only when has_partner === true (5=partner name, 6=TwoPlayer, 10=Living, 11=Severity, 26=PartnerInvite, 27=Rate) */
const PARTNER_ONLY_STEPS = [5, 6, 10, 11, 26, 27] as const;
/** Step 24 = bedtime reminder; always show for both solo and partner users */
const BEDTIME_REMINDER_STEP = 24;
/** Step 25 = Weight & height (BMI); show for all users */
const HEALTH_STEP = 25;
/** Step 28 = redundant pricing screen; skip so we go from Rate (27) to paywall */
const PAYWALL_REDIRECT_STEP = 28;
/** Steps that are skipped conditionally */
function shouldSkipStep(step: number, answers: OnboardingAnswers): boolean {
  const hasPartner = answers.has_partner === true;
  if (step === BEDTIME_REMINDER_STEP) return false;
  if (step === HEALTH_STEP) return false;
  if (step === PAYWALL_REDIRECT_STEP) return true;
  if (!hasPartner && (PARTNER_ONLY_STEPS as readonly number[]).includes(step)) return true;
  if (!hasPartner && step === COMPASSIONATE_STEP) return true;
  if (hasPartner && step === 26 && answers.sleeping_arrangement === "SLEEP_ALONE") return true;
  return false;
}

function getNextStep(current: number, answers: OnboardingAnswers): number {
  if (current >= TOTAL_STEPS) return TOTAL_STEPS;
  if (current === 4) {
    return answers.has_partner === true ? 5 : 7;
  }
  if (current === COMPASSIONATE_STEP) return 11;
  if (current === 10 && (answers.relationship_severity === 4 || answers.relationship_severity === 5)) {
    return COMPASSIONATE_STEP;
  }
  let next = current + 1;
  while (next <= TOTAL_STEPS && shouldSkipStep(next, answers)) next++;
  return next;
}

function getPrevStep(current: number, answers: OnboardingAnswers): number {
  if (current <= 1) return 1;
  if (current === 7) {
    return answers.has_partner === true ? 6 : 4;
  }
  if (current === 6) return 5;
  if (current === 5) return 4;
  if (current === 4) return 3;
  if (current === COMPASSIONATE_STEP) return 10;
  if (current === 11) {
    if (answers.relationship_severity === 4 || answers.relationship_severity === 5) {
      return COMPASSIONATE_STEP;
    }
  }
  let prev = current - 1;
  while (prev >= 1 && shouldSkipStep(prev, answers)) prev--;
  return prev;
}

/** Ordered list of step numbers to show (accounts for skips and inserts) */
function getOrderedSteps(answers: OnboardingAnswers): number[] {
  const steps: number[] = [];
  for (let s = 1; s <= TOTAL_STEPS; s++) {
    if (shouldSkipStep(s, answers)) continue;
    if (s === 10) {
      steps.push(10);
      if (answers.has_partner && (answers.relationship_severity === 4 || answers.relationship_severity === 5)) {
        steps.push(COMPASSIONATE_STEP);
      }
    } else {
      steps.push(s);
    }
  }
  return steps;
}

function getVisibleStepIndex(step: number, answers: OnboardingAnswers): number {
  const ordered = getOrderedSteps(answers);
  const idx = ordered.findIndex((s) => s === step);
  return idx >= 0 ? idx + 1 : 1;
}

function getTotalVisibleSteps(answers: OnboardingAnswers): number {
  return getOrderedSteps(answers).length;
}

type OnboardingContextValue = {
  step: number;
  answers: OnboardingAnswers;
  visibleStepIndex: number;
  totalSteps: number;
  setAnswer: <K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => void;
  goNext: () => void;
  goBack: () => void;
  reset: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [step, setStep] = useState(1);
  const [answers, setAnswersState] = useState<OnboardingAnswers>(() => loadOnboardingAnswers());

  useEffect(() => {
    saveOnboardingAnswers(answers);
  }, [answers]);

  // If we land on a skipped step, advance past it
  useEffect(() => {
    if (step > 1 && shouldSkipStep(step, answers)) {
      setStep(getNextStep(step, answers));
    }
  }, [step, answers]);

  const setAnswer = useCallback(<K extends keyof OnboardingAnswers>(key: K, value: OnboardingAnswers[K]) => {
    setAnswersState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const goNext = useCallback(() => {
    setStep((s) => getNextStep(s, answers));
  }, [answers]);

  const goBack = useCallback(() => {
    setStep((s) => getPrevStep(s, answers));
  }, [answers]);

  const reset = useCallback(() => {
    setStep(1);
    setAnswersState({});
  }, []);

  const visibleStepIndex = getVisibleStepIndex(step, answers);
  const totalSteps = getTotalVisibleSteps(answers);

  const value: OnboardingContextValue = {
    step,
    answers,
    visibleStepIndex,
    totalSteps,
    setAnswer,
    goNext,
    goBack,
    reset,
  };

  return (
    <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within OnboardingProvider");
  return ctx;
}
