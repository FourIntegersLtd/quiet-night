import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { accent, radius, text, type } from "@/constants/theme";

type SecondaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
};

/** Secondary: outline or muted fill (spec) */
export function SecondaryButton({ label, onPress, disabled, icon }: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      style={[styles.touchable, disabled && styles.disabled]}
    >
      <View style={styles.inner}>
        {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: { borderRadius: radius.xl, overflow: "hidden" },
  disabled: { opacity: 0.3 },
  inner: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: radius.xl,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: accent.link,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  iconWrap: { justifyContent: "center" },
  label: { ...type.label, color: accent.link },
});
