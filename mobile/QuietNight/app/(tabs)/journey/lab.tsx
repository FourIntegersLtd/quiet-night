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
  MOCK_NEXT_REMEDIES,
  getRemedyLabel,
} from "@/data/mock-journey";

export default function ExperimentLabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const alertApi = useAlert();
  const experimentLabel = MOCK_CURRENT_EXPERIMENT
    ? getRemedyLabel(MOCK_CURRENT_EXPERIMENT.remedy_type)
    : "Current test";
  const { completed, total } = MOCK_EXPERIMENT_NIGHTS;
  const obj = MOCK_LAB_OBJECTIVE;
  const sub = MOCK_LAB_SUBJECTIVE;

  const handleStartTest = (remedyLabel: string) => {
    alertApi.show({
      title: "Start 7-Day Test",
      message: `"${remedyLabel}" will be set as your next experiment. (Backend integration coming soon.)`,
      buttons: [{ text: "OK" }],
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

      {/* Next Move carousel */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What's our next test?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carousel}
        >
          {MOCK_NEXT_REMEDIES.map((r) => (
            <View key={r.remedy_type} style={styles.remedyCard}>
              <Text style={styles.remedyLabel}>{r.label}</Text>
              <Text style={styles.remedyDesc}>{r.description}</Text>
              <TouchableOpacity
                style={styles.startTestButton}
                onPress={() => handleStartTest(r.label)}
                activeOpacity={0.8}
              >
                <Text style={styles.startTestButtonText}>Start 7-Day Test</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
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
