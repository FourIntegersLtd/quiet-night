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

import { getNightSnores, getNightTimeStats } from "@/lib/nights";
import { formatTime, formatDateFromKey } from "@/lib/formatters";
import type { SnoreEvent } from "@/types";
import {
  background,
  accent,
  text,
  surface,
  radius,
  spacing,
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

export default function NightDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playerSource, setPlayerSource] = useState<string | null>(null);

  const nightKey = typeof key === "string" ? key : key?.[0] ?? "";
  const snoreList = useMemo((): SnoreEvent[] => {
    if (!nightKey) return [];
    return getNightSnores(nightKey);
  }, [nightKey]);

  const timeStats = useMemo(() => getNightTimeStats(nightKey), [nightKey]);

  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
    });
  }, []);

  const player = useAudioPlayer(playerSource ? { uri: playerSource } : null);

  const snoresByHour = useMemo(() => {
    const byHour: Record<number, number> = {};
    snoreList.forEach((s) => {
      const h = new Date(s.timestamp * 1000).getHours();
      byHour[h] = (byHour[h] ?? 0) + 1;
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
    return { byHour, max, range };
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
    (uri: string, id: string) => {
      if (playingId === id) {
        try { player.pause(); } catch {}
        setPlayingId(null);
        return;
      }
      shouldAutoPlay.current = true;
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
        onPress={() => router.back()}
      >
        <Ionicons name="chevron-back" size={24} color={accent.teal} />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{formatDateFromKey(nightKey)}</Text>
      <Text style={styles.subtitle}>
        {snoreList.length} {snoreList.length === 1 ? "snore" : "snores"} recorded
      </Text>

      {/* Time in bed, time snoring, pie chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Time in bed</Text>
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
            <View style={styles.barRow}>
              {snoresByHour.range.map((h) => {
                const count = snoresByHour.byHour[h] ?? 0;
                const height = count > 0 ? (count / snoresByHour.max) * 80 : 0;
                const label = h < 12 ? `${h === 0 ? 12 : h}am` : `${h === 12 ? 12 : h - 12}pm`;
                return (
                  <View key={h} style={styles.barCol}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: Math.max(count > 0 ? 8 : 2, height),
                          backgroundColor: count > 0 ? accent.teal : surface.elevated,
                        },
                      ]}
                    />
                    <Text style={styles.barLabel}>{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Playback</Text>
            <Text style={styles.playbackHint}>
              % = how confident the app was that each clip was snoring
            </Text>
            {snoreList.map((s) => (
              <View key={s.id} style={styles.snoreRow}>
                <Text style={styles.snoreTime}>{formatTime(s.timestamp)}</Text>
                <Text style={styles.snoreConf}>
                  {(s.confidence * 100).toFixed(0)}%
                </Text>
                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={() => playSnippet(s.audioFileUri, s.id)}
                >
                  <Ionicons
                    name={playingId === s.id ? "pause" : "play"}
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
    marginBottom: spacing.sectionGapLarge,
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
  snoreConf: {
    color: text.secondary,
    fontSize: 13,
    marginRight: 12,
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
