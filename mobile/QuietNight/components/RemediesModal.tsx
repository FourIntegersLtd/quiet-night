import { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import type { RemedyType } from "@/types";
import { IconSelectorGrid } from "@/components/IconSelectorGrid";
import {
  accent,
  background,
  text,
  surface,
  radius,
  spacing,
  type,
  fonts,
  semantic,
} from "@/constants/theme";

const ALL_REMEDIES: RemedyType[] = [
  "CPAP",
  "MOUTHPIECE",
  "SIDE_SLEEPING",
  "MOUTH_TAPE",
  "TONGUE_RETAINER",
  "NASAL_STRIPS",
  "NASAL_DILATOR",
  "NASAL_SPRAY",
  "THROAT_SPRAY",
  "WEDGE_PILLOW",
  "AIR_PURIFIER",
  "HUMIDIFIER",
  "ANTI_SNORE_PILLOW",
  "ANTI_HISTAMINES",
  "CHIN_STRAP",
  "BASELINE",
  "NO_ALCOHOL",
];

const REMEDY_LABELS: Record<RemedyType, string> = {
  BASELINE: "Baseline (Nothing)",
  CPAP: "CPAP",
  MOUTHPIECE: "Mouthpiece",
  MOUTH_TAPE: "Mouth Tape",
  NASAL_DILATOR: "Nasal Dilator",
  NASAL_SPRAY: "Nasal Spray",
  NASAL_STRIPS: "Nasal Strip",
  NO_ALCOHOL: "No Alcohol",
  SIDE_SLEEPING: "Side Sleeping",
  THROAT_SPRAY: "Throat Spray",
  TONGUE_RETAINER: "Tongue Retainer",
  WEDGE_PILLOW: "Wedge Pillow",
  AIR_PURIFIER: "Air Purifier",
  HUMIDIFIER: "Humidifier",
  ANTI_SNORE_PILLOW: "Anti Snore Pillow",
  ANTI_HISTAMINES: "Antihistamines",
  CHIN_STRAP: "Chin Strap",
};

const REMEDY_ICONS: Record<RemedyType, keyof typeof Ionicons.glyphMap> = {
  BASELINE: "bed-outline",
  CPAP: "medical-outline",
  MOUTHPIECE: "ellipse-outline",
  MOUTH_TAPE: "bandage-outline",
  NASAL_DILATOR: "expand-outline",
  NASAL_SPRAY: "water-outline",
  NASAL_STRIPS: "fitness-outline",
  NO_ALCOHOL: "wine-outline",
  SIDE_SLEEPING: "body-outline",
  THROAT_SPRAY: "water-outline",
  TONGUE_RETAINER: "language-outline",
  WEDGE_PILLOW: "layers-outline",
  AIR_PURIFIER: "filter-outline",
  HUMIDIFIER: "water-outline",
  ANTI_SNORE_PILLOW: "cube-outline",
  ANTI_HISTAMINES: "tablet-portrait-outline",
  CHIN_STRAP: "headset-outline",
};

/** Extra info for each remedy: tap and hold to discover. */
const REMEDY_INFO: Record<RemedyType, { body: string; bullets?: string[] }> = {
  BASELINE: {
    body: "Track with no intervention so you have a baseline to compare other remedies against.",
    bullets: [
      "No devices, strips, or lifestyle changes",
      "Use for at least a few nights for a fair comparison",
      "Your \"loud snoring\" minutes become the reference",
    ],
  },
  CPAP: {
    body: "Continuous positive airway pressure keeps your airway open while you sleep. Often the most effective option for moderate to severe sleep apnoea.",
    bullets: [
      "Worn as a mask over nose and/or mouth",
      "Prescribed after a sleep study",
      "Track nights with vs without to see impact",
    ],
  },
  MOUTHPIECE: {
    body: "Mandibular advancement devices (MADs) hold your lower jaw slightly forward to open the airway. Fitted by a dentist or bought as boil-and-bite.",
    bullets: [
      "Worn in the mouth during sleep",
      "Can reduce snoring and mild apnoea",
      "May take a few nights to get used to",
    ],
  },
  MOUTH_TAPE: {
    body: "Gentle tape over the lips encourages nasal breathing, which can reduce snoring for some people.",
    bullets: [
      "Use only porous, breathable tape designed for sleep",
      "Stop if you feel uncomfortable or congested",
      "Works best when combined with good nasal airflow",
    ],
  },
  SIDE_SLEEPING: {
    body: "Sleeping on your side instead of your back can stop the tongue and soft tissue from blocking the airway, reducing or stopping snoring for many.",
    bullets: [
      "Use a pillow between the knees or a backpack to discourage rolling onto your back",
      "One of the simplest changes to try",
      "Track a few nights to compare with back sleeping",
    ],
  },
  TONGUE_RETAINER: {
    body: "A small device holds the tongue forward so it doesn't block the airway. Often used with mouth tape or other remedies.",
    bullets: [
      "Fits inside the mouth",
      "Helps prevent tongue-based obstruction",
      "May take time to get used to",
    ],
  },
  NASAL_STRIPS: {
    body: "Adhesive strips on the nose help open the nostrils and improve airflow. Simple, drug-free, and easy to try.",
    bullets: [
      "Stick on the bridge of the nose before bed",
      "Can reduce congestion and mouth breathing",
      "Good first step if nose feels blocked",
    ],
  },
  NASAL_DILATOR: {
    body: "Internal dilators sit inside the nostrils to hold them open, increasing airflow without medication.",
    bullets: [
      "Inserted at night, removed in the morning",
      "Reusable or disposable depending on type",
      "Useful when nasal strips aren't enough",
    ],
  },
  NASAL_SPRAY: {
    body: "Decongestant or steroid sprays reduce nasal congestion so you breathe more easily through your nose.",
    bullets: [
      "Use as directed (e.g. before bed)",
      "Don't use decongestant long-term without advice",
      "Can pair with strips or dilators",
    ],
  },
  THROAT_SPRAY: {
    body: "Sprays that lubricate or soothe the throat may reduce vibration and irritation that contribute to snoring.",
    bullets: [
      "Applied before sleep",
      "Effects vary by person",
      "Often used alongside other remedies",
    ],
  },
  WEDGE_PILLOW: {
    body: "Elevating your upper body can reduce tongue and soft-tissue collapse and improve drainage, easing snoring.",
    bullets: [
      "Use a wedge or extra pillows",
      "Slight incline is often enough",
      "Can help with reflux too",
    ],
  },
  AIR_PURIFIER: {
    body: "Cleaner air can reduce irritation and congestion, making it easier to breathe through your nose at night.",
    bullets: [
      "Run in the bedroom, especially in allergy season",
      "Combine with regular filter changes",
      "May help with dry air as well",
    ],
  },
  HUMIDIFIER: {
    body: "Adding moisture to the air can ease dry throat and nasal passages, reducing irritation and snoring for some.",
    bullets: [
      "Use in the bedroom; clean regularly",
      "Keep humidity in a comfortable range (e.g. 40–50%)",
      "Helpful in dry or heated rooms",
    ],
  },
  ANTI_SNORE_PILLOW: {
    body: "Pillows designed to support the head and neck in a position that keeps the airway more open and can reduce snoring.",
    bullets: [
      "Often encourage side sleeping or slight elevation",
      "Shape and firmness vary by brand",
      "Track a few nights to compare with your usual pillow",
    ],
  },
  ANTI_HISTAMINES: {
    body: "Antihistamines can reduce allergy-related congestion so you breathe more through your nose. Use as directed by your doctor or label.",
    bullets: [
      "Can ease congestion and post-nasal drip",
      "Some types may cause drowsiness; avoid driving if affected",
      "Not a long-term substitute for treating underlying allergies",
    ],
  },
  CHIN_STRAP: {
    body: "A soft strap worn under the chin helps keep the mouth closed so you breathe through your nose. Best when nasal breathing is already possible.",
    bullets: [
      "Worn around the head and under the chin",
      "Use only if you can breathe comfortably through your nose",
      "Can pair with nasal strips or dilators",
    ],
  },
  NO_ALCOHOL: {
    body: "Alcohol relaxes throat muscles and can worsen snoring. Avoiding it in the hours before bed is a simple change to test.",
    bullets: [
      "Try no alcohol from late afternoon or evening",
      "Compare nights with vs without",
      "Even one drink can affect some people",
    ],
  },
};

interface RemediesModalProps {
  visible: boolean;
  initialSelected: RemedyType;
  onClose: () => void;
  onConfirm: (remedy: RemedyType) => void;
}

export function RemediesModal({
  visible,
  initialSelected,
  onClose,
  onConfirm,
}: RemediesModalProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<RemedyType>(initialSelected);
  const [search, setSearch] = useState("");
  const [infoRemedy, setInfoRemedy] = useState<RemedyType | null>(null);

  useEffect(() => {
    if (visible) {
      setSelected(initialSelected);
      setSearch("");
      setInfoRemedy(null);
    }
  }, [visible, initialSelected]);

  const filtered = useMemo(() => {
    if (!search.trim()) return ALL_REMEDIES;
    const q = search.trim().toLowerCase();
    return ALL_REMEDIES.filter(
      (r) => REMEDY_LABELS[r].toLowerCase().includes(q)
    );
  }, [search]);

  const handleConfirm = () => {
    onConfirm(selected);
  };

  if (!visible) return null;

  const gridItems = filtered.map((r) => ({
    id: r,
    icon: REMEDY_ICONS[r],
    label: REMEDY_LABELS[r],
  }));

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.stackLg }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} hitSlop={12}>
            <Ionicons name="close" size={26} color={accent.teal} />
          </TouchableOpacity>
          <Text style={styles.title}>Snoring Remedies</Text>
          <TouchableOpacity style={styles.headerBtn} hitSlop={12}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.instruction}>
          Select snoring remedies for this session. Tap and hold an icon to discover more about it.
        </Text>

        <View style={styles.searchWrap}>
          <Ionicons name="search" size={20} color={text.muted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search remedies"
            placeholderTextColor={text.muted}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.gridWrap}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <IconSelectorGrid
            items={gridItems}
            selectedIds={[selected]}
            onSelect={(id) => setSelected(id as RemedyType)}
            onAddNew={() => {}}
            onLongPressItem={(id) => setInfoRemedy(id as RemedyType)}
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.createNewBtn}
            onPress={() => {}}
            activeOpacity={0.85}
          >
            <Text style={styles.createNewText}>Create New</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirm}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmText}>Confirm 1</Text>
          </TouchableOpacity>
        </View>

      {/* Discover more: overlay when user long-presses a remedy */}
      {infoRemedy != null && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Pressable
            style={styles.infoBackdrop}
            onPress={() => setInfoRemedy(null)}
          >
            <Pressable style={styles.infoCard} onPress={(e: { stopPropagation: () => void }) => e.stopPropagation()}>
              <View style={styles.infoHeader}>
                <View style={[styles.infoIconWrap, { backgroundColor: accent.tealSoftBg }]}>
                  <Ionicons
                    name={REMEDY_ICONS[infoRemedy]}
                    size={28}
                    color={accent.teal}
                  />
                </View>
                <Text style={styles.infoTitle}>{REMEDY_LABELS[infoRemedy]}</Text>
                <TouchableOpacity
                  onPress={() => setInfoRemedy(null)}
                  style={styles.infoClose}
                  hitSlop={12}
                >
                  <Ionicons name="close" size={24} color={text.secondary} />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.infoScroll}
                contentContainerStyle={styles.infoScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.infoBody}>
                  {REMEDY_INFO[infoRemedy].body}
                </Text>
                {REMEDY_INFO[infoRemedy].bullets && (
                  <View style={styles.infoBullets}>
                    {REMEDY_INFO[infoRemedy].bullets!.map((bullet: string, i: number) => (
                      <View key={i} style={styles.infoBulletRow}>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={accent.teal}
                          style={styles.infoBulletIcon}
                        />
                        <Text style={styles.infoBulletText}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            </Pressable>
          </Pressable>
        </View>
      )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.primary,
    paddingHorizontal: spacing.screenPadding,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.stackMd,
  },
  headerBtn: { minWidth: 44, minHeight: 44, justifyContent: "center" },
  title: {
    ...type.title,
    color: text.primary,
  },
  editText: {
    ...type.body,
    fontFamily: fonts.bodyMedium,
    color: accent.teal,
  },
  instruction: {
    ...type.bodySmall,
    color: text.secondary,
    marginBottom: spacing.stackLg,
    lineHeight: 20,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: surface.elevated,
    borderRadius: radius.button,
    paddingHorizontal: 14,
    marginBottom: spacing.sectionGap,
    borderWidth: 1,
    borderColor: surface.elevated,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    ...type.body,
    color: text.primary,
    paddingVertical: 14,
  },
  scroll: { flex: 1 },
  gridWrap: { paddingBottom: spacing.sectionGap },
  footer: {
    flexDirection: "row",
    gap: spacing.stackMd,
    paddingTop: spacing.stackLg,
  },
  createNewBtn: {
    flex: 1,
    backgroundColor: semantic.success,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  createNewText: {
    ...type.button,
    color: background.primary,
  },
  confirmBtn: {
    flex: 1,
    backgroundColor: accent.teal,
    paddingVertical: 16,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  confirmText: {
    ...type.button,
    color: background.primary,
  },
  infoBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.screenPadding,
  },
  infoCard: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "80%",
    backgroundColor: background.secondary,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    borderWidth: 1,
    borderColor: accent.tealGlow,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.stackLg,
  },
  infoIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.stackMd,
  },
  infoTitle: {
    flex: 1,
    ...type.titleCard,
    color: text.primary,
  },
  infoClose: { padding: 4 },
  infoScroll: { maxHeight: 320 },
  infoScrollContent: { paddingBottom: spacing.stackMd },
  infoBody: {
    ...type.body,
    color: text.secondary,
    lineHeight: 22,
    marginBottom: spacing.stackLg,
  },
  infoBullets: { gap: 8 },
  infoBulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  infoBulletIcon: { marginTop: 4, marginRight: 10 },
  infoBulletText: {
    flex: 1,
    ...type.bodySmall,
    color: text.secondary,
    lineHeight: 20,
  },
});
