import { Stack } from "expo-router";

export default function TonightStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="wizard" options={{ presentation: "modal" }} />
      <Stack.Screen name="active" options={{ animation: "fade" }} />
      <Stack.Screen name="morning" options={{ animation: "fade" }} />
    </Stack>
  );
}
