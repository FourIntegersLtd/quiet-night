import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { text, type, spacing } from "@/constants/theme";

type AppBarProps = {
  title: string;
  onMenuPress?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
};

/** Top app bar: left (menu/back), center title, optional right icon (spec) */
export function AppBar({ title, onMenuPress, rightIcon, onRightPress }: AppBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]}>
      <View style={styles.side}>
        {onMenuPress ? (
          <TouchableOpacity
            onPress={onMenuPress}
            hitSlop={12}
            style={styles.iconBtn}
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={26} color={text.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.sidePlaceholder} />
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side}>
        {rightIcon && onRightPress ? (
          <TouchableOpacity
            onPress={onRightPress}
            hitSlop={12}
            style={styles.iconBtn}
          >
            <Ionicons name={rightIcon} size={24} color={text.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.sidePlaceholder} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
    paddingBottom: spacing.xs,
    minHeight: 56,
  },
  side: { minWidth: 44, alignItems: "flex-start" },
  sidePlaceholder: { width: 44 },
  iconBtn: { padding: spacing.xxs },
  title: { ...type.titleCard, color: text.primary, flex: 1, textAlign: "center" },
});
