import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  TextInput,
  Modal,
  Pressable,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  cancelAnimation,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useSystemChecks } from "@/hooks/use-system-checks";
import { useRoomNoiseTest } from "@/hooks/use-room-noise-test";
import {
  startListening,
  stopListening,
  getCurrentNoiseLevel,
} from "@/modules/expo-snore-detector";
import { ROOM_TEST_DURATION_SEC, PREFLIGHT_MIN_STORAGE_MB } from "@/constants/app";
import type { CheckStatus, RoomNoiseResult } from "@/types";
import type { RemedyType, AlcoholLevel, CongestionLevel } from "@/types";
import {
  getTodayNightKey,
  ensureNightInList,
  setNightFactors,
  setNightRemedy,
  type NightFactors,
} from "@/lib/nights";
import {
  background,
  accent,
  text,
  semantic,
  surface,
  radius,
  spacing,
  type,
  fonts,
} from "@/constants/theme";
import { PrimaryButton, GhostButton } from "@/components/ui/buttons";
import { IconSelectorGrid, type IconSelectorItem } from "@/components/IconSelectorGrid";
import { useToast } from "@/contexts/ToastContext";
import type { SleepSoundId } from "@/lib/sleep-sounds";

const NATIVE_CALIBRATION_MS = 6000;
const NATIVE_POLL_MS = 300;
const TOTAL_QUESTIONNAIRE_STEPS = 4;


function dbToRoomResult(db: number): RoomNoiseResult {
  if (db <= -150 || !Number.isFinite(db)) return "error";
  if (db > -30) return "loud";
  if (db > -50) return "moderate";
  return "quiet";
}

function statusIcon(s: CheckStatus): string | null {
  if (s === "checking") return null;
  if (s === "ok") return "✓";
  if (s === "warn") return "!";
  if (s === "fail") return "✕";
  return "·";
}

function statusColor(s: CheckStatus): string {
  if (s === "ok") return semantic.success;
  if (s === "warn") return semantic.warning;
  if (s === "fail") return "#ef4444";
  return text.secondary;
}

const REMEDY_ITEMS: IconSelectorItem[] = [
  { id: "BASELINE", icon: "bed-outline", label: "Baseline" },
  { id: "NASAL_STRIPS", icon: "fitness-outline", label: "Nasal Strip" },
  { id: "CPAP", icon: "medical-outline", label: "CPAP" },
  { id: "SIDE_SLEEPING", icon: "body-outline", label: "Side sleeping" },
  { id: "MOUTH_TAPE", icon: "bandage-outline", label: "Mouth tape" },
  { id: "WEDGE_PILLOW", icon: "bed-outline", label: "Wedge pillow" },
  { id: "HUMIDIFIER", icon: "water-outline", label: "Humidifier" },
  { id: "NO_ALCOHOL", icon: "wine-outline", label: "No alcohol" },
  { id: "NASAL_DILATOR", icon: "expand-outline", label: "Nasal dilator" },
  { id: "ANTI_SNORE_PILLOW", icon: "bed-outline", label: "Anti-snore pillow" },
];

const ALCOHOL_ITEMS: IconSelectorItem[] = [
  { id: "NONE", icon: "close-circle-outline", label: "None" },
  { id: "1_TO_2", icon: "wine-outline", label: "1–2" },
  { id: "3_PLUS", icon: "wine-outline", label: "3+" },
];
const CONGESTION_ITEMS: IconSelectorItem[] = [
  { id: "CLEAR", icon: "checkmark-circle-outline", label: "Clear" },
  { id: "MILD", icon: "ellipse-outline", label: "Mild" },
  { id: "BLOCKED", icon: "alert-circle-outline", label: "Blocked" },
];
const PRE_SLEEP_FACTOR_ITEMS: IconSelectorItem[] = [
  { id: "caffeine", icon: "cafe-outline", label: "Caffeine" },
  { id: "exhausted", icon: "moon-outline", label: "Exhausted" },
  { id: "late_meal", icon: "restaurant-outline", label: "Late meal" },
  { id: "stress", icon: "flash-outline", label: "Stress" },
  { id: "screen_time", icon: "phone-portrait-outline", label: "Screen time" },
  { id: "worked_out", icon: "barbell-outline", label: "Worked out" },
  { id: "sedative", icon: "medical-outline", label: "Sedative" },
  { id: "sick", icon: "thermometer-outline", label: "Sick" },
  { id: "smoking", icon: "flame-outline", label: "Smoking" },
];

const BAR_COUNT = 22;
const barCurve = (() => {
  const mid = (BAR_COUNT - 1) / 2;
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    const norm = 1 - Math.abs(i - mid) / mid;
    return 0.3 + norm * 0.7;
  });
})();

function CalibrationWaveBar({
  index,
  scale,
  active,
}: {
  index: number;
  scale: number;
  active: boolean;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    if (active) {
      progress.value = withDelay(
        index * 60,
        withRepeat(
          withTiming(1, { duration: 1600 + index * 50, easing: Easing.inOut(Easing.sin) }),
          -1,
          true
        )
      );
    } else {
      progress.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) });
    }
    return () => {
      cancelAnimation(progress);
    };
  }, [active, index]);
  const animStyle = useAnimatedStyle(() => {
    const height = interpolate(progress.value, [0, 1], [6, 32 * scale]);
    const opacity = interpolate(progress.value, [0, 1], [0.25, 0.7]);
    return { height, opacity };
  });
  return (
    <Animated.View
      style={[{ width: 3, borderRadius: 2, backgroundColor: accent.teal, marginHorizontal: 1.5 }, animStyle]}
    />
  );
}

function WizardChrome({
  stepIndex,
  onBack,
  onMenuPress,
  onClose,
}: {
  stepIndex: number;
  onBack: () => void;
  onMenuPress: () => void;
  onClose: () => void;
}) {
  const questionnaireStep = stepIndex - 2;
  if (questionnaireStep < 0) {
    return (
      <View style={styles.chromeWrap}>
        <View style={styles.chromeRow}>
          <TouchableOpacity onPress={onBack} style={styles.chromeBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={text.primary} />
          </TouchableOpacity>
          <Text style={styles.chromeTitle}>Pre-flight</Text>
          <TouchableOpacity onPress={onClose} style={styles.chromeBtn} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={text.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  const progress = Math.min(1, (questionnaireStep + 1) / TOTAL_QUESTIONNAIRE_STEPS);
  return (
    <View style={styles.chromeWrap}>
      <View style={styles.chromeRow}>
        <TouchableOpacity onPress={onBack} style={styles.chromeBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={text.primary} />
        </TouchableOpacity>
        <Text style={styles.chromeTitle}>
          Step {questionnaireStep + 1} of {TOTAL_QUESTIONNAIRE_STEPS}
        </Text>
        <View style={styles.chromeRightRow}>
          <TouchableOpacity onPress={onMenuPress} style={styles.chromeBtn} hitSlop={12}>
            <Ionicons name="ellipsis-vertical" size={24} color={text.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={styles.chromeBtn} hitSlop={12} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={text.primary} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </View>
  );
}

export default function WizardScreen() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [roomResult, setRoomResult] = useState<RoomNoiseResult | null>(null);
  const [baselineNoiseDb, setBaselineNoiseDb] = useState<number | null>(null);
  const [nativeCalibrating, setNativeCalibrating] = useState(false);

  const [sleepSound] = useState<SleepSoundId>("none");
  const [alcoholLevel, setAlcoholLevel] = useState<AlcoholLevel>("NONE");
  const [congestionLevel, setCongestionLevel] = useState<CongestionLevel>("CLEAR");
  const [selectedPreSleepFactors, setSelectedPreSleepFactors] = useState<string[]>([]);
  const [selectedInterventions, setSelectedInterventions] = useState<RemedyType[]>(["BASELINE"]);
  const [notes, setNotes] = useState("");

  const togglePreSleepFactor = (id: string) => {
    setSelectedPreSleepFactors((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleIntervention = (id: string) => {
    const remedy = id as RemedyType;
    setSelectedInterventions((prev) => {
      if (prev.includes(remedy)) {
        const next = prev.filter((r) => r !== remedy);
        return next.length ? next : ["BASELINE"];
      }
      const withoutBaseline = prev.filter((r) => r !== "BASELINE");
      if (remedy === "BASELINE") return ["BASELINE"];
      return [...withoutBaseline, remedy];
    });
  };

  const {
    micStatus,
    storageStatus,
    storageMB,
    batteryStatus,
    batteryPct,
    isPluggedIn,
    runMicCheck,
  } = useSystemChecks();

  const hasStorage = storageMB !== null && storageMB >= PREFLIGHT_MIN_STORAGE_MB;
  const roomTestStartedRef = useRef(false);
  const useNativeCalibration = Platform.OS === "ios";
  const { startTest, isRecording } = useRoomNoiseTest((r) => setRoomResult(r));
  const isListening = useNativeCalibration ? nativeCalibrating : isRecording;

  useEffect(() => {
    if (step !== 1) {
      roomTestStartedRef.current = false;
      return;
    }
    if (roomResult !== null) return;
    if (useNativeCalibration) {
      if (nativeCalibrating) return;
      setNativeCalibrating(true);
      const samples: number[] = [];
      startListening()
        .then(() => {
          const interval = setInterval(() => {
            const db = getCurrentNoiseLevel();
            if (db > -150) samples.push(db);
          }, NATIVE_POLL_MS);
          setTimeout(() => {
            clearInterval(interval);
            stopListening().then(() => {
              const avg = samples.length ? samples.reduce((a, b) => a + b, 0) / samples.length : -60;
              setBaselineNoiseDb(Math.round(avg));
              setRoomResult(dbToRoomResult(avg));
              setNativeCalibrating(false);
            });
          }, NATIVE_CALIBRATION_MS);
        })
        .catch(() => {
          setRoomResult("error");
          setNativeCalibrating(false);
        });
      return;
    }
    if (roomTestStartedRef.current) return;
    roomTestStartedRef.current = true;
    startTest();
  }, [step, roomResult, useNativeCalibration, nativeCalibrating, startTest]);

  const canProceedFromStep0 = micStatus === "ok" && hasStorage;
  const questionnaireStepIndex = step - 2;

  const handleSave = () => {
    const key = getTodayNightKey();
    ensureNightInList(key);
    const factors: NightFactors = {
      alcohol_level: alcoholLevel,
      congestion_level: congestionLevel,
      caffeine: selectedPreSleepFactors.includes("caffeine"),
      exhausted_today: selectedPreSleepFactors.includes("exhausted"),
      worked_out: selectedPreSleepFactors.includes("worked_out") || undefined,
      used_sedative: selectedPreSleepFactors.includes("sedative") || undefined,
      sick: selectedPreSleepFactors.includes("sick") || undefined,
      smoking: selectedPreSleepFactors.includes("smoking") || undefined,
      pre_sleep_other: (() => {
        const other = selectedPreSleepFactors.filter((id) => ["late_meal", "stress", "screen_time"].includes(id));
        return other.length ? other : undefined;
      })(),
      note: notes || undefined,
      sleep_sound: sleepSound,
    };
    setNightFactors(key, factors);
    const remedies: RemedyType[] = selectedInterventions.length ? selectedInterventions : ["BASELINE"];
    setNightRemedy(key, remedies);
    toast.show({ message: "Tracking started" });
    router.replace({ pathname: "/(tabs)/tonight/active", params: { remedy: remedies.join(",") } });
  };

  const [stepMenuVisible, setStepMenuVisible] = useState(false);
  const handleWizardBack = () => {
    if (step <= 2) router.back();
    else setStep(step - 1);
  };
  const handleResetAnswers = () => {
    setStepMenuVisible(false);
    setNotes("");
    setAlcoholLevel("NONE");
    setCongestionLevel("CLEAR");
    setSelectedPreSleepFactors([]);
    setSelectedInterventions(["BASELINE"]);
    toast.show({ message: "Answers reset" });
  };
  const handleSaveDraft = () => {
    setStepMenuVisible(false);
    handleSave();
  };

  return (
    <View style={styles.container}>
      <WizardChrome
        stepIndex={step}
        onBack={handleWizardBack}
        onMenuPress={() => setStepMenuVisible(true)}
        onClose={() => router.back()}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        {/* Step 0: System check */}
        {step === 0 && (
          <View style={styles.card}>
            <Text style={styles.screenLabel}>PRE-FLIGHT</Text>
            <Text style={styles.header}>System check</Text>
            <Text style={styles.cardSub}>
              We'll verify mic and storage so tracking runs smoothly tonight.
            </Text>
            <View style={styles.checkRow}>
              {micStatus === "checking" ? (
                <ActivityIndicator size="small" color={accent.teal} />
              ) : (
                <Text style={[styles.checkIcon, { color: statusColor(micStatus) }]}>{statusIcon(micStatus)}</Text>
              )}
              <View style={styles.checkText}>
                <Text style={styles.checkLabel}>Microphone</Text>
                <Text style={[styles.checkValue, { color: statusColor(micStatus) }]}>
                  {micStatus === "checking" ? "Checking…" : micStatus === "ok" ? "Ready" : "Needs permission"}
                </Text>
              </View>
              {micStatus === "fail" && (
                <TouchableOpacity onPress={runMicCheck} style={styles.retryBtn}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.checkRow}>
              <Text style={[styles.checkIcon, { color: hasStorage ? semantic.success : "#ef4444" }]}>
                {hasStorage ? "✓" : "✕"}
              </Text>
              <View style={styles.checkText}>
                <Text style={styles.checkLabel}>Storage</Text>
                <Text style={[styles.checkValue, { color: hasStorage ? semantic.success : "#ef4444" }]}>
                  {storageStatus === "checking" ? "Checking…" : hasStorage ? "OK" : "Clear space"}
                </Text>
              </View>
            </View>
            <View style={[styles.checkRow, styles.checkRowLast]}>
              <Text style={[styles.checkIcon, { color: statusColor(batteryStatus) }]}>{statusIcon(batteryStatus)}</Text>
              <View style={styles.checkText}>
                <Text style={styles.checkLabel}>Battery</Text>
                <Text style={[styles.checkValue, { color: statusColor(batteryStatus) }]}>
                  {batteryStatus === "checking" ? "…" : isPluggedIn ? "Plugged in" : batteryPct != null ? `${batteryPct}%` : "—"}
                </Text>
              </View>
            </View>
            <View style={styles.continueBtn}>
              <PrimaryButton
                label="Continue"
                onPress={() => setStep(1)}
                disabled={!canProceedFromStep0}
              />
            </View>
          </View>
        )}

        {/* Step 1: Room test */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {useNativeCalibration ? "Shh… Listening to your room" : "Room noise"}
            </Text>
            <Text style={styles.cardSub}>
              Keep the room as you'll have it tonight. We'll set a baseline.
            </Text>
            {isListening && (
              <>
                <View style={styles.waveBarContainer}>
                  {barCurve.map((scale, i) => (
                    <CalibrationWaveBar key={i} index={i} scale={scale} active />
                  ))}
                </View>
                <Text style={styles.listeningLabel}>Calibrating…</Text>
              </>
            )}
            {!isListening && roomResult !== null && (
              <>
                <View style={styles.resultCircle}>
                  <Text style={styles.resultEmoji}>{roomResult === "quiet" ? "✓" : roomResult === "moderate" ? "~" : "!"}</Text>
                </View>
                <View style={styles.continueBtn}>
                <PrimaryButton label="Continue" onPress={() => setStep(2)} />
              </View>
              </>
            )}
            {!isListening && roomResult === null && !useNativeCalibration && (
              <ActivityIndicator size="large" color={accent.teal} style={{ marginVertical: 24 }} />
            )}
          </View>
        )}

        {/* Step 2: Pre-Sleep Factors */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Pre-sleep factors</Text>
            <Text style={styles.cardSub}>
              These can affect how well you sleep. We use them to offer personalised insights and compare nights.
            </Text>
            <Text style={[styles.cardSub, { marginTop: spacing.xs }]}>Optional — select any that apply.</Text>

            <Text style={styles.factorLabel}>Alcohol</Text>
            <View style={styles.factorCardRow}>
              {ALCOHOL_ITEMS.map((item) => {
                const selected = alcoholLevel === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.factorCard, selected && styles.factorCardSelected]}
                    onPress={() => setAlcoholLevel(item.id as AlcoholLevel)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.factorCardIconWrap, selected && styles.factorCardIconSelected]}>
                      <Ionicons name={item.icon} size={28} color={selected ? text.primary : text.secondary} />
                    </View>
                    <Text style={[styles.factorCardLabel, selected && styles.factorCardLabelSelected]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.factorLabel, { marginTop: spacing.stackLg }]}>Congestion</Text>
            <View style={styles.factorCardRow}>
              {CONGESTION_ITEMS.map((item) => {
                const selected = congestionLevel === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.factorCard, selected && styles.factorCardSelected]}
                    onPress={() => setCongestionLevel(item.id as CongestionLevel)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.factorCardIconWrap, selected && styles.factorCardIconSelected]}>
                      <Ionicons name={item.icon} size={28} color={selected ? text.primary : text.secondary} />
                    </View>
                    <Text style={[styles.factorCardLabel, selected && styles.factorCardLabelSelected]} numberOfLines={1}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.factorLabel, { marginTop: spacing.stackLg }]}>Other factors</Text>
            <Text style={styles.cardSub}>Select any that apply.</Text>
            <IconSelectorGrid
              items={PRE_SLEEP_FACTOR_ITEMS}
              selectedIds={selectedPreSleepFactors}
              onSelect={togglePreSleepFactor}
            />

            <View style={styles.navRow}>
              <GhostButton label="Back" onPress={() => setStep(1)} />
              <PrimaryButton label="Next" onPress={() => setStep(3)} />
            </View>
          </View>
        )}

        {/* Step 3: Interventions */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Interventions</Text>
            <Text style={styles.cardSub}>
              What are you trying tonight? Select all that apply (e.g. side sleeping and nasal strip).
            </Text>
            <IconSelectorGrid
              items={REMEDY_ITEMS}
              selectedIds={selectedInterventions}
              onSelect={toggleIntervention}
            />
            <View style={styles.navRow}>
              <GhostButton label="Back" onPress={() => setStep(2)} />
              <PrimaryButton label="Next" onPress={() => setStep(4)} />
            </View>
          </View>
        )}

        {/* Step 4: Notes */}
        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Notes</Text>
            <Text style={styles.cardSub}>Anything else? (e.g. "Late dinner", "Stressful day")</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes…"
              placeholderTextColor={text.muted}
              multiline
              numberOfLines={3}
            />
            <View style={styles.navRow}>
              <GhostButton label="Back" onPress={() => setStep(3)} />
              <PrimaryButton label="Next" onPress={() => setStep(5)} />
            </View>
          </View>
        )}

        {/* Step 5: Summary */}
        {step === 5 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Ready for tonight</Text>
            <Text style={styles.cardSub}>Review and start tracking.</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Pre-sleep</Text>
              <Text style={styles.summaryValue}>
                Alcohol {ALCOHOL_ITEMS.find((i) => i.id === alcoholLevel)?.label ?? alcoholLevel} · Congestion {CONGESTION_ITEMS.find((i) => i.id === congestionLevel)?.label ?? congestionLevel}
                {selectedPreSleepFactors.length ? ` · ${selectedPreSleepFactors.map((id) => PRE_SLEEP_FACTOR_ITEMS.find((i) => i.id === id)?.label ?? id).join(", ")}` : ""}
              </Text>
              <TouchableOpacity onPress={() => setStep(2)} hitSlop={8}>
                <Ionicons name="pencil" size={18} color={text.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Trying tonight</Text>
              <Text style={styles.summaryValue}>
                {selectedInterventions.map((id) => REMEDY_ITEMS.find((i) => i.id === id)?.label ?? id).join(", ")}
              </Text>
              <TouchableOpacity onPress={() => setStep(3)}><Ionicons name="pencil" size={18} color={text.muted} /></TouchableOpacity>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Notes</Text>
              <Text style={styles.summaryValue} numberOfLines={2}>{notes || "—"}</Text>
              <TouchableOpacity onPress={() => setStep(4)} hitSlop={8}>
                <Ionicons name="pencil" size={18} color={text.muted} />
              </TouchableOpacity>
            </View>
            <View style={styles.navRow}>
              <GhostButton label="Remind Me Later" onPress={() => router.back()} />
              <PrimaryButton label="Start tracking" onPress={handleSave} />
            </View>
          </View>
        )}
      </ScrollView>
      <Modal
        visible={stepMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStepMenuVisible(false)}
      >
        <Pressable style={styles.menuBackdrop} onPress={() => setStepMenuVisible(false)}>
          <View style={styles.stepMenu}>
            <Text style={styles.stepMenuTitle}>Step menu</Text>
            <TouchableOpacity
              style={styles.stepMenuItem}
              onPress={() => { setStepMenuVisible(false); toast.show({ message: "Auto-skip not saved yet" }); }}
            >
              <Text style={styles.stepMenuLabel}>Auto-skip this screen next time</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepMenuItem} onPress={handleResetAnswers}>
              <Text style={styles.stepMenuLabel}>Reset answers</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepMenuItem} onPress={handleSaveDraft}>
              <Text style={styles.stepMenuLabel}>Save draft & exit</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: background.secondary },
  chromeWrap: {
    paddingHorizontal: spacing.screenPadding,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  chromeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  chromeRightRow: { flexDirection: "row", alignItems: "center" },
  chromeTitle: { ...type.label, color: text.primary },
  chromeBtn: { padding: 4 },
  progressTrack: { height: 4, backgroundColor: surface.elevated, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: accent.primary, borderRadius: 2 },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  stepMenu: {
    backgroundColor: background.secondary,
    borderRadius: radius.lg,
    padding: spacing.sm,
    minWidth: 260,
  },
  stepMenuTitle: { ...type.label, color: text.primary, marginBottom: spacing.xs },
  stepMenuItem: { paddingVertical: 12, paddingHorizontal: 8 },
  stepMenuLabel: { ...type.bodyMd, color: text.primary },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.screenPadding, paddingTop: spacing.stackLg, paddingBottom: spacing.xxl },
  screenLabel: { ...type.label, color: text.muted, marginBottom: spacing.stackXs, letterSpacing: 1.2 },
  header: { ...type.title, color: text.primary, marginBottom: spacing.stackLg },
  card: {},
  cardTitle: { ...type.titleCard, color: text.primary, marginBottom: spacing.stackSm },
  cardSub: { ...type.bodySmall, color: text.secondary, marginBottom: spacing.stackLg },
  soundSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.stackSm,
  },
  soundIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: accent.tealSoft,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.stackMd,
  },
  soundOptionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.stackLg,
  },
  soundOptionCard: {
    minWidth: 72,
    alignItems: "center",
    paddingVertical: spacing.stackMd,
    paddingHorizontal: spacing.stackSm,
    borderRadius: radius.card,
    backgroundColor: surface.elevated,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  soundOptionCardSelected: {
    backgroundColor: accent.tealSoftBg,
    borderColor: accent.tealGlow,
  },
  soundOptionIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  soundOptionIconSelected: { backgroundColor: "rgba(101, 102, 195, 0.25)" },
  soundOptionLabel: { ...type.bodySm, color: text.secondary, textAlign: "center" },
  soundOptionLabelSelected: { color: accent.teal, fontFamily: fonts.bodyMedium },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.stackMd,
    borderBottomWidth: 1,
    borderBottomColor: surface.elevated,
  },
  checkRowLast: { borderBottomWidth: 0 },
  checkIcon: { fontSize: 16, width: 24, textAlign: "center" as const, marginRight: spacing.stackMd },
  checkText: { flex: 1 },
  checkLabel: { ...type.body, color: text.primary, fontFamily: fonts.bodyMedium },
  checkValue: { ...type.bodySmall, marginTop: 2 },
  retryBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.button, backgroundColor: accent.tealSoftBg },
  retryBtnText: { ...type.button, color: accent.teal },
  continueBtn: { marginTop: spacing.stackXl },
  waveBarContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    height: 44,
    marginVertical: spacing.stackLg,
  },
  listeningLabel: { ...type.titleCard, color: text.primary, textAlign: "center" },
  resultCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: semantic.success,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: spacing.stackLg,
  },
  resultEmoji: { fontSize: 26, color: text.primary },
  navRow: { flexDirection: "row", gap: spacing.stackMd, marginTop: spacing.stackXl, justifyContent: "space-between" },
  severityWrap: { marginVertical: spacing.stackLg },
  severityRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.stackSm },
  severityDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    opacity: 0.7,
  },
  severityDotActive: { opacity: 1, borderWidth: 2, borderColor: "#fff" },
  severityLabel: { ...type.titleCard, color: text.primary, textAlign: "center" },
  factorLabel: { ...type.body, color: text.primary, fontFamily: fonts.bodyMedium, marginBottom: spacing.stackSm },
  factorCardRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.stackSm },
  factorCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.stackMd,
    borderRadius: radius.card,
    backgroundColor: surface.elevated,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  factorCardSelected: { backgroundColor: accent.tealSoftBg, borderColor: accent.tealGlow },
  factorCardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  factorCardIconSelected: { backgroundColor: "rgba(108, 92, 231, 0.2)", borderWidth: 1, borderColor: accent.secondary },
  factorCardLabel: { ...type.bodySm, color: text.secondary, textAlign: "center" },
  factorCardLabelSelected: { color: text.primary, fontFamily: fonts.bodyMedium },
  notesInput: {
    ...type.body,
    color: text.primary,
    backgroundColor: surface.elevated,
    borderRadius: radius.input,
    padding: spacing.stackMd,
    minHeight: 88,
    textAlignVertical: "top",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.stackMd,
    gap: spacing.stackSm,
  },
  summaryLabel: { ...type.bodySmall, color: text.muted, minWidth: 100 },
  summaryValue: { flex: 1, ...type.body, color: text.primary },
});
