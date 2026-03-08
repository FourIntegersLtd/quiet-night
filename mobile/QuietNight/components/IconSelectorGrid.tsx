import { StyleSheet, Text, View, Pressable, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { accent, background, radius, spacing, text, type } from "@/constants/theme";

const GAP = spacing.sm;
const MIN_CELL_SIZE = 72;

export type IconSelectorItem = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

type IconSelectorGridProps = {
  items: IconSelectorItem[];
  selectedIds: string[];
  onSelect: (id: string) => void;
  onAddNew?: () => void;
  onLongPressItem?: (id: string) => void;
  /** Number of columns (default 3). Use 3 to force 3 per row with computed cell size. */
  columns?: number;
  /** Icon color when the item is not selected (default: text.secondary). */
  inactiveIconColor?: string;
  /** Icon color when the item is selected (default: text.primary). */
  activeIconColor?: string;
};

/**
 * Grid layout with configurable columns. Default 3 columns; cell size is computed so that `columns` fit per row.
 */
export function IconSelectorGrid({
  items,
  selectedIds,
  onSelect,
  onAddNew,
  onLongPressItem,
  columns = 3,
  inactiveIconColor = text.secondary,
  activeIconColor = text.primary,
}: IconSelectorGridProps) {
  const isSelected = (id: string) => selectedIds.includes(id);
  const screenWidth = Dimensions.get("window").width;
  // Account for screen padding + card margin + card padding so 3 columns fit when grid is inside a card
  const contentWidth =
    screenWidth -
    spacing.screenPadding * 2 -
    spacing.cardPaddingLarge * 2;
  const cellSize = Math.max(
    MIN_CELL_SIZE,
    Math.floor((contentWidth - (columns - 1) * GAP) / columns)
  );

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {items.map((item) => {
          const selected = isSelected(item.id);
          return (
            <Pressable
              key={item.id}
              style={[styles.cell, { width: cellSize }, selected && styles.cellSelected]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(item.id);
              }}
              onLongPress={onLongPressItem ? () => onLongPressItem(item.id) : undefined}
              delayLongPress={onLongPressItem ? 400 : undefined}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}, ${selected ? "selected" : "not selected"}`}
            >
              <View style={[styles.iconWrap, { width: cellSize, height: cellSize }, selected && styles.iconWrapSelected]}>
                <Ionicons
                  name={item.icon}
                  size={32}
                  color={selected ? activeIconColor : inactiveIconColor}
                />
              </View>
              <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={2}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
        {onAddNew ? (
          <Pressable
            style={[styles.cellAdd, { width: cellSize }]}
            onPress={onAddNew}
            accessibilityRole="button"
            accessibilityLabel="Add new"
          >
            <View style={[styles.iconWrapAdd, { width: cellSize, height: cellSize }]}>
              <Ionicons name="add" size={36} color={text.muted} />
            </View>
            <Text style={styles.labelAdd}>Add New</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: spacing.xs },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GAP,
  },
  cell: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  cellSelected: {},
  iconWrap: {
    borderRadius: radius.lg,
    backgroundColor: background.secondary,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapSelected: {
    backgroundColor: "rgba(108, 92, 231, 0.2)",
    borderWidth: 2,
    borderColor: accent.secondary,
  },
  label: {
    ...type.bodySm,
    color: text.secondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  labelSelected: {
    color: text.primary,
  },
  cellAdd: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  iconWrapAdd: {
    borderRadius: radius.lg,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: text.muted,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  labelAdd: {
    ...type.bodySm,
    color: text.muted,
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
