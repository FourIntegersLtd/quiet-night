import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useDrawer } from "@/contexts/DrawerContext";
import { text } from "@/constants/theme";

/**
 * Header-left button to open the side drawer. Used in tab screenOptions.
 */
export function HeaderDrawerButton() {
  const { openDrawer } = useDrawer();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={openDrawer}
      hitSlop={12}
      accessibilityLabel="Open menu"
      accessibilityRole="button"
    >
      <Ionicons name="menu" size={26} color={text.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    backgroundColor: "transparent",
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
});
