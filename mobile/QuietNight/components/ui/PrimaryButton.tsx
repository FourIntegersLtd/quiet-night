import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, elevation, text } from "@/constants/theme";

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
};

/** Primary CTA: 56px height, 12px radius, purple gradient top→bottom (Migraine Buddy style) */
export function PrimaryButton({ label, onPress, loading, disabled, icon }: PrimaryButtonProps) {
  const isDisabled = disabled ?? loading;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
      style={[styles.touchable, isDisabled && styles.disabled]}
    >
      <LinearGradient
        colors={[...colors.ctaGradient]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.inner, isDisabled && styles.innerDisabled]}
      >
        {loading ? (
          <ActivityIndicator color={text.onAccent} size="small" />
        ) : (
          <>
            {icon ? <View style={styles.iconWrap}>{icon}</View> : null}
            <Text style={styles.label}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: { borderRadius: 12, overflow: "hidden" },
  disabled: { opacity: 0.4 },
  inner: {
    height: 56,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    ...elevation.ctaGlow,
  },
  innerDisabled: { ...elevation.none },
  iconWrap: { justifyContent: "center" },
  label: { fontSize: 16, fontWeight: "500", color: "#FFFFFF" },
});
