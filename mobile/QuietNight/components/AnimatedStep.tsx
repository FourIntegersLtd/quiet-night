import React, { useEffect } from "react";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";

interface AnimatedStepProps {
  children: React.ReactNode;
  delay?: number;
}

/** Single block fade + slide up. Use for full-step or first block. */
export function AnimatedStep({ children, delay = 0 }: AnimatedStepProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
    flex: 1,
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

interface AnimatedStepItemProps {
  children: React.ReactNode;
  /** Order from top to bottom (0 = first). */
  index: number;
  /** Delay before first item (ms). */
  baseDelay?: number;
  /** Delay between each item (ms). */
  staggerMs?: number;
}

/** Staggered item for progressive top-to-bottom reveal in lists. */
export function AnimatedStepItem({
  children,
  index,
  baseDelay = 0,
  staggerMs = 90,
}: AnimatedStepItemProps) {
  const delay = baseDelay + index * staggerMs;
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(16);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.ease) })
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.ease) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}

interface AnimatedSlideInFromLeftProps {
  children: React.ReactNode;
  /** Delay before starting (ms). */
  delay?: number;
  /** Duration of the slide + fade (ms). */
  duration?: number;
}

/** Slide in from the left with fade. Use for checkpoint / feature images. */
export function AnimatedSlideInFromLeft({
  children,
  delay = 120,
  duration = 450,
}: AnimatedSlideInFromLeftProps) {
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-48);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration, easing: Easing.out(Easing.cubic) })
    );
    translateX.value = withDelay(
      delay,
      withTiming(0, { duration, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
