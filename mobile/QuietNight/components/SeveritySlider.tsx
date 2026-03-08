import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import * as Haptics from "expo-haptics";
import { severityGradient, background, text, type, elevation } from "@/constants/theme";

const SEVERITY_LABELS = [
  "Excellent",
  "Very good",
  "Good",
  "Decent",
  "Average",
  "Below average",
  "Poor",
  "Very poor",
  "Terrible",
  "Unbearable",
] as const;

type SeveritySliderProps = {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  labels?: readonly string[];
};

/**
 * 1–10 severity scale with color-coded segments and descriptive label (revised spec).
 */
export function SeveritySlider({
  value,
  onValueChange,
  min = 1,
  max = 10,
  labels = SEVERITY_LABELS,
}: SeveritySliderProps) {
  const levels = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const displayValue = Math.min(max, Math.max(min, value));
  const color = severityGradient[displayValue - 1];
  const label = labels[displayValue - 1] ?? String(displayValue);

  return (
    <View style={styles.wrap}>
      <View style={styles.valueRow}>
        <Text style={[styles.valueNumber, { color }]}>{displayValue}</Text>
        <Text style={[styles.valueLabel, { color }]}>{label}</Text>
      </View>
      <View style={styles.track}>
        {levels.map((v) => (
          <TouchableOpacity
            key={v}
            style={[
              styles.segment,
              { backgroundColor: v <= value ? severityGradient[v - 1] : background.input },
              v === value && styles.segmentThumb,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onValueChange(v);
            }}
            accessibilityLabel={`${v}, ${labels[v - 1]}`}
          />
        ))}
      </View>
      <View style={styles.endLabels}>
        <Text style={styles.endLabelText}>Excellent</Text>
        <Text style={styles.endLabelText}>Unbearable</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 24 },
  valueRow: { alignItems: "center", marginBottom: 12 },
  valueNumber: {
    ...type.headingLg,
    fontSize: 24,
  },
  valueLabel: {
    ...type.bodyMd,
    marginTop: 4,
  },
  track: {
    flexDirection: "row",
    height: 6,
    borderRadius: 4,
    overflow: "hidden",
    backgroundColor: background.input,
  },
  segment: {
    flex: 1,
    height: "100%",
  },
  segmentThumb: {
    ...elevation.mid,
  },
  endLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingHorizontal: 0,
  },
  endLabelText: {
    ...type.bodySm,
    color: text.secondary,
  },
});
