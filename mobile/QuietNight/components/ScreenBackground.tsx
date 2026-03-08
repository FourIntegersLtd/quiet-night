import { StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { gradient } from "@/constants/theme";

type ScreenBackgroundProps = {
  children: React.ReactNode;
  style?: object;
};

/** Wraps content with app background gradient (spec: dark navy) */
export function ScreenBackgroundWithContent({ children, style }: ScreenBackgroundProps) {
  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={[...gradient.background]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
