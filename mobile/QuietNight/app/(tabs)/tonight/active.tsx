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
  getNightRemedy,
  getNightSnores,
  getNightTimeStats,
  getRecordingTimes,
  setNightRemedy,
  setRecordingStarted,
  setRecordingStopped,
  getSessionIdForNight,
  setSessionIdForNight,
} from "@/lib/nights";
import { createSession, endSession, appendSnores, postNightVerdict } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
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
  fonts,
} from "@/constants/theme";

export default function ActiveNight() {
  const router = useRouter();
  const alertApi = useAlert();
  const { session, user } = useAuth();
  const partnerName = (user?.partner_name ?? "").trim() || "Partner";
  const { remedy: remedyParam } = useLocalSearchParams<{ remedy?: string }>();
  const currentSessionKey = useRef<string | null>(null);
  const [sleepSoundUri, setSleepSoundUri] = useState<string | null>(null);
  const [windDownMinutesLeft, setWindDownMinutesLeft] = useState<number | null>(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(() =>
    new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  );

  useKeepAwake();

  const lockScreenPlayer = useAudioPlayer(
    require("@/assets/audio/silence_30s.mp3"),
    { keepAudioSessionActive: true, updateInterval: 1000 }
  );

  useEffect(() => {
    if (windDownMinutesLeft == null || windDownMinutesLeft <= 0) return;
    const interval = setInterval(() => {
      setWindDownMinutesLeft((prev) => (prev != null && prev > 0 ? prev - 1 : null));
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [windDownMinutesLeft]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      );
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

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
        timestamp: typeof event.timestamp === "number" ? event.timestamp : Math.floor(Date.now() / 1000),
        audioFileUri: event.audioFileUri,
        durationSeconds: event.durationSeconds,
      };
      const key = currentSessionKey.current;
      if (key) addSnoreToNight(key, newSnore);
    }
  );

  useEffect(() => {
    let mounted = true;
    let windDownTimer: ReturnType<typeof setTimeout> | null = null;

    (async () => {
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldPlayInBackground: true,
        allowsBackgroundRecording: true,
      });

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
      const factors = getNightFactors(key);
      const windDownMinutes = factors?.wind_down_minutes ?? 0;
      const soundId = factors?.sleep_sound;
      const uri = soundId && soundId !== "none" ? getSleepSoundUri(soundId) : null;

      const startTracking = async () => {
        if (!mounted || currentSessionKey.current !== key) return;
        setSleepSoundUri(null);
        setWindDownMinutesLeft(null);
        setRecordingStarted(key);
        if (session?.accessToken) {
          const factors = getNightFactors(key);
          const remedies = getNightRemedy(key);
          const { data, error } = await createSession({
            night_key: key,
            remedy_type: remedies.length ? remedies[0] : "BASELINE",
            factors: factors
              ? {
                  ...factors,
                  room_result: factors.room_result ?? undefined,
                }
              : undefined,
          });
          if (!error && data?.id) setSessionIdForNight(key, data.id);
        }
        await startListening();
        if (mounted) setIsRecordingActive(true);
      };

      if (windDownMinutes > 0) {
        setWindDownMinutesLeft(windDownMinutes);
        if (uri) setSleepSoundUri(uri);
        windDownTimer = setTimeout(() => {
          windDownTimer = null;
          startTracking();
        }, windDownMinutes * 60 * 1000);
      } else {
        await startTracking();
      }
    })();

    return () => {
      mounted = false;
      if (windDownTimer != null) clearTimeout(windDownTimer);
    };
  }, []);

  useEffect(() => {
    if (!sleepSoundUri || !sleepSoundPlayer) return;
    sleepSoundPlayer.loop = true;
    sleepSoundPlayer.play();
    return () => {
      sleepSoundPlayer.pause();
    };
  }, [sleepSoundUri, sleepSoundPlayer]);

  useEffect(() => {
    if (!isRecordingActive || !lockScreenPlayer) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const setupLockScreen = async () => {
      // Re-apply audio mode so the session is active for background + recording when we show the lock screen card
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldPlayInBackground: true,
        allowsBackgroundRecording: true,
      });

      lockScreenPlayer.volume = 0;
      lockScreenPlayer.loop = true;
      // Start playback first so iOS registers this app as the "Now Playing" source
      lockScreenPlayer.play();
      // Set lock screen metadata after playback has started so the card appears (iOS often only shows after play begins)
      timeoutId = setTimeout(() => {
        timeoutId = null;
        lockScreenPlayer.setActiveForLockScreen(true, {
          title: "Recording in progress",
          artist: "Sleep tracking",
          albumTitle: "QuietNight",
        });
      }, 400);
    };

    setupLockScreen();

    return () => {
      if (timeoutId != null) clearTimeout(timeoutId);
      lockScreenPlayer.setActiveForLockScreen(false);
      lockScreenPlayer.pause();
    };
  }, [isRecordingActive, lockScreenPlayer]);

  const stopTracking = async () => {
    setIsRecordingActive(false);
    lockScreenPlayer.setActiveForLockScreen(false);
    lockScreenPlayer.pause();
    sleepSoundPlayer.pause();
    setSleepSoundUri(null);
    const nightKey = currentSessionKey.current;
    const backendSessionId = nightKey ? getSessionIdForNight(nightKey) : null;
    await stopListening();
    if (nightKey) setRecordingStopped(nightKey);
    currentSessionKey.current = null;

    if (backendSessionId && nightKey) {
      const times = getRecordingTimes(nightKey);
      const stats = getNightTimeStats(nightKey);
      const totalMins = times?.stoppedAt && times?.startedAt
        ? Math.round((times.stoppedAt - times.startedAt) / 60)
        : stats.totalMinutes;
      endSession(backendSessionId, {
        total_duration_minutes: totalMins,
        snore_percentage: stats.snoringPercent,
        loud_snore_minutes: stats.snoringMinutes,
      }).catch(() => {});
      const events = getNightSnores(nightKey).map((s) => ({
        timestamp: s.timestamp,
        confidence: s.confidence,
        audio_uri: s.audioFileUri,
        duration_seconds: s.durationSeconds ?? undefined,
      }));
      if (events.length > 0) {
        appendSnores(backendSessionId, events).catch(() => {});
      }
      // Store verdict on backend (source of truth) when user ends recording
      const remedies = getNightRemedy(nightKey);
      const primaryRemedy = remedies.length > 0 ? remedies[0] : null;
      postNightVerdict({
        night_key: nightKey,
        snore_mins: stats.snoringMinutes,
        remedy: primaryRemedy ?? undefined,
        partner_report: null,
      }).catch(() => {});
    }

    InteractionManager.runAfterInteractions(() => {
      router.replace({
        pathname: "/(tabs)/tonight/morning",
        params: nightKey ? { sessionId: nightKey } : undefined,
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
      {/* <View style={styles.nudgeBox}>
        <Text style={styles.nudgeText}>
          {partnerName} sent a 🤞 for a quiet night.
        </Text>
      </View> */}

      <View style={{ flex: 1 }} />

      {isRecordingActive && (
        <Text style={styles.currentTime}>{currentTime}</Text>
      )}

      {windDownMinutesLeft != null && windDownMinutesLeft > 0 && (
        <Text style={styles.windDownText}>
          Wind down — tracking starts in {windDownMinutesLeft} min
        </Text>
      )}
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
  currentTime: {
    color: text.secondary,
    fontSize: 48,
    fontFamily: fonts.heading,
    marginBottom: spacing.md,
  },
  windDownText: {
    color: text.secondary,
    fontSize: 14,
    marginBottom: 12,
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
