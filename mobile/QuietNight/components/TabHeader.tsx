import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { accent, text, type, spacing } from "@/constants/theme";

const APP_BAR_HEIGHT = 56;

type IoniconName = keyof typeof Ionicons.glyphMap;

interface TabHeaderProps {
  title: string;
  icon?: IoniconName;
  onMenuPress?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  rightIcons?: Array<{ icon: IoniconName; onPress: () => void; label: string }>;
}

/** Spec: 56px + status bar, transparent, heading-lg title, hamburger/back, up to 2 right icons 24px in 44×44 */
export function TabHeader({
  title,
  icon,
  onMenuPress,
  showBack,
  onBack,
  rightIcons = [],
}: TabHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <View style={[styles.row, { paddingTop: insets.top, minHeight: APP_BAR_HEIGHT + insets.top }]}>
      <View style={styles.left}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            hitSlop={12}
            style={styles.iconWrap}
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={text.primary} />
          </TouchableOpacity>
        ) : onMenuPress ? (
          <TouchableOpacity
            onPress={onMenuPress}
            hitSlop={12}
            style={styles.iconWrap}
            accessibilityLabel="Open menu"
          >
            <Ionicons name="menu" size={24} color={text.primary} />
          </TouchableOpacity>
        ) : icon ? (
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={24} color={accent.primary} />
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.right}>
        {rightIcons.slice(0, 2).map((r, i) => (
          <TouchableOpacity
            key={i}
            onPress={r.onPress}
            hitSlop={8}
            style={styles.iconWrap}
            accessibilityLabel={r.label}
          >
            <Ionicons name={r.icon} size={24} color={text.primary} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  left: { marginRight: 12 },
  right: { flexDirection: "row", marginLeft: "auto", gap: 4 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    ...type.headingLg,
    color: text.primary,
    flex: 1,
  },
});
