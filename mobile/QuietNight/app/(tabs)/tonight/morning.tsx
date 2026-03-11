import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Share,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  getNightSnores,
  getTodayNightKey,
  getNightRemedy,
  getNightFactors,
  setNightFactors,
  type NightFactors,
} from "@/lib/nights";
import { getMorningCelebration } from "@/lib/journey-data";
import {
  getPartnerCheckInUrl,
  PARTNER_CHECKIN_SHARE_MESSAGE,
} from "@/lib/partner-checkin";
import { getNightInsights } from "@/lib/api";
import {
  background,
  accent,
  colors,
  text,
  surface,
  radius,
  spacing,
  type,
  fonts,
  semantic,
  severityGradient,
} from "@/constants/theme";
import { PrimaryButton, GhostButton } from "@/components/ui/buttons";
import {
  IconSelectorGrid,
  type IconSelectorItem,
} from "@/components/IconSelectorGrid";
import LoudSnoringIcon from "@/assets/images/vectors/snoring.svg";
// import MorningIcon from "@/assets/images/vectors/morning.svg"
import type { SnoreEvent, RemedyType } from "@/types";

const MORNING_STEPS = 3;
const SLEEP_QUALITY_LABELS: Record<number, string> = {
  1: "Very poor",
  2: "Poor",
  3: "Fair",
  4: "Below average",
  5: "Average",
  6: "Good",
  7: "Very good",
  8: "Great",
  9: "Excellent",
  10: "Perfect",
};
const DISRUPTION_ITEMS: IconSelectorItem[] = [
  { id: "partner_moved", icon: "person-outline", label: "Partner moved" },
  { id: "noise_outside", icon: "volume-high-outline", label: "Noise outside" },
  { id: "temperature", icon: "thermometer-outline", label: "Temperature" },
  { id: "light", icon: "sunny-outline", label: "Light" },
  { id: "pain", icon: "body-outline", label: "Pain" },
  { id: "bathroom", icon: "water-outline", label: "Bathroom" },
  { id: "anxiety", icon: "flash-outline", label: "Anxiety" },
  { id: "other_disruption", icon: "ellipse-outline", label: "Other" },
];
const IMPACT_ITEMS: IconSelectorItem[] = [
  { id: "well_rested", icon: "sunny-outline", label: "Well rested" },
  { id: "groggy", icon: "cloudy-outline", label: "Groggy" },
  { id: "headache", icon: "medical-outline", label: "Headache" },
  { id: "dry_mouth", icon: "water-outline", label: "Dry mouth" },
  { id: "sore_throat", icon: "mic-outline", label: "Sore throat" },
  { id: "tired", icon: "moon-outline", label: "Tired" },
  { id: "foggy", icon: "cloud-outline", label: "Foggy" },
  { id: "other_impact", icon: "ellipse-outline", label: "Other" },
];

const stepStyles = StyleSheet.create({
  card: {
    backgroundColor: background.secondary,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.sectionGap,
  },
  stepTitle: {
    ...type.titleCard,
    color: text.primary,
    marginBottom: spacing.stackSm,
  },
  stepSub: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: spacing.stackMd,
    lineHeight: 20,
  },
  navRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.stackMd,
    justifyContent: "space-between",
  },
  severityWrap: { marginVertical: spacing.stackMd },
  severityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.stackSm,
  },
  severityDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    opacity: 0.5,
  },
  severityDotActive: { opacity: 1, borderWidth: 2, borderColor: "#fff" },
  severityLabel: {
    ...type.titleCard,
    color: text.primary,
    textAlign: "center",
  },
});

function SeverityScale({
  value,
  onValueChange,
  labels,
}: {
  value: number;
  onValueChange: (v: number) => void;
  labels: Record<number, string>;
}) {
  return (
    <View style={stepStyles.severityWrap}>
      <View style={stepStyles.severityRow}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
          <TouchableOpacity
            key={v}
            style={[
              stepStyles.severityDot,
              { backgroundColor: severityGradient[v - 1] },
              value === v && stepStyles.severityDotActive,
            ]}
            onPress={() => onValueChange(v)}
          />
        ))}
      </View>
      <Text style={stepStyles.severityLabel}>
        {value ? labels[value] : "Tap a number"}
      </Text>
    </View>
  );
}

const REMEDY_LABELS: Record<RemedyType, string> = {
  BASELINE: "Baseline (Nothing)",
  CPAP: "CPAP",
  MOUTHPIECE: "Mouthpiece",
  MOUTH_TAPE: "Mouth Tape",
  NASAL_DILATOR: "Nasal Dilator",
  NASAL_SPRAY: "Nasal Spray",
  NASAL_STRIPS: "Nasal Strips",
  NO_ALCOHOL: "No Alcohol",
  SIDE_SLEEPING: "Side Sleeping",
  THROAT_SPRAY: "Throat Spray",
  TONGUE_RETAINER: "Tongue Retainer",
  WEDGE_PILLOW: "Wedge Pillow",
  AIR_PURIFIER: "Air Purifier",
  HUMIDIFIER: "Humidifier",
  ANTI_SNORE_PILLOW: "Anti Snore Pillow",
  ANTI_HISTAMINES: "Antihistamines",
  CHIN_STRAP: "Chin Strap",
};

/** Estimated seconds per snore event (Swift records ~3s minimum + variable). MVP: use 5s; later use actual file duration. */
const SECONDS_PER_SNORE_EVENT = 5;

function buildByHour(events: SnoreEvent[]): { byHour: number[]; max: number } {
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const e of events) {
    const hour = new Date(e.timestamp * 1000).getHours();
    if (hour >= 0 && hour < 24) byHour[hour]++;
  }
  const max = Math.max(1, ...byHour);
  return { byHour, max };
}

function getPeakTimeLabel(byHour: number[]): string {
  let maxCount = 0;
  let peakStart = 0;
  for (let h = 0; h < 24; h++) {
    if (byHour[h] > maxCount) {
      maxCount = byHour[h];
      peakStart = h;
    }
  }
  if (maxCount === 0) return "—";
  const format = (h: number) => {
    if (h === 0) return "12am";
    if (h === 12) return "12pm";
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };
  return `${format(peakStart)}–${format(peakStart + 1)}`;
}

/** Label for snoring intensity based on estimated loud minutes (and event count when no minutes). */
function getSnoringLevelLabel(snoreMinutes: number, eventCount: number): string {
  if (eventCount === 0) return "No snoring detected";
  if (snoreMinutes <= 0) return "Minimal snoring";
  if (snoreMinutes <= 12) return "Light snoring";
  if (snoreMinutes <= 25) return "Moderate snoring";
  return "Loud snoring";
}

function formatBarHour(h: number): string {
  if (h === 0) return "12am";
  if (h === 6) return "6am";
  if (h === 12) return "12pm";
  if (h === 18) return "6pm";
  return "";
}

const STATS_ILLUSTRATION_HEIGHT = 100;

export default function MorningTruth() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { sessionId: paramSessionId } = useLocalSearchParams<{
    sessionId?: string;
  }>();

  const sessionId = paramSessionId || getTodayNightKey();
  const existingFactors = getNightFactors(sessionId);

  const [morningStep, setMorningStep] = useState<number>(() =>
    existingFactors?.sleep_quality != null ? MORNING_STEPS : 0,
  );
  const [sleepQuality, setSleepQuality] = useState(
    existingFactors?.sleep_quality ?? 5,
  );
  const [disruptions, setDisruptions] = useState<string[]>(
    existingFactors?.disruptions ?? [],
  );
  const [impact, setImpact] = useState<string[]>(existingFactors?.impact ?? []);

  const [actualSnoreMinutes, setActualSnoreMinutes] = useState(0);
  const [snoreEventsCount, setSnoreEventsCount] = useState(0);
  const [avgSecPerEpisode, setAvgSecPerEpisode] = useState(0);
  const [peakTimeLabel, setPeakTimeLabel] = useState("—");
  const [byHour, setByHour] = useState<{ byHour: number[]; max: number }>({
    byHour: [],
    max: 1,
  });
  const [nightInsightSummary, setNightInsightSummary] = useState<string | null>(null);
  const [nightInsightLoading, setNightInsightLoading] = useState(true);

  const remedies = getNightRemedy(sessionId);
  const experimentName = remedies.length
    ? remedies.map((r) => REMEDY_LABELS[r]).filter(Boolean).join(", ")
    : "—";

  const toggleDisruption = (id: string) => {
    setDisruptions((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const toggleImpact = (id: string) => {
    setImpact((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleMorningStepNext = () => {
    if (morningStep < MORNING_STEPS - 1) {
      setMorningStep((s) => s + 1);
    } else {
      const existing = getNightFactors(sessionId);
      const factors: NightFactors = {
        ...existing,
        alcohol_level: existing?.alcohol_level ?? "NONE",
        congestion_level: existing?.congestion_level ?? "CLEAR",
        sleep_quality: sleepQuality,
        snoring_severity: existing?.snoring_severity ?? 5,
        disruptions: disruptions.length ? disruptions : undefined,
        impact: impact.length ? impact : undefined,
      };
      setNightFactors(sessionId, factors);
      setMorningStep(MORNING_STEPS);
    }
  };

  const handleAskPartner = async () => {
    const url = getPartnerCheckInUrl(sessionId);
    try {
      await Share.share({
        message: `${PARTNER_CHECKIN_SHARE_MESSAGE}\n\n${url}`,
        url: url,
        title: "QuietNight — How did you sleep?",
      });
    } catch {
      // User cancelled or share failed
    }
  };

  useEffect(() => {
    const events = getNightSnores(sessionId);
    setSnoreEventsCount(events.length);
    const estimatedSeconds = events.length * SECONDS_PER_SNORE_EVENT;
    const mins = Math.round(estimatedSeconds / 60);
    setActualSnoreMinutes(mins);
    setAvgSecPerEpisode(
      events.length ? Math.round(estimatedSeconds / events.length) : 0,
    );
    const hourData = buildByHour(events);
    setByHour(hourData);
    setPeakTimeLabel(getPeakTimeLabel(hourData.byHour));
  }, [sessionId]);

  // LLM night insights (backend); fallback to static text on error or no API
  useEffect(() => {
    let cancelled = false;
    setNightInsightLoading(true);
    getNightInsights({
      snore_mins: actualSnoreMinutes,
      peak_time: peakTimeLabel,
      remedy_name: experimentName,
      event_count: snoreEventsCount,
    }).then(({ data }) => {
      if (!cancelled) {
        if (data?.summary) setNightInsightSummary(data.summary);
        setNightInsightLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [
    sessionId,
    actualSnoreMinutes,
    peakTimeLabel,
    experimentName,
    snoreEventsCount,
  ]);

  if (morningStep < MORNING_STEPS) {
    return (
      <View style={styles.container}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Ionicons
              name="sunny"
              size={28}
              color={colors.illustration.star}
              style={styles.headerIcon}
            />
            <Text style={[styles.header, { marginTop: 24 }]}>
              Good Morning
            </Text>
          </View>
          <Text style={styles.stepIndicator}>
            Step {morningStep + 1} of {MORNING_STEPS}
          </Text>

          {morningStep === 0 && (
            <View style={stepStyles.card}>
              <Text style={stepStyles.stepTitle}>How was your sleep?</Text>
              <Text style={stepStyles.stepSub}>
                Rate 1 (very poor) to 10 (perfect).
              </Text>
              <SeverityScale
                value={sleepQuality}
                onValueChange={setSleepQuality}
                labels={SLEEP_QUALITY_LABELS}
              />
              <View style={stepStyles.navRow}>
                <GhostButton label="Back" onPress={() => router.back()} />
                <PrimaryButton
                  label="Continue"
                  onPress={handleMorningStepNext}
                />
              </View>
            </View>
          )}

          {morningStep === 1 && (
            <View style={stepStyles.card}>
              <Text style={stepStyles.stepTitle}>
                What disrupted your sleep?
              </Text>
              <Text style={stepStyles.stepSub}>
                Select any that applied (optional).
              </Text>
              <IconSelectorGrid
                items={DISRUPTION_ITEMS}
                selectedIds={disruptions}
                onSelect={toggleDisruption}
                inactiveIconColor={colors.illustration.star}
                activeIconColor={accent.primary}
              />
              <View style={stepStyles.navRow}>
                <GhostButton label="Back" onPress={() => setMorningStep(0)} />
                <PrimaryButton
                  label="Continue"
                  onPress={handleMorningStepNext}
                />
              </View>
            </View>
          )}

          {morningStep === 2 && (
            <View style={stepStyles.card}>
              <Text style={stepStyles.stepTitle}>
                How do you feel this morning?
              </Text>
              <Text style={stepStyles.stepSub}>
                Select any that apply (optional).
              </Text>
              <IconSelectorGrid
                items={IMPACT_ITEMS}
                selectedIds={impact}
                onSelect={toggleImpact}
                inactiveIconColor={colors.illustration.star}
                activeIconColor={accent.primary}
              />
              <View style={stepStyles.navRow}>
                <GhostButton label="Back" onPress={() => setMorningStep(1)} />
                <PrimaryButton
                  label="See summary"
                  onPress={handleMorningStepNext}
                />
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Ionicons
            name="sunny"
            size={28}
            color={colors.illustration.star}
            style={styles.headerIcon}
          />
          <Text style={[styles.header, { marginTop: 20 }]}>
            Good Morning
          </Text>
        </View>

        <View style={styles.statsCard}>
          <View
            style={[
              styles.statsIllustrationWrap,
              {
                width: windowWidth,
                marginLeft: -(spacing.screenPadding + spacing.cardPaddingLarge),
              },
            ]}
          >
            <LoudSnoringIcon
              width={windowWidth}
              height={STATS_ILLUSTRATION_HEIGHT}
              style={styles.statsIllustration}
              preserveAspectRatio="xMidYMid slice"
            />

            {/* <MorningIcon/> */}
          </View>
          <Text style={styles.statsTitle}>
              {getSnoringLevelLabel(actualSnoreMinutes, snoreEventsCount)}
            </Text>
          <View style={styles.row}>
            <Text style={styles.bigNumber}>
              {actualSnoreMinutes} <Text style={styles.mins}>mins</Text>
            </Text>
            {actualSnoreMinutes < 20 ? (
              <View style={styles.badgeSuccess}>
                <Ionicons
                  name="arrow-down"
                  size={16}
                  color={semantic.success}
                />
                <Text style={styles.badgeText}>Great night!</Text>
              </View>
            ) : (
              <View style={styles.badgeWarn}>
                <Text style={styles.badgeWarnText}>Slightly elevated</Text>
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <View style={styles.rowBetween}>
            <Text style={styles.subStatLabel}>Snore episodes</Text>
            <Text style={styles.subStatValue}>{snoreEventsCount} times</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.subStatLabel}>Avg per episode</Text>
            <Text style={styles.subStatValue}>
              {avgSecPerEpisode ? `~${avgSecPerEpisode} sec` : "—"}
            </Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.subStatLabel}>Peak time</Text>
            <Text style={styles.subStatValue}>{peakTimeLabel}</Text>
          </View>
          <View style={styles.rowBetween}>
            <Text style={styles.subStatLabel}>Current test</Text>
            <Text style={styles.subStatValue}>{experimentName}</Text>
          </View>

          <View style={styles.statsCardFooter}>
            <TouchableOpacity
              style={styles.statsCardLink}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/nights/[key]",
                  params: { key: sessionId },
                })
              }
              activeOpacity={0.7}
              accessibilityLabel="View charts and playback"
            >
              <Text style={styles.statsCardLinkText}>Charts & playback</Text>
              <Ionicons name="arrow-forward" size={20} color={accent.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {snoreEventsCount > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>When you snored</Text>
            <View style={styles.barRow}>
              {Array.from({ length: 24 }, (_, h) => {
                const count = byHour.byHour[h] ?? 0;
                const height = byHour.max > 0 ? (count / byHour.max) * 48 : 0;
                return (
                  <View key={h} style={styles.barCol}>
                    <View
                      style={[styles.bar, { height: Math.max(2, height) }]}
                    />
                  </View>
                );
              })}
            </View>
            <View style={styles.xAxisRow}>
              <Text style={[styles.xAxisLabel, styles.xAxisLabelQuarter]}>
                12am
              </Text>
              <Text style={[styles.xAxisLabel, styles.xAxisLabelQuarter]}>
                6am
              </Text>
              <Text style={[styles.xAxisLabel, styles.xAxisLabelQuarter]}>
                12pm
              </Text>
              <Text style={[styles.xAxisLabel, styles.xAxisLabelQuarter]}>
                6pm
              </Text>
            </View>
          </View>
        )}

        {(() => {
          const celebration = getMorningCelebration(sessionId, actualSnoreMinutes);
          if (!celebration) return null;
          return (
            <View style={styles.celebrationCard}>
              <Text style={styles.celebrationText}>{celebration.message}</Text>
            </View>
          );
        })()}

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Ionicons name="sparkles" size={18} color={colors.illustration.star} />
            <Text style={styles.summaryTitle}>Night Insights</Text>
          </View>
          {nightInsightLoading ? (
            <View style={styles.summaryLoadingWrap}>
              <ActivityIndicator size="small" color={colors.illustration.star} />
              <Text style={styles.summaryText}>Loading insights…</Text>
            </View>
          ) : (
          <Text style={styles.summaryText}>
            {nightInsightSummary ??
              (snoreEventsCount === 0
                ? "No snoring detected last night. Your partner's report will appear on the Journey tab once you're linked."
                : actualSnoreMinutes <= 12
                  ? `Peak snoring was around ${peakTimeLabel}. Under 12 minutes—${experimentName !== "—" ? experimentName + " " : ""}looks promising.`
                  : `Peak snoring was around ${peakTimeLabel}. ${actualSnoreMinutes} mins detected. When you link with your partner, their sleep report will show on your Journey.`)}
          </Text>
          )}
        </View>

        <View style={styles.askPartnerCard}>
          <View style={styles.askPartnerHeader}>
            <Ionicons name="person-outline" size={18} color={accent.primary} />
            <Text style={styles.askPartnerTitle}>Ask your partner</Text>
          </View>
          <Text style={styles.askPartnerText}>
            Send a link so they can report how they slept—no app install needed.
            Share by email or message.
          </Text>
          <TouchableOpacity
            style={styles.askPartnerButton}
            onPress={handleAskPartner}
            activeOpacity={0.8}
          >
            <Ionicons
              name="share-outline"
              size={18}
              color={background.primary}
            />
            <Text style={styles.askPartnerButtonText}>
              Share link with partner
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.primary },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing.sectionGapLarge * 2 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.screenPadding,
  },
  headerIcon: { marginRight: spacing.sm },
  header: {
    ...type.title,
    fontSize: 26,
    color: text.primary,
    marginBottom: spacing.stackSm,
    paddingHorizontal: 0,
  },
  stepIndicator: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: spacing.stackMd,
    paddingHorizontal: spacing.screenPadding,
  },

  statsCard: {
    backgroundColor: background.secondary,
    padding: spacing.cardPaddingLarge,
    paddingTop: spacing.cardPaddingLarge + spacing.stackMd,
    borderRadius: radius.card,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.sectionGap,
    overflow: "hidden",
  },
  statsIllustrationWrap: {
    height: STATS_ILLUSTRATION_HEIGHT,
    marginTop: -(spacing.cardPaddingLarge + spacing.stackMd),
    marginBottom: spacing.stackMd,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    overflow: "hidden",
  },
  statsIllustration: {
    width: "100%",
    height: "100%",
  },
  statsTitle: {
    ...type.label,
    color: text.secondary,
    marginBottom: spacing.stackSm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.stackLg,
  },
  bigNumber: {
    ...type.stat,
    fontSize: 40,
    color: accent.teal,
    marginRight: spacing.stackMd,
    paddingTop: 32,
  },
  mins: { fontSize: 22, color: semantic.tealLight, fontFamily: fonts.body },
  badgeSuccess: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(52, 211, 153, 0.2)",
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 6,
    borderRadius: radius.button,
  },
  badgeText: {
    color: semantic.success,
    fontFamily: fonts.bodyMedium,
    marginLeft: 4,
  },
  badgeWarn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(251, 191, 36, 0.25)",
    paddingHorizontal: spacing.stackMd,
    paddingVertical: 6,
    borderRadius: radius.button,
  },
  badgeWarnText: {
    color: semantic.warning,
    fontFamily: fonts.bodyMedium,
  },
  divider: {
    height: 1,
    backgroundColor: surface.elevated,
    marginBottom: spacing.stackMd,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.stackSm,
  },
  subStatLabel: { ...type.body, color: text.secondary },
  subStatValue: {
    ...type.body,
    color: text.primary,
    fontFamily: fonts.bodyMedium,
  },
  statsCardFooter: {
    marginTop: spacing.stackMd,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  statsCardLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  statsCardLinkText: {
    ...type.bodySmall,
    fontFamily: fonts.bodyMedium,
    color: accent.primary,
  },

  chartCard: {
    backgroundColor: background.secondary,
    padding: spacing.cardPaddingLarge,
    paddingBottom: spacing.cardPadding,
    borderRadius: radius.card,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.sectionGap,
    minHeight: 160,
  },
  chartTitle: {
    ...type.label,
    color: text.secondary,
    marginBottom: spacing.stackMd,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 72,
    gap: 2,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "80%",
    minWidth: 4,
    backgroundColor: accent.teal,
    borderRadius: 2,
    opacity: 0.9,
  },
  xAxisRow: {
    flexDirection: "row",
    marginTop: spacing.stackSm,
    paddingHorizontal: 2,
  },
  xAxisLabel: {
    ...type.bodySmall,
    fontSize: 11,
    color: text.muted,
    textAlign: "center",
  },
  xAxisLabelQuarter: {
    flex: 6,
  },

  celebrationCard: {
    backgroundColor: semantic.success + "18",
    padding: spacing.cardPadding,
    borderRadius: radius.card,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.sectionGap,
    borderWidth: 1,
    borderColor: semantic.success + "40",
  },
  celebrationText: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: text.primary,
    textAlign: "center",
  },

  summaryCard: {
    backgroundColor: accent.tealSoft,
    padding: spacing.cardPadding,
    borderRadius: radius.card,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.sectionGap,
    borderWidth: 1,
    borderColor: accent.tealGlow,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.stackSm,
  },
  summaryTitle: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: accent.teal,
    marginLeft: spacing.stackSm,
  },
  summaryLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  summaryText: {
    ...type.body,
    color: semantic.tealLight,
    lineHeight: 22,
  },

  askPartnerCard: {
    backgroundColor: background.secondary,
    padding: spacing.cardPadding,
    borderRadius: radius.card,
    marginHorizontal: spacing.screenPadding,
    marginBottom: spacing.sectionGap,
    borderWidth: 1,
    borderColor: surface.elevated,
  },
  askPartnerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.stackSm,
  },
  askPartnerTitle: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: text.primary,
    marginLeft: spacing.stackSm,
  },
  askPartnerText: {
    ...type.bodySmall,
    color: text.secondary,
    lineHeight: 20,
    marginBottom: spacing.stackMd,
  },
  askPartnerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: accent.teal,
    paddingVertical: 12,
    paddingHorizontal: spacing.cardPadding,
    borderRadius: radius.button,
    gap: 8,
  },
  askPartnerButtonText: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: background.primary,
  },
});
