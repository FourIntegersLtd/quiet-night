import { StyleSheet, Text, TouchableOpacity, View, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, type } from "@/constants/theme";

type GradientButtonProps = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
};

export function GradientButton({ label, onPress, loading, disabled, icon }: GradientButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled ?? loading}
      activeOpacity={0.85}
      style={[styles.touchable, (disabled ?? loading) && styles.disabled]}
    >
      <LinearGradient
        colors={[...colors.ctaGradient]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
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
  touchable: { borderRadius: radius.button, overflow: "hidden" },
  disabled: { opacity: 0.7 },
  gradient: {
    height: 56,
    paddingHorizontal: 24,
    borderRadius: radius.button,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  iconWrap: { justifyContent: "center" },
  label: {
    ...type.button,
    color: "#ffffff",
  },
});
