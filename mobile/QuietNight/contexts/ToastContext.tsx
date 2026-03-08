import React, { createContext, useCallback, useContext, useState, useRef } from "react";
import { StyleSheet, Text, View, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { background, text, radius, spacing, type } from "@/constants/theme";

type ToastOptions = {
  message: string;
  duration?: number;
};

type ToastContextValue = {
  show: (opts: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const DEFAULT_DURATION = 3000;
const TAB_BAR_HEIGHT = 64;
const TOAST_ABOVE_TAB = 16;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(16)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const bottomOffset = TAB_BAR_HEIGHT + TOAST_ABOVE_TAB + insets.bottom;

  const show = useCallback(
    (opts: ToastOptions) => {
      if (timeoutId) clearTimeout(timeoutId);
      setMessage(opts.message);
      translateY.setValue(16);
      opacity.setValue(0);
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      const id = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setMessage(null);
          setTimeoutId(null);
        });
      }, opts.duration ?? DEFAULT_DURATION);
      setTimeoutId(id);
    },
    [timeoutId, translateY, opacity]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message != null ? (
        <Animated.View
          style={[
            styles.toast,
            { bottom: bottomOffset, opacity, transform: [{ translateY }] },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: spacing.screenPadding,
    right: spacing.screenPadding,
    backgroundColor: background.tertiary,
    borderRadius: radius.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    alignSelf: "center",
    maxWidth: "100%",
    ...type.bodyMd,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  toastText: {
    color: text.primary,
    textAlign: "center",
  },
});
