import { useCallback, useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { RecordCard } from "@/components/RecordCard";
import { PrimaryButton } from "@/components/ui/buttons";
import { getAllNightKeys, getNightSnores, getNightTimeStats } from "@/lib/nights";
import { formatDateLabel, parseNightKey } from "@/lib/formatters";
import {
  background,
  accent,
  text,
  surface,
  radius,
  spacing,
  type,
} from "@/constants/theme";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDuration(totalMinutes: number): string {
  if (totalMinutes <= 0) return "—";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function nightKeyToDate(key: string): string | null {
  const dateStr = parseNightKey(key);
  if (dateStr === key || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  return dateStr;
}

const CELL_GAP = 6;

export default function NightsListScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const availableWidth =
    width - spacing.screenPadding * 2 - spacing.cardPadding * 2 * 2;
  const cellSize = Math.floor((availableWidth - CELL_GAP * 6) / 7);
  const [nightKeys, setNightKeys] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  useFocusEffect(
    useCallback(() => {
      const keys = getAllNightKeys();
      setNightKeys(keys.reverse());
    }, [])
  );

  const nightsByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const key of nightKeys) {
      const dateStr = nightKeyToDate(key);
      if (dateStr) map.set(dateStr, key);
    }
    return map;
  }, [nightKeys]);

  const { calendarGrid, nightsInMonth } = useMemo(() => {
    const { year, month } = currentMonth;
    const first = new Date(year, month - 1, 1);
    const last = new Date(year, month, 0);
    const startWeekday = first.getDay();
    const daysInMonth = last.getDate();
    const prefix = startWeekday;
    const totalCells = prefix + daysInMonth;
    const rows = Math.ceil(totalCells / 7);
    const grid: (number | null)[][] = [];
    let day = 1;
    for (let r = 0; r < rows; r++) {
      const row: (number | null)[] = [];
      for (let c = 0; c < 7; c++) {
        const i = r * 7 + c;
        if (i < prefix) row.push(null);
        else if (day <= daysInMonth) {
          row.push(day);
          day++;
        } else row.push(null);
      }
      grid.push(row);
    }
    const inMonth: string[] = [];
    for (const key of nightKeys) {
      const dateStr = nightKeyToDate(key);
      if (!dateStr) continue;
      const [y, m] = dateStr.split("-").map(Number);
      if (y === year && m === month) inMonth.push(key);
    }
    inMonth.sort().reverse();
    return { calendarGrid: grid, nightsInMonth: inMonth };
  }, [currentMonth, nightKeys]);

  const monthLabel = `${new Date(currentMonth.year, currentMonth.month - 1).toLocaleString("default", { month: "long" })} ${currentMonth.year}`;

  const goPrevMonth = () => {
    setCurrentMonth((m) => {
      if (m.month === 1) return { year: m.year - 1, month: 12 };
      return { year: m.year, month: m.month - 1 };
    });
  };

  const goNextMonth = () => {
    setCurrentMonth((m) => {
      if (m.month === 12) return { year: m.year + 1, month: 1 };
      return { year: m.year, month: m.month + 1 };
    });
  };

  const onDayPress = (day: number) => {
    const dateStr = `${currentMonth.year}-${String(currentMonth.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const key = nightsByDate.get(dateStr);
    if (key)
      router.push({ pathname: "/(tabs)/nights/[key]", params: { key } });
  };

  if (nightKeys.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.empty}>
          <View style={styles.emptyIconWrap}>
            <Ionicons name="calendar-outline" size={48} color={accent.primary} />
          </View>
          <Text style={styles.emptyText}>No records yet.</Text>
          <Text style={styles.emptySub}>
            Record your sleep from the Record button to see nights here.
          </Text>
          <PrimaryButton
            label="Record Sleep"
            onPress={() => router.push("/(tabs)/tonight/wizard")}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.calendarCard}>
        <View style={styles.monthRow}>
          <TouchableOpacity
            onPress={goPrevMonth}
            style={styles.monthNavBtn}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={24} color={text.primary} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthLabel}</Text>
          <TouchableOpacity
            onPress={goNextMonth}
            style={styles.monthNavBtn}
            hitSlop={12}
          >
            <Ionicons name="chevron-forward" size={24} color={text.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((w) => (
            <Text key={w} style={styles.weekdayLabel}>
              {w}
            </Text>
          ))}
        </View>
        <View
          style={[
            styles.grid,
            { width: 7 * cellSize + CELL_GAP * 6, alignSelf: "center" },
          ]}
        >
          {calendarGrid.map((row, ri) => (
            <View key={ri} style={[styles.gridRow, { marginBottom: CELL_GAP }]}>
              {row.map((day, ci) => {
                if (day === null)
                  return (
                    <View
                      key={ci}
                      style={[styles.dayCell, { width: cellSize, height: cellSize }]}
                    />
                  );
                const dateStr = `${currentMonth.year}-${String(currentMonth.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const hasRecord = nightsByDate.has(dateStr);
                const isToday =
                  new Date().getFullYear() === currentMonth.year &&
                  new Date().getMonth() + 1 === currentMonth.month &&
                  new Date().getDate() === day;
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[
                      styles.dayCell,
                      { width: cellSize, height: cellSize },
                      hasRecord && styles.dayCellWithRecord,
                      isToday && styles.dayCellToday,
                    ]}
                    onPress={() => hasRecord && onDayPress(day)}
                    disabled={!hasRecord}
                    activeOpacity={hasRecord ? 0.7 : 1}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        !hasRecord && styles.dayNumMuted,
                        isToday && styles.dayNumToday,
                      ]}
                    >
                      {day}
                    </Text>
                    {hasRecord && <View style={styles.dayDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>{monthLabel} — recorded nights</Text>
        {nightsInMonth.length === 0 ? (
          <Text style={styles.noNightsInMonth}>
            No recordings this month. Try another month or record a night.
          </Text>
        ) : (
          nightsInMonth.map((key) => {
            const dateStr = parseNightKey(key);
            const dateLabel = formatDateLabel(dateStr);
            const stats = getNightTimeStats(key);
            const count = getNightSnores(key).length;
            return (
              <RecordCard
                key={key}
                dateLabel={dateLabel}
                duration={formatDuration(stats.totalMinutes)}
                snoringLabel={count > 0 ? `${count} events` : undefined}
                quality={5}
                onPress={() =>
                  router.push({
                    pathname: "/(tabs)/nights/[key]",
                    params: { key },
                  })
                }
              />
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.primary,
  },
  scrollContent: {
    padding: spacing.screenPadding,
    paddingTop: spacing.stackLg,
    paddingBottom: spacing.sectionGapLarge * 2,
  },
  calendarCard: {
    backgroundColor: background.secondary,
    borderRadius: radius.card,
    padding: spacing.cardPadding,
    marginBottom: spacing.sectionGap,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  monthNavBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  monthTitle: {
    ...type.titleCard,
    color: text.primary,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: spacing.stackSm,
  },
  weekdayLabel: {
    flex: 1,
    ...type.labelSm,
    color: text.muted,
    textAlign: "center",
  },
  grid: {},
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  dayCellWithRecord: {
    backgroundColor: surface.elevated,
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: accent.primary,
  },
  dayNum: {
    ...type.body,
    color: text.primary,
  },
  dayNumMuted: {
    color: text.muted,
  },
  dayNumToday: {
    color: accent.primary,
  },
  dayDot: {
    position: "absolute",
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: accent.primary,
  },
  listSection: {
    marginTop: spacing.stackSm,
  },
  sectionTitle: {
    ...type.label,
    color: text.secondary,
    marginBottom: spacing.md,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noNightsInMonth: {
    ...type.body,
    color: text.muted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.screenPadding,
    paddingTop: spacing.stackLg,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: accent.tealSoftBg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...type.bodyLg,
    color: text.primary,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    ...type.bodySm,
    color: text.muted,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
});
