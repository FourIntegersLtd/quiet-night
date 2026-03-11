import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import {
  getNightSnores,
  getNightTimeStats,
  getNightFactors,
  getNightRemedy,
  getNightPartnerData,
} from "@/lib/nights";
import { getNightVerdict, type NightVerdictResponse } from "@/lib/api";
import { formatTime, formatTimeShort, formatDateFromKey } from "@/lib/formatters";
import { useAuth } from "@/contexts/AuthContext";
import type { SnoreEvent, RemedyType } from "@/types";
import { getRemedyLabel } from "@/data/mock-journey";
import {
  background,
  accent,
  text,
  surface,
  radius,
  spacing,
  type,
  fonts,
  semantic,
} from "@/constants/theme";

const PIE_SIZE = 140;
const PIE_R = PIE_SIZE / 2;

function formatDuration(totalMinutes: number): string {
  if (totalMinutes < 60) return `${totalMinutes} m`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m > 0 ? `${h} h ${m} m` : `${h} h`;
}

function PieChart({
  snoringPercent,
  teal,
  muted,
}: {
  snoringPercent: number;
  teal: string;
  muted: string;
}) {
  const pct = Math.min(100, Math.max(0, snoringPercent)) / 100;
  const cx = PIE_R;
  const cy = PIE_R;
  const startX = cx + PIE_R;
  const startY = cy;
  let snoringPath = "";
  let quietPath = "";
  if (pct <= 0) {
    quietPath = `M ${cx} ${cy} L ${startX} ${startY} A ${PIE_R} ${PIE_R} 0 1 1 ${startX - 0.01} ${startY} Z`;
  } else if (pct >= 1) {
    snoringPath = `M ${cx} ${cy} L ${startX} ${startY} A ${PIE_R} ${PIE_R} 0 1 1 ${startX - 0.01} ${startY} Z`;
  } else {
    const angleRad = (pct * 360 * Math.PI) / 180;
    const endX = cx + PIE_R * Math.cos(angleRad);
    const endY = cy + PIE_R * Math.sin(angleRad);
    const largeArc = pct > 0.5 ? 1 : 0;
    snoringPath = `M ${cx} ${cy} L ${startX} ${startY} A ${PIE_R} ${PIE_R} 0 ${largeArc} 1 ${endX} ${endY} Z`;
    quietPath = `M ${cx} ${cy} L ${endX} ${endY} A ${PIE_R} ${PIE_R} 0 ${pct > 0.5 ? 0 : 1} 1 ${startX} ${startY} Z`;
  }
  return (
    <Svg width={PIE_SIZE} height={PIE_SIZE} viewBox={`0 0 ${PIE_SIZE} ${PIE_SIZE}`}>
      {quietPath ? <Path d={quietPath} fill={muted} /> : null}
      {snoringPath ? <Path d={snoringPath} fill={teal} /> : null}
    </Svg>
  );
}

const ROOM_LABELS: Record<string, string> = {
  quiet: "Quiet",
  moderate: "Moderate noise",
  loud: "Loud",
  error: "Not measured",
};

export default function NightDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playerSource, setPlayerSource] = useState<string | null>(null);
  const [playingHour, setPlayingHour] = useState<number | null>(null);

  const { user } = useAuth();
  const nightKey = typeof key === "string" ? key : key?.[0] ?? "";
  const partnerData = useMemo(() => {
    const real = getNightPartnerData(nightKey);
    if (real) return real;
    if (__DEV__) return { report: "good" as const, note: "Slept well. No wake-ups." };
    return null;
  }, [nightKey]);
  const partnerName = (user?.partner_name ?? "").trim() || "Partner";
  const partnerQuote = partnerData
    ? (partnerData.note?.trim() ||
        (partnerData.report === "good" ? "Slept well." : "Woke up tired. Feeling exhausted."))
    : "";
  const snoreList = useMemo((): SnoreEvent[] => {
    if (!nightKey) return [];
    return getNightSnores(nightKey);
  }, [nightKey]);

  const timeStats = useMemo(() => getNightTimeStats(nightKey), [nightKey]);
  const factors = useMemo(() => (nightKey ? getNightFactors(nightKey) : null), [nightKey]);
  const remedies = useMemo(() => (nightKey ? getNightRemedy(nightKey) : []), [nightKey]);

  const [verdictData, setVerdictData] = useState<NightVerdictResponse | null>(null);
  const [verdictLoading, setVerdictLoading] = useState(true);
  useEffect(() => {
    if (!nightKey) {
      setVerdictData(null);
      setVerdictLoading(false);
      return;
    }
    setVerdictLoading(true);
    getNightVerdict(nightKey).then((res) => {
      setVerdictData(res.data ?? null);
      setVerdictLoading(false);
    });
  }, [nightKey]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    });
  }, []);

  const player = useAudioPlayer(playerSource ? { uri: playerSource } : null);

  // Snore clips are often quiet; use full volume for playback
  useEffect(() => {
    if (player && playerSource) {
      try {
        player.volume = 1.0;
      } catch {}
    }
  }, [player, playerSource]);

  const EPISODE_GAP_MINUTES = 5;

  const snoresByHour = useMemo(() => {
    const byHour: Record<number, number> = {};
    const eventsByHour: Record<number, SnoreEvent[]> = {};
    snoreList.forEach((s) => {
      const h = new Date(s.timestamp * 1000).getHours();
      byHour[h] = (byHour[h] ?? 0) + 1;
      if (!eventsByHour[h]) eventsByHour[h] = [];
      eventsByHour[h].push(s);
    });
    const hours = Object.keys(byHour).map(Number).sort((a, b) => a - b);
    let startHour = hours[0] ?? 22;
    let endHour = hours[hours.length - 1] ?? 6;
    if (startHour > 12) startHour = Math.max(startHour - 1, 0);
    if (endHour < 12) endHour = Math.min(endHour + 1, 23);
    const range: number[] = [];
    let h = startHour;
    while (true) {
      range.push(h);
      if (h === endHour) break;
      h = (h + 1) % 24;
    }
    if (range.length < 4) {
      while (range.length < 6) {
        const prev = (range[0] - 1 + 24) % 24;
        range.unshift(prev);
      }
    }
    const max = Math.max(1, ...Object.values(byHour));
    const peakHour = range.reduce((best, hr) => ((byHour[hr] ?? 0) >= (byHour[best] ?? 0) ? hr : best), range[0] ?? 0);
    const fmt = (hr: number) => (hr === 0 ? "12am" : hr === 12 ? "12pm" : hr < 12 ? `${hr}am` : `${hr - 12}pm`);
    const peakLabel = range.length ? `${fmt(peakHour)}–${fmt((peakHour + 1) % 24)}` : "—";
    return { byHour, max, range, eventsByHour, peakLabel };
  }, [snoreList]);

  /** Episodes: consecutive snores with gap ≤ 5 min. One row per episode instead of 78 rows. */
  const episodes = useMemo(() => {
    if (snoreList.length === 0) return [];
    const sorted = [...snoreList].sort((a, b) => a.timestamp - b.timestamp);
    const out: { startTs: number; endTs: number; events: SnoreEvent[]; sample: SnoreEvent }[] = [];
    let current: SnoreEvent[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].timestamp;
      const curr = sorted[i].timestamp;
      if (curr - prev <= EPISODE_GAP_MINUTES * 60) {
        current.push(sorted[i]);
      } else {
        const startTs = current[0].timestamp;
        const endTs = current[current.length - 1].timestamp;
        const sample = current.reduce((best, s) => (s.confidence >= (best?.confidence ?? 0) ? s : best), current[0]);
        out.push({ startTs, endTs, events: current, sample });
        current = [sorted[i]];
      }
    }
    const startTs = current[0].timestamp;
    const endTs = current[current.length - 1].timestamp;
    const sample = current.reduce((best, s) => (s.confidence >= (best?.confidence ?? 0) ? s : best), current[0]);
    out.push({ startTs, endTs, events: current, sample });
    return out;
  }, [snoreList]);

  const shouldAutoPlay = useRef(false);

  useEffect(() => {
    if (shouldAutoPlay.current && player && playerSource) {
      shouldAutoPlay.current = false;
      try {
        player.seekTo(0);
        player.play();
      } catch {
        setPlayingId(null);
      }
    }
  }, [player, playerSource]);

  const playSnippet = useCallback(
    (uri: string, id: string, hour: number | null = null) => {
      if (playingId === id) {
        try { player.pause(); } catch {}
        setPlayingId(null);
        setPlayingHour(null);
        return;
      }
      shouldAutoPlay.current = true;
      setPlayingHour(hour);
      if (playerSource === uri) {
        try {
          player.seekTo(0);
          player.play();
          shouldAutoPlay.current = false;
        } catch {}
      } else {
        setPlayerSource(uri);
      }
      setPlayingId(id);
    },
    [playingId, player, playerSource]
  );

  if (!nightKey) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Invalid night</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.link}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => router.replace("/(tabs)/nights")}
      >
        <Ionicons name="chevron-back" size={24} color={accent.teal} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{formatDateFromKey(nightKey)}</Text>
      <Text style={styles.subtitle}>
        {snoreList.length} {snoreList.length === 1 ? "snore" : "snores"} recorded
        {snoreList.length > 0 && snoresByHour.peakLabel !== "—"
          ? ` · Peak ${snoresByHour.peakLabel}`
          : ""}
      </Text>

      {/* Partner's check-in for this night */}
      {partnerData && (
        <View style={[styles.card, styles.partnerCard]}>
          <View style={styles.partnerHeader}>
            <View style={styles.partnerAvatar}>
              <Text style={styles.partnerAvatarText}>{partnerName.slice(0, 1)}</Text>
            </View>
            <View style={styles.partnerHeaderText}>
              <Text style={styles.partnerTitle}>{partnerName}&apos;s check-in</Text>
              <Text style={styles.partnerQuote}>
                &quot;{partnerQuote}&quot;
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Experiment verdict: from backend (source of truth), fetched when opening night detail */}
      {verdictLoading && (remedies.length > 0 || timeStats.snoringMinutes > 0) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experiment verdict</Text>
          <View style={[styles.card, styles.verdictCard]}>
            <Text style={styles.verdictReason}>Loading…</Text>
          </View>
        </View>
      ) : verdictData && (remedies.length > 0 || timeStats.snoringMinutes > 0) ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experiment verdict</Text>
          <View style={[styles.card, styles.verdictCard]}>
            <View style={styles.verdictRow}>
              <Text style={styles.verdictLabel}>Did it work?</Text>
              <View
                style={[
                  styles.verdictBadge,
                  verdictData.verdict === "worked" && styles.verdictBadgeWorked,
                  verdictData.verdict === "didnt_work" && styles.verdictBadgeDidnt,
                ]}
              >
                <Text
                  style={[
                    styles.verdictBadgeText,
                    verdictData.verdict === "worked" && styles.verdictBadgeTextWorked,
                    verdictData.verdict === "didnt_work" && styles.verdictBadgeTextDidnt,
                  ]}
                >
                  {verdictData.verdict === "worked"
                    ? "Worked"
                    : verdictData.verdict === "didnt_work"
                      ? "Didn't work"
                      : "Unclear"}
                </Text>
              </View>
            </View>
            <Text style={styles.verdictReason}>{verdictData.reason}</Text>
            {(verdictData.suggest_next || verdictData.suggest_next_reason) && (
              verdictData.suggest_next ? (
                <TouchableOpacity
                  style={styles.suggestNextRow}
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/tonight",
                      params: { remedy: verdictData.suggest_next ?? undefined },
                    })
                  }
                  activeOpacity={0.8}
                >
                  <Text style={styles.suggestNextLabel}>What to try next:</Text>
                  <Text style={styles.suggestNextRemedy}>
                    {getRemedyLabel(verdictData.suggest_next as RemedyType)}
                  </Text>
                  {verdictData.suggest_next_reason ? (
                    <Text style={styles.suggestNextReason}>{verdictData.suggest_next_reason}</Text>
                  ) : null}
                </TouchableOpacity>
              ) : (
                <View style={styles.suggestNextRow}>
                  <Text style={styles.suggestNextLabel}>What to try next:</Text>
                  {verdictData.suggest_next_reason ? (
                    <Text style={styles.suggestNextReason}>{verdictData.suggest_next_reason}</Text>
                  ) : null}
                </View>
              )
            )}
          </View>
        </View>
      ) : null}

      {/* Setup: what we tested (baseline, remedies, factors) */}
      {(factors?.room_result || remedies.length > 0 || factors) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Setup</Text>
          <View style={styles.setupCard}>
            {factors?.room_result && (
              <Text style={styles.setupRow}>
                Room: {ROOM_LABELS[factors.room_result] ?? factors.room_result}
              </Text>
            )}
            {remedies.length > 0 && (
              <Text style={styles.setupRow}>
                Remedies: {remedies.join(", ").replace(/_/g, " ")}
              </Text>
            )}
            {factors && (
              <>
                <Text style={styles.setupRow}>
                  Alcohol: {(factors.alcohol_level ?? "NONE").replace(/_/g, " ")}, Congestion:{" "}
                  {(factors.congestion_level ?? "CLEAR").replace(/_/g, " ")}
                </Text>
                {(factors.wind_down_minutes != null && factors.wind_down_minutes > 0) ||
                (factors.sleep_sound && factors.sleep_sound !== "none") ? (
                  <Text style={styles.setupRow}>
                    {factors.wind_down_minutes
                      ? `Wind-down: ${factors.wind_down_minutes} min`
                      : ""}
                    {factors.wind_down_minutes && factors.sleep_sound && factors.sleep_sound !== "none"
                      ? " · "
                      : ""}
                    {factors.sleep_sound && factors.sleep_sound !== "none"
                      ? `Sound: ${factors.sleep_sound}`
                      : ""}
                  </Text>
                ) : null}
              </>
            )}
          </View>
        </View>
      )}

      {/* Time in bed, time snoring, pie chart */}
      <View style={styles.section}>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Total time in bed</Text>
          <Text style={styles.timeValue}>
            {timeStats.totalMinutes > 0
              ? formatDuration(timeStats.totalMinutes)
              : "—"}
          </Text>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeLabel}>Time snoring</Text>
          <Text style={styles.timeValue}>
            {timeStats.snoringMinutes > 0
              ? `${timeStats.snoringMinutes} m`
              : "0 m"}
          </Text>
        </View>
        {timeStats.totalMinutes > 0 && (
          <View style={styles.pieRow}>
            <PieChart
              snoringPercent={timeStats.snoringPercent}
              teal={accent.teal}
              muted={text.muted}
            />
            <View style={styles.pieLegend}>
              <View style={styles.pieLegendRow}>
                <View style={[styles.pieSwatch, { backgroundColor: accent.teal }]} />
                <Text style={styles.pieLegendText}>
                  Snoring {timeStats.snoringPercent.toFixed(1)}%
                </Text>
              </View>
              <View style={styles.pieLegendRow}>
                <View style={[styles.pieSwatch, { backgroundColor: text.muted }]} />
                <Text style={styles.pieLegendText}>
                  Quiet {(100 - timeStats.snoringPercent).toFixed(1)}%
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {snoreList.length > 0 && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Snore timeline</Text>
            <Text style={styles.playbackHint}>
              Tap a bar to hear a sample from that hour.
            </Text>
            <View style={styles.barRow}>
              {snoresByHour.range.map((h) => {
                const count = snoresByHour.byHour[h] ?? 0;
                const events = snoresByHour.eventsByHour[h] ?? [];
                const sample = events.length > 0
                  ? events.reduce((best, s) => (s.confidence >= (best?.confidence ?? 0) ? s : best), events[0])
                  : null;
                const height = count > 0 ? (count / snoresByHour.max) * 80 : 0;
                const label = h < 12 ? `${h === 0 ? 12 : h}am` : `${h === 12 ? 12 : h - 12}pm`;
                const isPlaying = playingHour === h && sample && playingId === sample.id;
                return (
                  <TouchableOpacity
                    key={h}
                    style={styles.barCol}
                    onPress={() => sample && playSnippet(sample.audioFileUri, sample.id, h)}
                    disabled={!sample}
                    activeOpacity={sample ? 0.7 : 1}
                  >
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(count > 0 ? 8 : 2, height),
                          backgroundColor: count > 0 ? accent.teal : surface.elevated,
                          opacity: sample ? 1 : 0.6,
                        },
                        isPlaying && styles.barPlaying,
                      ]}
                    />
                    <Text style={styles.barLabel}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Listen</Text>
            <Text style={styles.playbackHint}>
              {snoreList.length} clips in {episodes.length} {episodes.length === 1 ? "episode" : "episodes"}. Tap a bar above or play an episode below.
            </Text>
            {episodes.map((ep, idx) => (
              <View key={idx} style={styles.snoreRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.snoreTime}>
                    {formatTimeShort(ep.startTs)}–{formatTimeShort(ep.endTs)}
                  </Text>
                  <Text style={styles.snoreTimeSub}>
                    {ep.events.length} {ep.events.length === 1 ? "snore" : "snores"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={() => playSnippet(ep.sample.audioFileUri, ep.sample.id, null)}
                >
                  <Ionicons
                    name={playingId === ep.sample.id ? "pause" : "play"}
                    size={22}
                    color={accent.teal}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.primary },
  content: {
    flexGrow: 1,
    padding: spacing.screenPadding,
    paddingTop: 10,
    paddingBottom: spacing.sectionGapLarge * 2,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backText: {
    color: accent.teal,
    fontSize: 15,
    marginLeft: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: text.primary,
    marginBottom: 4,
  },
  subtitle: {
    color: text.secondary,
    fontSize: 15,
    marginBottom: spacing.sectionGapLarge,
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
  },
  partnerHeader: {
    flexDirection: "row",
    marginBottom: 0,
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
  verdictCard: {
    backgroundColor: background.secondary,
    borderColor: surface.elevated,
  },
  verdictRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.stackSm,
  },
  verdictLabel: {
    ...type.label,
    color: text.primary,
  },
  verdictBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.button,
    backgroundColor: surface.elevated,
  },
  verdictBadgeWorked: {
    backgroundColor: semantic.successLight ?? semantic.success,
  },
  verdictBadgeDidnt: {
    backgroundColor: semantic.error,
  },
  verdictBadgeText: {
    fontSize: 14,
    fontFamily: fonts.bodyMedium,
    color: text.secondary,
  },
  verdictBadgeTextWorked: {
    color: background.primary,
  },
  verdictBadgeTextDidnt: {
    color: background.primary,
  },
  verdictReason: {
    ...type.bodySmall,
    color: text.secondary,
    lineHeight: 20,
  },
  suggestNextRow: {
    marginTop: spacing.stackMd,
    paddingTop: spacing.stackMd,
    borderTopWidth: 1,
    borderTopColor: surface.elevated,
  },
  suggestNextLabel: {
    ...type.label,
    color: accent.teal,
    marginBottom: 2,
  },
  suggestNextRemedy: {
    fontSize: 16,
    fontFamily: fonts.bodyMedium,
    color: text.primary,
    marginBottom: 4,
  },
  suggestNextReason: {
    ...type.bodySmall,
    color: text.secondary,
    lineHeight: 18,
  },
  section: {
    marginBottom: spacing.sectionGapLarge,
  },
  sectionTitle: {
    color: text.secondary,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  playbackHint: {
    color: text.muted,
    fontSize: 12,
    marginBottom: 12,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
    gap: 2,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  bar: {
    width: "80%",
    backgroundColor: accent.teal,
    borderRadius: 2,
    minHeight: 4,
  },
  barPlaying: {
    borderWidth: 2,
    borderColor: semantic.tealLight,
  },
  barLabel: {
    color: text.muted,
    fontSize: 10,
    marginTop: 4,
  },
  barHint: {
    color: text.muted,
    fontSize: 11,
    marginTop: 8,
  },
  setupCard: {
    backgroundColor: background.secondary,
    padding: 12,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: surface.elevated,
    gap: 6,
  },
  setupRow: {
    color: text.secondary,
    fontSize: 14,
  },
  snoreRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: background.secondary,
    padding: 12,
    borderRadius: radius.button,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: surface.elevated,
  },
  snoreTime: {
    color: text.primary,
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  snoreTimeSub: {
    color: text.muted,
    fontSize: 12,
    marginTop: 2,
  },
  snoreConf: {
    color: text.secondary,
    fontSize: 13,
    marginRight: 12,
  },
  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    marginTop: 8,
  },
  viewAllBtnText: {
    color: accent.teal,
    fontSize: 14,
    fontWeight: "600",
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: surface.elevated,
    justifyContent: "center",
    alignItems: "center",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  timeLabel: { color: text.secondary, fontSize: 15 },
  timeValue: { color: text.primary, fontSize: 15, fontWeight: "600" },
  pieRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 24,
  },
  pieLegend: { gap: 8 },
  pieLegendRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  pieSwatch: { width: 14, height: 14, borderRadius: 4 },
  pieLegendText: { color: text.secondary, fontSize: 14 },
  emptyText: { color: text.secondary, marginBottom: 12 },
  link: { color: accent.teal, fontSize: 15 },
});
