import { View, Text, TouchableOpacity, Modal, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { background, text, type, spacing, accent } from "@/constants/theme";

const ROW_HEIGHT = 52;
const ICON_SIZE = 24;
const ROW_GAP = 16;

const MAIN_ITEMS: Array<{
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: string;
  action?: "export" | "help";
  premium?: boolean;
}> = [
  { label: "My Profile", icon: "person-outline", href: "/(tabs)/profile" },
  { label: "Settings", icon: "settings-outline", href: "/(tabs)/profile" },
  { label: "Sleep Settings", icon: "moon-outline", href: "/(tabs)/profile" },
  { label: "Notifications", icon: "notifications-outline", href: "/(tabs)/profile" },
  { label: "Export My Records", icon: "download-outline", action: "export" },
  { label: "QuietNight Plus", icon: "diamond-outline", href: "/(tabs)/paywall", premium: true },
  { label: "Help Center", icon: "help-circle-outline", action: "help" },
  { label: "Contact Us", icon: "mail-outline", action: "help" },
];

type DrawerMenuProps = {
  visible: boolean;
  onClose: () => void;
  onExport?: () => void;
  onHelp?: () => void;
  userName?: string;
  userEmail?: string;
};

/** Spec: 80% width, bg.primary, 52px rows, icon 24 + 16px gap + body-lg; QuietNight Plus gold */
export function DrawerMenu({
  visible,
  onClose,
  onExport,
  onHelp,
  userName,
  userEmail,
}: DrawerMenuProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const drawerWidth = width * 0.8;

  const handleItem = (item: (typeof MAIN_ITEMS)[0]) => {
    onClose();
    if (item.href) {
      router.push(item.href as any);
    } else if (item.action === "export" && onExport) {
      onExport();
    } else if (item.action === "help" && onHelp) {
      onHelp();
    }
  };

  const handleLogout = () => {
    onClose();
    router.replace("/(onboarding)/welcome");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.drawer,
            {
              width: drawerWidth,
              paddingTop: insets.top + spacing.sm,
              paddingBottom: insets.bottom + spacing.sm,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatarPlaceholder} />
            <Text style={styles.userName}>{userName ?? "Guest"}</Text>
            {userEmail ? <Text style={styles.userEmail}>{userEmail}</Text> : null}
          </View>
          <View style={styles.divider} />
          {MAIN_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.label}
              style={styles.row}
              onPress={() => handleItem(item)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={ICON_SIZE}
                color={item.premium ? accent.premium : text.primary}
              />
              <Text
                style={[
                  styles.label,
                  item.premium ? styles.labelPremium : null,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={styles.divider} />
          <TouchableOpacity style={styles.row} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={ICON_SIZE} color={text.muted} />
            <Text style={styles.labelLogout}>Log Out</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawer: {
    backgroundColor: background.primary,
    paddingHorizontal: spacing.md,
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  avatarSection: {
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: background.tertiary,
    marginBottom: spacing.xs,
  },
  userName: {
    ...type.headingSm,
    color: text.primary,
  },
  userEmail: {
    ...type.bodySm,
    color: text.secondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginVertical: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: ROW_HEIGHT,
    gap: ROW_GAP,
  },
  label: {
    ...type.bodyLg,
    color: text.primary,
  },
  labelPremium: {
    color: accent.premium,
  },
  labelLogout: {
    ...type.bodyLg,
    color: text.muted,
  },
});
