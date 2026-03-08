import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import {
  background,
  text,
  surface,
  radius,
  spacing,
  type,
  fonts,
  accent,
  semantic,
} from "@/constants/theme";

export type ConfirmModalButton = {
  text: string;
  style?: "cancel" | "destructive" | "default";
  onPress?: () => void;
};

export type ConfirmModalIcon = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
};

export type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  buttons: ConfirmModalButton[];
  icon?: ConfirmModalIcon;
  onRequestClose: () => void;
};

export function ConfirmModal({
  visible,
  title,
  message,
  buttons,
  icon,
  onRequestClose,
}: ConfirmModalProps) {
  const handlePress = (button: ConfirmModalButton) => {
    button.onPress?.();
    onRequestClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <Pressable style={styles.overlay} onPress={onRequestClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {icon && (
            <View style={[styles.iconCircle, { backgroundColor: icon.bgColor }]}>
              <Ionicons name={icon.name} size={32} color={icon.color} />
            </View>
          )}
          <Text style={[styles.title, icon && styles.titleCentered]}>{title}</Text>
          <Text style={[styles.message, icon && styles.messageCentered]}>{message}</Text>
          <View style={styles.buttonsRow}>
            {buttons.map((btn) => {
              const isDestructive = btn.style === "destructive";
              const isCancel = btn.style === "cancel";
              return (
                <TouchableOpacity
                  key={btn.text}
                  style={[
                    styles.button,
                    isCancel && styles.buttonCancel,
                    isDestructive && styles.buttonDestructive,
                    icon && styles.buttonFull,
                  ]}
                  onPress={() => handlePress(btn)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.buttonTextCancel,
                      isDestructive && styles.buttonTextDestructive,
                    ]}
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.screenPadding,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: background.secondary,
    borderRadius: radius.card,
    padding: spacing.cardPaddingLarge,
    borderWidth: 1,
    borderColor: surface.elevated,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  title: {
    ...type.titleCard,
    color: text.primary,
    marginBottom: spacing.stackSm,
  },
  titleCentered: {
    textAlign: "center",
    ...type.headingMd,
  },
  message: {
    ...type.body,
    color: text.secondary,
    lineHeight: 22,
    marginBottom: spacing.stackLg,
  },
  messageCentered: {
    textAlign: "center",
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    flexWrap: "wrap",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: radius.button,
    backgroundColor: accent.teal,
  },
  buttonFull: {
    flex: 1,
    alignItems: "center",
  },
  buttonCancel: {
    backgroundColor: surface.elevated,
  },
  buttonDestructive: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.5)",
  },
  buttonText: {
    ...type.button,
    color: background.primary,
  },
  buttonTextCancel: {
    color: text.primary,
  },
  buttonTextDestructive: {
    color: "#ef4444",
  },
});
