import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  useWindowDimensions,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import {
  accent,
  background,
  text as textTheme,
  radius,
  spacing,
  type,
  fonts,
  elevation,
} from "@/constants/theme";

type IoniconName = keyof typeof Ionicons.glyphMap;

const TOUR_STEPS: Array<{
  id: string;
  title: string;
  body: string;
  bullets?: string[];
  icon: IoniconName;
  iconColor: string;
  iconBg: string;
}> = [
  {
    id: "welcome",
    title: "Welcome to QuietNight",
    body: "A quick walkthrough so you know exactly where everything is. Takes about 30 seconds.",
    bullets: [
      "Record your sleep tonight",
      "See snoring stats in the morning",
      "Run experiments to find what helps",
    ],
    icon: "moon",
    iconColor: "#A29BFE",
    iconBg: "rgba(162, 155, 254, 0.18)",
  },
  {
    id: "tonight",
    title: "Tonight",
    body: "Your home base. Before bed, pick what you're testing (nasal strips, side sleeping, etc.), run a quick pre-flight check, then tap Start Tracking.",
    bullets: [
      "Place phone face-down on your bedside table",
      "Recording runs until you stop it in the morning",
    ],
    icon: "home-outline",
    iconColor: accent.primary,
    iconBg: accent.tealSoftBg,
  },
  {
    id: "morning",
    title: "Morning Summary",
    body: "When you wake up, stop the recording and answer a few quick questions — how you slept, how you feel. Your snoring data is ready to view.",
    bullets: [
      "Rate your sleep quality",
      "See snore count and duration",
      "Partner can rate too if connected",
    ],
    icon: "sunny-outline",
    iconColor: "#FFD700",
    iconBg: "rgba(255, 215, 0, 0.15)",
  },
  {
    id: "nights",
    title: "Nights",
    body: "Your complete sleep history. Tap any night to see the full breakdown and play back individual snore clips.",
    bullets: [
      "Calendar of every tracked night",
      "Snore playback with confidence scores",
      "Share reports with your doctor",
    ],
    icon: "calendar-outline",
    iconColor: "#E040FB",
    iconBg: "rgba(224, 64, 251, 0.15)",
  },
  {
    id: "journey",
    title: "Journey",
    body: "Track your progress over time. See which remedies work, compare quiet vs loud nights, and hit milestones.",
    bullets: [
      "Experiment results and remedy leaderboard",
      "Epworth sleepiness assessment",
      "7-day structured lab test",
    ],
    icon: "trending-up",
    iconColor: "#00E5FF",
    iconBg: "rgba(0, 229, 255, 0.15)",
  },
  {
    id: "profile",
    title: "Profile",
    body: "Manage your account, connect with a partner via a 6-digit code, and adjust settings.",
    bullets: [
      "Link with partner — no app install needed",
      "Recording and notification settings",
      "Replay this tour anytime from here",
    ],
    icon: "person-outline",
    iconColor: accent.primary,
    iconBg: accent.tealSoftBg,
  },
  {
    id: "start",
    title: "Record your first night",
    body: "You're ready. Head to the Tonight tab, tap Start Tracking, and place your phone face-down. We'll handle the rest.",
    icon: "mic",
    iconColor: "#7C6AFF",
    iconBg: "rgba(124, 106, 255, 0.22)",
  },
];

const ANIM_DURATION = 280;

interface WelcomeTourModalProps {
  visible: boolean;
  onComplete: () => void;
}

export function WelcomeTourModal({ visible, onComplete }: WelcomeTourModalProps) {
  const [step, setStep] = useState(0);
  const { width } = useWindowDimensions();
  const isLastStep = step === TOUR_STEPS.length - 1;
  const current = TOUR_STEPS[step];

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const iconScale = useRef(new Animated.Value(1)).current;
  const bulletAnims = useRef(
    Array.from({ length: 6 }, () => new Animated.Value(0))
  ).current;

  const animateIn = useCallback(
    (direction: 1 | -1 = 1) => {
      slideAnim.setValue(direction * 40);
      fadeAnim.setValue(0);
      iconScale.setValue(0.6);
      bulletAnims.forEach((a) => a.setValue(0));

      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: ANIM_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(iconScale, {
          toValue: 1,
          friction: 5,
          tension: 80,
          useNativeDriver: true,
        }),
      ]).start();

      const currentBullets = TOUR_STEPS[step + (direction === 1 ? 1 : -1)]?.bullets ?? TOUR_STEPS[step]?.bullets;
      const bulletCount = currentBullets?.length ?? 0;
      bulletAnims.slice(0, bulletCount).forEach((anim, i) => {
        Animated.timing(anim, {
          toValue: 1,
          duration: 220,
          delay: ANIM_DURATION + i * 80,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      });
    },
    [slideAnim, fadeAnim, iconScale, bulletAnims, step]
  );

  const goToStep = useCallback(
    (nextStep: number) => {
      if (nextStep === step) return;
      const direction: 1 | -1 = nextStep > step ? 1 : -1;

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: direction * -30,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStep(nextStep);
        animateIn(direction);
      });
    },
    [step, fadeAnim, slideAnim, animateIn]
  );

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLastStep) {
      onComplete();
      router.push("/(tabs)/tonight");
    } else {
      goToStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToStep(step - 1);
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete();
  };

  const handleDotPress = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goToStep(i);
  };

  // Animate initial bullets on first render
  const hasAnimatedInitial = useRef(false);
  if (visible && !hasAnimatedInitial.current) {
    hasAnimatedInitial.current = true;
    const bulletCount = TOUR_STEPS[0]?.bullets?.length ?? 0;
    bulletAnims.slice(0, bulletCount).forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 220,
        delay: 400 + i * 80,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleSkip}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.sheet,
            { width: Math.min(width - 32, 400) },
            elevation.mid,
          ]}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            {step > 0 ? (
              <TouchableOpacity
                onPress={handleBack}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.backBtn}
              >
                <Ionicons name="chevron-back" size={22} color={textTheme.secondary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtn} />
            )}
            <Text style={styles.stepCount}>
              {step + 1} / {TOUR_STEPS.length}
            </Text>
            <TouchableOpacity
              onPress={handleSkip}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={styles.skipBtn}
            >
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          {/* Content with slide/fade animation */}
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            }}
          >
            {/* Icon */}
            <Animated.View
              style={[
                styles.iconWrap,
                { backgroundColor: current.iconBg },
                { transform: [{ scale: iconScale }] },
              ]}
            >
              <Ionicons
                name={current.icon}
                size={36}
                color={current.iconColor}
              />
            </Animated.View>

            {/* Title */}
            <Text style={styles.stepTitle}>{current.title}</Text>

            {/* Body */}
            <Text style={styles.stepBody}>{current.body}</Text>

            {/* Animated bullets */}
            {current.bullets && current.bullets.length > 0 && (
              <View style={styles.bullets}>
                {current.bullets.map((bullet, i) => (
                  <Animated.View
                    key={`${current.id}-${i}`}
                    style={[
                      styles.bulletRow,
                      {
                        opacity: bulletAnims[i] ?? 1,
                        transform: [
                          {
                            translateY: (bulletAnims[i] ?? new Animated.Value(1)).interpolate({
                              inputRange: [0, 1],
                              outputRange: [10, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={current.iconColor}
                      style={styles.bulletIcon}
                    />
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </Animated.View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Dots */}
          <View style={styles.dots}>
            {TOUR_STEPS.map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleDotPress(i)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.dotTouch}
              >
                <View
                  style={[
                    styles.dot,
                    i === step ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* CTA */}
          <TouchableOpacity
            onPress={handleNext}
            activeOpacity={0.85}
            style={[
              styles.nextButton,
              isLastStep && styles.nextButtonFinal,
            ]}
          >
            <Text style={styles.nextButtonText}>
              {isLastStep ? "Start tracking" : "Next"}
            </Text>
            <Ionicons
              name={isLastStep ? "mic" : "arrow-forward"}
              size={20}
              color={background.primary}
              style={styles.nextIcon}
            />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    backgroundColor: background.secondary,
    borderRadius: radius.card * 1.5,
    padding: spacing.cardPaddingLarge,
    maxHeight: "88%",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.stackLg,
  },
  backBtn: { width: 32 },
  stepCount: {
    ...type.label,
    color: textTheme.muted,
    letterSpacing: 1,
  },
  skipBtn: { padding: 4 },
  skipText: { ...type.bodySmall, color: accent.link },
  iconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.stackLg,
  },
  stepTitle: {
    ...type.title,
    color: textTheme.primary,
    marginBottom: spacing.stackMd,
  },
  stepBody: {
    ...type.body,
    color: textTheme.secondary,
    lineHeight: 22,
    marginBottom: spacing.stackLg,
  },
  bullets: { marginBottom: spacing.sectionGap },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  bulletIcon: { marginTop: 3, marginRight: 10 },
  bulletText: {
    ...type.body,
    color: textTheme.secondary,
    flex: 1,
    lineHeight: 21,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: spacing.stackXl,
  },
  dotTouch: { padding: 4 },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24, backgroundColor: accent.primary },
  dotInactive: { width: 8, backgroundColor: textTheme.muted },
  nextButton: {
    backgroundColor: accent.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: radius.pill,
  },
  nextButtonFinal: {
    backgroundColor: "#7C6AFF",
  },
  nextButtonText: {
    ...type.button,
    color: background.primary,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
  },
  nextIcon: { marginLeft: 8 },
});
