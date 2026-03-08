/**
 * Single MMKV instance for the app. All storage access goes through lib/nights or this module.
 */

import { MMKV } from "react-native-mmkv";

const storage = new MMKV();

export function getStorage(): MMKV {
  return storage;
}
