import { useState, useEffect } from "react";
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from "expo-audio";
import { Paths } from "expo-file-system";
import * as Battery from "expo-battery";

import { LOW_STORAGE_MB, MB, PREFLIGHT_MIN_STORAGE_MB, BATTERY_WARNING_PCT } from "@/constants/app";
import type { CheckStatus } from "@/types";

export function useSystemChecks() {
  const [micStatus, setMicStatus] = useState<CheckStatus>("idle");
  const [storageStatus, setStorageStatus] = useState<CheckStatus>("idle");
  const [storageMB, setStorageMB] = useState<number | null>(null);
  const [batteryStatus, setBatteryStatus] = useState<CheckStatus>("idle");
  const [batteryPct, setBatteryPct] = useState<number | null>(null);
  const [isPluggedIn, setIsPluggedIn] = useState(false);

  /** Show "plug in" warning when battery < 50% and not charging. */
  const showLowBatteryWarning =
    batteryPct != null && batteryPct < BATTERY_WARNING_PCT && !isPluggedIn;

  /** Show "free up space" warning when below pre-flight minimum (500 MB). */
  const showLowStorageWarning =
    storageMB != null && storageMB < PREFLIGHT_MIN_STORAGE_MB;

  const runMicCheck = async () => {
    setMicStatus("checking");
    try {
      const { granted } = await getRecordingPermissionsAsync();
      if (granted) {
        setMicStatus("ok");
        return;
      }
      const { granted: after } = await requestRecordingPermissionsAsync();
      setMicStatus(after ? "ok" : "fail");
    } catch {
      setMicStatus("fail");
    }
  };

  const runStorageCheck = () => {
    setStorageStatus("checking");
    try {
      const avail = Paths.availableDiskSpace / MB;
      setStorageMB(avail);
      setStorageStatus(avail >= LOW_STORAGE_MB ? "ok" : "warn");
    } catch {
      setStorageStatus("fail");
      setStorageMB(null);
    }
  };

  const runBatteryCheck = async () => {
    setBatteryStatus("checking");
    try {
      const [level, state] = await Promise.all([
        Battery.getBatteryLevelAsync(),
        Battery.getBatteryStateAsync(),
      ]);
      const pct = Math.round(level * 100);
      setBatteryPct(pct);
      const pluggedIn =
        state === Battery.BatteryState.CHARGING ||
        state === Battery.BatteryState.FULL;
      setIsPluggedIn(pluggedIn);
      setBatteryStatus(
        pluggedIn ? "ok" : pct < 30 ? "warn" : "ok"
      );
    } catch {
      setBatteryStatus("warn");
      setBatteryPct(null);
      setIsPluggedIn(false);
    }
  };

  useEffect(() => {
    runMicCheck();
    runStorageCheck();
    runBatteryCheck();
  }, []);

  return {
    micStatus,
    storageStatus,
    storageMB,
    batteryStatus,
    batteryPct,
    isPluggedIn,
    runMicCheck,
    runStorageCheck,
    showLowBatteryWarning,
    showLowStorageWarning,
  };
}
