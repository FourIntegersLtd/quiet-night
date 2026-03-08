import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import BedTimeIcon from "@/assets/images/vectors/bed-time.svg";
import {
  background,
  radius,
  spacing,
  text,
  type,
  elevation,
} from "@/constants/theme";

/** Size of the bed-time vector so it reads as an illustration, not a small icon */
const BED_TIME_ILLUSTRATION_SIZE = 64;

export type RecordCardProps = {
  dateLabel: string;
  duration: string;
  subtitle?: string;
  snoringLabel?: string;
  disruptionsLabel?: string;
  quality?: number;
  onPress: () => void;
};

/**
 * Sleep record card with bed-time vector illustration (no left quality bar).
 */
export function RecordCard({
  dateLabel,
  duration,
  subtitle,
  snoringLabel,
  disruptionsLabel,
  quality = 5,
  onPress,
}: RecordCardProps) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Record ${dateLabel}, ${duration}`}
    >
      <View style={styles.illustrationWrap}>
        <BedTimeIcon
          width={BED_TIME_ILLUSTRATION_SIZE}
          height={BED_TIME_ILLUSTRATION_SIZE}
        />
      </View>
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.dateText}>{dateLabel}</Text>
          <Text style={styles.durationText}>{duration}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitleText}>{subtitle}</Text> : null}
        {snoringLabel ? <Text style={styles.subtitleText}>Snoring: {snoringLabel}</Text> : null}
        {disruptionsLabel ? (
          <Text style={styles.subtitleText}>Disruptions: {disruptionsLabel}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={text.muted} style={styles.chevron} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: background.secondary,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
    minHeight: 80,
    ...elevation.low,
    overflow: "hidden",
  },
  illustrationWrap: {
    width: BED_TIME_ILLUSTRATION_SIZE + spacing.sm,
    height: BED_TIME_ILLUSTRATION_SIZE + spacing.sm,
    marginRight: spacing.md,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    flexWrap: "wrap",
    minWidth: 0,
  },
  titleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: spacing.xs,
  },
  dateText: {
    ...type.bodyMd,
    fontSize: 16,
    fontFamily: "Poppins_500Medium",
    color: text.onCard,
  },
  durationText: {
    ...type.headingMd,
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: text.primary,
  },
  subtitleText: {
    ...type.bodySm,
    fontSize: 14,
    color: text.secondary,
    marginTop: 4,
  },
  chevron: { marginLeft: spacing.sm, opacity: 0.8 },
});
