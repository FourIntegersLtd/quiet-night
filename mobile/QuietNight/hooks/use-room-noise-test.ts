import { useEffect, useRef } from "react";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
} from "expo-audio";

import {
  METER_LOUD,
  METER_QUIET,
  ROOM_TEST_DURATION_SEC,
} from "@/constants/app";
import type { RoomNoiseResult } from "@/types";

const OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

const METER_NONE = -160;

export function useRoomNoiseTest(onDone: (result: RoomNoiseResult) => void) {
  const recorder = useAudioRecorder(OPTIONS);
  const state = useAudioRecorderState(recorder, 200);
  const maxMeterRef = useRef<number>(METER_NONE);
  const doneRef = useRef(false);

  useEffect(() => {
    if (state.isRecording && state.metering != null) {
      if (state.metering > maxMeterRef.current) {
        maxMeterRef.current = state.metering;
      }
    }
  }, [state.isRecording, state.metering]);

  const startTest = async () => {
    doneRef.current = false;
    maxMeterRef.current = METER_NONE;
    try {
      await recorder.prepareToRecordAsync({ ...OPTIONS });
      recorder.record({ forDuration: ROOM_TEST_DURATION_SEC });
    } catch {
      onDone("error");
    }
  };

  useEffect(() => {
    if (doneRef.current) return;
    if (!state.isRecording && state.durationMillis > 0) {
      doneRef.current = true;
      const max = maxMeterRef.current;
      if (max <= METER_NONE || max === undefined) {
        onDone("error");
      } else if (max <= METER_QUIET) {
        onDone("quiet");
      } else if (max <= METER_LOUD) {
        onDone("moderate");
      } else {
        onDone("loud");
      }
    }
  }, [state.isRecording, state.durationMillis, onDone]);

  return { startTest, isRecording: state.isRecording, recorder };
}
