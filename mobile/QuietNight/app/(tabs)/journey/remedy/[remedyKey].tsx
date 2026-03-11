import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
import { getRemedyDetail } from "@/lib/journey-data";
import { getNightVerdict } from "@/lib/api";
import type { RemedyType } from "@/types";

type VerdictState = {
  verdict: string;
  reason: string;
  suggestNext: string | null;
};

export default function RemedyDetailScreen() {
  const router = useRouter();
  const { remedyKey } = useLocalSearchParams<{ remedyKey: string }>();
  const detail = remedyKey ? getRemedyDetail(remedyKey as RemedyType) : null;
  const [verdicts, setVerdicts] = useState<Record<string, VerdictState>>({});
  const [verdictsLoading, setVerdictsLoading] = useState(true);

  useEffect(() => {
    if (!detail?.nightsDetail.length) {
      setVerdictsLoading(false);
      return;
    }
    let cancelled = false;
    setVerdictsLoading(true);
    const nightKeyParam = (key: string) =>
      key.startsWith("night_") ? key : `night_${key}`;
    Promise.all(
      detail.nightsDetail.map((night) =>
        getNightVerdict(nightKeyParam(night.nightKey)).then(({ data }) => ({
          key: night.nightKey,
          data,
        }))
      )
    ).then((results) => {
      if (cancelled) return;
      const map: Record<string, VerdictState> = {};
      results.forEach(({ key, data }) => {
        if (data)
          map[key] = {
            verdict: data.verdict,
            reason: data.reason,
            suggestNext: data.suggest_next ?? null,
          };
      });
      setVerdicts(map);
      setVerdictsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [remedyKey, detail?.nightsDetail.length]);

  if (!detail) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>No data for this experiment.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.title}>{detail.remedyLabel}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nights recorded</Text>
          <Text style={styles.value}>{detail.nights}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Avg loud snoring</Text>
          <Text style={styles.value}>{detail.avgMins} min</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total snore events</Text>
          <Text style={styles.value}>{detail.totalSnoreEvents}</Text>
        </View>
        {detail.nights > 1 && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Best night</Text>
              <Text style={[styles.value, styles.valueSuccess]}>{detail.bestNightMins} min</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Worst night</Text>
              <Text style={[styles.value, styles.valueWorse]}>{detail.worstNightMins} min</Text>
            </View>
          </>
        )}
        {detail.baselineAvg != null && detail.remedyKey !== "BASELINE" && (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Your baseline avg</Text>
              <Text style={styles.value}>{detail.baselineAvg} min</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Change vs baseline</Text>
              <Text
                style={[
                  styles.value,
                  detail.reduction != null && detail.reduction > 0 && styles.valueSuccess,
                  detail.reduction != null && detail.reduction < 0 && styles.valueWorse,
                ]}
              >
                {detail.reduction != null
                  ? `${detail.reduction > 0 ? "−" : ""}${detail.reduction}%`
                  : "—"}
              </Text>
            </View>
          </>
        )}
      </View>

      {detail.isWarning && (
        <View style={styles.warningCard}>
          <Ionicons name="information-circle" size={22} color={accent.primary} />
          <Text style={styles.warningText}>
            One night isn&apos;t enough to conclude. Try 2–3 more nights with this remedy to see a
            clearer trend. A single bad night can skew the percentage.
          </Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>What does &quot;change vs baseline&quot; mean?</Text>
        <Text style={styles.explainText}>
          We compare your average snoring minutes on this remedy to your baseline (nights with no
          remedy). A positive reduction means less snoring; a negative number means more snoring
          than your baseline. The more nights you record, the more reliable the comparison.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Night by night</Text>
        {verdictsLoading && (
          <View style={styles.verdictLoading}>
            <ActivityIndicator size="small" color={accent.primary} />
            <Text style={styles.verdictLoadingText}>Loading verdicts…</Text>
          </View>
        )}
        {detail.nightsDetail.map((night) => {
          const verdict = verdicts[night.nightKey];
          return (
            <View key={night.nightKey} style={styles.nightBlock}>
              <View style={styles.nightRow}>
                <Text style={styles.nightDate}>{night.dateLabel}</Text>
                <Text style={styles.nightMins}>{night.loudMins} min</Text>
              </View>
              <View style={styles.nightMeta}>
                {night.totalMinutes > 0 && (
                  <Text style={styles.nightMetaText}>{night.totalMinutes} min in bed</Text>
                )}
                {night.eventCount > 0 && (
                  <Text style={styles.nightMetaText}>{night.eventCount} snore events</Text>
                )}
                {night.partnerReport && (
                  <Text
                    style={[
                      styles.nightMetaText,
                      night.partnerReport === "good" ? styles.partnerGood : styles.partnerBad,
                    ]}
                  >
                    Partner: {night.partnerReport === "good" ? "slept well" : "exhausted"}
                  </Text>
                )}
              </View>
              {verdict && (
                <View style={styles.verdictBlock}>
                  <View
                    style={[
                      styles.verdictBadge,
                      verdict.verdict === "worked" && styles.verdictWorked,
                      verdict.verdict === "didnt_work" && styles.verdictDidntWork,
                      verdict.verdict === "unclear" && styles.verdictUnclear,
                    ]}
                  >
                    <Text style={styles.verdictBadgeText}>
                      {verdict.verdict === "worked"
                        ? "Worked"
                        : verdict.verdict === "didnt_work"
                          ? "Didn't work"
                          : "Unclear"}
                    </Text>
                  </View>
                  <Text style={styles.verdictReason}>{verdict.reason}</Text>
                  {verdict.suggestNext && (
                    <Text style={styles.verdictSuggest}>Try next: {verdict.suggestNext}</Text>
                  )}
                </View>
              )}
              <TouchableOpacity
                style={styles.viewNightLink}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/nights/[key]",
                    params: { key: night.nightKey },
                  })
                }
                activeOpacity={0.8}
              >
                <Text style={styles.viewNightLinkText}>View night</Text>
                <Ionicons name="chevron-forward" size={16} color={accent.teal} />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.primary },
  content: {
    padding: spacing.screenPadding,
    paddingBottom: spacing.sectionGapLarge * 2,
  },
  empty: {
    ...type.body,
    color: text.secondary,
    padding: spacing.screenPadding,
  },
  title: {
    ...type.title,
    color: text.primary,
    marginBottom: spacing.sectionGap,
  },
  card: {
    backgroundColor: background.secondary,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.sectionGap,
    borderWidth: 1,
    borderColor: surface.elevated,
  },
  cardTitle: {
    ...type.titleCard,
    color: text.primary,
    marginBottom: spacing.stackMd,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.stackSm,
    borderBottomWidth: 1,
    borderBottomColor: surface.elevated,
  },
  label: { ...type.bodySmall, color: text.secondary },
  value: { ...type.body, fontFamily: fonts.bodyMedium, color: text.primary },
  valueSuccess: { color: semantic.success },
  valueWorse: { color: "#ef4444" },
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    backgroundColor: accent.tealSoft + "40",
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.sectionGap,
    borderWidth: 1,
    borderColor: accent.tealGlow,
  },
  warningText: {
    ...type.bodySmall,
    color: text.primary,
    flex: 1,
    lineHeight: 20,
  },
  explainText: {
    ...type.bodySmall,
    color: text.secondary,
    lineHeight: 22,
  },
  nightBlock: {
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: surface.elevated,
  },
  nightRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  nightDate: { ...type.bodySmall, color: text.secondary },
  nightMins: { ...type.bodySmall, fontFamily: fonts.bodyMedium, color: text.primary },
  nightMeta: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: 4 },
  nightMetaText: { ...type.bodySmall, color: text.muted },
  partnerGood: { color: semantic.success },
  partnerBad: { color: "#ef4444" },
  verdictLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.stackSm,
  },
  verdictLoadingText: { ...type.bodySmall, color: text.secondary },
  verdictBlock: { marginTop: spacing.stackSm },
  verdictBadge: {
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: radius.button,
    marginBottom: 4,
  },
  verdictBadgeText: { ...type.bodySmall, fontFamily: fonts.bodyMedium, color: background.primary },
  verdictWorked: { backgroundColor: semantic.success },
  verdictDidntWork: { backgroundColor: "#ef4444" },
  verdictUnclear: { backgroundColor: text.muted },
  verdictReason: { ...type.bodySmall, color: text.secondary, lineHeight: 20, marginBottom: 2 },
  verdictSuggest: { ...type.bodySmall, color: accent.teal, fontFamily: fonts.bodyMedium },
  viewNightLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginTop: spacing.stackSm,
  },
  viewNightLinkText: { ...type.bodySmall, fontFamily: fonts.bodyMedium, color: accent.teal },
});
