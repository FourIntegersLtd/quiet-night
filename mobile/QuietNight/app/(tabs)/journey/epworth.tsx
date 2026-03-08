import { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAlert } from "@/contexts/AlertContext";
import { PrimaryButton, GhostButton } from "@/components/ui/buttons";
import { getStorage } from "@/lib/storage";
import { STORAGE_KEYS } from "@/constants/app";
import {
  accent,
  background,
  text,
  surface,
  spacing,
  radius,
  type,
  fonts,
} from "@/constants/theme";

/** Chance of dozing: 0–3 per question; total 0–24 */
const DOZING_LABELS: Record<number, string> = {
  0: "No chance",
  1: "Slight chance",
  2: "Moderate chance",
  3: "High chance",
};

const EPWORTH_SITUATIONS = [
  "Sitting and reading",
  "Watching TV",
  "Sitting inactive in a public place (e.g. a theatre or a meeting)",
  "As a passenger in a car for an hour without a break",
  "Lying down in the afternoon when circumstances permit",
  "Sitting and talking to someone",
  "Sitting quietly after lunch without alcohol",
  "In a car, while stopped for a few minutes in traffic",
] as const;

function getInterpretation(total: number): {
  message: string;
  hint: string;
  seeDoctor: boolean;
} {
  if (total <= 6)
    return {
      message: "Congratulations, you are getting enough sleep.",
      hint: "0–6",
      seeDoctor: false,
    };
  if (total <= 8)
    return {
      message:
        "You are showing some sign of daytime sleepiness. This can sometimes be suggestive of obstructive sleep apnea (OSA) or other sleep disorders.",
      hint: "7–8",
      seeDoctor: true,
    };
  return {
    message:
      "Your score is in a range that is often associated with significant daytime sleepiness and may be suggestive of obstructive sleep apnea (OSA). Seek the advice of a doctor or sleep specialist.",
    hint: "9–24",
    seeDoctor: true,
  };
}

type EpworthResult = {
  totalScore: number;
  answers: number[];
  completedAt: string;
};

function loadLastResult(): EpworthResult | null {
  const raw = getStorage().getString(STORAGE_KEYS.EPWORTH_LAST_RESULT);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as EpworthResult;
    if (typeof data.totalScore !== "number" || !Array.isArray(data.answers))
      return null;
    return data;
  } catch {
    return null;
  }
}

function saveResult(result: EpworthResult): void {
  getStorage().set(STORAGE_KEYS.EPWORTH_LAST_RESULT, JSON.stringify(result));
}

type ViewMode = "intro" | "form" | "result";

export default function EpworthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const alertApi = useAlert();

  const [viewMode, setViewMode] = useState<ViewMode>("intro");
  const [formStep, setFormStep] = useState(0); // 0 = key, 1..8 = question index 0..7
  const [lastResult, setLastResult] = useState<EpworthResult | null>(null);
  const [answers, setAnswers] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0]);
  const [result, setResult] = useState<EpworthResult | null>(null);

  useEffect(() => {
    setLastResult(loadLastResult());
  }, [viewMode]);

  const totalScore = answers.reduce((a, b) => a + b, 0);
  const setAnswer = (index: number, value: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleStartAssessment = () => {
    setFormStep(0);
    setViewMode("form");
  };
  const handleBackToIntro = () => {
    setViewMode("intro");
    setFormStep(0);
    setAnswers([0, 0, 0, 0, 0, 0, 0, 0]);
  };
  const handleFormNext = () => {
    if (formStep < 8) setFormStep((s) => s + 1);
    else {
      const completedAt = new Date().toISOString();
      const res: EpworthResult = {
        totalScore,
        answers: [...answers],
        completedAt,
      };
      saveResult(res);
      setResult(res);
      setViewMode("result");
    }
  };
  const handleFormBack = () => {
    if (formStep > 0) setFormStep((s) => s - 1);
  };
  const handleDone = () => {
    setViewMode("intro");
    setFormStep(0);
    setResult(null);
    setLastResult(loadLastResult());
  };

  const handleGenerateReport = () => {
    alertApi.show({
      title: "Generate GP Report",
      message:
        "PDF export will be available once the Epworth assessment flow is complete.",
      buttons: [{ text: "OK" }],
    });
  };

  const contentPadding = {
    paddingTop: 20,
    paddingBottom: spacing.sectionGapLarge * 2,
  };

  if (viewMode === "form") {
    const isKeyStep = formStep === 0;
    const questionIndex = formStep - 1; // 0..7
    const stepLabel = isKeyStep
      ? "Step 1 of 9"
      : `Step ${formStep + 1} of 9`;

    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, contentPadding]}
          showsVerticalScrollIndicator={true}
        >
        

          <Text style={styles.stepIndicator}>{stepLabel}</Text>
          <Text style={styles.title}>
            {isKeyStep ? "Epworth Sleepiness Scale" : "Chance of dozing"}
          </Text>

          {isKeyStep ? (
            <View style={styles.keyCard}>
              <Text style={styles.keyIntro}>
                How likely are you to doze off in each situation? Choose 0–3 for
                each of the next 8 questions.
              </Text>
              {[0, 1, 2, 3].map((v) => (
                <Text key={v} style={styles.scoringKeyItem}>
                  {v} = {DOZING_LABELS[v]}
                </Text>
              ))}
            </View>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.situationLabel}>
                {EPWORTH_SITUATIONS[questionIndex]}
              </Text>
              <View style={styles.scaleReminder}>
                {[0, 1, 2, 3].map((v) => (
                  <Text key={v} style={styles.scaleReminderItem}>
                    {v} = {DOZING_LABELS[v]}
                  </Text>
                ))}
              </View>
              <View style={styles.scoreRow}>
                {[0, 1, 2, 3].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.scoreBtn,
                      answers[questionIndex] === v && styles.scoreBtnActive,
                    ]}
                    onPress={() => setAnswer(questionIndex, v)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.scoreBtnText,
                        answers[questionIndex] === v && styles.scoreBtnTextActive,
                      ]}
                    >
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.navRow}>
            {formStep > 0 ? (
              <GhostButton label="Back" onPress={handleFormBack} />
            ) : (
              <View style={styles.navSpacer} />
            )}
            <PrimaryButton
              label={formStep === 8 ? "See result" : "Continue"}
              onPress={handleFormNext}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (viewMode === "result" && result) {
    const interp = getInterpretation(result.totalScore);
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, contentPadding]}
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.title}>Your result</Text>
        <View style={styles.resultCard}>
          <Text style={styles.resultScore}>{result.totalScore}</Text>
          <Text style={styles.resultScoreLabel}>Epworth Sleepiness Score</Text>
          <View style={styles.interpretationWrap}>
            <Text style={styles.interpretationHint}>{interp.hint}</Text>
            <Text style={styles.interpretationMessage}>{interp.message}</Text>
            {interp.seeDoctor
            }
          </View>
        </View>
        <Text style={styles.resultDisclaimer}>
          This is a standard wellness check, not a medical diagnosis. If your
          score suggests elevated daytime sleepiness, share your results with
          your doctor.
        </Text>
        <PrimaryButton label="Done" onPress={handleDone} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, contentPadding]}
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.introDisclaimer}>
        This is a standard wellness check, not a medical diagnosis. It helps you
        and your doctor understand your sleepiness patterns. A high score may be
        suggestive of obstructive sleep apnea (OSA)—if so, see a doctor for
        evaluation.
      </Text>

      {lastResult && (
        <View style={styles.lastScoreCard}>
          <Text style={styles.lastScoreLabel}>Your last score</Text>
          <Text style={styles.lastScoreValue}>{lastResult.totalScore}</Text>
          <Text style={styles.lastScoreDate}>
            {new Date(lastResult.completedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Epworth Sleepiness Scale</Text>
        <Text style={styles.cardSub}>
          You will answer 8 short questions about how likely you are to doze in
          everyday situations. The assessment takes about 2 minutes.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleStartAssessment}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>
            {lastResult ? "Take assessment again" : "Start assessment"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.card, styles.cardPartner]}>
        <Text style={styles.cardTitle}>GP Report (PDF)</Text>
        <Text style={styles.cardSub}>
          If your score suggests elevated daytime sleepiness, you can generate a
          1-page summary for your doctor: baseline data, experiment attempts,
          partner disturbance, and ESS score.
        </Text>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleGenerateReport}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Generate GP Report (PDF)</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Epworth Sleepiness Scale. Data generated by Quiet Night, a
        consumer wellness app. Not a medical device.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.primary },
  scroll: { flex: 1 },
  content: {
    flexGrow: 1,
    padding: spacing.screenPadding,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.stackMd,
  },
  backText: {
    color: text.primary,
    fontSize: 15,
    marginLeft: 4,
    fontFamily: fonts.bodyMedium,
  },
  stepIndicator: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: spacing.stackSm,
  },
  title: {
    ...type.title,
    color: text.primary,
    marginBottom: spacing.stackMd,
  },
  keyCard: {
    backgroundColor: background.secondary,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.sectionGap,
  },
  keyIntro: {
    ...type.body,
    color: text.primary,
    marginBottom: spacing.stackMd,
  },
  navRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.stackLg,
    justifyContent: "space-between",
  },
  navSpacer: { flex: 1 },
  introDisclaimer: {
    ...type.bodySmall,
    color: text.secondary,
    marginTop: spacing.stackSm,
    marginBottom: spacing.stackLg,
  },
  resultDisclaimer: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: spacing.stackLg,
  },
  lastScoreCard: {
    backgroundColor: surface.elevated,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.sectionGap,
    alignItems: "center",
  },
  lastScoreLabel: { ...type.label, color: text.secondary, marginBottom: 4 },
  lastScoreValue: {
    fontSize: 32,
    fontFamily: fonts.headingSemi,
    color: accent.primary,
  },
  lastScoreDate: { ...type.bodySmall, color: text.muted, marginTop: 4 },
  card: {
    backgroundColor: background.secondary,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.sectionGap,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  cardPartner: {
    borderColor: accent.tealGlow,
  },
  cardTitle: {
    ...type.titleCard,
    color: text.primary,
    marginBottom: 8,
  },
  cardSub: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: 16,
  },
  scoringKeyTitle: {
    ...type.label,
    color: text.secondary,
    marginBottom: spacing.stackSm,
  },
  scoringKey: { marginBottom: spacing.stackMd },
  scoringKeyItem: {
    ...type.bodySmall,
    color: text.muted,
    marginBottom: 4,
  },
  formCard: {
    backgroundColor: background.secondary,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.sectionGap,
  },
  formRow: {
    marginBottom: spacing.stackMd,
  },
  situationLabel: {
    ...type.body,
    color: text.primary,
    marginBottom: spacing.stackSm,
  },
  scaleReminder: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.stackMd,
  },
  scaleReminderItem: {
    ...type.bodySmall,
    color: text.muted,
  },
  scoreRow: { flexDirection: "row", gap: 8 },
  scoreBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: surface.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreBtnActive: {
    backgroundColor: accent.primary,
  },
  scoreBtnText: {
    ...type.titleCard,
    color: text.primary,
  },
  scoreBtnTextActive: {
    color: "#fff",
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.stackLg,
    paddingTop: spacing.stackMd,
    borderTopWidth: 1,
    borderTopColor: surface.elevated,
    gap: spacing.sm,
  },
  totalLabel: { ...type.titleCard, color: text.primary },
  totalValue: { ...type.title, color: accent.primary },
  primaryButton: {
    backgroundColor: accent.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.button,
    alignItems: "center",
  },
  primaryButtonText: {
    ...type.button,
    color: "#fff",
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: radius.button,
    alignItems: "center",
    borderWidth: 1,
    borderColor: accent.primary,
  },
  secondaryButtonText: {
    ...type.button,
    color: accent.primary,
  },
  resultCard: {
    backgroundColor: background.secondary,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginBottom: spacing.stackLg,
    alignItems: "center",
  },
  resultScore: {
    fontSize: 48,
    fontFamily: fonts.headingSemi,
    color: accent.primary,
  },
  resultScoreLabel: {
    ...type.body,
    color: text.secondary,
    marginTop: 4,
  },
  interpretationWrap: {
    marginTop: spacing.stackLg,
    paddingTop: spacing.stackMd,
    borderTopWidth: 1,
    borderTopColor: surface.elevated,
    alignItems: "center",
  },
  interpretationHint: { ...type.label, color: text.muted, marginBottom: 4 },
  interpretationMessage: {
    ...type.body,
    color: text.primary,
    textAlign: "center",
  },
  interpretationDoctor: {
    ...type.bodySmall,
    color: text.secondary,
    textAlign: "center",
    marginTop: spacing.stackMd,
    fontFamily: fonts.bodyMedium,
  },
  footer: {
    ...type.bodySmall,
    color: text.muted,
    textAlign: "center",
    marginTop: spacing.stackLg,
    fontStyle: "italic",
  },
});
