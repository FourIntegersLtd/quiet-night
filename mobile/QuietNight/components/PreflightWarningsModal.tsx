import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { accent, text, surface, radius, spacing, type } from "@/constants/theme";
import { PrimaryButton } from "@/components/ui/buttons";

export type PreflightWarningsModalProps = {
  visible: boolean;
  onDismiss: () => void;
  lowBattery: boolean;
  lowStorage: boolean;
  onClearOldRecordings: () => void;
  onOpenProfile?: () => void;
  clearOldRecordingsLoading?: boolean;
};

export function PreflightWarningsModal({
  visible,
  onDismiss,
  lowBattery,
  lowStorage,
  onClearOldRecordings,
  onOpenProfile,
  clearOldRecordingsLoading = false,
}: PreflightWarningsModalProps) {
  const hasWarnings = lowBattery || lowStorage;

  if (!hasWarnings) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Ionicons name="warning-outline" size={28} color={accent.primary} />
            </View>
            <Text style={styles.title}>Before you start</Text>
            <Text style={styles.subtitle}>
              Resolve these so overnight tracking runs smoothly.
            </Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {lowBattery && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="battery-dead-outline" size={22} color={text.primary} />
                  <Text style={styles.sectionTitle}>Low battery</Text>
                </View>
                <Text style={styles.instruction}>
                  Plug in your device for best results during overnight recording.
                  Recording with low battery may stop if your phone powers off.
                </Text>
              </View>
            )}

            {lowStorage && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="folder-open-outline" size={22} color={text.primary} />
                  <Text style={styles.sectionTitle}>Low storage</Text>
                </View>
                <Text style={styles.instruction}>
                  Free up space so tracking can run smoothly. We recommend
                  deleting snore recordings older than 7 days. Your night logs
                  (counts and dates) will stay.
                </Text>
                <PrimaryButton
                  label="Clear old recordings"
                  onPress={onClearOldRecordings}
                  loading={clearOldRecordingsLoading}
                  disabled={clearOldRecordingsLoading}
                />
            
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <PrimaryButton label="Continue" onPress={onDismiss} />
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
    maxHeight: "85%",
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
    backgroundColor: accent.tealSoft,
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
  scroll: {
    maxHeight: 320,
  },
  scrollContent: {
    paddingVertical: spacing.xs,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  sectionTitle: {
    ...type.label,
    color: text.primary,
  },
  instruction: {
    ...type.bodyMd,
    color: text.secondary,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  profileLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  profileLinkText: {
    ...type.bodyMd,
    color: accent.primary,
  },
  footer: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
  },
});
