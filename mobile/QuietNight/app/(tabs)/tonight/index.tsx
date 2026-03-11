import { useState, useEffect } from "react";
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
import PartnerVector from "@/assets/images/vectors/partner-vector.svg";
import { useRouter, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { useSystemChecks } from "@/hooks/use-system-checks";
import { PREFLIGHT_MIN_STORAGE_MB } from "@/constants/app";
import {
  getLastNightSummary,
  getLastNightKey,
  getTodayNightKey,
  getNightFactors,
  getNightRemedy,
  setNightRemedy,
  getNightTimeStats,
} from "@/lib/nights";
import { getExperimentStreak } from "@/lib/journey-data";
import { clearWavRecordingsOlderThanDays } from "@/lib/recordings";
import { PreflightWarningsModal } from "@/components/PreflightWarningsModal";
import { getPersonalizedTip } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { RemedyType } from "@/types";
import {
  getPartnerCheckInUrl,
  PARTNER_CHECKIN_SHARE_MESSAGE,
} from "@/lib/partner-checkin";
import {
  accent,
  background,
  colors,
  text,
  surface,
  radius,
  spacing,
  type,
  fonts,
  elevation,
} from "@/constants/theme";

const PARTNER_ILLUSTRATION_HEIGHT = 120;

export default function TonightScreen() {
  const router = useRouter();
  const { remedy: remedyParam } = useLocalSearchParams<{ remedy?: string }>();
  const { width: windowWidth } = useWindowDimensions();
  const { user } = useAuth();

  // Prefill tonight's remedy when opened from Lab "Try tonight" with a suggestion
  useEffect(() => {
    if (remedyParam && remedyParam.trim()) {
      const key = getTodayNightKey();
      setNightRemedy(key, [remedyParam.trim() as RemedyType]);
    }
  }, [remedyParam]);
  const firstName = user?.preferred_name ?? user?.first_name ?? "there";
  const partnerName = (user?.partner_name ?? "").trim() || "Partner";

  const [partnerInSameRoom, setPartnerInSameRoom] = useState(false);
  const [roomChoiceEditing, setRoomChoiceEditing] = useState(true);

  const {
    micStatus,
    storageMB,
    batteryStatus,
    showLowBatteryWarning,
    showLowStorageWarning,
    runStorageCheck,
  } = useSystemChecks();

  const [warningsModalDismissed, setWarningsModalDismissed] = useState(false);
  const [userOpenedPreflightWarnings, setUserOpenedPreflightWarnings] = useState(false);
  const [clearOldRecordingsLoading, setClearOldRecordingsLoading] = useState(false);

  useEffect(() => {
    if (!showLowBatteryWarning && !showLowStorageWarning) {
      setWarningsModalDismissed(false);
      setUserOpenedPreflightWarnings(false);
    }
  }, [showLowBatteryWarning, showLowStorageWarning]);

  const handleClearOldRecordings = () => {
    setClearOldRecordingsLoading(true);
    try {
      clearWavRecordingsOlderThanDays(7);
      runStorageCheck();
    } finally {
      setClearOldRecordingsLoading(false);
    }
  };

  const hasStorage =
    storageMB === null || storageMB >= PREFLIGHT_MIN_STORAGE_MB;

  const canStart =
    micStatus === "ok" &&
    hasStorage &&
    (batteryStatus === "ok" || batteryStatus === "warn");

  const handleAskPartner = async () => {
    const nightKeyForShare = getLastNightKey() ?? getTodayNightKey();
    const url = getPartnerCheckInUrl(nightKeyForShare);
    try {
      await Share.share({
        message: `${PARTNER_CHECKIN_SHARE_MESSAGE}\n\n${url}`,
        url,
        title: "QuietNight — How did you sleep?",
      });
    } catch {
      // User cancelled or share failed
    }
  };

  const hasPartner = !!user?.partner_name?.trim();
  const [lastNightSummary, setLastNightSummary] = useState<ReturnType<typeof getLastNightSummary>>(null);
  const [personalizedTip, setPersonalizedTip] = useState<string | null>(null);
  const experimentStreak = getExperimentStreak();
  const [tipLoading, setTipLoading] = useState(true);
  const illustrationWrapWidth = windowWidth;
  const illustrationWrapMarginLeft = -(spacing.screenPadding + spacing.cardPadding);
  const [illustrationWidth, setIllustrationWidth] = useState(illustrationWrapWidth);

  useEffect(() => {
    setLastNightSummary(getLastNightSummary());
  }, []);

  // Personalized tip from backend (LLM, structured output) based on last night's sleep
  useEffect(() => {
    let cancelled = false;
    const key = getLastNightKey();
    const summary = getLastNightSummary();
    if (!key || !summary) {
      setPersonalizedTip(null);
      setTipLoading(false);
      return;
    }
    setTipLoading(true);
    const factors = getNightFactors(key);
    const remedies = getNightRemedy(key);
    const remedyParam = remedies.length ? remedies[0] : undefined;
    getPersonalizedTip({
      night_key: key,
      snore_mins: summary.loudMins,
      peak_time: summary.peakTime,
      event_count: summary.eventCount,
      remedy: remedyParam,
      factors: factors
        ? {
            alcohol_level: factors.alcohol_level ?? undefined,
            congestion_level: factors.congestion_level ?? undefined,
            room_result: factors.room_result ?? undefined,
            exhausted_today: factors.exhausted_today ?? undefined,
            worked_out: factors.worked_out ?? undefined,
            used_sedative: factors.used_sedative ?? undefined,
            sick: factors.sick ?? undefined,
            smoking: factors.smoking ?? undefined,
            caffeine: factors.caffeine ?? undefined,
            note: factors.note ?? undefined,
            pre_sleep_other: factors.pre_sleep_other ?? undefined,
            sleep_quality: factors.sleep_quality ?? undefined,
            snoring_severity: factors.snoring_severity ?? undefined,
            disruptions: factors.disruptions ?? undefined,
            impact: factors.impact ?? undefined,
          }
        : undefined,
    }).then(({ data }) => {
      if (!cancelled) {
        if (data?.tip) setPersonalizedTip(data.tip);
        setTipLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lastNightSummary]);

  const onIllustrationLayout = (e: { nativeEvent: { layout: { width: number } } }) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setIllustrationWidth(w);
  };

  const showWarningsModal =
    (showLowBatteryWarning || showLowStorageWarning) &&
    !warningsModalDismissed &&
    userOpenedPreflightWarnings;

  return (
    <>
      <PreflightWarningsModal
        visible={showWarningsModal}
        onDismiss={() => {
          setWarningsModalDismissed(true);
          setUserOpenedPreflightWarnings(false);
        }}
        lowBattery={showLowBatteryWarning}
        lowStorage={showLowStorageWarning}
        onClearOldRecordings={handleClearOldRecordings}
        onOpenProfile={() => router.push("/(tabs)/profile")}
        clearOldRecordingsLoading={clearOldRecordingsLoading}
      />
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
        <Text style={styles.greeting}>Good evening, {firstName}</Text>
        <Text style={styles.greetingSub}>Tap to start recording</Text>
        {experimentStreak.current >= 2 && (
          <View style={styles.streakPill}>
            <Text style={styles.streakPillText}>
              {experimentStreak.current}-night streak
            </Text>
          </View>
        )}

        {!canStart && (showLowBatteryWarning || showLowStorageWarning) && (
          <TouchableOpacity
            style={styles.howToFixWrap}
            onPress={() => {
              setWarningsModalDismissed(false);
              setUserOpenedPreflightWarnings(true);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.howToFixText}>Having trouble? How to fix →</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.recordCtaTouchable, !canStart && styles.recordCtaDisabled]}
          onPress={() => router.push("/(tabs)/tonight/wizard")}
          disabled={!canStart}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={[...colors.ctaGradient]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.recordCtaCard}
          >
            <View style={styles.recordCtaInner}>
              <Ionicons name="moon" size={32} color={colors.illustration.star} />
              <View style={styles.recordCtaTextWrap}>
                <Text style={styles.recordCtaTitle}>Record Sleep</Text>
                <Text style={styles.recordCtaSub}>Start tracking tonight</Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

      {/* Your last night (no partner): above tip, more details, no icon */}
      {!hasPartner && (
        <View style={[styles.card, styles.lastNightCard]}>
          <Text style={styles.lastNightTitle}>Your last night</Text>
          {lastNightSummary ? (
            <>
              <Text style={styles.lastNightDate}>{lastNightSummary.dateLabel}</Text>
              <View style={styles.lastNightRow}>
                <Text style={styles.lastNightStat}>
                  <Text style={styles.lastNightStatValue}>{lastNightSummary.loudMins}</Text> mins loud snoring
                </Text>
                {lastNightSummary.peakTime !== "—" && (
                  <Text style={styles.lastNightStat}>
                    Peak <Text style={styles.lastNightStatValue}>{lastNightSummary.peakTime}</Text>
                  </Text>
                )}
              </View>
              {(() => {
                const key = getLastNightKey();
                if (!key) return null;
                const stats = getNightTimeStats(key);
                if (stats.totalMinutes <= 0) return null;
                return (
                  <View style={styles.lastNightRow}>
                    <Text style={styles.lastNightStat}>
                      <Text style={styles.lastNightStatValue}>{stats.totalMinutes}</Text> min in bed
                    </Text>
                    {stats.snoringPercent > 0 && (
                      <Text style={styles.lastNightStat}>
                        <Text style={styles.lastNightStatValue}>{Math.round(stats.snoringPercent)}%</Text> snoring
                      </Text>
                    )}
                    {lastNightSummary.eventCount > 0 && (
                      <Text style={styles.lastNightStat}>
                        <Text style={styles.lastNightStatValue}>{lastNightSummary.eventCount}</Text> events
                      </Text>
                    )}
                  </View>
                );
              })()}
              <TouchableOpacity
                style={styles.lastNightSeeDetails}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/tonight/morning",
                    params: getLastNightKey() ? { sessionId: getLastNightKey()! } : {},
                  })
                }
                activeOpacity={0.8}
              >
                <Text style={styles.lastNightSeeDetailsText}>See details</Text>
                <Ionicons name="chevron-forward" size={16} color={accent.teal} />
              </TouchableOpacity>
            </>
          ) : (
            <Text style={styles.lastNightEmpty}>
              When you complete a night, your morning summary will appear here so you can see how you did and compare over time.
            </Text>
          )}
        </View>
      )}

        <View style={[styles.card, styles.tipCard]}>
          <View style={styles.tipHeader}>
            <Ionicons name="bulb-outline" size={20} color={accent.primary} />
            <Text style={styles.tipTitle}>Tip of the day</Text>
          </View>
          {tipLoading ? (
            <View style={styles.tipLoadingWrap}>
              <ActivityIndicator size="small" color={accent.primary} />
              <Text style={styles.tipText}>Loading your tip…</Text>
            </View>
          ) : (
          <Text style={styles.tipText}>
            {personalizedTip ??
              "Keeping a consistent bedtime helps your body clock. Try to go to bed within the same 30-minute window each night."}
          </Text>
          )}
        </View>

      {/* Partner check-in (only if user has a partner) */}
      {hasPartner && (
        <View style={[styles.card, styles.partnerCard]}>
          <View
            style={[
              styles.partnerIllustrationWrap,
              {
                width: illustrationWrapWidth,
                marginLeft: illustrationWrapMarginLeft,
              },
            ]}
            onLayout={onIllustrationLayout}
          >
            <PartnerVector
                width={illustrationWidth}
                height={PARTNER_ILLUSTRATION_HEIGHT}
                style={styles.partnerIllustration}
                preserveAspectRatio="xMidYMid slice"
            />
          </View>
          <View style={styles.partnerHeader}>
            <View style={styles.partnerAvatar}>
              <Text style={styles.partnerAvatarText}>{partnerName.slice(0, 1)}</Text>
            </View>
            <View style={styles.partnerHeaderText}>
              <Text style={styles.partnerTitle}>{partnerName}&apos;s last check-in</Text>
              <Text style={styles.partnerQuote}>
                &quot;Woke up 3 times. Feeling exhausted.&quot;
              </Text>
            </View>
          </View>
          <View style={styles.toggleRow}>
            {roomChoiceEditing ? (
              <>
                <Text style={styles.toggleLabel}>Sleeping together tonight?</Text>
                <View style={styles.toggleOptions}>
                  {(["No", "Yes"] as const).map((opt) => {
                    const isYes = opt === "Yes";
                    const active = partnerInSameRoom === isYes;
                    return (
                      <TouchableOpacity
                        key={opt}
                        style={[styles.toggleOption, active && styles.toggleOptionOn]}
                        onPress={() => {
                          setPartnerInSameRoom(isYes);
                          setRoomChoiceEditing(false);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.toggleOptionText,
                            active ? styles.toggleOptionTextOn : styles.toggleOptionTextOff,
                          ]}
                        >
                          {opt}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.toggleFeedback}>
                  {partnerInSameRoom ? "Sleeping in the same room" : "Sleeping in separate rooms"}
                </Text>
                <TouchableOpacity
                  style={styles.toggleChangeButton}
                  onPress={() => setRoomChoiceEditing(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.toggleChangeText}>Change</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          <TouchableOpacity
            style={styles.askPartnerLinkButton}
            onPress={handleAskPartner}
            activeOpacity={0.8}
          >
            <Ionicons name="share-outline" size={18} color={accent.teal} />
            <Text style={styles.askPartnerLinkText}>Ask partner about last night</Text>
          </TouchableOpacity>
        </View>
      )}

    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.primary },
  content: {
    flexGrow: 1,
    padding: spacing.screenPadding,
    paddingTop: spacing.stackLg,
    paddingBottom: spacing.sectionGapLarge * 2,
  },
  greeting: {
    ...type.headingMd,
    color: text.primary,
    marginBottom: 4,
  },
  greetingSub: {
    ...type.bodyMd,
    color: text.secondary,
    marginBottom: spacing.md,
  },
  streakPill: {
    alignSelf: "flex-start",
    backgroundColor: accent.tealSoft,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    marginBottom: spacing.sm,
  },
  streakPillText: {
    ...type.bodySmall,
    fontFamily: fonts.bodyMedium,
    color: accent.teal,
  },
  howToFixWrap: { marginBottom: spacing.xs },
  howToFixText: { ...type.bodyMd, color: accent.primary },
  recordCtaTouchable: {
    borderRadius: radius.xl,
    marginBottom: spacing.lg,
    overflow: "hidden",
    ...elevation.ctaGlow,
  },
  recordCtaDisabled: { opacity: 0.5 },
  recordCtaCard: {
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  recordCtaInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  recordCtaTextWrap: { flex: 1 },
  recordCtaTitle: {
    ...type.headingMd,
    color: "#fff",
    marginBottom: 2,
  },
  recordCtaSub: {
    ...type.bodySm,
    color: "rgba(255,255,255,0.9)",
  },
  card: {
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    marginBottom: spacing.sectionGap,
  },
  partnerCard: {
    backgroundColor: background.primary,
    borderColor: accent.tealGlow,
    overflow: "hidden",
  },
  partnerIllustrationWrap: {
    height: PARTNER_ILLUSTRATION_HEIGHT,
    marginTop: -spacing.cardPadding,
    marginBottom: spacing.stackMd,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    overflow: "hidden",
  },
  partnerIllustration: {
    width: "100%",
    height: "100%",
  },
  partnerHeader: {
    flexDirection: "row",
    marginBottom: spacing.stackMd,
  },
  partnerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: accent.teal,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.stackMd,
  },
  partnerAvatarText: {
    color: background.primary,
    fontFamily: fonts.bodyMedium,
    fontSize: 18,
  },
  partnerHeaderText: { flex: 1 },
  partnerTitle: {
    ...type.label,
    color: accent.teal,
    letterSpacing: 1,
    marginBottom: 4,
  },
  partnerQuote: {
    ...type.bodySmall,
    fontStyle: "italic",
    color: text.secondary,
    lineHeight: 20,
  },
  askPartnerLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.stackMd,
    paddingVertical: 10,
    gap: 6,
  },
  askPartnerLinkText: {
    ...type.bodySmall,
    fontFamily: fonts.bodyMedium,
    color: accent.teal,
  },
  toggleRow: { marginTop: spacing.stackSm, paddingTop: spacing.stackSm, borderTopWidth: 1, borderTopColor: surface.elevated },
  toggleLabel: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: spacing.stackSm,
  },
  toggleOptions: { flexDirection: "row", gap: spacing.stackSm },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.button,
    backgroundColor: surface.elevated,
    alignItems: "center",
  },
  toggleOptionOn: { backgroundColor: accent.teal },
  toggleOptionText: { ...type.bodySmall, fontFamily: fonts.bodyMedium },
  toggleOptionTextOn: { color: background.primary },
  toggleOptionTextOff: { color: text.secondary },
  toggleFeedback: {
    ...type.bodySmall,
    color: text.primary,
  },
  toggleChangeButton: {
    marginTop: spacing.stackSm,
  },
  toggleChangeText: {
    ...type.bodySmall,
    fontFamily: fonts.bodyMedium,
    color: accent.teal,
  },

  lastNightCard: {
    backgroundColor: accent.tealSoft,
    borderColor: accent.tealGlow,
  },
  lastNightTitle: {
    ...type.titleCard,
    color: text.primary,
    marginBottom: spacing.stackSm,
  },
  lastNightDate: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: spacing.stackSm,
  },
  lastNightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.stackMd,
    marginBottom: spacing.stackSm,
  },
  lastNightStat: {
    ...type.bodySmall,
    color: text.primary,
  },
  lastNightStatValue: {
    fontFamily: fonts.bodyMedium,
    color: accent.teal,
  },
  lastNightSeeDetails: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: spacing.stackSm,
  },
  lastNightSeeDetailsText: {
    ...type.bodySmall,
    fontFamily: fonts.bodyMedium,
    color: accent.teal,
  },
  lastNightEmpty: {
    ...type.bodySmall,
    color: text.secondary,
    lineHeight: 22,
  },

  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: surface.elevated,
  },
  checkRowLast: { borderBottomWidth: 0 },
  checkIcon: {
    width: 24,
    fontSize: 16,
    marginRight: spacing.stackMd,
    textAlign: "center",
  },
  checkBody: { flex: 1 },
  checkLabel: { ...type.body, fontFamily: fonts.bodyMedium, color: text.primary },
  checkValue: { ...type.bodySmall, marginTop: 2 },

  tipCard: {
    backgroundColor: background.primary,
    borderColor: surface.elevated,
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.stackSm,
  },
  tipTitle: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: text.primary,
    marginLeft: spacing.stackSm,
  },
  tipLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.stackSm,
  },
  tipText: {
    ...type.bodySmall,
    color: text.secondary,
    lineHeight: 20,
  },
  tipFooter: {
    marginTop: spacing.stackMd,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  lastNightButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  lastNightButtonText: {
    ...type.bodySmall,
    fontFamily: fonts.bodyMedium,
    color: accent.primary,
  },
});
