import { useCallback, useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TrophyIcon from "@/assets/images/vectors/trophy.svg";

import {
  accent,
  background,
  text,
  surface,
  spacing,
  radius,
  semantic,
  type,
  fonts,
} from "@/constants/theme";
import {
  getLast7DaysJourneyData,
  getLeaderboardFromRealData,
  getWinningRemedyFromRealData,
  getMilestoneProgress,
  getSnoreScoresByMonth,
  getExperimentStreak,
} from "@/lib/journey-data";
import { getBestRemedySummary, getLatestEpworth, listSessions, getWeeklySummary, type BestRemedySummaryResponse } from "@/lib/api";
import { setNightPartnerReport } from "@/lib/nights";
import { useAuth } from "@/contexts/AuthContext";
import { getStorage } from "@/lib/storage";
import { STORAGE_KEYS } from "@/constants/app";

const WINNING_ILLUSTRATION_HEIGHT = 250;

function getLastEpworthScore(): number | null {
  const raw = getStorage().getString(STORAGE_KEYS.EPWORTH_LAST_RESULT);
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { totalScore?: number };
    return typeof data.totalScore === "number" ? data.totalScore : null;
  } catch {
    return null;
  }
}

const MILESTONE_NAMES = ["Start", "Experiment", "Review"];

export default function JourneyScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { width: windowWidth } = useWindowDimensions();
  const [refreshKey, setRefreshKey] = useState(0);
  const [bestRemedySummary, setBestRemedySummary] = useState<BestRemedySummaryResponse | null>(null);
  const [bestRemedyLoading, setBestRemedyLoading] = useState(true);
  const [lastEpworthScore, setLastEpworthScore] = useState<number | null>(() => getLastEpworthScore());
  const [weeklySummary, setWeeklySummary] = useState<string | null>(null);
  const [weeklySummaryLoading, setWeeklySummaryLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setRefreshKey((k) => k + 1);
      if (session?.accessToken) {
        getLatestEpworth().then(({ data }) => {
          if (data?.total_score != null) setLastEpworthScore(data.total_score);
          else setLastEpworthScore(getLastEpworthScore());
        });
        listSessions({ limit: 30 }).then(({ data: sessions }) => {
          if (sessions) {
            sessions.forEach((s) => {
              if (s.partner_report === "good" || s.partner_report === "bad") {
                const nightKey = s.night_key.startsWith("night_") ? s.night_key : `night_${s.night_key}`;
                setNightPartnerReport(nightKey, s.partner_report, s.partner_note ?? undefined);
              }
            });
            setRefreshKey((k) => k + 1);
          }
        });
      } else {
        setLastEpworthScore(getLastEpworthScore());
      }
    }, [session?.accessToken])
  );

  const last7Days = getLast7DaysJourneyData();
  const leaderboard = getLeaderboardFromRealData();
  const winningRemedy = getWinningRemedyFromRealData();
  const milestone = getMilestoneProgress();
  const snoreScoresByMonth = getSnoreScoresByMonth();
  const experimentStreak = getExperimentStreak();

  // LLM best-remedy summary (backend); refetch when tab is focused
  useEffect(() => {
    let cancelled = false;
    setBestRemedyLoading(true);
    const lb = getLeaderboardFromRealData();
    const payload = lb.map((r) => ({
      remedy: r.remedy,
      nights: r.nights,
      reduction: r.reduction ?? null,
    }));
    getBestRemedySummary(payload).then(({ data }) => {
      if (!cancelled) {
        if (data) setBestRemedySummary(data);
        setBestRemedyLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // Weekly AI summary (backend); refetch when tab is focused and user is logged in
  useEffect(() => {
    if (!session?.accessToken) return;
    let cancelled = false;
    setWeeklySummaryLoading(true);
    getWeeklySummary()
      .then(({ data }) => {
        if (!cancelled && data?.summary) setWeeklySummary(data.summary);
      })
      .finally(() => {
        if (!cancelled) setWeeklySummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey, session?.accessToken]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      {/* Section 1: Milestone path (derived from real night count) */}
      <View style={styles.section}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pathScroll}
        >
          {MILESTONE_NAMES.map((name, i) => {
            const step = i + 1;
            const done = milestone.currentStep > step;
            const current = milestone.currentStep === step;
            return (
              <View key={name} style={styles.pathNodeWrap}>
                <View
                  style={[
                    styles.pathDot,
                    done && styles.pathDotDone,
                    current && styles.pathDotCurrent,
                    !done && !current && styles.pathDotLocked,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={14} color={background.primary} />
                  ) : (
                    <Text
                      style={[
                        styles.pathDotText,
                        current && styles.pathDotTextCurrent,
                      ]}
                    >
                      {step}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.pathNodeName,
                    current && styles.pathNodeNameCurrent,
                    !done && !current && styles.pathNodeNameLocked,
                  ]}
                  numberOfLines={1}
                >
                  {name}
                </Text>
                {i < MILESTONE_NAMES.length - 1 && <View style={styles.pathLine} />}
              </View>
            );
          })}
        </ScrollView>
        <Text style={styles.pathObjective}>{milestone.objective}</Text>
        {experimentStreak.current >= 2 && (
          <Text style={styles.streakText}>
            You&apos;ve completed {experimentStreak.current} consecutive experiment nights!
          </Text>
        )}
      </View>

      {/* This week: AI summary (logged-in users) */}
      {session?.accessToken && (
        <View style={[styles.card, styles.weeklyCard]}>
          <Text style={styles.weeklyCardTitle}>This week</Text>
          {weeklySummaryLoading ? (
            <ActivityIndicator size="small" color={accent.teal} style={{ marginVertical: spacing.stackSm }} />
          ) : (
            <Text style={styles.weeklyCardText}>
              {weeklySummary ?? "Record a few nights to see your weekly summary here."}
            </Text>
          )}
        </View>
      )}

      {/* Section 2: Winning formula (LLM or fallback from real data) */}
      <View style={[styles.card, styles.winningCard]}>
        {/* <View style={styles.winningIllustrationWrap}>
          <TrophyIcon
            width={windowWidth - 2 * spacing.screenPadding}
            height={WINNING_ILLUSTRATION_HEIGHT}
            style={styles.winningIllustration}
            preserveAspectRatio="xMidYMid slice"
          />
        </View> */}
        <View style={[styles.winningContent]}>
          <View style={styles.winningHeader}>
          <Ionicons name="sparkles" size={20} color={accent.teal} />
          <Text style={styles.winningTitle}>
            {bestRemedySummary
              ? bestRemedySummary.title
              : winningRemedy
                ? `Your Best Remedy: ${winningRemedy.remedyLabel}`
                : "Your best remedy"}
          </Text>
        </View>
        {bestRemedyLoading ? (
          <View style={styles.winningLoadingWrap}>
            <ActivityIndicator size="small" color={accent.teal} />
            <Text style={styles.winningSub}>Loading your best remedy…</Text>
          </View>
        ) : bestRemedySummary ? (
          <>
            {winningRemedy && (
              <View style={styles.winningStats}>
                <Text style={styles.winningStatGreen}>
                  -{winningRemedy.reductionPercent}% Loud Snoring
                </Text>
                <Text style={styles.winningStat}>
                  {winningRemedy.nights} night{winningRemedy.nights !== 1 ? "s" : ""} tracked
                </Text>
              </View>
            )}
            <Text style={styles.winningSub}>{bestRemedySummary.summary}</Text>
            <Text style={styles.winningSub}>{bestRemedySummary.recommendation}</Text>
          </>
        ) : winningRemedy ? (
          <>
            <View style={styles.winningStats}>
              <Text style={styles.winningStatGreen}>
                -{winningRemedy.reductionPercent}% Loud Snoring
              </Text>
              <Text style={styles.winningStat}>
                {winningRemedy.nights} night{winningRemedy.nights !== 1 ? "s" : ""} tracked
              </Text>
            </View>
            <Text style={styles.winningSub}>
              This is your most effective remedy so far. Keep tracking to compare over time.
            </Text>
          </>
        ) : (
          <Text style={styles.winningSub}>
            Track nights from the Tonight tab and try different remedies. Your best option will appear here once you have enough data.
          </Text>
        )}
        </View>
      </View>

      {/* Section 3: Last 7 days (real sleeper data; no partner data in app) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Last 7 days</Text>
        <View style={styles.calendarRow}>
          {last7Days.map((d) => (
            <View key={d.dateStr} style={styles.calendarDay}>
              <View
                style={[
                  styles.calendarTop,
                  d.sleeperQuiet ? styles.calendarTopQuiet : styles.calendarTopLoud,
                ]}
              />
              <View
                style={[
                  styles.calendarBottom,
                  d.partnerGood === true && styles.calendarBottomGood,
                  d.partnerGood === false && styles.calendarBottomBad,
                  d.partnerGood === null && styles.calendarBottomNone,
                ]}
              />
              <Text style={styles.calendarLabel}>{d.day.slice(0, 1)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.calendarLegend}>
          <View style={styles.legendRow}>
            <Text style={styles.legendLabel}>You:</Text>
            <View style={[styles.legendSwatch, styles.calendarTopQuiet]} />
            <Text style={styles.legendText}>Quiet (≤12 min)</Text>
            <View style={[styles.legendSwatch, styles.calendarTopLoud]} />
            <Text style={styles.legendText}>Loud</Text>
          </View>
          <View style={styles.legendRow}>
            <Text style={styles.legendLabel}>Partner:</Text>
            <View style={[styles.legendSwatch, styles.calendarBottomGood]} />
            <Text style={styles.legendText}>Slept great</Text>
            <View style={[styles.legendSwatch, styles.calendarBottomBad]} />
            <Text style={styles.legendText}>Exhausted</Text>
            <View style={[styles.legendSwatch, styles.calendarBottomNone]} />
            <Text style={styles.legendText}>No report</Text>
          </View>
        </View>
      </View>

       {/* Section 4: Experiment leaderboard (real data) */}
       <View style={styles.section}>
        <Text style={styles.sectionTitle}>Experiment leaderboard</Text>
        {leaderboard.length === 0 ? (
          <Text style={styles.emptyLeaderboard}>
            No nights recorded yet. Start from the Tonight tab to see your leaderboard here.
          </Text>
        ) : (
          leaderboard.map((item, rank) => (
            <TouchableOpacity
              key={item.remedy}
              style={styles.leaderRow}
              onPress={() =>
                router.push({
                  pathname: "/(tabs)/journey/remedy/[remedyKey]",
                  params: { remedyKey: item.remedyKey },
                })
              }
              activeOpacity={0.7}
            >
              <Text style={styles.leaderRank}>{rank + 1}</Text>
              <View style={styles.leaderBody}>
                <Text
                  style={[
                    styles.leaderName,
                    item.isWarning && styles.leaderNameWarning,
                  ]}
                >
                  {item.remedy}
                </Text>
                <Text style={styles.leaderMeta}>
                  {item.nights} night{item.nights !== 1 ? "s" : ""}
                  {item.reduction != null
                    ? ` · ${item.reduction}% vs baseline`
                    : item.avgMins != null
                      ? ` · ${item.avgMins} mins avg`
                      : ""}
                </Text>
              </View>
              {item.isWarning ? (
                <Text style={styles.leaderWarning}>Need more nights</Text>
              ) : (
                item.reduction != null && (
                  <Text
                    style={[
                      styles.leaderReduction,
                      item.reduction < 0 && styles.leaderReductionWorse,
                    ]}
                  >
                    {item.reduction > 0 ? "−" : ""}{item.reduction}%
                  </Text>
                )
              )}
              <Ionicons name="chevron-forward" size={18} color={text.muted} />
            </TouchableOpacity>
          ))
        )}
      </View>

    
      <TouchableOpacity
        style={[styles.card, styles.epworthCard]}
        onPress={() => router.push("/(tabs)/journey/epworth")}
        activeOpacity={0.8}
      >
        <Ionicons name="fitness" size={24} color={accent.teal} />
        <View style={styles.epworthCardText}>
          <Text style={styles.epworthCardTitle}>Check your daytime energy</Text>
          <Text style={styles.epworthCardSub}>
            {lastEpworthScore != null
              ? `Last Epworth score: ${lastEpworthScore}. Tap to retake or see details.`
              : "Standard wellness check — not a medical diagnosis."}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={text.muted} />
    
      </TouchableOpacity>
    
     

      {/* Section 5: Medical escalation (hidden; no real trigger yet) */}
      {false && (
        <TouchableOpacity
          style={styles.medicalBanner}
          onPress={() => router.push("/(tabs)/journey/epworth")}
          activeOpacity={0.8}
        >
          <Text style={styles.medicalText}>
            Nothing seems to be working. Take the 1-minute Sleepiness test to see
            if you should consult a doctor.
          </Text>
          <Ionicons name="chevron-forward" size={18} color={text.muted} />
        </TouchableOpacity>
      )}

        {/* Section: Snore scores by month */}
        {snoreScoresByMonth.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snore scores by month</Text>
          <Text style={styles.monthChartSubtitle}>
            Avg loud minutes per night
          </Text>
          <View style={styles.monthChart}>
            {snoreScoresByMonth.map((row) => {
              const maxScore = Math.max(
                1,
                ...snoreScoresByMonth.map((r) => r.score)
              );
              const barHeight = (row.score / maxScore) * 80;
              return (
                <View key={row.monthKey} style={styles.monthBarWrap}>
                  <View style={styles.monthBarCol}>
                    <View
                      style={[
                        styles.monthBar,
                        { height: Math.max(4, barHeight) },
                      ]}
                    />
                    <Text style={styles.monthBarLabel}>{row.monthLabel}</Text>
                    <Text style={styles.monthBarScore}>
                      {row.score} min{row.nights > 1 ? ` · ${row.nights} nights` : ""}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}


    
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.primary },
  content: {
    flexGrow: 1,
    padding: spacing.screenPadding,
    paddingTop: spacing.stackSm,
    paddingBottom: spacing.sectionGapLarge * 2.5,
  },
  section: { marginBottom: spacing.sectionGapLarge * 1.5 },
  sectionTitle: {
    ...type.titleCard,
    color: text.primary,
    marginBottom: spacing.stackMd,
  },

  pathScroll: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingBottom: spacing.stackMd,
  },
  pathNodeWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4,
  },
  pathDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  pathDotDone: { backgroundColor: semantic.success },
  pathDotCurrent: {
    backgroundColor: accent.teal,
    borderWidth: 2,
    borderColor: accent.tealGlow,
  },
  pathDotLocked: { backgroundColor: surface.elevated },
  pathDotText: { fontSize: 12, fontFamily: fonts.bodyMedium, color: text.muted },
  pathDotTextCurrent: { color: background.primary },
  pathNodeName: {
    fontSize: 12,
    fontFamily: fonts.body,
    color: text.primary,
    marginLeft: 6,
    maxWidth: 72,
  },
  pathNodeNameCurrent: { fontFamily: fonts.bodyMedium, color: accent.teal },
  pathNodeNameLocked: { color: text.muted },
  pathLine: {
    width: 16,
    height: 2,
    backgroundColor: surface.elevated,
    marginLeft: 4,
  },
  pathObjective: {
    ...type.bodySmall,
    color: text.secondary,
    marginTop: 4,
  },
  streakText: {
    ...type.bodySmall,
    fontFamily: fonts.bodyMedium,
    color: accent.teal,
    marginTop: spacing.stackSm,
  },

  card: {
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    marginBottom: spacing.sectionGap,
  },
  weeklyCard: {
    backgroundColor: background.secondary,
    borderColor: surface.elevated,
  },
  weeklyCardTitle: {
    ...type.titleCard,
    color: text.primary,
    marginBottom: spacing.stackSm,
  },
  weeklyCardText: {
    ...type.bodySmall,
    color: text.secondary,
    lineHeight: 22,
  },
  winningCard: {
    position: "relative",
    backgroundColor: accent.tealSoft,
    borderColor: accent.tealGlow,
    overflow: "hidden",
  },
  winningIllustrationWrap: {
    position: "absolute",
    top: 0,
    left: -spacing.cardPadding,
    right: -spacing.cardPadding,
    height: WINNING_ILLUSTRATION_HEIGHT,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    overflow: "hidden",
  },
  winningIllustration: {
    width: "100%",
    height: "120%",
  },
  winningContent: {},
  winningHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.stackSm,
  },
  winningTitle: {
    ...type.titleCard,
    color: text.primary,
    marginLeft: spacing.stackSm,
  },
  winningLoadingWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.stackSm,
  },
  winningStats: { marginBottom: spacing.stackSm },
  winningStatGreen: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: semantic.success,
  },
  winningStat: { ...type.bodySmall, color: text.primary, marginTop: 2 },
  winningSub: { ...type.bodySmall, color: semantic.tealLight, lineHeight: 20 },

  calendarRow: { flexDirection: "row", justifyContent: "space-between", gap: 6 },
  calendarDay: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: 8,
    overflow: "hidden",
  },
  calendarTop: { flex: 1 },
  calendarBottom: { flex: 1 },
  calendarTopQuiet: { backgroundColor: accent.teal },
  calendarTopLoud: { backgroundColor: semantic.warning },
  calendarBottomGood: { backgroundColor: semantic.success },
  calendarBottomBad: { backgroundColor: "#ef4444" },
  calendarBottomNone: { backgroundColor: surface.elevated },
  calendarLabel: {
    position: "absolute",
    bottom: 2,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 9,
    color: text.muted,
  },
  calendarLegend: { marginTop: spacing.stackMd, gap: 4 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendLabel: { ...type.bodySmall, color: text.secondary, width: 56 },
  legendSwatch: { width: 14, height: 14, borderRadius: 4 },
  legendText: { ...type.bodySmall, color: text.secondary },

  monthChartSubtitle: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: spacing.stackMd,
  },
  monthChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    minHeight: 120,
  },
  monthBarWrap: { flex: 1 },
  monthBarCol: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  monthBar: {
    width: "80%",
    backgroundColor: accent.teal,
    borderRadius: 4,
    minHeight: 4,
  },
  monthBarLabel: {
    ...type.bodySmall,
    color: text.muted,
    marginTop: 6,
    fontSize: 11,
  },
  monthBarScore: {
    ...type.bodySmall,
    color: text.secondary,
    fontSize: 10,
    marginTop: 2,
  },

  emptyLeaderboard: {
    ...type.bodySmall,
    color: text.secondary,
    paddingVertical: spacing.stackLg,
    lineHeight: 22,
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: surface.elevated,
  },
  leaderRank: {
    width: 28,
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: text.secondary,
  },
  leaderBody: { flex: 1 },
  leaderName: { ...type.body, fontFamily: fonts.bodyMedium, color: text.primary },
  leaderNameWarning: { color: "#ef4444" },
  leaderMeta: { ...type.bodySmall, color: text.secondary, marginTop: 2 },
  leaderWarning: { ...type.bodySmall, color: "#ef4444" },
  leaderReduction: {
    ...type.bodySmall,
    fontFamily: fonts.bodyMedium,
    color: semantic.success,
    marginRight: 4,
  },
  leaderReductionWorse: { color: "#ef4444" },

  medicalBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: surface.elevated,
    padding: spacing.cardPadding,
    borderRadius: radius.card,
    marginBottom: spacing.sectionGap,
  },
  medicalText: {
    flex: 1,
    ...type.bodySmall,
    color: text.secondary,
  },

  epworthCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: background.primary,
    borderColor: accent.tealGlow,
  },
  epworthCardText: { flex: 1, marginLeft: 12 },
  epworthCardTitle: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: text.primary,
  },
  epworthCardSub: {
    ...type.bodySmall,
    color: text.secondary,
    marginTop: 2,
  },
});
