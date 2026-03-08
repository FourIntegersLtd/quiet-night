import { StyleSheet, TouchableOpacity, View } from "react-native";
import { background, radius } from "@/constants/theme";

const SIZE = 44;
const HIT_SLOP = 8;

type IconButtonProps = {
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel: string;
};

/** Icon button: 48px touch target, with label for a11y (spec: icons paired with labels) */
export function IconButton({ icon, onPress, disabled, accessibilityLabel }: IconButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={{ top: HIT_SLOP, bottom: HIT_SLOP, left: HIT_SLOP, right: HIT_SLOP }}
      accessibilityLabel={accessibilityLabel}
      style={[styles.touchable, disabled && styles.disabled]}
    >
      <View style={styles.inner}>{icon}</View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    width: SIZE,
    height: SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  inner: {
    width: SIZE,
    height: SIZE,
    borderRadius: radius.full,
    backgroundColor: background.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
});
