import React, { forwardRef, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import {
  BottomSheetModal as GorhomBottomSheetModal,
  BottomSheetBackdrop,
} from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import { background, spacing, radius, text } from "@/constants/theme";

type BottomSheetModalProps = {
  children: React.ReactNode;
  snapPoints?: (string | number)[];
  onClose?: () => void;
  onDismiss?: () => void;
};

/** Spec: 40%, 65%, 85%; open 300ms ease-out, close 250ms */
const DEFAULT_SNAPS = ["40%", "65%", "85%"];

export const BottomSheetModal = forwardRef<
  GorhomBottomSheetModal,
  BottomSheetModalProps
>(function BottomSheetModalRef(
  { children, snapPoints = DEFAULT_SNAPS, onClose, onDismiss },
  ref
) {
  const handleDismiss = onDismiss ?? onClose;
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  return (
    <GorhomBottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={handleDismiss}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={styles.handle}
      backgroundStyle={styles.background}
      animateOnMount
    >
      <View style={styles.content}>{children}</View>
    </GorhomBottomSheetModal>
  );
});

const styles = StyleSheet.create({
  handle: {
    backgroundColor: text.muted,
    width: 40,
    height: 4,
    borderRadius: 9999,
    marginTop: 12,
  },
  background: {
    backgroundColor: background.sheet,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    paddingBottom: spacing.xxl,
  },
});
