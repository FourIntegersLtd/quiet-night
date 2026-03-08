import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { background, text, spacing, type } from "@/constants/theme";

/**
 * Discover tab — placeholder per Migraine Buddy–style spec.
 * Community / discover content can be added here.
 */
export default function DiscoverScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <View style={styles.iconWrap}>
          <Ionicons name="compass-outline" size={48} color={text.muted} />
        </View>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.sub}>
          Tips, community, and more — coming soon.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.primary,
    padding: spacing.screenPadding,
  },
  placeholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.stackLg,
  },
  title: {
    ...type.title,
    color: text.primary,
    marginBottom: spacing.stackSm,
  },
  sub: {
    ...type.body,
    color: text.secondary,
    textAlign: "center",
  },
});
