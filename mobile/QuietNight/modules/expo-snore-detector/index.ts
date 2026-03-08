import { requireNativeModule, EventEmitter } from 'expo-modules-core';

// 1. Require the native Swift module we created
const ExpoSnoreDetector = requireNativeModule('ExpoSnoreDetector');

// 2. Export the specific async functions you wrote in Swift
export async function startListening() {
  return await ExpoSnoreDetector.startListening();
}

export async function stopListening() {
  return await ExpoSnoreDetector.stopListening();
}

/** Current room noise level in dBFS (for Pre-Flight calibration). Call after startListening(). */
export function getCurrentNoiseLevel(): number {
  return typeof ExpoSnoreDetector.getCurrentNoiseLevel === 'function'
    ? ExpoSnoreDetector.getCurrentNoiseLevel()
    : -160;
}

// 3. Export the raw module itself so the EventEmitter can hook into it
export default ExpoSnoreDetector;
