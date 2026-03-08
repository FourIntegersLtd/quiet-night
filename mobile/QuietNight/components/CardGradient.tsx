import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradient, radius, spacing } from "@/constants/theme";

type CardGradientProps = {
  children: React.ReactNode;
  style?: object;
};

/** Card/panel gradient (spec: dark navy) */
export function CardGradient({ children, style }: CardGradientProps) {
  return (
    <LinearGradient
      colors={[...gradient.card]}
      style={[styles.card, style]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    overflow: "hidden",
  },
});
