import { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  Pressable,
  Animated,
  ImageSourcePropType,
  Image,
} from "react-native";
import { background, text, radius, spacing, type } from "@/constants/theme";
import { PrimaryButton, GhostButton } from "./buttons";

type FullScreenAlertDialogProps = {
  visible: boolean;
  title: string;
  message?: string;
  illustration?: ImageSourcePropType;
  primaryLabel: string;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onRequestClose?: () => void;
};

/** Spec: overlay rgba(0,0,0,0.5); card 85%, bg.secondary, radius lg, padding lg; open 250ms, close 200ms */
export function FullScreenAlertDialog({
  visible,
  title,
  message,
  illustration,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onRequestClose,
}: FullScreenAlertDialogProps) {
  const scale = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scale.setValue(0.85);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scale, { toValue: 0.85, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onRequestClose ?? onSecondary}
    >
      <Pressable
        style={styles.overlay}
        onPress={onRequestClose ?? onSecondary}
      >
        <Animated.View style={[styles.animatedWrap, { opacity }]}>
          <Pressable
            style={styles.cardWrap}
            onPress={(e) => e.stopPropagation()}
          >
            <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
              {illustration ? (
                <View style={styles.illustrationWrap}>
                  <Image source={illustration} style={styles.illustration} resizeMode="contain" />
                </View>
              ) : null}
              <Text style={styles.title}>{title}</Text>
              {message ? (
                <Text style={styles.message} numberOfLines={3}>
                  {message}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <PrimaryButton label={primaryLabel} onPress={onPrimary} />
                {secondaryLabel && onSecondary ? (
                  <GhostButton label={secondaryLabel} onPress={onSecondary} />
                ) : null}
              </View>
            </Animated.View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.screenPadding,
  },
  animatedWrap: {
    width: "85%",
    alignItems: "center",
  },
  cardWrap: {
    width: "100%",
  },
  card: {
    backgroundColor: background.secondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: "100%",
  },
  illustrationWrap: {
    alignSelf: "center",
    width: 120,
    height: 120,
    marginBottom: spacing.md,
  },
  illustration: {
    width: 120,
    height: 120,
  },
  title: {
    ...type.headingLg,
    color: text.primary,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  message: {
    ...type.bodyMd,
    color: text.secondary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  actions: {
    gap: spacing.sm,
  },
});
