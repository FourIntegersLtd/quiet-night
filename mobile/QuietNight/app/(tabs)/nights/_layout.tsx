import { Stack } from "expo-router";

export default function NightsStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[key]" options={{ animation: "fade" }} />
    </Stack>
  );
}
