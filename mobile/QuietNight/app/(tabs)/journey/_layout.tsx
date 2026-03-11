import { Stack } from "expo-router";

import { HeaderDrawerButton } from "@/components/HeaderDrawerButton";
import { background, text, type } from "@/constants/theme";

export default function JourneyStack() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: background.primary,
        },
        headerTitleStyle: {
          ...type.title,
          color: text.primary,
        },
        headerTitleAlign: "center",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Journey",
          // headerLeft: () => <HeaderDrawerButton />,
        }}
      />
      <Stack.Screen name="epworth" options={{ title: "Daytime energy check" }} />
      <Stack.Screen name="lab" options={{ title: "Experiment Lab" }} />
      <Stack.Screen
        name="remedy/[remedyKey]"
        options={{ title: "Experiment detail" }}
      />
    </Stack>
  );
}
