import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, TouchableOpacity, InteractionManager } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useKeepAwake } from "expo-keep-awake";
import { useEventListener } from "expo";
import * as Device from "expo-device";
import {
  requestRecordingPermissionsAsync,
  getRecordingPermissionsAsync,
  useAudioPlayer,
  setAudioModeAsync,
} from "expo-audio";
import { EventEmitter } from "expo-modules-core";

import { useAlert } from "@/contexts/AlertContext";
import ExpoSnoreDetectorModule, {
  startListening,
  stopListening,
} from "@/modules/expo-snore-detector";
import {
  addSnoreToNight,
  ensureNightInList,
  getTodayNightKey,
  getNightFactors,
  setNightRemedy,
  setRecordingStarted,
  setRecordingStopped,
} from "@/lib/nights";
import { getSleepSoundUri } from "@/lib/sleep-sounds";
import {
  getAvailableSpaceMB,
  getRecordingsSizeMB,
} from "@/lib/recordings";
import { LOW_STORAGE_MB, MAX_RECORDINGS_MB } from "@/constants/app";
import type { SnoreDetectedPayload, SnoreEvent, RemedyType } from "@/types";
import {
  accent,
  text,
  surface,
  radius,
  spacing,
  presets,
} from "@/constants/theme";

export default function ActiveNight() {
  const router = useRouter();
  const alertApi = useAlert();
  const { remedy: remedyParam } = useLocalSearchParams<{ remedy?: string }>();
  const currentSessionKey = useRef<string | null>(null);
  const [sleepSoundUri, setSleepSoundUri] = useState<string | null>(null);

  useKeepAwake();

  const sleepSoundPlayer = useAudioPlayer(sleepSoundUri ? { uri: sleepSoundUri } : null);

  const snoreEmitter = new EventEmitter<{
    onSnoreDetected: (event: SnoreDetectedPayload) => void;
  }>(ExpoSnoreDetectorModule);

  useEventListener(
    snoreEmitter,
    "onSnoreDetected",
    (event: SnoreDetectedPayload) => {
      const newSnore: SnoreEvent = {
        id: Math.random().toString(36).substring(2, 9),
        confidence: event.confidence,
        timestamp: event.timestamp,
        audioFileUri: event.audioFileUri,
      };
      const key = currentSessionKey.current;
      if (key) addSnoreToNight(key, newSnore);
    }
  );

  useEffect(() => {
    let mounted = true;

    (async () => {
      const response = await getRecordingPermissionsAsync();
      if (!response.granted) {
        const req = await requestRecordingPermissionsAsync();
        if (!req.granted) {
          alertApi.show({
            title: "Microphone access is required.",
            message: "Enable microphone to track your sleep.",
          });
          return;
        }
      }

      const availableMB = getAvailableSpaceMB();
      if (availableMB > 0 && availableMB < LOW_STORAGE_MB) {
        alertApi.show({
          title: "Storage Low",
          message: "Device storage is running low. Free up some space before recording.",
        });
        return;
      }
      const recordingsMB = getRecordingsSizeMB();
      if (recordingsMB > MAX_RECORDINGS_MB) {
        alertApi.show({ title: "Storage Full", message: "Please clear old recordings." });
        return;
      }

      if (!mounted) return;
      const key = getTodayNightKey();
      currentSessionKey.current = key;
      ensureNightInList(key);
      if (remedyParam) {
        const remedies = remedyParam.split(",").filter(Boolean) as RemedyType[];
        setNightRemedy(key, remedies.length ? remedies : ["BASELINE"]);
      }
      setRecordingStarted(key);
      await startListening();
      if (!mounted) return;
      const factors = getNightFactors(key);
      const soundId = factors?.sleep_sound;
      const uri = soundId && soundId !== "none" ? getSleepSoundUri(soundId) : null;
      if (uri) setSleepSoundUri(uri);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!sleepSoundUri || !sleepSoundPlayer) return;
    setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    sleepSoundPlayer.loop = true;
    sleepSoundPlayer.play();
    return () => {
      sleepSoundPlayer.pause();
    };
  }, [sleepSoundUri, sleepSoundPlayer]);

  const stopTracking = async () => {
    sleepSoundPlayer.pause();
    setSleepSoundUri(null);
    const sessionId = currentSessionKey.current;
    await stopListening();
    if (sessionId) setRecordingStopped(sessionId);
    currentSessionKey.current = null;
    InteractionManager.runAfterInteractions(() => {
      router.replace({
        pathname: "/(tabs)/tonight/morning",
        params: sessionId ? { sessionId } : undefined,
      });
    });
  };

  const isSimulator = !Device.isDevice;

  return (
    <View style={styles.container}>
      {isSimulator && (
        <View style={styles.simulatorNotice}>
          <Text style={styles.simulatorNoticeText}>
            Simulator: if no snoring is detected, set iOS Simulator → Hardware → Audio Input to your Mac’s microphone. Updating to Xcode 15.4+ can fix “reconfig pending” audio errors.
          </Text>
        </View>
      )}
      <View style={styles.nudgeBox}>
        <Text style={styles.nudgeText}>
          Sarah sent a 🤞 for a quiet night.
        </Text>
      </View>

      <View style={{ flex: 1 }} />

      <Text style={styles.instruction}>
        Place phone face down on bedside table.
      </Text>

      <TouchableOpacity style={styles.stopButton} onPress={stopTracking}>
        <Text style={styles.stopText}>Tap to Wake & Stop</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: presets.nightScreen,
  simulatorNotice: {
    position: "absolute",
    top: 60,
    left: spacing.cardPadding,
    right: spacing.cardPadding,
    backgroundColor: "#e85d04",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.card,
    zIndex: 10,
  },
  simulatorNoticeText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  nudgeBox: {
    marginTop: 100,
    backgroundColor: accent.tealSoft,
    padding: spacing.cardPadding,
    borderRadius: radius.card,
  },
  nudgeText: {
    color: accent.teal,
    fontSize: 16,
    fontWeight: "500",
  },
  instruction: {
    color: text.dark,
    fontSize: 15,
    marginBottom: 40,
  },
  stopButton: {
    borderWidth: 1,
    borderColor: surface.elevated,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: radius.pill,
    marginBottom: 40,
  },
  stopText: {
    color: text.muted,
    fontSize: 15,
    fontWeight: "bold",
  },
});
