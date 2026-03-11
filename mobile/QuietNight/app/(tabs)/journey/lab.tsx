import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAlert } from "@/contexts/AlertContext";
import {
  accent,
  background,
  text,
  spacing,
  radius,
  presets,
  type,
  fonts,
} from "@/constants/theme";
import {
  MOCK_CURRENT_EXPERIMENT,
  MOCK_EXPERIMENT_NIGHTS,
  MOCK_LAB_OBJECTIVE,
  MOCK_LAB_SUBJECTIVE,
  getRemedyLabel,
} from "@/data/mock-journey";
import type { RemedyType } from "@/types";
import { getRecommendationNext } from "@/lib/api";

const FALLBACK_NEXT: { remedy_type: RemedyType; label: string; reason: string }[] = [
  { remedy_type: "NASAL_STRIPS", label: "Nasal strips", reason: "A common first step to open nasal passages." },
  { remedy_type: "SIDE_SLEEPING", label: "Side sleeping", reason: "Positional change helps many people." },
];

export default function ExperimentLabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const alertApi = useAlert();
  const [recommendation, setRecommendation] = useState<{
    suggested_remedy: string | null;
    reason: string;
    alternatives: { remedy: string; reason: string }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      getRecommendationNext().then((res) => {
        if (cancelled) return;
        setLoading(false);
        if (res.data) setRecommendation(res.data);
        else setRecommendation(null);
      });
      return () => { cancelled = true; };
    }, []),
  );

  const experimentLabel = MOCK_CURRENT_EXPERIMENT
    ? getRemedyLabel(MOCK_CURRENT_EXPERIMENT.remedy_type)
    : "Current test";
  const { completed, total } = MOCK_EXPERIMENT_NIGHTS;
  const obj = MOCK_LAB_OBJECTIVE;
  const sub = MOCK_LAB_SUBJECTIVE;

  const handleTryNext = (remedyType: string) => {
    router.push({
      pathname: "/(tabs)/tonight",
      params: { remedy: remedyType },
    });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.stackSm }]}
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.subtitle}>
        {experimentLabel} — {completed}/{total} nights
      </Text>

      {/* Results Matrix */}
      <View style={styles.matrixRow}>
        <View style={[styles.matrixCard, presets.cardExperiment]}>
          <Text style={styles.matrixLabel}>OBJECTIVE</Text>
          <Text style={styles.matrixTitle}>Sleeper</Text>
          <Text style={styles.matrixValue}>
            Volume ↓ {Math.abs(obj.volumeDeltaPercent)}%
          </Text>
          <Text style={styles.matrixValue}>
            Duration ↓ {Math.abs(obj.durationDeltaPercent)}%
          </Text>
        </View>
        <View style={[styles.matrixCard, styles.matrixCardPartner]}>
          <Text style={[styles.matrixLabel, { color: accent.teal }]}>
            SUBJECTIVE
          </Text>
          <Text style={styles.matrixTitle}>Partner</Text>
          <Text style={styles.matrixValue}>
            Disturbance {sub.disturbanceBefore} → {sub.disturbanceAfter}
          </Text>
          <Text style={styles.matrixValue}>
            Left room: {sub.leftRoomCount} times
          </Text>
        </View>
      </View>

      {/* Next Move carousel — from recommendation API (triggered at session end; also fetched here) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What's our next test?</Text>
        {loading ? (
          <View style={styles.remedyCard}>
            <ActivityIndicator size="small" color={accent.teal} />
            <Text style={styles.remedyDesc}>Loading suggestion…</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {recommendation ? (
              <>
                <View key={recommendation.suggested_remedy ?? "all-tried"} style={styles.remedyCard}>
                  {recommendation.suggested_remedy ? (
                    <>
                      <Text style={styles.remedyLabel}>
                        {getRemedyLabel(recommendation.suggested_remedy as RemedyType)}
                      </Text>
                      <Text style={styles.remedyDesc}>{recommendation.reason}</Text>
                      <TouchableOpacity
                        style={styles.startTestButton}
                        onPress={() => handleTryNext(recommendation.suggested_remedy!)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.startTestButtonText}>Try tonight</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <Text style={styles.remedyLabel}>You&apos;ve tried them all</Text>
                      <Text style={styles.remedyDesc}>{recommendation.reason}</Text>
                    </>
                  )}
                </View>
                {recommendation.suggested_remedy && recommendation.alternatives?.slice(0, 2).map((alt) => (
                  <View key={alt.remedy} style={styles.remedyCard}>
                    <Text style={styles.remedyLabel}>{getRemedyLabel(alt.remedy as RemedyType)}</Text>
                    <Text style={styles.remedyDesc}>{alt.reason}</Text>
                    <TouchableOpacity
                      style={styles.startTestButton}
                      onPress={() => handleTryNext(alt.remedy)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.startTestButtonText}>Try tonight</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            ) : (
              FALLBACK_NEXT.map((r) => (
                <View key={r.remedy_type} style={styles.remedyCard}>
                  <Text style={styles.remedyLabel}>{r.label}</Text>
                  <Text style={styles.remedyDesc}>{r.reason}</Text>
                  <TouchableOpacity
                    style={styles.startTestButton}
                    onPress={() => handleTryNext(r.remedy_type)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.startTestButtonText}>Try tonight</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Epworth link */}
      <TouchableOpacity
        style={styles.epworthLink}
        onPress={() => router.push("/(tabs)/journey/epworth")}
        activeOpacity={0.8}
      >
        <Ionicons name="fitness" size={20} color={accent.teal} />
        <Text style={styles.epworthLinkText}>Check your daytime energy</Text>
        <Ionicons name="chevron-forward" size={18} color={text.muted} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.primary },
  content: {
    flexGrow: 1,
    padding: spacing.screenPadding,
    paddingBottom: spacing.sectionGapLarge * 2,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.stackMd,
  },
  backText: {
    color: accent.teal,
    fontSize: 15,
    marginLeft: 4,
    fontFamily: fonts.bodyMedium,
  },
  title: {
    ...type.title,
    color: text.primary,
    marginBottom: 4,
  },
  subtitle: {
    ...type.body,
    color: text.secondary,
    marginTop: spacing.stackSm,
    marginBottom: spacing.sectionGap,
  },
  matrixRow: {
    flexDirection: "row",
    gap: spacing.stackMd,
    marginBottom: spacing.sectionGapLarge,
  },
  matrixCard: {
    flex: 1,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
  },
  matrixCardPartner: {
    backgroundColor: accent.tealSoft,
    borderColor: accent.tealGlow,
  },
  matrixLabel: {
    ...type.label,
    color: accent.teal,
    letterSpacing: 1,
    marginBottom: 4,
  },
  matrixTitle: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: text.primary,
    marginBottom: 8,
  },
  matrixValue: {
    ...type.bodySmall,
    color: text.primary,
    marginBottom: 2,
  },
  section: { marginBottom: spacing.sectionGap },
  sectionTitle: {
    ...type.titleCard,
    color: text.primary,
    marginBottom: spacing.stackMd,
  },
  carousel: {
    paddingRight: spacing.screenPadding,
    gap: spacing.stackMd,
  },
  remedyCard: {
    width: 160,
    backgroundColor: background.secondary,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    borderWidth: 1,
    borderColor: accent.tealGlow,
  },
  remedyLabel: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: text.primary,
    marginBottom: 4,
  },
  remedyDesc: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: 12,
  },
  startTestButton: {
    backgroundColor: accent.teal,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.button,
    alignItems: "center",
  },
  startTestButtonText: {
    ...type.button,
    fontSize: 13,
    color: background.primary,
  },
  epworthLink: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.cardPadding,
    backgroundColor: background.secondary,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: accent.tealGlow,
    gap: 10,
  },
  epworthLinkText: {
    flex: 1,
    ...type.body,
    color: text.primary,
  },
});
