import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { AlcoholLevel, CongestionLevel } from "@/types";
import type { NightFactors } from "@/lib/nights";
import {
  accent,
  background,
  text,
  surface,
  radius,
  spacing,
  type,
  fonts,
} from "@/constants/theme";

const ALCOHOL_OPTIONS: { value: AlcoholLevel; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "1_TO_2", label: "1–2 drinks" },
  { value: "3_PLUS", label: "3+" },
];

const CONGESTION_OPTIONS: { value: CongestionLevel; label: string }[] = [
  { value: "CLEAR", label: "Clear" },
  { value: "MILD", label: "Mild" },
  { value: "BLOCKED", label: "Blocked" },
];

/** Factor row config: icon, label, description (matches Tonight pre-flight style) */
const FACTOR_ROWS: Array<{
  key: keyof NightFactors;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  type: "alcohol" | "congestion" | "yesno";
}> = [
  { key: "alcohol_level", icon: "wine-outline", label: "Alcohol", description: "Can affect sleep quality and snoring.", type: "alcohol" },
  { key: "congestion_level", icon: "water-outline", label: "Blocked nose", description: "Nasal congestion may worsen breathing at night.", type: "congestion" },
  { key: "exhausted_today", icon: "moon-outline", label: "Exhausted today?", description: "Being overtired can change how you sleep.", type: "yesno" },
  { key: "worked_out", icon: "barbell-outline", label: "Worked out?", description: "Exercise timing can influence sleep.", type: "yesno" },
  { key: "used_sedative", icon: "medical-outline", label: "Used sedative?", description: "Sleep aids or relaxants.", type: "yesno" },
  { key: "sick", icon: "medkit-outline", label: "Sick?", description: "Illness often affects sleep and breathing.", type: "yesno" },
  { key: "smoking", icon: "flame-outline", label: "Smoking?", description: "Smoking can increase airway irritation.", type: "yesno" },
  { key: "caffeine", icon: "cafe-outline", label: "Caffeine?", description: "Late caffeine may keep you alert.", type: "yesno" },
];

export type FactorsModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (factors: NightFactors) => void;
};

export function FactorsModal({
  visible,
  onClose,
  onConfirm,
}: FactorsModalProps) {
  const insets = useSafeAreaInsets();
  const [alcohol, setAlcohol] = useState<AlcoholLevel>("NONE");
  const [congestion, setCongestion] = useState<CongestionLevel>("CLEAR");
  const [exhausted, setExhausted] = useState(false);
  const [workedOut, setWorkedOut] = useState(false);
  const [usedSedative, setUsedSedative] = useState(false);
  const [sick, setSick] = useState(false);
  const [smoking, setSmoking] = useState(false);
  const [caffeine, setCaffeine] = useState(false);
  const [note, setNote] = useState("");

  const getValue = (key: keyof NightFactors) => {
    switch (key) {
      case "alcohol_level": return alcohol;
      case "congestion_level": return congestion;
      case "exhausted_today": return exhausted;
      case "worked_out": return workedOut;
      case "used_sedative": return usedSedative;
      case "sick": return sick;
      case "smoking": return smoking;
      case "caffeine": return caffeine;
      default: return null;
    }
  };

  const setValue = (key: keyof NightFactors, value: unknown) => {
    switch (key) {
      case "alcohol_level": setAlcohol(value as AlcoholLevel); break;
      case "congestion_level": setCongestion(value as CongestionLevel); break;
      case "exhausted_today": setExhausted(value as boolean); break;
      case "worked_out": setWorkedOut(value as boolean); break;
      case "used_sedative": setUsedSedative(value as boolean); break;
      case "sick": setSick(value as boolean); break;
      case "smoking": setSmoking(value as boolean); break;
      case "caffeine": setCaffeine(value as boolean); break;
    }
  };

  const renderControl = (row: (typeof FACTOR_ROWS)[0]) => {
    if (row.type === "alcohol") {
      return (
        <View style={styles.toggleRow}>
          {ALCOHOL_OPTIONS.map((opt) => {
            const active = alcohol === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.toggleOption, active && styles.toggleOptionOn]}
                onPress={() => setAlcohol(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleOptionText, active && styles.toggleOptionTextOn]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }
    if (row.type === "congestion") {
      return (
        <View style={styles.toggleRow}>
          {CONGESTION_OPTIONS.map((opt) => {
            const active = congestion === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                style={[styles.toggleOption, active && styles.toggleOptionOn]}
                onPress={() => setCongestion(opt.value)}
                activeOpacity={0.8}
              >
                <Text style={[styles.toggleOptionText, active && styles.toggleOptionTextOn]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      );
    }
    const value = getValue(row.key) as boolean;
    return (
      <View style={styles.toggleRow}>
        {(["No", "Yes"] as const).map((v) => {
          const active = (v === "Yes" && value) || (v === "No" && !value);
          return (
            <TouchableOpacity
              key={v}
              style={[styles.toggleOption, active && styles.toggleOptionOn]}
              onPress={() => setValue(row.key, v === "Yes")}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleOptionText, active && styles.toggleOptionTextOn]}>{v}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const handleConfirm = () => {
    onConfirm({
      alcohol_level: alcohol,
      congestion_level: congestion,
      exhausted_today: exhausted,
      worked_out: workedOut,
      used_sedative: usedSedative,
      sick,
      smoking,
      caffeine,
      note: note.trim() || undefined,
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top + 12 }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={text.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Any factors tonight?</Text>
          <Text style={styles.subtitle}>
            Optional — helps compare what works over time.
          </Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {FACTOR_ROWS.map((row, index) => (
            <View
              key={row.key}
              style={[
                styles.factorRow,
                index === FACTOR_ROWS.length - 1 && styles.factorRowLast,
              ]}
            >
              <View style={styles.factorIconWrap}>
                <Ionicons name={row.icon} size={22} color={accent.teal} />
              </View>
              <View style={styles.factorBody}>
                <Text style={styles.factorLabel}>{row.label}</Text>
                <Text style={styles.factorDescription}>{row.description}</Text>
                {renderControl(row)}
              </View>
            </View>
          ))}

          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>Note (optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="e.g. Late dinner, stressful day…"
              placeholderTextColor={text.muted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              maxLength={500}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirm}
            activeOpacity={0.9}
          >
            <Text style={styles.confirmBtnText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.primary,
  },
  header: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.stackMd,
  },
  closeBtn: {
    alignSelf: "flex-end",
    marginBottom: 4,
  },
  title: {
    ...type.title,
    color: text.primary,
    marginBottom: 4,
  },
  subtitle: {
    ...type.bodySmall,
    color: text.secondary,
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sectionGapLarge,
  },
  factorRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: surface.elevated,
  },
  factorRowLast: { borderBottomWidth: 0 },
  factorIconWrap: {
    width: 32,
    marginRight: spacing.stackMd,
    alignItems: "center",
    justifyContent: "center",
  },
  factorBody: { flex: 1 },
  factorLabel: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: text.primary,
  },
  factorDescription: {
    ...type.bodySmall,
    color: text.secondary,
    marginTop: 2,
    marginBottom: 10,
    lineHeight: 18,
  },
  toggleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  toggleOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.button,
    backgroundColor: surface.elevated,
    borderWidth: 1,
    borderColor: surface.elevated,
  },
  toggleOptionOn: {
    backgroundColor: accent.tealSoft,
    borderColor: accent.teal,
  },
  toggleOptionText: {
    ...type.body,
    color: text.secondary,
  },
  toggleOptionTextOn: {
    color: accent.teal,
    fontFamily: fonts.bodyMedium,
  },
  footer: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: 12,
  },
  confirmBtn: {
    backgroundColor: accent.teal,
    paddingVertical: 16,
    borderRadius: radius.button,
    alignItems: "center",
  },
  confirmBtnText: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: background.primary,
  },
  noteSection: {
    marginTop: spacing.sectionGap,
  },
  noteLabel: {
    ...type.bodySmall,
    fontFamily: fonts.bodyMedium,
    color: text.secondary,
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: background.secondary,
    borderWidth: 1,
    borderColor: surface.elevated,
    borderRadius: radius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: text.primary,
    minHeight: 80,
    maxHeight: 120,
  },
});
