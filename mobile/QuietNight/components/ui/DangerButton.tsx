import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { radius, semantic, text, type } from "@/constants/theme";

const dangerGlow = {
  shadowColor: semantic.danger,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  shadowRadius: 24,
  elevation: 12,
};

type DangerButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/** Danger: destructive style for delete etc. (revised spec) */
export function DangerButton({ label, onPress, disabled }: DangerButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.touchable, disabled && styles.disabled]}
    >
      <View style={styles.inner}>
        <Text style={styles.label}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: { borderRadius: radius.xl, overflow: "hidden" },
  disabled: { opacity: 0.4 },
  inner: {
    height: 56,
    paddingHorizontal: 24,
    borderRadius: radius.xl,
    backgroundColor: semantic.danger,
    alignItems: "center",
    justifyContent: "center",
    ...dangerGlow,
  },
  label: { ...type.button, color: text.onAccent },
});
