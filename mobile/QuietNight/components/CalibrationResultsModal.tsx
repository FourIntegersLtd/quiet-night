import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { accent, text, semantic, surface, radius, spacing, type } from "@/constants/theme";
import { PrimaryButton } from "@/components/ui/buttons";
import type { RoomNoiseResult } from "@/types";

export type CalibrationResultsModalProps = {
  visible: boolean;
  result: RoomNoiseResult | null;
  onContinue: () => void;
};

const RESULT_CONFIG: Record<
  RoomNoiseResult,
  { icon: "checkmark-circle-outline" | "remove-circle-outline" | "alert-circle-outline" | "help-circle-outline"; iconColor: string; title: string; explanation: string }
> = {
  quiet: {
    icon: "checkmark-circle-outline",
    iconColor: semantic.success,
    title: "Your room is quiet",
    explanation:
      "We picked up very little background noise. Overnight we'll be able to hear snoring clearly without extra sounds getting in the way. Ideal for tracking.",
  },
  moderate: {
    icon: "remove-circle-outline",
    iconColor: semantic.warning,
    title: "Some background noise",
    explanation:
      "There's a bit of noise in the room but we'll still detect snoring well. You might see the occasional non-snore sound tagged; that's normal and won't affect your overall results.",
  },
  loud: {
    icon: "alert-circle-outline",
    iconColor: semantic.error,
    title: "The room is quite loud",
    explanation:
      "Background noise is high, so it may be harder to tell snoring from other sounds. Tracking will still run, but results can be less accurate. If you can, try and turn off any noise sources or move the phone a bit farther from the noise sources for clearer tracking.",
  },
  error: {
    icon: "help-circle-outline",
    iconColor: text.muted,
    title: "We couldn't measure the room",
    explanation:
      "Something went wrong while listening—often a microphone permission or a quick glitch. Check that the app can use the microphone, then try this step again. You can also continue and start tracking; we'll use a default baseline.",
  },
};

export function CalibrationResultsModal({
  visible,
  result,
  onContinue,
}: CalibrationResultsModalProps) {
  if (!result || !visible) return null;

  const config = RESULT_CONFIG[result];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onContinue}
    >
      <Pressable style={styles.backdrop} onPress={onContinue}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: accent.tealSoft }]}>
              <Ionicons
                name={config.icon}
                size={28}
                color={config.iconColor}
              />
            </View>
            <Text style={styles.title}>Room calibration</Text>
            <Text style={styles.subtitle}>
              Here’s what we found while listening to your room.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.resultTitle}>{config.title}</Text>
            <Text style={styles.explanation}>{config.explanation}</Text>
          </View>

          <View style={styles.footer}>
            <PrimaryButton label="Continue" onPress={onContinue} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.sm,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: surface.elevated,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  header: {
    marginBottom: spacing.sm,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  title: {
    ...type.titleCard,
    color: text.primary,
    marginBottom: 4,
  },
  subtitle: {
    ...type.bodySmall,
    color: text.secondary,
  },
  section: {
    marginBottom: spacing.md,
  },
  resultTitle: {
    ...type.label,
    color: text.primary,
    marginBottom: 8,
  },
  explanation: {
    ...type.bodyMd,
    color: text.secondary,
    lineHeight: 22,
  },
  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
});
