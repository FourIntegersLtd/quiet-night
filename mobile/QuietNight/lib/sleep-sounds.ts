/**
 * Sleep sound options for pre-flight. Sound plays only when tracking is active (active screen).
 * Replace URIs with your own assets or bundle local files via require().
 */

export type SleepSoundId = "none" | "rain" | "stream" | "white_noise";

export const SLEEP_SOUND_OPTIONS: { id: SleepSoundId; label: string; icon: string }[] = [
  { id: "none", label: "None", icon: "volume-mute-outline" },
  { id: "rain", label: "Rain", icon: "rainy-outline" },
  { id: "stream", label: "Stream", icon: "water-outline" },
  { id: "white_noise", label: "White noise", icon: "ellipse-outline" },
];

/** URI for each sound. Use empty string to disable; replace with your own URLs or require(asset). */
const SLEEP_SOUND_URIS: Record<Exclude<SleepSoundId, "none">, string> = {
  rain: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  stream: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  white_noise: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
};

export function getSleepSoundUri(id: SleepSoundId): string | null {
  if (id === "none") return null;
  const uri = SLEEP_SOUND_URIS[id];
  return uri && uri.length > 0 ? uri : null;
}
