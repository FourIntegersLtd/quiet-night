import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { radius, text, type } from "@/constants/theme";

type GhostButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

/** Ghost: "Skip" / "Not sure" style (spec) */
export function GhostButton({ label, onPress, disabled }: GhostButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[styles.touchable, disabled && styles.disabled]}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    minHeight: 44,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  label: { ...type.label, color: text.secondary },
});
