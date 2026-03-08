import { Redirect } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";

import { useAuth } from "@/contexts/AuthContext";
import OnboardingWelcomeScreen from "./(onboarding)/welcome";
import { ScreenBackgroundWithContent } from "@/components/ScreenBackground";
import { accent } from "@/constants/theme";

/** Root: Step 1 of onboarding (Welcome), or redirect to tabs if onboarded. */
export default function RootIndex() {
  const { isLoading, session, isOnboarded } = useAuth();

  if (isLoading) {
    return (
      <ScreenBackgroundWithContent>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={accent.primary} />
        </View>
      </ScreenBackgroundWithContent>
    );
  }

  if (session && isOnboarded) {
    return <Redirect href="/(tabs)" />;
  }

  return <OnboardingWelcomeScreen />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
